import { Asset, BASE_FEE, Keypair, Operation, TransactionBuilder } from "@stellar/stellar-sdk";

import { RED, servidor, type Cartera } from "./cartera.ts";
import { EMISOR_USDC } from "./comun.ts";

/**
 * EL USDC DE CIRCLE, Y POR QUÉ "USDC" NO BASTA PARA IDENTIFICARLO
 *
 * En Stellar un activo no es un nombre: es un nombre Y un emisor. Cualquiera
 * puede crear una cuenta, emitir un activo llamado "USDC" y mandárselo a quien
 * lo acepte. Hay decenas de "USDC" en la red y solo uno es el de Circle.
 *
 * Este es el de pruebas de Circle. No se da por supuesto: está comprobado
 * contra la red —72.959 cuentas con línea de confianza el 24 sep 2026— y su
 * `stellar.toml` apunta a centre.io, el consorcio detrás de USDC.
 *
 * Por eso el verificador compara el emisor y no el código: un pago en un
 * "USDC" de otro emisor es, a efectos de cobro, un pago en nada.
 *
 * El emisor vive en `comun.ts` porque el verificador también lo necesita y no
 * puede cargar este archivo, que trae el SDK.
 */
export { EMISOR_USDC };
export const USDC = new Asset("USDC", EMISOR_USDC);

export interface LineaAbierta {
  hash: string;
  activo: string;
}

/**
 * Abre la línea de confianza de una cuenta con un activo.
 *
 * En Stellar una cuenta NO puede recibir un activo que no ha aceptado antes:
 * el pago falla con `op_no_trust`. Es lo que impide que te llenen la cuenta de
 * basura, y es también la razón de que la cuenta de cobro tenga que decir, una
 * vez y por escrito, "acepto el USDC de Circle".
 *
 * Cuesta 0,5 XLM de reserva, que la red retiene mientras la línea exista.
 */
export async function abrirLinea(cartera: Cartera, activo: Asset = USDC): Promise<LineaAbierta> {
  const cliente = servidor();
  const cuenta = await cliente.loadAccount(cartera.publica);

  const tx = new TransactionBuilder(cuenta, { fee: BASE_FEE, networkPassphrase: RED })
    .addOperation(Operation.changeTrust({ asset: activo }))
    .setTimeout(90)
    .build();
  tx.sign(Keypair.fromSecret(cartera.secreta));

  const res = await cliente.submitTransaction(tx);
  return { hash: res.hash, activo: `${activo.getCode()}:${activo.getIssuer()}` };
}

/** ¿Esta cuenta ya acepta este activo? */
export async function tieneLinea(publica: string, activo: Asset = USDC): Promise<boolean> {
  const cuenta = await servidor().loadAccount(publica);
  return cuenta.balances.some(
    (b) =>
      b.asset_type !== "native" &&
      b.asset_type !== "liquidity_pool_shares" &&
      (b as { asset_code?: string }).asset_code === activo.getCode() &&
      (b as { asset_issuer?: string }).asset_issuer === activo.getIssuer()
  );
}
