"""La voz con el fondo debajo, y el video del pitch con esa mezcla.

El fondo va 12 dB por debajo y se agacha otros ~6 dB cuando hay voz (compresor
con la voz de llave), con salida lenta para que no "bombee" en las pausas cortas.

    python mezclar.py VOZ.wav FONDO.wav SALIDA.mp4 [--calmado]
"""
import subprocess
import sys

voz, fondo, salida = sys.argv[1:4]
K = 1.075 if "--calmado" in sys.argv else 1.0
VIDEO = r"C:\Users\Ryzen\Videos\chocolatito-pitch-v2.mp4"
TOTAL = 166.34 * K

filtro = ("[0:a]asplit=2[v1][v2];[1:a]volume=-12dB[m];"
          "[m][v1]sidechaincompress=threshold=0.03:ratio=2.5:attack=40:release=600[md];"
          "[v2][md]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=11[a]")
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", voz, "-i", fondo, "-filter_complex", filtro,
                "-map", "[a]", "-ar", "48000", "-ac", "2", "mezcla.wav"], check=True)
if K == 1.0:
    v = ["-map", "0:v", "-c:v", "copy"]
else:
    v = ["-filter_complex", f"[0:v]setpts={K}*PTS,fps=30[v]", "-map", "[v]", "-c:v", "libx264", "-crf", "18",
         "-preset", "medium", "-pix_fmt", "yuv420p"]
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", VIDEO, "-i", "mezcla.wav", *v,
                "-map", "1:a", "-c:a", "aac", "-b:a", "192k", "-t", f"{TOTAL:.3f}", "-movflags", "+faststart", salida],
               check=True)
print(f"video con voz y fondo: {salida}")
