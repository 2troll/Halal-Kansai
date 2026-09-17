/**
 * Compartir texto desde cualquier pantalla.
 *
 * En la app nativa, la hoja de compartir del sistema (WhatsApp, LINE…); en el
 * navegador, la Web Share API; y si no hay ninguna, se copia al portapapeles.
 * Devuelve qué pasó para que la pantalla lo diga.
 */
import { isNative } from '../backend';
import { APP_URL } from '../config';

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

/** Añade la dirección de la app al final, una sola vez. */
export function withAppLink(text: string): string {
  return text.includes(APP_URL) ? text : `${text.trim()}\n\n— Halal Kansai · ${APP_URL}`;
}

export async function shareText(title: string, text: string): Promise<ShareResult> {
  const body = withAppLink(text);
  try {
    if (isNative()) {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title, text: body, dialogTitle: title });
      return 'shared';
    }
    if (typeof navigator.share === 'function') {
      await navigator.share({ title, text: body });
      return 'shared';
    }
  } catch (err) {
    // Cerrar la hoja sin elegir nada no es un error que haya que enseñar.
    const msg = String((err as Error)?.message ?? err);
    if (/cancel|abort/i.test(msg) || (err as Error)?.name === 'AbortError') return 'cancelled';
  }
  try {
    await navigator.clipboard.writeText(body);
    return 'copied';
  } catch {
    return 'failed';
  }
}
