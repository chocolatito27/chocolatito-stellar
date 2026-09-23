# Chocolatito · Pago por uso en Stellar

**Un agente de IA que firma, por cada tarea que hace, el pago exacto de lo que
esa tarea costó — sobre Stellar, y por un céntimo de comisión.**

Track: **AI Agents & Automated Workflows** · Stellar Odyssey Perú 2026

---

## El problema

Las herramientas de IA se cobran por suscripción mensual con tarjeta
internacional. Para quien está en Perú eso son tres fricciones seguidas: hace
falta una tarjeta que acepte cobros en dólares, se paga comisión por cambio de
divisa, y se paga el mes entero aunque se usen dos tardes.

Y del otro lado hay un desajuste peor: **la suscripción no tiene nada que ver
con lo que cuesta atenderte.** Un usuario que gasta 40 céntimos al mes paga lo
mismo que uno que gasta cuatro dólares. El primero subvenciona al segundo, y el
proveedor pone un tope artificial para protegerse.

## La solución

Cobrar lo que de verdad cuesta cada tarea, en el momento en que ocurre, por un
riel que no cobra comisión de cambio ni exige tarjeta.

Chocolatito ya mide el coste real de cada llamada al modelo —con descuento por
aciertos de caché incluido— porque lo necesita para su propio control de gasto.
Lo que este proyecto añade es la otra mitad: **que ese número medido se liquide
solo, on-chain, sin que nadie lo apunte a mano.**

Un pago de 0,0041 no es viable por tarjeta: la comisión de la pasarela ronda
los 0,30 fijos, setenta y cinco veces el propio pago. Sobre Stellar costó
0,00001 —está medido más abajo, no es una estimación—. Ese hueco es la razón
de que este proyecto tenga sentido aquí y no en otro sitio.

---

## Cómo usa Stellar

| Pieza | Qué hace en Stellar |
|---|---|
| **El agente firma** | La CLI tiene la clave secreta y construye y firma cada pago. El proxy nunca la ve. |
| **Saldo previo** | El usuario recarga su cuenta de testnet. El proxy consulta ese saldo en Horizon antes de dejar trabajar al agente. |
| **Liquidación por tarea** | Al terminar cada tarea, el agente firma un pago por el coste exacto medido, con el id de licencia en el `memo` para atribuirlo. |
| **Verificación** | El proxy comprueba el pago contra Horizon. No se fía del cliente: mira la cadena. |

**La clave secreta no sale de tu equipo.** Es la misma promesa que ya hace el
producto con tus archivos, y aquí además es lo que pide el track: que sea *el
agente* quien firme, no un servidor en su nombre.

## El flujo

```
  ┌─────────────────────────┐
  │  TU EQUIPO              │
  │                         │
  │  Chocolatito Code       │   1. "ordena estas 40 facturas"
  │  ├── clave Stellar ─────┼──────────┐  (la clave NUNCA sale de aquí)
  │  └── firma los pagos    │          │
  └───────────┬─────────────┘          │
              │ 2. la tarea            │
              ▼                        │
  ┌─────────────────────────┐          │
  │  PROXY (Cloudflare)     │          │
  │                         │          │
  │  3. ¿tiene saldo?  ─────┼──────────┼──► Horizon (consulta)
  │  4. llama al modelo     │          │
  │  5. mide el coste real  │          │
  │     costeDe(modelo,uso) │          │
  └───────────┬─────────────┘          │
              │ 6. "son 0,0041 USD"    │
              ▼                        ▼
  ┌─────────────────────────┐   ┌──────────────────┐
  │  El agente firma el     │──►│  STELLAR TESTNET │
  │  pago por ese importe   │   │                  │
  └─────────────────────────┘   │  tx: a3f9...     │
              │                 └──────────────────┘
              │ 7. hash de la tx         ▲
              ▼                          │
  ┌─────────────────────────┐            │
  │  PROXY verifica contra  │────────────┘
  │  Horizon y descuenta    │   (no se fía: mira la cadena)
  └─────────────────────────┘
```

El punto 5 **ya existe y está en producción**. Los puntos 1, 3, 6 y 7 son lo que
se construye en esta hackathon.

---

## Declaración de proyecto previo (bases §8.1)

Este proyecto **parte de un producto que ya existía antes del evento** y lo
declaramos abiertamente, como exigen las bases.

**Lo que ya existía**, y por tanto **no se presenta a evaluación**:

- **Chocolatito Code** — agente de IA para terminal, publicado en npm.
  Commit base: [`0edf57f`](https://github.com/chocolatito27/chocolatito-code/commit/0edf57f4c2c2319b6f9a5cfbf54673ebca140fe4)
  (versión 1.6.44, **18 sep 2026 22:34 PET** — anterior al inicio de la ventana
  de desarrollo, el 19 sep a las 09:00).
- **El proxy de cuota** — un Worker de Cloudflare que valida licencias y mide el
  coste en dólares de cada llamada al modelo (`costeDe()` sobre el `usage` que
  devuelve el motor, descontando los aciertos de caché).

**Lo que se construye dentro de la ventana**, y es lo único que pedimos que se
evalúe: **todo el contenido de este repositorio**, creado desde cero el 22 sep
2026. Es decir, la capa de pagos: firma en el cliente, liquidación por tarea,
verificación contra Horizon y el enganche con el medidor que ya existía.

Se eligió un repositorio nuevo, y no una rama del producto, precisamente para
que la frontera entre "lo de antes" y "lo de la hackathon" sea el propio
repositorio y no haya que fiarse de nuestra palabra.

---

## Evidencia on-chain (testnet)

Primera liquidación, con el importe exacto que cuesta una tarea real de
Chocolatito:

| | |
|---|---|
| **Transacción** | [`fe620dbc1e891155e9fe8b27aa309d00db046a93bc858939afa12efd0d9d0656`](https://stellar.expert/explorer/testnet/tx/fe620dbc1e891155e9fe8b27aa309d00db046a93bc858939afa12efd0d9d0656) |
| Cuenta del agente | `GBBS2QRWNCNC7T4J7IHA6M4OO5TSB56OJ25C3JGZWJXCJEKYRDCBMY4Y` |
| Cuenta de cobro | `GBGN5VOQ5ANM5H5TI3TXFRZSNNKO3ONCS5TA6TYAEOZQYY3LLIGOSYW3` |
| Importe | 0,0041 — el coste medido de una tarea |
| Memo | `cc:42f5ae22` (atribución a la licencia) |
| Comisión de red | **100 stroops = 0,00001** |
| Fecha | 2026-09-22 22:45:37 UTC |

**El número que resume el proyecto**: cobrar 0,0041 costó 0,00001 de comisión.
Una pasarela de tarjeta cobra del orden de 0,30 fijos — setenta y cinco veces
el propio pago. Por eso este cobro no existe fuera de un riel como Stellar.

### Una tarea entera, hecha por el agente de verdad

**Esto no es una simulación de un agente: es el agente.** Se ejecutó
**Chocolatito Code instalado**, con `chocolatito -y "..."`, sobre ocho archivos
de factura en `datos/taller/`. Leyó los ocho, sumó por mes y escribió
`balance.md`. Las vueltas de abajo son **las que él decidió dar solo**, medidas
al vuelo y guardadas en [`datos/uso-real.json`](datos/uso-real.json).

Se midió poniendo un proxy delante del proxy y lanzando el CLI contra él con
`CHOCOLATITO_ENGINE_URL`. **No hubo que tocar ni una línea del producto**: esa
variable ya existía para pruebas.

| Llamada | Entrada | Cacheada | Salida | Coste |
|---|---:|---:|---:|---:|
| 1 · lee las facturas | 14.882 | 128 | 135 | 0,0066718 |
| 2 · suma por mes | 15.259 | 14.592 | 459 | 0,0011036 |
| 3 · arma la tabla | 16.383 | 14.976 | 852 | 0,0019534 |
| 4 · escribe balance.md | 17.288 | 16.256 | 317 | 0,0011001 |
| | | | **Total** | **0,0108289** |

**Por qué el medidor no es un detalle**: sin descontar la caché, esa tarea
habría costado **0,0304044 — 2,8 veces más**, un **64% de sobrefacturación**.
Se ve en la tabla: la primera llamada manda las facturas y casi no acierta
(128 de 14.882); a partir de la segunda el prefijo ya está en caché y cuesta
treinta veces menos por token. Eso **solo pasa con un agente**, que arrastra el
contexto vuelta tras vuelta, y es justo lo que un cobro por suscripción no ve.

**Y lo que se cobró por cobrarlo**: 0,00001 de comisión sobre 0,0108289 —
**1.083 veces menos que el importe**. Una pasarela de tarjeta habría cobrado
~0,30 fijos, **28 veces el propio cobro**.

Se reproduce con `node --experimental-strip-types guiones/medir-agente.ts`
(necesita el CLI instalado y una licencia activa; gasta unos céntimos).

**Si falta ese archivo, la demo no se inventa nada: se para.** La primera
versión llevaba los tokens escritos a mano como «consumo plausible»; todo lo
demás era real, y eso era justo lo que lo hacía peor.

### Lo que se comprueba antes de dar por bueno un pago

El agente firma en la máquina del usuario, así que su palabra no basta. El
proxy va a Horizon y comprueba cuatro cosas; saltarse cualquiera deja una
forma de cobrar sin pagar. Probado contra la transacción de arriba:

| Intento | Resultado |
|---|---|
| El pago bueno | ✅ válido |
| Presentarlo cuando se debía 1,00 | ❌ «Pagó 0.0041 y debía 1» |
| Reutilizar el pago de otra licencia | ❌ «El memo no corresponde a esta licencia» |
| Pagarse a sí mismo y enseñar el hash | ❌ «La transacción no paga a la cuenta de cobro» |
| Inventarse un hash | ❌ «Esa transacción no existe en la red» |

Se reproduce con `node --experimental-strip-types guiones/probar-verificacion.ts`.

### Nota honesta sobre el activo

Ahora mismo se liquida en **XLM de testnet**, con el importe calculado en
dólares por el medidor. El paso a USDC con su *trustline* es el siguiente hito;
no se ha hecho todavía y no lo contamos como hecho.

---

## Código y servicios de terceros (bases §8.3)

| Qué | Licencia | Para qué |
|---|---|---|
| [`@stellar/stellar-sdk`](https://github.com/stellar/js-stellar-sdk) 13.3.0 | Apache-2.0 | Construir y firmar las transacciones en el cliente |
| [Horizon](https://developers.stellar.org/docs/data/apis/horizon) (testnet) | servicio público de la SDF | Consultar la cadena para verificar los pagos |
| [Friendbot](https://developers.stellar.org/docs/build/guides/basics/create-account) | servicio público de la SDF | Fondear las cuentas de prueba |
| Lemon Squeezy | servicio comercial | **Preexistente**, no forma parte de lo presentado. Emite las licencias del producto; aquí solo se usa el prefijo de la clave como `memo` para atribuir cada pago. |

Apache-2.0 es compatible con la licencia MIT de este repositorio.

No se ha usado ninguna plantilla ni *starter kit*: los tres módulos de `src/`
están escritos para este proyecto.

## Sobre fondos reales (bases §18)

**Este proyecto no toca dinero real en ningún punto, y está construido para que
no pueda hacerlo.**

- La red está fijada a `Networks.TESTNET` en `src/cartera.ts`. No hay ninguna
  ruta de código hacia la red principal.
- Las cuentas se fondean con Friendbot, que **solo existe en testnet**.
- El proxy de producción de Chocolatito —que sí cobra de verdad— **no se ha
  modificado ni se despliega como parte de esta hackathon**. La capa de pagos
  vive entera en este repositorio. El medidor de coste se reproduce aquí a
  partir de la misma tabla de precios, sin llamar al servicio en vivo.

Esa separación es deliberada: el producto sigue vendiendo por su lado y el
proyecto presentado no participa de ese flujo.

---

## El vídeo de la demo

[`video/demo-chocolatito-stellar.mp4`](video/demo-chocolatito-stellar.mp4) —
1920×1080, 68 s.

**Va en dos tramos, y el primero es el que importa:**

1. **Chocolatito Code trabajando de verdad.** Se ve su banner, la orden, cómo
   lista la carpeta, abre las ocho facturas una a una y escribe `balance.md`.
   Es el CLI instalado, ejecutándose — no una recreación.
2. **El cobro de ese trabajo**: se mide, se firma y se verifica en la cadena.

**No es una captura de pantalla.** Se ejecutan los dos programas de verdad,
se captura su salida con los tiempos reales a los que va apareciendo, y se
vuelve a dibujar como terminal. Cada fotograma dura exactamente lo que tardó
en salir, así que el ritmo del vídeo es el de los programas.

La primera versión solo tenía el segundo tramo: se veían las cifras del agente
pero no se le veía a él. Faltaba justo lo que había que enseñar.

La transacción que aparece dentro se firmó durante esa grabación:
[`e97b9eb83415372b76d152197e5fdd3d7605b44ca6fa81b88be47c5fd3fadd54`](https://stellar.expert/explorer/testnet/tx/e97b9eb83415372b76d152197e5fdd3d7605b44ca6fa81b88be47c5fd3fadd54)
· 0,0108289 · comisión 0,00001 · **1.083 veces menor que el propio cobro**.

Se regenera con `node --experimental-strip-types guiones/grabar.ts`, y cada
ejecución produce una transacción nueva y comprobable.

## Cómo verlo funcionando

```bash
npm install
node --experimental-strip-types guiones/demo.ts
```

Corre de principio a fin en unos 75 segundos: crea las cuentas, fondea con
Friendbot, mide una tarea vuelta a vuelta, firma el pago y lo verifica contra
la cadena. **Nada está preparado de antemano** — cada ejecución genera su
propia transacción, y el enlace al explorador que sale al final es comprobable.

Con `--rapido` va sin pausas.

| Guión | Qué prueba |
|---|---|
| `guiones/demo.ts` | El recorrido entero. Es lo que se graba. |
| `guiones/tarea-completa.ts` | Medición + liquidación, sin narración |
| `guiones/probar-pago.ts` | Solo la firma y el envío |
| `guiones/probar-verificacion.ts` | Los cuatro fraudes que se rechazan |

Ver también [DEMO.md](DEMO.md) (cómo se graba) y [PITCH.md](PITCH.md) (guión de
los 3 minutos).

## Equipo

| | GitHub | Rol |
|---|---|---|
| Tomás Diego Araujo Tejada | [@chocolatito27](https://github.com/chocolatito27) | Integración Stellar, medidor y verificación |
| Rony Ricra Rojas | [@leonelricra2](https://github.com/leonelricra2) | Pitch, documentación y vídeo |

*(queda un integrante por sumarse antes del cierre del checkpoint, 23 sep 23:59 PET)*

## Licencia

MIT — ver [LICENSE](LICENSE).
