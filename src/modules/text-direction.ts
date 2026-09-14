/**
 * Dirección de escritura del TEXTO, no la de la app.
 *
 * `document.documentElement.dir` se pone según el idioma de la interfaz, y eso
 * está bien para los botones. Pero el sermón es otra cosa: la app puede estar
 * en español —y por tanto el documento en `ltr`— mientras la jutba se traduce
 * al urdu, o mientras se enseña el árabe original debajo de cada frase. Sin
 * marcar la dirección en ESE trozo concreto, el árabe y el urdu salían de
 * izquierda a derecha: la puntuación al lado que no es y la línea ilegible.
 *
 * Marcar `lang` además de `dir` no es adorno: es lo que permite al lector de
 * pantalla y a la voz del sistema elegir el idioma correcto, en vez de leer
 * árabe con voz española.
 *
 * Solo se listan las escrituras de derecha a izquierda que la app ofrece de
 * verdad (ver SOURCE_LOCALES y TARGET_LANGS): árabe, urdu y persa.
 */
const RTL = new Set(['ar', 'ur', 'fa']);

/** 'ar-SA' → 'ar'. Tolera vacío, mayúsculas y guion bajo. */
export function baseLang(locale: string): string {
  return (locale ?? '').trim().toLowerCase().split(/[-_]/)[0] ?? '';
}

/** ¿Este idioma se escribe de derecha a izquierda? */
export function isRtlLang(locale: string): boolean {
  return RTL.has(baseLang(locale));
}

/** 'rtl' o 'ltr', para el atributo `dir`. */
export function dirFor(locale: string): 'rtl' | 'ltr' {
  return isRtlLang(locale) ? 'rtl' : 'ltr';
}

/**
 * Los atributos listos para meter en una plantilla HTML.
 *
 * Devuelve cadena vacía si no hay idioma, para no ensuciar el marcado con
 * `lang=""`, que además confunde a los lectores de pantalla.
 */
export function langAttrs(locale: string): string {
  const lang = baseLang(locale);
  if (!lang) return '';
  return ` lang="${lang}" dir="${dirFor(lang)}"`;
}
