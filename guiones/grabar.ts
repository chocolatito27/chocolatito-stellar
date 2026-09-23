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

/**
 * ANSI a HTML, con la paleta de 256 colores entera.
 *
 * Antes habia un diccionario con los cuatro colores que usaba la demo. Sirvio
 * mientras solo se grababa la demo; en cuanto entro la terminal del agente de
 * verdad -que usa docenas- todo lo demas salia en gris.
 */
function color256(n: number): string {
  if (n < 16) {
    const base = [
      "#12100f", "#e05252", "#7bd88f", "#e0c060", "#5eb0ff", "#c77bd8", "#5ed8d8", "#c8c0b8",
      "#5a5248", "#ff8b5e", "#9bf0a8", "#ffd97d", "#8ac6ff", "#e0a0f0", "#8af0f0", "#f0ebe4",
    ];
    return base[n] ?? "#e8ded6";
  }
  if (n < 232) {
    // Cubo 6x6x6. Los niveles no son lineales: el primer salto es grande y el
    // resto van de 40 en 40. Repartirlos a ojo desluce los grises del CLI.
    const i = n - 16;
    const paso = (v: number) => (v === 0 ? 0 : 55 + v * 40);
    const r = paso(Math.floor(i / 36));
    const g = paso(Math.floor((i % 36) / 6));
    const b = paso(i % 6);
    return `rgb(${r},${g},${b})`;
  }
  const g = 8 + (n - 232) * 10;
  return `rgb(${g},${g},${g})`;
}

/**
 * ANSI a HTML.
 *
 * Se hace a mano porque es un puñado de codigos y meter una dependencia para
 * esto seria añadir una libreria al README por sesenta lineas.
 *
 * Un codigo que no se entiende NO abre etiqueta: si abriera sin que nadie
 * sepa cerrarla, el resto del documento heredaria un estilo suelto.
 */
function aHtml(texto: string): string {
  const escapar = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  let html = "";
  let abiertos = 0;
  // Fuera todo lo que NO es color antes de empezar. Una terminal de verdad
  // manda mucho mas que codigos SGR: enseñar y ocultar el cursor, borrar la
  // linea, mover el cursor. Nada de eso se dibuja, pero si se deja, sale
  // escrito tal cual en pantalla —"D[?25h" al final del agente— y parece
  // basura en el video.
  let resto = texto
    // ESC[?25h y ESC[?25l: enseñar y ocultar el cursor.
    .replace(/\x1b\[\?[0-9;]*[a-zA-Z]/g, "")
    // ESC[2K, ESC[1A...: borrar linea, mover el cursor. Todo menos la 'm',
    // que es la del color y la unica que si se dibuja.
    .replace(/\x1b\[[0-9;]*[A-HJKSTfsu]/g, "")
    // Retorno de carro suelto: la terminal lo usa para reescribir la linea.
    .replace(/\r(?!\n)/g, "");

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
    } else if (codigo === "2") {
      html += `<span style="opacity:.62">`;
      abiertos++;
    } else if (codigo === "3") {
      html += `<span style="font-style:italic">`;
      abiertos++;
    } else if (/^38;5;\d+$/.test(codigo)) {
      html += `<span style="color:${color256(Number(codigo.split(";")[2]))}">`;
      abiertos++;
    } else if (/^48;5;\d+$/.test(codigo)) {
      html += `<span style="background:${color256(Number(codigo.split(";")[2]))}">`;
      abiertos++;
    } else if (/^3[0-7]$/.test(codigo)) {
      html += `<span style="color:${color256(Number(codigo) - 30)}">`;
      abiertos++;
    } else if (/^9[0-7]$/.test(codigo)) {
      html += `<span style="color:${color256(Number(codigo) - 90 + 8)}">`;
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

  // EL VIDEO VA EN DOS TRAMOS, Y EL ORDEN IMPORTA.
  //
  // Antes solo se grababa el cobro, con los numeros del agente reproducidos
  // desde el JSON. Se veian sus cifras pero no se le veia a el, y eso es
  // exactamente lo que hay que enseñar: primero Chocolatito Code trabajando de
  // verdad sobre los archivos, y despues el pago de lo que ese trabajo costo.
  const agente = await fs
    .readFile(path.join(SALIDA, "captura-agente.json"), "utf8")
    .then((t) => JSON.parse(t) as Trozo[])
    .catch(() => [] as Trozo[]);

  if (agente.length === 0) {
    console.log("(sin captura del agente; se graba solo el cobro)");
  } else {
    console.log(`Tramo 1: ${agente.length} momentos del agente trabajando.`);
  }

  // Se desplazan los tiempos del segundo tramo para que vayan detras del
  // primero, con un respiro de 2 s entre los dos.
  const finAgente = agente.length ? agente[agente.length - 1]!.cuando + 2000 : 0;
  const todos: Trozo[] = [
    ...agente,
    ...trozos.map((t) => ({ texto: t.texto, cuando: t.cuando + finAgente })),
  ];
  trozos = todos;

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
