/**
 * Analizador de listas de ingredientes japonesas.
 *
 * Todo el análisis es local y determinista: ni red, ni modelo, ni clave de API.
 * Funciona en avión, dentro del supermercado y sin cobertura, que es donde de
 * verdad hace falta.
 *
 * El texto japonés no separa palabras, así que se normaliza y se busca por
 * coincidencia más larga: 「動物性油脂」 gana a 「油脂」, y 「みりん風調味料」
 * gana a 「みりん」, que es justo la diferencia entre un dictamen y su contrario.
 */

import { CROSS_CONTAMINATION, RULES, type Rule, type Status, type Trilingual } from './rules';
import type { Lang } from '../../i18n';
import { ruleText } from './localize';
import { readCertification, type CertificationRead } from './certification';

export type { CertificationRead } from './certification';

export type { Rule } from './rules';

export type Verdict =
  | 'haram'
  /** Pegatina de certificación junto a un ingrediente prohibido: contradicción. */
  | 'certified-conflict'
  | 'mushbooh'
  /** Certificado y con términos dudosos: la auditoría suele resolverlos. */
  | 'certified-doubtful'
  | 'no-haram-found'
  | 'nothing-recognised';

export interface Finding {
  id: string;
  status: Status;
  /** Término tal y como estaba impreso en la etiqueta. */
  matched: string;
  label: Trilingual;
  why: Trilingual;
  /** Posiciones [inicio, fin) en el texto ORIGINAL, para poder resaltarlas. */
  spans: Array<[number, number]>;
}

export interface Analysis {
  verdict: Verdict;
  findings: Finding[];
  counts: Record<Status, number>;
  /** Lo que dice la pegatina, que no es lo mismo que el 原材料名. */
  certification: CertificationRead;
}

/**
 * Normaliza conservando la correspondencia con el texto original.
 * Devuelve el texto normalizado y, por cada carácter suyo, el índice del
 * carácter original del que salió.
 */
function normalizeWithMap(input: string): { text: string; map: number[] } {
  let text = '';
  const map: number[] = [];

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (/\s/.test(ch)) continue; // los saltos de línea del envase no significan nada

    // NFKC por carácter: 全角 → 半角, ﾊﾟ → パ, ㍑ → リットル.
    let chunk = ch.normalize('NFKC').toLowerCase();

    // Katakana → hiragana, para que ミリン y みりん sean la misma palabra.
    chunk = chunk.replace(/[ァ-ヶ]/g, (k) =>
      String.fromCharCode(k.charCodeAt(0) - 0x60),
    );

    for (const c of chunk) {
      text += c;
      map.push(i);
    }
  }

  return { text, map };
}

function normalizeTerm(term: string): string {
  return normalizeWithMap(term).text;
}

interface RawMatch {
  rule: Rule;
  term: string;
  /** Índices sobre el texto normalizado. */
  start: number;
  end: number;
}

/** Todas las apariciones de un término en el texto normalizado. */
function findAll(haystack: string, needle: string): number[] {
  if (!needle) return [];
  const out: number[] = [];
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) return out;
    out.push(at);
    from = at + 1; // solapadas incluidas; el filtro posterior se encarga
  }
}

/**
 * Resuelve solapamientos: gana la coincidencia más larga.
 * Es lo que evita que 「植物性油脂」 se lea como 「動物性油脂」 por descuido, y
 * que 「豚由来ゼラチン」 se cuente dos veces.
 */
function resolveOverlaps(matches: RawMatch[]): RawMatch[] {
  const sorted = [...matches].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return b.end - b.start - (a.end - a.start);
  });

  const kept: RawMatch[] = [];
  for (const m of sorted) {
    const covered = kept.some((k) => k.start <= m.start && m.end <= k.end);
    if (!covered) kept.push(m);
  }
  return kept;
}

/**
 * Delimita la cláusula donde aparece un aviso: lo que hay entre paréntesis, o
 * entre puntos, o una ventana acotada si el envase no puntúa nada.
 */
function clauseRange(text: string, at: number, length: number): [number, number] {
  const OPEN = '（(【「';
  const CLOSE = '）)】」';
  const WINDOW = 40;

  let start = at - 1;
  while (start >= 0 && !OPEN.includes(text[start]!) && text[start] !== '。') start -= 1;
  let end = at + length;
  while (end < text.length && !CLOSE.includes(text[end]!) && text[end] !== '。') end += 1;

  return [
    start >= 0 ? start + 1 : Math.max(0, at - WINDOW),
    end < text.length ? end : Math.min(text.length, at + length + WINDOW),
  ];
}

/**
 * Contaminación cruzada.
 *
 * «本品製造工場では豚肉を含む製品を製造しています» NO es un ingrediente de cerdo:
 * es un aviso de línea compartida. Marcarlo como prohibido sería acusar en
 * falso a un producto que no lleva cerdo, así que se exige que el material
 * problemático esté dentro de la misma cláusula que el aviso, y esa cláusula
 * entera pasa a ser el hallazgo.
 */
function contaminationClauses(text: string): Array<[number, number]> {
  const clauses: Array<[number, number]> = [];

  for (const pattern of CROSS_CONTAMINATION.patterns) {
    const needle = normalizeTerm(pattern);
    for (const at of findAll(text, needle)) {
      const range = clauseRange(text, at, needle.length);
      const clause = text.slice(range[0], range[1]);
      const hasTrigger = CROSS_CONTAMINATION.triggers.some((tr) =>
        clause.includes(normalizeTerm(tr)),
      );
      if (hasTrigger && !clauses.some((c) => c[0] === range[0] && c[1] === range[1])) {
        clauses.push(range);
      }
    }
  }

  return clauses;
}

/**
 * «No lleva X» NO es «lleva X».
 *
 * `豚肉不使用`, `みりん不使用`, `アルコールは使用しておりません`, `ノンアルコール`:
 * son justo los productos que un musulmán en Japón busca, y la app los estaba
 * marcando como prohibidos. El error iba en la peor dirección posible.
 *
 * El alcance se corta por separador de lista, no por cláusula: en
 * `豚肉、みりん不使用` la negación es solo de la みりん. Por eso no se reutiliza
 * `clauseRange`, que solo parte por paréntesis y 。 y se tragaría el cerdo.
 */
const SEPARADORES = '、，,･・/／（）()【】「」。\n';

/** Negaciones que van DETRÁS del ingrediente, que es lo normal en japonés. */
const NEGACION_POSTERIOR = [
  '不使用', '未使用', '不添加', '無添加',
  'を使用していません', 'は使用していません', '使用していません',
  'を使用しておりません', 'は使用しておりません', '使用しておりません',
  'を含みません', 'は含みません', '含みません',
  'は含まれていません', '含まれていません',
  '含有していません', 'フリー', 'ゼロ',
];

/** Y las que van DELANTE: ノンアルコール, 無アルコール. */
const NEGACION_ANTERIOR = ['ノン', '無'];

function negatedSpans(text: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];

  for (const marca of NEGACION_POSTERIOR) {
    const needle = normalizeTerm(marca);
    for (const at of findAll(text, needle)) {
      let inicio = at;
      while (inicio > 0 && !SEPARADORES.includes(text[inicio - 1]!)) inicio -= 1;
      if (inicio < at) spans.push([inicio, at]);
    }
  }

  for (const marca of NEGACION_ANTERIOR) {
    const needle = normalizeTerm(marca);
    for (const at of findAll(text, needle)) {
      let fin = at + needle.length;
      while (fin < text.length && !SEPARADORES.includes(text[fin]!)) fin += 1;
      if (fin > at + needle.length) spans.push([at + needle.length, fin]);
    }
  }

  return spans;
}

export function analyze(label: string): Analysis {
  const { text, map } = normalizeWithMap(label);
  const clauses = contaminationClauses(text);
  const negados = negatedSpans(text);
  const insideClause = (start: number, end: number): boolean =>
    clauses.some((c) => c[0] <= start && end <= c[1]) ||
    negados.some((n) => n[0] <= start && end <= n[1]);

  const raw: RawMatch[] = [];
  for (const rule of RULES) {
    for (const term of rule.terms) {
      const needle = normalizeTerm(term);
      for (const at of findAll(text, needle)) {
        // Lo mencionado dentro del aviso de línea compartida no es ingrediente.
        if (insideClause(at, at + needle.length)) continue;
        raw.push({ rule, term, start: at, end: at + needle.length });
      }
    }
  }

  const byRule = new Map<string, Finding>();
  for (const m of resolveOverlaps(raw)) {
    const span: [number, number] = [map[m.start]!, map[m.end - 1]! + 1];
    const existing = byRule.get(m.rule.id);
    if (existing) {
      existing.spans.push(span);
      continue;
    }
    byRule.set(m.rule.id, {
      id: m.rule.id,
      status: m.rule.status,
      matched: label.slice(span[0], span[1]),
      label: m.rule.label,
      why: m.rule.why,
      spans: [span],
    });
  }

  if (clauses.length > 0) {
    const spans = clauses.map(
      (c): [number, number] => [map[c[0]]!, map[c[1] - 1]! + 1],
    );
    byRule.set(CROSS_CONTAMINATION.id, {
      id: CROSS_CONTAMINATION.id,
      status: CROSS_CONTAMINATION.status,
      matched: label.slice(spans[0]![0], spans[0]![1]),
      label: CROSS_CONTAMINATION.label,
      why: CROSS_CONTAMINATION.why,
      spans,
    });
  }

  const ORDER: Record<Status, number> = { haram: 0, mushbooh: 1, halal: 2 };
  const findings = [...byRule.values()].sort((a, b) => {
    if (ORDER[a.status] !== ORDER[b.status]) return ORDER[a.status] - ORDER[b.status];
    return a.spans[0]![0] - b.spans[0]![0];
  });

  const counts: Record<Status, number> = { haram: 0, mushbooh: 0, halal: 0 };
  findings.forEach((f) => (counts[f.status] += 1));

  const certification = readCertification(text);
  return { verdict: verdictOf(counts, certification), findings, counts, certification };
}

/**
 * El dictamen nunca es "halal".
 *
 * Lo más favorable que esta app puede decir es «no he reconocido nada
 * prohibido», que no es lo mismo que «es lícito»: una etiqueta que no se supo
 * leer produce exactamente la misma pantalla verde que una etiqueta limpia si
 * uno no tiene cuidado, y eso es peor que no tener app.
 */
function verdictOf(counts: Record<Status, number>, cert: CertificationRead): Verdict {
  // La certificación NUNCA levanta un dictamen de prohibido: si la pegatina y
  // el 原材料名 se contradicen, gana el ingrediente y se avisa del choque.
  if (counts.haram > 0) return cert.certified ? 'certified-conflict' : 'haram';

  // Con certificación, lo dudoso suele ser precisamente lo que la auditoría
  // ha comprobado (el origen de la gelatina, del emulgente, del油脂). Se dice
  // eso, y se sigue sin dar vía libre: hay que verificar el certificado.
  if (counts.mushbooh > 0) return cert.certified ? 'certified-doubtful' : 'mushbooh';

  if (counts.halal > 0) return 'no-haram-found';
  return 'nothing-recognised';
}

/**
 * Devuelve el texto original troceado para pintarlo, marcando cada término
 * reconocido con su estado. Los trozos sin marcar llevan `status: null`.
 */
export function segmentsFor(label: string, findings: Finding[]): Array<{
  text: string;
  status: Status | null;
}> {
  const spans = findings
    .flatMap((f) => f.spans.map((s) => ({ start: s[0], end: s[1], status: f.status })))
    .sort((a, b) => a.start - b.start);

  const out: Array<{ text: string; status: Status | null }> = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start < cursor) continue; // ya cubierto por un término más largo
    if (span.start > cursor) out.push({ text: label.slice(cursor, span.start), status: null });
    out.push({ text: label.slice(span.start, span.end), status: span.status });
    cursor = span.end;
  }
  if (cursor < label.length) out.push({ text: label.slice(cursor), status: null });
  return out;
}

/**
 * Búsqueda por palabra suelta: kanji, kana, romaji o el nombre en el idioma de
 * la interfaz. Sirve para el diccionario ("¿qué es みりん?") sin pasar por el
 * análisis de una etiqueta entera.
 */
export function searchRules(query: string, lang: Lang): Rule[] {
  const raw = query.trim().toLowerCase();
  if (!raw) return [];
  const normalized = normalizeWithMap(raw).text;

  const ORDER: Record<Status, number> = { haram: 0, mushbooh: 1, halal: 2 };
  return RULES.filter((rule) => {
    const japanese = rule.terms.some((term) => {
      const t = normalizeTerm(term);
      return t.includes(normalized) || normalized.includes(t);
    });
    const romaji = (rule.search ?? []).some((word) => word.toLowerCase().includes(raw));
    const named = ruleText(rule.id, rule.label, 'label', lang).toLowerCase().includes(raw);
    return japanese || romaji || named;
  }).sort((a, b) => ORDER[a.status] - ORDER[b.status]);
}
