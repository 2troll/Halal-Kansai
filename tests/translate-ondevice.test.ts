/**
 * Traducción on-device (ML Kit): lógica pura de selección de idioma.
 *
 * No se prueba la traducción real (necesita el móvil + el plugin nativo); se
 * prueba la decisión de SI usar on-device o caer al servidor, que es donde
 * están los errores fáciles (códigos de idioma, pares no soportados).
 */
import { describe, expect, it } from 'vitest';
import {
  toMlkitLang,
  mlkitCanTranslate,
  modelsNeeded,
  missingModels,
} from '../src/modules/khutbah/translate-ondevice.ts';

describe('toMlkitLang', () => {
  it('recorta el locale a código corto en minúsculas', () => {
    expect(toMlkitLang('ar-SA')).toBe('ar');
    expect(toMlkitLang('ja-JP')).toBe('ja');
    expect(toMlkitLang('ES')).toBe('es');
  });
});

describe('mlkitCanTranslate', () => {
  it('acepta pares soportados por ML Kit (árabe→japonés/español/inglés)', () => {
    expect(mlkitCanTranslate('ar-SA', 'ja-JP')).toBe(true);
    expect(mlkitCanTranslate('ar', 'es')).toBe(true);
    expect(mlkitCanTranslate('ur-PK', 'en')).toBe(true);
  });

  it('rechaza si origen y destino son el mismo idioma', () => {
    expect(mlkitCanTranslate('ar-SA', 'ar')).toBe(false);
  });

  it('rechaza un idioma que ML Kit no soporta (cae al servidor)', () => {
    // 'am' (amárico) no está en el set on-device de la app.
    expect(mlkitCanTranslate('am', 'es')).toBe(false);
  });
});

describe('modelsNeeded', () => {
  it('pide los dos idiomas del par', () => {
    expect(modelsNeeded('ar-SA', 'ja-JP')).toEqual(['ar', 'ja']);
  });

  it('no repite si origen y destino coinciden', () => {
    expect(modelsNeeded('es-ES', 'es')).toEqual(['es']);
  });

  it('descarta lo que ML Kit no soporta: para eso se usa el servidor', () => {
    expect(modelsNeeded('am', 'es')).toEqual(['es']);
    expect(modelsNeeded('am', 'am')).toEqual([]);
  });
});

describe('missingModels', () => {
  it('no vuelve a pedir lo que el teléfono ya tiene', () => {
    expect(missingModels(['ar', 'ja'], ['ar', 'ja'])).toEqual([]);
  });

  it('pide solo lo que falta', () => {
    expect(missingModels(['ar', 'ja'], ['ja'])).toEqual(['ar']);
  });

  it('no se deja engañar por mayúsculas del plugin', () => {
    expect(missingModels(['ar'], ['AR'])).toEqual([]);
  });

  it('si el teléfono no tiene nada, hacen falta todos', () => {
    expect(missingModels(['ar', 'es'], [])).toEqual(['ar', 'es']);
  });
});
