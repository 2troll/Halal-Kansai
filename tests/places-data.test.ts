/**
 * Calidad de los datos de lugares. Un error aquí manda a alguien a la
 * dirección equivocada para el rezo del viernes.
 */
import { describe, expect, it } from 'vitest';
import { PLACES } from '../src/modules/places/data';

describe('PLACES', () => {
  it('hay mezquitas, salas de oración, restaurantes y tiendas', () => {
    const types = new Set(PLACES.map((p) => p.type));
    expect([...types].sort()).toEqual(['mosque', 'prayer', 'restaurant', 'shop']);
    expect(PLACES.length).toBeGreaterThan(50);
  });

  it('ids únicos', () => {
    expect(new Set(PLACES.map((p) => p.id)).size).toBe(PLACES.length);
  });

  it('coordenadas dentro de Kansai, o ninguna (nunca a medias)', () => {
    for (const p of PLACES) {
      expect((p.lat === undefined) === (p.lng === undefined), p.name).toBe(true);
      if (p.lat === undefined) continue;
      expect(p.lat, p.name).toBeGreaterThan(33.4);
      expect(p.lat, p.name).toBeLessThan(35.8);
      expect(p.lng!, p.name).toBeGreaterThan(134.2);
      expect(p.lng!, p.name).toBeLessThan(136.9);
    }
  });

  it('cada lugar dice de dónde sale el dato', () => {
    for (const p of PLACES) expect(p.source, p.name).toMatch(/^https?:\/\//);
  });

  it('ningún restaurante que sirva alcohol', () => {
    const risky = PLACES.filter((p) => /serves? alcohol|bar menu|beer|sake bar/i.test(`${p.notes ?? ''}`));
    expect(risky.map((p) => p.name)).toEqual([]);
  });
});
