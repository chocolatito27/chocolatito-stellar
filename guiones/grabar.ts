/**
 * GRABAR LA DEMO A VÍDEO, SIN CAPTURAR PANTALLA
 *
 * Ejecuta `demo.ts` de verdad, captura su salida con los tiempos reales a los
 * que va apareciendo, y la vuelve a dibujar como una terminal en un MP4.
 *
 * POR QUÉ ASÍ Y NO CON UN GRABADOR DE PANTALLA
 *
 * Lo que se ve en el vídeo ES la salida del programa, no una recreación: la
 * transacción que aparece al final se firmó durante esta grabación y se puede
 * comprobar en el explorador. Lo único que cambia respecto a grabar la pantalla
 * es que no salen el escritorio, las notificaciones ni el tamaño de letra que
 * cada uno tenga puesto.
 *
 * Y como cada fotograma dura exactamente lo que tardó en aparecer, el ritmo del
 * vídeo es el ritmo real del programa.
 *
 *   node --experimental-strip-types guiones/grabar.ts
 */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "..");
const SALIDA = path.join(RAIZ, "video");
const CUADROS = path.join(SALIDA, "cuadros");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ANCHO = 1920;
const ALTO = 1080;

interface Trozo {
  texto: string;
  /** Milisegundos desde el arranque. */
  cuando: number;
}

/** Ejecuta la demo de verdad y apunta cuándo aparece cada cosa. */
async function capturar(): Promise<Trozo[]> {
  return new Promise((listo, fallo) => {
    const t0 = Date.now();
    const trozos: Trozo[] = [];
    const hijo = spawn(
      process.execPath,
      ["--experimental-strip-types", path.join(AQUI, "demo.ts")],
      { cwd: RAIZ, env: { ...process.env, FORCE_COLOR: "3" } }
    );

    hijo.stdout.on("data", (b: Buffer) => {
      trozos.push({ texto: b.toString("utf8"), cuando: Date.now() - t0 });
      process.stdout.write(".");
    });
    hijo.stderr.on("data", (b: Buffer) => process.stderr.write(b));
    hijo.on("close", (codigo) => {
      process.stdout.write("\n");
      if (codigo !== 0) return fallo(new Error(`La demo salió con código ${codigo}`));
      trozos.push({ texto: "", cuando: Date.now() - t0 + 2500 });
      listo(trozos);
    });
  });
}

/** Los 256 colores que usa la demo, y solo esos. */
const COLORES: Record<string, string> = {
  "38;5;209": "#ff8b5e",
  "38;5;114": "#7bd88f",
  "38;5;245": "#8a8a8a",
  "38;5;75": "#5eb0ff",
};

/**
 * ANSI a HTML.
 *
 * Se hace a mano porque son cinco códigos contados y meter una dependencia
 * para esto sería añadir una librería al README por cuarenta líneas.
 */
function aHtml(texto: string): string {
  const escapar = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  let html = "";
  let abiertos = 0;
  let resto = texto;

  const patron = /\x1b\[([0-9;]*)m/;
  for (;;) {
    const m = patron.exec(resto);
    if (!m) {
      html += escapar(resto);
      break;
    }
    html += escapar(resto.slice(0, m.index));
    const codigo = m[1] ?? "";
    if (codigo === "0" || codigo === "") {
      html += "</span>".repeat(abiertos);
      abiertos = 0;
    } else if (codigo === "1") {
      html += `<span style="font-weight:700">`;
      abiertos++;
    } else if (COLORES[codigo]) {
      html += `<span style="color:${COLORES[codigo]}">`;
      abiertos++;
    }
    resto = resto.slice(m.index + m[0].length);
  }
  return html + "</span>".repeat(abiertos);
}

function pagina(contenido: string): string {
  return `<!doctype html><meta charset="utf-8"><style>
  html,body{margin:0;height:100%;background:#12100f}
  /* OJO: el texto va dentro de .texto, NO suelto en .marco.
     Con display:flex en el contenedor, cada span de color se convierte en un
     ELEMENTO FLEXIBLE y, en columna, se va a su propia linea: la tabla salia
     partida en tres por cada fila. El flex se queda para empujar la salida
     hacia abajo, y el texto va en un bloque normal dentro.
     (Sin acentos graves aqui dentro: esto vive en una plantilla de texto y
     un acento grave la cerraria.) */
  .marco{box-sizing:border-box;height:100%;padding:44px 48px 40px;
    display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden}
  .texto{font:21px/1.6 "Cascadia Mono","Consolas",ui-monospace,monospace;
    color:#e8ded6;white-space:pre;letter-spacing:.2px}
  .barra{position:fixed;top:0;left:0;right:0;height:34px;background:#1d1917;
    display:flex;align-items:center;gap:8px;padding-left:14px}
  .p{width:11px;height:11px;border-radius:50%}
  </style>
  <div class="barra"><div class="p" style="background:#ff5f57"></div>
  <div class="p" style="background:#febc2e"></div>
  <div class="p" style="background:#28c840"></div></div>
  <div class="marco"><div class="texto">${contenido}</div></div>`;
}

async function main(): Promise<void> {
  // Re-renderizar no puede exigir volver a ejecutar la demo: cada ejecucion
  // firma una transaccion NUEVA en la red. Con la captura guardada se puede
  // ajustar el diseño cuantas veces haga falta sobre la misma grabacion.
  const cache = path.join(SALIDA, "captura.json");
  let trozos: Trozo[];
  if (process.argv.includes("--reusar")) {
    trozos = JSON.parse(await fs.readFile(cache, "utf8")) as Trozo[];
    console.log(`Reusando la captura guardada (${trozos.length} momentos).`);
  } else {
    console.log("Ejecutando la demo de verdad (tarda ~75 s)…");
    trozos = await capturar();
    await fs.mkdir(SALIDA, { recursive: true });
    await fs.writeFile(cache, JSON.stringify(trozos), "utf8");
    console.log(`${trozos.length} momentos capturados y guardados.`);
  }

  await fs.rm(CUADROS, { recursive: true, force: true });
  await fs.mkdir(CUADROS, { recursive: true });

  // Puppeteer no es dependencia de este proyecto: se toma prestado del
  // repositorio del producto, que ya lo tenía. Es una herramienta para grabar
  // el vídeo, no parte de lo que se entrega, así que no ensucia el package.json
  // ni la declaración de terceros del README.
  const modulo = await import(
    "file:///C:/Users/Ryzen/Documents/tomas/chocolatito-code/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js"
  );
  const puppeteer = (modulo as { default?: unknown }).default ?? modulo;
  const navegador = await (puppeteer as {
    launch: (o: unknown) => Promise<{ newPage: () => Promise<any>; close: () => Promise<void> }>;
  }).launch({ executablePath: CHROME, headless: "new" });
  const hoja = await navegador.newPage();
  await hoja.setViewport({ width: ANCHO, height: ALTO, deviceScaleFactor: 1 });

  const lista: string[] = [];
  let acumulado = "";

  for (let i = 0; i < trozos.length; i++) {
    acumulado += trozos[i]!.texto;
    const dura = ((trozos[i + 1]?.cuando ?? trozos[i]!.cuando + 2500) - trozos[i]!.cuando) / 1000;
    if (dura <= 0.001) continue;

    await hoja.setContent(pagina(aHtml(acumulado)));
    const archivo = path.join(CUADROS, `c${String(i).padStart(4, "0")}.png`);
    await hoja.screenshot({ path: archivo });
    // El demuxer `concat` reparte la duración por fotograma, que es lo que
    // hace que el vídeo respete el ritmo real del programa en vez de ir a
    // fotogramas por segundo constantes.
    lista.push(`file '${archivo.replace(/\\/g, "/")}'`, `duration ${dura.toFixed(3)}`);
    process.stdout.write(".");
  }
  // El demuxer ignora la duración del último, así que se repite la imagen.
  const ultimo = lista[lista.length - 2];
  if (ultimo) lista.push(ultimo);

  await navegador.close();
  await fs.writeFile(path.join(SALIDA, "cuadros.txt"), lista.join("\n"), "utf8");
  console.log(`\n${lista.length / 2} cuadros listos en ${CUADROS}`);
  console.log("Ahora: ffmpeg -f concat -safe 0 -i video/cuadros.txt …");
}

await main();
