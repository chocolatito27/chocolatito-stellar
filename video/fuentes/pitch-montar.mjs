// Monta el pitch: cada escena a su duración exacta en fotogramas, la toma real
// dentro de sus pantallas, transiciones cruzadas entre escenas (deslizando al
// cambiar de bloque) y la voz encima. Las escenas vienen alargadas lo que dura
// la transición, así que el total cuadra con la voz al fotograma.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const TOMA = "C:/Users/Ryzen/Videos/chocolatito-demo-en-vivo-1440p.mp4";
const SALIDA = "C:/Users/Ryzen/Videos/chocolatito-pitch-v2.mp4";
const FPS = 30;
const T = 0.45;
const guion = JSON.parse(fs.readFileSync(path.join(AQUI, "guion.json"), "utf8"));
const linea = JSON.parse(fs.readFileSync(path.join(AQUI, "linea.json"), "utf8"));
const ff = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit", cwd: AQUI });
const cod = ["-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-r", String(FPS)];

// Fragmentos de la toma real, a su velocidad, para cada escena de la demo.
function tramos(i, dur) {
  if (i === 11) return [[38.9 - dur, 38.9]];                      // termina justo cuando el agente responde
  if (i === 12) { const x = dur * 0.58; return [[85.3, 85.3 + x], [101.6, 101.6 + (dur - x)]]; } // tabla y pago firmado
  if (i === 13) return [[124.4, 124.4 + dur]];                    // los seis intentos y el "rechazados"
  return null;
}

const segs = [];
for (let i = 0; i < guion.length; i++) {
  const meta = JSON.parse(fs.readFileSync(path.join(AQUI, `escena-${String(i).padStart(2, "0")}.json`), "utf8"));
  const seg = `seg-${String(i).padStart(2, "0")}.mp4`;
  const lista = `escena-${String(i).padStart(2, "0")}.txt`;
  const tr = tramos(i, meta.dur);
  if (tr) {
    const args = ["-f", "concat", "-safe", "0", "-i", lista];
    tr.forEach(([a, b]) => args.push("-ss", a.toFixed(3), "-to", b.toFixed(3), "-i", TOMA));
    const partes = tr.map((_, k) => `[${k + 1}:v]scale=1440:810:flags=lanczos,fps=${FPS},setpts=PTS-STARTPTS[p${k}]`);
    const video = `${tr.map((_, k) => `[p${k}]`).join("")}concat=n=${tr.length}:v=1:a=0,tpad=stop_mode=clone:stop_duration=5,format=yuva420p,fade=t=in:st=0.1:d=0.4:alpha=1[c]`;
    ff([...args, "-filter_complex", [...partes, video, `[0:v]fps=${FPS},format=yuv420p[f];[f][c]overlay=240:160,format=yuv420p[v]`].join(";"),
      "-map", "[v]", "-frames:v", String(meta.N), ...cod, seg]);
  } else {
    ff(["-f", "concat", "-safe", "0", "-i", lista, "-vf", `fps=${FPS},format=yuv420p`, "-frames:v", String(meta.N), ...cod, seg]);
  }
  segs.push({ seg, dur: meta.dur });
  process.stdout.write(".");
}

// Transiciones: fundido dentro de un bloque; deslizamiento suave al cambiar de bloque.
const entradas = segs.flatMap((s) => ["-i", s.seg]);
const f = segs.map((s, k) => `[${k}:v]fps=${FPS},settb=AVTB,format=yuv420p${k === 0 ? ",fade=t=in:st=0:d=0.6" : ""}${k === segs.length - 1 ? `,fade=t=out:st=${(s.dur - 0.9).toFixed(3)}:d=0.9` : ""}[v${k}]`);
let previo = "v0";
let offset = 0;
for (let k = 1; k < segs.length; k++) {
  offset += segs[k - 1].dur;
  const tipo = guion[k].bloque !== guion[k - 1].bloque ? "smoothleft" : "fade";
  f.push(`[${previo}][v${k}]xfade=transition=${tipo}:duration=${T}:offset=${offset.toFixed(3)}[x${k}]`);
  previo = `x${k}`;
}
ff([...entradas, "-i", "narracion.wav", "-filter_complex", f.join(";"), "-map", `[${previo}]`, "-map", `${segs.length}:a`,
  ...cod, "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", SALIDA]);
const total = segs.reduce((s, x) => s + x.dur, 0);
console.log(`\nlisto: ${SALIDA} (${total.toFixed(2)} s previstos)`);
