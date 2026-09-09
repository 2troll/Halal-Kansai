/**
 * El glosario existe por un caso medido: «الزكاة» salía como «cárcel» en
 * español y como «ヤクザ» en japonés. Estos tests fijan el comportamiento que
 * lo impide, para que ninguna optimización futura lo reintroduzca.
 */
import { describe, expect, it } from 'vitest';
import {
  GLOSSARY,
  hasTerms,
  protectTerms,
  restoreTerms,
} from '../server/src/glossary';

describe('glosario islámico', () => {
  it('protege el término y lo devuelve en el idioma de destino', () => {
    const { text, used } = protectTerms('ومن أدى الزكاة طهر ماله');
    expect(text).toContain('TERM1');
    expect(text).not.toContain('الزكاة');
    expect(used).toHaveLength(1);

    // Lo que devolvería el traductor, con el marcador intacto.
    const out = restoreTerms('Y quien paga TERM1 purifica su dinero', used, 'es');
    expect(out).toContain('zakat');
    expect(out).not.toMatch(/TERM\s*\d/i);
  });

  it('da la forma canónica de cada idioma', () => {
    const { used } = protectTerms('الزكاة');
    expect(restoreTerms('TERM1', used, 'ja')).toContain('ザカート');
    expect(restoreTerms('TERM1', used, 'en')).toContain('zakat');
    expect(restoreTerms('TERM1', used, 'es')).toContain('zakat');
  });

  it('cae al inglés en un idioma sin forma canónica', () => {
    const { used } = protectTerms('الزكاة');
    expect(restoreTerms('TERM1', used, 'ur')).toContain('zakat');
  });

  it('el término largo gana al corto', () => {
    // «رسول الله» no puede quedar partido por otra entrada más corta.
    const { text, used } = protectTerms('والصلاة والسلام على رسول الله');
    expect(text).not.toContain('رسول الله');
    const rasul = used.find((u) => u.entry.out.en === 'the Messenger of God');
    expect(rasul).toBeDefined();
  });

  it('el término que el traductor pierde se añade al final, no se borra', () => {
    const { used } = protectTerms('الزكاة والصلاة');
    // El traductor se comió el segundo marcador por completo.
    const out = restoreTerms('Paga TERM1 y reza', used, 'es');
    expect(out).toContain('zakat');
    // La palabra perdida sigue presente, entre paréntesis al final.
    expect(out).toContain('oración');
    expect(out).not.toMatch(/TERM\s*\d/i);
  });

  it('tolera que el motor capitalice o espacie el marcador', () => {
    const { used } = protectTerms('الصلاة');
    expect(restoreTerms('the Term1 is due', used, 'en')).toContain('prayer');
    expect(restoreTerms('the TERM 1 is due', used, 'en')).toContain('prayer');
  });

  it('no toca un texto sin términos conocidos', () => {
    expect(hasTerms('اليوم الطقس جميل')).toBe(false);
    const { text, used } = protectTerms('اليوم الطقس جميل');
    expect(text).toBe('اليوم الطقس جميل');
    expect(used).toHaveLength(0);
  });

  it('cada término del texto recibe un marcador distinto', () => {
    const { used } = protectTerms('الزكاة والصلاة والحج');
    const tokens = used.map((u) => u.token);
    expect(new Set(tokens).size).toBe(tokens.length);
  });

  it('toda entrada trae al menos el inglés como respaldo', () => {
    for (const entry of GLOSSARY) {
      expect(entry.out.en, entry.ar[0]).toBeTruthy();
    }
  });

  it('ninguna variante árabe está repetida entre entradas', () => {
    const all = GLOSSARY.flatMap((e) => e.ar);
    expect(new Set(all).size).toBe(all.length);
  });
});
