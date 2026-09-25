import type { Cartera } from "./cartera.ts";
import { costeDe, type Uso } from "./medidor.ts";
import { MINIMO_USD, liquidarEnUsdc, type LiquidacionUsdc } from "./pagos.ts";

/**
 * EL LIQUIDADOR — donde se juntan las dos mitades
 *
 * El medidor sabe lo que cuesta cada llamada. Los pagos saben firmar. Esto es
 * lo que hace que una cosa lleve a la otra sin que nadie apunte nada a mano.
 *
 * POR QUÉ NO SE PAGA EN CADA LLAMADA AL MODELO
 *
 * Una tarea de agente son entre 3 y 30 vueltas: lee un archivo, piensa,
 * ejecuta un comando, vuelve a pensar. Firmar un pago en cada vuelta tendría
 * tres problemas, y solo uno es el dinero:
 *
 *   1. Cada transacción consume un número de secuencia de la cuenta, y hay que
 *      ir a la red a leerlo. Serían 30 viajes de ida y vuelta metidos en medio
 *      del trabajo, que el usuario nota como lentitud.
 *   2. En el explorador, 30 pagos de 0,0001 no cuentan nada. Uno de 0,0041 con
 *      el nombre de la tarea sí.
 *   3. Si el usuario corta a mitad, habría pagado vueltas sueltas que no le
 *      sirvieron de nada.
 *
 * Así que se acumula durante la tarea y se firma al terminarla. Una tarea, un
 * pago, una línea en el extracto.
 */

export interface Apunte {
  modelo: string;
  coste: number;
  cuando: number;
}

export type Cierre =
  | { estado: "pagado"; liquidacion: LiquidacionUsdc; apuntes: number; coste: number }
  /** Se debía tan poco que no compensa una transacción. Queda a deber. */
  | { estado: "aplazado"; coste: number; motivo: string }
  /** Se intentó pagar y la red dijo que no. La deuda NO se borra. */
  | { estado: "fallido"; coste: number; motivo: string };

/**
 * Lleva la cuenta de una tarea y la liquida al cerrarla.
 *
 * La deuda vive aquí y solo se borra cuando hay un hash confirmado. Si el pago
 * falla, se conserva: perderla sería regalar el trabajo, y es justo lo que
 * pasaría con un `try/catch` que se limita a registrar el error.
 */
export class CuentaDeTarea {
  private apuntes: Apunte[] = [];
  private pendiente = 0;
  // Campos escritos a mano y no como propiedades del constructor: el modo
  // `--experimental-strip-types` de Node solo QUITA los tipos, no transforma
  // nada, y la forma abreviada genera código además de tipar. Con ella, esto
  // no arranca sin un paso de compilación.
  private readonly cartera: Cartera;
  private readonly cuentaDeCobro: string;
  private readonly licencia: string;

  constructor(cartera: Cartera, cuentaDeCobro: string, licencia: string) {
    this.cartera = cartera;
    this.cuentaDeCobro = cuentaDeCobro;
    this.licencia = licencia;
  }

  /** Una vuelta del agente: se mide y se suma. Todavía no se paga nada. */
  apuntar(modelo: string, uso: Uso | undefined | null): number {
    const coste = costeDe(modelo, uso);
    if (coste > 0) {
      this.apuntes.push({ modelo, coste, cuando: Date.now() });
      this.pendiente += coste;
    }
    return coste;
  }

  /** Lo que se debe ahora mismo, sin haberlo pagado. */
  get deuda(): number {
    return this.pendiente;
  }

  get vueltas(): number {
    return this.apuntes.length;
  }

  /**
   * Cierra la tarea: firma el pago de todo lo acumulado.
   *
   * Devuelve el resultado en vez de lanzar. Un fallo al liquidar no puede
   * tumbar la tarea del usuario —su trabajo ya está hecho y es suyo—, pero
   * tampoco puede pasar desapercibido, así que se devuelve explícito y con la
   * deuda intacta para el siguiente intento.
   */
  async cerrar(): Promise<Cierre> {
    const coste = this.pendiente;

    if (coste <= 0) {
      return { estado: "aplazado", coste: 0, motivo: "No hubo consumo que cobrar." };
    }
    if (coste < MINIMO_USD) {
      // No se borra: se queda acumulando para la siguiente tarea.
      return {
        estado: "aplazado",
        coste,
        motivo: `Son ${coste.toFixed(7)}, por debajo del mínimo de ${MINIMO_USD}. Se acumula.`,
      };
    }

    try {
      // En USDC y por el DEX: el cobro recibe exactamente lo medido, en
      // dólares, y el agente paga en XLM. Ver `liquidarEnUsdc` en pagos.ts.
      const liquidacion = await liquidarEnUsdc(this.cartera, this.cuentaDeCobro, coste, this.licencia);
      const apuntes = this.apuntes.length;
      // Solo aquí, y con un hash en la mano, se da por saldada la deuda.
      this.pendiente = 0;
      this.apuntes = [];
      return { estado: "pagado", liquidacion, apuntes, coste };
    } catch (err) {
      return {
        estado: "fallido",
        coste,
        motivo: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
