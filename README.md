# Chocolatito · Pago por uso en Stellar

**Un agente de IA que firma, por cada tarea que hace, el pago exacto de lo que
esa tarea costó: en USDC sobre Stellar, con una comisión de red de 0.00001 XLM.**

Track: **AI Agents & Automated Workflows** · Stellar Odyssey Perú 2026

---

## El problema

Las herramientas de IA se cobran por suscripción mensual con tarjeta
internacional. Para quien está en Perú eso son tres fricciones seguidas: hace
falta una tarjeta que acepte cobros en dólares, se paga comisión por cambio de
divisa, y se paga el mes entero aunque se usen dos tardes.

Y del otro lado hay un desajuste peor: **la suscripción no tiene nada que ver
con lo que cuesta atenderte.** Un usuario que gasta 40 centavos al mes paga lo
mismo que uno que gasta cuatro dólares. El primero subvenciona al segundo, y el
proveedor pone un tope artificial para protegerse.

## La solución

Cobrar lo que de verdad cuesta cada tarea, en el momento en que ocurre, por un
riel que no cobra comisión de cambio ni exige tarjeta.

Chocolatito ya mide el coste real de cada llamada al modelo —con descuento por
aciertos de caché incluido— porque lo necesita para su propio control de gasto.
Lo que este proyecto añade es la otra mitad: **que ese número medido se liquide
solo, on-chain, sin que nadie lo apunte a mano.**

La tarea de la demo costó **0.0097785 USD**. Eso no se puede cobrar con
tarjeta: la pasarela se queda del orden de 0.30 fijos, 31 veces el propio
cobro. Sobre Stellar, la comisión de red fue 0.00001 XLM, el 0.1% de lo que
salió de la cuenta del agente. Está medido más abajo, no es una estimación.

---

## Cómo usa Stellar

| Pieza | Qué hace en Stellar |
|---|---|
| **Firma en el equipo del usuario** | La clave secreta se genera y se queda en el equipo; ahí se construye y se firma cada pago (`src/pagos.ts`). Ningún servidor la ve. |
| **USDC de Circle, por su emisor** | La cuenta de cobro abre una línea de confianza (*trustline*) con el USDC de testnet de Circle, `GBBD47IF…LFLA5`. Sin ella nadie puede pagarle en USDC. |
| **Un path payment por tarea** | Al cerrar la tarea, el agente firma un `pathPaymentStrictReceive`: el cobro recibe **exactamente** el USDC medido, el agente paga en XLM, y el DEX de Stellar convierte dentro de la misma transacción. El tope de XLM va firmado (`sendMax`, cotización + 3%): si el precio se mueve más, la red rechaza el pago en vez de cobrar de más. |
| **Memo** | `cc:` y los 8 primeros caracteres de la licencia, para atribuir el pago sin publicar la clave entera en una cadena que cualquiera puede leer. |
| **Verificación** | `src/verificar.ts` pregunta a Horizon y no se fía del agente: que la transacción exista y saliera bien, el memo, el destino, que el activo sea el USDC de Circle **mirado por el emisor**, y que cubra lo debido. Solo usa `fetch`, porque está pensado para el Worker del proxy, y hay una prueba que falla si llega a importar el SDK. |

**La clave secreta no sale de tu equipo.** Es la misma promesa que ya hace el
producto con tus archivos, y aquí además es lo que pide el track: que sea *el
agente* quien firme, no un servidor en su nombre.

## El flujo

```
  ┌──────────────────────────────────┐
  │ TU EQUIPO                        │   1. «lee las facturas de esta carpeta
  │ Chocolatito Code                 │       y escribe balance.md»
  │ + la capa de pagos y su clave    │   La clave NUNCA sale de aquí.
  └─────────────────┬────────────────┘
                    │  2. cada vuelta del agente
                    ▼
  ┌──────────────────────────────────┐
  │ Proxy de Chocolatito             │   Ya existía: llama al modelo y
  │ (Cloudflare)                     │   devuelve el `usage` de cada vuelta.
  └─────────────────┬────────────────┘
                    │  3. costeDe(modelo, usage)
                    │     → la tarea costó 0.0097785 USD
                    ▼
  ┌──────────────────────────────────┐
  │ Al cerrar la tarea, en tu equipo │   4. Firma un path payment: sale XLM,
  └─────────────────┬────────────────┘      el DEX convierte, llega USDC.
                    ▼
  ┌──────────────────────────────────┐
  │ STELLAR TESTNET                  │   El cobro recibe 0.0097786 USDC de
  └─────────────────┬────────────────┘   Circle, con el memo cc:LIC-DEMO.
                    │  5. el hash
                    ▼
  ┌──────────────────────────────────┐
  │ Verificador                      │   6. Pregunta a Horizon: ¿existe?
  │ (sin SDK, para el Worker)        │      ¿memo? ¿nos paga a nosotros?
  └──────────────────────────────────┘      ¿USDC de Circle, por el emisor? ¿cubre?
```

Los pasos 1 y 2 ya existían: el agente, y el proxy que llama al modelo. El 3
también —`costeDe()` está en producción desde antes—, y aquí se reproduce con
la misma tabla de precios en `src/medidor.ts`. **Lo que se construye en esta
hackathon es el 4, el 5 y el 6**: la firma en el cliente, la liquidación en
USDC por el DEX y la verificación contra la cadena.

**Lo que no está hecho**, y no lo contamos como hecho:

- **La capa de pagos todavía no va dentro del CLI de Chocolatito Code.** En la
  demo, la tarea la hace el CLI de verdad y se mide su `usage`; el pago lo
  firma el código de este repositorio, en el mismo equipo, a partir de esa
  medición.
- **El verificador no está enchufado al proxy de producción.** Es a propósito:
  ese proxy cobra de verdad, y este proyecto no toca fondos reales (ver §18
  más abajo). En la demo y en la prueba corre en local, con el mismo código.
- **No se comprueba el saldo antes de dejar trabajar al agente.** Si el pago
  falla, la deuda no se pierde —`CuentaDeTarea` solo la da por saldada con un
  hash confirmado—, pero el trabajo ya está hecho. Sería el siguiente paso.

---

## Declaración de proyecto previo (bases §8.1)

Este proyecto **parte de un producto que ya existía antes del evento** y lo
declaramos abiertamente, como exigen las bases.

**Lo que ya existía**, y por tanto **no se presenta a evaluación**:

- **Chocolatito Code** — agente de IA para terminal. La prueba de que existía
  antes **es pública y tiene fecha**:
  [`chocolatito-code@1.6.43` en npm](https://www.npmjs.com/package/chocolatito-code/v/1.6.43),
  publicada el **17 sep 2026 a las 23:35 UTC** — dos días antes de que abriera
  la ventana de desarrollo, el 19 sep a las 09:00 PET. El registro de npm da fe
  de esa fecha, no nosotros.

  Su repositorio es privado, así que se deja el commit correspondiente para el
  acta —`0edf57f4c2c2319b6f9a5cfbf54673ebca140fe4`, de la 1.6.44— pero **no se
  enlaza**: un enlace que el jurado no puede abrir no prueba nada, y peor aún
  parece que sí.
- **El proxy de cuota** — un Worker de Cloudflare que valida licencias y mide el
  coste en dólares de cada llamada al modelo (`costeDe()` sobre el `usage` que
  devuelve el motor, descontando los aciertos de caché).

**Lo que se construye dentro de la ventana**, y es lo único que pedimos que se
evalúe: **todo el contenido de este repositorio**, desde su primer commit
[`f955663`](https://github.com/chocolatito27/chocolatito-stellar/commit/f9556639be06f79310ed232f9dcc3ef006c4851c)
del 22 sep 2026. Es decir, la capa de pagos: firma en el cliente, liquidación
por tarea en USDC, verificación contra Horizon y el enganche con el medidor
que ya existía.

Se eligió un repositorio nuevo, y no una rama del producto, precisamente para
que la frontera entre "lo de antes" y "lo de la hackathon" sea el propio
repositorio y no haya que fiarse de nuestra palabra.

---

## Evidencia on-chain (testnet)

La liquidación que sale en el video de la demo, comprobable en el explorador:

| | |
|---|---|
| **Transacción** | [`10022c7b81d0b495ecdab99a250d7b9625589fe5d90efe73e2b0e9b2bec1632c`](https://stellar.expert/explorer/testnet/tx/10022c7b81d0b495ecdab99a250d7b9625589fe5d90efe73e2b0e9b2bec1632c) |
| Operación | `path_payment_strict_receive`: XLM → USDC por el DEX, sin saltos intermedios |
| El cobro recibió | **0.0097786 USDC** de Circle (emisor `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`) |
| El agente pagó | 0.0093599 XLM (tope firmado: 0.0096407) |
| Cuenta del agente | `GBB3ZNVJGONRWTFD6GSRMQOM4XMUV24L2KYKJKJE6RUGEGRRV6FYIKE5` |
| Cuenta de cobro | `GAE4V4MKKL4RTOE23FZ7EODCC2TG3K3HSDFNBLOIDFRNJLVIDXIW6JJX` |
| Memo | `cc:LIC-DEMO` (atribución a la licencia de ejemplo) |
| Comisión de red | **100 stroops = 0.00001 XLM** |
| Fecha | 2026-09-25 02:29:22 UTC (24 sep, 21:29 PET) · ledger 4855955 |

**El número que resume el proyecto**: cobrar 0.0097786 USDC costó 0.00001 XLM
de comisión, el 0.1% de lo que salió de la cuenta del agente. Una pasarela de
tarjeta se queda del orden de 0.30 USD fijos: 31 veces el propio cobro.

**Sobre el precio.** El DEX de testnet no tiene precios de mercado: 0.0093599
XLM por 0.0097786 USDC es lo que ofrecían en ese momento las órdenes que hay en
testnet, no lo que vale el XLM. Lo que sí es real es el mecanismo: el cobro
recibe exactamente lo pedido, y el agente nunca paga más del tope que firmó.

La primera liquidación del proyecto, el 22 sep, fue un pago directo en XLM:
[`fe620dbc…`](https://stellar.expert/explorer/testnet/tx/fe620dbc1e891155e9fe8b27aa309d00db046a93bc858939afa12efd0d9d0656).
El paso a USDC, con la línea de confianza y el path payment, es del 24 sep.

### Una tarea entera, hecha por el agente de verdad

**Esto no es una simulación de un agente: es el agente.** Se ejecutó
**Chocolatito Code instalado**, con `chocolatito -y "..."`, sobre ocho facturas
de ejemplo que el propio guion escribe en `datos/taller/`. Listó la carpeta,
abrió las ocho, sumó por mes y escribió `balance.md`. Las vueltas de abajo son
**las que él decidió dar solo**, medidas al vuelo el 23 sep a las 01:56 UTC y
guardadas en [`datos/uso-real.json`](datos/uso-real.json).

Se midió poniendo un proxy delante del proxy y lanzando el CLI contra él con
`CHOCOLATITO_ENGINE_URL`. **No hubo que tocar ni una línea del producto**: esa
variable ya existía para pruebas.

| Vuelta | Lo que decidió hacer | Entrada | En caché | Salida | Coste (USD) |
|---|---|---:|---:|---:|---:|
| 1 | listar la carpeta | 14882 | 128 | 89 | 0.0066110 |
| 2 | abrir las 8 facturas | 15213 | 14592 | 273 | 0.0008379 |
| 3 | escribir `balance.md` | 16151 | 15104 | 613 | 0.0014813 |
| 4 | dar el resumen | 16794 | 15872 | 167 | 0.0008483 |
| | | | | **Total** | **0.0097785** |

Lo que hizo en cada vuelta sale de su propia salida en la terminal, guardada
en [`video/captura-agente.json`](video/captura-agente.json).

**Por qué el medidor no es un detalle**: sin descontar la caché, esa tarea
habría costado **0.0292450, el triple**: dos tercios de la factura serían
sobreprecio. Se ve en la tabla: la primera vuelta paga entero el contexto del
agente —solo 128 de 14882 tokens en caché—; desde la segunda, ese prefijo ya
está en caché y cada token de entrada cuesta unas 30 veces menos (0.014 frente
a 0.44 USD por millón). Eso **solo pasa con un agente**, que arrastra el
contexto vuelta tras vuelta, y es justo lo que un cobro por suscripción no ve.

Se reproduce con `node --experimental-strip-types guiones/medir-agente.ts`
(necesita el CLI instalado y una licencia activa; gasta unos centavos).

**Si falta ese archivo, la demo no se inventa nada: se para.** La primera
versión llevaba los tokens escritos a mano como «consumo plausible»; todo lo
demás era real, y eso era justo lo que lo hacía peor. El 24 sep se borraron los
dos guiones que quedaban de entonces: `tarea-completa.ts`, que aún los tenía,
y `capturar-uso.ts`, que habría sobrescrito esta medición con llamadas de chat.

### Lo que se comprueba antes de dar por bueno un pago

El agente firma en la máquina del usuario, así que su palabra no basta. El
verificador va a Horizon y comprueba cinco cosas; saltarse cualquiera deja una
forma de cobrar sin pagar. Estos son los veredictos de la ejecución grabada:

| Intento | Resultado |
|---|---|
| El pago bueno | ✅ válido |
| Presentarlo cuando se debía 1.00 | ❌ `Pagó 0.0097786 y debía 1.` |
| Reutilizar el pago de otra licencia | ❌ `El memo no corresponde a esta licencia.` |
| Pagarse a sí mismo y enseñar el hash | ❌ `La transacción no paga a la cuenta de cobro.` |
| Inventarse un hash | ❌ `Esa transacción no existe en la red.` |
| Pagar con un «USDC» que emitió el propio atacante | ❌ `Pagó en un «USDC» que no es el de Circle: lo emite GCDBSWQU…` |
| Pagar en XLM en vez de USDC | ❌ `Pagó en XLM, y se cobra en USDC.` |

**El «USDC» falso es el caso que obliga a mirar el emisor.** Cualquiera puede
emitir en un minuto un activo llamado USDC, y el explorador lo pinta igual. En
la prueba, la cuenta de cobro lo acepta a propósito, para demostrar que el
verificador no depende de que la cuenta esté bien configurada.

`npm run probar` repite los siete casos desde cero, con cuentas y
transacciones nuevas, y **sale con error** si alguno no da lo esperado o se
rechaza por otro motivo. La demo saca los casos del mismo archivo
(`guiones/trampas.ts`) y pinta en rojo el que no cuadre: lo que se enseña en el
video es lo que se prueba.

La misma orden comprueba antes, sin red, que el verificador no carga el SDK de
Stellar por ningún camino: recorre sus importaciones. Esa promesa ya se rompió
una vez sin que nadie lo notara —`9df3f40` importaba de `pagos.ts`, que carga
el SDK— y ahora no puede volver a pasar en silencio.

---

## Código y servicios de terceros (bases §8.3)

| Qué | Licencia | Para qué |
|---|---|---|
| [`@stellar/stellar-sdk`](https://github.com/stellar/js-stellar-sdk) 13.3.0 | Apache-2.0 | Construir y firmar las transacciones en el cliente. El verificador **no** lo usa. |
| [Horizon](https://developers.stellar.org/docs/data/apis/horizon) (testnet) | servicio público de la SDF | Consultar la cadena, buscar rutas de pago y verificar |
| [Friendbot](https://developers.stellar.org/docs/build/guides/basics/create-account) | servicio público de la SDF | Fondear las cuentas de prueba |
| USDC de testnet de Circle | activo de prueba, sin valor | El activo en que se cobra. Se identifica por su emisor, `GBBD47IF…LFLA5`, que Circle publica en [su lista oficial de direcciones](https://developers.circle.com/stablecoins/usdc-contract-addresses) |
| El DEX de Stellar (órdenes de testnet) | parte del protocolo | Convertir XLM en USDC dentro del path payment |
| Lemon Squeezy | servicio comercial | **Preexistente**, no forma parte de lo presentado. Emite las licencias del producto; aquí solo se usaría el prefijo de la clave como `memo` para atribuir cada pago. **En este repositorio no hay ninguna licencia real**: los guiones usan un identificador de ejemplo. |
| `puppeteer-core`, Google Chrome y `ffmpeg` | Apache-2.0 / gratuito / LGPL | Solo para generar el video de respaldo (`guiones/grabar.ts`). `puppeteer-core` se toma del repositorio del producto y no es dependencia de este. |
| TypeScript y `@types/node` | Apache-2.0 / MIT | Solo para comprobar los tipos (`npm run tipos`) |

Apache-2.0 es compatible con la licencia MIT de este repositorio.

No se ha usado ninguna plantilla ni *starter kit*. Los módulos de `src/` están
escritos para este proyecto, salvo `src/medidor.ts`, que reproduce la tabla de
precios y la fórmula del proxy preexistente declarado arriba.

## Sobre fondos reales (bases §18)

**Este proyecto no toca dinero real en ningún punto, y está construido para que
no pueda hacerlo.**

- La red está fijada a `Networks.TESTNET` en `src/cartera.ts`, y el verificador
  pregunta a `horizon-testnet.stellar.org`. No hay ninguna ruta de código hacia
  la red principal.
- Las cuentas se fondean con Friendbot, que **solo existe en testnet**.
- **El USDC es el de testnet de Circle, que no vale nada.** El USDC de verdad
  tiene otro emisor (`GA5ZSEJY…KZVN`), y ese no aparece en ninguna parte del
  código.
- El proxy de producción de Chocolatito —que sí cobra de verdad— **no se ha
  modificado ni se despliega como parte de esta hackathon**. La capa de pagos
  vive entera en este repositorio. El medidor de coste se reproduce aquí a
  partir de la misma tabla de precios, sin llamar al servicio en vivo.

Esa separación es deliberada: el producto sigue vendiendo por su lado y el
proyecto presentado no participa de ese flujo.

---

## Grabación de pantalla real del agente

[`video/agente-navegador.mp4`](video/agente-navegador.mp4) — 1568×780, 9.3 s.

**Esto sí son píxeles de una pantalla.** Se abrió la sesión del agente en el
navegador con `chocolatito --servir`, se le dio la orden y se grabó el
navegador mientras trabajaba: lista la carpeta, lee las ocho facturas una a
una y escribe `balance.md`.

Se grabó así porque la interfaz web del propio producto **ya existía** —
`--servir` sirve la sesión para usarla desde el celular— y eso permite capturar
la sesión de verdad sin depender de un grabador de escritorio.

Son 17 fotogramas: un agente trabajando no cambia la pantalla sesenta veces
por segundo, así que capturar en los momentos en que pasa algo cuenta lo mismo
y pesa 361 KB en vez de decenas de megas.

## El video de la demo

[`video/demo-chocolatito-stellar.mp4`](video/demo-chocolatito-stellar.mp4) —
1920×1080, 1 min 53 s.

**QUÉ ES Y QUÉ NO ES ESTE ARCHIVO**

No es una grabación de pantalla. **Es una reconstrucción**, y conviene saber
exactamente qué parte es real:

| | |
|---|---|
| Los dos programas se ejecutaron de verdad | **Sí.** El agente, el 23 sep a las 01:56 UTC (la misma ejecución de `datos/uso-real.json`); el cobro, el 25 sep a las 02:29 UTC |
| El texto es su salida, carácter por carácter | **Sí** |
| Los tiempos son los que tardó de verdad | **Sí** — cada fotograma dura lo medido |
| **Los píxeles salen de una pantalla** | **No.** Chrome redibuja cada fotograma desde HTML y ffmpeg los une |

Se hizo así para que no salieran el escritorio, las notificaciones ni el
tamaño de letra de nadie, y para poder regenerarlo con un comando. Pero **una
reconstrucción no es una grabación**, por fiel que sea el texto.

**Para entregar al jurado conviene una captura de pantalla de verdad**: ver
[DEMO.md](DEMO.md). Este archivo sirve como respaldo y como material para el
video pitch.

**Va en dos tramos:**

1. **Chocolatito Code trabajando** (~18 s): su banner, la orden, cómo lista la
   carpeta, abre las ocho facturas y escribe `balance.md`.
2. **El cobro de ese trabajo** (~93 s): las cuentas, la línea de confianza con
   el USDC de Circle, las cuatro vueltas con su coste, el path payment, la
   verificación y los seis intentos de fraude, cada uno con el veredicto que
   dio de verdad.

La transacción que aparece dentro se firmó durante esa ejecución: es la de la
[evidencia de arriba](#evidencia-on-chain-testnet).

Se regenera con `node --experimental-strip-types guiones/grabar.ts`, y cada
ejecución firma una transacción nueva y comprobable.

## Cómo verlo funcionando

Necesita Node 22.6 o posterior.

```bash
npm install
npm run demo
```

Corre de principio a fin en algo más de minuto y medio: crea las cuentas y las
fondea con Friendbot, abre la línea con el USDC de Circle, mide la tarea vuelta
a vuelta, firma el path payment, lo verifica contra la cadena y monta dos pagos
trampa para enseñar cómo se rechazan. **Nada está preparado de antemano**: cada
ejecución genera sus propias transacciones, y el enlace al explorador que sale
al final es comprobable.

Con `npm run demo -- --rapido` va sin pausas.

Depende de que el DEX de testnet tenga órdenes entre XLM y USDC. Si algún día
no las hay, la demo se para diciendo que no hay ruta: no se inventa un precio.

| Orden | Qué hace |
|---|---|
| `npm run demo` | El recorrido entero. Es lo que se graba. |
| `npm run probar` | El verificador: que no carga el SDK, que el pago bueno pasa y que los seis fraudes se rechazan cada uno por su motivo. **Sale con error** si algo no cuadra. Necesita red y tarda un minuto. |
| `npm run tipos` | Comprueba los tipos de todo `src/` y `guiones/`. |
| `guiones/medir-agente.ts` | Vuelve a medir al agente de verdad. Necesita el CLI y una licencia, y gasta unos centavos. |
| `guiones/grabar.ts` | Regenera el video de respaldo. |

Ver también [DEMO.md](DEMO.md) (cómo se graba) y [PITCH.md](PITCH.md) (guion de
los 3 minutos).

## Equipo

| | GitHub |
|---|---|
| Tomás Diego Araujo Tejada | [@chocolatito27](https://github.com/chocolatito27) |
| Rony Ricra Rojas | [@leonelricra2](https://github.com/leonelricra2) |
| Nick | [@nickbazan](https://github.com/nickbazan) |

## Licencia

MIT — ver [LICENSE](LICENSE).
