/**
 * Whisper, dentro del propio teléfono.
 *
 * Por qué existe. El reconocimiento del navegador (Web Speech API) tiene tres
 * límites que se notan justo el viernes: en iPhone no es de fiar, necesita
 * conexión —y la señal dentro de una mezquita de hormigón es la que es—, y
 * con la reverberación de una sala grande devuelve resultados vacíos.
 *
 * Esto ejecuta el modelo Whisper en el aparato. Es lo que hacen los proyectos
 * serios del ramo (MinbarLive, khutbah-live), solo que ellos necesitan un
 * mini-PC con GPU en la mezquita y esto cabe en el móvil que ya lleva puesto.
 *
 * Tres consecuencias, y la primera vale por las otras dos:
 *
 * 1. **El audio del sermón no sale del teléfono.** Nunca. Una jutba es una
 *    reunión religiosa; subirla a un servidor ajeno, aunque nadie la guarde,
 *    es pedir una confianza que no hace falta pedir.
 * 2. **Funciona sin conexión** una vez descargado el modelo, y sin cuota que
 *    se agote a mitad del sermón.
 * 3. **No cuesta dinero**, ni al usuario ni a nosotros.
 *
 * Va en un worker porque la inferencia bloquea el hilo donde corre: si
 * corriera en el de la pantalla, el subtítulo se congelaría justo mientras
 * traduce, que es cuando hay que leerlo.
 */
import { pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';

/** Lo que la pantalla puede pedirle a este worker. */
export type WhisperRequest =
  | { type: 'load'; model: string }
  | { type: 'transcribe'; id: number; audio: Float32Array; language: string };

/** Lo que el worker contesta. */
export type WhisperResponse =
  | { type: 'progress'; pct: number; file: string }
  | { type: 'ready'; device: string; ms: number }
  | { type: 'text'; id: number; text: string; ms: number }
  | { type: 'error'; message: string; id?: number };

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let device = 'wasm';
/**
 * La carga en curso. El micrófono empieza a recoger frases en cuanto se pulsa
 * «escuchar», pero la primera vez el modelo tarda un minuto en bajar: las
 * frases de ese minuto esperan aquí en vez de perderse con «not-loaded».
 */
let loading: Promise<void> | null = null;

const post = (msg: WhisperResponse): void => self.postMessage(msg);

/**
 * Carga el modelo, con WebGPU si el aparato lo tiene.
 *
 * Sin WebGPU funciona igual por WebAssembly, más despacio pero funciona: más
 * vale un subtítulo con tres segundos de retraso que una pantalla en blanco,
 * y en los teléfonos viejos —que son muchos en una mezquita— es lo que hay.
 */
/**
 * ¿Hay un adaptador WebGPU DE VERDAD?
 *
 * Que exista `navigator.gpu` no basta: en casi todos los Android (y en Chrome
 * sin GPU) el objeto está pero `requestAdapter()` devuelve null. Probar WebGPU
 * igualmente y caer a WebAssembly en el `catch` NO funciona: el intento
 * fallido deja roto el motor de ONNX dentro del worker, y la segunda carga
 * falla con el mismo «no available backend found. ERR: [webgpu]». Con eso el
 * modo «En este teléfono» no llegaba a cargar nunca en Android.
 */
async function webGpuAdapterAvailable(): Promise<boolean> {
  const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) return false;
  try {
    return (await gpu.requestAdapter()) !== null;
  } catch {
    return false;
  }
}

async function load(model: string): Promise<void> {
  const t0 = performance.now();
  const hasWebGPU = await webGpuAdapterAvailable();

  const options = {
    // q4 en el decodificador es la diferencia entre 290 MB y unos 80: en una
    // conexión de mezquita, esa descarga ocurre o no ocurre.
    dtype: { encoder_model: 'fp32' as const, decoder_model_merged: 'q4' as const },
    progress_callback: (p: { status: string; progress?: number; file?: string }) => {
      if (p.status === 'progress' && typeof p.progress === 'number') {
        post({ type: 'progress', pct: Math.round(p.progress), file: p.file ?? '' });
      }
    },
  };

  try {
    if (!hasWebGPU) throw new Error('sin webgpu');
    transcriber = await pipeline('automatic-speech-recognition', model, {
      ...options,
      device: 'webgpu',
    });
    device = 'webgpu';
  } catch {
    // `device: 'wasm'` explícito: sin él, transformers.js vuelve a elegir
    // WebGPU al ver `navigator.gpu`.
    transcriber = await pipeline('automatic-speech-recognition', model, {
      ...options,
      device: 'wasm',
    });
    device = 'wasm';
  }

  post({ type: 'ready', device, ms: Math.round(performance.now() - t0) });
}

/**
 * El modelo se descarga de Hugging Face, y a veces responde con un «Gateway
 * timeout» puntual. Antes bastaba UNO para que la escucha se quedara muerta
 * todo el sermón: cada frase contestaba «not-loaded» y nadie volvía a
 * intentar la descarga. Ahora se reintenta con esperas crecientes.
 */
const RETRY_WAIT_MS = [2000, 5000, 10000, 20000];
let lastModel = '';

async function loadWithRetry(model: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await load(model);
      return;
    } catch (err) {
      if (attempt >= RETRY_WAIT_MS.length) throw err;
      await new Promise((r) => setTimeout(r, RETRY_WAIT_MS[attempt]));
    }
  }
}

function startLoading(model: string): Promise<void> {
  lastModel = model;
  loading ??= loadWithRetry(model).finally(() => {
    loading = null;
  });
  return loading;
}

self.addEventListener('message', (ev: MessageEvent<WhisperRequest>) => {
  const msg = ev.data;
  void (async () => {
    try {
      if (msg.type === 'load') {
        if (transcriber) {
          post({ type: 'ready', device, ms: 0 });
          return;
        }
        await startLoading(msg.model);
        return;
      }

      // Si la descarga falló del todo, una frase nueva la vuelve a lanzar:
      // la conexión de la mezquita puede volver a mitad del sermón.
      if (!transcriber && !loading && lastModel) void startLoading(lastModel).catch(() => {});
      if (!transcriber && loading) await loading.catch(() => {});
      if (!transcriber) {
        post({ type: 'error', message: 'not-loaded', id: msg.id });
        return;
      }

      const t0 = performance.now();
      const out = await transcriber(msg.audio, {
        language: msg.language,
        // 'transcribe', no 'translate': Whisper traduce solo al inglés, y la
        // traducción la hace después el servidor al idioma que se pida, con
        // el glosario islámico y la verificación coránica.
        task: 'transcribe',
        return_timestamps: false,
      });
      const text = Array.isArray(out) ? (out[0]?.text ?? '') : (out.text ?? '');
      post({ type: 'text', id: msg.id, text, ms: Math.round(performance.now() - t0) });
    } catch (err) {
      post({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
        id: msg.type === 'transcribe' ? msg.id : undefined,
      });
    }
  })();
});
