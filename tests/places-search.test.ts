import { describe, expect, it } from 'vitest';
import { searchRank } from '../src/modules/places/search.ts';
import { PLACES } from '../src/modules/places/data.ts';

describe('búsqueda de lugares', () => {
  const mosque = { name: 'Kobe Mosque', city: 'Kobe' };
  const room = { name: 'Rokko Snow Park Prayer Room', city: 'Kobe' };

  it('el nombre pesa más que la ciudad', () => {
    expect(searchRank(mosque, 'kobe')).toBeLessThan(searchRank(room, 'kobe')!);
  });

  it('varias palabras, sin importar orden, tildes ni mayúsculas', () => {
    expect(searchRank(mosque, '  MOSQUE  kobe ')).toBe(0);
    expect(searchRank({ name: 'Mezquita', city: 'Kyōto' }, 'kyoto mezquita')).toBe(1);
    expect(searchRank(mosque, 'kobe osaka')).toBeNull();
  });

  it('sin búsqueda entra todo', () => {
    expect(searchRank(room, '   ')).toBe(0);
  });

  it('con los datos reales, «kobe» pone primero lugares con Kobe en el nombre', () => {
    const ranked = PLACES.map((p) => ({ p, r: searchRank(p, 'kobe') }))
      .filter((x) => x.r !== null)
      .sort((a, b) => a.r! - b.r!);
    expect(ranked[0].p.name.toLowerCase()).toContain('kobe');
  });
});
