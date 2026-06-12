/**
 * Construcción de un segmento traducido: clasifica/traduce con el LLM y,
 * si es cita coránica, la verifica contra la BD Tanzil. Compartido por
 * POST /api/translate y por el modo transmisor (RoomHub).
 */
import { analyzeSegment, type LlmConfig } from './llm.ts';
import { hasArabic } from './normalize.ts';
import { getMatcher, type QuranStore } from './store.ts';

/** Forma de respuesta que espera el frontend (src/modules/khutbah/translate.ts). */
export interface TranslatedSegment {
  kind: 'speech' | 'quran' | 'hadith' | 'dua';
  translation: string;
  original: string;
  arabicVerified?: string;
  reference?: string;
  verified: boolean;
  translationSource: 'tanzil' | 'llm';
}

export interface SegmentDeps {
  llm: LlmConfig;
  store: QuranStore;
}

/** Lanza si el LLM falla; el llamante decide la degradación. */
export async function buildSegment(
  deps: SegmentDeps,
  text: string,
  source: string,
  target: string,
): Promise<TranslatedSegment> {
  const analysis = await analyzeSegment(deps.llm, text, source, target);

  const segment: TranslatedSegment = {
    kind: analysis.kind,
    translation: analysis.translation,
    original: text,
    verified: false,
    translationSource: 'llm',
  };

  // Cita coránica: verificar contra la BD. El árabe mostrado sale SIEMPRE
  // de quran-uthmani.json; la traducción oficial de Tanzil si existe.
  if (analysis.kind === 'quran' && hasArabic(text)) {
    const matcher = await getMatcher(deps.store);
    const match = matcher.match(text, analysis.candidate ?? undefined);
    if (match) {
      const key = `${match.ref.sura}:${match.ref.ayah}`;
      segment.verified = true;
      segment.arabicVerified = match.uthmani;
      segment.reference = key;
      const translation = await deps.store.loadTranslation(target);
      const official = translation?.verses[key];
      if (official) {
        segment.translation = official;
        segment.translationSource = 'tanzil';
      }
    }
  }

  return segment;
}
