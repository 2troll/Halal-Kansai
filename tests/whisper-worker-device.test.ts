/**
 * El worker de Whisper no debe intentar WebGPU si no hay adaptador.
 *
 * En casi todos los Android `navigator.gpu` existe pero `requestAdapter()`
 * devuelve null. Probar WebGPU y caer a WebAssembly en el `catch` dejaba roto
 * el motor de ONNX del worker: la segunda carga fallaba igual y el modo
 * «En este teléfono» no cargaba nunca. Aquí se fija que, sin adaptador, la
 * primera y única carga va directa a 'wasm'.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => [] as Array<Record<string, unknown>>);
vi.mock('@huggingface/transformers', () => ({
  pipeline: async (_task: string, _model: string, opts: Record<string, unknown>) => {
    calls.push(opts);
    if (opts.device === 'webgpu') throw new Error('no available backend found. ERR: [webgpu]');
    return async () => ({ text: 'ok' });
  },
}));

type Listener = (ev: { data: unknown }) => void;

async function loadWorker(gpu: unknown) {
  vi.resetModules();
  calls.length = 0;
  const posted: Array<Record<string, unknown>> = [];
  let onMessage: Listener = () => {};
  vi.stubGlobal('self', {
    addEventListener: (_: string, fn: Listener) => (onMessage = fn),
    postMessage: (m: Record<string, unknown>) => posted.push(m),
  });
  vi.stubGlobal('navigator', gpu === undefined ? {} : { gpu });
  await import('../src/modules/khutbah/whisper-worker.ts');
  onMessage({ data: { type: 'load', model: 'onnx-community/whisper-tiny' } });
  await vi.waitFor(() => expect(posted.some((m) => m.type === 'ready' || m.type === 'error')).toBe(true));
  return { posted, send: onMessage };
}

beforeEach(() => vi.unstubAllGlobals());

describe('whisper-worker: elección de dispositivo', () => {
  it('con navigator.gpu pero sin adaptador, carga directo en wasm', async () => {
    const { posted } = await loadWorker({ requestAdapter: async () => null });
    expect(calls.map((c) => c.device)).toEqual(['wasm']);
    expect(posted.find((m) => m.type === 'ready')).toMatchObject({ device: 'wasm' });
  });

  it('sin navigator.gpu, wasm', async () => {
    await loadWorker(undefined);
    expect(calls.map((c) => c.device)).toEqual(['wasm']);
  });

  it('con adaptador real intenta WebGPU primero', async () => {
    await loadWorker({ requestAdapter: async () => ({}) });
    expect(calls[0]!.device).toBe('webgpu');
  });

  it('una frase que llega durante la carga espera en vez de dar «not-loaded»', async () => {
    const { posted, send } = await loadWorker({ requestAdapter: async () => null });
    send({ data: { type: 'transcribe', id: 7, audio: new Float32Array(16000), language: 'ar' } });
    await vi.waitFor(() => expect(posted.some((m) => m.type === 'text')).toBe(true));
    expect(posted.filter((m) => m.type === 'error')).toEqual([]);
  });
});
