// Las escenas del pitch, animadas y con la tipografía de chocolatito.space
// (Bungee, Silkscreen, Geist). Cada elemento entra cuando la voz dice su
// palabra: los tiempos salen de linea.json. Se captura fotograma a fotograma
// solo mientras algo se mueve; lo quieto se sostiene sin volver a capturar.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const TOMA = "C:/Users/Ryzen/Videos/chocolatito-demo-en-vivo-1440p.mp4";
const FPS = 30;
const T = 0.45; // lo que dura cada transición: la escena se alarga eso para solaparse
const guion = JSON.parse(fs.readFileSync(path.join(AQUI, "guion.json"), "utf8"));
const linea = JSON.parse(fs.readFileSync(path.join(AQUI, "linea.json"), "utf8"));
const modulo = await import("file:///C:/Users/Ryzen/Documents/tomas/chocolatito-code/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js");
const puppeteer = modulo.default ?? modulo;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const b64 = (f) => `data:image/png;base64,${fs.readFileSync(f).toString("base64")}`;
const LOGO = b64(path.join(AQUI, "logo.png"));
const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Cuándo suena cada palabra pedida (en orden), en segundos desde el inicio de la escena. */
function cuando(i, palabras) {
  const dichas = linea[i].palabras;
  const desfase = i === 0 ? linea[0].inicio : 0; // la primera escena empieza antes que la voz
  let desde = 0;
  return palabras.map((p) => {
    const k = dichas.findIndex((d, j) => j >= desde && norm(d.w) === norm(p));
    if (k < 0) throw new Error(`escena ${i}: la voz no dice "${p}"`);
    desde = k + 1;
    return desfase + dichas[k].t;
  });
}

const FUENTES = `<link href="https://fonts.googleapis.com/css2?family=Bungee&family=Silkscreen&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=block" rel="stylesheet">`;
const CSS = `
:root { --fondo:#1c1330; --crema:#fff4e6; --naranja:#e0673c; --vivo:#fe6e00; --amarillo:#ffd166; --tenue:rgba(255,244,230,.62); }
* { margin:0; padding:0; box-sizing:border-box; }
body { width:1920px; height:1080px; overflow:hidden; color:var(--crema); font-family:"Geist",sans-serif; -webkit-font-smoothing:antialiased;
  background: radial-gradient(1100px 720px at 90% 112%, rgba(224,103,60,.32), transparent 62%),
              radial-gradient(900px 620px at -8% -14%, rgba(78,205,196,.13), transparent 60%), var(--fondo); }
body::before { content:""; position:absolute; inset:0; pointer-events:none;
  background-image: linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
  background-size: 48px 48px; }
.etiqueta { position:absolute; left:150px; top:88px; display:flex; align-items:center; gap:16px; font-family:"Silkscreen"; font-size:28px; color:var(--amarillo); letter-spacing:.04em; }
.etiqueta i { width:16px; height:16px; background:var(--naranja); display:block; }
.pie { position:absolute; left:150px; right:150px; bottom:52px; display:flex; justify-content:space-between; align-items:center; font-family:"Silkscreen"; font-size:19px; color:rgba(255,244,230,.5); }
.pie b { display:flex; align-items:center; gap:12px; font-family:"Bungee"; font-weight:400; font-size:22px; color:var(--crema); }
.pie img { width:36px; height:36px; }
.centro { position:absolute; left:150px; right:150px; top:0; bottom:0; display:flex; flex-direction:column; justify-content:center; }
.titular { font-family:"Bungee"; text-transform:uppercase; line-height:1.02; text-shadow:5px 5px 0 rgba(224,103,60,.85); }
.titular.naranja { color:var(--naranja); text-shadow:5px 5px 0 #200a02; }
.texto { font-size:48px; line-height:1.3; color:rgba(255,244,230,.9); }
.pantalla { position:absolute; left:237px; top:157px; width:1446px; height:816px; border:3px solid rgba(224,103,60,.75); border-radius:18px; overflow:hidden; background:#0e0a16; box-shadow:0 30px 90px rgba(0,0,0,.55); }
.pantalla img { width:1440px; height:810px; display:block; object-fit:cover; object-position:top left; }
.leyenda { position:absolute; left:240px; right:240px; top:1000px; font-size:38px; color:var(--crema); }
`;
const marca = `<div class="pie"><b><img src="${LOGO}">CHOCOLATITO</b><span>STELLAR ODYSSEY PERÚ 2026</span></div>`;
const pagina = (cuerpo, conMarca = true) =>
  `<!doctype html><html><head><meta charset="utf-8">${FUENTES}<style>${CSS}</style></head><body>${cuerpo}${conMarca ? marca : ""}</body></html>`;

// Animaciones de uso común
const SUBE = [{ opacity: 0, transform: "translateY(46px)" }, { opacity: 1, transform: "none" }];
const APARECE = [{ opacity: 0 }, { opacity: 1 }];
const SALTA = [{ opacity: 0, transform: "scale(.72)" }, { opacity: 1, transform: "scale(1.06)", offset: 0.7 }, { opacity: 1, transform: "scale(1)" }];
const DESTAPA = [{ opacity: 0, clipPath: "inset(0 0 100% 0)", transform: "translateY(30px)" }, { opacity: 1, clipPath: "inset(0 0 0% 0)", transform: "none" }];
const a = (sel, kf, t0, dur = 0.6) => ({ sel, kf, t0, dur });

function escena(i) {
  const v = guion[i].visual;
  const eti = v.etiqueta ? `<div class="etiqueta"><i></i>${esc(v.etiqueta)}</div>` : "";
  const anims = [];
  const contadores = [];
  let html;
  if (v.etiqueta) anims.push(a(".etiqueta", APARECE, 0.15, 0.5));

  switch (v.tipo) {
    case "cifra": {
      const largo = v.grande.length > 6;
      html = pagina(`${eti}<div class="centro"><div id="n" class="titular ${v.acento ? "naranja" : ""}" style="font-size:${largo ? 150 : 300}px">${esc(v.grande)}</div>
        <div id="p" class="texto" style="margin-top:46px;font-size:52px;max-width:1400px">${esc(v.pie)}</div></div>`);
      anims.push(a("#n", SALTA, 0.25, 0.7));
      const tp = i === 2 ? cuando(i, ["uses"])[0] : 0.85;
      anims.push(a("#p", SUBE, tp));
      break;
    }
    case "frase": {
      const t2 = cuando(i, [{ 6: "cobrar", 7: "stellar", 16: "presentamos", 17: "producto", 18: "paga" }[i]])[0];
      html = pagina(`${eti}<div class="centro"><div id="l1" class="titular" style="font-size:104px">${esc(v.texto)}</div>
        <div id="l2" class="titular naranja" style="font-size:104px;margin-top:18px">${esc(v.texto2)}</div>
        ${v.pie ? `<div id="pie" style="font-family:'Geist Mono';font-size:30px;color:var(--tenue);margin-top:60px">${esc(v.pie)}</div>` : ""}</div>`);
      anims.push(a("#l1", DESTAPA, 0.25, 0.7), a("#l2", DESTAPA, Math.max(0.6, t2 - 0.15), 0.7));
      if (v.pie) anims.push(a("#pie", APARECE, Math.max(1.4, t2 + 0.8), 0.6));
      break;
    }
    case "pasos": {
      const [p1, p2, p3, nota] = cuando(i, ["termina", "sabe", "firma", "clave"]);
      html = pagina(`${eti}<div class="centro"><div id="ti" class="titular" style="font-size:92px">${esc(v.titulo)}</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:44px;margin-top:74px">
        ${v.pasos.map((p, k) => `<div id="s${k}" style="border-top:5px solid var(--naranja);padding-top:26px"><div style="font-family:'Silkscreen';font-size:30px;color:var(--amarillo)">0${k + 1}</div><div class="texto" style="margin-top:12px;font-size:50px">${esc(p)}</div></div>`).join("")}
        </div><div id="no" class="titular naranja" style="font-size:58px;margin-top:84px">${esc(v.nota)}</div></div>`);
      anims.push(a("#ti", DESTAPA, 0.25, 0.7), a("#s0", SUBE, p1 - 0.1), a("#s1", SUBE, p2 - 0.1), a("#s2", SUBE, p3 - 0.1), a("#no", DESTAPA, nota - 0.15, 0.7));
      break;
    }
    case "flujo": {
      const [c1, c3, c2, nota] = cuando(i, ["paga", "recibimos", "intercambio", "tope"]);
      const caja = (k, t) => `<div id="c${k}" style="flex:1;border:3px solid ${k === 2 ? "var(--naranja)" : "rgba(255,244,230,.28)"};border-radius:18px;padding:44px 36px;font-size:48px;line-height:1.2;${k === 2 ? "background:rgba(224,103,60,.16)" : "background:rgba(255,255,255,.03)"}">${esc(t)}</div>`;
      html = pagina(`${eti}<div class="centro"><div id="ti" class="titular" style="font-size:92px">${esc(v.titulo)}</div>
        <div style="display:flex;align-items:center;gap:30px;margin-top:84px">${caja(0, v.cajas[0])}<div id="f1" class="titular" style="font-size:64px;color:var(--amarillo);text-shadow:none">→</div>${caja(1, v.cajas[1])}<div id="f2" class="titular" style="font-size:64px;color:var(--amarillo);text-shadow:none">→</div>${caja(2, v.cajas[2])}</div>
        <div id="no" style="font-family:'Silkscreen';font-size:30px;color:var(--amarillo);margin-top:64px">${esc(v.nota)}</div></div>`);
      anims.push(a("#ti", DESTAPA, 0.25, 0.7), a("#c0", SUBE, c1 - 0.1), a("#c2", SUBE, c3 - 0.1), a("#f1", APARECE, c2 - 0.2, 0.4), a("#c1", SUBE, c2 - 0.1), a("#f2", APARECE, c2 + 0.2, 0.4), a("#no", APARECE, nota - 0.1, 0.5));
      break;
    }
    case "lista": {
      const pistas = { 10: ["transaccion", "paga", "memo", "u", "cubre"], 15: ["test", "capa", "verificador"] }[i];
      const ts = cuando(i, pistas);
      html = pagina(`${eti}<div class="centro"><div id="ti" class="titular" style="font-size:${i === 10 ? 64 : 78}px;white-space:nowrap">${esc(v.titulo)}</div>
        <div style="margin-top:58px;display:flex;flex-direction:column;gap:28px">
        ${v.items.map((t, k) => `<div id="i${k}" style="display:flex;gap:30px;align-items:center"><span style="flex:none;width:46px;height:46px;background:var(--naranja);color:#1c1330;font-family:'Bungee';font-size:30px;display:flex;align-items:center;justify-content:center">✓</span><span class="texto" style="font-size:52px">${esc(t)}</span></div>`).join("")}
        </div></div>`);
      anims.push(a("#ti", DESTAPA, 0.25, 0.7));
      ts.forEach((t, k) => anims.push(a(`#i${k}`, [{ opacity: 0, transform: "translateX(-40px)" }, { opacity: 1, transform: "none" }], t - 0.1, 0.5)));
      break;
    }
    case "comparacion": {
      const [t29, t01] = cuando(i, ["veintinueve", "decima"]);
      html = pagina(`${eti}<div class="centro"><div style="display:grid;grid-template-columns:1fr 3px 1fr;gap:90px;align-items:center">
        <div id="izq"><div style="font-family:'Silkscreen';font-size:32px;color:var(--amarillo)">CON TARJETA</div><div id="n29" class="titular naranja" style="font-size:210px;margin-top:10px;white-space:nowrap">0×</div><div class="texto" style="margin-top:24px">${esc(v.izq[1])}</div></div>
        <div id="raya" style="height:460px;background:rgba(255,244,230,.25)"></div>
        <div id="der"><div style="font-family:'Silkscreen';font-size:32px;color:var(--amarillo)">EN STELLAR</div><div class="titular" style="font-size:210px;margin-top:10px;white-space:nowrap">0.1%</div><div class="texto" style="margin-top:24px">${esc(v.der[1])}</div></div>
        </div></div>`);
      anims.push(a("#izq", SUBE, t29 - 0.35, 0.5), a("#raya", APARECE, t29, 0.5), a("#der", SUBE, t01 - 0.2, 0.6));
      contadores.push({ sel: "#n29", desde: 0, hasta: 29, t0: t29 - 0.2, dur: 1.1, sufijo: "×" });
      break;
    }
    case "final": {
      html = pagina(`<div class="centro" style="align-items:center;text-align:center">
        <img id="lo" src="${LOGO}" style="width:230px;height:230px">
        <div id="gr" class="titular" style="font-size:190px;margin-top:26px">GRACIAS.</div>
        <div id="ta" style="font-family:'Silkscreen';font-size:34px;color:var(--amarillo);margin-top:22px">CHOCOLATITO · PAGO POR USO EN STELLAR</div>
        <div id="en" style="font-family:'Geist Mono';font-size:32px;color:var(--tenue);margin-top:46px;line-height:1.7">github.com/chocolatito27/chocolatito-stellar<br>chocolatito.space</div></div>`, false);
      anims.push(a("#lo", SALTA, 0.1, 0.7), a("#gr", DESTAPA, 0.35, 0.7), a("#ta", APARECE, 0.9, 0.5), a("#en", APARECE, 1.3, 0.6));
      break;
    }
    default: { // web, fotograma, clip: una "pantalla" con su leyenda
      let img = "";
      if (v.tipo === "web") img = b64(path.join(AQUI, "web.png"));
      if (v.tipo === "fotograma") {
        const png = path.join(AQUI, `fotograma-${i}.png`);
        execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(v.t), "-i", TOMA, "-frames:v", "1", "-vf", "scale=1440:810:flags=lanczos", png]);
        img = b64(png);
      }
      const leyenda = v.pie ?? { 11: "La tarea, de verdad: 8 facturas → balance.md", 12: "4 llamadas medidas → un pago firmado en la cadena", 13: "6 intentos de colar un pago falso: todos rechazados" }[i];
      html = pagina(`${eti}<div id="pa" class="pantalla">${img ? `<img src="${img}">` : ""}</div><div id="le" class="leyenda">${esc(leyenda)}</div>`, false);
      // La pantalla del video no se mueve: el video se pone encima en su sitio exacto.
      if (img) anims.push(a("#pa", [{ opacity: 0, transform: "scale(.965)" }, { opacity: 1, transform: "none" }], 0.1, 0.7));
      anims.push(a("#le", SUBE, 0.45, 0.6));
    }
  }
  return { html, anims, contadores };
}

const navegador = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
const hoja = await navegador.newPage();
await hoja.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
const soloUna = process.argv[2] !== undefined ? Number(process.argv[2]) : null;

for (let i = 0; i < guion.length; i++) {
  if (soloUna !== null && i !== soloUna) continue;
  const dur = linea[i].hasta - (i === 0 ? 0 : linea[i].inicio);
  const segDur = dur + (i < guion.length - 1 ? T : 0);
  const N = Math.round(segDur * FPS);
  const { html, anims, contadores } = escena(i);

  await hoja.setContent(html, { waitUntil: "load", timeout: 60000 });
  const faltan = await hoja.evaluate(async () => {
    const pedidas = ["400 80px Bungee", "400 28px Silkscreen", "400 40px Geist", "400 30px 'Geist Mono'"];
    await Promise.all(pedidas.map((f) => document.fonts.load(f)));
    return pedidas.filter((f) => !document.fonts.check(f));
  });
  if (faltan.length) throw new Error(`escena ${i}: no cargaron ${faltan.join(", ")}`);
  const fuera = await hoja.evaluate(() => [...document.querySelectorAll("body *")].some((e) => {
    const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > 1921 || r.bottom > 1081 || r.left < -1);
  }));
  if (fuera) throw new Error(`escena ${i}: algo se sale del lienzo`);

  await hoja.evaluate((anims, contadores) => {
    window.__a = anims.map((x) => { const an = document.querySelector(x.sel).animate(x.kf, { duration: x.dur * 1000, delay: x.t0 * 1000, fill: "both", easing: "cubic-bezier(.2,.8,.2,1)" }); an.pause(); return an; });
    window.__c = contadores;
    window.__fijar = (t) => {
      for (const an of window.__a) an.currentTime = t * 1000;
      for (const c of window.__c) {
        const p = Math.min(1, Math.max(0, (t - c.t0) / c.dur));
        document.querySelector(c.sel).textContent = Math.round(c.desde + (c.hasta - c.desde) * (1 - Math.pow(1 - p, 3))) + c.sufijo;
      }
    };
  }, anims, contadores);

  // Fotogramas que hay que capturar: el primero y todos los que caen dentro de una animación.
  const capturar = new Set([0]);
  for (const x of [...anims, ...contadores]) {
    for (let f = Math.max(0, Math.floor(x.t0 * FPS)); f <= Math.min(N - 1, Math.ceil((x.t0 + x.dur) * FPS)); f++) capturar.add(f);
  }
  const orden = [...capturar].sort((p, q) => p - q);
  const lista = ["ffconcat version 1.0"];
  for (const [k, f] of orden.entries()) {
    await hoja.evaluate((t) => window.__fijar(t), f / FPS);
    const png = path.join(AQUI, `e${String(i).padStart(2, "0")}-${String(f).padStart(4, "0")}.png`);
    await hoja.screenshot({ path: png });
    const sig = k + 1 < orden.length ? orden[k + 1] : N;
    lista.push(`file '${path.basename(png)}'`, `duration ${((sig - f) / FPS).toFixed(5)}`);
  }
  lista.push(`file '${path.basename(path.join(AQUI, `e${String(i).padStart(2, "0")}-${String(orden.at(-1)).padStart(4, "0")}.png`))}'`);
  fs.writeFileSync(path.join(AQUI, `escena-${String(i).padStart(2, "0")}.txt`), lista.join("\n"));
  fs.writeFileSync(path.join(AQUI, `escena-${String(i).padStart(2, "0")}.json`), JSON.stringify({ N, segDur, dur }));
  process.stdout.write(`escena ${i}: ${orden.length} capturas para ${N} fotogramas\n`);
}
await navegador.close();
