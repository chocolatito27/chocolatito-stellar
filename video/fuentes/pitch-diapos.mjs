// Las imágenes del pitch, una por frase. Las de "clip" son solo el marco: el
// video de la toma se pone encima al montar.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const TOMA = "C:/Users/Ryzen/Videos/chocolatito-demo-en-vivo-1440p.mp4";
const guion = JSON.parse(fs.readFileSync(path.join(AQUI, "guion.json"), "utf8"));
const modulo = await import(
  "file:///C:/Users/Ryzen/Documents/tomas/chocolatito-code/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js"
);
const puppeteer = modulo.default ?? modulo;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const dataUri = (archivo) => `data:image/png;base64,${fs.readFileSync(archivo).toString("base64")}`;

const FUENTES = `<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400;1,9..144,600&family=Geist:wght@400;500&family=Geist+Mono:wght@400;500&display=block" rel="stylesheet">`;
const CSS = `
:root { --fondo:#131110; --crema:#F3EAE4; --terracota:#D97757; --gris:#8C817A; --linea:rgba(217,119,87,.32); }
* { margin:0; padding:0; box-sizing:border-box; }
body { width:1920px; height:1080px; background:var(--fondo); color:var(--crema); font-family:"Geist",sans-serif; position:relative; overflow:hidden; -webkit-font-smoothing:antialiased; }
.etiqueta { position:absolute; left:160px; top:96px; font-family:"Geist Mono"; font-size:24px; letter-spacing:.2em; color:var(--terracota); }
.marca { position:absolute; left:160px; right:160px; bottom:64px; display:flex; justify-content:space-between; font-family:"Geist Mono"; font-size:19px; letter-spacing:.08em; color:var(--gris); }
.centro { position:absolute; left:160px; right:160px; top:0; bottom:0; display:flex; flex-direction:column; justify-content:center; }
.fr { font-family:"Fraunces"; }
.acento { color:var(--terracota); }
`;
const pagina = (cuerpo, conMarca = true) => `<!doctype html><html><head><meta charset="utf-8">${FUENTES}<style>${CSS}</style></head><body>
${cuerpo}${conMarca ? `<div class="marca"><span>CHOCOLATITO · PAGO POR USO EN STELLAR</span><span>STELLAR ODYSSEY PERÚ 2026</span></div>` : ""}</body></html>`;

function marcoDeMedio(v, img) {
  // Hueco de 1440x810 en (240,150): ahí va el fotograma, la web o el video.
  return pagina(`<div class="etiqueta">${esc(v.etiqueta)}</div>
<div style="position:absolute;left:239px;top:149px;width:1442px;height:812px;border:1px solid var(--linea);border-radius:10px;overflow:hidden;background:#0c0a09">
${img ? `<img src="${img}" style="width:1440px;height:810px;object-fit:cover;object-position:top left;display:block">` : ""}</div>
${v.pie ? `<div style="position:absolute;left:240px;top:990px;font-size:34px;color:rgba(243,234,228,.9)">${esc(v.pie)}</div>` : ""}`, false);
}

const plantillas = {
  cifra: (v) => pagina(`<div class="etiqueta">${esc(v.etiqueta)}</div><div class="centro">
<div class="fr ${v.acento ? "acento" : ""}" style="font-weight:600;font-size:${v.grande.length > 6 ? 170 : 300}px;line-height:1;letter-spacing:-.02em">${esc(v.grande)}</div>
<div style="font-size:48px;margin-top:40px;color:rgba(243,234,228,.85);max-width:1300px;line-height:1.3">${esc(v.pie)}</div></div>`),
  frase: (v) => pagina(`<div class="etiqueta">${esc(v.etiqueta)}</div><div class="centro">
<div class="fr" style="font-weight:600;font-size:118px;line-height:1.08;letter-spacing:-.015em">${esc(v.texto)}</div>
<div class="fr acento" style="font-style:italic;font-size:118px;line-height:1.08;margin-top:8px">${esc(v.texto2)}</div>
${v.pie ? `<div style="font-family:'Geist Mono';font-size:28px;color:var(--gris);margin-top:64px">${esc(v.pie)}</div>` : ""}</div>`),
  pasos: (v) => pagina(`<div class="etiqueta">${esc(v.etiqueta)}</div><div class="centro">
<div class="fr" style="font-weight:600;font-size:96px;letter-spacing:-.015em">${esc(v.titulo)}</div>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:40px;margin-top:70px">
${v.pasos.map((p, i) => `<div style="border-top:2px solid var(--terracota);padding-top:26px"><div style="font-family:'Geist Mono';font-size:26px;color:var(--terracota)">0${i + 1}</div><div style="font-size:46px;margin-top:14px;line-height:1.2">${esc(p)}</div></div>`).join("")}
</div><div class="fr acento" style="font-style:italic;font-size:58px;margin-top:80px">${esc(v.nota)}</div></div>`),
  flujo: (v) => pagina(`<div class="etiqueta">${esc(v.etiqueta)}</div><div class="centro">
<div class="fr" style="font-weight:600;font-size:96px;letter-spacing:-.015em">${esc(v.titulo)}</div>
<div style="display:flex;align-items:center;gap:30px;margin-top:80px">
${v.cajas.map((c, i) => `${i ? `<div style="font-size:64px;color:var(--terracota)">→</div>` : ""}<div style="flex:1;border:1.5px solid ${i === 2 ? "var(--terracota)" : "var(--linea)"};border-radius:14px;padding:40px 34px;font-size:44px;line-height:1.2;${i === 2 ? "background:rgba(217,119,87,.10)" : ""}">${esc(c)}</div>`).join("")}
</div><div style="font-family:'Geist Mono';font-size:30px;color:var(--gris);margin-top:60px">${esc(v.nota)}</div></div>`),
  lista: (v) => pagina(`<div class="etiqueta">${esc(v.etiqueta)}</div><div class="centro">
<div class="fr" style="font-weight:600;font-size:84px;letter-spacing:-.015em;line-height:1.1">${esc(v.titulo)}</div>
<div style="margin-top:56px;display:flex;flex-direction:column;gap:26px">
${v.items.map((t) => `<div style="display:flex;gap:28px;align-items:baseline;font-size:48px;line-height:1.25"><span style="color:var(--terracota);font-family:'Geist Mono';font-size:40px">✓</span><span>${esc(t)}</span></div>`).join("")}
</div></div>`),
  comparacion: (v) => pagina(`<div class="etiqueta">${esc(v.etiqueta)}</div><div class="centro">
<div style="display:grid;grid-template-columns:1fr 1px 1fr;gap:90px;align-items:center">
<div><div class="fr acento" style="font-weight:600;font-size:260px;line-height:1">${esc(v.izq[0])}</div><div style="font-size:46px;margin-top:30px;line-height:1.3">${esc(v.izq[1])}</div></div>
<div style="height:420px;background:var(--linea)"></div>
<div><div class="fr" style="font-weight:600;font-size:260px;line-height:1">${esc(v.der[0])}</div><div style="font-size:46px;margin-top:30px;line-height:1.3">${esc(v.der[1])}</div></div>
</div></div>`),
  final: () => pagina(`<div class="centro" style="align-items:flex-start">
<div class="fr" style="font-weight:600;font-size:230px;line-height:1;letter-spacing:-.02em">Gracias.</div>
<div class="fr acento" style="font-style:italic;font-size:64px;margin-top:26px">Chocolatito · pago por uso en Stellar</div>
<div style="font-family:'Geist Mono';font-size:32px;margin-top:80px;line-height:1.7;color:rgba(243,234,228,.9)">github.com/chocolatito27/chocolatito-stellar<br>chocolatito.space</div></div>`, false),
};

const navegador = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
const hoja = await navegador.newPage();
await hoja.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

async function pintar(html, archivo) {
  await hoja.setContent(html, { waitUntil: "load", timeout: 60000 });
  const faltan = await hoja.evaluate(async () => {
    const pedidas = ["600 96px Fraunces", "italic 400 96px Fraunces", "400 40px Geist", "400 24px 'Geist Mono'"];
    await Promise.all(pedidas.map((f) => document.fonts.load(f)));
    return pedidas.filter((f) => !document.fonts.check(f));
  });
  if (faltan.length) throw new Error(`No cargaron las fuentes: ${faltan.join(", ")}`);
  // Nada puede salirse del lienzo: sería texto cortado en el video.
  const fuera = await hoja.evaluate(() =>
    [...document.querySelectorAll("body *")].some((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > 1921 || r.bottom > 1081); })
  );
  if (fuera) throw new Error(`Algo se sale del lienzo en ${archivo}`);
  await hoja.screenshot({ path: path.join(AQUI, archivo) });
}

// La web de verdad: chocolatito.space, en la parte donde están los precios.
const web = path.join(AQUI, "web.png");
{
  const p = await navegador.newPage();
  await p.setViewport({ width: 1440, height: 810, deviceScaleFactor: 1 });
  await p.goto("https://chocolatito.space", { waitUntil: "load", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2500));
  const hay = await p.evaluate(() => {
    const el = [...document.querySelectorAll("section, div")].find((e) => /16\.99/.test(e.textContent || "") && e.getBoundingClientRect().height < 1400 && e.getBoundingClientRect().height > 300);
    if (!el) return false;
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 40);
    return true;
  });
  await new Promise((r) => setTimeout(r, 1500));
  await p.screenshot({ path: web });
  console.log(`web capturada (${hay ? "en los precios" : "portada: no encontré los precios"})`);
  await p.close();
}

for (const [i, frase] of guion.entries()) {
  const v = frase.visual;
  const archivo = `diapo-${String(i).padStart(2, "0")}.png`;
  if (v.tipo === "fotograma") {
    const png = path.join(AQUI, `fotograma-${i}.png`);
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(v.t), "-i", TOMA, "-frames:v", "1", "-vf", "scale=1440:810:flags=lanczos", png]);
    await pintar(marcoDeMedio(v, dataUri(png)), archivo);
  } else if (v.tipo === "web") {
    await pintar(marcoDeMedio(v, dataUri(web)), archivo);
  } else if (v.tipo === "clip") {
    await pintar(marcoDeMedio(v, null), archivo);
  } else {
    await pintar(plantillas[v.tipo](v), archivo);
  }
}
await navegador.close();
console.log(`${guion.length} diapositivas listas`);
