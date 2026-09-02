/**
 * Construcción de un segmento traducido. Dos caminos:
 *  - Con clave de Anthropic: el LLM clasifica (habla/corán/hadiz/dua),
 *    traduce y propone sura:aleya.
 *  - Sin clave (gratis): traducción con MyMemory/Google y, si el texto es
 *    árabe, verificación de versos por fuzzy match (sin IA).
 * En ambos, el árabe de una cita coránica sale SIEMPRE literal de Tanzil.
 * Compartido por POST /api/translate y por el modo transmisor (RoomHub).
 */
import { freeTranslate } from './free-translate.ts';
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
  translationSource: 'tanzil' | 'llm' | 'free';
}

export interface SegmentDeps {
  llm: LlmConfig;
  store: QuranStore;
}

/**
 * Verifica una posible cita coránica contra Tanzil y rellena el segmento.
 * El árabe mostrado sale SIEMPRE de quran-uthmani.json. Devuelve true si
 * casó (y por tanto la traducción oficial, si existe, ya está puesta).
 */
async function applyQuranMatch(
  deps: SegmentDeps,
  segment: TranslatedSegment,
  text: string,
  target: string,
  candidate?: { sura: number; ayah: number },
): Promise<boolean> {
  if (!hasArabic(text)) return false;
  const matcher = await getMatcher(deps.store);
  const match = matcher.match(text, candidate);
  if (!match) return false;

  const key = `${match.ref.sura}:${match.ref.ayah}`;
  segment.kind = 'quran';
  segment.verified = true;
  segment.arabicVerified = match.uthmani;
  segment.reference = key;
  const official = (await deps.store.loadTranslation(target))?.verses[key];
  if (official) {
    segment.translation = official;
    segment.translationSource = 'tanzil';
  }
  return true;
}

/** Camino gratis (sin clave de Anthropic): MT gratuita + verificación coránica. */
async function buildSegmentFree(
  deps: SegmentDeps,
  text: string,
  source: string,
  target: string,
): Promise<TranslatedSegment> {
  const segment: TranslatedSegment = {
    kind: 'speech',
    translation: text,
    original: text,
    verified: false,
    translationSource: 'free',
  };

  // Sin IA no sabemos si es cita; probamos a emparejar el árabe con un verso.
  // Si casa con confianza alta, mostramos el árabe y la traducción de Tanzil.
  const matched = await applyQuranMatch(deps, segment, text, target);

  // Si no es un verso con traducción oficial, traducimos con MT gratis.
  if (segment.translationSource !== 'tanzil') {
    try {
      segment.translation = await freeTranslate(text, source, target);
    } catch {
      // Sin red o proveedores caídos: mostrar el original (degradación suave).
      segment.translation = text;
    }
    // Si casó un verso pero sin traducción Tanzil, la MT es "no oficial".
    if (matched) segment.translationSource = 'free';
  }

  return segment;
}

/** Lanza si el LLM falla; el llamante decide la degradación. */
export async function buildSegment(
  deps: SegmentDeps,
  text: string,
  source: string,
  target: string,
): Promise<TranslatedSegment> {
  // Sin clave de Anthropic → traducción gratuita (mantiene versos verificados).
  if (!deps.llm.apiKey) {
    return buildSegmentFree(deps, text, source, target);
  }

  const analysis = await analyzeSegment(deps.llm, text, source, target);

  const segment: TranslatedSegment = {
    kind: analysis.kind,
    translation: analysis.translation,
    original: text,
    verified: false,
    translationSource: 'llm',
  };

  if (analysis.kind === 'quran') {
    await applyQuranMatch(deps, segment, text, target, analysis.candidate ?? undefined);
  }

  return segment;
}
