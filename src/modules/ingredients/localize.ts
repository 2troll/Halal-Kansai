import type { Lang } from '../../i18n';
import type { Trilingual } from './rules';
import { RULES_JA } from './rules.ja';

/**
 * Texto de una regla en el idioma de la interfaz.
 *
 * El japonés vive en `rules.ja.ts` (fuera de la base de dictámenes) y cae al
 * inglés si falta la entrada, para que un idioma incompleto nunca deje una
 * ficha en blanco.
 */
export function ruleText(id: string, text: Trilingual, field: 'label' | 'why', lang: Lang): string {
  if (lang === 'ja') return RULES_JA[id]?.[field] ?? text.en;
  return text[lang];
}
