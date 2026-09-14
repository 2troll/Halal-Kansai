/**
 * ¿Cuándo se pide al servidor una versión mejor de la frase?
 *
 * Es la decisión que separa una app que funciona sola de una que vuelve a
 * depender de la red. Antes se pedía refinado por CADA frase: en una jutba de
 * una hora, varios cientos de peticiones, incluso con ML Kit traduciendo bien
 * dentro del móvil. Estas pruebas fijan ese comportamiento para que no se
 * vuelva atrás sin querer.
 */
import { describe, expect, it } from 'vitest';
import { shouldRefine } from '../src/modules/khutbah/translate.ts';
import type { TranslatedSegment } from '../src/modules/khutbah/translate.ts';

/** Una frase cualquiera del sermón, con el origen que haga falta. */
const seg = (over: Partial<TranslatedSegment> = {}): TranslatedSegment => ({
  kind: 'speech',
  translation: 'Alabado sea Dios',
  original: 'الحمد لله',
  verified: false,
  ...over,
});

describe('shouldRefine', () => {
  it('NO refina lo que ya tradujo el móvil: ahí está el ahorro de red', () => {
    expect(shouldRefine(seg({ translationSource: 'ondevice' }))).toBe(false);
  });

  it('NO refina una aleya: su traducción es la oficial de Tanzil', () => {
    expect(shouldRefine(seg({ kind: 'quran', translationSource: 'tanzil' }))).toBe(false);
    // Aunque el origen fuese otro, por ser Corán no se toca.
    expect(shouldRefine(seg({ kind: 'quran', translationSource: 'free' }))).toBe(false);
  });

  it('NO refina lo que ya hizo el modelo grande: no hay nada mejor detrás', () => {
    expect(shouldRefine(seg({ translationSource: 'llm' }))).toBe(false);
  });

  it('SÍ refina la traducción gratuita del servidor, que es la más floja', () => {
    expect(shouldRefine(seg({ translationSource: 'free' }))).toBe(true);
  });

  it('SÍ refina si no consta el origen: con conexión, mejor preguntar', () => {
    expect(shouldRefine(seg())).toBe(true);
  });

  it('hadiz y súplica se refinan como el habla normal', () => {
    expect(shouldRefine(seg({ kind: 'hadith', translationSource: 'free' }))).toBe(true);
    expect(shouldRefine(seg({ kind: 'dua' }))).toBe(true);
  });

  it('una jutba entera traducida en el móvil no pide NI UN refinado', () => {
    // 60 minutos de sermón troceado en frases de unos 7 s ≈ 500 frases.
    const jutba = Array.from({ length: 500 }, () => seg({ translationSource: 'ondevice' }));
    expect(jutba.filter(shouldRefine)).toHaveLength(0);
  });
});
