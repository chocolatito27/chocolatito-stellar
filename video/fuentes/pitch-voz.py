"""La voz del pitch, una sola narradora, con el momento de cada palabra.

1. Comprueba que el guion es PITCH.md palabra por palabra.
2. Solo para el audio, reescribe cómo se PRONUNCIAN algunas palabras (en
   pantalla siguen bien escritas): la voz decía "hatón" por "hackathon".
3. Guarda cuándo suena cada palabra, para que las animaciones entren justo
   cuando se nombra lo que muestran.
"""
import asyncio
import json
import pathlib
import re
import subprocess
import sys

import edge_tts

AQUI = pathlib.Path(__file__).parent
PITCH = pathlib.Path(r"C:\Users\Ryzen\Documents\tomas\chocolatito-stellar\PITCH.md")
VOZ = sys.argv[2] if len(sys.argv) > 2 else "es-PE-CamilaNeural"
VELOCIDAD = sys.argv[1] if len(sys.argv) > 1 else "+7%"
TONO = sys.argv[3] if len(sys.argv) > 3 else "+0Hz"
ANTES, ENTRE_FRASES, ENTRE_BLOQUES = 0.6, 0.35, 0.8

# Cómo se dice, no cómo se escribe. Solo afecta al audio.
PRONUNCIACION = [
    (r"\bhackathon\b", "jákaton"),
    (r"\bCircle\b", "Sírcol"),
    (r"\bUSDC\b", "U S D C"),
    (r"\bXLM\b", "X L M"),
    (r"\bIA\b", "I A"),
    (r"\bChocolatito Code\b", "Chocolatito Coud"),
    (r"\btestnet\b", "test net"),
]

guion = json.loads((AQUI / "guion.json").read_text(encoding="utf-8"))


def normal(t: str) -> str:
    return re.sub(r"\s+", " ", t.replace("**", "")).strip()


texto = PITCH.read_text(encoding="utf-8")
cuerpo = texto.split("## 0:00")[1].split("## Notas")[0]
bloques = re.split(r"\n## ", "## 0:00" + cuerpo)
for n, b in enumerate(bloques, start=1):
    dicho = normal(" ".join(l[1:] for l in b.split("\n") if l.startswith(">")))
    mio = normal(" ".join(x["texto"] for x in guion if x["bloque"] == n))
    if dicho != mio:
        sys.exit(f"El bloque {n} no coincide con PITCH.md:\n  PITCH: {dicho}\n  guion: {mio}")
print(f"guion = PITCH.md, bloque a bloque ({len(bloques)} bloques)")


def para_decir(t: str) -> str:
    for patron, dicho in PRONUNCIACION:
        t = re.sub(patron, dicho, t)
    return t


async def sintetizar(i: int, frase: dict):
    mp3, wav = AQUI / f"frase-{i:02d}.mp3", AQUI / f"frase-{i:02d}.wav"
    com = edge_tts.Communicate(para_decir(frase["texto"]), VOZ, rate=VELOCIDAD, pitch=TONO, boundary="WordBoundary")
    audio, palabras = bytearray(), []
    async for trozo in com.stream():
        if trozo["type"] == "audio":
            audio += trozo["data"]
        elif trozo["type"] == "WordBoundary":
            palabras.append({"w": trozo["text"], "t": round(trozo["offset"] / 1e7, 3)})
    mp3.write_bytes(audio)
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(mp3), "-ar", "48000", "-ac", "2", str(wav)], check=True)
    dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(wav)],
                         capture_output=True, text=True, check=True)
    return float(dur.stdout.strip()), palabras


async def main() -> None:
    linea, t = [], ANTES
    for i, frase in enumerate(guion):
        d, palabras = await sintetizar(i, frase)
        linea.append({"i": i, "bloque": frase["bloque"], "inicio": round(t, 3), "voz_hasta": round(t + d, 3), "palabras": palabras})
        siguiente = guion[i + 1]["bloque"] if i + 1 < len(guion) else None
        t += d + (ENTRE_FRASES if siguiente == frase["bloque"] else ENTRE_BLOQUES)
    for a, b in zip(linea, linea[1:]):
        a["hasta"] = b["inicio"]
    linea[-1]["hasta"] = round(linea[-1]["voz_hasta"] + 3.5, 3)
    total = linea[-1]["hasta"]
    (AQUI / "linea.json").write_text(json.dumps(linea, ensure_ascii=False, indent=1), encoding="utf-8")

    entradas, filtros = [], []
    for x in linea:
        entradas += ["-i", str(AQUI / f"frase-{x['i']:02d}.wav")]
        ms = int(x["inicio"] * 1000)
        filtros.append(f"[{x['i']}:a]adelay={ms}|{ms}[a{x['i']}]")
    mezcla = "".join(f"[a{x['i']}]" for x in linea) + f"amix=inputs={len(linea)}:normalize=0,apad=whole_dur={total}[voz]"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *entradas, "-filter_complex", ";".join(filtros + [mezcla]),
                    "-map", "[voz]", "-ar", "48000", "-ac", "2", str(AQUI / "narracion.wav")], check=True)
    print(f"{VOZ} a {VELOCIDAD}, tono {TONO}: {len(linea)} frases, {total:.1f} s; palabras con tiempo: {sum(len(x['palabras']) for x in linea)}")


asyncio.run(main())
