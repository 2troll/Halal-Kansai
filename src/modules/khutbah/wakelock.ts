/**
 * Modo viernes: mantener la pantalla encendida durante la jutba
 * (Wake Lock API). El sistema lo libera al cambiar de pestaña;
 * lo re-adquirimos al volver mientras siga activo.
 */

type WakeLockSentinelLike = { release(): Promise<void> };

let sentinel: WakeLockSentinelLike | null = null;
let wanted = false;

async function acquire(): Promise<void> {
  const wakeLock = (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> } }).wakeLock;
  if (!wakeLock) return; // navegador sin soporte: seguimos sin pantalla fija
  try {
    sentinel = await wakeLock.request('screen');
  } catch {
    sentinel = null; // p. ej. batería baja: el sistema puede denegarlo
  }
}

function onVisibility(): void {
  if (wanted && document.visibilityState === 'visible' && !sentinel) {
    void acquire();
  }
}

export async function enableFridayMode(): Promise<void> {
  wanted = true;
  document.addEventListener('visibilitychange', onVisibility);
  await acquire();
}

export async function disableFridayMode(): Promise<void> {
  wanted = false;
  document.removeEventListener('visibilitychange', onVisibility);
  await sentinel?.release().catch(() => undefined);
  sentinel = null;
}
