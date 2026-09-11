/**
 * Cliente del backend de traducción (/api/translate, Fase 2).
 * La clave de Anthropic vive SOLO en el backend; el cliente nunca la ve.
 *
 * El backend clasifica cada fragmento (habla normal / cita) y, si es Corán,
 * lo verifica contra quran.json: el texto árabe devuelto procede SIEMPRE de
 * la base de datos Uthmani, jamás lo genera la IA (principio no negociable).
 */

import { apiUrl } from '../../backend';

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
  /** Origen de la traducción: oficial de Tanzil, LLM, o MT gratuita. */
  translationSource?: 'tanzil' | 'llm' | 'free';
}



/**
 * Un fallo suelto del servidor no puede costar una frase del sermón.
 *
 * El servidor devolvía 503 de forma intermitente (se pasaba del presupuesto
 * de CPU buscando citas coránicas) y cada 503 se veía en el móvil como una
 * frase en árabe sin traducir. La causa está corregida en el servidor; esto
 * queda como red: un reintento corto salva el fallo pasajero —una antena
 * mala en la mezquita también los provoca— sin retrasar el sermón.
 */
const RETRY_MS = 400;

/** Errores que merece la pena reintentar: el servidor puede estar ocupado. */
function worthRetrying(status: number): boolean {
  return status === 429 || status >= 500;
}

async function postSegment(
  text: string,
  sourceLocale: string,
  targetLang: string,
): Promise<Response> {
  return fetch(apiUrl('/api/translate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, source: sourceLocale, target: targetLang }),
  });
}

/**
 * Pide la versión buena de una traducción ya mostrada.
 *
 * Devuelve null si no hay nada mejor que ofrecer, si tarda demasiado o si el
 * servidor no puede: la pantalla se queda entonces con lo que ya tenía, que
 * es correcto aunque sea más plano. Esto nunca debe estropear un subtítulo
 * que ya se está leyendo.
 */
export async function refineTranslation(
  text: string,
  sourceLocale: string,
  targetLang: string,
): Promise<string | null> {
  try {
    const res = await fetch(apiUrl('/api/refine'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source: sourceLocale, target: targetLang }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { translation?: string };
    return body.translation?.trim() || null;
  } catch {
    return null;
  }
}

export async function translateSegment(
  text: string,
  sourceLocale: string,
  targetLang: string,
): Promise<TranslatedSegment> {
  let res: Response;
  try {
    res = await postSegment(text, sourceLocale, targetLang);
  } catch (err) {
    // Sin red: un reintento por si fue el cambio de celda al entrar en la sala.
    await new Promise((r) => setTimeout(r, RETRY_MS));
    res = await postSegment(text, sourceLocale, targetLang).catch(() => {
      throw err;
    });
  }

  if (!res.ok && worthRetrying(res.status)) {
    await new Promise((r) => setTimeout(r, RETRY_MS));
    res = await postSegment(text, sourceLocale, targetLang);
  }
  if (!res.ok) throw new Error(`translate backend: HTTP ${res.status}`);
  return (await res.json()) as TranslatedSegment;
}
