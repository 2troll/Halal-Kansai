/**
 * Traducción GRATIS sin clave de pago, para que la jutba traduzca sin
 * configurar Anthropic. Dos proveedores en cascada:
 *   1) MyMemory  — REST documentado, gratis (límite diario por IP; se amplía
 *      pasando un email en MYMEMORY_EMAIL).
 *   2) Google (endpoint no oficial gtx) — respaldo si MyMemory falla.
 *
 * Limitación frente al modo con IA: esto solo TRADUCE texto; no clasifica
 * citas (hadiz/dua) ni propone sura:aleya. La verificación de versos del
 * Corán se mantiene aparte (fuzzy match sobre el árabe), así que las aleyas
 * recitadas siguen saliendo literales de la base de datos Tanzil.
 */

/** 'ur-PK' → 'ur'. Los proveedores quieren código corto de idioma. */
function shortLang(locale: string): string {
  return locale.split('-')[0].toLowerCase();
}

async function viaMyMemory(text: string, source: string, target: string): Promise<string | null> {
  const params = new URLSearchParams({ q: text, langpair: `${source}|${target}` });
  const email = process.env.MYMEMORY_EMAIL;
  if (email) params.set('de', email); // sube el límite de 5k a 50k palabras/día
  const res = await fetch(`https://api.mymemory.translated.net/get?${params}`);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    responseStatus?: number;
    responseData?: { translatedText?: string };
  };
  const out = data.responseData?.translatedText;
  // MyMemory devuelve mayúsculas tipo "INVALID LANGUAGE PAIR" como "traducción".
  if (!out || /^[A-Z '".]+$/.test(out)) return null;
  return out;
}

async function viaGoogle(text: string, source: string, target: string): Promise<string | null> {
  const params = new URLSearchParams({ client: 'gtx', sl: source, tl: target, dt: 't', q: text });
  const res = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`);
  if (!res.ok) return null;
  // Respuesta: [[["traducido","original",...], ...], ...]
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
  const segments = data[0] as Array<[string, ...unknown[]]>;
  const joined = segments.map((s) => (Array.isArray(s) ? s[0] : '')).join('');
  return joined.trim() || null;
}

/**
 * Traduce `text` de `sourceLocale` a `target` (ISO corto). Lanza si todos
 * los proveedores fallan, para que el llamante degrade (mostrar el original).
 */
export async function freeTranslate(
  text: string,
  sourceLocale: string,
  target: string,
): Promise<string> {
  const source = shortLang(sourceLocale);
  const tgt = shortLang(target);
  if (source === tgt) return text;

  for (const provider of [viaMyMemory, viaGoogle]) {
    try {
      const out = await provider(text, source, tgt);
      if (out) return out;
    } catch {
      /* prueba el siguiente proveedor */
    }
  }
  throw new Error('free translation failed');
}
