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

## El pitch narrado por Nick — https://youtu.be/OlzHY2O3m6s

Nick leyó siguiendo `karaoke.html`: cada palabra se enciende en el segundo en
que la dice la voz sintética del pitch de abajo (los tiempos salen de su
`linea.json`; `karaoke-datos.py` devuelve las palabras a como se escriben).
Grabó con el celular. `pitch-poner-voz.py` transcribe la grabación con Whisper,
ubica cada frase del guion (si una se repite, vale la última) y la pone donde
arranca la voz sintética; cada frase se queda con todo lo que suena hasta que
empieza la siguiente, y las cifras que Whisper escribe en números («30») se
leen como palabras, para no cortarlas. Con la toma de Nick, 17 frases cayeron
en su sitio y tres entraron entre 0,3 y 0,6 s tarde porque la anterior no cabía. `pitch-fondo.py`
genera el fondo lo-fi nota por nota, así que no es música de nadie, y
`pitch-mezclar.py` lo deja 12 dB por debajo de la voz, bajando más cuando habla.
Corrieron desde la carpeta de trabajo, con `pitch2/` al lado: las rutas están
como estaban.

## El pitch — https://youtu.be/XsecN9pOPnA

Es `PITCH.md` palabra por palabra: `pitch-voz.py` se niega a sintetizar si
`guion.json` no coincide con el guion bloque a bloque. La voz es sintética:
`es-ES-ElviraNeural` (español de España), un 10 % más rápida y 25 Hz más grave,
para acercarse al tono de una voz de referencia que eligió el equipo. Queda en
2:46.

Solo para el audio, algunas palabras se escriben como se dicen: la voz leía
«hackathon» como «hatón», así que dice «jákaton»; igual con «Circle», «USDC»,
«XLM», «IA» y «testnet». En pantalla van bien escritas.

La tipografía y los colores son los de chocolatito.space (Bungee, Silkscreen y
Geist; morado `#1c1330`, naranja `#e0673c`, amarillo `#ffd166`). Cada texto
entra cuando la voz dice su palabra: `pitch-voz.py` guarda el momento de cada
palabra y `pitch-escenas.mjs` lo usa, y falla si una palabra no suena.

Antes de empezar hacen falta, en esta carpeta, `logo.png` (el de la web:
`https://chocolatito.space/logo-chocolatito.png`) y `web.png`, una captura de
chocolatito.space a 1440×810.

```bash
python pitch-voz.py "+10%" es-ES-ElviraNeural -25Hz   # comprueba el guion, sintetiza y guarda el tiempo de cada palabra
node pitch-escenas.mjs      # anima cada escena y la captura solo mientras algo se mueve
node pitch-montar.mjs       # la toma real en sus pantallas, transiciones y la voz
```

Para ponerle voces de verdad basta con sustituir `narracion.wav` por la
grabación, con las mismas pausas, y volver a correr `pitch-montar.mjs`.
