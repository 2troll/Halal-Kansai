import { ar } from './ar';
import { en } from './en';
import { es } from './es';

export type Lang = 'ar' | 'en' | 'es';
/** Mismas claves que el diccionario inglés; los valores son las traducciones. */
export type Dict = { [K in keyof typeof en]: string };

const DICTS: Record<Lang, Dict> = { ar, en, es };
const RTL_LANGS: ReadonlySet<Lang> = new Set(['ar']);
const STORAGE_KEY = 'hk-lang';

let current: Lang = loadLang();
const listeners = new Set<() => void>();

function loadLang(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'ar' || saved === 'en' || saved === 'es') return saved;
  const nav = navigator.language.slice(0, 2);
  if (nav === 'ar' || nav === 'es') return nav;
  return 'en';
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
