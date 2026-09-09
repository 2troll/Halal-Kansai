/**
 * Traducción con Workers AI, el modelo que corre en la propia Cloudflare.
 *
 * Por qué hizo falta: MyMemory y el endpoint gratuito de Google limitan por
 * dirección IP. Desde un portátil funcionan; desde un Worker la IP de salida
 * la comparten miles de proyectos, así que la cuota está agotada siempre y
 * los dos devolvían vacío. El síntoma era el peor posible: la jutba escribía
 * bien lo que oía y no traducía nada, sin ningún error.
 *
 * Este camino no sale de la red de Cloudflare, así que no hay cuota ajena que
 * agotar. El plan gratuito trae una asignación diaria; si se acaba, se cae a
 * los proveedores de antes en vez de dejar al usuario sin nada.
 *
 * No toca las aleyas: el árabe del Corán sigue saliendo literal de Tanzil.
 */

/** Binding `AI` de Workers AI (solo existe en el Worker, no en Node). */
export interface AiBinding {
  run(
    model: string,
    input: { text: string; source_lang: string; target_lang: string },
  ): Promise<{ translated_text?: string }>;
}

/** Modelo multilingüe de traducción (100 idiomas, incluidos ar/ja/ur/id). */
const MODEL = '@cf/meta/m2m100-1.2b';

/** 'ar-SA' → 'ar'. El modelo quiere el código corto. */
function shortLang(locale: string): string {
  return locale.split('-')[0]!.toLowerCase();
}

/**
 * Traduce, o devuelve null para que el llamante pruebe el siguiente proveedor.
 * Nunca lanza: un fallo de traducción no puede tumbar la jutba entera.
 */
export async function aiTranslate(
  ai: AiBinding,
  text: string,
  sourceLocale: string,
  target: string,
): Promise<string | null> {
  const source = shortLang(sourceLocale);
  const tgt = shortLang(target);
  if (source === tgt) return text;

  try {
    const out = await ai.run(MODEL, {
      text,
      source_lang: source,
      target_lang: tgt,
    });
    const translated = out.translated_text?.trim();
    return translated ? translated : null;
  } catch {
    return null;
  }
}
