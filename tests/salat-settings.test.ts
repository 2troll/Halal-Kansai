import { beforeEach, describe, expect, it, vi } from 'vitest';
// i18n lee localStorage al cargarse; aquí solo importa la lógica de ajustes.
vi.mock('../src/i18n', () => ({ t: (k: string) => k }));

import { currentMethod, getMethodId, getSchool, setMethod, timezoneHours } from '../src/modules/salat/settings';
import { directionsUrl } from '../src/modules/places/directions';

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
  };
}

describe('ajustes de rezo', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()));

  it('por defecto MWL y Asr shafi‘i, como antes', () => {
    expect(getMethodId()).toBe('mwl');
    expect(getSchool()).toBe('shafii');
    expect(currentMethod()).toEqual({ fajrAngle: 18, ishaAngle: 17, asrFactor: 1 });
  });

  it('recuerda el método y la escuela elegidos', () => {
    setMethod('karachi', 'hanafi');
    expect(getMethodId()).toBe('karachi');
    expect(currentMethod().asrFactor).toBe(2);
  });

  it('un valor guardado desconocido vuelve al método por defecto', () => {
    localStorage.setItem('hk-salat-method', 'inventado');
    expect(getMethodId()).toBe('mwl');
  });

  it('sin almacenamiento disponible no revienta', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    });
    expect(getMethodId()).toBe('mwl');
    expect(() => setMethod('isna', 'hanafi')).not.toThrow();
  });

  it('la zona horaria sale del reloj del teléfono, no fija en Japón', () => {
    const fake = { getTimezoneOffset: () => -60 } as Date; // Madrid en invierno
    expect(timezoneHours(fake)).toBe(1);
    expect(timezoneHours({ getTimezoneOffset: () => -540 } as Date)).toBe(9);
  });
});

describe('cómo llegar', () => {
  it('URL universal de Google Maps con coordenadas, sin clave', () => {
    expect(directionsUrl(34.7146, 135.4534)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=34.714600,135.453400',
    );
  });
});
