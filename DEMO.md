# Cómo grabar el video demo

> **Hay dos vídeos en `video/` y no son lo mismo:**
>
> | Archivo | Qué es |
> |---|---|
> | `agente-navegador.mp4` | **Captura de pantalla real** del agente trabajando en el navegador |
> | `demo-chocolatito-stellar.mp4` | **Reconstrucción**: texto y tiempos reales, píxeles redibujados |
>
> El segundo NO es una grabación, por fiel que sea. Sirve de respaldo y de
> material para el pitch, pero lo que se entrega conviene que sea captura de
> verdad — o la del navegador, o la tuya con `Win + G`.

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
node --experimental-strip-types guiones/demo.ts
```

Corre sola de principio a fin, con pausas pensadas para que se pueda leer en
vídeo sin pausar nada. Tarda unos **75 segundos**.

Para probarla sin grabar, sin las pausas: añade `--rapido`.

### Nada está preparado de antemano

Y conviene decirlo en voz alta mientras se graba, porque es lo que separa esto
de unas diapositivas:

- Las cuentas de Stellar **se crean al arrancar**. No son de ayer.
- La transacción **se firma en ese momento**.
- El enlace del explorador que sale al final **es comprobable** por quien esté
  viendo el vídeo.

Si grabáis dos veces, salen dos transacciones distintas. Eso es lo que hay que
enseñar.

---

## Qué se ve, paso a paso

| | Qué sale | Qué decir encima |
|---|---|---|
| **1** | Se crean dos cuentas y se fondean | «La clave se queda en el equipo del usuario. El servidor no la ve nunca.» |
| **2** | Las 6 vueltas, con su coste | «Cada vuelta se mide por separado. Todavía no se ha pagado nada.» |
| **2b** | `Sin descontar caché… casi el triple` | «Si no descontaras la caché, cobrarías casi el triple por el mismo trabajo.» |
| **3** | `✓ FIRMADO Y ENVIADO` | «Al cerrar la tarea, el agente firma el pago. Un pago por tarea, no por vuelta.» |
| **4** | `VÁLIDO` y los 4 rechazos | «El servidor no se fía: va a la cadena. Y rechaza las cuatro formas de colar un pago falso.» |
| **5** | El enlace al explorador | «Compruébalo tú mismo.» |

**El momento importante es el 4.** Cualquiera puede enseñar un pago que
funciona; enseñar los cuatro que *no* cuelan es lo que demuestra que hay un
sistema detrás y no un script de demostración.

---

## Después de la demo: enseñar que el producto existe

Un minuto más, y suma en «viabilidad y continuidad» (15% de la nota):

1. **chocolatito.space** — la web, con sus dos planes reales
2. **chocolatito.space/chat** — el chat funcionando
3. La terminal con `chocolatito` corriendo una tarea de verdad

Decir: *«esto no es un proyecto de hackathon buscando un problema. Es un
producto que ya se vende, y le hemos cambiado la forma de cobrar.»*

---

## Cómo se graba, en la práctica

**En Windows**, sin instalar nada: `Win + G` abre la Xbox Game Bar y graba la
ventana. Si queréis algo mejor, OBS Studio es gratis.

Cuatro cosas que arreglan el 90% de los vídeos malos:

- **Agrandad la letra de la terminal** antes de grabar (`Ctrl` + `+`). Lo que
  se lee bien en tu monitor no se lee en un proyector.
- **Fondo oscuro.** La demo está coloreada para fondo oscuro.
- **Pantalla limpia**: sin notificaciones, sin pestañas de más, sin nombres de
  archivos personales a la vista.
- **1080p**. Nada de grabar en vertical.

Si os equivocáis a mitad, **volved a empezar**. Dura 75 segundos: es más rápido
repetir que editar.

---

## Dónde se sube

A YouTube **«no listado»** o a Drive con enlace público. Comprobad el enlace
**desde una ventana de incógnito** antes de entregarlo — un vídeo que el jurado
no puede abrir cuenta como no entregado.
