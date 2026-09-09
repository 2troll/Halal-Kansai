/**
 * Lectura de la pegatina, no solo de la lista de ingredientes.
 *
 * El problema que resuelve este módulo: un producto CERTIFICADO puede llevar
 * ゼラチン, 乳化剤 o 動物性油脂 impresos en el 原材料名. Leyendo solo los
 * ingredientes, la app marcaba «dudoso» un producto que una certificadora ya
 * había auditado — es decir, contradecía a la propia autoridad. Al revés
 * también existe y es peor: una pegatina que dice ハラール junto a un
 * ingrediente prohibido por texto explícito.
 *
 * Tres distinciones que en Japón deciden el resultado:
 *
 * 1. **Certificación** (ハラール認証, 認証番号): un organismo ha auditado el
 *    origen de los ingredientes y el proceso. Los términos dudosos del
 *    etiquetado suelen quedar resueltos por esa auditoría.
 * 2. **Reclamo de aptitud** (ムスリムフレンドリー, ムスリム対応, ノンポーク):
 *    lo dice el fabricante, no lo audita nadie. En Japón es muy común y se
 *    confunde constantemente con lo anterior. NO es una certificación.
 * 3. **Contradicción**: la pegatina afirma certificación y el 原材料名 nombra
 *    algo prohibido por texto explícito. La app no resuelve eso: avisa y
 *    manda preguntar al organismo emisor.
 *
 * Este módulo NO decide si un certificado es válido ni qué organismos son de
 * fiar: eso es competencia de las certificadoras, no de una app.
 */

/** Afirmaciones de certificación auditada por un organismo. */
const CERTIFIED_TERMS = [
  'ハラール認証',
  'ハラル認証',
  'ハラール認定',
  'ハラル認定',
  '認証番号',
  '認証機関',
  'halalcertified',
  'halalcertification',
  'certifiedhalal',
  'jakim',
  'mui',
  'jhcpo',
] as const;

/**
 * Reclamos del fabricante que NO son certificación. Se listan aparte a
 * propósito: confundirlos con lo anterior es el error más caro que comete un
 * consumidor musulmán en un supermercado japonés.
 */
const FRIENDLY_TERMS = [
  'ムスリムフレンドリー',
  'むすりむふれんどりー',
  'ムスリム対応',
  'むすりむ対応',
  'muslimfriendly',
  'ノンポーク',
  'のんぽーく',
  'ポークフリー',
  'porkfree',
  'nonpork',
  '豚肉不使用',
  '豚由来原料不使用',
  'アルコール不使用',
  'alcoholfree',
] as const;

export interface CertificationRead {
  /** La etiqueta afirma certificación de un organismo. */
  certified: boolean;
  /** La etiqueta solo hace un reclamo del fabricante, sin certificación. */
  friendlyOnly: boolean;
  /** Términos encontrados, tal y como estaban impresos. */
  matched: string[];
}

/**
 * Busca en el texto YA normalizado (ver `normalizeWithMap`) y devuelve los
 * términos en su forma canónica. Trabaja sobre el normalizado para que
 * ﾊﾗｰﾙ, ハラール y はらーる sean lo mismo.
 */
export function readCertification(normalized: string): CertificationRead {
  const found = (terms: readonly string[]): string[] =>
    terms.filter((term) => normalized.includes(normalizeTermForCert(term)));

  const certified = found(CERTIFIED_TERMS);
  const friendly = found(FRIENDLY_TERMS);

  return {
    certified: certified.length > 0,
    // Solo es "friendly" si NO hay certificación: con certificación, el
    // reclamo del fabricante deja de ser la información relevante.
    friendlyOnly: certified.length === 0 && friendly.length > 0,
    matched: [...certified, ...friendly],
  };
}

/** Misma normalización que el analizador: katakana → hiragana, NFKC, minúsculas. */
function normalizeTermForCert(term: string): string {
  return term
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (k) => String.fromCharCode(k.charCodeAt(0) - 0x60))
    .replace(/\s/g, '');
}
