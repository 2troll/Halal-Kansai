/**
 * Glosario islámico determinista para la traducción de la jutba.
 *
 * Por qué existe. Un traductor automático general no conoce el vocabulario
 * religioso y lo destroza justo en las palabras que más importan. Medido
 * contra el motor que usamos, en frases reales de sermón:
 *
 *   «ومن أدى الزكاة طهر ماله»
 *     → es: «¿Quiénes son los que han llevado a la cárcel?»
 *     → ja: 「ヤクザは誰のせいか。」        (zakat → yakuza)
 *
 *   «اعلموا أن الصلاة عمود الدين»
 *     → es: «Saben que la oración es religiosa»   (se pierde «pilar»)
 *
 * Decir «yakuza» donde el imán dijo «zakat», delante de una comunidad que
 * confía en la pantalla, es peor que no traducir nada.
 *
 * Cómo funciona. Antes de traducir se sustituyen los términos conocidos por
 * un marcador numerado (TERM1, TERM2…), y después se cambia el marcador por
 * la forma canónica del idioma de destino. El término no pasa nunca por el
 * traductor, así que no puede equivocarse.
 *
 * El formato del marcador está MEDIDO contra el motor real, no elegido de
 * oído. Probando la misma frase árabe hacia español y japonés:
 *
 *   [1]          → desaparece en los dos idiomas
 *   ZAKATTOKEN   → «Zakatoken» en español, 「ザカトーケン」 en japonés
 *   TERM1        → «Term1» en español, 「TERM1」 intacto en japonés   ← este
 *
 * Si aun así el traductor se come un marcador, el término que falta se añade
 * al final entre paréntesis: una frase coja con la palabra clave presente es
 * más útil que una frase redonda que dice otra cosa.
 *
 * Mismos principios que la base de reglas de ingredientes: es un diccionario,
 * no un modelo; el mismo sermón da siempre el mismo resultado; y cada entrada
 * se puede discutir línea a línea con quien sepa más que nosotros.
 */

export interface GlossaryEntry {
  /** Variantes tal y como salen del reconocimiento de voz, con y sin artículo. */
  ar: string[];
  /** Forma canónica por idioma; `en` es el respaldo si falta el idioma. */
  out: Record<string, string>;
}

export const GLOSSARY: readonly GlossaryEntry[] = [
  {
    ar: ['صلى الله عليه وسلم', 'صلى الله عليه و سلم'],
    out: {
      en: '(peace and blessings be upon him)',
      es: '(la paz y las bendiciones de Dios sean con él)',
      ja: '（かれに平安と祝福あれ）',
      ar: 'صلى الله عليه وسلم',
    },
  },
  {
    ar: ['رسول الله', 'الرسول'],
    out: {
      en: 'the Messenger of God',
      es: 'el Mensajero de Dios',
      ja: 'アッラーの使徒',
      ar: 'رسول الله',
    },
  },
  {
    ar: ['النبي', 'نبي الله'],
    out: { en: 'the Prophet', es: 'el Profeta', ja: '預言者', ar: 'النبي' },
  },
  {
    ar: ['الصلاة', 'صلاة'],
    out: {
      en: 'the prayer (salat)',
      es: 'la oración (salat)',
      ja: '礼拝（サラート）',
      ar: 'الصلاة',
    },
  },
  {
    ar: ['الزكاة', 'زكاة'],
    out: {
      en: 'zakat (the obligatory alms)',
      es: 'el zakat (la limosna obligatoria)',
      ja: 'ザカート（義務の喜捨）',
      ar: 'الزكاة',
    },
  },
  {
    ar: ['الصدقة', 'صدقة'],
    out: {
      en: 'sadaqah (voluntary charity)',
      es: 'la sadaqa (caridad voluntaria)',
      ja: 'サダカ（自発的な施し）',
      ar: 'الصدقة',
    },
  },
  {
    ar: ['الصيام', 'الصوم'],
    out: { en: 'the fast', es: 'el ayuno', ja: '断食', ar: 'الصيام' },
  },
  {
    ar: ['الحج'],
    out: {
      en: 'the pilgrimage (hajj)',
      es: 'la peregrinación (hach)',
      ja: '巡礼（ハッジ）',
      ar: 'الحج',
    },
  },
  {
    ar: ['التقوى', 'تقوى الله', 'بتقوى الله'],
    out: {
      en: 'God-consciousness (taqwa)',
      es: 'el temor de Dios (taqwa)',
      ja: '神への畏れ（タクワー）',
      ar: 'التقوى',
    },
  },
  {
    ar: ['الإيمان', 'الايمان'],
    out: { en: 'faith', es: 'la fe', ja: '信仰', ar: 'الإيمان' },
  },
  {
    ar: ['الإسلام', 'الاسلام'],
    out: { en: 'Islam', es: 'el islam', ja: 'イスラーム', ar: 'الإسلام' },
  },
  {
    ar: ['الأمة', 'الامة'],
    out: {
      en: 'the community (ummah)',
      es: 'la comunidad (umma)',
      ja: '共同体（ウンマ）',
      ar: 'الأمة',
    },
  },
  {
    ar: ['القرآن', 'القران'],
    out: { en: 'the Qur’an', es: 'el Corán', ja: 'クルアーン', ar: 'القرآن' },
  },
  {
    ar: ['الجنة'],
    out: { en: 'Paradise', es: 'el Paraíso', ja: '楽園', ar: 'الجنة' },
  },
  {
    ar: ['جهنم'],
    out: { en: 'Hellfire', es: 'el Infierno', ja: '地獄', ar: 'جهنم' },
  },
  {
    ar: ['الدعاء'],
    out: {
      en: 'supplication (du‘a)',
      es: 'la súplica (dua)',
      ja: '祈願（ドゥアー）',
      ar: 'الدعاء',
    },
  },
  {
    ar: ['الصبر'],
    out: { en: 'patience', es: 'la paciencia', ja: '忍耐', ar: 'الصبر' },
  },
  {
    ar: ['الآخرة', 'الاخرة'],
    out: { en: 'the Hereafter', es: 'la otra vida', ja: '来世', ar: 'الآخرة' },
  },
  {
    ar: ['الدنيا'],
    out: { en: 'this world', es: 'esta vida', ja: '現世', ar: 'الدنيا' },
  },
  {
    ar: ['التوبة'],
    out: { en: 'repentance', es: 'el arrepentimiento', ja: '悔悟', ar: 'التوبة' },
  },
  {
    ar: ['الاستغفار'],
    out: {
      en: 'seeking forgiveness',
      es: 'la petición de perdón',
      ja: '赦しを乞うこと',
      ar: 'الاستغفار',
    },
  },
  {
    ar: ['الرزق'],
    out: { en: 'provision', es: 'el sustento', ja: '糧', ar: 'الرزق' },
  },
  {
    ar: ['الحلال'],
    out: {
      en: 'the lawful (halal)',
      es: 'lo lícito (halal)',
      ja: 'ハラール（許されたもの）',
      ar: 'الحلال',
    },
  },
  {
    ar: ['الحرام'],
    out: {
      en: 'the forbidden (haram)',
      es: 'lo prohibido (haram)',
      ja: 'ハラーム（禁じられたもの）',
      ar: 'الحرام',
    },
  },
  {
    ar: ['المسجد'],
    out: { en: 'the mosque', es: 'la mezquita', ja: 'モスク', ar: 'المسجد' },
  },
  {
    ar: ['الجمعة'],
    out: { en: 'Friday', es: 'el viernes', ja: '金曜日', ar: 'الجمعة' },
  },
  {
    ar: ['رمضان'],
    out: { en: 'Ramadan', es: 'Ramadán', ja: 'ラマダーン', ar: 'رمضان' },
  },
  {
    ar: ['الوضوء'],
    out: {
      en: 'ablution (wudu)',
      es: 'la ablución (wudú)',
      ja: '浄め（ウドゥー）',
      ar: 'الوضوء',
    },
  },
  {
    ar: ['الملائكة'],
    out: { en: 'the angels', es: 'los ángeles', ja: '天使', ar: 'الملائكة' },
  },
  {
    ar: ['يوم القيامة', 'القيامة'],
    out: {
      en: 'the Day of Judgement',
      es: 'el Día del Juicio',
      ja: '審判の日',
      ar: 'يوم القيامة',
    },
  },
];

/**
 * Orden de aplicación: primero los más largos.
 *
 * «رسول الله» tiene que ganar a «الله» y «يوم القيامة» a «القيامة»; si no, el
 * término largo queda partido por dentro y no se reconoce ninguno de los dos.
 */
const BY_LENGTH = [...GLOSSARY]
  .flatMap((entry) => entry.ar.map((variant) => ({ variant, entry })))
  .sort((a, b) => b.variant.length - a.variant.length);

/** Un término protegido y el marcador que lo representa en este texto. */
export interface UsedTerm {
  token: string;
  entry: GlossaryEntry;
}

export interface Protected {
  /** El texto con los términos sustituidos por marcadores. */
  text: string;
  /** Marcadores realmente usados, para restaurar solo esos. */
  used: UsedTerm[];
}

/** Sustituye los términos conocidos por marcadores antes de traducir. */
export function protectTerms(text: string): Protected {
  let out = text;
  const used: UsedTerm[] = [];

  for (const { variant, entry } of BY_LENGTH) {
    if (!out.includes(variant)) continue;
    const existing = used.find((u) => u.entry === entry);
    const token = existing?.token ?? `TERM${used.length + 1}`;
    // Espacios alrededor: el traductor trata el marcador como una palabra
    // suelta y no lo pega a la de al lado.
    out = out.split(variant).join(` ${token} `);
    if (!existing) used.push({ token, entry });
  }

  return { text: out.replace(/\s+/g, ' ').trim(), used };
}

/**
 * Devuelve los términos a su forma canónica en el idioma de destino.
 *
 * Sin distinguir mayúsculas, porque algunos traductores capitalizan a su
 * gusto. Un marcador que el traductor haya perdido simplemente no aparece:
 * no se inventa texto para rellenar el hueco.
 */
export function restoreTerms(translated: string, used: UsedTerm[], target: string): string {
  const lang = target.split('-')[0]!.toLowerCase();
  let out = translated;
  const missing: string[] = [];

  for (const { token, entry } of used) {
    const canonical = entry.out[lang] ?? entry.out.en!;
    // Tolerante: «TERM1», «Term1» y «TERM 1» son el mismo marcador. El motor
    // capitaliza y espacia a su gusto.
    const pattern = new RegExp(`\\bTERM\\s*${token.slice(4)}\\b`, 'gi');
    if (pattern.test(out)) {
      out = out.replace(pattern, canonical);
    } else {
      missing.push(canonical);
    }
  }

  // Marcador huérfano que el traductor deformó: fuera, no puede quedar a la
  // vista del usuario.
  out = out.replace(/\bTERM\s*\d+\b/gi, '').replace(/\s{2,}/g, ' ').trim();

  // Lo que el traductor perdió se añade al final: frase coja con la palabra
  // clave presente antes que frase redonda que dice otra cosa.
  if (missing.length > 0) out = `${out} (${missing.join(' · ')})`.trim();

  return out.trim();
}

/** ¿Merece la pena proteger? Evita el trabajo cuando no hay ningún término. */
export function hasTerms(text: string): boolean {
  return BY_LENGTH.some(({ variant }) => text.includes(variant));
}
