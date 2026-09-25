/**
 * LO QUE COMPARTEN EL QUE FIRMA Y EL QUE VERIFICA
 *
 * Este archivo no importa NADA, y no es por limpieza: es un requisito.
 *
 * El verificador corre en un Worker de Cloudflare, donde el SDK de Stellar es
 * un problema de tamaño y de compatibilidad. Antes el verificador sacaba
 * `memoDeLicencia` de `pagos.ts`, que carga el SDK en su primera línea: su
 * comentario decía "aquí no se usa el SDK" y lo arrastraba igual, por la
 * puerta de atrás. Lo que necesitan los dos lados vive aquí, sin dependencias,
 * y una prueba comprueba que el verificador no llega al SDK por ningún camino.
 */

/**
 * El emisor del USDC de pruebas de Circle. Ver `activos.ts` para por qué es el
 * emisor, y no el código "USDC", lo que identifica el activo.
 */
export const EMISOR_USDC = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

/**
 * El `memo` lleva la licencia, que es como el proxy sabe de quién es el pago.
 *
 * Un memo de texto admite 28 bytes, así que no cabe una clave de licencia
 * entera (son 36 caracteres). Se manda un prefijo, que basta para localizarla
 * entre las licencias activas sin publicar la clave completa en una cadena que
 * cualquiera puede leer — que además es justo lo que NO hay que hacer con una
 * credencial.
 */
export function memoDeLicencia(licencia: string): string {
  return `cc:${licencia.trim().slice(0, 8)}`;
}
