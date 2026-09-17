import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/backend', () => ({ apiUrl: (p: string) => p, isNative: () => true }));
vi.stubGlobal('__APP_VERSION__', '1.0.0');

import { submitFeedback } from '../src/modules/guide/feedback';

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.stubGlobal('__APP_VERSION__', '1.0.0');
});

describe('envío de opiniones', () => {
  it('una conexión colgada (VPN/bloqueador) acaba en cola a los 8 s, no espera para siempre', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', memoryStorage());
    vi.stubGlobal('navigator', { userAgent: 'Android' });
    vi.stubGlobal('fetch', (_: string, init: RequestInit) =>
      new Promise((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(new Error('abort')))),
    );
    const pending = submitFeedback({ kind: 'bug', message: 'el mapa no carga' });
    await vi.advanceTimersByTimeAsync(8000);
    await expect(pending).resolves.toBe('queued');
    expect(localStorage.getItem('hk-feedback-queue')).toContain('el mapa no carga');
  });
});
