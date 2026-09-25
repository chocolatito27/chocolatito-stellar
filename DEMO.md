# El video de la demo

> **Hay dos videos en `video/`, y los dos son capturas de pantalla reales:**
>
> | Archivo | Qué es |
> |---|---|
> | `demo-chocolatito-stellar.mp4` | **El que se entrega.** Una sola toma: el agente haciendo la tarea y, a continuación, el cobro de esa tarea en Stellar. 1920×1080, 1:57. |
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
| **0:00** | Chocolatito Code recibe la orden, lista la carpeta, abre las ocho facturas y escribe `balance.md` | «Esto es Chocolatito Code haciendo una tarea de verdad. Cada vez que consulta al modelo, se mide lo que consumió.» |
| **0:23** | Se crean las cuentas y se fondean | «La clave se queda en el equipo del usuario. El servidor no la ve nunca.» |
| **0:37** | La línea de confianza con el USDC de Circle | «Para recibir USDC hay que aceptarlo. Y se acepta el de Circle por su emisor, porque cualquiera puede inventarse un USDC.» |
| **0:43** | Las 4 vueltas que se acaban de ver, con su coste | «Son las cuatro llamadas de la tarea de antes. Todavía no se ha pagado nada.» |
| **0:58** | `Sin descontar la caché… 2.9 veces más` | «Sin descontar la caché, cobraríamos casi el triple por el mismo trabajo.» |
| **1:02** | `✓ FIRMADO Y ENVIADO`: el XLM que sale y el USDC que llega | «El agente paga en XLM y nosotros recibimos dólares exactos. Un pago por tarea, no por vuelta.» |
| **1:12** | `VÁLIDO` y, a partir de 1:27, los seis intentos con su veredicto | «El verificador no se fía: va a la cadena. Y no cuela ninguno de los seis, ni el del USDC falso.» |
| **1:39** | El enlace y la comparación con la tarjeta | «Compruébenlo ustedes mismos. Con tarjeta, la comisión habría sido veintiocho veces lo cobrado.» |

**El momento importante son los seis intentos.** Cualquiera puede enseñar un
pago que funciona; enseñar los seis que *no* cuelan es lo que demuestra que hay
un sistema detrás y no un script de demostración.

La pantalla final se queda quieta desde 1:43 hasta el final: es el sitio para
cerrar con la voz.

---

## Después de la demo: enseñar que el producto existe

Un minuto más, y suma en «viabilidad y continuidad» (15% de la nota):

1. **chocolatito.space** — la web, con sus dos planes reales
2. **chocolatito.space/chat** — el chat funcionando
3. La terminal con `chocolatito` corriendo una tarea de verdad

Decir: *«esto no es un proyecto de hackathon buscando un problema. Es un
producto que ya se vende, y esta es la forma de cobrar que le estamos
construyendo.»*

---

## Si hay que volver a grabarlo

La toma entera son dos órdenes seguidas, en el mismo terminal:

```bash
node --experimental-strip-types guiones/medir-agente.ts
npm run demo
```

La primera pone a trabajar al agente de verdad (necesita el CLI instalado y una
licencia, y gasta unos centavos) y guarda lo que consumió; la segunda cobra
exactamente eso. Si el agente trabaja otra vez, **las cifras cambian un poco**,
porque cada ejecución es distinta: hay que repasar después el README y el
guion del pitch.

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
