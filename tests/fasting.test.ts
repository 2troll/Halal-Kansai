import { describe, expect, it } from 'vitest';
import {
  addDays,
  fastingCountdown,
  fastingDay,
  formatDuration,
  ramadanCalendar,
} from '../src/modules/ramadan/fasting';

const OSAKA = { lat: 34.6937, lng: 135.5023 };
const JST = 9;

describe('fastingDay', () => {
  it('el ayuno va del fayr al magrib', () => {
    const d = fastingDay({ year: 2027, month: 2, day: 8 }, OSAKA, JST);
    expect(d.imsak).toBeLessThan(d.iftar);
    expect(d.durationMinutes).toBeGreaterThan(0);
  });

  it('en Osaka en invierno el ayuno dura entre 11 y 14 horas', () => {
    const d = fastingDay({ year: 2027, month: 2, day: 8 }, OSAKA, JST);
    expect(d.durationMinutes).toBeGreaterThan(11 * 60);
    expect(d.durationMinutes).toBeLessThan(14 * 60);
  });

  it('en verano el ayuno es más largo que en invierno', () => {
    const inv = fastingDay({ year: 2027, month: 1, day: 15 }, OSAKA, JST);
    const ver = fastingDay({ year: 2027, month: 7, day: 15 }, OSAKA, JST);
    expect(ver.durationMinutes).toBeGreaterThan(inv.durationMinutes);
  });

  it('el margen de imsak adelanta el inicio y alarga el ayuno', () => {
    const sin = fastingDay({ year: 2027, month: 2, day: 8 }, OSAKA, JST, 0);
    const con = fastingDay({ year: 2027, month: 2, day: 8 }, OSAKA, JST, 10);
    expect(con.imsak).toBeLessThan(sin.imsak);
    expect(con.durationMinutes).toBe(sin.durationMinutes + 10);
  });

  it('por defecto no añade margen: imsak es el fayr exacto', () => {
    const d = fastingDay({ year: 2027, month: 2, day: 8 }, OSAKA, JST);
    const conMargen = fastingDay({ year: 2027, month: 2, day: 8 }, OSAKA, JST, 0);
    expect(d.imsak).toBe(conMargen.imsak);
  });
});

describe('addDays', () => {
  it('cambia de mes', () => {
    expect(addDays({ year: 2027, month: 1, day: 31 }, 1)).toEqual({ year: 2027, month: 2, day: 1 });
  });
  it('cambia de año', () => {
    expect(addDays({ year: 2026, month: 12, day: 31 }, 1)).toEqual({ year: 2027, month: 1, day: 1 });
  });
  it('respeta el año bisiesto', () => {
    expect(addDays({ year: 2028, month: 2, day: 28 }, 1)).toEqual({ year: 2028, month: 2, day: 29 });
  });
});

describe('ramadanCalendar', () => {
  it('devuelve 30 días numerados del 1 al 30', () => {
    const c = ramadanCalendar({ year: 2027, month: 2, day: 8 }, OSAKA, JST);
    expect(c).toHaveLength(30);
    expect(c[0].ramadanDay).toBe(1);
    expect(c[29].ramadanDay).toBe(30);
  });

  it('acepta meses de 29 días', () => {
    expect(ramadanCalendar({ year: 2027, month: 2, day: 8 }, OSAKA, JST, 29)).toHaveLength(29);
  });

  it('los días avanzan en el calendario civil', () => {
    const c = ramadanCalendar({ year: 2027, month: 2, day: 27 }, OSAKA, JST, 3);
    expect(c.map((d) => d.date.day)).toEqual([27, 28, 1]);
  });
});

describe('fastingCountdown', () => {
  const day = { date: { year: 2027, month: 2, day: 8 }, imsak: 5, iftar: 18, durationMinutes: 780 };

  it('a mediodía se está ayunando y cuenta hacia el iftar', () => {
    const c = fastingCountdown(day, 12);
    expect(c.phase).toBe('fasting');
    expect(c.minutesRemaining).toBe(6 * 60);
  });

  it('antes del alba no se ayuna y cuenta hacia el imsak', () => {
    const c = fastingCountdown(day, 3);
    expect(c.phase).toBe('not-fasting');
    expect(c.minutesRemaining).toBe(2 * 60);
  });

  it('después del iftar cuenta al imsak del día siguiente, no a un número negativo', () => {
    const c = fastingCountdown(day, 20);
    expect(c.phase).toBe('not-fasting');
    expect(c.minutesRemaining).toBe(9 * 60); // 20:00 → 05:00 = 9 h
    expect(c.minutesRemaining).toBeGreaterThan(0);
  });

  it('justo en el imsak ya se está ayunando', () => {
    expect(fastingCountdown(day, 5).phase).toBe('fasting');
  });

  it('justo en el iftar ya no se ayuna', () => {
    expect(fastingCountdown(day, 18).phase).toBe('not-fasting');
  });
});

describe('formatDuration', () => {
  it('rellena los minutos con cero', () => {
    expect(formatDuration(14 * 60 + 5)).toBe('14 h 05 min');
  });
});
