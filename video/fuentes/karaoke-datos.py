"""El guion del pitch con el momento de cada palabra, para leerlo tipo karaoke.

Los tiempos son los de la narración del video (pitch2/linea.json). Allí las
palabras están escritas como se pronuncian ("jákaton", "U S D C"); aquí se
devuelven a como se escriben, cuadrando letra por letra. Si no cuadran, falla.
"""
import json
import pathlib
import re
import sys
import unicodedata

AQUI = pathlib.Path(__file__).parent
PITCH2 = AQUI.parent / "pitch2"
PITCH = pathlib.Path(r"C:\Users\Ryzen\Documents\tomas\chocolatito-stellar\PITCH.md")

# Lo mismo que voz.py, palabra por palabra
DICHO = {"hackathon": "jákaton", "Circle": "Sírcol", "USDC": "U S D C", "XLM": "X L M",
         "IA": "I A", "Code": "Coud", "testnet": "test net"}


def letras(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in s if unicodedata.category(c) != "Mn"))


def mmss(t: float) -> str:
    m, s = divmod(t, 60)
    return f"{int(m)}:{s:04.1f}"


guion = json.loads((PITCH2 / "guion.json").read_text(encoding="utf-8"))
linea = json.loads((PITCH2 / "linea.json").read_text(encoding="utf-8"))
assert len(guion) == len(linea), "guion y linea no tienen las mismas frases"

texto = PITCH.read_text(encoding="utf-8").split("## Notas")[0]
titulos = [l[3:].split("·", 1)[1].strip() for l in texto.splitlines() if l.startswith("## ")]

frases = []
for g, x in zip(guion, linea):
    fichas = g["texto"].split()
    esperado = [letras(DICHO.get(re.sub(r"^\W+|\W+$", "", f), f)) for f in fichas]
    dichas = [letras(p["w"]) for p in x["palabras"]]
    if "".join(esperado) != "".join(dichas):
        sys.exit(f"frase {x['i']}: no cuadra\n  guion: {''.join(esperado)}\n  voz:   {''.join(dichas)}")
    dueno = [k for k, d in enumerate(dichas) for _ in d]  # qué palabra dicha lleva cada letra
    pos, palabras = 0, []
    for f, e in zip(fichas, esperado):
        palabras.append([f, x["inicio"] + x["palabras"][dueno[pos]]["t"] if e else None])
        pos += len(e)
    for k in range(len(palabras) - 1, -1, -1):  # una raya suelta toma el tiempo de la siguiente
        if palabras[k][1] is None:
            palabras[k][1] = palabras[k + 1][1] if k + 1 < len(palabras) else x["voz_hasta"]
    frases.append({"b": x["bloque"], "ini": round(x["inicio"], 2), "fin": round(x["voz_hasta"], 2),
                   "palabras": [[f, round(t, 2)] for f, t in palabras]})

total = round(linea[-1]["hasta"], 2)
(AQUI / "datos.json").write_text(json.dumps({"total": total, "bloques": titulos, "frases": frases},
                                            ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

bloque = 0
for n, f in enumerate(frases):
    if f["b"] != bloque:
        bloque = f["b"]
        print(f"\nBLOQUE {bloque} · {titulos[bloque - 1]}")
    print(f"  {n:2d} [{mmss(f['palabras'][0][1])}–{mmss(f['fin'])}] {' '.join(w for w, _ in f['palabras'])}")
print(f"\ntotal {mmss(total)}; palabras {sum(len(f['palabras']) for f in frases)}")
