/**
 * Los `reason_codes` del feed de konbini, en los cuatro idiomas de la app.
 *
 * El contrato de datos (§3) obliga a que el productor emita **códigos, nunca
 * prosa**: si el JSON llevara frases, el producto quedaría cerrado a la gente
 * que de verdad lo usa. Traducirlos es trabajo del consumidor, y esto es ese
 * trabajo.
 *
 * Dos decisiones que conviene no deshacer sin pensarlo:
 *
 * 1. **El texto se reutiliza de `rules.ts` siempre que existe la regla.** El
 *    lector de etiquetas ya explica 酒精 o 乳化剤 en ar/en/es/ja, revisado y
 *    con las dos posturas donde los sabios difieren. Repetirlo aquí sería
 *    crear una segunda voz que se desincroniza a la primera corrección.
 * 2. **El veredicto del producto no se calcula aquí.** Quién es `prohibited` y
 *    quién `ambiguous` vive en el `policy.json` del productor (contrato §4) y
 *    llega ya resuelto en el `status` del producto; esta app no lo recalcula ni
 *    lo discute. Lo que sí dice `reasonStatus()` es cómo lee la app ese término
 *    *aislado*, con el mismo dictamen que ya enseña en el lector de etiquetas:
 *    es información que la app ya daba, no un juicio nuevo.
 *
 * Un código desconocido (feed más nuevo que la app) no rompe nada: se muestra
 * el código tal cual y se dice que esta versión no sabe leerlo.
 */

import type { Lang } from '../../i18n';
import { RULES, type Status, type Trilingual } from './rules';
import { ruleText } from './localize';

/** Enum del esquema v1 (`products.schema.json`, `$defs/reasonCode`). */
export const REASON_CODES = [
  'PORK_MEAT',
  'PORK_EXTRACT',
  'LARD',
  'PORK_GELATIN',
  'BACON_HAM_SAUSAGE',
  'WINE',
  'BEER',
  'SPIRITS',
  'SAKE',
  'GELATIN_UNSPECIFIED',
  'ANIMAL_FAT_UNSPECIFIED',
  'SHORTENING',
  'EMULSIFIER_UNSPECIFIED',
  'MEAT_EXTRACT_UNSPECIFIED',
  'CHICKEN_EXTRACT',
  'BEEF_EXTRACT',
  'ALCOHOL_ADDITIVE',
  'MIRIN_HON',
  'MIRIN_STYLE',
  'BREWED_SEASONING',
  'BREWED_VINEGAR',
  'FLAVORING_UNSPECIFIED',
  'GLYCERIN',
  'CYSTEINE',
  'RENNET_WHEY',
  'COLLAGEN',
  'COCHINEAL',
  'ENZYME_UNSPECIFIED',
  'BOUILLON',
] as const;

export type ReasonCode = (typeof REASON_CODES)[number];

/** Los cuatro idiomas de la interfaz. `Trilingual` (ar/en/es) más el japonés. */
type Quad = Trilingual & { ja: string };

interface CodeText {
  /** Nombre del término, tal y como se lee en la ficha. */
  label: Quad;
  /** Regla de `rules.ts` de la que se toma la explicación. */
  rule?: string;
  /** Explicación propia, solo cuando ninguna regla cubre el código. */
  why?: Quad;
}

const CODES: Readonly<Record<ReasonCode, CodeText>> = {
  // ──────────────────────────────────────────── prohibidos explícitos ──
  PORK_MEAT: {
    label: { ar: 'لحم الخنزير', en: 'Pork', es: 'Carne de cerdo', ja: '豚肉' },
    rule: 'pork-meat',
  },
  PORK_EXTRACT: {
    label: { ar: 'خلاصة لحم الخنزير', en: 'Pork extract', es: 'Extracto de cerdo', ja: 'ポークエキス' },
    rule: 'pork-extract',
  },
  LARD: {
    label: { ar: 'شحم الخنزير', en: 'Lard (pork fat)', es: 'Manteca de cerdo', ja: 'ラード（豚脂）' },
    rule: 'pork-fat',
  },
  PORK_GELATIN: {
    label: { ar: 'جيلاتين من الخنزير', en: 'Pork gelatin', es: 'Gelatina de cerdo', ja: '豚由来ゼラチン' },
    rule: 'pork-derived',
  },
  BACON_HAM_SAUSAGE: {
    label: {
      ar: 'لحم مقدَّد ونقانق',
      en: 'Bacon, ham, sausage',
      es: 'Beicon, jamón, salchicha',
      ja: 'ベーコン・ハム・ソーセージ',
    },
    rule: 'ham',
  },
  WINE: {
    label: { ar: 'نبيذ', en: 'Wine', es: 'Vino', ja: 'ワイン' },
    rule: 'spirits',
  },
  BEER: {
    label: { ar: 'جعة', en: 'Beer', es: 'Cerveza', ja: 'ビール・発泡酒' },
    rule: 'spirits',
  },
  SPIRITS: {
    label: {
      ar: 'مشروبات روحية وليكيور',
      en: 'Spirits and liqueurs',
      es: 'Licores y destilados',
      ja: '洋酒・リキュール',
    },
    rule: 'spirits',
  },
  SAKE: {
    label: { ar: 'ساكي (خمر الأرز)', en: 'Sake', es: 'Sake', ja: '日本酒・清酒' },
    rule: 'cooking-sake',
  },

  // ─────────────────────────────────────── requieren fuente externa ──
  GELATIN_UNSPECIFIED: {
    label: {
      ar: 'جيلاتين غير محدَّد المصدر',
      en: 'Gelatin, source not stated',
      es: 'Gelatina sin especificar',
      ja: 'ゼラチン（由来不明）',
    },
    rule: 'gelatin',
  },
  ANIMAL_FAT_UNSPECIFIED: {
    label: {
      ar: 'دهن حيواني غير محدَّد',
      en: 'Animal fat, source not stated',
      es: 'Grasa animal sin especificar',
      ja: '動物性油脂（由来不明）',
    },
    rule: 'animal-fat',
  },
  SHORTENING: {
    label: { ar: 'دهن مُقصِّر (شورتنينغ)', en: 'Shortening', es: 'Grasa de repostería', ja: 'ショートニング' },
    rule: 'shortening',
  },
  EMULSIFIER_UNSPECIFIED: {
    label: {
      ar: 'مستحلِب غير محدَّد المصدر',
      en: 'Emulsifier, source not stated',
      es: 'Emulgente sin especificar',
      ja: '乳化剤（由来不明）',
    },
    rule: 'emulsifier',
  },
  MEAT_EXTRACT_UNSPECIFIED: {
    label: {
      ar: 'خلاصة لحم دون ذكر النوع',
      en: 'Meat extract, species not stated',
      es: 'Extracto de carne sin especificar',
      ja: '肉エキス（種類不明）',
    },
    rule: 'meat-extract',
  },
  CHICKEN_EXTRACT: {
    label: { ar: 'خلاصة دجاج', en: 'Chicken extract', es: 'Extracto de pollo', ja: 'チキンエキス' },
    rule: 'meat-extract',
  },
  BEEF_EXTRACT: {
    label: { ar: 'خلاصة لحم بقر', en: 'Beef extract', es: 'Extracto de vacuno', ja: 'ビーフエキス' },
    rule: 'meat-extract',
  },
  ALCOHOL_ADDITIVE: {
    label: {
      ar: 'كحول مضاف (شوسِي)',
      en: 'Added ethanol (shusei)',
      es: 'Alcohol añadido (shusei)',
      ja: '酒精（アルコール）',
    },
    rule: 'shusei',
  },
  MIRIN_HON: {
    label: { ar: 'ميرين أصلي', en: 'Hon-mirin', es: 'Mirin auténtico', ja: '本みりん' },
    rule: 'mirin',
  },
  MIRIN_STYLE: {
    label: {
      ar: 'بديل الميرين',
      en: 'Mirin-style seasoning',
      es: 'Condimento tipo mirin',
      ja: 'みりん風調味料',
    },
    rule: 'mirin-style',
  },
  BREWED_SEASONING: {
    label: {
      ar: 'توابل مخمَّرة',
      en: 'Brewed seasoning',
      es: 'Condimento fermentado',
      ja: '醸造調味料',
    },
    rule: 'fermented-seasoning',
  },
  BREWED_VINEGAR: {
    label: { ar: 'خل مخمَّر', en: 'Brewed vinegar', es: 'Vinagre de fermentación', ja: '醸造酢' },
    rule: 'vinegar',
  },
  FLAVORING_UNSPECIFIED: {
    label: {
      ar: 'نكهة غير محدَّدة',
      en: 'Flavouring, carrier not stated',
      es: 'Aroma sin especificar',
      ja: '香料（由来不明）',
    },
    rule: 'flavouring',
  },
  GLYCERIN: {
    label: { ar: 'غليسرين', en: 'Glycerin', es: 'Glicerina', ja: 'グリセリン' },
    rule: 'glycerin',
  },
  CYSTEINE: {
    label: { ar: 'إل-سيستين', en: 'L-cysteine', es: 'L-cisteína', ja: 'L-システイン' },
    rule: 'l-cysteine',
  },
  RENNET_WHEY: {
    label: {
      ar: 'إنفحة أو مصل اللبن',
      en: 'Rennet or whey',
      es: 'Cuajo o suero lácteo',
      ja: 'レンネット・ホエイ',
    },
    rule: 'rennet',
  },
  COLLAGEN: {
    label: { ar: 'كولاجين', en: 'Collagen', es: 'Colágeno', ja: 'コラーゲン' },
    rule: 'collagen',
  },
  COCHINEAL: {
    label: {
      ar: 'قرمز (من الحشرات)',
      en: 'Cochineal / carmine',
      es: 'Cochinilla / carmín',
      ja: 'コチニール色素',
    },
    rule: 'cochineal',
  },
  ENZYME_UNSPECIFIED: {
    label: {
      ar: 'إنزيم غير محدَّد المصدر',
      en: 'Enzyme, source not stated',
      es: 'Enzima sin especificar',
      ja: '酵素（由来不明）',
    },
    // 酵素 a secas no tiene regla en el lector de etiquetas: `pepsin` cubre las
    // enzimas digestivas con nombre propio, no la palabra genérica.
    why: {
      ar: 'لا يذكر الملصق مصدر الإنزيم. قد يكون ميكروبيًّا أو نباتيًّا، وقد يكون حيوانيًّا — من الخنزير أو من حيوان لم يُذكَّ. بلا جواب من الشركة تبقى المعلومة ناقصة.',
      en: 'The label does not say where the enzyme comes from. It can be microbial or plant-based, and it can equally be animal — porcine, or from an animal not ritually slaughtered. Without an answer from the maker the information is simply missing.',
      es: 'La etiqueta no dice de dónde viene la enzima. Puede ser microbiana o vegetal, y puede ser igual de bien animal: porcina, o de un animal no sacrificado según el rito. Sin respuesta del fabricante, falta información.',
      ja: '酵素の由来が表示されていません。微生物や植物由来のこともあれば、豚やイスラム法にのっとって屠畜されていない動物に由来することもあります。メーカーの回答がなければ判断材料が足りません。',
    },
  },
  BOUILLON: {
    label: { ar: 'مرق أو كونسومي', en: 'Bouillon or consommé', es: 'Caldo o consomé', ja: 'ブイヨン・コンソメ' },
    rule: 'extract-generic',
  },
};

const RULE_BY_ID = new Map(RULES.map((rule) => [rule.id, rule]));

export function isReasonCode(value: string): value is ReasonCode {
  return value in CODES;
}

/**
 * Cómo lee la app ese término *por sí mismo*, con el mismo dictamen que ya
 * enseña en el lector de etiquetas (⛔ / ⚠️ / ✅).
 *
 * No es el veredicto del producto: ese llega resuelto desde el `status` del
 * feed y lo pone la política del productor. Es el término aislado, y viene del
 * único sitio donde la app tiene dictámenes. Lo que evita es la contradicción
 * que se ve enseguida en pantalla: 豚肉 con el ámbar de "hay que preguntar"
 * dentro de una ficha que ya dice que el producto queda excluido.
 *
 * `null` cuando ninguna regla cubre el código: entonces se muestra neutro.
 */
export function reasonStatus(code: string): Status | null {
  if (!isReasonCode(code)) return null;
  const entry = CODES[code];
  const rule = entry.rule ? RULE_BY_ID.get(entry.rule) : undefined;
  return rule?.status ?? null;
}

/** Nombre del término. Un código que esta versión no conoce se muestra crudo. */
export function reasonLabel(code: string, lang: Lang): string {
  if (!isReasonCode(code)) return code;
  return CODES[code].label[lang];
}

/**
 * Por qué está marcado el término.
 *
 * Vacío para un código desconocido: la ficha enseña entonces el aviso de
 * "actualiza la app", que es la información útil, en vez de una explicación
 * inventada.
 */
export function reasonWhy(code: string, lang: Lang): string {
  if (!isReasonCode(code)) return '';
  const entry = CODES[code];
  if (entry.why) return entry.why[lang];
  const rule = entry.rule ? RULE_BY_ID.get(entry.rule) : undefined;
  if (!rule) return '';
  return ruleText(rule.id, rule.why, 'why', lang);
}
