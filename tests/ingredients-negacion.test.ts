/**
 * «No lleva X» no es «lleva X».
 *
 * La app marcaba `豚肉不使用` (sin cerdo) como PROHIBIDO y `アルコール不使用`
 * como dudoso. El error iba en la peor dirección: asustaba justo con los
 * productos que un musulmán en Japón busca, los que se anuncian libres de
 * cerdo o de alcohol.
 *
 * Lo delicado del arreglo es no pasarse: en `豚肉、みりん不使用` la negación es
 * solo de la みりん, y el cerdo tiene que seguir saltando.
 */
import { describe, expect, it } from 'vitest';
import { analyze } from '../src/modules/ingredients/analyze';

const ids = (label: string) => analyze(label).findings.map((f) => f.id);

describe('la negación se respeta', () => {
  it('豚肉不使用 no es cerdo', () => {
    const a = analyze('原材料名：豚肉不使用、鶏肉、食塩');
    expect(a.counts.haram).toBe(0);
    expect(ids('原材料名：豚肉不使用、鶏肉、食塩')).not.toContain('pork-meat');
  });

  it('みりん不使用 no es alcohol, pero lo demás de la lista sigue contando', () => {
    const a = analyze('原材料名：みりん不使用、しょうゆ');
    expect(ids('原材料名：みりん不使用、しょうゆ')).not.toContain('mirin');
    expect(ids('原材料名：みりん不使用、しょうゆ')).toContain('shoyu');
    expect(a.counts.haram).toBe(0);
  });

  it('las formas largas también: 使用していません, 使用しておりません', () => {
    expect(analyze('原材料名：豚肉を使用していません').counts.haram).toBe(0);
    expect(analyze('原材料名：アルコールは使用しておりません').counts.mushbooh).toBe(0);
  });

  it('含みません y 含まれていません', () => {
    expect(analyze('原材料名：ゼラチンを含みません').counts.mushbooh).toBe(0);
    expect(analyze('原材料名：豚由来原料は含まれていません').counts.haram).toBe(0);
  });

  it('la negación por delante: ノンアルコール', () => {
    expect(analyze('原材料名：ノンアルコール、砂糖').counts.mushbooh).toBe(0);
  });

  it('不添加 y 無添加', () => {
    expect(analyze('原材料名：ゼラチン不添加').counts.mushbooh).toBe(0);
    expect(analyze('原材料名：乳化剤無添加').counts.mushbooh).toBe(0);
  });
});

describe('la negación NO se come lo que no le toca', () => {
  it('豚肉、みりん不使用 sigue siendo prohibido por el cerdo', () => {
    const a = analyze('原材料名：豚肉、みりん不使用');
    expect(a.verdict).toBe('haram');
    expect(ids('原材料名：豚肉、みりん不使用')).toContain('pork-meat');
    expect(ids('原材料名：豚肉、みりん不使用')).not.toContain('mirin');
  });

  it('ノンアルコール、豚肉 sigue siendo prohibido', () => {
    expect(analyze('原材料名：ノンアルコール、豚肉').verdict).toBe('haram');
  });

  it('豚脂、アルコール不使用、食塩: la manteca sigue saltando', () => {
    const a = analyze('原材料名：豚脂、アルコール不使用、食塩');
    expect(a.verdict).toBe('haram');
    expect(ids('原材料名：豚脂、アルコール不使用、食塩')).toContain('pork-fat');
  });

  it('una etiqueta normal con cerdo no cambia', () => {
    expect(analyze('原材料名：豚肉、食塩').verdict).toBe('haram');
  });
});
