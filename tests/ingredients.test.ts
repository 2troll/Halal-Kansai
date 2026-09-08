import { describe, expect, it } from 'vitest';
import { analyze, searchRules, segmentsFor } from '../src/modules/ingredients/analyze';
import { RULES } from '../src/modules/ingredients/rules';

/** Ids de lo encontrado, para leer los tests de un vistazo. */
const ids = (label: string): string[] => analyze(label).findings.map((f) => f.id);

describe('etiquetas japonesas reales', () => {
  it('ramen instantáneo: manteca y extracto de cerdo → haram', () => {
    const a = analyze(
      '原材料名：油揚げめん（小麦粉、植物油脂、食塩）、スープ（ポークエキス、豚脂、しょうゆ、みりん、香辛料）',
    );
    expect(a.verdict).toBe('haram');
    expect(a.findings.map((f) => f.id)).toContain('pork-extract');
    expect(a.findings.map((f) => f.id)).toContain('pork-fat');
    // El primero de la lista siempre es lo prohibido, no lo lícito.
    expect(a.findings[0]!.status).toBe('haram');
  });

  it('bollería con gelatina y emulsificante: dudoso, no prohibido', () => {
    const a = analyze('小麦粉、砂糖、マーガリン、ショートニング、ゼラチン、卵、乳化剤、香料');
    expect(a.verdict).toBe('mushbooh');
    expect(a.counts.haram).toBe(0);
    expect(a.findings.map((f) => f.id)).toContain('gelatin');
    expect(a.findings.map((f) => f.id)).toContain('emulsifier');
  });

  it('etiqueta limpia: "no se reconoció nada prohibido", nunca "halal"', () => {
    const a = analyze('原材料名：大豆、食塩、米、昆布、米酢、植物性油脂');
    expect(a.verdict).toBe('no-haram-found');
    expect(a.counts.haram + a.counts.mushbooh).toBe(0);
  });

  it('texto sin ingredientes reconocibles → "nothing-recognised", no vía libre', () => {
    expect(analyze('おいしい！新発売').verdict).toBe('nothing-recognised');
    expect(analyze('').verdict).toBe('nothing-recognised');
  });
});

describe('coincidencia más larga (la diferencia entre un dictamen y su contrario)', () => {
  it('動物性油脂 no se confunde con 植物性油脂', () => {
    expect(ids('植物性油脂')).toEqual(['vegetable-oil']);
    expect(ids('動物性油脂')).toEqual(['animal-fat']);
  });

  it('みりん風調味料 es dudoso; 本みりん es prohibido', () => {
    expect(analyze('みりん風調味料').verdict).toBe('mushbooh');
    expect(ids('みりん風調味料')).toEqual(['mirin-style']);
    expect(analyze('本みりん').verdict).toBe('haram');
  });

  it('豚由来ゼラチン se cuenta una vez como cerdo, no como gelatina dudosa', () => {
    expect(ids('豚由来ゼラチン')).toEqual(['pork-derived']);
  });
});

describe('normalización del japonés impreso', () => {
  it('katakana y hiragana son la misma palabra', () => {
    expect(ids('ミリン')).toEqual(ids('みりん'));
  });

  it('los caracteres de ancho completo y los espacios del envase no estorban', () => {
    expect(ids('原材料名 ： 豚 脂')).toContain('pork-fat');
    expect(ids('ＬーシステインとＥ４４１')).toEqual(ids('L-システインとE441'));
  });

  it('el paréntesis del alérgeno delata el cerdo', () => {
    expect(analyze('（一部に豚肉・小麦を含む）').verdict).toBe('haram');
  });
});

describe('contaminación cruzada', () => {
  it('la línea compartida con cerdo pasa la etiqueta a dudosa', () => {
    const a = analyze('小麦粉、砂糖（本品製造工場では豚肉を含む製品を製造しています）');
    expect(a.findings.map((f) => f.id)).toContain('cross-contamination');
    expect(a.verdict).toBe('mushbooh');
  });

  it('el cerdo citado DENTRO del aviso no se acusa como ingrediente', () => {
    // Acusar de "lleva cerdo" a un producto que solo comparte fábrica sería
    // un falso positivo, y ante una certificadora es el error más caro.
    const a = analyze('小麦粉、砂糖（本品製造工場では豚肉を含む製品を製造しています）');
    expect(a.findings.map((f) => f.id)).not.toContain('pork-meat');
    expect(a.counts.haram).toBe(0);
  });

  it('el cerdo declarado como alérgeno del producto sí es ingrediente', () => {
    const a = analyze('（一部に豚肉・小麦を含む）');
    expect(a.verdict).toBe('haram');
    expect(a.findings.map((f) => f.id)).toContain('pork-meat');
  });

  it('sin material problemático, el aviso de línea compartida no salta', () => {
    const a = analyze('小麦粉、砂糖（同一製造ラインで卵を使用しています）');
    expect(a.findings.map((f) => f.id)).not.toContain('cross-contamination');
  });
});

describe('resaltado sobre el texto original', () => {
  it('los tramos marcados reconstruyen exactamente la etiqueta', () => {
    const label = '原材料名：小麦粉、豚脂、みりん、食塩';
    const segments = segmentsFor(label, analyze(label).findings);
    expect(segments.map((s) => s.text).join('')).toBe(label);
    expect(segments.find((s) => s.text === '豚脂')?.status).toBe('haram');
  });
});

describe('integridad de la base de reglas', () => {
  it('no hay ids repetidos', () => {
    const all = RULES.map((r) => r.id);
    expect(new Set(all).size).toBe(all.length);
  });

  it('cada regla explica su porqué en los tres idiomas', () => {
    for (const rule of RULES) {
      for (const lang of ['ar', 'en', 'es'] as const) {
        expect(rule.label[lang].length, `${rule.id}.label.${lang}`).toBeGreaterThan(0);
        expect(rule.why[lang].length, `${rule.id}.why.${lang}`).toBeGreaterThan(20);
      }
    }
  });

  it('todo término dudoso o prohibido tiene al menos una variante japonesa', () => {
    for (const rule of RULES) {
      expect(rule.terms.length, rule.id).toBeGreaterThan(0);
      expect(rule.terms.some((term) => /[ぁ-んァ-ヶ一-龯]/.test(term)), rule.id).toBe(true);
    }
  });
});

// ── Portado del módulo `food` al fusionar los dos lectores ────────────────

describe('búsqueda por palabra (diccionario)', () => {
  it('encuentra por romaji', () => {
    expect(searchRules('mirin', 'es').map((r) => r.id)).toContain('mirin');
  });

  it('encuentra por kanji', () => {
    expect(searchRules('豚肉', 'en').map((r) => r.id)).toContain('pork-meat');
  });

  it('encuentra por kana', () => {
    expect(searchRules('とんこつ', 'en').map((r) => r.id)).toContain('pork-bone-broth');
  });

  it('encuentra por el nombre en el idioma de la interfaz', () => {
    expect(searchRules('gelatina', 'es').map((r) => r.id)).toContain('gelatin');
    expect(searchRules('خنزير', 'ar').length).toBeGreaterThan(0);
  });

  it('ordena lo prohibido antes que lo dudoso y lo lícito', () => {
    const statuses = searchRules('肉', 'es').map((r) => r.status);
    const firstMushbooh = statuses.indexOf('mushbooh');
    const lastHaram = statuses.lastIndexOf('haram');
    if (firstMushbooh !== -1 && lastHaram !== -1) expect(lastHaram).toBeLessThan(firstMushbooh);
  });

  it('devuelve vacío con consulta vacía', () => {
    expect(searchRules('   ', 'en')).toEqual([]);
  });
});

describe('cocina japonesa cotidiana', () => {
  it('el caldo tonkotsu del ramen es cerdo aunque los fideos parezcan inocentes', () => {
    expect(analyze('中華麺、豚骨スープ、ねぎ').verdict).toBe('haram');
  });

  it('チャーシュー y ハム se reconocen como cerdo', () => {
    expect(ids('チャーシュー')).toEqual(['char-siu']);
    expect(analyze('ハム、レタス、パン').verdict).toBe('haram');
  });

  it('だし de bonito y kombu es lícito', () => {
    const a = analyze('原材料名：昆布だし、食塩、砂糖');
    expect(a.counts.haram + a.counts.mushbooh).toBe(0);
  });

  it('エキス a secas es dudoso, pero 昆布エキス no lo es', () => {
    expect(ids('エキス')).toEqual(['extract-generic']);
    expect(ids('昆布エキス')).toEqual(['seafood']);
  });

  it('el pollo sin certificar queda en manos del usuario, no se prohíbe', () => {
    const a = analyze('鶏肉、食塩、香辛料');
    expect(a.verdict).toBe('mushbooh');
    expect(a.counts.haram).toBe(0);
  });

  it('ignora los separadores y espacios del envase', () => {
    expect(analyze('砂糖 ・ 豚 骨 ・ 塩').verdict).toBe('haram');
  });

  it('una etiqueta inocua no se declara lícita', () => {
    const a = analyze('じゃがいも、植物性油脂、食塩');
    expect(a.verdict).toBe('no-haram-found');
    expect(a.verdict).not.toBe('halal');
  });
});

describe('higiene de la base de reglas', () => {
  it('ningún término está repetido en dos reglas', () => {
    const seen = new Map<string, string>();
    for (const rule of RULES) {
      for (const term of rule.terms) {
        expect(seen.has(term), `"${term}" repetido en ${rule.id} y ${seen.get(term)}`).toBe(false);
        seen.set(term, rule.id);
      }
    }
  });
});
