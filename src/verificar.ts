import { memoDeLicencia } from "./pagos.ts";

/**
 * LA MITAD QUE NO SE FÍA
 *
 * El agente firma en la máquina del usuario, así que lo que el agente diga que
 * pagó no vale nada por sí solo: un cliente modificado puede afirmar cualquier
 * cosa. El proxy no le cree — va a Horizon y mira la cadena.
 *
 * Esto corre en un Worker de Cloudflare, así que aquí NO se usa el SDK de
 * Stellar: solo `fetch` contra la API REST de Horizon. El SDK arrastra
 * criptografía que en un Worker es un problema de tamaño y de compatibilidad,
 * y para verificar no hace falta firmar nada.
 */

const HORIZON = "https://horizon-testnet.stellar.org";

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
  amount?: string;
  from?: string;
  to?: string;
}

/**
 * ¿Existe este pago, y es lo que el cliente dice?
 *
 * Se comprueban cuatro cosas, y las cuatro hacen falta. Saltarse cualquiera
 * deja una forma de cobrar sin pagar:
 *
 *   1. Que la transacción existiera y saliera bien.
 *   2. Que el destino sea NUESTRA cuenta. Sin esto, alguien se paga a sí mismo
 *      y presenta el hash.
 *   3. Que el memo corresponda a su licencia. Sin esto, se reutiliza el pago
 *      de otro.
 *   4. Que el importe cubra lo que debe. Sin esto, se paga un céntimo por una
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

  const esperado = memoDeLicencia(licencia);
  if (tx.memo !== esperado) {
    return { estado: "rechazado", motivo: "El memo no corresponde a esta licencia." };
  }

  const pago = (ops._embedded?.records ?? []).find(
    (o) => o.type === "payment" && o.to === cuentaDeCobro && o.asset_type === "native"
  );
  if (!pago) {
    return { estado: "rechazado", motivo: "La transacción no paga a la cuenta de cobro." };
  }

  const importe = Number(pago.amount ?? "0");
  // Margen de un stroop: el importe se redondea hacia arriba al firmar, y
  // comparar en coma flotante sin holgura rechaza pagos que sí son correctos.
  if (!(importe + 1e-7 >= debeUsd)) {
    return { estado: "rechazado", motivo: `Pagó ${importe} y debía ${debeUsd}.` };
  }

  return {
    estado: "valido",
    importe,
    de: pago.from ?? "",
    cuando: tx.created_at ?? "",
  };
}
