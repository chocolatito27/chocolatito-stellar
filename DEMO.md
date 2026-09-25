# Cómo grabar el video demo

> **Hay dos videos en `video/` y no son lo mismo:**
>
> | Archivo | Qué es |
> |---|---|
> | `agente-navegador.mp4` | **Captura de pantalla real** del agente trabajando en el navegador |
> | `demo-chocolatito-stellar.mp4` | **Reconstrucción**: texto y tiempos reales, píxeles redibujados |
>
> El segundo NO es una grabación, por fiel que sea. Sirve de respaldo y de
> material para el pitch, pero lo que se entrega conviene que sea una captura
> de verdad: la que hagan con `Win + G`, como se explica abajo.

**Este es el que evalúa el jurado.** Las bases lo dicen con estas palabras:

> «Muestra el producto funcionando (no solo diapositivas). Sin límite de
> duración — **este es el que evalúa el jurado**.»

Sin límite de duración, así que **no hay prisa**. Mejor que se entienda a que
sea corto.

---

## La demo ya está escrita. Solo hay que grabarla.

```bash
git clone https://github.com/chocolatito27/chocolatito-stellar
cd chocolatito-stellar
npm install
npm run demo
```

Corre sola de principio a fin, con pausas pensadas para que se pueda leer en
video sin pausar nada. Tarda algo más de **minuto y medio**.

**Antes de grabar, una pasada sin pausas** para comprobar que la testnet
responde y que el DEX tiene ruta entre XLM y USDC:

```bash
npm run demo -- --rapido
```

Si sale «No hay ruta…», esperen un rato y prueben otra vez: sin ruta no hay
pago en USDC, y la demo no se inventa un precio.

### Nada está preparado de antemano

Y conviene decirlo en voz alta mientras se graba, porque es lo que separa esto
de unas diapositivas:

- Las cuentas de Stellar **se crean al arrancar**. No son de ayer.
- La transacción **se firma en ese momento**.
- El enlace del explorador que sale al final **es comprobable** por quien esté
  viendo el video.

Si graban dos veces, salen dos transacciones distintas. Eso es lo que hay que
enseñar.

---

## Qué se ve, paso a paso

| | Qué sale | Qué decir encima |
|---|---|---|
| **1** | Se crean las cuentas y se fondean | «La clave se queda en el equipo del usuario. El servidor no la ve nunca.» |
| **2** | La línea de confianza con el USDC de Circle | «Para recibir USDC hay que aceptarlo. Y se acepta el de Circle por su emisor, porque cualquiera puede inventarse un USDC.» |
| **3** | La orden y las 4 vueltas del agente, con su coste | «Esto lo hizo Chocolatito Code de verdad. Cada vuelta se mide; todavía no se ha pagado nada.» |
| **3b** | `Sin descontar la caché… 3.0 veces más` | «Sin descontar la caché, cobraríamos el triple por el mismo trabajo.» |
| **4** | `✓ FIRMADO Y ENVIADO`: el XLM que sale y el USDC que llega | «El agente paga en XLM y nosotros recibimos dólares exactos. Un pago por tarea, no por vuelta.» |
| **5** | `VÁLIDO` y los seis intentos, cada uno con su veredicto | «El verificador no se fía: va a la cadena. Y no cuela ninguno de los seis, ni el del USDC falso.» |
| **6** | El enlace y la comparación con la tarjeta | «Compruébenlo ustedes mismos. Con tarjeta, la comisión habría sido treinta y una veces lo cobrado.» |

**El momento importante es el 5.** Cualquiera puede enseñar un pago que
funciona; enseñar los seis que *no* cuelan es lo que demuestra que hay un
sistema detrás y no un script de demostración.

**Si alguna línea sale en rojo, esa toma no se entrega.** La demo pinta cada
veredicto tal como salió, y el rojo significa que algo no dio lo esperado. Hay
que mirarlo antes de volver a grabar.

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

## Cómo se graba, en la práctica

**En Windows**, sin instalar nada: `Win + G` abre la Xbox Game Bar y graba la
ventana. Si quieren algo mejor, OBS Studio es gratis.

Cuatro cosas que arreglan el 90% de los videos malos:

- **Agranden la letra de la terminal** antes de grabar (`Ctrl` + `+`). Lo que
  se lee bien en su monitor no se lee en un proyector.
- **Fondo oscuro.** La demo está coloreada para fondo oscuro.
- **Pantalla limpia**: sin notificaciones, sin pestañas de más, sin nombres de
  archivos personales a la vista.
- **1080p**. Nada de grabar en vertical.

Si se equivocan a mitad, **vuelvan a empezar**. Dura minuto y medio: es más
rápido repetir que editar.

---

## Dónde se sube

A YouTube **«no listado»** o a Drive con enlace público. Comprueben el enlace
**desde una ventana de incógnito** antes de entregarlo: un video que el jurado
no puede abrir cuenta como no entregado.
