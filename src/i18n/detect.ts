/**
 * Idioma inicial a partir de los idiomas del teléfono.
 *
 * Se recorre la lista entera (`navigator.languages`), no solo el primero:
 * alguien con el móvil en japonés y el filipino de segundo idioma entiende
 * mejor la app en filipino que en inglés... pero si el primero ya está
 * soportado, manda el primero.
 *
 * Los códigos del sistema no siempre coinciden con los nuestros: Android
 * todavía da «tl» para filipino e «in» para indonesio, y el chino llega como
 * zh-CN, zh-Hans-JP o zh-TW.
 */
const ALIASES: Record<string, string> = {
  tl: 'fil',
  in: 'id',
  // Variantes regionales que la app sirve con la misma traducción.
  'pt-br': 'pt',
  'pt-pt': 'pt',
};

export function pickLang(phoneLangs: readonly string[], supported: readonly string[], fallback = 'en'): string {
  const ok = new Set(supported);
  for (const raw of phoneLangs) {
    const full = raw.toLowerCase();
    const base = full.split(/[-_]/)[0]!;
    for (const code of [ALIASES[full], full, ALIASES[base], base]) {
      if (code && ok.has(code)) return code;
    }
  }
  return fallback;
}
