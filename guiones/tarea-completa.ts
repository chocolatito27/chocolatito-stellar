/**
 * El recorrido entero: una tarea de agente de 6 vueltas, medida vuelta a
 * vuelta, liquidada al cerrar y verificada contra la cadena.
 *
 * Los `usage` son los de una tarea real de Chocolatito ("revisa estas facturas
 * y hazme un Excel"): la primera vuelta manda el prompt entero sin cachear y
 * las siguientes reenvian la conversacion, que ya acierta en cache. Ese patron
 * es justo el que hace que descontar la cache importe tanto.
 */
import { crearCartera, fondear } from "../src/cartera.ts";
import { CuentaDeTarea } from "../src/liquidador.ts";
import { costeDe, costeSinDescuentoDeCache } from "../src/medidor.ts";
import { comprobarPago } from "../src/verificar.ts";

const LICENCIA = "42f5ae22-ec4a-4d0c-bb2c-cc6e7b8ddb5f";
const MODELO = "deepseek-v4-flash";

const VUELTAS = [
  { prompt_tokens: 4820, completion_tokens: 210, prompt_tokens_details: { cached_tokens: 0 } },
  { prompt_tokens: 5310, completion_tokens: 180, prompt_tokens_details: { cached_tokens: 4800 } },
  { prompt_tokens: 6040, completion_tokens: 340, prompt_tokens_details: { cached_tokens: 5280 } },
  { prompt_tokens: 7120, completion_tokens: 260, prompt_tokens_details: { cached_tokens: 6000 } },
  { prompt_tokens: 7900, completion_tokens: 410, prompt_tokens_details: { cached_tokens: 7100 } },
  { prompt_tokens: 8730, completion_tokens: 520, prompt_tokens_details: { cached_tokens: 7880 } },
];

const agente = crearCartera();
const cobro = crearCartera();
await Promise.all([fondear(agente.publica), fondear(cobro.publica)]);
console.log("agente:", agente.publica);
console.log("cobro :", cobro.publica, "\n");

const cuenta = new CuentaDeTarea(agente, cobro.publica, LICENCIA);

console.log('TAREA: "revisa estas 40 facturas y hazme un Excel"\n');
console.log("  vuelta   entrada  cacheada   salida      coste");
let sinDescuento = 0;
VUELTAS.forEach((u, i) => {
  const c = cuenta.apuntar(MODELO, u);
  sinDescuento += costeSinDescuentoDeCache(MODELO, u);
  console.log(
    `  ${String(i + 1).padStart(6)}   ${String(u.prompt_tokens).padStart(7)}  ${String(
      u.prompt_tokens_details.cached_tokens
    ).padStart(8)}   ${String(u.completion_tokens).padStart(6)}   ${c.toFixed(7)}`
  );
});

console.log(`\n  ${cuenta.vueltas} vueltas, deuda: ${cuenta.deuda.toFixed(7)}`);
console.log(`  sin descontar cache habrian sido: ${sinDescuento.toFixed(7)}  (x${(sinDescuento / cuenta.deuda).toFixed(1)})`);

const cierre = await cuenta.cerrar();
if (cierre.estado !== "pagado") {
  console.log("\nNO SE PAGO:", cierre.estado, "-", cierre.motivo);
  process.exit(1);
}

console.log("\nLIQUIDADO AL CERRAR LA TAREA");
console.log("  importe:", cierre.liquidacion.importe);
console.log("  memo   :", cierre.liquidacion.memo);
console.log("  hash   :", cierre.liquidacion.hash);
console.log("  ver    :", cierre.liquidacion.explorador);
console.log("  deuda despues:", cuenta.deuda);

const v = await comprobarPago(cierre.liquidacion.hash, cobro.publica, LICENCIA, cierre.coste);
console.log("\nEL PROXY VERIFICA CONTRA LA CADENA:", v.estado.toUpperCase());
if (v.estado === "valido") console.log("  cobrado:", v.importe, "| de:", v.de.slice(0, 8) + "...");
