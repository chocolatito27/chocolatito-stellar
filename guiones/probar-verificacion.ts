/**
 * LA PRUEBA DEL VERIFICADOR
 *
 * Crea sus propias transacciones cada vez que corre, y SALE CON ERROR si algún
 * caso no da lo esperado. Las dos cosas son a propósito:
 *
 *  - La versión anterior comprobaba una transacción vieja fijada en el código.
 *    Cuando cambió la licencia de ejemplo, el "pago bueno" pasó a salir
 *    rechazado —el memo ya no coincidía— y nadie se enteró, porque la prueba
 *    solo imprimía y el README seguía diciendo que se reproducía.
 *  - Una prueba que imprime "rechazado" y termina en verde no prueba nada: hay
 *    que comparar con lo esperado y fallar si no cuadra.
 *
 * Los casos de fraude salen de `trampas.ts`, el mismo sitio del que los saca
 * la demo: lo que se enseña en el vídeo es lo que se prueba aquí.
 *
 *   node --experimental-strip-types guiones/probar-verificacion.ts
 *
 * Necesita red (testnet). Tarda ~1 minuto.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { abrirLinea } from "../src/activos.ts";
import { crearCartera, fondear } from "../src/cartera.ts";
import { liquidarEnUsdc } from "../src/pagos.ts";
import { comprobarPago } from "../src/verificar.ts";
import { casosDeFraude, cuadra, prepararTrampas } from "./trampas.ts";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
/** Licencia DE EJEMPLO. En este repositorio no entra ninguna de verdad. */
const LICENCIA = "LIC-DEMO-0001-0002-0003";
const DEBE = 0.0097785;

let fallos = 0;
const marca = (ok: boolean) => (ok ? "✓" : "✗ FALLA");

// ─── 0. El verificador no puede llegar al SDK por ningún camino ─────────────
//
// Corre en un Worker. Esta promesa ya se rompió una vez en silencio —importaba
// de pagos.ts, que carga el SDK— así que ahora se recorre el grafo de
// importaciones de verdad en vez de fiarse del comentario.
console.log("\n0. El verificador no carga el SDK de Stellar");
{
  const visitados = new Set<string>();
  const externos: string[] = [];
  const recorrer = (archivo: string) => {
    if (visitados.has(archivo)) return;
    visitados.add(archivo);
    const texto = fs.readFileSync(archivo, "utf8");
    for (const m of texto.matchAll(/(?:import|export)[^'"]*?from\s+"([^"]+)"/g)) {
      const destino = m[1] ?? "";
      if (destino.startsWith(".")) recorrer(path.resolve(path.dirname(archivo), destino));
      else externos.push(`${path.basename(archivo)} → ${destino}`);
    }
  };
  recorrer(path.resolve(AQUI, "..", "src", "verificar.ts"));
  const ok = externos.length === 0;
  if (!ok) fallos++;
  console.log(
    `  ${marca(ok)}  recorre ${[...visitados].map((v) => path.basename(v)).join(", ")}` +
      (ok ? " — ninguna dependencia externa" : ` — llega a: ${externos.join(", ")}`)
  );
}

// ─── Montaje ─────────────────────────────────────────────────────────────────
console.log("\nMontando cuentas en testnet…");
const agente = crearCartera();
const cobro = crearCartera();
const atacante = crearCartera();
await Promise.all([fondear(agente.publica), fondear(cobro.publica), fondear(atacante.publica)]);
await abrirLinea(cobro);

const bueno = await liquidarEnUsdc(agente, cobro.publica, DEBE, LICENCIA);
console.log(`  pago bueno: ${bueno.importe} USDC por ${bueno.xlmGastado} XLM — ${bueno.hash.slice(0, 16)}…`);
const trampas = await prepararTrampas(agente, cobro, atacante, LICENCIA, DEBE);
console.log(`  trampas: USDC falso ${trampas.usdcFalso.slice(0, 12)}… · en XLM ${trampas.enXlm.slice(0, 12)}…`);

// ─── Los casos ───────────────────────────────────────────────────────────────
console.log("\n1. El pago bueno pasa");
{
  const r = await comprobarPago(bueno.hash, cobro.publica, LICENCIA, DEBE);
  const ok = r.estado === "valido";
  if (!ok) fallos++;
  console.log(`  ${marca(ok)}  ${"USDC de Circle, memo y cuenta correctos".padEnd(42)} ${r.estado}`);
}

console.log("\n2. Los seis intentos de colar un pago que no es");
for (const c of casosDeFraude(bueno.hash, cobro.publica, agente.publica, LICENCIA, DEBE, trampas)) {
  const r = await c.veredicto;
  const ok = cuadra(c, r);
  if (!ok) fallos++;
  const motivo = r.estado === "valido" ? "" : `  — ${r.motivo}`;
  console.log(
    `  ${marca(ok)}  ${c.nombre.padEnd(42)} ${r.estado}${motivo}` +
      (ok ? "" : `   (se esperaba ${c.esperado} por "${c.motivo}")`)
  );
}

console.log(`\n${fallos === 0 ? "TODO BIEN" : `${fallos} CASO(S) FALLAN`}\n`);
process.exit(fallos === 0 ? 0 : 1);
