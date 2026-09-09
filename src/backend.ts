/**
 * Dónde vive el backend.
 *
 * En la web la app y la API comparten origen, así que basta con `/api/...`.
 * Dentro de la app nativa no: el origen es `capacitor://localhost`, y una ruta
 * relativa apuntaría al propio paquete de la app. Ahí hay que ir al Worker.
 *
 * Se resuelve una sola vez y en un solo sitio: si mañana cambia el dominio,
 * se cambia aquí y las tres plataformas quedan arregladas a la vez.
 */

/** El Worker de producción: sirve la PWA y la API en el mismo origen. */
const REMOTE = 'https://halal-kansai.2troll-p.workers.dev';

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
}

/** true dentro del contenedor de Android/iOS; false en cualquier navegador. */
export function isNative(): boolean {
  if (location.protocol === 'capacitor:') return true;
  const cap = (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

/** Base absoluta en nativo, cadena vacía (mismo origen) en web. */
export function apiBase(): string {
  return isNative() ? REMOTE : '';
}

/** `/api/translate` → absoluta en nativo, relativa en web. */
export function apiUrl(path: string): string {
  return `${apiBase()}${path}`;
}

/** Igual para WebSocket: wss://… en nativo, mismo host en web. */
export function apiWsUrl(path: string): string {
  if (isNative()) return `${REMOTE.replace(/^https/, 'wss')}${path}`;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}${path}`;
}
