/**
 * Fuzzy matching de citas coránicas contra la base de datos Tanzil.
 *
 * Principio no negociable: el texto árabe que se devuelve al usuario sale
 * SIEMPRE literal de quran-uthmani.json. Este módulo solo decide QUÉ aleya
 * es (y con cuánta confianza), nunca genera texto.
 */
import { normalizeArabic } from './normalize.ts';

export interface VerseRef {
  sura: number;
  ayah: number;
}

export interface MatchResult {
  ref: VerseRef;
  /** 0–1; proporción del fragmento que casa con la aleya. */
  confidence: number;
  /** Texto Uthmani literal de la base de datos. */
  uthmani: string;
}

/** Confianza mínima para marcar una cita como verificada. */
export const CONFIDENCE_THRESHOLD = 0.78;

/**
 * Distancia de edición semi-global: coste de encontrar `pattern` como
 * subcadena aproximada de `text` (inserciones/borrados al inicio y final
 * de `text` son gratis). Ideal cuando el jatib recita un fragmento de aleya.
 */
export function semiGlobalDistance(pattern: string, text: string): number {
  const m = pattern.length;
  const n = text.length;
  if (m === 0) return 0;
  if (n === 0) return m;

  let prev = new Array<number>(n + 1).fill(0); // borrar prefijo de text: gratis
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const pc = pattern.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = pc === text.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  // sufijo de text sobrante: gratis → mínimo de la última fila
  let best = prev[0];
  for (let j = 1; j <= n; j++) if (prev[j] < best) best = prev[j];
  return best;
}

interface IndexedVerse {
  ref: VerseRef;
  uthmani: string;
  normalized: string;
}

export class QuranMatcher {
  private verses: IndexedVerse[] = [];
  private byKey = new Map<string, IndexedVerse>();

  /** @param uthmani mapa "sura:ayah" → texto Uthmani (quran-uthmani.json) */
  constructor(uthmani: Record<string, string>) {
    for (const [key, text] of Object.entries(uthmani)) {
      const [sura, ayah] = key.split(':').map(Number);
      const verse: IndexedVerse = {
        ref: { sura, ayah },
        uthmani: text,
        normalized: normalizeArabic(text),
      };
      this.verses.push(verse);
      this.byKey.set(key, verse);
    }
  }

  getVerse(ref: VerseRef): string | undefined {
    return this.byKey.get(`${ref.sura}:${ref.ayah}`)?.uthmani;
  }

  private score(query: string, verse: IndexedVerse): number {
    if (query.length === 0) return 0;
    // El fragmento recitado puede abarcar la aleya entera o parte de ella;
    // si la consulta es más larga que la aleya, invertimos los papeles.
    const [pattern, text] =
      query.length <= verse.normalized.length
        ? [query, verse.normalized]
        : [verse.normalized, query];
    const dist = semiGlobalDistance(pattern, text);
    return 1 - dist / pattern.length;
  }

  /**
   * Busca la aleya que mejor casa con un fragmento reconocido por voz.
   * @param rawText texto árabe tal como llegó del speech-to-text
   * @param candidate referencia propuesta por el LLM (se prueba primero,
   *        con sus aleyas vecinas; si no supera el umbral, escaneo completo)
   */
  match(rawText: string, candidate?: VerseRef): MatchResult | null {
    const query = normalizeArabic(rawText);
    if (query.length < 10) return null;

    let best: { verse: IndexedVerse; confidence: number } | null = null;

    const consider = (verse: IndexedVerse | undefined) => {
      if (!verse) return;
      const confidence = this.score(query, verse);
      if (!best || confidence > best.confidence) best = { verse, confidence };
    };

    if (candidate) {
      for (let delta = -2; delta <= 2; delta++) {
        consider(this.byKey.get(`${candidate.sura}:${candidate.ayah + delta}`));
      }
      if (best !== null && (best as { confidence: number }).confidence >= CONFIDENCE_THRESHOLD) {
        return this.toResult(best);
      }
    }

    // Escaneo completo con prefiltro por longitud: una aleya mucho más corta
    // que el fragmento no puede contenerlo.
    for (const verse of this.verses) {
      if (verse.normalized.length < query.length * 0.4) continue;
      consider(verse);
    }

    if (best === null) return null;
    const found = best as { verse: IndexedVerse; confidence: number };
    return found.confidence >= CONFIDENCE_THRESHOLD ? this.toResult(found) : null;
  }

  private toResult(b: { verse: IndexedVerse; confidence: number }): MatchResult {
    return {
      ref: b.verse.ref,
      confidence: Math.round(b.confidence * 1000) / 1000,
      uthmani: b.verse.uthmani,
    };
  }
}
