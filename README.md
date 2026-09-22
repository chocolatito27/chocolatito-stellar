# Chocolatito · Pago por uso en Stellar

**Un agente de IA que firma, por cada tarea que hace, el pago exacto de lo que
esa tarea costó — en USDC sobre Stellar.**

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

Un pago de 0,004 USD no es viable por tarjeta: la comisión se come el pago
veinte veces. Sobre Stellar cuesta 0,00001 XLM. Ese es exactamente el hueco que
Stellar llena, y es la razón de que este proyecto tenga sentido aquí y no en
otro sitio.

---

## Cómo usa Stellar

| Pieza | Qué hace en Stellar |
|---|---|
| **El agente firma** | La CLI tiene la clave secreta y construye y firma cada pago. El proxy nunca la ve. |
| **Saldo previo** | El usuario recarga una cuenta con USDC de testnet. El proxy consulta ese saldo en Horizon antes de dejar trabajar al agente. |
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

## Equipo

| | GitHub | Rol |
|---|---|---|
| Tomás Diego Araujo Tejada | [@chocolatito27](https://github.com/chocolatito27) | Integración Stellar y proxy |

*(pendiente de completar con los dos integrantes restantes antes del cierre del
checkpoint, 23 sep 23:59 PET)*

## Licencia

MIT — ver [LICENSE](LICENSE).
