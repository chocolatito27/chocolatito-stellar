import { Horizon, Keypair, Networks } from "@stellar/stellar-sdk";

/**
 * LA CARTERA DEL AGENTE
 *
 * La clave secreta vive en el equipo del usuario y no sale de ahí. No es un
 * detalle de implementación: es lo que separa este proyecto de "un servidor
 * que cobra por ti".
 *
 * El track pide agentes que FIRMEN micropagos. Si la clave viviera en el
 * proxy, quien firma sería el proxy y el agente solo pediría permiso — que es
 * exactamente el modelo que ya existe con las tarjetas y el que estamos
 * intentando quitar de en medio.
 *
 * Y encaja con lo que el producto ya promete de tus archivos: lo tuyo se queda
 * en tu máquina.
 */

/** Testnet. Este proyecto NO toca la red principal en ningún punto. */
export const RED = Networks.TESTNET;
const HORIZON = "https://horizon-testnet.stellar.org";
const FRIENDBOT = "https://friendbot.stellar.org";

export function servidor(): Horizon.Server {
  return new Horizon.Server(HORIZON);
}

export interface Cartera {
  publica: string;
  secreta: string;
}

/**
 * Una cartera nueva, sin fondear.
 *
 * En Stellar una cuenta no existe hasta que alguien la fondea: generar el par
 * de claves es gratis y local, pero la red no sabe nada de ella. Por eso esto
 * y `fondear` son dos pasos y no uno — y por eso el error más común al
 * empezar es "account not found" sobre una cuenta que sí creaste.
 */
export function crearCartera(): Cartera {
  const par = Keypair.random();
  return { publica: par.publicKey(), secreta: par.secret() };
}

export function carteraDesdeSecreta(secreta: string): Cartera {
  const par = Keypair.fromSecret(secreta.trim());
  return { publica: par.publicKey(), secreta: par.secret() };
}

/**
 * Fondea una cuenta de testnet con Friendbot.
 *
 * Friendbot es el grifo oficial de pruebas: regala 10.000 XLM de testnet, que
 * no valen nada. Solo existe en testnet, y esa es justamente la garantía de
 * que este código no puede mover dinero real por accidente.
 */
export async function fondear(publica: string): Promise<void> {
  const res = await fetch(`${FRIENDBOT}?addr=${encodeURIComponent(publica)}`);
  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    // 400 con "createAccountAlreadyExist" significa que ya estaba fondeada,
    // que para lo que queremos es un éxito y no un fallo.
    if (detalle.includes("createAccountAlreadyExist")) return;
    throw new Error(`Friendbot no pudo fondear ${publica} (HTTP ${res.status}): ${detalle.slice(0, 200)}`);
  }
}

export interface Saldo {
  activo: string;
  cantidad: string;
}

/** Los saldos de una cuenta, tal y como los ve la red. */
export async function saldos(publica: string): Promise<Saldo[]> {
  const cuenta = await servidor().loadAccount(publica);
  return cuenta.balances.map((b) => ({
    activo: b.asset_type === "native" ? "XLM" : `${(b as { asset_code?: string }).asset_code ?? "?"}`,
    cantidad: b.balance,
  }));
}

/** ¿Existe ya en la red? Distinto de "tengo las claves". */
export async function existe(publica: string): Promise<boolean> {
  try {
    await servidor().loadAccount(publica);
    return true;
  } catch {
    return false;
  }
}
