/**
 * Camino gratis (sin clave de Anthropic): traducción por MT gratuita con
 * la verificación coránica intacta. Se simula freeTranslate para no pegar a
 * la red en los tests.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { QuranStore, TranslationFile } from '../server/src/store.ts';

vi.mock('../server/src/free-translate.ts', () => ({
  freeTranslate: vi.fn(async (text: string, _s: string, target: string) => `[MT:${target}] ${text}`),
}));

import { freeTranslate } from '../server/src/free-translate.ts';
import { buildSegment } from '../server/src/segment.ts';

const mockFree = vi.mocked(freeTranslate);

function realStore(): QuranStore {
  const read = (p: string) =>
    JSON.parse(readFileSync(new URL(`../server/data/${p}`, import.meta.url), 'utf8'));
  const uthmani = read('quran-uthmani.json') as Record<string, string>;
  const es = read('translations/es.json') as TranslationFile;
  return {
    loadUthmani: async () => uthmani,
    loadTranslation: async (lang) => (lang === 'es' ? es : null),
  };
}

// Sin apiKey → camino gratis.
const deps = { llm: { apiKey: '' }, store: realStore() };

describe('buildSegment — camino gratis (sin clave)', () => {
  beforeAll(() => vi.clearAllMocks());

  it('habla normal: traduce con MT gratis, sin tocar la BD', async () => {
    const seg = await buildSegment(deps, 'پیارے بھائیو', 'ur-PK', 'es');
    expect(seg.kind).toBe('speech');
    expect(seg.translationSource).toBe('free');
    expect(seg.translation).toBe('[MT:es] پیارے بھائیو');
    expect(seg.verified).toBe(false);
    expect(mockFree).toHaveBeenCalled();
  });

  it('verso coránico: lo detecta sin IA y da Uthmani + traducción Tanzil (sin gastar MT)', async () => {
    mockFree.mockClear();
    const seg = await buildSegment(deps, 'الحمد لله رب العالمين', 'ar-SA', 'es');
    expect(seg.kind).toBe('quran');
    expect(seg.verified).toBe(true);
    expect(seg.reference).toBe('1:2');
    expect(seg.arabicVerified).toContain('ٱلْحَمْدُ'); // literal de la BD
    expect(seg.translationSource).toBe('tanzil');
    expect(seg.translation).toContain('Señor'); // traducción oficial de Cortés
    // No se llama a la MT cuando hay traducción oficial.
    expect(mockFree).not.toHaveBeenCalled();
  });

  it('verso en idioma sin Tanzil: árabe verificado + MT gratis marcada como no oficial', async () => {
    mockFree.mockClear();
    const seg = await buildSegment(deps, 'الحمد لله رب العالمين', 'ar-SA', 'ne');
    expect(seg.verified).toBe(true);
    expect(seg.arabicVerified).toContain('ٱلْحَمْدُ');
    expect(seg.translationSource).toBe('free'); // no oficial
    expect(seg.translation).toBe('[MT:ne] الحمد لله رب العالمين');
  });

  it('si la MT falla, muestra el original (no rompe la sala)', async () => {
    mockFree.mockRejectedValueOnce(new Error('sin red'));
    const seg = await buildSegment(deps, 'texto normal', 'ur-PK', 'es');
    expect(seg.translation).toBe('texto normal');
    expect(seg.verified).toBe(false);
  });
});
