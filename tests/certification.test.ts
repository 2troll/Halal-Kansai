/**
 * La pegatina contra los ingredientes.
 *
 * Estos casos son el motivo de existir del módulo: son las cuatro situaciones
 * reales de un supermercado japonés, y cada una debe dar una lectura distinta.
 */
import { describe, expect, it } from 'vitest';
import { analyze } from '../src/modules/ingredients/analyze';

describe('certificación en la etiqueta', () => {
  it('un producto certificado con gelatina NO se marca como dudoso a secas', () => {
    const a = analyze('ハラール認証取得。原材料名：小麦粉、ゼラチン、乳化剤、砂糖');
    expect(a.certification.certified).toBe(true);
    expect(a.verdict).toBe('certified-doubtful');
    // Los hallazgos siguen ahí: la app informa, no esconde.
    expect(a.counts.mushbooh).toBeGreaterThan(0);
  });

  it('la certificación NUNCA levanta un ingrediente prohibido: avisa del choque', () => {
    const a = analyze('ハラール認証。原材料名：小麦粉、豚脂、砂糖');
    expect(a.verdict).toBe('certified-conflict');
    expect(a.counts.haram).toBeGreaterThan(0);
  });

  it('«ムスリムフレンドリー» no es certificación y se dice claramente', () => {
    const a = analyze('ムスリムフレンドリー対応。原材料名：小麦粉、ゼラチン、乳化剤');
    expect(a.certification.certified).toBe(false);
    expect(a.certification.friendlyOnly).toBe(true);
    // Sin certificación auditada, lo dudoso sigue siendo dudoso.
    expect(a.verdict).toBe('mushbooh');
  });

  it('sin pegatina alguna, el dictamen es el de siempre', () => {
    const a = analyze('原材料名：小麦粉、ゼラチン、乳化剤');
    expect(a.certification.certified).toBe(false);
    expect(a.certification.friendlyOnly).toBe(false);
    expect(a.verdict).toBe('mushbooh');
  });

  it('reconoce la pegatina en katakana de ancho medio y en mayúsculas latinas', () => {
    expect(analyze('ﾊﾗｰﾙ認証 原材料名：砂糖').certification.certified).toBe(true);
    expect(analyze('HALAL CERTIFIED / 原材料名：砂糖').certification.certified).toBe(true);
  });

  it('con certificación, el reclamo del fabricante deja de ser lo relevante', () => {
    const a = analyze('ハラール認証・ノンポーク 原材料名：ゼラチン');
    expect(a.certification.certified).toBe(true);
    expect(a.certification.friendlyOnly).toBe(false);
  });

  it('un certificado sin nada dudoso no inventa un veredicto nuevo', () => {
    const a = analyze('ハラール認証 原材料名：小麦粉、砂糖、食塩');
    expect(a.verdict).toBe('no-haram-found');
  });
});
