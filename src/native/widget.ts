/**
 * Puente hacia el widget de pantalla de inicio de Android.
 *
 * El widget lo dibuja Kotlin (`android/.../PrayerWidget.kt`), porque vive en
 * el lanzador del sistema y ahí no llega el HTML. Pero el CÁLCULO de los
 * horarios no se toca: lo hace `modules/salat/calculator.ts`, que tiene sus
 * tests, y desde aquí solo se le manda el resultado ya hecho.
 *
 * Duplicar el algoritmo astronómico en TypeScript y en Kotlin sería garantizar
 * que algún día discrepen, y ese día el widget diría una hora de rezo
 * equivocada en la pantalla de inicio de alguien. Un solo algoritmo, un solo
 * sitio donde equivocarse.
 */
import { isNative } from '../backend';

interface WidgetPlugin {
  update(options: { name: string; time: string; city?: string }): Promise<void>;
}

/**
 * Manda al widget el próximo rezo. No hace nada fuera de Android: en la web y
 * en iOS la llamada se descarta en silencio, porque no existe el widget.
 */
export async function updatePrayerWidget(
  name: string,
  time: string,
  city?: string,
): Promise<void> {
  if (!isNative()) return;

  try {
    const { registerPlugin } = await import('@capacitor/core');
    const plugin = registerPlugin<WidgetPlugin>('PrayerWidget');
    await plugin.update({ name, time, city });
  } catch {
    // Sin widget colocado, o iOS: no es un error que deba ver nadie.
  }
}
