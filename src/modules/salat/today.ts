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
export function hijriDate(date: Date, lang: string): string | null {
  try {
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' });
    if (!fmt.resolvedOptions().calendar.startsWith('islamic')) return null;
    const part = (type: string) => Number(fmt.formatToParts(date).find((p) => p.type === type)?.value);
    const [day, month, year] = [part('day'), part('month'), part('year')];
    if (![day, month, year].every(Number.isFinite) || month < 1 || month > 12) return null;
    if (lang === 'ar' || lang === 'ur') return `${day} ${HIJRI_MONTHS_AR[month - 1]} ${year} هـ`;
    return `${day} ${HIJRI_MONTHS[month - 1]} ${year} AH`;
  } catch {
    return null;
  }
}

/** El rezo cuyo tiempo está corriendo ahora; antes del fayr sigue siendo el isha de anoche. */
export function currentPrayerOf(times: PrayerTimes, now: Date): keyof PrayerTimes {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let current: keyof PrayerTimes = 'isha';
  for (const name of FARD) {
    if (Math.round(times[name] * 60) <= nowMin) current = name;
  }
  return current;
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
