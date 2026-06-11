/**
 * Cliente del backend de traducción (/api/translate, Fase 2).
 * La clave de Anthropic vive SOLO en el backend; el cliente nunca la ve.
 *
 * El backend clasifica cada fragmento (habla normal / cita) y, si es Corán,
 * lo verifica contra quran.json: el texto árabe devuelto procede SIEMPRE de
 * la base de datos Uthmani, jamás lo genera la IA (principio no negociable).
 */

export type SegmentKind = 'speech' | 'quran' | 'hadith' | 'dua';

export interface TranslatedSegment {
  kind: SegmentKind;
  /** Traducción al idioma del usuario. */
  translation: string;
  /** Texto original reconocido. */
  original: string;
  /** Solo citas coránicas verificadas: texto Uthmani literal de la BD. */
  arabicVerified?: string;
  /** Referencia "sura:aleya" si la cita fue verificada. */
  reference?: string;
  /** false → mostrar "cita no verificada". */
  verified: boolean;
  /** Origen de la traducción: oficial de Tanzil o generada por LLM. */
  translationSource?: 'tanzil' | 'llm';
}

const API_URL = '/api/translate';

export async function translateSegment(
  text: string,
  sourceLocale: string,
  targetLang: string,
): Promise<TranslatedSegment> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, source: sourceLocale, target: targetLang }),
  });
  if (!res.ok) throw new Error(`translate backend: HTTP ${res.status}`);
  return (await res.json()) as TranslatedSegment;
}
