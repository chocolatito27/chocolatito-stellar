/**
 * Extremo a extremo contra la testnet de verdad: dos cuentas nuevas, fondeadas
 * con Friendbot, y un pago del tamaño que cuesta una tarea real.
 */
import { crearCartera, fondear, saldos } from "../src/cartera.ts";
import { liquidar, importeStellar } from "../src/pagos.ts";

const agente = crearCartera();
const cobro = crearCartera();
console.log("agente :", agente.publica);
console.log("cobro  :", cobro.publica);

await Promise.all([fondear(agente.publica), fondear(cobro.publica)]);
console.log("fondeadas con Friendbot");

// El coste real de una tarea de Chocolatito, medido por costeDe() en el proxy.
const COSTE_USD = 0.0041;
console.log(`\ncoste medido: ${COSTE_USD} USD  ->  ${importeStellar(COSTE_USD)} XLM`);

const r = await liquidar(agente, cobro.publica, COSTE_USD, "42f5ae22-ec4a-4d0c-bb2c-cc6e7b8ddb5f");
console.log("\nLIQUIDADO");
console.log("  hash  :", r.hash);
console.log("  memo  :", r.memo);
console.log("  ver   :", r.explorador);

const s = await saldos(cobro.publica);
console.log("\nsaldo de la cuenta de cobro:", s.map((x) => `${x.cantidad} ${x.activo}`).join(", "));
