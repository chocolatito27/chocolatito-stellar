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
 *   node --experimental-strip-types guiones/demo.ts
 *
 * Con `--rapido` no espera entre pasos, para probarlo sin grabar.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { crearCartera, fondear, saldos } from "../src/cartera.ts";
import { CuentaDeTarea } from "../src/liquidador.ts";
import { costeSinDescuentoDeCache } from "../src/medidor.ts";
import { comprobarPago } from "../src/verificar.ts";

const RAPIDO = process.argv.includes("--rapido");
const pausa = (s: number) => new Promise((r) => setTimeout(r, RAPIDO ? 0 : s * 1000));

const N = "\x1b[0m";
const NARANJA = "\x1b[38;5;209m";
const VERDE = "\x1b[38;5;114m";
const GRIS = "\x1b[38;5;245m";
const AZUL = "\x1b[38;5;75m";
const FUERTE = "\x1b[1m";

const linea = (t = "") => console.log(t);
const titulo = (n: number, t: string) => {
  linea();
  linea(`${NARANJA}${FUERTE}  ${n}. ${t}${N}`);
  linea(`${GRIS}  ${"─".repeat(64)}${N}`);
};

const LICENCIA = "42f5ae22-ec4a-4d0c-bb2c-cc6e7b8ddb5f";

/**
 * EL CONSUMO SALE DE UN ARCHIVO, Y ESE ARCHIVO SALE DEL MOTOR DE VERDAD.
 *
 * La primera version de esta demo llevaba los tokens escritos a mano. Todo lo
 * demas era real -las cuentas, la transaccion, la verificacion- pero los
 * numeros de partida no, y eso convertia una demo honesta en una que lo
 * parecia. Quien abriera este archivo lo veia en diez segundos.
 *
 * Ahora vienen de `datos/uso-real.json`, que lo escribe `capturar-uso.ts`
 * pidiendole de verdad al motor a traves del proxy. Si el archivo no esta, la
 * demo NO se inventa nada: se para y dice como generarlo.
 */
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DATOS = path.resolve(AQUI, "..", "datos", "uso-real.json");

interface Vuelta {
  etiqueta: string;
  prompt_tokens: number;
  completion_tokens: number;
  prompt_tokens_details: { cached_tokens: number };
}

let capturado: { capturado: string; modelo: string; vueltas: Vuelta[] };
try {
  capturado = JSON.parse(await fs.readFile(DATOS, "utf8"));
} catch {
  console.error(
    "\nFalta datos/uso-real.json — son las mediciones del motor de verdad.\n" +
      "Generalo con:  node --experimental-strip-types guiones/capturar-uso.ts\n" +
      "(necesita una licencia activa; gasta unos centimos de margen)\n"
  );
  process.exit(1);
}

const VUELTAS = capturado.vueltas;
const MODELO_REAL = capturado.modelo;

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
linea(`  agente   ${AZUL}${agente.publica}${N}`);
linea(`  cobro    ${GRIS}${cobro.publica}${N}`);
await pausa(2);

linea();
linea(`${GRIS}  Fondeando con Friendbot (el grifo de testnet)…${N}`);
await Promise.all([fondear(agente.publica), fondear(cobro.publica)]);
const s0 = await saldos(agente.publica);
linea(`  ${VERDE}✓${N} el agente tiene ${FUERTE}${s0[0]?.cantidad} XLM${N} de prueba`);
await pausa(3);

// ─────────────────────────────────────────────────────────────── 2
titulo(2, "Una tarea de verdad, medida por el motor");
linea(`  ${FUERTE}«lee las 8 facturas de esta carpeta y escribe balance.md»${N}`);
linea(`${GRIS}  Lo ejecutó Chocolatito Code de verdad. Leyó los 8 archivos,${N}`);
linea(`${GRIS}  sumó por mes y escribió balance.md. Estas son SUS vueltas.${N}`);
linea();
linea(`${GRIS}  Cada vuelta la decidió el agente solo, el ${capturado.capturado.slice(0, 10)}.${N}`);
linea(`${GRIS}  Medidas al vuelo y guardadas en datos/uso-real.json.${N}`);
await pausa(3);
linea();
linea(`${GRIS}     llamada        entrada   caché   salida      coste${N}`);

const cuenta = new CuentaDeTarea(agente, cobro.publica, LICENCIA);
let bruto = 0;
for (const [i, v] of VUELTAS.entries()) {
  const c = cuenta.apuntar(MODELO_REAL, v);
  bruto += costeSinDescuentoDeCache(MODELO_REAL, v);
  linea(
    `  ${GRIS}${String(i + 1).padStart(3)}${N}  ${v.etiqueta.padEnd(12)} ${String(v.prompt_tokens).padStart(6)}  ${String(
      v.prompt_tokens_details.cached_tokens
    ).padStart(6)}   ${String(v.completion_tokens).padStart(5)}  ${NARANJA}${c.toFixed(7)}${N}`
  );
  await pausa(1.1);
}

await pausa(1);
linea();
linea(`  ${FUERTE}deuda de la tarea: ${NARANJA}${cuenta.deuda.toFixed(7)}${N}`);
await pausa(2);
linea();
linea(`${GRIS}  Sin descontar los aciertos de caché habrían sido ${bruto.toFixed(7)}.${N}`);
linea(`${GRIS}  Casi el triple por el mismo trabajo. Por eso el medidor importa.${N}`);
linea(`${GRIS}  La vuelta 1 manda las facturas sin cachear; las otras ya aciertan.${N}`);
await pausa(4);

// ─────────────────────────────────────────────────────────────── 3
titulo(3, "Al cerrar la tarea, el agente firma el pago");
linea(`${GRIS}  Un pago por tarea, no por vuelta: una línea legible en el extracto.${N}`);
await pausa(2.5);

const cierre = await cuenta.cerrar();
if (cierre.estado !== "pagado") {
  linea(`  ✗ no se pudo liquidar: ${cierre.motivo}`);
  process.exit(1);
}

linea(`  ${VERDE}✓ FIRMADO Y ENVIADO${N}`);
linea(`  importe  ${FUERTE}${cierre.liquidacion.importe} XLM${N}`);
linea(`  memo     ${cierre.liquidacion.memo}  ${GRIS}← la licencia, para atribuirlo${N}`);
linea(`  deuda    ${cuenta.deuda}  ${GRIS}← saldada${N}`);
await pausa(3);

// ─────────────────────────────────────────────────────────────── 4
titulo(4, "El servidor NO se fía: va a la cadena y comprueba");
linea(`${GRIS}  El agente corre en tu máquina, así que su palabra no vale nada sola.${N}`);
await pausa(2.5);

const v = await comprobarPago(cierre.liquidacion.hash, cobro.publica, LICENCIA, cierre.coste);
linea(`  veredicto: ${v.estado === "valido" ? VERDE + FUERTE + "VÁLIDO" : "RECHAZADO"}${N}`);
await pausa(2);

linea();
linea(`${GRIS}  Y rechaza los cuatro intentos de colar un pago falso:${N}`);
const fraudes: Array<[string, Promise<{ estado: string; motivo?: string }>]> = [
  ["presentarlo debiendo 1,00", comprobarPago(cierre.liquidacion.hash, cobro.publica, LICENCIA, 1)],
  ["reutilizar el pago de otro", comprobarPago(cierre.liquidacion.hash, cobro.publica, "99999999-0000-0000-0000-000000000000", cierre.coste)],
  ["pagarse a sí mismo", comprobarPago(cierre.liquidacion.hash, agente.publica, LICENCIA, cierre.coste)],
  ["inventarse un hash", comprobarPago("0".repeat(64), cobro.publica, LICENCIA, cierre.coste)],
];
for (const [nombre, p] of fraudes) {
  const r = await p;
  linea(`    ${nombre.padEnd(30)} ${VERDE}rechazado${N} ${GRIS}${r.motivo ?? ""}${N}`);
  await pausa(1.2);
}

// ─────────────────────────────────────────────────────────────── 5
titulo(5, "Compruébalo tú mismo");
linea(`  ${AZUL}${cierre.liquidacion.explorador}${N}`);
await pausa(3);
linea();
linea(`${GRIS}  Cobrar ${cierre.liquidacion.importe} costó ${FUERTE}0,00001${N}${GRIS} de comisión de red.${N}`);
linea(`${GRIS}  Una pasarela de tarjeta cobra ~0,30 fijos: ${FUERTE}44 veces el propio pago${N}${GRIS}.${N}`);
linea(`${GRIS}  Por eso este cobro no existe fuera de un riel como Stellar.${N}`);
linea();
await pausa(3);
