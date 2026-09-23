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

### Una tarea entera, de principio a fin

Seis vueltas de agente sobre *«revisa estas 40 facturas y hazme un Excel»*,
medidas una a una y liquidadas al cerrar la tarea:

| Vuelta | Entrada | Cacheada | Salida | Coste |
|---:|---:|---:|---:|---:|
| 1 | 4.820 | 0 | 210 | 0,0023980 |
| 2 | 5.310 | 4.800 | 180 | 0,0005292 |
| 3 | 6.040 | 5.280 | 340 | 0,0008571 |
| 4 | 7.120 | 6.000 | 260 | 0,0009200 |
| 5 | 7.900 | 7.100 | 410 | 0,0009926 |
| 6 | 8.730 | 7.880 | 520 | 0,0011707 |
| | | | **Total** | **0,0068676** |

**Transacción**:
[`c6d9529d2343cbf1f814c157d63b2e56c5f739c00d90231074a27296594e0698`](https://stellar.expert/explorer/testnet/tx/c6d9529d2343cbf1f814c157d63b2e56c5f739c00d90231074a27296594e0698)
· verificada contra la cadena: **válida**.

**Por qué el medidor no es un detalle**: sin descontar los aciertos de caché,
esa misma tarea habría costado **0,0200992 — 2,9 veces más**. La primera vuelta
manda el prompt entero sin cachear; las cinco siguientes reenvían la
conversación, que ya está en caché y cuesta treinta veces menos por token. Un
cobro que ignore eso no es un redondeo: es una factura casi triple por el mismo
trabajo.

Se reproduce con `node --experimental-strip-types guiones/tarea-completa.ts`.

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

**No es una captura de pantalla ni una recreación.** Se genera ejecutando
`demo.ts` de verdad, capturando su salida con los tiempos reales a los que va
apareciendo y volviéndola a dibujar como terminal. Cada fotograma dura
exactamente lo que tardó en salir, así que el ritmo del vídeo es el del
programa.

La transacción que aparece dentro se firmó durante esa grabación:
[`8499aa06ba6bafdea9176d26565726daacf04997832a537bd593a10b22cb331a`](https://stellar.expert/explorer/testnet/tx/8499aa06ba6bafdea9176d26565726daacf04997832a537bd593a10b22cb331a)
· 0,0068677 · comisión 0,00001 · **687 veces menor que el propio cobro**.

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
