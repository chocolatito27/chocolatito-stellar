"""Un fondo lo-fi suave y original para el pitch: se genera aquí, nota por nota,
así que no es música de nadie y YouTube no tiene nada que reclamar.

Fmaj7 · Em7 · Dm7 · Cmaj7 a 72 pulsos por minuto: piano eléctrico tibio,
bajo redondo, batería con escobillas y un poco de vinilo.

    python fondo.py DURACION_S SALIDA.wav
"""
import subprocess
import sys

import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 166.34
SALIDA = sys.argv[2] if len(sys.argv) > 2 else "fondo.wav"
PULSO = 60 / 72
COMPAS = 4 * PULSO
SWING = 0.1 * PULSO
rng = np.random.default_rng(7)
n = int(DUR * SR)
teclas, bajo, bateria = np.zeros((2, n)), np.zeros(n), np.zeros(n)

ACORDES = [  # (notas del piano, raíz del bajo) en MIDI
    ([53, 57, 60, 64, 67], 41),  # Fmaj9
    ([52, 55, 59, 62, 66], 40),  # Em9
    ([50, 53, 57, 60, 64], 38),  # Dm9
    ([48, 52, 55, 59, 62], 36),  # Cmaj9
]


def hz(m: float) -> float:
    return 440 * 2 ** ((m - 69) / 12)


def poner(buf: np.ndarray, t0: float, y: np.ndarray) -> None:
    i0 = max(0, int(t0 * SR))
    if i0 >= buf.shape[-1]:
        return
    y = y[..., : buf.shape[-1] - i0]
    buf[..., i0:i0 + y.shape[-1]] += y


def piano(t0: float, m: int, dur: float, vel: float, pan: float) -> None:
    t = np.arange(int((dur + 0.6) * SR)) / SR
    f = hz(m)
    env = (1 - np.exp(-t / 0.006)) * np.exp(-t / 1.4) * np.clip(1 - (t - dur) / 0.5, 0, 1)
    s = (np.sin(2 * np.pi * f * t) + 0.55 * np.sin(2 * np.pi * f * 1.0018 * t)
         + 0.3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.35)
         + 0.08 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / 0.2))
    y = vel * env * s * (1 + 0.07 * np.sin(2 * np.pi * 4.2 * t))
    poner(teclas, t0, np.stack([y * (1 - pan), y * (1 + pan)]))


def grave(t0: float, m: int, dur: float, vel: float) -> None:
    t = np.arange(int((dur + 0.3) * SR)) / SR
    f = hz(m)
    env = (1 - np.exp(-t / 0.012)) * np.exp(-t / 2.5) * np.clip(1 - (t - dur) / 0.25, 0, 1)
    poner(bajo, t0, vel * env * (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)))


def ruido(largo: float, banda: tuple[float, float] | float, tipo: str) -> np.ndarray:
    y = rng.standard_normal(int(largo * SR))
    return sosfilt(butter(2, banda, tipo, fs=SR, output="sos"), y)


def bombo(t0: float, vel: float) -> None:
    t = np.arange(int(0.45 * SR)) / SR
    fase = 2 * np.pi * np.cumsum(45 + 65 * np.exp(-t / 0.035)) / SR
    poner(bateria, t0, vel * np.sin(fase) * np.exp(-t / 0.14))


def caja(t0: float, vel: float) -> None:
    t = np.arange(int(0.3 * SR)) / SR
    y = ruido(0.3, (900, 5000), "bandpass") * np.exp(-t / 0.07) + 0.6 * np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.04)
    poner(bateria, t0, vel * y)


def platillo(t0: float, vel: float) -> None:
    t = np.arange(int(0.12 * SR)) / SR
    poner(bateria, t0, vel * ruido(0.12, 7000, "highpass") * np.exp(-t / 0.022))


def humano(t: float) -> float:
    return t + rng.normal(0, 0.008)


compas = 0
while compas * COMPAS < DUR:
    t = compas * COMPAS
    notas, raiz = ACORDES[compas % 4]
    # piano: acorde rasgueado en el 1 y un eco más suave en el "y" del 2
    for k, m in enumerate(notas):
        pan = (k - 2) * 0.12
        piano(humano(t + 0.012 * k), m, 2.3 * PULSO, 0.055 * rng.uniform(0.85, 1.1), pan)
        if k > 0:
            piano(humano(t + 2.5 * PULSO + SWING + 0.01 * k), m, 1.3 * PULSO, 0.03 * rng.uniform(0.8, 1.1), pan)
    grave(humano(t), raiz, 1.6 * PULSO, 0.3)
    grave(humano(t + 2.5 * PULSO + SWING), raiz + (7 if compas % 2 else 0), 1.2 * PULSO, 0.22)
    # batería: bombo en el 1 y el "y" del 2, caja en 2 y 4, platillo en corcheas con swing
    if compas >= 2:
        bombo(humano(t), 0.45)
        bombo(humano(t + 2.5 * PULSO + SWING), 0.32)
        caja(humano(t + PULSO), 0.07)
        caja(humano(t + 3 * PULSO), 0.07)
        for c in range(8):
            platillo(humano(t + c * PULSO / 2 + (SWING if c % 2 else 0)), 0.03 if c % 2 == 0 else 0.018)
    compas += 1

mezcla = teclas + bajo + bateria
mezcla = sosfilt(butter(2, 3200, "lowpass", fs=SR, output="sos"), mezcla, axis=-1)  # tibio, como cinta
mezcla = np.tanh(1.4 * mezcla) / 1.4
# vinilo: chasquidos sueltos y un siseo muy bajo
chasquidos = np.zeros(n)
for i in rng.choice(n - 200, size=int(DUR * 6), replace=False):
    chasquidos[i:i + 60] += rng.uniform(0.004, 0.02) * rng.standard_normal(60) * np.exp(-np.arange(60) / 12)
vinilo = chasquidos + 0.0015 * ruido(DUR, 2500, "lowpass")[:n]
mezcla = mezcla + np.stack([vinilo, np.roll(vinilo, 37)])
t = np.arange(n) / SR
mezcla *= np.clip(t / 2.5, 0, 1) * np.clip((DUR - t) / 3.0, 0, 1)
mezcla /= np.abs(mezcla).max() / 0.7

subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                "-af", "loudnorm=I=-16:TP=-2:LRA=11", "-ar", str(SR), SALIDA],
               input=mezcla.T.astype(np.float32).tobytes(), check=True)
print(f"fondo: {SALIDA} ({DUR:.1f} s)")
