/**
 * Escucha nativa de la jutba con un plugin falso.
 *
 * El micrófono no se puede probar en el emulador ni en CI, pero lo que rompía
 * la jutba en Android no era el micrófono: era qué hacía la app cuando el
 * reconocedor del sistema cerraba la sesión tras una pausa (se quedaba muda)
 * y que nunca pedía frases completas. Eso sí se puede fijar aquí.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (ev: Record<string, unknown>) => void;

const fake = vi.hoisted(() => {
  const state = {
    handlers: new Map<string, Handler[]>(),
    starts: [] as Array<Record<string, unknown>>,
    failNextStarts: 0,
    stopped: 0,
  };
  const plugin = {
    available: async () => ({ available: true }),
    requestPermissions: async () => ({ speechRecognition: 'granted' }),
    start: async (opts: Record<string, unknown>) => {
      state.starts.push(opts);
      if (state.failNextStarts > 0) {
        state.failNextStarts -= 1;
        throw new Error('busy');
      }
    },
    stop: async () => {
      state.stopped += 1;
    },
    addListener: async (event: string, fn: Handler) => {
      const list = state.handlers.get(event) ?? [];
      list.push(fn);
      state.handlers.set(event, list);
      return { remove: async () => {} };
    },
  };
  return { state, plugin };
});

vi.mock('@capacitor/core', () => ({ registerPlugin: () => fake.plugin }));
vi.mock('../src/backend', () => ({ isNative: () => true }));

import { NativeKhutbahListener } from '../src/modules/khutbah/speech-native.ts';

function emit(event: string, payload: Record<string, unknown>): void {
  for (const fn of fake.state.handlers.get(event) ?? []) fn(payload);
}

function makeListener() {
  const sentences: string[] = [];
  const errors: string[] = [];
  const listener = new NativeKhutbahListener({
    onSentence: (t: string) => sentences.push(t),
    onInterim: () => {},
    onError: (e: string) => errors.push(e),
    onDegenerate: () => {},
  } as never);
  return { listener, sentences, errors };
}

beforeEach(() => {
  vi.useFakeTimers();
  fake.state.handlers.clear();
  fake.state.starts.length = 0;
  fake.state.failNextStarts = 0;
  fake.state.stopped = 0;
});
afterEach(() => vi.useRealTimers());

describe('NativeKhutbahListener', () => {
  it('pide sesión segmentada y sin pitido', async () => {
    const { listener } = makeListener();
    await listener.start('ar-SA');
    expect(fake.state.starts[0]).toMatchObject({
      language: 'ar-SA',
      partialResults: true,
      muteRecognizerBeep: true,
    });
    expect(fake.state.starts[0]!.allowForSilence).toBeGreaterThan(0);
  });

  it('vuelve a escuchar cuando el sistema cierra la sesión tras una pausa', async () => {
    const { listener } = makeListener();
    await listener.start('ar-SA');
    emit('listeningState', { status: 'stopped', state: 'stopped' });
    emit('listeningState', { state: 'idle' }); // mismo cierre, avisado dos veces
    await vi.advanceTimersByTimeAsync(1000);
    expect(fake.state.starts).toHaveLength(2);
  });

  it('no se rinde por muchos silencios (se abre durante el adhan)', async () => {
    const { listener, errors } = makeListener();
    await listener.start('ar-SA');
    for (let i = 0; i < 200; i++) {
      emit('error', { message: 'No speech input', code: 'SPEECH_TIMEOUT' });
      emit('listeningState', { status: 'stopped' });
      await vi.advanceTimersByTimeAsync(1000);
    }
    expect(errors).toEqual([]);
    expect(fake.state.starts.length).toBeGreaterThan(150);
  });

  it('convierte los segmentos en frases tras la pausa', async () => {
    const { listener, sentences } = makeListener();
    await listener.start('ar-SA');
    emit('segmentResults', { matches: ['الحمد لله رب العالمين'] });
    await vi.advanceTimersByTimeAsync(2000);
    expect(sentences).toEqual(['الحمد لله رب العالمين']);
  });

  it('en iOS (sin segmentos) lo último oído sale como frase al cerrar la sesión', async () => {
    const { listener, sentences } = makeListener();
    await listener.start('ar-SA');
    emit('partialResults', { matches: ['اتقوا الله وأحسنوا إلى جيرانكم'] });
    emit('listeningState', { status: 'stopped' });
    expect(sentences).toEqual(['اتقوا الله وأحسنوا إلى جيرانكم']);
  });

  it('no repite una frase que ya llegó como segmento', async () => {
    const { listener, sentences } = makeListener();
    await listener.start('ar-SA');
    emit('partialResults', { matches: ['الحمد لله رب العالمين'] });
    emit('segmentResults', { matches: ['الحمد لله رب العالمين'] });
    emit('listeningState', { status: 'stopped' });
    await vi.advanceTimersByTimeAsync(2000);
    expect(sentences).toEqual(['الحمد لله رب العالمين']);
  });

  it('reintenta si falla al reabrir y avisa solo tras varios fallos seguidos', async () => {
    const { listener, errors } = makeListener();
    await listener.start('ar-SA');
    fake.state.failNextStarts = 2;
    emit('listeningState', { status: 'stopped' });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(errors).toEqual([]);
    expect(fake.state.starts.length).toBe(4);

    fake.state.failNextStarts = 99;
    emit('listeningState', { status: 'stopped' });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(errors).toEqual(['start']);
  });

  it('un error real sí se muestra', async () => {
    const { listener, errors } = makeListener();
    await listener.start('ar-SA');
    emit('error', { message: 'Network error', code: 'NETWORK' });
    expect(errors).toEqual(['Network error']);
  });

  it('al parar no vuelve a abrir el micrófono', async () => {
    const { listener } = makeListener();
    await listener.start('ar-SA');
    await listener.stop();
    emit('listeningState', { status: 'stopped' });
    await vi.advanceTimersByTimeAsync(5000);
    expect(fake.state.starts).toHaveLength(1);
    expect(fake.state.stopped).toBe(1);
  });
});
