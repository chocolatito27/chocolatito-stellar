# Guión del video pitch · 3 minutos

**Entregable obligatorio.** Se proyecta en el Demo Day. Máximo 3 minutos: si
se pasa, **se corta al llegar al límite** — así que lo importante va delante.

> Está cronometrado a ~150 palabras por minuto, que es un ritmo de hablar
> normal. Si lo leéis más rápido, sobra tiempo; si os enrolláis, se corta.
> **Leedlo en voz alta con un cronómetro antes de grabar.**

---

## 0:00 – 0:25 · El problema, con una cifra

> Una tarea de inteligencia artificial cuesta menos de un céntimo.
>
> Cobrarla con tarjeta cuesta treinta.
>
> Por eso nadie cobra por tarea: todo el mundo te vende una suscripción
> mensual. Pagas diecisiete dólares al mes uses lo que uses. Si gastaste
> cuarenta céntimos, pagas diecisiete igual.
>
> Nosotros somos los que vendemos esa suscripción. Y sabemos exactamente
> cuánto nos cuesta atenderte, porque lo medimos en cada llamada.

*(Se ve: la landing de Chocolatito con el precio de $16.99.)*

---

## 0:25 – 0:50 · Por qué no se puede arreglar con tarjeta

> Chocolatito es un agente de IA que trabaja sobre tus archivos. Ordena
> carpetas, lee facturas, arma Excels. Ya está a la venta.
>
> Por dentro, cada tarea que hace tiene un coste exacto en dólares. Lo
> calculamos desde antes de esta hackathon, porque lo necesitábamos para
> nuestro propio control de gasto.
>
> El problema nunca fue medir. Fue cobrar. No existe forma de cobrar cuatro
> milésimas de dólar.

---

## 0:50 – 1:35 · Lo que construimos

> Hasta que la pones sobre Stellar.
>
> Lo que hicimos en esta hackathon es que **el agente se pague solo**.
>
> Termina una tarea, sabe lo que costó, y firma ese pago él mismo. No un
> servidor en su nombre: el agente, con una clave que **nunca sale de tu
> ordenador** — igual que tus archivos, que es lo que el producto ya promete.
>
> Y del otro lado, nuestro servidor no se fía de él. El agente corre en tu
> máquina, así que lo que diga que pagó no vale nada por sí solo. Va a la
> cadena y comprueba cuatro cosas: que la transacción existe, que le paga a
> nuestra cuenta, que el memo es de su licencia, y que el importe cubre la
> deuda. Si falla una, no hay servicio.

*(Se ve: el diagrama del flujo del README.)*

---

## 1:35 – 2:20 · La demo, y el número que lo resume

> Esto es una tarea real: «revisa estas cuarenta facturas y hazme un Excel».
>
> Seis vueltas del agente. Cada una medida por separado. Al cerrar la tarea,
> un solo pago: seis milésimas de dólar, firmado y en la cadena.
>
> **Y ahora el número que resume el proyecto entero: cobrar esas seis
> milésimas costó una cienmilésima de comisión. Cuarenta y cuatro veces menos
> que el propio cobro.** Con una pasarela de tarjeta, la comisión habría sido
> cuarenta y cuatro veces mayor que lo cobrado.
>
> Ese hueco es la razón de que esto solo exista sobre Stellar.

*(Se ve: la demo corriendo, y el enlace al explorador.)*

---

## 2:20 – 2:45 · Lo que es de verdad, y lo que no

> Somos honestos con lo que hay: **esto es testnet**, y se liquida en XLM, no
> en USDC todavía. Está escrito así en el README, sin maquillar.
>
> Chocolatito ya existía antes de la hackathon y lo declaramos con su commit
> base. Lo que presentamos es solo la capa de pagos, y vive en un repositorio
> aparte para que esa frontera se vea sola.
>
> Y no hemos tocado el servidor que cobra de verdad. La tienda sigue vendiendo
> por su lado; el proyecto no participa de ese dinero.

---

## 2:45 – 3:00 · El cierre

> No estamos proponiendo una idea. Estamos enseñando un producto que ya se
> vende, al que le hemos cambiado la forma de cobrar.
>
> Tu agente tiene cartera propia y paga sus propias facturas.
>
> Gracias.

---

## Notas para quien grabe

- **Lo que más puntúa no es este vídeo**, es el de la demo. Este se proyecta en
  el Demo Day; aquél lo evalúa el jurado. No os dejéis el tiempo aquí.
- Grabar en un sitio sin eco. Un móvil a medio metro suena mejor que un
  portátil a dos.
- Mejor dos voces que una: alterna quien habla en cada bloque.
- Los números se dicen despacio. «Cuarenta y cuatro veces» es el dato que se
  tiene que quedar; si se dice rápido, se pierde.
- Si algo no se entiende al escucharlo, **es el guión el que está mal**, no
  quien lo lee. Cambiadlo — para eso está en un archivo que podéis editar.
