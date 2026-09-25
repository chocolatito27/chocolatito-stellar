// Monta el video del pitch: una pieza por frase, cortada por FOTOGRAMAS
// contados desde el principio (no por duraciones sueltas, que al sumarse
// desincronizarían voz e imagen), y la narración encima.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const TOMA = "C:/Users/Ryzen/Videos/chocolatito-demo-en-vivo-1440p.mp4";
const SALIDA = "C:/Users/Ryzen/Videos/chocolatito-pitch.mp4";
const FPS = 30;
const guion = JSON.parse(fs.readFileSync(path.join(AQUI, "guion.json"), "utf8"));
const linea = JSON.parse(fs.readFileSync(path.join(AQUI, "linea.json"), "utf8"));

const ff = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
const cod = ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", String(FPS)];
const entrada = "fade=t=in:st=0:d=0.25:color=0x131110";

const lista = [];
let total = 0;
for (const [i, frase] of guion.entries()) {
  const desde = i === 0 ? 0 : Math.round(linea[i].inicio * FPS);
  const hasta = Math.round(linea[i].hasta * FPS);
  const n = hasta - desde;
  total += n;
  const diapo = path.join(AQUI, `diapo-${String(i).padStart(2, "0")}.png`);
  const seg = path.join(AQUI, `seg-${String(i).padStart(2, "0")}.mp4`);
  const v = frase.visual;

  if (v.tipo === "clip") {
    // La toma a su velocidad real: fragmentos de la grabación, sin acelerar.
    const args = ["-loop", "1", "-framerate", String(FPS), "-i", diapo];
    v.tramos.forEach(([a, b]) => args.push("-ss", String(a), "-to", String(b), "-i", TOMA));
    const partes = v.tramos.map((_, k) => `[${k + 1}:v]scale=1440:810:flags=lanczos,fps=${FPS},setpts=PTS-STARTPTS[p${k}]`);
    const unidos = `${v.tramos.map((_, k) => `[p${k}]`).join("")}concat=n=${v.tramos.length}:v=1:a=0,tpad=stop_mode=clone:stop_duration=3[c]`;
    const f = [...partes, unidos, `[0:v][c]overlay=240:150,format=yuv420p,${entrada}[v]`].join(";");
    ff([...args, "-filter_complex", f, "-map", "[v]", "-frames:v", String(n), ...cod, seg]);
  } else {
    ff(["-loop", "1", "-framerate", String(FPS), "-i", diapo, "-vf", `format=yuv420p,${entrada}`, "-frames:v", String(n), ...cod, seg]);
  }
  lista.push(`file '${seg.replace(/\\/g, "/")}'`);
  process.stdout.write(".");
}
fs.writeFileSync(path.join(AQUI, "piezas.txt"), lista.join("\n"));

const soloVideo = path.join(AQUI, "pitch-sin-voz.mp4");
ff(["-f", "concat", "-safe", "0", "-i", path.join(AQUI, "piezas.txt"), "-c", "copy", soloVideo]);
ff(["-i", soloVideo, "-i", path.join(AQUI, "narracion.wav"), "-map", "0:v", "-map", "1:a", "-c:v", "copy",
  "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", SALIDA]);
console.log(`\n${guion.length} piezas, ${total} fotogramas (${(total / FPS).toFixed(2)} s) → ${SALIDA}`);
