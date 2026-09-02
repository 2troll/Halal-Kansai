/**
 * Normalización de texto árabe para fuzzy matching coránico.
 * Objetivo: que el texto reconocido por voz (sin diacríticos, con variantes
 * ortográficas) sea comparable con el texto Uthmani (con tashkeel completo).
 *
 * Rangos en escapes \u para que sean inequívocos:
 *   U+064B–U+065F  tashkeel (fathatan…sukun y signos adicionales)
 *   U+0670         alef superíndice (se convierte en alef, no se borra)
 *   U+06D6–U+06ED  marcas coránicas de pausa/sajda/pequeñas letras altas
 *   U+0610–U+061A  signos honoríficos/koránicos
 *   U+0640         tatweel
 */

const SUPERSCRIPT_ALEF = /ٰ/g;
const DIACRITICS = /[ً-ٟۖ-ۭؐ-ؚ]/g;
const TATWEEL = /ـ/g;

export function normalizeArabic(text: string): string {
  return (
    text
      // alef superíndice: en el rasm Uthmani sustituye a la alef de palabras
      // como عٰلمين; la ortografía moderna (y el speech-to-text) la escribe.
      .replace(SUPERSCRIPT_ALEF, 'ا')
      .replace(DIACRITICS, '')
      .replace(TATWEEL, '')
      // variantes de alef (madda, hamza arriba/abajo, wasla) → ا
      .replace(/[آأإٱ]/g, 'ا')
      // ta marbuta → ha
      .replace(/ة/g, 'ه')
      // alef maqsura → ya
      .replace(/ى/g, 'ي')
      // hamza sobre waw/ya → waw/ya
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      // todo lo que no sea letra árabe (U+0621–U+064A) o espacio, fuera
      .replace(/[^ء-ي\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/** ¿Contiene suficiente árabe como para intentar un match coránico? */
export function hasArabic(text: string): boolean {
  const arabicChars = (text.match(/[ء-ي]/g) ?? []).length;
  return arabicChars >= 8;
}
