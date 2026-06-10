/**
 * Cálculo astronómico de horas de oración.
 * Método MWL (Muslim World League): Fajr 18°, Isha 17°, Asr Shafi'i (factor 1).
 * Algoritmo basado en posición solar (declinación + ecuación del tiempo),
 * equivalente al de PrayTimes.org / AlAdhan. Funciona 100% offline.
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PrayerTimes {
  /** Horas decimales locales (0–24) */
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

export const METHOD_MWL = {
  fajrAngle: 18,
  ishaAngle: 17,
  /** Factor de sombra Shafi'i para Asr */
  asrFactor: 1,
} as const;

const DEG = Math.PI / 180;

const dsin = (d: number) => Math.sin(d * DEG);
const dcos = (d: number) => Math.cos(d * DEG);
const dtan = (d: number) => Math.tan(d * DEG);
const darcsin = (x: number) => Math.asin(x) / DEG;
const darccos = (x: number) => Math.acos(Math.min(1, Math.max(-1, x))) / DEG;
const darctan2 = (y: number, x: number) => Math.atan2(y, x) / DEG;
const darccot = (x: number) => Math.atan2(1, x) / DEG;

const fixAngle = (a: number) => ((a % 360) + 360) % 360;
const fixHour = (h: number) => ((h % 24) + 24) % 24;

/** Día juliano a medianoche UT del día civil dado. */
export function julianDate(year: number, month: number, day: number): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    b -
    1524.5
  );
}

interface SunPosition {
  declination: number;
  equation: number; // ecuación del tiempo en horas
}

/** Declinación solar y ecuación del tiempo (aprox. del Astronomical Almanac). */
function sunPosition(jd: number): SunPosition {
  const d = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * d);
  const q = fixAngle(280.459 + 0.98564736 * d);
  const l = fixAngle(q + 1.915 * dsin(g) + 0.02 * dsin(2 * g));
  const e = 23.439 - 0.00000036 * d;

  const declination = darcsin(dsin(e) * dsin(l));
  const ra = fixHour(darctan2(dcos(e) * dsin(l), dcos(l)) / 15);
  const equation = q / 15 - ra;
  return { declination, equation: ((equation + 12) % 24) - 12 };
}

/**
 * Calcula las horas de oración para una fecha, coordenadas y zona horaria
 * (offset UTC en horas, p. ej. Japón = 9).
 */
export function computePrayerTimes(
  date: { year: number; month: number; day: number },
  coords: Coordinates,
  timezone: number,
  method = METHOD_MWL,
): PrayerTimes {
  const { lat, lng } = coords;
  // Día juliano referido al mediodía solar local aproximado.
  const jDate = julianDate(date.year, date.month, date.day) - lng / (15 * 24);

  const midDay = (t: number): number => {
    const eqt = sunPosition(jDate + t).equation;
    return fixHour(12 - eqt);
  };

  /** Hora a la que el sol alcanza `angle` grados bajo el horizonte. */
  const sunAngleTime = (angle: number, t: number, ccw: boolean): number => {
    const decl = sunPosition(jDate + t).declination;
    const noon = midDay(t);
    const cosHa =
      (-dsin(angle) - dsin(decl) * dsin(lat)) / (dcos(decl) * dcos(lat));
    const ha = darccos(cosHa) / 15;
    return noon + (ccw ? -ha : ha);
  };

  /** Asr: sombra = factor × sombra del mediodía. */
  const asrTime = (factor: number, t: number): number => {
    const decl = sunPosition(jDate + t).declination;
    const angle = -darccot(factor + dtan(Math.abs(lat - decl)));
    return sunAngleTime(angle, t, false);
  };

  // Estimaciones iniciales (fracción del día), una sola pasada como PrayTimes.
  const portions = { fajr: 5 / 24, sunrise: 6 / 24, dhuhr: 12 / 24, asr: 13 / 24, sunset: 18 / 24, isha: 18 / 24 };

  const horizon = 0.833; // refracción + semidiámetro solar

  const raw = {
    fajr: sunAngleTime(method.fajrAngle, portions.fajr, true),
    sunrise: sunAngleTime(horizon, portions.sunrise, true),
    dhuhr: midDay(portions.dhuhr),
    asr: asrTime(method.asrFactor, portions.asr),
    maghrib: sunAngleTime(horizon, portions.sunset, false),
    isha: sunAngleTime(method.ishaAngle, portions.isha, false),
  };

  // Paso de hora solar local a hora civil de la zona.
  const toLocal = (t: number) => fixHour(t + timezone - lng / 15);

  return {
    fajr: toLocal(raw.fajr),
    sunrise: toLocal(raw.sunrise),
    dhuhr: toLocal(raw.dhuhr),
    asr: toLocal(raw.asr),
    maghrib: toLocal(raw.maghrib),
    isha: toLocal(raw.isha),
  };
}

/** "HH:MM" redondeando al minuto más cercano. */
export function formatTime(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
