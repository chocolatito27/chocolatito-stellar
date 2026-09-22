/**
 * EL MEDIDOR
 *
 * Esto es lo único de este repositorio que NO es original: se reproduce del
 * proxy de Chocolatito, que ya lo tenía en producción antes del evento. Se
 * declara así en el README y se copia en vez de llamarlo en vivo, para que el
 * proyecto presentado no toque el servicio que cobra de verdad (bases §18).
 *
 * Qué hace: convertir el `usage` que devuelve el motor en dólares.
 *
 * EL DETALLE QUE PARECE MENOR Y NO LO ES: LA CACHÉ
 *
 * Los tokens de entrada que aciertan en caché cuestan ~30 veces menos que los
 * que no (0,014 frente a 0,44 por millón). En un agente, donde cada vuelta
 * reenvía toda la conversación anterior, casi toda la entrada es acierto de
 * caché. Cobrar todo a precio de fallo sobrefactura treinta veces.
 *
 * Aquí eso pasa de ser un error de contabilidad a ser un error de COBRO: el
 * número que sale de esta función es el que el agente va a firmar.
 */

export interface Precio {
  /** Dólares por millón de tokens de entrada que NO aciertan en caché. */
  entradaSinCache: number;
  entradaConCache: number;
  salida: number;
}

/** La misma tabla del proxy. Si allí cambia, aquí también. */
export const PRECIOS: Record<string, Precio> = {
  "deepseek-v4-flash": { entradaSinCache: 0.44, entradaConCache: 0.014, salida: 1.32 },
  "deepseek-v4-pro": { entradaSinCache: 1.32, entradaConCache: 0.044, salida: 3.96 },
  "deepseek-v4-flash-vision-exp": { entradaSinCache: 0.44, entradaConCache: 0.014, salida: 1.32 },
};

export interface Uso {
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number };
}

/**
 * El coste real de una llamada, en dólares.
 *
 * Un modelo desconocido devuelve 0 y no lo inventa: cobrar por una tarifa que
 * no existe es peor que no cobrar. Si aparece un modelo nuevo, se nota porque
 * el ingreso baja, no porque un cliente pague de más.
 */
export function costeDe(modelo: string, uso: Uso | undefined | null): number {
  if (!uso) return 0;
  const p = PRECIOS[modelo];
  if (!p) return 0;

  const entrada = uso.prompt_tokens ?? 0;
  // `Math.min` porque el motor podría devolver más tokens cacheados que
  // totales; sin el tope, la resta de abajo sale negativa y el coste también.
  const cacheados = Math.min(uso.prompt_tokens_details?.cached_tokens ?? 0, entrada);
  const sinCache = Math.max(0, entrada - cacheados);
  const salida = uso.completion_tokens ?? 0;

  return (
    (sinCache / 1e6) * p.entradaSinCache +
    (cacheados / 1e6) * p.entradaConCache +
    (salida / 1e6) * p.salida
  );
}

/** Lo que costaría sin descontar la caché. Solo para enseñar la diferencia. */
export function costeSinDescuentoDeCache(modelo: string, uso: Uso | undefined | null): number {
  if (!uso) return 0;
  const p = PRECIOS[modelo];
  if (!p) return 0;
  return (
    ((uso.prompt_tokens ?? 0) / 1e6) * p.entradaSinCache +
    ((uso.completion_tokens ?? 0) / 1e6) * p.salida
  );
}
