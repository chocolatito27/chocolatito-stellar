/**
 * LOS PAGOS TRAMPA, EN UN SOLO SITIO
 *
 * Los usan la demo (lo que se graba) y la prueba (lo que falla si algo se
 * rompe). Están aquí para que no puedan separarse: si el vídeo enseña seis
 * rechazos, son exactamente los seis que la prueba comprueba, contra las
 * mismas transacciones, con los mismos motivos esperados.
 *
 * Antes la demo tenía su propia lista y además escribía "rechazado" a mano en
 * cada línea, sin mirar el resultado. Si un fraude se hubiera colado, la demo
 * lo habría enseñado en verde como rechazado.
 */
import { Asset, BASE_FEE, Keypair, Memo, Operation, TransactionBuilder } from "@stellar/stellar-sdk";

import { abrirLinea } from "../src/activos.ts";
import { RED, servidor, type Cartera } from "../src/cartera.ts";
import { memoDeLicencia } from "../src/comun.ts";
import { liquidar } from "../src/pagos.ts";
import { comprobarPago, type Veredicto } from "../src/verificar.ts";

/** Pago directo de cualquier activo, con el memo que se le diga. */
async function pagar(desde: Cartera, hacia: string, activo: Asset, cantidad: string, memo: string): Promise<string> {
  const cuenta = await servidor().loadAccount(desde.publica);
  const tx = new TransactionBuilder(cuenta, { fee: BASE_FEE, networkPassphrase: RED })
    .addOperation(Operation.payment({ destination: hacia, asset: activo, amount: cantidad }))
    .addMemo(Memo.text(memo))
    .setTimeout(90)
    .build();
  tx.sign(Keypair.fromSecret(desde.secreta));
  return (await servidor().submitTransaction(tx)).hash;
}

export interface Trampas {
  /** Hash de un pago en un "USDC" que emitió el propio atacante. */
  usdcFalso: string;
  emisorFalso: string;
  /** Hash de un pago correcto en todo menos en el activo: XLM. */
  enXlm: string;
}

/**
 * Monta las dos transacciones trampa que necesitan existir en la red.
 *
 * El "USDC" falso lo emite el atacante —cuesta un minuto—, y para que el pago
 * llegue la cuenta de cobro tiene que aceptarlo: se le hace aceptar A
 * PROPÓSITO, para probar que el verificador no depende de que la cuenta esté
 * bien configurada. En Stellar hay decenas de activos llamados "USDC".
 */
export async function prepararTrampas(
  agente: Cartera,
  cobro: Cartera,
  atacante: Cartera,
  licencia: string,
  debe: number
): Promise<Trampas> {
  const falso = new Asset("USDC", atacante.publica);
  await abrirLinea(cobro, falso);
  // Salen de cuentas distintas, así que pueden ir a la vez sin pisarse el
  // número de secuencia.
  const [usdcFalso, xlm] = await Promise.all([
    pagar(atacante, cobro.publica, falso, "5.0000000", memoDeLicencia(licencia)),
    liquidar(agente, cobro.publica, debe, licencia),
  ]);
  return { usdcFalso, emisorFalso: atacante.publica, enXlm: xlm.hash };
}

export interface Caso {
  nombre: string;
  veredicto: Promise<Veredicto>;
  /** Lo que tiene que salir. Si sale otra cosa, es un fallo, no un matiz. */
  esperado: "valido" | "rechazado";
  /** Un trozo del motivo, para comprobar que se rechazó por lo que tocaba. */
  motivo: string;
}

/** Los seis intentos de colar un pago que no es. */
export function casosDeFraude(
  pagoBueno: string,
  cobro: string,
  agente: string,
  licencia: string,
  debe: number,
  t: Trampas
): Caso[] {
  return [
    { nombre: "presentarlo debiendo 1.00", veredicto: comprobarPago(pagoBueno, cobro, licencia, 1), esperado: "rechazado", motivo: "debía" },
    { nombre: "reutilizar el pago de otra licencia", veredicto: comprobarPago(pagoBueno, cobro, "OTRA-LIC-9999", debe), esperado: "rechazado", motivo: "memo" },
    { nombre: "pagarse a sí mismo y enseñar el hash", veredicto: comprobarPago(pagoBueno, agente, licencia, debe), esperado: "rechazado", motivo: "cuenta de cobro" },
    { nombre: "inventarse un hash", veredicto: comprobarPago("0".repeat(64), cobro, licencia, debe), esperado: "rechazado", motivo: "no existe" },
    { nombre: "pagar con un «USDC» emitido por uno mismo", veredicto: comprobarPago(t.usdcFalso, cobro, licencia, debe), esperado: "rechazado", motivo: "no es el de Circle" },
    { nombre: "pagar en XLM en vez de USDC", veredicto: comprobarPago(t.enXlm, cobro, licencia, debe), esperado: "rechazado", motivo: "XLM" },
  ];
}

/** ¿Salió lo que tenía que salir, y por el motivo que tocaba? */
export function cuadra(c: Caso, r: Veredicto): boolean {
  if (r.estado !== c.esperado) return false;
  if (r.estado === "valido") return true;
  return (r.motivo ?? "").includes(c.motivo);
}
