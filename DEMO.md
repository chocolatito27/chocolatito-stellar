# El video de la demo

> **Hay dos videos en `video/`, y los dos son capturas de pantalla reales:**
>
> | Archivo | Qué es |
> |---|---|
> | `demo-chocolatito-stellar.mp4` | **El que se entrega.** Una sola toma: se abre Chocolatito Code en la terminal, se le da la orden, trabaja, y a continuación se cobra esa tarea en Stellar. 1920×1080, 2:29. |
> | `agente-navegador.mp4` | El agente trabajando en su interfaz web (`--servir`). 9 s. |
>
> El máster en 2560×1440, para editar, está fuera del repositorio:
> `chocolatito-demo-en-vivo-1440p.mp4`, en la carpeta Videos de Tomás.

**Este es el que evalúa el jurado.** Las bases lo dicen con estas palabras:

> «Muestra el producto funcionando (no solo diapositivas). Sin límite de
> duración — **este es el que evalúa el jurado**.»

Sin límite de duración, así que **no hay prisa**. Mejor que se entienda a que
sea corto.

---

## Qué se ve, y qué decir encima

La grabación no tiene voz: esto es para ponérsela al editar. Los minutos son
aproximados, ±3 segundos.

| Minuto | Qué sale | Qué decir encima |
|---|---|---|
| **0:00** | La terminal en la carpeta `facturas-enero-marzo-2026`; se escribe `chocolatito` y se abre el agente | «Esto es Chocolatito Code, un agente de IA que trabaja en tu computadora. Lo abrimos en una carpeta con ocho facturas.» |
| **0:08** | Se le escribe la orden | «Le pedimos una tarea de verdad: leer las facturas y hacer un balance.» |
| **0:26** | Trabaja: lista la carpeta, abre las ocho facturas, escribe `balance.md` y resume | «Cada vez que consulta al modelo, se mide lo que consumió. Le toma trece segundos.» |
| **0:39** | `/exit`, `cd ..` y `npm run demo` | «Tarea hecha. Ahora toca cobrarla.» |
| **0:59** | Se crean las cuentas y se fondean | «La clave se queda en el equipo del usuario. El servidor no la ve nunca.» |
| **1:10** | La línea de confianza con el USDC de Circle | «Para recibir USDC hay que aceptarlo. Y se acepta el de Circle por su emisor, porque cualquiera puede inventarse un USDC.» |
| **1:15** | Las 4 vueltas que se acaban de ver, con lo que pidió en cada una y su coste | «Son las cuatro llamadas de la tarea de antes. Todavía no se ha pagado nada.» |
| **1:25** | `Sin descontar la caché… 2.9 veces más` | «Sin descontar la caché, cobraríamos casi el triple por el mismo trabajo.» |
| **1:30** | `✓ FIRMADO Y ENVIADO`: el XLM que sale y el USDC que llega | «El agente paga en XLM y nosotros recibimos dólares exactos. Un pago por tarea, no por vuelta.» |
| **1:42** | `VÁLIDO` y, a partir de 1:55, los seis intentos con su veredicto | «El verificador no se fía: va a la cadena. Y no cuela ninguno de los seis, ni el del USDC falso.» |
| **2:08** | El enlace y la comparación con la tarjeta | «Compruébenlo ustedes mismos. Con tarjeta, la comisión habría sido veintinueve veces lo cobrado.» |

**El momento importante son los seis intentos.** Cualquiera puede enseñar un
pago que funciona; enseñar los seis que *no* cuelan es lo que demuestra que hay
un sistema detrás y no un script de demostración.

La pantalla final se queda quieta desde 2:13 hasta el final: es el sitio para
cerrar con la voz.

---

## Después de la demo: enseñar que el producto existe

Un minuto más, y suma en «viabilidad y continuidad» (15% de la nota):

1. **chocolatito.space** — la web, con sus dos planes reales
2. **chocolatito.space/chat** — el chat funcionando

Decir: *«esto no es un proyecto de hackathon buscando un problema. Es un
producto que ya se vende, y esta es la forma de cobrar que le estamos
construyendo.»*

---

## Si hay que volver a grabarlo

Una orden, en PowerShell, desde la raíz del repositorio:

```powershell
powershell -ExecutionPolicy Bypass -File guiones\grabar-en-terminal.ps1
```

Arranca el medidor, abre Windows Terminal a pantalla completa en
`facturas-enero-marzo-2026`, teclea `chocolatito`, le escribe la orden, espera
a que termine, sale con `/exit`, lanza `npm run demo` y graba todo con ffmpeg.
Al acabar deja Terminal como estaba. Con `-Ensayo` hace lo mismo sin grabar y
sin darle la orden al agente, así que no gasta nada: sirve para comprobar que
todo responde. **Mientras corre no hay que tocar ni el ratón ni el teclado.**

El video sale en `%TEMP%\chocolatito-grabacion\demo-en-terminal.mkv`. El
agente gasta unos centavos de la licencia, y **las cifras cambian un poco** en
cada ejecución: hay que repasar después el README y el guion del pitch.

Antes de grabar, una pasada sin pausas para comprobar que la testnet responde
y que el DEX tiene ruta entre XLM y USDC:

```bash
npm run demo -- --rapido
```

Si sale «No hay ruta…», esperen un rato: sin ruta no hay pago en USDC, y la
demo no se inventa un precio. **Si alguna línea sale en rojo, esa toma no se
entrega**: la demo pinta cada veredicto tal como salió, y el rojo significa que
algo no dio lo esperado.

Para grabar sin instalar nada, en Windows: `Win + G` abre la Xbox Game Bar y
graba la ventana. Letra grande (`Ctrl` + `+`), fondo oscuro, sin
notificaciones a la vista y en horizontal.

---

## Dónde se sube

A YouTube **«no listado»** o a Drive con enlace público. Comprueben el enlace
**desde una ventana de incógnito** antes de entregarlo: un video que el jurado
no puede abrir cuenta como no entregado.
