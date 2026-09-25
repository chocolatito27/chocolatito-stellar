/**
 * LA DEMO
 *
 * Esto es lo que se graba. Corre solo de principio a fin y va contando lo que
 * hace, con pausas pensadas para que se pueda leer en un vídeo sin tener que
 * pausarlo.
 *
 * No hay nada preparado de antemano: las cuentas se crean al arrancar, la
 * transacción se firma en el momento y el enlace al explorador que sale al
 * final es comprobable por quien esté mirando. Esa es la diferencia entre una
 * demo y unas diapositivas, y las bases piden justo eso.
 *
 * Y lo que enseña es lo que pasó: cada veredicto se imprime como salió, en
 * rojo si no es el esperado. La versión anterior escribía "rechazado" a mano
 * en cada fraude sin mirar el resultado, y citaba un "44 veces" calculado para
 * una tarea que ya no era esta. Los números de aquí se calculan en el momento.
 *
 *   node --experimental-strip-types guiones/demo.ts
 *
 * Con `--rapido` no espera entre pasos, para probarlo sin grabar.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { EMISOR_USDC, abrirLinea } from "../src/activos.ts";
import { crearCartera, fondear, saldos, servidor } from "../src/cartera.ts";
import { CuentaDeTarea } from "../src/liquidador.ts";
import { costeSinDescuentoDeCache } from "../src/medidor.ts";
import { comprobarPago } from "../src/verificar.ts";
import { casosDeFraude, cuadra, prepararTrampas } from "./trampas.ts";

const RAPIDO = process.argv.includes("--rapido");
const pausa = (s: number) => new Promise((r) => setTimeout(r, RAPIDO ? 0 : s * 1000));

const N = "\x1b[0m";
const NARANJA = "\x1b[38;5;209m";
const VERDE = "\x1b[38;5;114m";
const ROJO = "\x1b[38;5;203m";
const GRIS = "\x1b[38;5;245m";
const AZUL = "\x1b[38;5;75m";
const FUERTE = "\x1b[1m";

const linea = (t = "") => console.log(t);
/** Parte un texto en líneas de como mucho `ancho` caracteres, por palabras. */
const envolver = (t: string, ancho: number) =>
  t.split(" ").reduce<string[]>((ls, p) => {
    const u = ls.length - 1;
    if (u >= 0 && (ls[u] + " " + p).length <= ancho) ls[u] += " " + p;
    else ls.push(p);
    return ls;
  }, []);
const titulo = (n: number, t: string) => {
  linea();
  linea(`${NARANJA}${FUERTE}  ${n}. ${t}${N}`);
  linea(`${GRIS}  ${"─".repeat(64)}${N}`);
};
/** Licencia DE EJEMPLO. En este repositorio no entra ninguna de verdad. */
const LICENCIA = "LIC-DEMO-0001-0002-0003";

/**
 * EL CONSUMO SALE DE UN ARCHIVO, Y ESE ARCHIVO SALE DEL AGENTE DE VERDAD.
 *
 * `datos/uso-real.json` lo escribe `medir-agente.ts` mientras Chocolatito Code
 * trabaja de verdad sobre archivos reales. Si falta, la demo NO se inventa
 * nada: se para y dice cómo generarlo.
 */
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DATOS = path.resolve(AQUI, "..", "datos", "uso-real.json");

interface Vuelta {
  etiqueta: string;
  prompt_tokens: number;
  completion_tokens: number;
  prompt_tokens_details: { cached_tokens: number };
  /** Lo que pidió el motor en esa respuesta. Las mediciones viejas no lo traen. */
  herramientas?: string[];
}

/** "read_file ×8, write_file": las herramientas de una vuelta, contadas. */
function pidio(v: Vuelta): string {
  if (!v.herramientas) return "";
  if (v.herramientas.length === 0) return "responde";
  const cuenta = new Map<string, number>();
  for (const h of v.herramientas) cuenta.set(h, (cuenta.get(h) ?? 0) + 1);
  return [...cuenta].map(([h, n]) => (n > 1 ? `${h} ×${n}` : h)).join(", ");
}

let capturado: { capturado: string; modelo: string; orden: string; vueltas: Vuelta[] };
try {
  capturado = JSON.parse(await fs.readFile(DATOS, "utf8"));
} catch {
  console.error(
    "\nFalta datos/uso-real.json — son las mediciones del agente de verdad.\n" +
      "Genéralo con:  node --experimental-strip-types guiones/medir-agente.ts\n" +
      "(necesita Chocolatito Code instalado y una licencia activa; gasta unos céntimos)\n"
  );
  process.exit(1);
}

linea();
linea(`${NARANJA}${FUERTE}  CHOCOLATITO · PAGO POR USO EN STELLAR${N}`);
linea(`${GRIS}  Un agente que firma, por cada tarea, lo que esa tarea costó.${N}`);
linea(`${GRIS}  Stellar Odyssey Perú 2026 · track AI Agents · testnet${N}`);
await pausa(4);

// ─────────────────────────────────────────────────────────────── 1
titulo(1, "El agente saca su propia cartera");
linea(`${GRIS}  La clave secreta se queda en este equipo. El servidor no la ve nunca.${N}`);
await pausa(2);

const agente = crearCartera();
const cobro = crearCartera();
// El atacante aparece en el paso 5. Se crea ya para fondearlo a la vez que
// los otros dos y no hacer esperar al vídeo después.
const atacante = crearCartera();
linea(`  agente   ${AZUL}${agente.publica}${N}`);
linea(`  cobro    ${GRIS}${cobro.publica}${N}`);
await pausa(2);

linea();
linea(`${GRIS}  Fondeando con Friendbot (el grifo de testnet)…${N}`);
await Promise.all([fondear(agente.publica), fondear(cobro.publica), fondear(atacante.publica)]);
const s0 = await saldos(agente.publica);
linea(`  ${VERDE}✓${N} el agente tiene ${FUERTE}${s0[0]?.cantidad} XLM${N} de prueba`);
await pausa(3);

// ─────────────────────────────────────────────────────────────── 2
titulo(2, "El cobro abre una línea con el USDC de Circle");
linea(`${GRIS}  En Stellar, para recibir USDC primero hay que aceptarlo.${N}`);
linea(`${GRIS}  Y cualquiera puede emitir un activo llamado «USDC»: cuenta el emisor.${N}`);
await pausa(3);
await abrirLinea(cobro);
linea(`  ${VERDE}✓${N} línea de confianza abierta con ${FUERTE}USDC${N}`);
linea(`    emisor ${AZUL}${EMISOR_USDC.slice(0, 12)}…${N}  ${GRIS}← el de Circle, no el nombre${N}`);
await pausa(3);

// ─────────────────────────────────────────────────────────────── 3
titulo(3, "Una tarea de verdad, medida por el motor");
for (const [i, trozo] of envolver(`«${capturado.orden}»`, 66).entries()) {
  linea(`  ${FUERTE}${i === 0 ? "" : " "}${trozo}${N}`);
}
// Lo que hizo el agente no se escribe aquí a mano: sale de la medición. La
// versión anterior decía «leyó los 8 archivos y escribió balance.md», que era
// verdad en aquella ejecución y habría seguido diciéndolo en cualquier otra.
linea(`${GRIS}  La hizo Chocolatito Code de verdad. Estas son SUS vueltas, medidas${N}`);
linea(`${GRIS}  al vuelo el ${capturado.capturado.slice(0, 16).replace("T", " ")} UTC y guardadas en datos/uso-real.json.${N}`);
if (capturado.vueltas.some((v) => v.herramientas)) {
  linea(`${GRIS}  «pidió» es lo que el motor le mandó hacer en cada una.${N}`);
}
await pausa(3);
linea();
linea(`${GRIS}  vuelta   entrada   caché  salida       coste   pidió${N}`);

const cuenta = new CuentaDeTarea(agente, cobro.publica, LICENCIA);
let bruto = 0;
for (const [i, v] of capturado.vueltas.entries()) {
  const c = cuenta.apuntar(capturado.modelo, v);
  bruto += costeSinDescuentoDeCache(capturado.modelo, v);
  linea(
    `  ${GRIS}${String(i + 1).padStart(6)}${N}  ${String(v.prompt_tokens).padStart(8)}  ${String(
      v.prompt_tokens_details.cached_tokens
    ).padStart(6)}  ${String(v.completion_tokens).padStart(6)}   ${NARANJA}${c.toFixed(7)}${N}   ${GRIS}${pidio(v)}${N}`
  );
  await pausa(1.1);
}

const deuda = cuenta.deuda;
await pausa(1);
linea();
linea(`  ${FUERTE}deuda de la tarea: ${NARANJA}${deuda.toFixed(7)} USD${N}`);
await pausa(2);
linea();
linea(`${GRIS}  Sin descontar la caché habrían sido ${bruto.toFixed(7)}: ${(bruto / deuda).toFixed(1)} veces más.${N}`);
// Con los porcentajes de ESTA medición, no con una frase fija: si un día la
// primera vuelta acierta en caché, la frase de antes seguiría diciendo que no.
const enCache = (v: Vuelta) => v.prompt_tokens_details.cached_tokens / Math.max(1, v.prompt_tokens);
const [primera, ...siguientes] = capturado.vueltas;
if (primera && siguientes.length > 0) {
  const minimo = Math.min(...siguientes.map(enCache));
  linea(
    `${GRIS}  En caché: la vuelta 1, el ${Math.round(enCache(primera) * 100)}% de su entrada; las siguientes, ` +
      `el ${Math.floor(minimo * 100)}% o más.${N}`
  );
  linea(`${GRIS}  Lo que acierta en caché cuesta ~30 veces menos por token.${N}`);
}
await pausa(4);

// ─────────────────────────────────────────────────────────────── 4
titulo(4, "Al cerrar la tarea, el agente firma el pago");
linea(`${GRIS}  El cobro recibe dólares exactos; el agente paga en XLM.${N}`);
linea(`${GRIS}  El DEX de Stellar convierte dentro de la misma transacción.${N}`);
await pausa(2.5);

const cierre = await cuenta.cerrar();
if (cierre.estado !== "pagado") {
  linea(`  ${ROJO}✗ no se pudo liquidar: ${cierre.motivo}${N}`);
  process.exit(1);
}
const liq = cierre.liquidacion;

linea(`  ${VERDE}✓ FIRMADO Y ENVIADO${N}`);
linea(`  el agente pagó    ${FUERTE}${liq.xlmGastado} XLM${N}   ${GRIS}(tope firmado: ${liq.xlmMaximo})${N}`);
linea(`  el cobro recibió  ${FUERTE}${liq.importe} USDC${N}  ${GRIS}← lo medido, redondeado al alza a 7 decimales${N}`);
linea(`  memo              ${liq.memo}     ${GRIS}← la licencia, para atribuirlo${N}`);
linea(`  deuda             ${cuenta.deuda}               ${GRIS}← saldada${N}`);
await pausa(3.5);

// ─────────────────────────────────────────────────────────────── 5
titulo(5, "El verificador NO se fía: va a la cadena y comprueba");
linea(`${GRIS}  El agente corre en tu máquina, así que su palabra no vale nada sola.${N}`);
linea(`${GRIS}  (Es el código del lado del servidor; en esta demo corre aquí mismo.)${N}`);
await pausa(2.5);

const v = await comprobarPago(liq.hash, cobro.publica, LICENCIA, cierre.coste);
linea(
  v.estado === "valido"
    ? `  veredicto: ${VERDE}${FUERTE}VÁLIDO${N}`
    : `  veredicto: ${ROJO}${FUERTE}${v.estado.toUpperCase()}${N} ${GRIS}${v.motivo}${N}`
);
await pausa(2);

linea();
linea(`${GRIS}  Preparando dos trampas: un atacante emite su propio «USDC» y paga${N}`);
linea(`${GRIS}  con él, y alguien paga en XLM. (El cobro acepta el USDC falso a${N}`);
linea(`${GRIS}  propósito: así se prueba que el verificador no depende de eso.)${N}`);
const trampas = await prepararTrampas(agente, cobro, atacante, LICENCIA, cierre.coste);

linea();
linea(`${GRIS}  Seis intentos de colar un pago que no es:${N}`);
let colados = 0;
for (const c of casosDeFraude(liq.hash, cobro.publica, agente.publica, LICENCIA, cierre.coste, trampas)) {
  const r = await c.veredicto;
  const ok = cuadra(c, r);
  if (!ok) colados++;
  const motivo = r.estado === "valido" ? "" : r.motivo;
  linea(`    ${c.nombre.padEnd(42)} ${ok ? VERDE : ROJO}${r.estado}${N} ${GRIS}${motivo}${N}`);
  await pausa(1.3);
}
linea();
linea(
  colados === 0
    ? `  ${VERDE}✓ los seis, rechazados cada uno por su motivo${N}`
    : `  ${ROJO}${FUERTE}✗ ${colados} caso(s) no dieron lo esperado. Esto NO es una demo válida.${N}`
);

// ─────────────────────────────────────────────────────────────── 6
titulo(6, "Compruébalo tú mismo");
linea(`  ${AZUL}${liq.explorador}${N}`);
await pausa(3);

// La comisión se LEE de la transacción, no se supone: con la red congestionada
// puede ser mayor que la base, y aquí se enseña la que se cobró.
const tx = await servidor().transactions().transaction(liq.hash).call();
const comision = Number(tx.fee_charged) / 1e7;
const importe = Number(liq.importe);
const gastado = Number(liq.xlmGastado);

linea();
linea(`${GRIS}  El cobro recibió ${FUERTE}${liq.importe} USDC${N}${GRIS}. Una pasarela de tarjeta cobra${N}`);
linea(`${GRIS}  ~0.30 USD fijos: ${FUERTE}${Math.round(0.3 / importe)} veces lo cobrado${N}${GRIS}.${N}`);
linea(`${GRIS}  Aquí, de todo lo que salió de la cuenta del agente, la comisión${N}`);
linea(`${GRIS}  de red fue el ${FUERTE}${((comision / (gastado + comision)) * 100).toFixed(1)}%${N}${GRIS}.${N}`);
linea(`${GRIS}  Con tarjeta, este cobro no es viable. Aquí sí.${N}`);
linea();
await pausa(3);

process.exit(colados === 0 && v.estado === "valido" ? 0 : 1);
