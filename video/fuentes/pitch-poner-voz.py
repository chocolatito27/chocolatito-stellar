"""Pone en el video del pitch la voz grabada con el karaoke.

1. Busca la cuenta 3-2-1 y el pitido agudo: ese pitido es el segundo cero.
2. Transcribe la grabación y ubica cada frase del guion. Si una frase se dijo
   dos veces, se queda con la última.
3. Pone cada frase en el segundo en que empieza en el video (en el ritmo
   calmado, todo un 7,5 % más tarde, porque el video se estira lo mismo) y
   dice cuánto tuvo que moverla.
4. Cambia el audio del video y, en el ritmo calmado, lo estira.

    python poner-voz.py GRABACION [--ritmo video|calmado]
"""
import argparse
import difflib
import json
import pathlib
import re
import subprocess
import sys
import unicodedata

import numpy as np

AQUI = pathlib.Path(__file__).parent
DATOS = json.loads((AQUI / "datos.json").read_text(encoding="utf-8"))
VIDEO = pathlib.Path(r"C:\Users\Ryzen\Videos\chocolatito-pitch-v2.mp4")
SR = 48000

ap = argparse.ArgumentParser()
ap.add_argument("grabacion")
ap.add_argument("--ritmo", choices=["video", "calmado"], default="video")
ap.add_argument("--salida", default=r"C:\Users\Ryzen\Videos\chocolatito-pitch-voz-humana.mp4")
ap.add_argument("--modelo", default="small")
a = ap.parse_args()
K = 1.075 if a.ritmo == "calmado" else 1.0
TOTAL = DATOS["total"] * K


def leer(sr: int, filtros: str | None = None, ruta: str | None = None) -> np.ndarray:
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", ruta or a.grabacion, "-ac", "1", "-ar", str(sr)]
    if filtros:
        cmd += ["-af", filtros]
    salida = subprocess.run(cmd + ["-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(salida, dtype=np.float32).copy()


def letras(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in s if unicodedata.category(c) != "Mn"))


# 1. El pitido: la misma cuenta que suena en la página (3 graves y uno agudo)
def plantilla(sr: int, fase: float) -> np.ndarray:
    t = np.arange(int(3.3 * sr)) / sr
    y = np.zeros(len(t))
    for ini, hz, dur in [(0, 660, 0.12), (1, 660, 0.12), (2, 660, 0.12), (3, 1320, 0.25)]:
        m = (t >= ini) & (t < ini + dur)
        y[m] = np.sin(2 * np.pi * hz * (t[m] - ini) + fase)
    return y


def buscar_pitido(x: np.ndarray, sr: int = 8000) -> tuple[float, float]:
    """Filtro adaptado con seno y coseno: no depende de la fase con que se grabó.
    El parecido va de 0 a 1; la energía tiene un piso para que el silencio no gane."""
    ps, pc = plantilla(sr, 0.0), plantilla(sr, np.pi / 2)
    if len(x) <= len(ps):
        return 0.0, 0.0
    n = 1 << int(np.ceil(np.log2(len(x) + len(ps))))
    largo = len(x) - len(ps) + 1
    X = np.fft.rfft(x, n)
    cs = np.fft.irfft(X * np.conj(np.fft.rfft(ps, n)), n)[:largo]
    cc = np.fft.irfft(X * np.conj(np.fft.rfft(pc, n)), n)[:largo]
    energia = np.convolve(x.astype(np.float64) ** 2, np.ones(len(ps)), "valid")[:largo]
    energia = np.maximum(energia, 0.1 * np.median(energia) + 1e-12)
    parecido = np.hypot(cs, cc) / np.sqrt(energia * np.sum(ps ** 2))
    k = int(np.argmax(parecido))
    return k / sr + 3.0, float(parecido[k])


pitido_t, parecido = buscar_pitido(leer(8000))
print(f"pitido en {pitido_t:.3f} s de la grabación (parecido {parecido:.2f})")

# 2. Qué se dijo y cuándo
guardada = AQUI / f"transcripcion-{pathlib.Path(a.grabacion).stem}-{pathlib.Path(a.grabacion).stat().st_size}.json"
if guardada.exists():  # transcribir tarda dos minutos: la misma grabación no se transcribe dos veces
    W = [tuple(p) for p in json.loads(guardada.read_text(encoding="utf-8"))]
else:
    from faster_whisper import WhisperModel  # tarda en cargar; solo si hace falta

    modelo = WhisperModel(a.modelo, device="cpu", compute_type="int8")
    segs, _ = modelo.transcribe(leer(16000), language="es", word_timestamps=True, beam_size=5,
                                initial_prompt="Chocolatito Code, Stellar, USDC, Circle, XLM, hackathon, testnet.")
    W = [(p.word, p.start, p.end) for s in segs for p in (s.words or [])]
    guardada.write_text(json.dumps(W, ensure_ascii=False), encoding="utf-8")
Wn = [letras(w) for w, _, _ in W]
print(f"transcritas {len(W)} palabras")

def perfil(y: np.ndarray) -> tuple[np.ndarray, float]:
    """Volumen cada 10 ms, y el umbral de silencio de esa grabación."""
    r = np.sqrt(np.convolve(y.astype(np.float64) ** 2, np.ones(480) / 480, "same"))[::480]
    return r, max(np.percentile(r, 10) * 4, r.max() * 0.01)


x = leer(SR, "highpass=f=70,afftdn=tn=1")
rms, umbral = perfil(x)


def silencio(t: float, paso: int, limite: float, tramas: int) -> float | None:
    """Desde t, hacia atrás (paso -1) o adelante (+1), el borde del sonido: donde
    hay `tramas` de 10 ms seguidas en silencio. Hacia adelante pide más, para no
    cortar una palabra en la pausa de una p o una t."""
    i, fin, seguidos = int(t * 100), int((t + paso * limite) * 100), 0
    while 0 <= i < len(rms) and (i >= fin if paso < 0 else i <= fin):
        seguidos = seguidos + 1 if rms[i] < umbral else 0
        if seguidos == tramas:
            return (i + tramas if paso < 0 else i - tramas + 1) / 100
        i += paso
    return None


def arranque(desde: float, hasta: float, r: np.ndarray | None = None, u: float | None = None) -> float:
    """Dónde empieza la voz de verdad: Whisper suele marcar la palabra antes."""
    r = rms if r is None else r
    u = umbral if u is None else u
    i0, i1 = max(0, int(desde * 100)), min(len(r), int(hasta * 100))
    if i1 <= i0:
        return desde
    fuerte = max(u, 0.12 * r[i0:i1].max())
    return next((i / 100 for i in range(i0, i1) if r[i] >= fuerte), desde)


# Dónde arranca la voz del video en cada frase, medido igual que en la grabación
LINEA = json.loads((AQUI.parent / "pitch2" / "linea.json").read_text(encoding="utf-8"))
r_video, u_video = perfil(leer(SR, ruta=str(AQUI.parent / "pitch2" / "narracion.wav")))
METAS = [arranque(l["inicio"], l["voz_hasta"], r_video, u_video) for l in LINEA]
if parecido < 0.3:
    print("AVISO: no encuentro el pitido; la colocación no lo necesita, pero los atrasos que informo son aproximados")


def mejor(s: list[str], desde: int, hasta: int):
    cands = []
    m = len(s)
    for i in range(desde, min(hasta, len(Wn))):
        for L in range(max(1, m - 3), m + 4):
            if i + L > len(Wn):
                break
            r = difflib.SequenceMatcher(None, s, Wn[i:i + L], autojunk=False).ratio()
            cands.append((round(r, 3), -i, L))
    if not cands:
        return None
    r, i, L = max(cands)
    return r, -i, L


# Whisper escribe "30" donde se dijo "treinta": sin esto, esa palabra quedaba fuera de su frase
NUMEROS = {"1": "uno", "4": "cuatro", "5": "cinco", "6": "seis", "8": "ocho", "10": "diez",
           "17": "diecisiete", "29": "veintinueve", "30": "treinta", "40": "cuarenta"}
Wn = [NUMEROS.get(w, w) for w in Wn]

# (a) Qué palabras de Whisper son de cada frase
halladas, pos = [], 0
for n, f in enumerate(DATOS["frases"]):
    s = [letras(w) for w, _ in f["palabras"]]
    hallada = mejor(s, pos, pos + 3 * len(s) + 12)
    if not hallada or hallada[0] < 0.5:
        halladas.append(None)
        print(f"  frase {n:2d}: NO la encuentro")
        continue
    r, i, L = hallada
    while True:  # ¿se volvió a decir después? Entonces vale la última
        otra = mejor(s, i + L, i + L + 2 * len(s) + 6)
        if otra and otra[0] >= max(0.5, r - 0.08):
            r, i, L = otra
        else:
            break
    pos = i + L
    b = [m for m in difflib.SequenceMatcher(None, s, Wn[i:i + L], autojunk=False).get_matching_blocks() if m.size]
    halladas.append({"r": r, "p0": i + b[0].b, "p1": i + b[-1].b + b[-1].size - 1,
                     "cabeza": b[0].a, "cola": len(s) - (b[-1].a + b[-1].size)})

# (b) Las palabras que Whisper escribió distinto (al borde de una frase) vuelven a su frase:
# como mucho dos por cada palabra del guion que faltó, para no tragarse un intento fallido
validas = [k for k, h in enumerate(halladas) if h]
for ka, kb in zip(validas, validas[1:]):
    A, B = halladas[ka], halladas[kb]
    hueco = B["p0"] - A["p1"] - 1
    para_a = min(2 * A["cola"], max(0, hueco))
    para_b = min(2 * B["cabeza"], max(0, hueco - para_a))
    A["p1"] += para_a
    B["p0"] -= para_b
if validas:
    A, Z = halladas[validas[0]], halladas[validas[-1]]
    A["p0"] = max(0, A["p0"] - 2 * A["cabeza"])
    Z["p1"] = min(len(W) - 1, Z["p1"] + 2 * Z["cola"])

# (c) Dónde empieza cada frase en la grabación
frases = [None] * len(halladas)
limite = pitido_t + 0.3 if parecido >= 0.3 else 0.0
for k in validas:
    h = halladas[k]
    w_ini, w_fin = W[h["p0"]][1], W[h["p1"]][2]
    voz = arranque(max(limite, w_ini - 0.3), w_fin)
    ini = max(limite, (silencio(voz, -1, 0.4, 6) or voz - 0.08) - 0.02)
    frases[k] = {"r": h["r"], "ini": ini, "voz": voz, "w_fin": w_fin}
    limite = w_fin + 0.05

# (d) Y dónde acaba: el último sonido antes de que empiece la siguiente, sin cortar nada en medio
for j, k in enumerate(validas):
    f = frases[k]
    desde = max(f["voz"], f["w_fin"] - 0.05)
    tope = frases[validas[j + 1]]["ini"] - 0.01 if j + 1 < len(validas) else min(len(rms) / 100, f["w_fin"] + 1.5)
    tope = max(tope, desde + 0.05)
    ultimo = next((i / 100 for i in range(min(int(tope * 100), len(rms) - 1), int(desde * 100) - 1, -1)
                   if rms[i] >= umbral), None)
    f["fin"] = min(tope, (ultimo if ultimo is not None else f["w_fin"]) + 0.12)
    h = halladas[k]
    if h["cola"] or h["cabeza"]:
        print(f"  frase {k:2d}: Whisper la escribió distinto en el borde; se queda con: "
              + " ".join(w for w, _, _ in W[h["p0"]:h["p1"] + 1])[-70:])

# 3. Cada frase en su segundo
salida = np.zeros(int((TOTAL + 0.5) * SR), np.float32)
informe, libre = [], 0.0
for n, (f, d) in enumerate(zip(frases, DATOS["frases"])):
    if f is None:
        informe.append({"frase": n, "falta": True})
        continue
    meta = METAS[n] * K  # cuando empieza a hablar en el video
    cabeza = f["voz"] - f["ini"]     # respiración y margen antes de la voz
    donde = meta - cabeza
    trozo = x[int(f["ini"] * SR):int(f["fin"] * SR)].copy()
    if donde < libre:  # pisaría a la anterior: primero se quita el margen de delante
        quitar = min(libre - donde, max(0.0, cabeza - 0.01))
        trozo = trozo[int(quitar * SR):]
        donde += quitar
    retraso = max(0.0, libre - donde)
    donde += retraso
    rampa = min(len(trozo) // 2, int(0.015 * SR))
    if rampa:
        trozo[:rampa] *= np.linspace(0, 1, rampa)
        trozo[-rampa:] *= np.linspace(1, 0, rampa)
    a0 = int(donde * SR)
    trozo = trozo[: max(0, len(salida) - a0)]
    salida[a0:a0 + len(trozo)] += trozo
    libre = donde + len(trozo) / SR - 0.06  # el final es margen de silencio: la siguiente puede entrar ahí
    tarde = (f["voz"] - pitido_t) - meta
    informe.append({"frase": n, "parecido": f["r"], "llego_tarde_s": round(tarde, 2),
                    "corrida_s": round(retraso, 2), "dura_s": round(len(trozo) / SR, 2)})
    print(f"  frase {n:2d}: parecido {f['r']:.2f}, en la toma {tarde:+.2f} s respecto al karaoke"
          + (f"; CORRIDA {retraso:.2f} s porque la anterior no cabía" if retraso > 0.01 else ""))
salida = salida[: int(TOTAL * SR)]
(AQUI / "informe.json").write_text(json.dumps({"pitido": pitido_t, "parecido": parecido, "ritmo": a.ritmo,
                                               "frases": informe}, indent=1), encoding="utf-8")

voz = AQUI / "narracion-humana.wav"
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", str(SR), "-ac", "2", str(voz)],
               input=salida.tobytes(), check=True)

# 4. El video con esta voz
if K == 1.0:
    v = ["-map", "0:v", "-c:v", "copy"]
else:
    v = ["-filter_complex", f"[0:v]setpts={K}*PTS,fps=30[v]", "-map", "[v]", "-c:v", "libx264", "-crf", "18",
         "-preset", "medium", "-pix_fmt", "yuv420p"]
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(VIDEO), "-i", str(voz), *v,
                "-map", "1:a", "-c:a", "aac", "-b:a", "192k", "-t", f"{TOTAL:.3f}", "-movflags", "+faststart", a.salida],
               check=True)
print(f"video: {a.salida} ({TOTAL:.1f} s)")
if sum(1 for f in frases if f is None):
    sys.exit("faltan frases: revisar antes de usar el video")
