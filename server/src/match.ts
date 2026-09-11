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
  /**
   * Si la cita venía embebida en el sermón, las palabras reconocidas como
   * recitación. Sirve para no atribuir a la aleya el sermón que la rodea.
   */
  quoted?: string;
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

/**
 * Índice precalculado en el build (tools/build-quran-data.mjs).
 *
 * Normalizar las 6.236 aleyas cuesta 20 ms de CPU y construir el índice de
 * palabras otros 10. En Cloudflare, donde cada petición tiene 10 ms de CPU,
 * eso es el 300 % del presupuesto antes de traducir una sola palabra. Hecho
 * en el build y leído ya hecho, el mismo trabajo cuesta 3 ms de JSON.parse.
 */
export interface QuranIndex {
  /** "sura:ayah" en el mismo orden que `norm`. */
  keys: string[];
  /** Texto normalizado de cada aleya. */
  norm: string[];
  /** Palabra normalizada → posiciones en `keys`. */
  words: Record<string, number[]>;
}

/** Longitud mínima de palabra para entrar en el índice: menos no discrimina. */
export const INDEX_WORD_MIN = 4;

/** Cuántas aleyas candidatas se comparan a fondo, como mucho. */
const MAX_CANDIDATES = 30;

/**
 * Palabras seguidas que hacen falta para dar por citada una aleya dentro de
 * una frase de sermón. Con tres, cualquier «الحمد لله رب» convertiría medio
 * sermón en Corán; atribuir al Libro lo que no está en él es peor que no
 * detectar la cita.
 */
const MIN_QUOTE_WORDS = 4;

/** Confianza exigida al tramo citado, más alta que la del texto completo. */
const EMBEDDED_THRESHOLD = 0.85;

/** Palabras de una frase que sirven para buscar (normalizada ya). */
export function indexableWords(normalized: string): string[] {
  return [...new Set(normalized.split(/\s+/).filter((w) => w.length >= INDEX_WORD_MIN))];
}

export class QuranMatcher {
  private verses: IndexedVerse[] = [];
  private byKey = new Map<string, IndexedVerse>();
  /** Palabra → aleyas donde aparece. Evita comparar contra las 6.236. */
  private wordIndex = new Map<string, number[]>();

  /**
   * @param uthmani mapa "sura:ayah" → texto Uthmani (quran-uthmani.json)
   * @param index índice precalculado; si falta se construye aquí (Node, tests)
   */
  constructor(uthmani: Record<string, string>, index?: QuranIndex) {
    const normByKey = index ? new Map(index.keys.map((k, i) => [k, index.norm[i]])) : null;

    for (const [key, text] of Object.entries(uthmani)) {
      const [sura, ayah] = key.split(':').map(Number);
      const verse: IndexedVerse = {
        ref: { sura, ayah },
        uthmani: text,
        normalized: normByKey?.get(key) ?? normalizeArabic(text),
      };
      this.verses.push(verse);
      this.byKey.set(key, verse);
    }

    if (index) {
      const pos = new Map(index.keys.map((k, i) => [k, i]));
      // El índice viene ordenado por `keys`; this.verses sigue el orden de
      // `uthmani`. Se traduce una vez, aquí, y no en cada búsqueda.
      const remap = this.verses.map((v) => pos.get(`${v.ref.sura}:${v.ref.ayah}`) ?? -1);
      const backwards = new Map<number, number>();
      remap.forEach((indexPos, versePos) => backwards.set(indexPos, versePos));
      for (const [word, positions] of Object.entries(index.words)) {
        this.wordIndex.set(
          word,
          positions.map((p) => backwards.get(p) ?? -1).filter((p) => p >= 0),
        );
      }
    } else {
      this.verses.forEach((verse, i) => {
        for (const word of indexableWords(verse.normalized)) {
          const list = this.wordIndex.get(word);
          if (list) list.push(i);
          else this.wordIndex.set(word, [i]);
        }
      });
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

    // Prefiltro por palabras compartidas.
    //
    // Antes esto era un escaneo completo: distancia de edición contra las
    // 6.236 aleyas, 170 ms de CPU por frase. El plan gratuito de Cloudflare
    // da 10 ms, así que el servidor devolvía 503 a media jutba y el móvil
    // enseñaba el árabe sin traducir. Una cita comparte necesariamente
    // palabras literales con su aleya, así que basta comparar a fondo las
    // que comparten alguna: de 6.236 a treinta, y de 170 ms a menos de uno.
    for (const idx of this.candidates(query)) {
      const verse = this.verses[idx];
      if (verse.normalized.length < query.length * 0.4) continue;
      consider(verse);
    }

    if (best === null) return null;
    const found = best as { verse: IndexedVerse; confidence: number };
    if (found.confidence >= CONFIDENCE_THRESHOLD) return this.toResult(found);

    // El fragmento entero no casa, pero puede llevar una cita dentro.
    const queryWords = query.split(/\s+/);
    let embedded: { verse: IndexedVerse; confidence: number; quoted: string } | null = null;
    for (const idx of this.candidates(query)) {
      const verse = this.verses[idx];
      const hit = this.embeddedMatch(queryWords, verse);
      if (hit && (!embedded || hit.confidence > embedded.confidence)) {
        embedded = { verse, ...hit };
      }
    }
    return embedded && embedded.confidence >= EMBEDDED_THRESHOLD
      ? this.toResult(embedded)
      : null;
  }

  /**
   * Aleyas que comparten palabras con el fragmento, las que más primero.
   *
   * Con dos palabras en común basta para mirar una aleya de cerca; con una
   * sola se mira igualmente si el fragmento es corto, que es cuando el
   * jatib recita media aleya y no hay más de donde agarrarse.
   */
  private candidates(query: string): number[] {
    const words = indexableWords(query);
    if (words.length === 0) return [];

    const hits = new Map<number, number>();
    for (const word of words) {
      for (const idx of this.wordIndex.get(word) ?? []) {
        hits.set(idx, (hits.get(idx) ?? 0) + 1);
      }
    }
    if (hits.size === 0) return [];

    const minHits = words.length >= 4 ? 2 : 1;
    const enough = [...hits].filter(([, count]) => count >= minHits);
    // Fragmento corto o con palabras raras: no descartamos por el mínimo.
    const pool = enough.length > 0 ? enough : [...hits];
    return pool
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_CANDIDATES)
      .map(([idx]) => idx);
  }

  private toResult(b: { verse: IndexedVerse; confidence: number; quoted?: string }): MatchResult {
    return {
      ref: b.verse.ref,
      confidence: Math.round(b.confidence * 1000) / 1000,
      uthmani: b.verse.uthmani,
      ...(b.quoted ? { quoted: b.quoted } : {}),
    };
  }

  /**
   * La cita que va DENTRO del sermón, que es como se cita de verdad.
   *
   * «Hermanos, vivimos tiempos de fitna, y dijo nuestro Señor: *Allah ordena
   * la justicia y la excelencia*, así que temed a Allah…». Comparar esa frase
   * entera con la aleya no funciona: sobra sermón por los dos lados y la
   * confianza se hunde por debajo de cualquier umbral útil, de modo que la
   * cita pasaba desapercibida y se traducía como habla corriente, sin texto
   * Uthmani y sin referencia. Medido: de cuatro formas de citar, esta era la
   * única que fallaba.
   *
   * Así que se busca el tramo de palabras seguidas del fragmento que están en
   * la aleya, y se puntúa SOLO ese tramo. Se tolera una palabra intrusa en
   * medio, porque el reconocimiento de voz mete alguna.
   */
  private embeddedMatch(
    queryWords: string[],
    verse: IndexedVerse,
  ): { confidence: number; quoted: string } | null {
    const verseWords = new Set(verse.normalized.split(/\s+/));

    let best: string[] = [];
    let run: string[] = [];
    let gaps = 0;
    for (const word of queryWords) {
      if (verseWords.has(word)) {
        run.push(word);
        continue;
      }
      // Una palabra que no es de la aleya: se perdona una vez por tramo.
      if (run.length > 0 && gaps === 0) {
        gaps = 1;
        run.push(word);
        continue;
      }
      if (run.length > best.length) best = run;
      run = [];
      gaps = 0;
    }
    if (run.length > best.length) best = run;

    // El tramo no puede acabar en la palabra intrusa que le perdonamos.
    while (best.length > 0 && !verseWords.has(best[best.length - 1])) best.pop();
    if (best.length < MIN_QUOTE_WORDS) return null;

    const quoted = best.join(' ');
    const dist = semiGlobalDistance(quoted, verse.normalized);
    return { confidence: 1 - dist / quoted.length, quoted };
  }
}
