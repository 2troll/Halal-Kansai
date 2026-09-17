import type { Lang } from './index';

/** Etiqueta del botón: sigla, salvo el japonés, que se lee de un vistazo. */
/**
 * El idioma va en un selector compacto junto a los ajustes, no en una fila de
 * cuatro botones: esa fila hacía que la cabecera ocupara casi un cuarto de la
 * pantalla en todas las pestañas. En la lista, cada idioma en su propia
 * lengua, para que lo encuentre quien no lee la actual.
 */
export const LANG_LABEL: Record<Lang, string> = {
  en: 'English',
  ja: '日本語',
  ar: 'العربية',
  id: 'Bahasa Indonesia',
  ur: 'اردو',
  bn: 'বাংলা',
  ms: 'Bahasa Melayu',
  tr: 'Türkçe',
  ne: 'नेपाली',
  vi: 'Tiếng Việt',
  zh: '中文',
  ko: '한국어',
  fil: 'Filipino',
  pt: 'Português',
  th: 'ไทย',
  my: 'မြန်မာ',
  si: 'සිංහල',
  hi: 'हिन्दी',
  es: 'Español',
};
export const LANG_CODE: Record<Lang, string> = {
  en: 'EN',
  ja: '日本',
  ar: 'ع',
  id: 'ID',
  ur: 'اردو',
  bn: 'বাং',
  ms: 'MS',
  tr: 'TR',
  ne: 'ने',
  vi: 'VI',
  zh: '中文',
  ko: '한',
  fil: 'FIL',
  pt: 'PT',
  th: 'ไทย',
  my: 'မြန်',
  si: 'සිං',
  hi: 'हि',
  es: 'ES',
};
