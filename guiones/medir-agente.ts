/**
 * MEDIR AL AGENTE DE VERDAD
 *
 * La versión anterior hacía cinco llamadas de chat al motor y las llamaba
 * "vueltas de agente". Eran reales, pero no era el agente: un agente lee
 * archivos, ejecuta herramientas, mira el resultado y decide la vuelta
 * siguiente. Eso no se imita mandando preguntas.
 *
 * Esto sí lo es. Levanta un proxy delante del proxy, lanza **Chocolatito Code
 * de verdad** contra él con una tarea real sobre archivos reales, y apunta el
 * `usage` de cada llamada que el agente hace por su cuenta.
 *
 * Funciona porque el CLI ya deja elegir a dónde habla con la variable
 * `CHOCOLATITO_ENGINE_URL` —existía para pruebas— así que no hay que tocar ni
 * una línea del producto para medirlo.
 *
 * DOS MODOS
 *
 *   node --experimental-strip-types guiones/medir-agente.ts
 *
 * lanza el CLI con la orden (`-y`) y espera a que termine.
 *
 *   node --experimental-strip-types guiones/medir-agente.ts --interactivo \
 *     --carpeta facturas-enero-marzo-2026 --orden "..."
 *
 * no lanza nada: prepara la carpeta, levanta el proxy y se queda midiendo
 * mientras alguien usa Chocolatito Code A MANO en esa carpeta, con
 * CHOCOLATITO_ENGINE_URL apuntando aquí. Guarda después de cada vuelta, y marca
 * `terminado` cuando el agente da su respuesta final. Es lo que se graba en el
 * video: el agente abierto y usado como lo usaría cualquiera. `--orden` es el
 * texto que se le va a escribir, para que la demo lo enseñe tal cual.
 */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "..");
const DATOS = path.join(RAIZ, "datos");

const INTERACTIVO = process.argv.includes("--interactivo");
const argumento = (nombre: string): string | undefined => {
  const i = process.argv.indexOf(nombre);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

/**
 * La carpeta de trabajo se BORRA y se vuelve a crear en cada ejecución, así que
 * solo se admite dentro de este repositorio: un `--carpeta` equivocado no puede
 * llevarse por delante nada de fuera.
 */
const TALLER = path.resolve(RAIZ, argumento("--carpeta") ?? path.join("datos", "taller"));
if (!TALLER.startsWith(RAIZ + path.sep)) {
  console.error(`--carpeta tiene que quedar dentro del repositorio, y esto no: ${TALLER}`);
  process.exit(2);
}
const TALLER_RELATIVO = path.relative(RAIZ, TALLER).split(path.sep).join("/");

const ORDEN =
  argumento("--orden") ??
  "Lee todas las facturas .txt de esta carpeta y escribe balance.md con una " +
    "tabla del total por mes y el total general. No preguntes, hazlo.";

const ARRIBA = "https://chocolatito-proxy.chocolatito.workers.dev/v1";
const PUERTO = 4791;

/**
 * Lo que el CLI trae instalado. Se mide el producto, no una copia.
 *
 * Se lanza su JS con este mismo `node`, que es justo lo que hace el
 * `chocolatito.cmd` que instala npm, y no el `.cmd`: un `.cmd` solo arranca
 * con `shell: true`, y ahí los argumentos se pegan sin escapar. Node 24 lo
 * avisa por pantalla (DEP0190), y el aviso salió en la grabación de la demo.
 */
const PAQUETE = path.join(process.env.APPDATA ?? "", "npm", "node_modules", "chocolatito-code");
const { bin } = JSON.parse(await fs.readFile(path.join(PAQUETE, "package.json"), "utf8")) as {
  bin: Record<string, string>;
};
const CLI = path.join(PAQUETE, bin["chocolatito"] ?? "dist/index.js");

interface Vuelta {
  etiqueta: string;
  modelo: string;
  prompt_tokens: number;
  completion_tokens: number;
  prompt_tokens_details: { cached_tokens: number };
  /** Las herramientas que pidió el motor en esa respuesta. Vacío: respondió. */
  herramientas: string[];
}

const capturado: Vuelta[] = [];

/**
 * Escribe la medición tal como va. En modo interactivo se llama después de
 * cada vuelta, porque nadie avisa de cuándo termina el usuario.
 */
async function guardar(terminado: boolean): Promise<void> {
  await fs.writeFile(
    path.join(DATOS, "uso-real.json"),
    JSON.stringify(
      {
        capturado: new Date().toISOString(),
        modelo: capturado[0]?.modelo ?? "deepseek-v4-flash",
        origen: INTERACTIVO
          ? `Chocolatito Code en una sesion interactiva normal, con la orden escrita en su caja, sobre ${TALLER_RELATIVO}/`
          : `Chocolatito Code ejecutandose de verdad sobre ${TALLER_RELATIVO}/`,
        orden: ORDEN,
        nota:
          "Cada vuelta es una llamada que el agente decidio hacer por su cuenta; `herramientas` son " +
          "las que pidio el motor en esa respuesta. Sin licencias ni claves.",
        terminado,
        vueltas: capturado,
      },
      null,
      2
    ),
    "utf8"
  );
}

/**
 * Saca el ULTIMO objeto `usage` del cuerpo, contando llaves.
 *
 * Aqui habia una expresion regular, y fallaba en silencio: sabia manejar UN
 * objeto anidado y el motor devuelve dos —`prompt_tokens_details` y
 * `completion_tokens_details`—, asi que no casaba nunca y la medicion salia
 * vacia sin ningun error. El agente trabajaba bien, el proxy respondia bien, y
 * el contador se quedaba a cero.
 *
 * Contar llaves no es elegante, pero no se rompe cuando el motor añade un
 * campo nuevo. Una expresion regular sobre JSON anidado si.
 *
 * En SSE la mayoria de eventos traen `"usage":null`; el bueno es el ultimo.
 */
function ultimoUsage(texto: string): string | null {
  let encontrado: string | null = null;
  const marca = '"usage":';
  let desde = 0;

  for (;;) {
    const i = texto.indexOf(marca, desde);
    if (i < 0) break;
    desde = i + marca.length;

    let j = desde;
    while (j < texto.length && /\s/.test(texto[j]!)) j++;
    if (texto[j] !== "{") continue; // los `"usage":null` se saltan solos

    let hondura = 0;
    for (let k = j; k < texto.length; k++) {
      if (texto[k] === "{") hondura++;
      else if (texto[k] === "}") {
        hondura--;
        if (hondura === 0) {
          encontrado = texto.slice(j, k + 1);
          desde = k + 1;
          break;
        }
      }
    }
  }
  return encontrado;
}

/**
 * Facturas de mentira, pero archivos de verdad.
 *
 * El agente las va a abrir, leer y sumar de verdad. Son inventadas porque las
 * de nadie tienen por qué salir en un vídeo; lo que no es inventado es que el
 * agente las lea y trabaje con ellas.
 */
const FACTURAS: Array<[string, string]> = [
  ["factura-001.txt", "PROVEEDOR: Papelería Lima SAC\nFECHA: 2026-01-14\nCONCEPTO: Material de oficina\nTOTAL: 340.50 PEN"],
  ["factura-002.txt", "PROVEEDOR: Hosting Andino\nFECHA: 2026-01-28\nCONCEPTO: Servidor mensual\nTOTAL: 189.00 PEN"],
  ["factura-003.txt", "PROVEEDOR: Cafetería El Molino\nFECHA: 2026-02-03\nCONCEPTO: Reunión con cliente\nTOTAL: 96.80 PEN"],
  ["factura-004.txt", "PROVEEDOR: Transportes Ríos\nFECHA: 2026-02-19\nCONCEPTO: Envío de equipos\nTOTAL: 520.00 PEN"],
  ["factura-005.txt", "PROVEEDOR: Papelería Lima SAC\nFECHA: 2026-02-25\nCONCEPTO: Tóner impresora\nTOTAL: 275.30 PEN"],
  ["factura-006.txt", "PROVEEDOR: Hosting Andino\nFECHA: 2026-03-01\nCONCEPTO: Servidor mensual\nTOTAL: 189.00 PEN"],
  ["factura-007.txt", "PROVEEDOR: Estudio Contable Vega\nFECHA: 2026-03-11\nCONCEPTO: Asesoría trimestral\nTOTAL: 800.00 PEN"],
  ["factura-008.txt", "PROVEEDOR: Transportes Ríos\nFECHA: 2026-03-22\nCONCEPTO: Envío a provincia\nTOTAL: 410.75 PEN"],
];

async function prepararTaller(): Promise<void> {
  await fs.rm(TALLER, { recursive: true, force: true });
  await fs.mkdir(TALLER, { recursive: true });
  for (const [nombre, texto] of FACTURAS) {
    await fs.writeFile(path.join(TALLER, nombre), texto, "utf8");
  }
}

/**
 * El proxy de en medio.
 *
 * Reenvía tal cual y solo mira de pasada. Importa NO tocar el cuerpo: el proxy
 * de arriba guarda los bytes exactos para que la caché de prefijos del motor
 * siga acertando, y recomponer el JSON aquí los cambiaría y falsearía justo el
 * número que venimos a medir.
 */
function levantar(): Promise<http.Server> {
  return new Promise((listo) => {
    const s = http.createServer((pet, res) => {
      const trozos: Buffer[] = [];
      pet.on("data", (c: Buffer) => trozos.push(c));
      pet.on("end", async () => {
        const cuerpo = Buffer.concat(trozos);
        const destino = ARRIBA + (pet.url ?? "").replace(/^\/v1/, "");
        const cabeceras: Record<string, string> = {};
        for (const [k, v] of Object.entries(pet.headers)) {
          if (typeof v === "string" && k !== "host" && k !== "content-length") cabeceras[k] = v;
        }

        try {
          const arriba = await fetch(destino, { method: pet.method, headers: cabeceras, body: cuerpo.length ? cuerpo : undefined });
          const texto = await arriba.text();

          // El `usage` viene al final del cuerpo, en JSON o en el último evento
          // del SSE. Se busca igual en los dos sin recomponer nada.
          const crudo = ultimoUsage(texto);
          if (crudo) {
            try {
              const u = JSON.parse(crudo) as { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };
              // EL MODELO SE LEE DE LA PETICION, NO DE LA RESPUESTA.
              //
              // El motor devuelve "deepseek-flash" mientras que lo que se pide
              // es "deepseek-v4-flash", que es el nombre que esta en la tabla
              // de precios. Tomandolo de la respuesta, `costeDe` no encuentra
              // tarifa y devuelve 0: la tarea entera salia gratis.
              //
              // El proxy de produccion tarifa por el de la PETICION, asi que
              // alli esta bien. Este era un fallo de la medicion, no del cobro.
              const modelo =
                /"model"\s*:\s*"([^"]+)"/.exec(cuerpo.toString("utf8"))?.[1] ?? "deepseek-v4-flash";
              // Las herramientas que pide y cómo acaba la respuesta salen del
              // mismo texto, sin recomponerlo. En SSE el nombre llega en el
              // primer trozo de cada llamada, con los argumentos aún vacíos.
              const herramientas = [...texto.matchAll(/"function"\s*:\s*\{[^{}]*?"name"\s*:\s*"([^"]+)"/g)].map(
                (m) => m[1]!
              );
              const fin = [...texto.matchAll(/"finish_reason"\s*:\s*"([a-z_]+)"/g)].pop()?.[1];
              if (u.prompt_tokens) {
                capturado.push({
                  etiqueta: `vuelta ${capturado.length + 1}`,
                  modelo,
                  prompt_tokens: u.prompt_tokens,
                  completion_tokens: u.completion_tokens ?? 0,
                  prompt_tokens_details: { cached_tokens: u.prompt_tokens_details?.cached_tokens ?? 0 },
                  herramientas,
                });
                const v = capturado[capturado.length - 1]!;
                console.log(
                  `    · vuelta ${capturado.length}: ${v.prompt_tokens} entrada (${v.prompt_tokens_details.cached_tokens} caché), ` +
                    `${v.completion_tokens} salida${herramientas.length ? ` · pide ${herramientas.join(", ")}` : ""}`
                );
                if (INTERACTIVO) {
                  // Terminado = respondió sin pedir herramientas, después de
                  // haber trabajado. Una respuesta suelta sin trabajo previo
                  // (un saludo, una pregunta) todavía no es la tarea hecha.
                  const trabajo = capturado.some((x) => x.herramientas.length > 0);
                  guardar(fin === "stop" && herramientas.length === 0 && trabajo).catch((e) => console.error(e));
                }
              }
            } catch {
              // Un `usage` que no parsea no es motivo para cortarle la llamada
              // al agente: se pierde esa medición y la tarea sigue.
            }
          }

          res.writeHead(arriba.status, { "content-type": arriba.headers.get("content-type") ?? "application/json" });
          res.end(texto);
        } catch (err) {
          res.writeHead(502, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: { message: String(err) } }));
        }
      });
    });
    s.listen(PUERTO, () => listo(s));
  });
}

async function mainInteractivo(): Promise<void> {
  await prepararTaller();
  await levantar();
  console.log(`Carpeta preparada: ${TALLER_RELATIVO}/ (${FACTURAS.length} facturas).`);
  console.log(`Midiendo en http://localhost:${PUERTO}/v1 y reenviando al proxy real.`);
  console.log(`Abre Chocolatito Code en esa carpeta con CHOCOLATITO_ENGINE_URL=http://localhost:${PUERTO}/v1`);
  console.log("y dale la orden. Cada vuelta se guarda en datos/uso-real.json. Ctrl+C para terminar.\n");
}

async function main(): Promise<void> {
  await prepararTaller();
  console.log(`Taller preparado: ${FACTURAS.length} facturas en ${TALLER_RELATIVO}/`);

  const servidor = await levantar();
  console.log(`Escuchando en http://localhost:${PUERTO}/v1 y reenviando al proxy real.\n`);

  const orden = ORDEN;
  console.log(`Lanzando Chocolatito Code de verdad:\n  "${orden}"\n`);

  // Se CAPTURA la terminal del agente, no solo se deja pasar. Sin esto el
  // video enseñaba los numeros del agente pero no al agente: la critica era
  // justa. Ahora lo que se ve trabajando es el CLI de verdad.
  const t0 = Date.now();
  const pantalla: Array<{ texto: string; cuando: number }> = [];

  const codigo = await new Promise<number>((listo) => {
    const hijo = spawn(process.execPath, [CLI, "-y", orden], {
      cwd: TALLER,
      stdio: ["ignore", "pipe", "pipe"],
      // CHOCOLATITO_ENGINE_URL y no CHOCOLATITO_PROXY_URL: la segunda solo fija
      // el valor POR DEFECTO del modo suscripcion, y `engineUrl` del
      // ~/.chocolatitorc le gana. La primera se mira antes que nada y manda
      // sobre todo lo demas. Con la equivocada el agente trabaja igual de bien
      // —hablando con el proxy real— y aqui no se mide nada.
      env: { ...process.env, CHOCOLATITO_ENGINE_URL: `http://localhost:${PUERTO}/v1`, CHOCOLATITO_PANTALLA: "normal" },
    });
    const apuntar = (b: Buffer) => {
      const texto = b.toString("utf8");
      pantalla.push({ texto, cuando: Date.now() - t0 });
      process.stdout.write(texto);
    };
    hijo.stdout.on("data", apuntar);
    hijo.stderr.on("data", apuntar);
    hijo.on("close", (c) => listo(c ?? 1));
  });

  servidor.close();
  await fs.mkdir(path.join(RAIZ, "video"), { recursive: true });
  await fs.writeFile(
    path.join(RAIZ, "video", "captura-agente.json"),
    JSON.stringify(pantalla),
    "utf8"
  );
  console.log(`
Terminal del agente capturada: ${pantalla.length} momentos.`);
  console.log(`\nEl agente terminó con código ${codigo}. ${capturado.length} llamadas medidas.`);

  if (capturado.length === 0) {
    console.error("No se midió ninguna llamada. ¿Cogió el CLI la variable CHOCOLATITO_ENGINE_URL?");
    process.exit(1);
  }

  const hecho = await fs.readdir(TALLER);
  console.log(`Archivos en el taller al terminar: ${hecho.join(", ")}`);

  await guardar(codigo === 0);
  console.log("Guardado en datos/uso-real.json");
}

await (INTERACTIVO ? mainInteractivo() : main());
