/**
 * Dirección del texto del sermón.
 *
 * El caso que se veía roto: app en español (documento en ltr) traduciendo la
 * jutba al urdu, o enseñando el árabe original. Sin `dir` en ese trozo, salía
 * de izquierda a derecha.
 */
import { describe, expect, it } from 'vitest';
import { baseLang, isRtlLang, dirFor, langAttrs } from '../src/modules/text-direction.ts';

describe('baseLang', () => {
  it('recorta el locale y normaliza', () => {
    expect(baseLang('ar-SA')).toBe('ar');
    expect(baseLang('ur_PK')).toBe('ur');
    expect(baseLang('ES')).toBe('es');
    expect(baseLang('  ja-JP ')).toBe('ja');
  });

  it('aguanta la cadena vacía sin romperse', () => {
    expect(baseLang('')).toBe('');
  });
});

describe('isRtlLang', () => {
  it('reconoce los tres RTL que la app ofrece', () => {
    expect(isRtlLang('ar-SA')).toBe(true);
    expect(isRtlLang('ur-PK')).toBe(true);
    expect(isRtlLang('fa-IR')).toBe(true);
  });

  it('no marca como RTL los que se escriben al revés', () => {
    for (const l of ['es', 'en', 'ja-JP', 'id', 'bn', 'hi', 'tr', 'sw', 'am']) {
      expect(isRtlLang(l), l).toBe(false);
    }
  });
});

describe('dirFor', () => {
  it('devuelve el valor exacto del atributo dir', () => {
    expect(dirFor('ar')).toBe('rtl');
    expect(dirFor('fa-IR')).toBe('rtl');
    expect(dirFor('ja')).toBe('ltr');
  });

  it('sin idioma, ltr: es el valor por defecto de HTML', () => {
    expect(dirFor('')).toBe('ltr');
  });
});

describe('langAttrs', () => {
  it('marca el urdu como RTL aunque la app esté en español', () => {
    expect(langAttrs('ur')).toBe(' lang="ur" dir="rtl"');
  });

  it('marca el español como LTR aunque la app esté en árabe', () => {
    expect(langAttrs('es-ES')).toBe(' lang="es" dir="ltr"');
  });

  it('sin idioma no ensucia el marcado con lang vacío', () => {
    expect(langAttrs('')).toBe('');
  });
});
