import { describe, expect, it } from 'vitest';
import { computePrayerTimes, formatTime, type PrayerTimes } from '../src/modules/salat/calculator';

const OSAKA = { lat: 34.6937, lng: 135.5023 };
const TOKYO = { lat: 35.6762, lng: 139.6503 };
const JST = 9;

/**
 * Horarios de referencia método MWL (Fajr 18°, Isha 17°, Asr Shafi'i),
 * obtenidos de api.aladhan.com (method=3, school=0) el 2026-06-10.
 * Tolerancia exigida por la spec: ±2 minutos.
 */
const FIXTURES: Array<{
  name: string;
  coords: { lat: number; lng: number };
  date: { year: number; month: number; day: number };
  expected: Record<keyof PrayerTimes, string>;
}> = [
  {
    name: 'Osaka 2026-06-15 (verano)',
    coords: OSAKA,
    date: { year: 2026, month: 6, day: 15 },
    expected: { fajr: '02:58', sunrise: '04:44', dhuhr: '11:58', asr: '15:45', maghrib: '19:13', isha: '20:52' },
  },
  {
    name: 'Osaka 2026-09-25 (otoño)',
    coords: OSAKA,
    date: { year: 2026, month: 9, day: 25 },
    expected: { fajr: '04:24', sunrise: '05:48', dhuhr: '11:50', asr: '15:17', maghrib: '17:51', isha: '19:10' },
  },
  {
    name: 'Osaka 2026-12-15 (invierno)',
    coords: OSAKA,
    date: { year: 2026, month: 12, day: 15 },
    expected: { fajr: '05:27', sunrise: '06:57', dhuhr: '11:53', asr: '14:31', maghrib: '16:48', isha: '18:14' },
  },
  {
    name: 'Osaka 2026-03-20 (equinoccio)',
    coords: OSAKA,
    date: { year: 2026, month: 3, day: 20 },
    expected: { fajr: '04:38', sunrise: '06:02', dhuhr: '12:06', asr: '15:31', maghrib: '18:09', isha: '19:29' },
  },
  {
    name: 'Tokio 2026-06-15 (verano)',
    coords: TOKYO,
    date: { year: 2026, month: 6, day: 15 },
    expected: { fajr: '02:37', sunrise: '04:25', dhuhr: '11:42', asr: '15:31', maghrib: '18:59', isha: '20:40' },
  },
  {
    name: 'Tokio 2026-12-15 (invierno)',
    coords: TOKYO,
    date: { year: 2026, month: 12, day: 15 },
    expected: { fajr: '05:12', sunrise: '06:43', dhuhr: '11:36', asr: '14:12', maghrib: '16:29', isha: '17:56' },
  },
];

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

const TOLERANCE_MIN = 2;

describe('computePrayerTimes (MWL, Asr Shafi’i)', () => {
  for (const fx of FIXTURES) {
    it(`coincide con horarios publicados ±${TOLERANCE_MIN} min — ${fx.name}`, () => {
      const times = computePrayerTimes(fx.date, fx.coords, JST);
      for (const prayer of Object.keys(fx.expected) as Array<keyof PrayerTimes>) {
        const got = Math.round(times[prayer] * 60);
        const want = toMinutes(fx.expected[prayer]);
        expect(
          Math.abs(got - want),
          `${prayer}: esperado ${fx.expected[prayer]}, calculado ${formatTime(times[prayer])}`,
        ).toBeLessThanOrEqual(TOLERANCE_MIN);
      }
    });
  }

  it('mantiene el orden Fajr < Sunrise < Dhuhr < Asr < Maghrib < Isha', () => {
    const t = computePrayerTimes({ year: 2026, month: 6, day: 15 }, OSAKA, JST);
    expect(t.fajr).toBeLessThan(t.sunrise);
    expect(t.sunrise).toBeLessThan(t.dhuhr);
    expect(t.dhuhr).toBeLessThan(t.asr);
    expect(t.asr).toBeLessThan(t.maghrib);
    expect(t.maghrib).toBeLessThan(t.isha);
  });
});

describe('formatTime', () => {
  it('formatea horas decimales como HH:MM', () => {
    expect(formatTime(4.5)).toBe('04:30');
    expect(formatTime(19.999)).toBe('20:00');
    expect(formatTime(0)).toBe('00:00');
  });
});
