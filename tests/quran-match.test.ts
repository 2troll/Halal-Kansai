import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { hasArabic, normalizeArabic } from '../server/src/normalize.ts';
import { CONFIDENCE_THRESHOLD, QuranMatcher, semiGlobalDistance } from '../server/src/match.ts';

describe('normalizeArabic', () => {
  it('elimina el tashkeel y materializa el alef superíndice', () => {
    // La alef superíndice del rasm Uthmani (رحمٰن) se convierte en alef plena;
    // la diferencia con la ortografía moderna (رحمن) la absorbe el matching.
    expect(normalizeArabic('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ')).toBe('بسم الله الرحمان الرحيم');
  });

  it('unifica variantes de alef, ta marbuta y alef maqsura', () => {
    expect(normalizeArabic('أإآٱ')).toBe('اااا');
    expect(normalizeArabic('صلاة')).toBe('صلاه');
    expect(normalizeArabic('هدى')).toBe('هدي');
  });

  it('descarta caracteres no árabes', () => {
    expect(normalizeArabic('قال: «الحمد لله» (2:1)')).toBe('قال الحمد لله');
  });
});

describe('hasArabic', () => {
  it('detecta árabe suficiente', () => {
    expect(hasArabic('بسم الله الرحمن الرحيم')).toBe(true);
    expect(hasArabic('hello world')).toBe(false);
    expect(hasArabic('قال')).toBe(false); // demasiado corto
  });
});

describe('semiGlobalDistance', () => {
  it('encuentra el patrón como subcadena exacta con coste 0', () => {
    expect(semiGlobalDistance('lah', 'bismillah ar rahman')).toBe(0);
  });

  it('cuenta los errores de edición del patrón', () => {
    expect(semiGlobalDistance('xyz', 'abcdef')).toBe(3);
    expect(semiGlobalDistance('abd', 'xxabcdxx')).toBe(1);
  });
});

describe('QuranMatcher (datos reales de Tanzil)', () => {
  let matcher: QuranMatcher;

  beforeAll(() => {
    const uthmani = JSON.parse(
      readFileSync(new URL('../server/data/quran-uthmani.json', import.meta.url), 'utf8'),
    );
    matcher = new QuranMatcher(uthmani);
  });

  it('reconoce la Fatiha sin diacríticos (como llega del speech-to-text)', () => {
    const result = matcher.match('الحمد لله رب العالمين');
    expect(result).not.toBeNull();
    expect(result!.ref).toEqual({ sura: 1, ayah: 2 });
    expect(result!.confidence).toBeGreaterThan(0.9);
    // El texto devuelto es el Uthmani literal de la BD, con tashkeel.
    expect(result!.uthmani).toContain('ٱلْحَمْدُ');
  });

  it('reconoce la basmala en ortografía moderna (رحمن sin alef)', () => {
    const result = matcher.match('بسم الله الرحمن الرحيم');
    expect(result).not.toBeNull();
    expect(result!.ref).toEqual({ sura: 1, ayah: 1 });
    expect(result!.confidence).toBeGreaterThan(CONFIDENCE_THRESHOLD);
  });

  it('reconoce un fragmento parcial de Ayat al-Kursi (2:255)', () => {
    const result = matcher.match('الله لا اله الا هو الحي القيوم لا تاخذه سنة ولا نوم');
    expect(result).not.toBeNull();
    expect(result!.ref).toEqual({ sura: 2, ayah: 255 });
  });

  it('usa la pista del LLM y corrige aleyas vecinas', () => {
    // El LLM propone 112:2 pero el texto es 112:1.
    const result = matcher.match('قل هو الله احد', { sura: 112, ayah: 2 });
    expect(result).not.toBeNull();
    expect(result!.ref).toEqual({ sura: 112, ayah: 1 });
  });

  it('tolera errores de reconocimiento de voz', () => {
    // 114:1 con dos letras equivocadas: قل اعوذ برب الناس
    const result = matcher.match('قل اعود برب الناس', { sura: 114, ayah: 1 });
    expect(result).not.toBeNull();
    expect(result!.ref).toEqual({ sura: 114, ayah: 1 });
  });

  it('rechaza texto árabe que no es Corán', () => {
    const result = matcher.match('اليوم سوف نتحدث عن اهمية الصدق في التجارة والبيع والشراء');
    expect(result).toBeNull();
  });

  it('rechaza fragmentos demasiado cortos', () => {
    expect(matcher.match('بسم')).toBeNull();
  });

  it('getVerse devuelve el texto literal por referencia', () => {
    // Comparamos la forma normalizada: el Uthmani usa codepoints (wasla,
    // tashkeel) difíciles de reproducir literalmente en el código fuente.
    expect(normalizeArabic(matcher.getVerse({ sura: 114, ayah: 6 })!)).toBe('من الجنه والناس');
    expect(matcher.getVerse({ sura: 115, ayah: 1 })).toBeUndefined();
  });
});
