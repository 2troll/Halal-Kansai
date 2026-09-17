import { describe, expect, it } from 'vitest';
import { currentPrayerOf, dayKey, hijriDate, parsePrayed, prayerDate } from '../src/modules/salat/today.ts';
import type { PrayerTimes } from '../src/modules/salat/calculator.ts';

const TIMES = { fajr: 4.3, sunrise: 5.7, dhuhr: 11.87, asr: 15.38, maghrib: 18.05, isha: 19.37 } as PrayerTimes;
const at = (h: number, m: number) => new Date(2026, 8, 17, h, m);

describe('rezos de hoy', () => {
  it('el rezo en curso', () => {
    expect(currentPrayerOf(TIMES, at(2, 0))).toBe('isha');
    expect(currentPrayerOf(TIMES, at(5, 0))).toBe('fajr');
    // Entre el amanecer y el dhuhr el fayr ya no vale: no hay «Ahora».
    expect(currentPrayerOf(TIMES, at(6, 30))).toBeNull();
    expect(currentPrayerOf(TIMES, at(11, 0))).toBeNull();
    expect(currentPrayerOf(TIMES, at(12, 0))).toBe('dhuhr');
    expect(currentPrayerOf(TIMES, at(23, 0))).toBe('isha');
  });

  it('de madrugada, marcar el isha cuenta para anoche; el resto, para hoy', () => {
    expect(dayKey(prayerDate('isha', TIMES, at(1, 0)))).toBe('2026-09-16');
    expect(dayKey(prayerDate('fajr', TIMES, at(1, 0)))).toBe('2026-09-17');
    expect(dayKey(prayerDate('isha', TIMES, at(21, 0)))).toBe('2026-09-17');
  });

  it('fecha hégira del 17-9-2026 (Rabi II 1448) en varios idiomas', () => {
    // Muslim Pro dice «6 Rabi' II 1448 AH» para ese día.
    expect(hijriDate(at(12, 0), 'en')).toBe('6 Rabi’ II 1448 AH');
    expect(hijriDate(at(12, 0), 'es')).toBe('6 Rabi’ II 1448 AH');
    expect(hijriDate(at(12, 0), 'ar')).toBe('6 ربيع الآخر 1448 هـ');
  });

  it('día en hora local y registro saneado', () => {
    expect(dayKey(at(0, 5))).toBe('2026-09-17');
    expect([...parsePrayed('["fajr","sunrise","hack",3,"isha"]')]).toEqual(['fajr', 'isha']);
    expect(parsePrayed('{roto').size).toBe(0);
  });
});
