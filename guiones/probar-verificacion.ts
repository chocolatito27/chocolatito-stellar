/** El proxy comprobando el pago de verdad, y rechazando los cuatro fraudes. */
import { comprobarPago } from "../src/verificar.ts";

const HASH = "fe620dbc1e891155e9fe8b27aa309d00db046a93bc858939afa12efd0d9d0656";
const COBRO = "GBGN5VOQ5ANM5H5TI3TXFRZSNNKO3ONCS5TA6TYAEOZQYY3LLIGOSYW3";
const LICENCIA = "42f5ae22-ec4a-4d0c-bb2c-cc6e7b8ddb5f";

const casos: Array<[string, () => Promise<unknown>]> = [
  ["el pago bueno", () => comprobarPago(HASH, COBRO, LICENCIA, 0.0041)],
  ["cobrando de mas (debia 1 USD)", () => comprobarPago(HASH, COBRO, LICENCIA, 1)],
  ["licencia de otro", () => comprobarPago(HASH, COBRO, "99999999-0000-0000-0000-000000000000", 0.0041)],
  ["destino que no es el nuestro", () => comprobarPago(HASH, "GBBS2QRWNCNC7T4J7IHA6M4OO5TSB56OJ25C3JGZWJXCJEKYRDCBMY4Y", LICENCIA, 0.0041)],
  ["hash inventado", () => comprobarPago("0".repeat(64), COBRO, LICENCIA, 0.0041)],
];

for (const [nombre, fn] of casos) {
  const r = (await fn()) as { estado: string; motivo?: string };
  console.log(`${nombre.padEnd(34)} -> ${r.estado}${r.motivo ? "  (" + r.motivo + ")" : ""}`);
}
