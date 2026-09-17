import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { normalizePerm } from '../src/modules/settings/permissions.ts';
import { AUTHOR, CREDITS, PRIVACY_URL, SOURCE_URL } from '../src/modules/settings/about.ts';

describe('estado de permisos', () => {
  it('reduce los nombres de cada plataforma a cuatro estados', () => {
    expect(['granted', 'limited'].map(normalizePerm)).toEqual(['granted', 'granted']);
    expect(normalizePerm('denied')).toBe('denied');
    expect(['prompt', 'prompt-with-rationale', 'default'].map(normalizePerm)).toEqual(['prompt', 'prompt', 'prompt']);
    expect([undefined, null, 42, 'rare'].map(normalizePerm)).toEqual(['unknown', 'unknown', 'unknown', 'unknown']);
  });
});

describe('acerca de y legal', () => {
  it('enlaces en https y autor definido', () => {
    expect(AUTHOR.length).toBeGreaterThan(2);
    for (const url of [PRIVACY_URL, SOURCE_URL, ...CREDITS.map((c) => c.url)]) expect(url).toMatch(/^https:\/\//);
  });

  it('crédito para cada dependencia de terceros que se ve o se distribuye', () => {
    const names = CREDITS.map((c) => c.name).join(' ');
    for (const n of ['OpenStreetMap', 'Leaflet', 'Tanzil', 'Capacitor', 'ML Kit', 'Whisper', 'Transformers.js']) {
      expect(names).toContain(n);
    }
  });

  it('la política de privacidad no promete que el audio nunca sale del teléfono', () => {
    // El modo rápido usa el reconocedor de Google o Apple: prometerlo sería falso.
    const html = readFileSync(new URL('../public/privacidad.html', import.meta.url), 'utf8');
    expect(html).not.toMatch(/never leaves your phone|nunca\s+sale de tu teléfono|端末の外に出ることはありません|لا يغادر هاتفك أبدًا/);
    expect(html).toMatch(/Google/);
  });
});
