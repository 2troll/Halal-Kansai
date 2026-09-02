/**
 * Ayuno: imsak, iftar y calendario mensual.
 *
 * Se apoya en el mismo cálculo astronómico de `salat/calculator`, así que
 * funciona sin conexión y sin API, igual que el resto de la aplicación.
 *
 * Dos decisiones que conviene entender:
 *
 * 1. **Imsak.** El ayuno empieza con el alba (fayr). Muchos calendarios
 *    añaden un margen de precaución de unos minutos antes. Ese margen es una
 *    costumbre, no una obligación, así que aquí es **configurable y por
 *    defecto 0**: mostramos el fayr real y dejamos que el usuario decida si
 *    quiere adelantarlo.
 *
 * 2. **El calendario hiyrí es una estimación.** El comienzo de Ramadán
 *    depende del avistamiento de la luna y varía de un país a otro. No
 *    calculamos fechas hiyríes: el usuario indica el primer día y a partir de
 *    ahí contamos. Fingir precisión en esto sería peor que no ofrecerlo.
 */

import { computePrayerTimes, formatTime, type Coordinates } from '../salat/calculator';

export interface FastingDay {
  /** Fecha civil. */
  date: { year: number; month: number; day: number };
  /** Día de Ramadán, 1–30, si se ha fijado el inicio. */
  ramadanDay?: number;
  /** Hora de comenzar el ayuno (fayr, menos el margen elegido). */
  imsak: number;
  /** Hora de romper el ayuno (magrib). */
  iftar: number;
  /** Duración del ayuno en minutos. */
  durationMinutes: number;
}

/** Margen de precaución antes del fayr, en minutos. Por defecto ninguno. */
export const DEFAULT_IMSAK_MARGIN = 0;

export function fastingDay(
  date: { year: number; month: number; day: number },
  coords: Coordinates,
  timezone: number,
  imsakMarginMinutes: number = DEFAULT_IMSAK_MARGIN,
): FastingDay {
  const t = computePrayerTimes(date, coords, timezone);
  const imsak = t.fajr - imsakMarginMinutes / 60;
  const iftar = t.maghrib;
  return {
    date,
    imsak,
    iftar,
    durationMinutes: Math.round((iftar - imsak) * 60),
  };
}

/** Suma días a una fecha civil, con paso por meses y años. */
export function addDays(
  d: { year: number; month: number; day: number },
  n: number,
): { year: number; month: number; day: number } {
  const ms = Date.UTC(d.year, d.month - 1, d.day) + n * 86400000;
  const x = new Date(ms);
  return { year: x.getUTCFullYear(), month: x.getUTCMonth() + 1, day: x.getUTCDate() };
}

/**
 * Calendario completo desde el primer día de Ramadán.
 * `length` suele ser 29 o 30 según el mes lunar; por defecto 30.
 */
export function ramadanCalendar(
  firstDay: { year: number; month: number; day: number },
  coords: Coordinates,
  timezone: number,
  length = 30,
  imsakMarginMinutes: number = DEFAULT_IMSAK_MARGIN,
): FastingDay[] {
  const out: FastingDay[] = [];
  for (let i = 0; i < length; i++) {
    const date = addDays(firstDay, i);
    out.push({ ...fastingDay(date, coords, timezone, imsakMarginMinutes), ramadanDay: i + 1 });
  }
  return out;
}

export interface Countdown {
  /** Qué toca ahora: esperar al iftar, o esperar al imsak del día siguiente. */
  phase: 'fasting' | 'not-fasting';
  /** Minutos que faltan para el próximo hito. */
  minutesRemaining: number;
  /** Hora del próximo hito, formateada. */
  targetTime: string;
}

/**
 * Estado del ayuno en un momento dado.
 *
 * `nowHours` son horas decimales locales (p. ej. 13,5 = 13:30). Se pasa como
 * argumento en lugar de leer el reloj para que la función sea pura y testable.
 */
export function fastingCountdown(day: FastingDay, nowHours: number): Countdown {
  if (nowHours >= day.imsak && nowHours < day.iftar) {
    return {
      phase: 'fasting',
      minutesRemaining: Math.round((day.iftar - nowHours) * 60),
      targetTime: formatTime(day.iftar),
    };
  }
  // Fuera de la ventana de ayuno: el siguiente hito es el imsak.
  // Si ya pasó el iftar, el imsak es el de mañana (+24 h).
  const nextImsak = nowHours >= day.iftar ? day.imsak + 24 : day.imsak;
  return {
    phase: 'not-fasting',
    minutesRemaining: Math.round((nextImsak - nowHours) * 60),
    targetTime: formatTime(day.imsak),
  };
}

/** "14 h 32 min" a partir de minutos. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} h ${String(m).padStart(2, '0')} min`;
}
