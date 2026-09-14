/**
 * Proveedor Ollama (traducción local, gratis y sin cuota).
 *
 * Dos cosas que cubrir:
 *  1. cleanUp: limpia lo que el modelo local envuelve (comillas, «Translation:»,
 *     bloques <think>), la puerta por la que pasa todo antes de la pantalla.
 *  2. buildSegment con `ollama` configurado: usa Ollama como motor prioritario
 *     y, si Ollama no responde, se cae al camino de siempre sin romperse.
 *
 * Se simula `ollamaTranslate` para no pegar a ningún Ollama real en los tests,
 * pero se conserva el `cleanUp` real vía importOriginal.
 */
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuranStore, TranslationFile } from '../server/src/store.ts';

// Mock de ollamaTranslate manteniendo el resto del módulo (cleanUp) real.
vi.mock('../server/src/ollama-translate.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../server/src/ollama-translate.ts')>();
  return { ...actual, ollamaTranslate: vi.fn() };
});
// Fallback gratuito simulado, para el caso en que Ollama no da nada.
vi.mock('../server/src/free-translate.ts', () => ({
  freeTranslate: vi.fn(async (text: string, _s: string, target: string) => `[MT:${target}] ${text}`),
}));

import { ollamaTranslate, __testing } from '../server/src/ollama-translate.ts';
import { buildSegment } from '../server/src/segment.ts';

const mockOllama = vi.mocked(ollamaTranslate);

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

// Con ollama configurado, buildSegment usa el camino Ollama.
const deps = {
  llm: { apiKey: '' },
  store: realStore(),
  ollama: { baseUrl: 'http://127.0.0.1:11434' },
};

describe('cleanUp — limpieza de la respuesta del modelo local', () => {
  it('quita el prefijo «Translation:» y las comillas', () => {
    expect(__testing.cleanUp('Translation: "Hola a todos"')).toBe('Hola a todos');
  });

  it('quita bloques <think>…</think> de modelos con razonamiento', () => {
    expect(__testing.cleanUp('<think>debo traducir</think>Que la paz sea con vosotros')).toBe(
      'Que la paz sea con vosotros',
    );
  });

  it('devuelve null si queda vacío o es degenerado', () => {
    expect(__testing.cleanUp('   ')).toBeNull();
    expect(__testing.cleanUp(undefined)).toBeNull();
  });
});

describe('buildSegment — camino Ollama (local, gratis)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('habla normal: traduce con Ollama, marca la fuente como LLM', async () => {
    mockOllama.mockResolvedValueOnce('Queridos hermanos');
    const seg = await buildSegment(deps, 'پیارے بھائیو', 'ur-PK', 'es');
    expect(mockOllama).toHaveBeenCalledOnce();
    expect(seg.kind).toBe('speech');
    expect(seg.translation).toBe('Queridos hermanos');
    expect(seg.translationSource).toBe('llm');
  });

  it('si Ollama no responde, se cae al camino gratuito sin romperse', async () => {
    mockOllama.mockResolvedValueOnce(null);
    const seg = await buildSegment(deps, 'پیارے بھائیو', 'ur-PK', 'es');
    expect(mockOllama).toHaveBeenCalledOnce();
    // Cae a MyMemory/Google (simulado): la jutba nunca se queda sin traducir.
    expect(seg.translation).toBe('[MT:es] پیارے بھائیو');
    expect(seg.translationSource).toBe('free');
  });
});
