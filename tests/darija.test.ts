/**
 * Dariya en la jutba: el servidor va primero (ML Kit no entiende el dialecto)
 * y el móvil solo sirve de respaldo sin red.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({ server: 0, device: 0, serverFails: false }));

vi.mock('../src/modules/khutbah/translate', () => ({
  translateSegment: async (text: string) => {
    calls.server++;
    if (calls.serverFails) throw new Error('sin red');
    return { kind: 'speech', translation: `[servidor] ${text}`, original: text, verified: false };
  },
}));
vi.mock('@capacitor/core', () => ({
  registerPlugin: () => ({
    translate: async ({ text }: { text: string }) => {
      calls.device++;
      return { text: `[móvil] ${text}` };
    },
  }),
}));
vi.mock('../src/backend', () => ({ isNative: () => true }));

import { isDialect, translateSegmentSmart } from '../src/modules/khutbah/translate-ondevice';
import { SOURCE_LOCALES } from '../src/modules/khutbah/speech';

beforeEach(() => {
  calls.server = 0;
  calls.device = 0;
  calls.serverFails = false;
});

describe('dariya', () => {
  it('está en la lista de idiomas de la jutba', () => {
    expect(SOURCE_LOCALES.map((l) => l.code)).toEqual(expect.arrayContaining(['ar-MA', 'ar-DZ']));
  });

  it('solo marroquí y argelino son dialecto; el árabe estándar no', () => {
    expect(isDialect('ar-MA')).toBe(true);
    expect(isDialect('ar-dz')).toBe(true);
    expect(isDialect('ar-SA')).toBe(false);
  });

  it('dariya → servidor primero', async () => {
    const seg = await translateSegmentSmart('wach fhemtou', 'ar-MA', 'es');
    expect(seg.translation).toContain('[servidor]');
    expect(calls.device).toBe(0);
  });

  it('dariya sin red → el móvil como respaldo', async () => {
    calls.serverFails = true;
    const seg = await translateSegmentSmart('wach fhemtou', 'ar-MA', 'es');
    expect(seg.translation).toContain('[móvil]');
    expect(seg.translationSource).toBe('ondevice');
  });

  it('árabe estándar → el móvil primero, como siempre', async () => {
    const seg = await translateSegmentSmart('الحمد لله', 'ar-SA', 'es');
    expect(seg.translation).toContain('[móvil]');
    expect(calls.server).toBe(0);
  });
});
