/**
 * Lo que rodea a la lista de rezos de hoy: la fecha hégira, qué rezo está en
 * curso y cuáles ya se han rezado. Sin DOM, para probarlo.
 *
 * Ideas tomadas de Muslim Pro tras revisarla en el Nothing (17/09/2026): la
 * fecha hégira bajo la de hoy, «Ahora» en el rezo en curso y un círculo para
 * marcar cada rezo hecho. El registro se queda en el teléfono.
 */
import type { PrayerTimes } from './calculator';

export const FARD: ReadonlyArray<keyof PrayerTimes> = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

const HIJRI_MONTHS = [
  'Muharram', 'Safar', 'Rabi’ I', 'Rabi’ II', 'Jumada I', 'Jumada II',
  'Rajab', 'Sha’ban', 'Ramadan', 'Shawwal', 'Dhu al-Qi’dah', 'Dhu al-Hijjah',
];
const HIJRI_MONTHS_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];

/**
 * Fecha hégira (calendario Umm al-Qura); null si el motor no lo tiene.
 *
 * Solo se le piden NÚMEROS a Intl: el WebView del Nothing, en español,
 * escribía «6 de abril de 1448 a. C.» (meses y era del calendario
 * gregoriano). Los nombres de los meses los pone la app.
 */
let hijriFmt: Intl.DateTimeFormat | null | undefined;

/** Día, mes y año hégiros en números; null si el motor no trae el calendario. */
export function hijriParts(date: Date): { day: number; month: number; year: number } | null {
  try {
    if (hijriFmt === undefined) {
      const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' });
      hijriFmt = fmt.resolvedOptions().calendar.startsWith('islamic') ? fmt : null;
    }
    if (!hijriFmt) return null;
    const parts = hijriFmt.formatToParts(date);
    const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const [day, month, year] = [part('day'), part('month'), part('year')];
    if (![day, month, year].every(Number.isFinite) || month < 1 || month > 12) return null;
    return { day, month, year };
  } catch {
    return null;
  }
}

export function hijriDate(date: Date, lang: string): string | null {
  const h = hijriParts(date);
  if (!h) return null;
  if (lang === 'ar' || lang === 'ur') return `${h.day} ${HIJRI_MONTHS_AR[h.month - 1]} ${h.year} هـ`;
  return `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year} AH`;
}

/**
 * El rezo cuyo tiempo está corriendo ahora; antes del fayr sigue siendo el
 * isha de anoche. Entre el amanecer y el dhuhr no hay ninguno: el tiempo del
 * fayr ya terminó, y decir «Ahora: Fayr» a las nueve sería decir que aún vale.
 */
export function currentPrayerOf(times: PrayerTimes, now: Date): keyof PrayerTimes | null {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const at = (name: keyof PrayerTimes) => Math.round(times[name] * 60);
  if (nowMin >= at('sunrise') && nowMin < at('dhuhr')) return null;
  let current: keyof PrayerTimes = 'isha';
  for (const name of FARD) {
    if (at(name) <= nowMin) current = name;
  }
  return current;
}

/**
 * A qué día pertenece marcar un rezo. De madrugada (antes del fayr) el isha
 * que se marca es el de anoche: guardarlo con la fecha de hoy lo daría ya por
 * rezado esta noche.
 */
export function prayerDate(name: string, times: PrayerTimes, now: Date): Date {
  const beforeFajr = now.getHours() * 60 + now.getMinutes() < Math.round(times.fajr * 60);
  return beforeFajr && name === 'isha' ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12) : now;
}

/** Clave del día en hora local (no UTC: en Japón el día cambia 9 horas antes). */
export function dayKey(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

const PRAYED_PREFIX = 'hk-prayed-';

export function parsePrayed(raw: string | null): Set<string> {
  try {
    const list = JSON.parse(raw ?? '[]') as unknown;
    return new Set(Array.isArray(list) ? list.filter((n): n is string => FARD.includes(n as keyof PrayerTimes)) : []);
  } catch {
    return new Set();
  }
}

export function loadPrayed(date: Date): Set<string> {
  try {
    return parsePrayed(localStorage.getItem(PRAYED_PREFIX + dayKey(date)));
  } catch {
    return new Set();
  }
}

export function togglePrayed(date: Date, name: string): Set<string> {
  const set = loadPrayed(date);
  if (set.has(name)) set.delete(name);
  else set.add(name);
  try {
    localStorage.setItem(PRAYED_PREFIX + dayKey(date), JSON.stringify([...set]));
    // Solo se guardan los últimos 30 días: es un recordatorio, no un historial.
    const cutoff = dayKey(new Date(date.getTime() - 30 * 86400000));
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(PRAYED_PREFIX) && k.slice(PRAYED_PREFIX.length) < cutoff) localStorage.removeItem(k);
    }
  } catch {
    /* sin almacenamiento: vale para esta sesión */
  }
  return set;
}
