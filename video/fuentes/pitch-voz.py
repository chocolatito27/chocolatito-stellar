"""La voz del pitch: una frase por archivo, con su duración medida.

Antes de sintetizar nada comprueba que lo que se va a decir es, palabra por
palabra, lo que dice PITCH.md. Si alguien cambia el guion, esto falla en vez de
grabar una versión vieja.
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
VELOCIDAD = sys.argv[1] if len(sys.argv) > 1 else "+0%"
ANTES = 0.5          # silencio antes de la primera frase
ENTRE_FRASES = 0.35  # dentro de un bloque
ENTRE_BLOQUES = 0.8  # al cambiar de bloque (y de voz)

guion = json.loads((AQUI / "guion.json").read_text(encoding="utf-8"))


def normal(t: str) -> str:
    return re.sub(r"\s+", " ", t.replace("**", "")).strip()


# --- Lo que se dice tiene que ser lo que pone el guion
texto = PITCH.read_text(encoding="utf-8")
cuerpo = texto.split("## 0:00")[1].split("## Notas")[0]
bloques = re.split(r"\n## ", "## 0:00" + cuerpo)
for n, b in enumerate(bloques, start=1):
    dicho = normal(" ".join(l[1:] for l in b.split("\n") if l.startswith(">")))
    mio = normal(" ".join(x["texto"] for x in guion if x["bloque"] == n))
    if dicho != mio:
        sys.exit(f"El bloque {n} no coincide con PITCH.md:\n  PITCH: {dicho}\n  guion: {mio}")
print(f"guion = PITCH.md, bloque a bloque ({len(bloques)} bloques)")


async def sintetizar(i: int, frase: dict) -> float:
    mp3 = AQUI / f"frase-{i:02d}.mp3"
    wav = AQUI / f"frase-{i:02d}.wav"
    await edge_tts.Communicate(frase["texto"], frase["voz"], rate=VELOCIDAD).save(str(mp3))
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(mp3),
                    "-ar", "48000", "-ac", "2", str(wav)], check=True)
    dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "default=nw=1:nk=1", str(wav)], capture_output=True, text=True, check=True)
    return float(dur.stdout.strip())


async def main() -> None:
    linea = []
    t = ANTES
    for i, frase in enumerate(guion):
        d = await sintetizar(i, frase)
        linea.append({"i": i, "bloque": frase["bloque"], "inicio": round(t, 3), "voz_hasta": round(t + d, 3)})
        siguiente = guion[i + 1]["bloque"] if i + 1 < len(guion) else None
        t += d + (ENTRE_FRASES if siguiente == frase["bloque"] else ENTRE_BLOQUES)
    # La última imagen se queda un poco más que la voz.
    for a, b in zip(linea, linea[1:]):
        a["hasta"] = b["inicio"]
    linea[-1]["hasta"] = round(linea[-1]["voz_hasta"] + 3.0, 3)
    total = linea[-1]["hasta"]
    (AQUI / "linea.json").write_text(json.dumps(linea, indent=1), encoding="utf-8")

    # Toda la voz en una pista, cada frase en su sitio.
    entradas, filtros = [], []
    for x in linea:
        entradas += ["-i", str(AQUI / f"frase-{x['i']:02d}.wav")]
        ms = int(x["inicio"] * 1000)
        filtros.append(f"[{x['i']}:a]adelay={ms}|{ms}[a{x['i']}]")
    mezcla = "".join(f"[a{x['i']}]" for x in linea) + f"amix=inputs={len(linea)}:normalize=0,apad=whole_dur={total}[voz]"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *entradas,
                    "-filter_complex", ";".join(filtros + [mezcla]), "-map", "[voz]",
                    "-ar", "48000", "-ac", "2", str(AQUI / "narracion.wav")], check=True)
    print(f"velocidad {VELOCIDAD}: {len(linea)} frases, {total:.1f} s en total")


asyncio.run(main())
