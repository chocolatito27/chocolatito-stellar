# Guion del video pitch · 3 minutos

**Entregable obligatorio.** Se proyecta en el Demo Day. Versión grabada, con
voces sintéticas: **https://youtu.be/c1AMS_u7iKw** (2:54). Si lo graban con su
voz, ver `video/fuentes/LEEME.md`. Máximo 3 minutos: si
se pasa, **se corta al llegar al límite**, así que lo importante va delante.

> Está cronometrado a ~150 palabras por minuto, que es un ritmo de hablar
> normal: son unas 440 palabras, 2:54. Si lo leen más rápido, sobra tiempo; si
> se extienden, se corta. **Léanlo en voz alta con un cronómetro antes de
> grabar.**

---

## 0:00 – 0:25 · El problema, con una cifra

> Una tarea de inteligencia artificial cuesta un centavo.
>
> Cobrarla con tarjeta cuesta treinta.
>
> Por eso nadie cobra por tarea: todo el mundo te vende una suscripción
> mensual. Pagas diecisiete dólares al mes, uses lo que uses. Si gastaste
> cuarenta centavos, pagas diecisiete igual.
>
> Nosotros vendemos esa suscripción, y sabemos exactamente cuánto nos cuesta
> atenderte, porque lo medimos en cada llamada.

*(Se ve: la landing de Chocolatito con el precio de $16.99.)*

---

## 0:25 – 0:50 · Por qué no se puede arreglar con tarjeta

> Chocolatito es un agente de IA que trabaja sobre tus archivos: lee facturas,
> ordena carpetas, escribe informes. Ya está a la venta.
>
> Cada tarea que hace tiene un coste exacto en dólares, y lo calculamos desde
> antes de esta hackathon.
>
> El problema nunca fue medir. Fue cobrar: con tarjeta, una tarea de un
> centavo no se puede cobrar.

---

## 0:50 – 1:45 · Lo que construimos

> Hasta que lo pones sobre Stellar.
>
> Lo que hicimos en esta hackathon es que el agente se pague solo. Termina una
> tarea, sabe lo que costó, y firma ese pago en tu propia computadora, con una
> clave que nunca sale de ahí.
>
> Paga en XLM, y nosotros recibimos dólares exactos, en USDC de Circle: el
> intercambio de Stellar convierte dentro de la misma transacción, y el agente
> firma un tope para que el precio no se le mueva.
>
> Del otro lado, nuestro verificador no se fía del agente. Va a la cadena y
> comprueba cinco cosas: que la transacción existe, que nos paga a nosotros,
> que el memo es de su licencia, que es el USDC de Circle —por quién lo emite,
> porque cualquiera puede inventarse uno—, y que cubre la deuda.

*(Se ve: el diagrama del flujo del README.)*

---

## 1:45 – 2:22 · La demo, y el número que lo resume

> Esto es una tarea real: «lee las facturas de esta carpeta y escribe un
> balance». Chocolatito Code la hizo de verdad: abrió ocho facturas y escribió
> el archivo.
>
> Cuatro vueltas, cada una medida. Al cerrar, un solo pago de un centavo,
> firmado y en la cadena.
>
> Luego, seis intentos de colar un pago falso, incluido uno con un USDC
> inventado. Los seis, rechazados.
>
> **Y el número que lo resume: con tarjeta, la comisión habría sido veintinueve
> veces lo cobrado. En Stellar fue una décima parte del uno por ciento.**

*(Se ve: la demo corriendo, y el enlace al explorador.)*

---

## 2:22 – 2:48 · Lo que es de verdad, y lo que no

> Lo que es de verdad y lo que no: esto es testnet, con el USDC de pruebas de
> Circle. El pago lo firma una capa que corre al lado del agente, todavía no
> dentro. Y el verificador no está conectado a nuestro servidor de producción,
> a propósito: ese cobra de verdad.
>
> Chocolatito existía antes y lo declaramos: lo que presentamos es solo la
> capa de pagos.

---

## 2:48 – 3:00 · El cierre

> No es una idea: es un producto que ya se vende, con la forma de cobrar que
> le estamos construyendo.
>
> Tu agente tiene cartera propia y paga sus propias facturas.
>
> Gracias.

---

## Notas para quien grabe

- **Lo que más puntúa no es este video**, es el de la demo. Este se proyecta en
  el Demo Day; aquel lo evalúa el jurado. Que no se les vaya el tiempo aquí.
- Graben en un sitio sin eco. Un celular a medio metro suena mejor que una
  laptop a dos.
- Mejor dos voces que una: alternen quién habla en cada bloque.
- Los números se dicen despacio. «Veintinueve veces» es el dato que tiene
  que quedarse; si se dice rápido, se pierde.
- Las cifras son las del video de la demo, grabado el 24 sep (README,
  «Evidencia on-chain»). Si se vuelve a grabar, el agente trabaja otra vez y el
  coste cambia un poco —cada ejecución es distinta—, así que hay que repasar
  este guion. Por eso no dice ninguna cifra en XLM: esa depende además del DEX
  de ese momento.
- Si algo no se entiende al escucharlo, **es el guion el que está mal**, no
  quien lo lee. Cámbienlo: para eso está en un archivo que pueden editar.
