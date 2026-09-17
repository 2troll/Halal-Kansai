/**
 * La próxima fecha islámica señalada, calculada en el teléfono.
 *
 * Idea de Muslim Pro y Athan: saber con tiempo cuándo empieza el Ramadán o
 * cuándo es el Eid. Se calcula con el calendario Umm al-Qura que ya trae el
 * motor del teléfono, sin conexión. Es una estimación: donde manda el
 * avistamiento de la luna puede moverse un día, y la tarjeta lo dice.
 */
import { hijriParts } from './today';

export type EventKey = 'evHijriNewYear' | 'evAshura' | 'evRamadan' | 'evEidFitr' | 'evArafah' | 'evEidAdha';

export const EVENTS: ReadonlyArray<{ key: EventKey; month: number; day: number }> = [
  { key: 'evHijriNewYear', month: 1, day: 1 },
  { key: 'evAshura', month: 1, day: 10 },
  { key: 'evRamadan', month: 9, day: 1 },
  { key: 'evEidFitr', month: 10, day: 1 },
  { key: 'evArafah', month: 12, day: 9 },
  { key: 'evEidAdha', month: 12, day: 10 },
];

export interface NextEvent {
  key: EventKey;
  date: Date;
  /** 0 = hoy, 1 = mañana… */
  daysLeft: number;
}

/** Un año hégiro son 354–355 días: en 400 siempre aparece la siguiente. */
const HORIZON_DAYS = 400;

let cache: { day: string; value: NextEvent | null } | null = null;

/** Igual que nextIslamicEvent, pero una sola cuenta por día (Salat se repinta al entrar). */
export function nextIslamicEventCached(now: Date): NextEvent | null {
  const day = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  if (cache?.day !== day) cache = { day, value: nextIslamicEvent(now) };
  return cache.value;
}

export function nextIslamicEvent(now: Date): NextEvent | null {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  for (let i = 0; i <= HORIZON_DAYS; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12);
    const h = hijriParts(date);
    if (!h) return null;
    const ev = EVENTS.find((e) => e.month === h.month && e.day === h.day);
    if (ev) return { key: ev.key, date, daysLeft: i };
  }
  return null;
}
