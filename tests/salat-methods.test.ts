/**
 * Métodos de cálculo y Asr hanafí, contra api.aladhan.com.
 *
 * Referencias pedidas el 2026-09-17 para Osaka (34.6937, 135.5023,
 * Asia/Tokyo): method=1 Karachi, 2 ISNA, 4 Umm al-Qura, 5 Egipto,
 * 20 Kemenag (Indonesia), y method=3 MWL con school=1 (Hanafi).
 *
 * El Asr hanafí sale entre 39 y 76 minutos más tarde que el shafi'í: con el
 * método único de antes, a quien reza hanafí (la mayoría de pakistaníes,
 * bangladesíes y turcos en Japón) la app le daba el Asr una hora antes.
 */
import { describe, expect, it } from 'vitest';
import {
  computePrayerTimes,
  formatTime,
  methodFor,
  type AsrSchool,
  type MethodId,
  type PrayerTimes,
} from '../src/modules/salat/calculator';

const OSAKA = { lat: 34.6937, lng: 135.5023 };
const JST = 9;
const TOLERANCE_MIN = 2;

type Expected = Record<keyof PrayerTimes, string>;
const row = (s: string): Expected => {
  const [fajr, sunrise, dhuhr, asr, maghrib, isha] = s.split(' ');
  return { fajr, sunrise, dhuhr, asr, maghrib, isha } as Expected;
};

const DATES = {
  sep: { year: 2026, month: 9, day: 25 },
  dec: { year: 2026, month: 12, day: 15 },
  jun: { year: 2026, month: 6, day: 15 },
};

const FIXTURES: Array<{ method: MethodId; school: AsrSchool; date: keyof typeof DATES; expected: Expected }> = [
  { method: 'karachi', school: 'shafii', date: 'sep', expected: row('04:24 05:48 11:50 15:17 17:51 19:15') },
  { method: 'isna', school: 'shafii', date: 'sep', expected: row('04:39 05:48 11:50 15:17 17:51 19:00') },
  { method: 'makkah', school: 'shafii', date: 'sep', expected: row('04:21 05:48 11:50 15:17 17:51 19:21') },
  { method: 'egypt', school: 'shafii', date: 'sep', expected: row('04:16 05:48 11:50 15:17 17:51 19:13') },
  { method: 'indonesia', school: 'shafii', date: 'sep', expected: row('04:14 05:48 11:50 15:17 17:51 19:15') },
  { method: 'mwl', school: 'hanafi', date: 'sep', expected: row('04:24 05:48 11:50 16:08 17:51 19:10') },
  { method: 'karachi', school: 'shafii', date: 'dec', expected: row('05:27 06:57 11:53 14:31 16:48 18:19') },
  { method: 'isna', school: 'shafii', date: 'dec', expected: row('05:42 06:57 11:53 14:31 16:48 18:03') },
  { method: 'makkah', school: 'shafii', date: 'dec', expected: row('05:25 06:57 11:53 14:31 16:48 18:18') },
  { method: 'egypt', school: 'shafii', date: 'dec', expected: row('05:20 06:57 11:53 14:31 16:48 18:16') },
  { method: 'indonesia', school: 'shafii', date: 'dec', expected: row('05:17 06:57 11:53 14:31 16:48 18:19') },
  { method: 'mwl', school: 'hanafi', date: 'dec', expected: row('05:27 06:57 11:53 15:10 16:48 18:14') },
  { method: 'karachi', school: 'shafii', date: 'jun', expected: row('02:58 04:44 11:58 15:45 19:13 20:59') },
  { method: 'isna', school: 'shafii', date: 'jun', expected: row('03:19 04:44 11:58 15:45 19:13 20:38') },
  { method: 'makkah', school: 'shafii', date: 'jun', expected: row('02:55 04:44 11:58 15:45 19:13 20:43') },
  { method: 'egypt', school: 'shafii', date: 'jun', expected: row('02:47 04:44 11:58 15:45 19:13 20:55') },
  { method: 'indonesia', school: 'shafii', date: 'jun', expected: row('02:44 04:44 11:58 15:45 19:13 20:59') },
  { method: 'mwl', school: 'hanafi', date: 'jun', expected: row('02:58 04:44 11:58 17:01 19:13 20:52') },
];

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

describe('métodos de cálculo contra AlAdhan (Osaka)', () => {
  for (const fx of FIXTURES) {
    it(`${fx.method} · Asr ${fx.school} · ${fx.date} ±${TOLERANCE_MIN} min`, () => {
      const times = computePrayerTimes(DATES[fx.date], OSAKA, JST, methodFor(fx.method, fx.school));
      for (const prayer of Object.keys(fx.expected) as Array<keyof PrayerTimes>) {
        const got = Math.round(times[prayer] * 60);
        expect(
          Math.abs(got - toMinutes(fx.expected[prayer])),
          `${prayer}: esperado ${fx.expected[prayer]}, calculado ${formatTime(times[prayer])}`,
        ).toBeLessThanOrEqual(TOLERANCE_MIN);
      }
    });
  }

  it('Umm al-Qura: Isha exactamente 90 minutos tras el Maghrib', () => {
    const t = computePrayerTimes(DATES.sep, OSAKA, JST, methodFor('makkah', 'shafii'));
    expect(Math.round((t.isha - t.maghrib) * 60)).toBe(90);
  });
});
