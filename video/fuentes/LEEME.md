# Cómo se hicieron los dos videos

Estos guiones produjeron los videos que están en YouTube. Escriben sus piezas
intermedias (imágenes, audio) en esta misma carpeta; git las ignora.

Necesitan ffmpeg, Google Chrome, `puppeteer-core` (se toma del repositorio del
producto, igual que `guiones/grabar.ts`) y, para el pitch, el paquete de Python
`edge-tts`. Las fuentes (Fraunces, Geist y Geist Mono) se cargan de Google Fonts.

## La demo editada — https://youtu.be/xIyeMhX-L9A

La toma es la grabación de pantalla de `guiones/grabar-en-terminal.ps1`. La
edición solo le pone delante una tarjeta de entrada, debajo una banda de texto
por tramo y detrás una tarjeta de cierre: la toma no se acelera ni se corta.

```bash
node demo-rotulos.mjs   # tarjetas y bandas, con el texto y los tiempos de tramos.json
node demo-montar.mjs    # el video: tarjeta, toma con bandas, tarjeta
```

## El pitch — https://youtu.be/c1AMS_u7iKw

Es `PITCH.md` palabra por palabra: `pitch-voz.py` se niega a sintetizar si
`guion.json` no coincide con el guion bloque a bloque. La voz es sintética
(`es-PE-CamilaNeural` y `es-PE-AlexNeural`, una por bloque) y va un 7 % más
rápida para quedar por debajo de los 3 minutos. Los fragmentos de la demo son
de la toma real, sin acelerar.

```bash
python pitch-voz.py "+7%"   # comprueba el guion, sintetiza cada frase y mide
node pitch-diapos.mjs       # una imagen por frase (incluye una captura de chocolatito.space)
node pitch-montar.mjs       # corta por fotogramas contados y pone la voz
```

Para grabarlo con voces de verdad basta con sustituir `narracion.wav` por la
grabación, con las mismas pausas, y volver a correr `pitch-montar.mjs`.
