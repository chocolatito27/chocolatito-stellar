import {
  Asset,
  BASE_FEE,
  Keypair,
  Memo,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

import { RED, servidor, type Cartera } from "./cartera.ts";

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
 * El `memo` lleva la licencia, que es como el proxy sabe de quién es el pago.
 *
 * Un memo de texto admite 28 bytes, así que no cabe una clave de licencia
 * entera (son 36 caracteres). Se manda un prefijo, que basta para localizarla
 * entre las licencias activas sin publicar la clave completa en una cadena que
 * cualquiera puede leer — que además es justo lo que NO hay que hacer con una
 * credencial.
 */
export function memoDeLicencia(licencia: string): string {
  return `cc:${licencia.trim().slice(0, 8)}`;
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
