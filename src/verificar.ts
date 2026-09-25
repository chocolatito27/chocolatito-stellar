import { EMISOR_USDC, memoDeLicencia } from "./comun.ts";

/**
 * LA MITAD QUE NO SE FÍA
 *
 * El agente firma en la máquina del usuario, así que lo que el agente diga que
 * pagó no vale nada por sí solo: un cliente modificado puede afirmar cualquier
 * cosa. El proxy no le cree — va a Horizon y mira la cadena.
 *
 * Esto corre en un Worker de Cloudflare, así que aquí NO se usa el SDK de
 * Stellar: solo `fetch` contra la API REST de Horizon. Y ahora es verdad del
 * todo: lo único que importa es `comun.ts`, que no importa nada. Hay una
 * prueba que recorre las importaciones y falla si el SDK aparece por algún
 * camino, porque esta promesa ya se rompió una vez sin que nadie lo notara.
 */

const HORIZON = "https://horizon-testnet.stellar.org";

/**
 * Las operaciones que mueven un activo HACIA una cuenta.
 *
 * Las tres traen `to`, `amount` y el activo que llega. Un path payment también
 * trae lo que salió del otro lado (`source_amount`), pero eso es asunto del
 * que paga: a quien cobra solo le importa lo que entró.
 */
const QUE_PAGAN = new Set(["payment", "path_payment_strict_receive", "path_payment_strict_send"]);

export type Veredicto =
  | { estado: "valido"; importe: number; de: string; cuando: string }
  /** La cadena dice que no: no existe, falló, o no es lo que decía ser. */
  | { estado: "rechazado"; motivo: string }
  /** No se pudo preguntar. No es lo mismo que un no. */
  | { estado: "incomunicado"; motivo: string };

interface Transaccion {
  successful?: boolean;
  memo?: string;
  memo_type?: string;
  created_at?: string;
}

interface Operacion {
  type?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  amount?: string;
  from?: string;
  to?: string;
}

/** ¿Es el USDC de Circle? Por el emisor. El código lo puede poner cualquiera. */
function esUsdcDeCircle(o: Operacion): boolean {
  return o.asset_type !== "native" && o.asset_code === "USDC" && o.asset_issuer === EMISOR_USDC;
}

/**
 * ¿Existe este pago, y es lo que el cliente dice?
 *
 * Se comprueban cinco cosas, y las cinco hacen falta. Saltarse cualquiera deja
 * una forma de cobrar sin pagar:
 *
 *   1. Que la transacción existiera y saliera bien.
 *   2. Que el memo corresponda a su licencia. Sin esto, se reutiliza el pago
 *      de otro.
 *   3. Que el destino sea NUESTRA cuenta. Sin esto, alguien se paga a sí mismo
 *      y presenta el hash.
 *   4. Que el activo sea el USDC de Circle, mirado por el EMISOR. Sin esto,
 *      alguien emite su propio "USDC" —cuesta un minuto— y paga con él.
 *   5. Que el importe cubra lo que debe. Sin esto, se paga un céntimo por una
 *      tarea de un dólar.
 */
export async function comprobarPago(
  hash: string,
  cuentaDeCobro: string,
  licencia: string,
  debeUsd: number
): Promise<Veredicto> {
  let tx: Transaccion;
  let ops: { _embedded?: { records?: Operacion[] } };

  try {
    const rt = await fetch(`${HORIZON}/transactions/${encodeURIComponent(hash)}`);
    if (rt.status === 404) return { estado: "rechazado", motivo: "Esa transacción no existe en la red." };
    if (!rt.ok) return { estado: "incomunicado", motivo: `Horizon respondió HTTP ${rt.status}.` };
    tx = (await rt.json()) as Transaccion;

    const ro = await fetch(`${HORIZON}/transactions/${encodeURIComponent(hash)}/operations`);
    if (!ro.ok) return { estado: "incomunicado", motivo: `Horizon respondió HTTP ${ro.status} al pedir las operaciones.` };
    ops = (await ro.json()) as typeof ops;
  } catch (err) {
    // Red caída, tiempo agotado. Igual que con las licencias: no poder
    // preguntar no puede tratarse como un "no", o una caída de Horizon deja
    // sin servicio a gente que sí ha pagado.
    return { estado: "incomunicado", motivo: err instanceof Error ? err.message : String(err) };
  }

  if (tx.successful !== true) {
    return { estado: "rechazado", motivo: "La transacción está en la cadena pero falló." };
  }

  if (tx.memo !== memoDeLicencia(licencia)) {
    return { estado: "rechazado", motivo: "El memo no corresponde a esta licencia." };
  }

  const aNosotros = (ops._embedded?.records ?? []).filter(
    (o) => QUE_PAGAN.has(o.type ?? "") && o.to === cuentaDeCobro
  );
  if (aNosotros.length === 0) {
    return { estado: "rechazado", motivo: "La transacción no paga a la cuenta de cobro." };
  }

  const buenos = aNosotros.filter(esUsdcDeCircle);
  if (buenos.length === 0) {
    const otro = aNosotros[0]!;
    if (otro.asset_type === "native") {
      return { estado: "rechazado", motivo: "Pagó en XLM, y se cobra en USDC." };
    }
    if (otro.asset_code === "USDC") {
      // El caso que justifica mirar el emisor. El nombre coincide y el
      // explorador lo pinta como "USDC"; solo el emisor dice que es de otro.
      return {
        estado: "rechazado",
        motivo: `Pagó en un «USDC» que no es el de Circle: lo emite ${(otro.asset_issuer ?? "?").slice(0, 8)}…`,
      };
    }
    return { estado: "rechazado", motivo: `Pagó en ${otro.asset_code ?? "otro activo"}, y se cobra en USDC.` };
  }

  // Se suman todas las operaciones buenas hacia nosotros: una transacción
  // puede traer varias, y quedarse con la primera cobraría de menos.
  const importe = buenos.reduce((s, o) => s + Number(o.amount ?? "0"), 0);
  // Margen de un stroop: el importe se redondea hacia arriba al firmar, y
  // comparar en coma flotante sin holgura rechaza pagos que sí son correctos.
  if (!(importe + 1e-7 >= debeUsd)) {
    return { estado: "rechazado", motivo: `Pagó ${importe} y debía ${debeUsd}.` };
  }

  return {
    estado: "valido",
    importe,
    de: buenos[0]!.from ?? "",
    cuando: tx.created_at ?? "",
  };
}
