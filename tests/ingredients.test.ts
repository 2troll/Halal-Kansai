import { describe, expect, it } from 'vitest';
import { INGREDIENTS, lookup, scanLabel } from '../src/modules/food/ingredients';

describe('lookup', () => {
  it('encuentra por romaji', () => {
    expect(lookup('mirin').map((i) => i.ja)).toContain('みりん');
  });

  it('encuentra por kanji', () => {
    expect(lookup('豚肉').map((i) => i.romaji)).toContain('butaniku');
  });

  it('encuentra por kana', () => {
    expect(lookup('とんこつ').map((i) => i.ja)).toContain('豚骨');
  });

  it('encuentra por alias', () => {
    // 酒精 es alias de アルコール: aparece en etiquetas como conservante.
    expect(lookup('酒精').map((i) => i.romaji)).toContain('arukōru');
  });

  it('ordena lo prohibido antes que lo dudoso', () => {
    const found = lookup('肉');
    const statuses = found.map((i) => i.status);
    const firstDoubtful = statuses.indexOf('doubtful');
    const lastHaram = statuses.lastIndexOf('haram');
    if (firstDoubtful !== -1 && lastHaram !== -1) {
      expect(lastHaram).toBeLessThan(firstDoubtful);
    }
  });

  it('devuelve vacío con consulta vacía', () => {
    expect(lookup('   ')).toEqual([]);
  });
});

describe('scanLabel', () => {
  it('detecta cerdo en una etiqueta real', () => {
    const r = scanLabel('小麦粉、植物油脂、豚脂、食塩、砂糖');
    expect(r.verdict).toBe('haram');
    expect(r.inconclusive).toBe(false);
    expect(r.hits[0].ingredient.status).toBe('haram');
  });

  it('detecta alcohol de cocina', () => {
    const r = scanLabel('しょうゆ、料理酒、みりん、砂糖');
    expect(r.verdict).toBe('haram');
  });

  it('marca como dudoso lo que solo tiene mushbooh', () => {
    const r = scanLabel('小麦粉、乳化剤、ショートニング、食塩');
    expect(r.verdict).toBe('doubtful');
    expect(r.inconclusive).toBe(false);
  });

  it('el peor hallazgo manda: haram gana a dudoso', () => {
    const r = scanLabel('ゼラチン、豚肉');
    expect(r.verdict).toBe('haram');
    expect(r.hits[0].ingredient.status).toBe('haram');
  });

  it('una etiqueta inocua no se declara lícita, se declara no concluyente', () => {
    const r = scanLabel('じゃがいも、ひまわり油、食塩');
    expect(r.inconclusive).toBe(true);
  });

  it('ignora separadores y espacios japoneses', () => {
    expect(scanLabel('砂糖 ・ 豚 骨 ・ 塩').verdict).toBe('haram');
  });
});

describe('integridad de los datos', () => {
  it('toda entrada tiene nota en los tres idiomas', () => {
    for (const ing of INGREDIENTS) {
      expect(ing.note.en.length, ing.ja).toBeGreaterThan(0);
      expect(ing.note.es.length, ing.ja).toBeGreaterThan(0);
      expect(ing.note.ar.length, ing.ja).toBeGreaterThan(0);
    }
  });

  it('no hay grafías duplicadas entre entradas', () => {
    const seen = new Map<string, string>();
    for (const ing of INGREDIENTS) {
      for (const form of [ing.ja, ing.kana, ing.romaji, ...(ing.aliases ?? [])]) {
        if (!form) continue;
        expect(seen.has(form), `"${form}" duplicado en ${ing.ja} y ${seen.get(form)}`).toBe(false);
        seen.set(form, ing.ja);
      }
    }
  });
});
