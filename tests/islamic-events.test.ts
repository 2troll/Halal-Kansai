import { describe, expect, it } from 'vitest';
import { EVENTS, nextIslamicEvent } from '../src/modules/salat/events.ts';
import { hijriParts } from '../src/modules/salat/today.ts';

describe('próxima fecha islámica', () => {
  it('desde el 17-9-2026 (6 Rabi II 1448) la siguiente es el inicio del Ramadán 1448, en febrero de 2027', () => {
    const ev = nextIslamicEvent(new Date(2026, 8, 17, 9))!;
    expect(ev.key).toBe('evRamadan');
    expect(ev.date.getFullYear()).toBe(2027);
    expect(ev.date.getMonth()).toBe(1);
    expect(hijriParts(ev.date)).toMatchObject({ month: 9, day: 1, year: 1448 });
  });

  it('el mismo día cuenta como hoy y no se salta ninguna fecha intermedia', () => {
    const ev = nextIslamicEvent(new Date(2026, 8, 17))!;
    const again = nextIslamicEvent(ev.date)!;
    expect(again.daysLeft).toBe(0);
    expect(again.key).toBe(ev.key);
    // Recorriendo un año entero, las seis fechas aparecen en orden hégiro.
    const seen: string[] = [];
    let cursor = new Date(2026, 8, 17);
    for (let i = 0; i < 6; i++) {
      const e = nextIslamicEvent(cursor)!;
      seen.push(e.key);
      cursor = new Date(e.date.getFullYear(), e.date.getMonth(), e.date.getDate() + 1);
    }
    expect(seen).toEqual(['evRamadan', 'evEidFitr', 'evArafah', 'evEidAdha', 'evHijriNewYear', 'evAshura']);
    expect(EVENTS).toHaveLength(6);
  });
});
