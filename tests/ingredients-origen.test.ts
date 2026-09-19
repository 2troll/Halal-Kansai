/**
 * El origen declarado en la etiqueta.
 *
 * Auditando salió que la app condenaba comida lícita:
 *   鶏ハム (jamón de pollo)      → PROHIBIDO, contradiciendo el texto de su
 *                                  propia regla, que dice «salvo que ponga pollo»
 *   ターキーベーコン (bacon de pavo) → PROHIBIDO
 *   ゼラチン（魚由来）             → dudoso, cuando el pescado es lícito
 *   植物性ゼラチン, グリセリン（植物由来）, 乳化剤（大豆由来） → dudosos
 *
 * El patrón común: el origen declarado ENTRE PARÉNTESIS DETRÁS es el formato
 * normal de una etiqueta japonesa, y no se leía. Se resuelve con reglas de
 * término más largo, que es como ya funcionaba `gelatin-fish`.
 */
import { describe, expect, it } from 'vitest';
import { analyze } from '../src/modules/ingredients/analyze';

const ids = (label: string) => analyze(label).findings.map((f) => f.id);
const v = (label: string) => analyze(label).verdict;

describe('ave declarada: no es cerdo', () => {
  it('鶏ハム no es prohibido, es dudoso por el sacrificio', () => {
    expect(v('原材料名：鶏ハム、食塩')).toBe('mushbooh');
    expect(ids('原材料名：鶏ハム、食塩')).toContain('ham-poultry');
    expect(ids('原材料名：鶏ハム、食塩')).not.toContain('ham');
  });

  it('ターキーベーコン tampoco', () => {
    expect(v('原材料名：ターキーベーコン')).toBe('mushbooh');
    expect(ids('原材料名：ターキーベーコン')).not.toContain('bacon');
  });

  it('pero ハム y ベーコン a secas siguen siendo cerdo', () => {
    expect(v('原材料名：ハム、食塩')).toBe('haram');
    expect(v('原材料名：ベーコン')).toBe('haram');
  });
});

describe('origen vegetal o de pescado declarado', () => {
  it('ゼラチン（魚由来） es lícita', () => {
    expect(ids('原材料名：ゼラチン（魚由来）')).toContain('gelatin-fish');
    expect(analyze('原材料名：ゼラチン（魚由来）').counts.mushbooh).toBe(0);
  });

  it('植物性ゼラチン es lícita', () => {
    expect(ids('原材料名：植物性ゼラチン')).toContain('gelatin-plant');
    expect(analyze('原材料名：植物性ゼラチン').counts.mushbooh).toBe(0);
  });

  it('グリセリン（植物由来） y 乳化剤（大豆由来） son lícitos', () => {
    expect(analyze('原材料名：グリセリン（植物由来）').counts.mushbooh).toBe(0);
    expect(analyze('原材料名：乳化剤（大豆由来）').counts.mushbooh).toBe(0);
  });

  it('大豆レシチン es lícita', () => {
    expect(ids('原材料名：大豆レシチン')).toContain('emulsifier-plant');
  });
});

describe('sin origen declarado sigue siendo dudoso', () => {
  it('ゼラチン, グリセリン y 乳化剤 a secas', () => {
    for (const t of ['ゼラチン', 'グリセリン', '乳化剤']) {
      expect(analyze(`原材料名：${t}`).counts.mushbooh, t).toBeGreaterThan(0);
    }
  });

  it('ゼラチン（豚由来） sigue prohibida', () => {
    expect(v('原材料名：ゼラチン（豚由来）')).toBe('haram');
  });

  it('ゼラチン（牛由来） sigue dudosa: falta el sacrificio', () => {
    expect(v('原材料名：ゼラチン（牛由来）')).toBe('mushbooh');
  });
});
