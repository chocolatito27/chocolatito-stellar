import {
  Asset,
  BASE_FEE,
  Keypair,
  Memo,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

import { USDC } from "./activos.ts";
import { RED, servidor, type Cartera } from "./cartera.ts";
import { memoDeLicencia } from "./comun.ts";

// Se reexporta para quien ya lo importaba de aquí. Vive en `comun.ts` porque
// el verificador también lo necesita y no puede cargar este archivo (el SDK).
export { memoDeLicencia };

/**
 * LIQUIDAR UNA TAREA
 *
 * El medidor del proxy devuelve un coste en dólares con seis decimales —una
 * tarea normal cuesta entre 0,001 y 0,02 US$—. Esto lo convierte en un pago
 * firmado por el propio agente.
 *
 * POR QUÉ ESTE IMPORTE NO SE PUEDE COBRAR CON TARJETA
 *
 * Una pasarela cobra del orden de 0,30 US$ fijos por transacción. Cobrar
 * 0,004 US$ costaría setenta y cinco veces el propio cobro. En Stellar la
 * comisión base son 100 stroops = 0,00001 XLM, así que el pago sigue siendo un
 * pago y no una excusa para pagar comisiones. Ese hueco es la razón de que
 * este proyecto exista.
 */

/** Stellar admite 7 decimales. El medidor da 6, así que no se pierde nada. */
const DECIMALES = 7;

/**
 * Pagos por debajo de esto no se emiten: se acumulan.
 *
 * No es por la comisión —que es despreciable— sino por el ritmo: cada
 * transacción ocupa un número de secuencia de la cuenta, y firmar una por cada
 * llamada suelta al modelo convertiría una sesión de trabajo en cientos de
 * transacciones que no le dicen nada a nadie. Una por tarea sí cuenta una
 * historia legible en el explorador.
 */
export const MINIMO_USD = 0.0001;

export interface Liquidacion {
  hash: string;
  importe: string;
  memo: string;
  /** Enlace al explorador, para pegarlo tal cual en el README. */
  explorador: string;
}

/** Recorta a los decimales que Stellar admite, siempre hacia arriba. */
export function importeStellar(usd: number): string {
  // Hacia arriba y no al más cercano: redondear a la baja significa cobrar de
  // menos en cada tarea, y con miles de tareas eso deja de ser un redondeo.
  const factor = 10 ** DECIMALES;
  return (Math.ceil(usd * factor) / factor).toFixed(DECIMALES);
}

/**
 * Firma y envía el pago de una tarea.
 *
 * El número de secuencia se lee justo antes de construir: dos pagos en
 * paralelo desde la misma cuenta con el mismo número se pisan, y la red
 * rechaza el segundo con `tx_bad_seq`. Por eso se recarga la cuenta en cada
 * llamada en vez de guardarla.
 */
export async function liquidar(
  cartera: Cartera,
  destino: string,
  importeUsd: number,
  licencia: string
): Promise<Liquidacion> {
  if (!(importeUsd > 0)) {
    throw new Error(`Importe no válido: ${importeUsd}`);
  }

  const cantidad = importeStellar(importeUsd);
  const memo = memoDeLicencia(licencia);
  const cliente = servidor();
  const cuenta = await cliente.loadAccount(cartera.publica);

  const tx = new TransactionBuilder(cuenta, {
    fee: BASE_FEE,
    networkPassphrase: RED,
  })
    .addOperation(
      Operation.payment({
        destination: destino,
        asset: Asset.native(),
        amount: cantidad,
      })
    )
    .addMemo(Memo.text(memo))
    // 90 segundos: si la red no la mete en ese tiempo, caduca sola en vez de
    // quedarse flotando y ejecutarse cuando ya no venía a cuento.
    .setTimeout(90)
    .build();

  tx.sign(Keypair.fromSecret(cartera.secreta));

  const res = await cliente.submitTransaction(tx);
  return {
    hash: res.hash,
    importe: cantidad,
    memo,
    explorador: `https://stellar.expert/explorer/testnet/tx/${res.hash}`,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   COBRAR EN DÓLARES, PAGAR EN LO QUE SE TENGA

   El medidor da un coste en DÓLARES. Cobrarlo en XLM obliga a elegir un tipo
   de cambio, y el de XLM se mueve: lo que hoy son 0,0108 dólares mañana son
   otra cosa, y el que cobra se come la diferencia.

   `pathPaymentStrictReceive` lo resuelve en una sola transacción: el que cobra
   recibe EXACTAMENTE el importe medido, en USDC; el agente paga en XLM; y el
   DEX de Stellar hace la conversión dentro de la misma operación, sin que
   nadie tenga que mover nada a mano ni fiarse de nadie en medio. O pasa
   entero o no pasa: si el cambio se mueve de más, la red la rechaza y no sale
   ni un XLM.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Cuánto puede empeorar el cambio entre la cotización y la firma.
 *
 * Si se pasa, la red rechaza la transacción con `op_over_source_max`, no se
 * mueve nada salvo la comisión, y el liquidador conserva la deuda para el
 * siguiente intento. Es un tope, no un precio: casi siempre se paga lo cotizado.
 */
const HOLGURA = 0.03;

export interface Cotizacion {
  /** Lo que recibirá el que cobra, en USDC, ya en los 7 decimales de Stellar. */
  usdc: string;
  /** Lo que el DEX pide ahora mismo por ello, en XLM. */
  xlm: string;
  /** Activos intermedios, si la mejor ruta no es directa. */
  ruta: Asset[];
}

export interface LiquidacionUsdc extends Liquidacion {
  activo: "USDC";
  /** XLM que salió de verdad de la cuenta del agente, leído de la cadena. */
  xlmGastado: string;
  /** El máximo que el agente firmó. Nunca pudo pagar más que esto. */
  xlmMaximo: string;
  saltos: number;
}

interface RegistroDeRuta {
  source_amount: string;
  path: Array<{ asset_type: string; asset_code?: string; asset_issuer?: string }>;
}

/** Pregunta al DEX cuánto XLM cuesta que el cobro reciba ese importe exacto. */
export async function cotizar(importeUsd: number): Promise<Cotizacion> {
  const usdc = importeStellar(importeUsd);
  const res = await servidor().strictReceivePaths([Asset.native()], USDC, usdc).call();
  const rutas = (res.records as unknown as RegistroDeRuta[])
    .slice()
    .sort((a, b) => Number(a.source_amount) - Number(b.source_amount));

  const mejor = rutas[0];
  if (!mejor) {
    // Pasa si se seca la liquidez de testnet, que la ponen voluntarios. No es
    // motivo para inventarse un cambio: se dice y la deuda espera.
    throw new Error(`No hay ruta en el DEX de XLM a USDC para ${usdc}. La deuda se conserva.`);
  }

  return {
    usdc,
    xlm: mejor.source_amount,
    ruta: mejor.path.map((p) =>
      p.asset_type === "native" ? Asset.native() : new Asset(p.asset_code ?? "", p.asset_issuer ?? "")
    ),
  };
}

/** El XLM que de verdad salió, leído de la operación ya ejecutada. */
async function xlmGastadoEn(hash: string): Promise<string | null> {
  try {
    const ops = await servidor().operations().forTransaction(hash).call();
    const op = ops.records.find((o) => o.type === "path_payment_strict_receive") as
      | { source_amount?: string }
      | undefined;
    return op?.source_amount ?? null;
  } catch {
    return null;
  }
}

/**
 * Firma el pago de una tarea: el cobro recibe USDC exactos, el agente paga XLM.
 *
 * La cotización se pide justo antes de firmar, y la cuenta se recarga en cada
 * llamada por lo mismo que en `liquidar`: el número de secuencia no se guarda.
 */
export async function liquidarEnUsdc(
  cartera: Cartera,
  destino: string,
  importeUsd: number,
  licencia: string
): Promise<LiquidacionUsdc> {
  if (!(importeUsd > 0)) {
    throw new Error(`Importe no válido: ${importeUsd}`);
  }

  const { usdc, xlm, ruta } = await cotizar(importeUsd);
  const xlmMaximo = importeStellar(Number(xlm) * (1 + HOLGURA));
  const memo = memoDeLicencia(licencia);
  const cliente = servidor();
  const cuenta = await cliente.loadAccount(cartera.publica);

  const tx = new TransactionBuilder(cuenta, { fee: BASE_FEE, networkPassphrase: RED })
    .addOperation(
      Operation.pathPaymentStrictReceive({
        sendAsset: Asset.native(),
        sendMax: xlmMaximo,
        destination: destino,
        destAsset: USDC,
        destAmount: usdc,
        path: ruta,
      })
    )
    .addMemo(Memo.text(memo))
    .setTimeout(90)
    .build();

  tx.sign(Keypair.fromSecret(cartera.secreta));
  const res = await cliente.submitTransaction(tx);

  return {
    hash: res.hash,
    importe: usdc,
    memo,
    explorador: `https://stellar.expert/explorer/testnet/tx/${res.hash}`,
    activo: "USDC",
    xlmGastado: (await xlmGastadoEn(res.hash)) ?? xlm,
    xlmMaximo,
    saltos: ruta.length,
  };
}
