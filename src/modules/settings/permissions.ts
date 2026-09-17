/**
 * Estado de los permisos, leído del sitio correcto en cada plataforma.
 *
 * En la app nativa manda el sistema (los plugins de Capacitor); en la web,
 * la Permissions API del navegador. Cada plugin y cada navegador llama a los
 * estados a su manera («prompt-with-rationale», «limited»…): aquí se reducen
 * a cuatro, que es lo que la pantalla sabe explicar.
 */
import { isNative } from '../../backend';

export type PermKind = 'location' | 'camera' | 'microphone' | 'notifications';
export type PermState = 'granted' | 'denied' | 'prompt' | 'unknown';

export const PERM_KINDS: readonly PermKind[] = ['location', 'camera', 'microphone', 'notifications'];

export function normalizePerm(raw: unknown): PermState {
  switch (raw) {
    case 'granted':
    case 'limited':
      return 'granted';
    case 'denied':
      return 'denied';
    case 'prompt':
    case 'prompt-with-rationale':
    case 'default': // Notification.permission
      return 'prompt';
    default:
      return 'unknown';
  }
}

async function queryBrowser(name: string): Promise<PermState> {
  try {
    const status = await navigator.permissions.query({ name: name as PermissionName });
    return normalizePerm(status.state);
  } catch {
    return 'unknown';
  }
}

/** Un plugin de Capacitor responde a cualquier método: si no existe, rechaza. */
async function tryPlugin(fn: () => Promise<unknown>, pick: (r: Record<string, unknown>) => unknown): Promise<PermState> {
  try {
    return normalizePerm(pick((await fn()) as Record<string, unknown>));
  } catch {
    return 'unknown';
  }
}

export async function checkPermission(kind: PermKind): Promise<PermState> {
  if (isNative()) {
    switch (kind) {
      case 'camera': {
        const { Camera } = await import('@capacitor/camera');
        return tryPlugin(() => Camera.checkPermissions(), (r) => r.camera);
      }
      case 'notifications': {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        return tryPlugin(() => LocalNotifications.checkPermissions(), (r) => r.display);
      }
      case 'microphone': {
        const { speechPlugin } = await import('../khutbah/speech-native');
        return tryPlugin(() => speechPlugin().checkPermissions(), (r) => r.speechRecognition ?? r.microphone);
      }
      default: {
        // La Permissions API del WebView dice «prompt» aunque Android ya la
        // haya concedido: hay que preguntar al sistema.
        const { Geolocation } = await import('@capacitor/geolocation');
        return tryPlugin(() => Geolocation.checkPermissions(), (r) => r.location);
      }
    }
  }
  if (kind === 'notifications' && typeof Notification !== 'undefined') return normalizePerm(Notification.permission);
  return queryBrowser(kind === 'location' ? 'geolocation' : kind);
}

/** Pide el permiso haciendo lo mínimo que lo dispara, y devuelve el estado nuevo. */
export async function requestPermission(kind: PermKind): Promise<PermState> {
  try {
    if (isNative() && kind === 'camera') {
      const { Camera } = await import('@capacitor/camera');
      await Camera.requestPermissions({ permissions: ['camera'] });
    } else if (isNative() && kind === 'notifications') {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.requestPermissions();
    } else if (isNative() && kind === 'microphone') {
      const { speechPlugin } = await import('../khutbah/speech-native');
      await speechPlugin().requestPermissions();
    } else if (isNative() && kind === 'location') {
      const { Geolocation } = await import('@capacitor/geolocation');
      await Geolocation.requestPermissions({ permissions: ['location'] });
    } else if (kind === 'location') {
      await new Promise<void>((resolve) =>
        navigator.geolocation.getCurrentPosition(() => resolve(), () => resolve(), { timeout: 15000 }),
      );
    } else if (kind === 'notifications') {
      await Notification.requestPermission();
    } else {
      // Cámara o micrófono en la web: abrir y cerrar al momento, sin grabar.
      const stream = await navigator.mediaDevices.getUserMedia(kind === 'camera' ? { video: true } : { audio: true });
      stream.getTracks().forEach((t) => t.stop());
    }
  } catch {
    /* denegado o no disponible: lo dice el estado que se lee a continuación */
  }
  return checkPermission(kind);
}
