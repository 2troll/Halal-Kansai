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
import { aiTranslate, chatTranslate, type AiBinding } from './ai-translate.ts';
import { glossaryHints, hasTerms, protectTerms, restoreTerms } from './glossary.ts';
import { usableTranslation } from './quality.ts';
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
  /** Workers AI: solo existe desplegado en Cloudflare, no en Node. */
  ai?: AiBinding;
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

/**
 * Cuánto se espera al modelo bueno antes de conformarse con el rápido.
 *
 * Dos segundos y medio para quien escucha por su cuenta: por encima de eso la
 * traducción llega tan tarde que el imán ya va por otra frase.
 */
const CHAT_DEADLINE_MS = 2500;

/**
 * En una sala hay más margen, y hace falta.
 *
 * La sala traduce a todos los idiomas presentes a la vez. Con cinco idiomas
 * son cinco llamadas compitiendo, cada una tarda más, y con el plazo corto el
 * modelo bueno perdía la carrera una y otra vez: a la mezquita con más países
 * —justo la que más lo necesita— le tocaba sistemáticamente la traducción
 * peor. Medido con la prueba de humo: fallaba de forma repetida con tres
 * idiomas.
 *
 * Segundo y medio más. Se está leyendo un subtítulo, no conversando.
 */
export const ROOM_DEADLINE_MS = 4000;

/** Devuelve el valor si llega a tiempo, o null si se pasa del plazo. */
function withDeadline<T>(promise: Promise<T | null>, ms: number): Promise<T | null> {
  return Promise.race([
    promise.catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/** Camino gratis (sin clave de Anthropic): MT gratuita + verificación coránica. */
async function buildSegmentFree(
  deps: SegmentDeps,
  text: string,
  source: string,
  target: string,
  deadlineMs: number = CHAT_DEADLINE_MS,
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
    // CARRERA entre dos motores, no cascada.
    //
    // El modelo de lenguaje traduce mucho mejor —«sabed que la oración es el
    // pilar de la religión» frente a «la oración es religiosa»— pero su
    // latencia es irregular: medido, entre 1,2 y 7,9 segundos. En una jutba,
    // ocho segundos es como no traducir.
    //
    // Así que se lanzan los dos a la vez y gana la calidad SI llega a tiempo.
    // El traductor pequeño casi siempre ya ha terminado, así que el respaldo
    // no cuesta espera. Latencia acotada siempre, calidad casi siempre.
    const guarded = hasTerms(text) ? protectTerms(text) : { text, used: [] };
    const restore = (out: string): string =>
      guarded.used.length > 0 ? restoreTerms(out, guarded.used, target) : out;

    const chat = deps.ai
      ? chatTranslate(deps.ai, text, source, target, glossaryHints(text, target))
      : Promise.resolve(null);
    const mt = deps.ai
      ? aiTranslate(deps.ai, guarded.text, source, target)
      : Promise.resolve(null);

    // Que nadie se queje de una promesa sin gestionar si perdemos la carrera.
    chat.catch(() => null);
    mt.catch(() => null);

    const viaChat = await withDeadline(chat, deadlineMs);

    if (viaChat) {
      segment.translation = viaChat;
      segment.translationSource = 'llm';
    } else {
      // El respaldo también se revisa: el fallo real fue comprobar solo el
      // motor grande y caer a uno que devolvía la misma basura sin mirarla.
      const viaMt = usableTranslation(await mt.catch(() => null));
      if (viaMt) {
        segment.translation = restore(viaMt);
      } else {
        let libre: string | null;
        try {
          libre = usableTranslation(await freeTranslate(guarded.text, source, target));
        } catch {
          libre = null;
        }
        // Sin nada utilizable: el original. Que se vea el árabe es honesto;
        // que se vea una frase repetida ochenta veces, no.
        segment.translation = libre ? restore(libre) : text;
      }
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
  deadlineMs: number = CHAT_DEADLINE_MS,
): Promise<TranslatedSegment> {
  // Sin clave de Anthropic → traducción gratuita (mantiene versos verificados).
  if (!deps.llm.apiKey) {
    return buildSegmentFree(deps, text, source, target, deadlineMs);
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
