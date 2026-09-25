// Dibuja con Chrome los rótulos del video editado: la tarjeta de entrada, la de
// cierre y una banda de texto por tramo. Los tiempos van en tramos.json, que
// también lee el montaje, para que texto y tiempo no puedan separarse.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const modulo = await import(
  "file:///C:/Users/Ryzen/Documents/tomas/chocolatito-code/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js"
);
const puppeteer = modulo.default ?? modulo;
const tramos = JSON.parse(await fs.readFile(path.join(AQUI, "tramos.json"), "utf8"));

const FUENTES = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&family=Geist:wght@400;500&family=Geist+Mono:wght@400;500&display=block" rel="stylesheet">`;

const BASE = `
:root { --fondo:#131110; --crema:#F3EAE4; --terracota:#D97757; --gris:#8C817A; --linea:rgba(217,119,87,.35); }
* { margin:0; padding:0; box-sizing:border-box; }
html, body { background:var(--fondo); color:var(--crema); font-family:"Geist", "Segoe UI", sans-serif; -webkit-font-smoothing:antialiased; }
.mono { font-family:"Geist Mono", "Cascadia Mono", monospace; }
`;

const entrada = `<!doctype html><html><head><meta charset="utf-8">${FUENTES}<style>${BASE}
body { width:1920px; height:1080px; display:flex; flex-direction:column; justify-content:center; padding:0 180px; position:relative; }
.eyebrow { font-family:"Geist Mono"; font-size:24px; letter-spacing:.18em; color:var(--terracota); margin-bottom:44px; }
h1 { font-family:"Fraunces"; font-weight:600; font-size:168px; line-height:.95; letter-spacing:-.02em; }
h2 { font-family:"Fraunces"; font-style:italic; font-weight:400; font-size:76px; color:var(--terracota); margin-top:14px; }
p { font-size:36px; line-height:1.45; max-width:1180px; margin-top:56px; color:rgba(243,234,228,.86); }
.pie { position:absolute; left:180px; right:180px; bottom:84px; display:flex; flex-direction:column; gap:10px; font-family:"Geist Mono"; font-size:21px; color:var(--gris); border-top:1px solid var(--linea); padding-top:26px; }
</style></head><body>
<div class="eyebrow">STELLAR ODYSSEY PERÚ 2026 · TRACK AI AGENTS</div>
<h1>Chocolatito</h1>
<h2>pago por uso en Stellar</h2>
<p>Un agente de IA que, al terminar cada tarea, paga exactamente lo que costó: en USDC, por el DEX de Stellar, y verificado en la cadena.</p>
<div class="pie">
  <span>Grabación de pantalla real · una sola toma, sin cortes · Stellar testnet · 24 sep 2026</span>
  <span>Lo que se ve tecleado lo escribe un guion: guiones/grabar-en-terminal.ps1</span>
</div>
</body></html>`;

const cierre = `<!doctype html><html><head><meta charset="utf-8">${FUENTES}<style>${BASE}
body { width:1920px; height:1080px; padding:150px 180px 0; position:relative; }
.eyebrow { font-family:"Geist Mono"; font-size:24px; letter-spacing:.18em; color:var(--terracota); }
h1 { font-family:"Fraunces"; font-weight:400; font-size:74px; margin-top:22px; letter-spacing:-.01em; }
.cifras { display:grid; grid-template-columns:repeat(3, 1fr); gap:56px; margin-top:76px; }
.cifra b { display:block; font-family:"Fraunces"; font-weight:600; font-size:92px; line-height:1; font-variant-numeric:tabular-nums; }
.cifra b small { font-family:"Geist Mono"; font-weight:400; font-size:30px; color:var(--terracota); margin-left:12px; letter-spacing:.04em; }
.cifra span { display:block; font-size:28px; line-height:1.4; color:rgba(243,234,228,.8); margin-top:22px; max-width:440px; }
.enlaces { position:absolute; left:180px; right:180px; bottom:96px; border-top:1px solid var(--linea); padding-top:32px; display:grid; grid-template-columns:200px 1fr; row-gap:14px; font-size:26px; }
.enlaces dt { font-family:"Geist Mono"; font-size:20px; letter-spacing:.14em; color:var(--gris); padding-top:5px; }
.enlaces dd { font-family:"Geist Mono"; color:var(--crema); }
</style></head><body>
<div class="eyebrow">LO QUE ACABA DE PASAR</div>
<h1>Una tarea, un pago, comprobable.</h1>
<div class="cifras">
  <div class="cifra"><b>0.0102634<small>USDC</small></b><span>cobrados: lo que costó la tarea, medido llamada a llamada</span></div>
  <div class="cifra"><b>0.00001<small>XLM</small></b><span>de comisión de red: el 0.1 % de lo que salió de la cuenta del agente</span></div>
  <div class="cifra"><b>29×</b><span>lo cobrado: eso sería la comisión fija de una tarjeta, ~0.30 USD</span></div>
</div>
<dl class="enlaces">
  <dt>TRANSACCIÓN</dt><dd>stellar.expert/explorer/testnet/tx/a0c3956d…a947c</dd>
  <dt>CÓDIGO</dt><dd>github.com/chocolatito27/chocolatito-stellar</dd>
  <dt>PRODUCTO</dt><dd>chocolatito.space</dd>
</dl>
</body></html>`;

const banda = (t) => `<!doctype html><html><head><meta charset="utf-8">${FUENTES}<style>${BASE}
body { width:1920px; height:108px; display:flex; align-items:center; gap:28px; padding:0 96px; background:#0E0C0B; border-top:1px solid var(--linea); }
.fase { font-family:"Geist Mono"; font-weight:500; font-size:18px; letter-spacing:.14em; color:#1A1412; background:var(--terracota); padding:9px 14px 8px; border-radius:6px; white-space:nowrap; }
.texto { font-size:34px; line-height:1.2; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lado { font-family:"Geist Mono"; font-size:17px; color:var(--gris); white-space:nowrap; letter-spacing:.06em; }
</style></head><body>
<span class="fase">${t.fase}</span><span class="texto">${t.texto}</span><span class="lado">tiempo real · testnet</span>
</body></html>`;

const navegador = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
});
const hoja = await navegador.newPage();

async function pintar(html, ancho, alto, archivo) {
  await hoja.setViewport({ width: ancho, height: alto, deviceScaleFactor: 1 });
  await hoja.setContent(html, { waitUntil: "load", timeout: 60000 });
  await hoja.evaluate(() => document.fonts.ready);
  // Que las fuentes estén de verdad, no el sustituto: sin esto, un rótulo en
  // la letra de repuesto saldría igual de "bien" y nadie lo notaría.
  const faltan = await hoja.evaluate(async () => {
    const pedidas = ["400 34px Geist", "500 18px 'Geist Mono'", "600 92px Fraunces", "italic 400 76px Fraunces"];
    await Promise.all(pedidas.map((f) => document.fonts.load(f)));
    return pedidas.filter((f) => !document.fonts.check(f));
  });
  if (faltan.length) throw new Error(`No cargaron las fuentes: ${faltan.join(", ")}`);
  // Un rótulo que no cabe se corta con puntos suspensivos: eso es un fallo, no un estilo.
  const cortado = await hoja.evaluate(() => {
    const t = document.querySelector(".texto");
    return t ? t.scrollWidth > t.clientWidth : false;
  });
  if (cortado) throw new Error(`El texto no cabe en ${archivo}`);
  await hoja.screenshot({ path: path.join(AQUI, archivo) });
}

await pintar(entrada, 1920, 1080, "entrada.png");
await pintar(cierre, 1920, 1080, "cierre.png");
for (const [i, t] of tramos.entries()) {
  await pintar(banda(t), 1920, 108, `banda-${String(i + 1).padStart(2, "0")}.png`);
}
await navegador.close();
console.log(`rótulos listos: entrada, cierre y ${tramos.length} bandas`);
