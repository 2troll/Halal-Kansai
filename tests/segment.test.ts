/**
 * Flujo completo de un segmento de jutba con el LLM simulado:
 * comprueba que la promesa central se cumple — el árabe mostrado sale
 * SIEMPRE literal de la BD Tanzil y la traducción oficial cuando existe,
 * aunque el LLM se equivoque o el texto llegue destrozado del speech-to-text.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { LlmAnalysis } from '../server/src/llm.ts';
import type { QuranStore, TranslationFile } from '../server/src/store.ts';

// Simulamos solo la llamada a Anthropic; todo lo demás es real.
vi.mock('../server/src/llm.ts', () => ({
  analyzeSegment: vi.fn(),
}));

import { analyzeSegment } from '../server/src/llm.ts';
import { buildSegment } from '../server/src/segment.ts';

const mockLlm = vi.mocked(analyzeSegment);

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

const deps = { llm: { apiKey: 'fake' }, store: realStore() };

const llmSays = (analysis: LlmAnalysis) => mockLlm.mockResolvedValueOnce(analysis);

describe('buildSegment (flujo jutba completo, LLM simulado)', () => {
  beforeAll(() => {
    vi.clearAllMocks();
  });

  it('cita coránica bien identificada → Uthmani literal + traducción Tanzil', async () => {
    // El speech-to-text entrega la basmala sin diacríticos; el LLM acierta 1:1.
    llmSays({ kind: 'quran', translation: 'versión del LLM (no debe usarse)', candidate: { sura: 1, ayah: 1 } });
    const seg = await buildSegment(deps, 'بسم الله الرحمن الرحيم', 'ar-SA', 'es');

    expect(seg.kind).toBe('quran');
    expect(seg.verified).toBe(true);
    expect(seg.reference).toBe('1:1');
    // Árabe literal de la BD (con tashkeel), no el texto reconocido ni el del LLM.
    expect(seg.arabicVerified).toContain('بِسْمِ');
    // Traducción oficial de Cortés, no la del LLM.
    expect(seg.translationSource).toBe('tanzil');
    expect(seg.translation).toContain('Compasivo');
  });

  it('el LLM se equivoca de aleya por una → la BD lo corrige', async () => {
    llmSays({ kind: 'quran', translation: 'x', candidate: { sura: 112, ayah: 2 } });
    const seg = await buildSegment(deps, 'قل هو الله احد', 'ur-PK', 'es');
    expect(seg.verified).toBe(true);
    expect(seg.reference).toBe('112:1');
  });

  it('idioma sin traducción Tanzil → verso verificado + traducción LLM marcada', async () => {
    llmSays({ kind: 'quran', translation: 'नेपाली अनुवाद', candidate: { sura: 1, ayah: 1 } });
    const seg = await buildSegment(deps, 'بسم الله الرحمن الرحيم', 'ar-SA', 'ne');
    expect(seg.verified).toBe(true);
    expect(seg.arabicVerified).toContain('بِسْمِ'); // el árabe sigue siendo de la BD
    expect(seg.translationSource).toBe('llm'); // la traducción no, y queda marcado
    expect(seg.translation).toBe('नेपाली अनुवाद');
  });

  it('el LLM dice "quran" pero el texto no casa con ninguna aleya → no verificada', async () => {
    llmSays({ kind: 'quran', translation: 'algo', candidate: { sura: 2, ayah: 255 } });
    const seg = await buildSegment(deps, 'اليوم سوف نتحدث عن اهمية الصدق في التجارة', 'ar-SA', 'es');
    expect(seg.verified).toBe(false);
    expect(seg.arabicVerified).toBeUndefined(); // jamás mostramos árabe sin verificar
  });

  it('el LLM dice "quran" sin candidato → escaneo completo lo encuentra igualmente', async () => {
    llmSays({ kind: 'quran', translation: 'x', candidate: null });
    const seg = await buildSegment(deps, 'الحمد لله رب العالمين', 'ur-PK', 'es');
    expect(seg.verified).toBe(true);
    expect(seg.reference).toBe('1:2');
  });

  it('habla normal → traducción del LLM tal cual, sin tocar la BD', async () => {
    llmSays({ kind: 'speech', translation: 'Queridos hermanos…', candidate: null });
    const seg = await buildSegment(deps, 'پیارے بھائیو', 'ur-PK', 'es');
    expect(seg.kind).toBe('speech');
    expect(seg.translation).toBe('Queridos hermanos…');
    expect(seg.verified).toBe(false);
    expect(seg.arabicVerified).toBeUndefined();
  });

  it('hadiz y dua pasan con su etiqueta, nunca verificados contra el Corán', async () => {
    llmSays({ kind: 'hadith', translation: 'Dijo el Profeta ﷺ…', candidate: null });
    const hadith = await buildSegment(deps, 'قال رسول الله صلى الله عليه وسلم', 'ar-SA', 'es');
    expect(hadith.kind).toBe('hadith');
    expect(hadith.verified).toBe(false);

    llmSays({ kind: 'dua', translation: 'Oh Alá, perdónanos', candidate: null });
    const dua = await buildSegment(deps, 'اللهم اغفر لنا', 'ar-SA', 'es');
    expect(dua.kind).toBe('dua');
  });

  it('si el LLM falla, buildSegment lanza (el llamante decide la degradación)', async () => {
    mockLlm.mockRejectedValueOnce(new Error('429'));
    await expect(buildSegment(deps, 'texto', 'ur-PK', 'es')).rejects.toThrow();
  });
});
