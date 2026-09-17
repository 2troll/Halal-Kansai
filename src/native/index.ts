/**
 * Lo que la app nativa hace y una web no puede.
 *
 * Esto no es decoración: es la razón de que exista una app además de la PWA.
 * En iOS, una web instalada NO puede avisar del rezo con el móvil bloqueado;
 * una app sí. El adhan a su hora es la función que la comunidad pide primero.
 *
 * Todo lo de aquí se activa solo dentro del contenedor nativo. En el navegador
 * cada función devuelve sin hacer nada, para que la misma base de código siga
 * sirviendo a las tres plataformas sin ramas por todas partes.
 */
import { isNative } from '../backend';
import type { PrayerTimes } from '../modules/salat/calculator';
import { t } from '../i18n';

/** Los seis nombres, en el orden del día. */
const PRAYERS: Array<keyof PrayerTimes> = [
  'fajr',
  'sunrise',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
];

/** El amanecer no es un rezo: no se avisa de él. */
const NOTIFIED: Array<keyof PrayerTimes> = PRAYERS.filter((p) => p !== 'sunrise');

const PREF_KEY = 'hk-notify-prayers';

export function notificationsEnabled(): boolean {
  return localStorage.getItem(PREF_KEY) === '1';
}

export function setNotificationsEnabled(on: boolean): void {
  localStorage.setItem(PREF_KEY, on ? '1' : '0');
}

/**
 * Arranca lo nativo: barra de estado a juego, splash fuera en cuanto hay
 * pintado algo, y reprogramación de avisos al volver a primer plano (los
 * horarios cambian cada día, así que reprogramar al abrir es lo correcto).
 */
export async function initNative(reschedule: () => Promise<void>): Promise<void> {
  if (!isNative()) return;

  const [{ SplashScreen }, { App }] = await Promise.all([
    import('@capacitor/splash-screen'),
    import('@capacitor/app'),
  ]);

  await syncStatusBar();
  await SplashScreen.hide().catch(() => {});

  App.addListener('resume', () => {
    void reschedule();
  });
}

/**
 * La barra de estado (hora, batería) sigue al tema. Antes era siempre de
 * letra blanca: con un tema claro no se leía la hora sobre el fondo crema.
 */
export async function syncStatusBar(): Promise<void> {
  if (!isNative()) return;
  const { StatusBar, Style } = await import('@capacitor/status-bar');
  const root = document.documentElement;
  const light = root.dataset.tone === 'light';
  const bg = getComputedStyle(root).getPropertyValue('--night').trim() || '#10211d';
  // Style.Light = letra oscura (para fondo claro); Style.Dark = letra clara.
  await StatusBar.setStyle({ style: light ? Style.Light : Style.Dark }).catch(() => {});
  await StatusBar.setBackgroundColor({ color: bg }).catch(() => {});
}

/**
 * Programa un aviso por rezo para los próximos `days` días.
 *
 * Se reprograma entero cada vez (cancelar y volver a poner) en lugar de ir
 * añadiendo: es la única forma de que un cambio de ciudad o de método no deje
 * avisos viejos sonando a la hora equivocada.
 */
export async function schedulePrayerNotifications(
  timesByDay: Array<{ date: Date; times: PrayerTimes }>,
  nearestMosque?: string,
): Promise<void> {
  if (!isNative() || !notificationsEnabled()) return;

  const { LocalNotifications } = await import('@capacitor/local-notifications');

  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== 'granted') return;

  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications });
  }

  const now = Date.now();
  const notifications = timesByDay.flatMap(({ date, times }, dayIndex) =>
    NOTIFIED.map((name, i) => {
      const at = atTime(date, times[name]);
      return {
        id: dayIndex * 10 + i + 1,
        title: t(name),
        body: t('nextPrayer'),
        schedule: { at },
        smallIcon: 'ic_stat_icon',
      };
    }).filter((n) => n.schedule.at.getTime() > now),
  );

  // Viernes: aviso 45 min antes del dhuhr con la mezquita más cercana. El
  // jumu'ah se reza en congregación y hay que llegar; a la hora del rezo ya
  // es tarde para salir de casa.
  timesByDay.forEach(({ date, times }, dayIndex) => {
    if (date.getDay() !== 5) return;
    const at = atTime(date, times.dhuhr - 0.75);
    if (at.getTime() <= now) return;
    notifications.push({
      id: dayIndex * 10 + 9,
      title: t('jumuahReminderTitle'),
      body: nearestMosque ? `${t('jumuahReminderBody')} ${nearestMosque}` : t('jumuahReminderBody').replace(/[:：]\s*$/, ''),
      schedule: { at },
      smallIcon: 'ic_stat_icon',
    });
  });

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
}

/** Cancela todo lo programado (al apagar los avisos desde los ajustes). */
export async function cancelPrayerNotifications(): Promise<void> {
  if (!isNative()) return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications });
  }
}

/** Hora decimal (13.75) → Date de ese día a esa hora local. */
function atTime(day: Date, hours: number): Date {
  const d = new Date(day);
  d.setHours(Math.floor(hours), Math.round((hours % 1) * 60), 0, 0);
  return d;
}
