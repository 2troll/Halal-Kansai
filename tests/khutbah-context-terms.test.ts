/**
 * Las pistas que se le dan al reconocedor tienen que ser del idioma que se
 * está escuchando. Antes se mandaba la lista árabe siempre: con japonés
 * elegido, el reconocedor recibía «الله, القرآن…» mientras hablaba un
 * cocinero japonés.
 */
import { describe, it, expect } from 'vitest';
import { contextTermsFor } from '../src/modules/khutbah/speech-native';
import { SOURCE_LOCALES } from '../src/modules/khutbah/speech';

const esArabe = (s: string) => /[؀-ۿ]/.test(s);
const esJapones = (s: string) => /[぀-ヿ一-鿿]/.test(s);

describe('pistas del reconocedor por idioma', () => {
  it('con árabe manda los términos de la jutba', () => {
    const t = contextTermsFor('ar-SA');
    expect(t).toContain('الله');
    expect(t.every(esArabe)).toBe(true);
  });

  it('acepta la variante corta igual que la larga', () => {
    expect(contextTermsFor('ar')).toEqual(contextTermsFor('ar-SA'));
    expect(contextTermsFor('JA-jp')).toEqual(contextTermsFor('ja-JP'));
  });

  it('los dialectos del árabe heredan la lista árabe', () => {
    for (const code of ['ar-MA', 'ar-DZ']) {
      expect(contextTermsFor(code)).toContain('القرآن');
    }
  });

  it('con japonés NO manda ni una palabra en árabe', () => {
    const t = contextTermsFor('ja-JP');
    expect(t.length).toBeGreaterThan(0);
    expect(t.some(esArabe)).toBe(false);
    expect(t.every(esJapones)).toBe(true);
    // Lo que de verdad hace falta oír bien en Japón.
    expect(t).toContain('ハラール');
    expect(t).toContain('豚肉');
  });

  it('un idioma sin lista propia no recibe pistas de otro idioma', () => {
    // Mejor ninguna pista que pistas equivocadas.
    for (const code of ['th-TH', 'vi-VN', 'fil-PH']) {
      expect(contextTermsFor(code)).toEqual([]);
    }
  });

  it('ningún idioma recibe pistas de un alfabeto que no es el suyo', () => {
    for (const { code } of SOURCE_LOCALES) {
      const t = contextTermsFor(code);
      if (t.length === 0) continue;
      const raiz = code.split('-')[0];
      if (raiz !== 'ar' && raiz !== 'ur') {
        expect(t.some(esArabe), `${code} recibe árabe`).toBe(false);
      }
      if (raiz !== 'ja') {
        expect(t.some(esJapones), `${code} recibe japonés`).toBe(false);
      }
    }
  });
});
