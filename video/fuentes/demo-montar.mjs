// Monta el video editado: tarjeta de entrada, la toma entera con su banda de
// rótulos (la toma NO se acelera ni se corta) y tarjeta de cierre.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const TOMA = "C:/Users/Ryzen/Videos/chocolatito-demo-en-vivo-1440p.mp4";
const SALIDA = "C:/Users/Ryzen/Videos/chocolatito-demo-editado.mp4";
const ENTRADA_S = 5;
const CIERRE_S = 9;
const tramos = JSON.parse(fs.readFileSync(path.join(AQUI, "tramos.json"), "utf8"));

const args = ["-hide_banner", "-loglevel", "error", "-y"];
args.push("-loop", "1", "-framerate", "30", "-t", String(ENTRADA_S), "-i", path.join(AQUI, "entrada.png"));
args.push("-i", TOMA);
args.push("-loop", "1", "-framerate", "30", "-t", String(CIERRE_S), "-i", path.join(AQUI, "cierre.png"));
tramos.forEach((_, i) => args.push("-i", path.join(AQUI, `banda-${String(i + 1).padStart(2, "0")}.png`)));
args.push("-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000");
const audio = 3 + tramos.length;

const f = [];
f.push(`[0:v]fps=30,format=yuv420p,fade=t=in:st=0:d=0.7,fade=t=out:st=${ENTRADA_S - 0.7}:d=0.7[entrada]`);
// La toma, algo más pequeña y arriba: la banda va debajo y no tapa nada del terminal.
f.push(`[1:v]scale=1728:972:flags=lanczos,pad=1920:1080:96:0:color=0x131110,fps=30[b0]`);
tramos.forEach((t, i) => {
  f.push(`[b${i}][${3 + i}:v]overlay=0:972:enable='between(t,${t.desde},${t.hasta})'[b${i + 1}]`);
});
f.push(`[b${tramos.length}]format=yuv420p,fade=t=in:st=0:d=0.5[toma]`);
f.push(`[2:v]fps=30,format=yuv420p,fade=t=in:st=0:d=0.8[cierre]`);
f.push(`[entrada][toma][cierre]concat=n=3:v=1:a=0[v]`);

args.push("-filter_complex", f.join(";"), "-map", "[v]", "-map", `${audio}:a`, "-shortest");
args.push("-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30");
args.push("-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", SALIDA);

const r = spawnSync("ffmpeg", args, { stdio: "inherit" });
if (r.status !== 0) process.exit(r.status ?? 1);
console.log(`listo: ${SALIDA}`);
