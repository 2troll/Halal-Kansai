import { ar } from './ar';
import { bn } from './bn';
import { en } from './en';
import { es } from './es';
import { id } from './id';
import { ja } from './ja';
import { ms } from './ms';
import { ne } from './ne';
import { tr } from './tr';
import { ur } from './ur';
import { vi } from './vi';
import { pickLang } from './detect';
import { zh } from './zh';
import { ko } from './ko';
import { fil } from './fil';
import { pt } from './pt';
import { th } from './th';
import { my } from './my';
import { si } from './si';
import { hi } from './hi';

/**
 * Idiomas de la interfaz. Además de los cuatro de partida, los de las
 * comunidades musulmanas más grandes en Japón (indonesio, urdu, bengalí,
 * malayo, turco) y dos de las poblaciones extranjeras más numerosas (nepalí,
 * vietnamita) y las comunidades inmigrantes grandes de Kansai: chino, coreano,
 * filipino, portugués de Brasil, tailandés, birmano, cingalés e hindi.
 */
export const LANGS = ['en', 'ja', 'ar', 'id', 'ur', 'bn', 'ms', 'tr', 'ne', 'vi', 'zh', 'ko', 'fil', 'pt', 'th', 'my', 'si', 'hi', 'es'] as const;
export type Lang = (typeof LANGS)[number];
/** Mismas claves que el diccionario inglés; los valores son las traducciones. */
export type Dict = { [K in keyof typeof en]: string };

const DICTS: Record<Lang, Dict> = { ar, bn, en, es, fil, hi, id, ja, ko, ms, my, ne, pt, si, th, tr, ur, vi, zh };
const RTL_LANGS: ReadonlySet<Lang> = new Set(['ar', 'ur']);
const STORAGE_KEY = 'hk-lang';

let current: Lang = loadLang();
const listeners = new Set<() => void>();

function loadLang(): Lang {
  const isLang = (v: string | null): v is Lang => (LANGS as readonly string[]).includes(v ?? '');
  const saved = localStorage.getItem(STORAGE_KEY);
  if (isLang(saved)) return saved;
  // El idioma del teléfono, si lo tenemos: un indonesio abre la app en indonesio.
  const phone = navigator.languages?.length ? navigator.languages : [navigator.language];
  return pickLang(phone, LANGS) as Lang;
}

export function getLang(): Lang {
  return current;
}

export function isRTL(lang: Lang = current): boolean {
  return RTL_LANGS.has(lang);
}

export function setLang(lang: Lang): void {
  current = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  applyDirection();
  listeners.forEach((fn) => fn());
}

export function onLangChange(fn: () => void): void {
  listeners.add(fn);
}

export function applyDirection(): void {
  document.documentElement.lang = current;
  document.documentElement.dir = isRTL() ? 'rtl' : 'ltr';
}

/** Traduce una clave; las claves faltantes caen al inglés. */
export function t(key: keyof Dict): string {
  return DICTS[current][key] ?? en[key] ?? String(key);
}
