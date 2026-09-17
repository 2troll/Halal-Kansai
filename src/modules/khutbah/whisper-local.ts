/**
 * Escucha la jutba con Whisper en el propio aparato.
 *
 * Misma forma que `KhutbahListener` (start/stop y las mismas devoluciones de
 * llamada), para que la pantalla no tenga que saber cuál de los tres motores
 * está usando.
 *
 * El corte de frases se hace por VOZ, no por texto. El reconocedor del
 * navegador iba avisando de lo que oía y se cortaba en las pausas del texto;
 * aquí no hay texto hasta que el modelo termina, así que hay que decidir por
 * el sonido cuándo ha acabado una frase. Es lo que hacen MinbarAI (Silero
 * VAD) y khutbah-live; aquí se hace por energía, que no necesita descargar
 * otro modelo y en una sala amplificada distingue de sobra voz de silencio.
 */
import type { SpeechCallbacks } from './speech';
import type { WhisperRequest, WhisperResponse } from './whisper-worker';

/** Whisper trabaja a 16 kHz mono; cualquier otra cosa hay que remuestrearla. */
const TARGET_RATE = 16000;

/**
 * Umbral de voz, relativo al ruido de la sala.
 *
 * Un valor fijo no vale: el mismo sermón llega a -20 dB si el móvil está en
 * la primera fila y a -45 dB desde el fondo. Con el umbral fijo, desde el
 * fondo solo cruzaban las sílabas fuertes, el resto contaba como silencio y
 * la frase se troceaba cada segundo y medio: tres palabras por subtítulo,
 * ilegible. Se mide el ruido de fondo de la sala y se exige voz por encima
 * de él.
 */
const VOICE_OVER_NOISE = 3.5;

/** Suelo absoluto: por debajo de esto es el propio siseo del micrófono. */
const NOISE_FLOOR_MIN = 0.0015;

/** Con qué rapidez se olvida el ruido de fondo antiguo. */
const NOISE_RISE = 0.002;
const NOISE_FALL = 0.05;

/** Silencio que cierra la frase, una vez que ya hay bastante dicho. */
const SILENCE_MS = 900;

/**
 * Silencio que cierra la frase SIEMPRE, aunque se haya dicho poco: el orador
 * ha parado de verdad. Sin esto, una frase corta seguida de una pausa larga
 * se quedaba esperando y llegaba tarde, pegada a la siguiente.
 */
const LONG_SILENCE_MS = 2000;

/**
 * Cuánto hay que tener acumulado antes de cortar por una pausa normal.
 *
 * Esto es lo que separa un subtítulo legible de un picadillo. Con el corte a
 * la primera pausa, Whisper recibía trozos de segundo y medio sin contexto y
 * devolvía picadillo —«وانيومين بميه»— que además se traducía al pie de la
 * letra. Medido con el sermón real: once fragmentos ilegibles. El modelo
 * necesita una frase entera para acertar, así que las pausas de respiración
 * se ignoran hasta llegar aquí.
 */
const MIN_SEGMENT_MS = 4000;

/** Nada más corto que esto merece pasar por el modelo: es una tos. */
const MIN_SPEECH_MS = 1200;

/**
 * Tope duro de frase. Whisper trabaja en ventanas de 30 s y, sobre todo, un
 * subtítulo que tarda veinte segundos en aparecer ya no acompaña al sermón.
 */
const MAX_SPEECH_MS = 14000;

/**
 * Lo que se guarda de ANTES de detectar la voz.
 *
 * El detector necesita unas décimas para estar seguro de que eso es voz, y en
 * ese rato ya se ha dicho la primera palabra. Sin este respaldo, cada frase
 * del sermón empezaba cortada.
 */
const PREROLL_MS = 300;

export type WhisperStatus =
  | { kind: 'loading'; pct: number }
  | { kind: 'ready'; device: string }
  | { kind: 'thinking' }
  | { kind: 'idle' };

/** Modelos, de menos a más: el aparato manda. */
export const WHISPER_MODELS = {
  /** ~80 MB. Teléfonos modestos y conexiones lentas. */
  tiny: 'onnx-community/whisper-tiny',
  /** ~150 MB. Bastante mejor con acento y reverberación. */
  base: 'onnx-community/whisper-base',
} as const;

export type WhisperSize = keyof typeof WHISPER_MODELS;

/** ¿Puede este aparato ejecutar el modelo con soltura? */
export function webGpuAvailable(): boolean {
  return 'gpu' in navigator;
}

export class WhisperKhutbahListener {
  private worker: Worker | null = null;
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private active = false;

  /** Audio de la frase en curso, a la frecuencia del micrófono. */
  private chunks: Float32Array[] = [];
  private preroll: Float32Array[] = [];
  private prerollSamples = 0;
  private speaking = false;
  /** Ruido de fondo estimado de la sala, en RMS. */
  private noiseFloor = NOISE_FLOOR_MIN;
  private silenceSamples = 0;
  private speechSamples = 0;
  private nextId = 1;
  private pending = 0;
  /** Idioma del sermón, fijado al arrancar (ar, ja, en…). */
  private language = 'ar';

  constructor(
    private callbacks: SpeechCallbacks,
    private onStatus: (s: WhisperStatus) => void = () => {},
    private size: WhisperSize = 'base',
  ) {}

  async start(locale: string): Promise<void> {
    this.language = locale.split('-')[0];

    // El contexto de audio se crea AQUÍ, antes de cualquier espera, mientras
    // dura el toque en «empezar». Safari (iPhone) solo deja sonar/grabar un
    // AudioContext nacido de un gesto; creado después de pedir el micrófono
    // nacía suspendido y el modelo no recibía ni un segundo de audio.
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    void this.ctx.resume().catch(() => {});

    this.worker = new Worker(new URL('./whisper-worker.ts', import.meta.url), {
      type: 'module',
    });

    this.worker.addEventListener('message', (ev: MessageEvent<WhisperResponse>) => {
      const msg = ev.data;
      if (msg.type === 'progress') this.onStatus({ kind: 'loading', pct: msg.pct });
      else if (msg.type === 'ready') this.onStatus({ kind: 'ready', device: msg.device });
      else if (msg.type === 'error') {
        // Si falló una frase, deja de contarse como pendiente: si no, la
        // pantalla se queda en «transcribiendo…» para siempre.
        if (msg.id !== undefined) {
          this.pending = Math.max(0, this.pending - 1);
          if (this.pending === 0) this.onStatus({ kind: 'idle' });
        }
        this.callbacks.onError(msg.message);
      }
      else if (msg.type === 'text') {
        this.pending = Math.max(0, this.pending - 1);
        if (this.pending === 0) this.onStatus({ kind: 'idle' });
        const text = clean(msg.text);
        if (!text) {
          this.callbacks.onNoMatch?.();
          return;
        }
        this.callbacks.onHeard?.();
        this.callbacks.onSentence(text);
      }
    });

    this.post({ type: 'load', model: WHISPER_MODELS[this.size] });

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        // Con el procesado del navegador puesto (supresión de ruido y control
        // de ganancia), que es lo que usa el reconocedor del navegador: con
        // el mismo micrófono y el mismo sermón, ese daba frases enteras.
        //
        // La cancelación de eco sí se quita: solo sirve para descontar lo que
        // suena por el altavoz del propio aparato, y en una mezquita el
        // sermón viene de fuera. Dejarla puesta fue lo que borró el audio en
        // la primera prueba, cuando la jutba sonaba en otra pestaña.
        audio: {
          echoCancellation: false,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch {
      this.callbacks.onError('denied');
      return;
    }

    if (!this.ctx) {
      // Se paró mientras se pedía el micrófono: soltarlo.
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
      return;
    }
    await this.ctx.resume().catch(() => {});
    const source = this.ctx.createMediaStreamSource(this.stream);

    // El audio se recoge en el hilo de audio (ver public/vad-worklet.js): en
    // el hilo de la pantalla se perdían bloques mientras el modelo trabajaba,
    // y una frase con agujeros hace que Whisper invente.
    try {
      // La versión en la consulta debe coincidir con WORKLET_PATH en sw.js:
      // el fichero no lleva hash y, sin subirla, el navegador serviría el
      // viejo desde la caché para siempre.
      await this.ctx.audioWorklet.addModule('/vad-worklet.js?v=1');
    } catch {
      this.callbacks.onError('audioCapture');
      return;
    }
    this.node = new AudioWorkletNode(this.ctx, 'vad-collector');
    this.node.port.onmessage = (ev: MessageEvent<{ audio: Float32Array; rms: number }>) =>
      this.onAudio(ev.data.audio, ev.data.rms);
    source.connect(this.node);

    this.active = true;
  }

  async stop(): Promise<void> {
    this.active = false;
    // Lo que se estuviera diciendo al pulsar «parar» todavía cuenta.
    if (this.speaking) this.flush();
    if (this.node) {
      this.node.port.onmessage = null;
      this.node.disconnect();
      this.node = null;
    }
    for (const track of this.stream?.getTracks() ?? []) track.stop();
    this.stream = null;
    await this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.worker?.terminate();
    this.worker = null;
    this.onStatus({ kind: 'idle' });
  }

  private post(msg: WhisperRequest): void {
    this.worker?.postMessage(msg);
  }

  /** Decide, trozo a trozo, si hay voz y cuándo ha terminado la frase. */
  private onAudio(data: Float32Array, rms: number): void {
    if (!this.active) return;
    const rate = this.ctx?.sampleRate ?? TARGET_RATE;

    // El ruido baja deprisa y sube despacio: así una tos no lo dispara, y al
    // entrar en una sala más ruidosa el umbral se adapta en segundos.
    if (!this.speaking) {
      const rate = rms < this.noiseFloor ? NOISE_FALL : NOISE_RISE;
      this.noiseFloor = this.noiseFloor * (1 - rate) + rms * rate;
      if (this.noiseFloor < NOISE_FLOOR_MIN) this.noiseFloor = NOISE_FLOOR_MIN;
    }
    const threshold = this.noiseFloor * VOICE_OVER_NOISE;

    if (rms >= threshold) {
      if (!this.speaking) {
        this.speaking = true;
        this.chunks = [...this.preroll];
        this.speechSamples = this.prerollSamples;
        this.preroll = [];
        this.prerollSamples = 0;
      }
      this.silenceSamples = 0;
      this.chunks.push(data);
      this.speechSamples += data.length;
      if (this.speechSamples / rate >= MAX_SPEECH_MS / 1000) this.flush();
      return;
    }

    if (this.speaking) {
      // El silencio dentro de la frase se guarda: quitarlo pega las palabras.
      this.chunks.push(data);
      this.speechSamples += data.length;
      this.silenceSamples += data.length;

      const spoken = this.speechSamples / rate;
      const quiet = this.silenceSamples / rate;
      const enough = spoken >= MIN_SEGMENT_MS / 1000 && quiet >= SILENCE_MS / 1000;
      const stopped = quiet >= LONG_SILENCE_MS / 1000;
      if (enough || stopped) this.flush();
      return;
    }

    this.preroll.push(data);
    this.prerollSamples += data.length;
    const maxPreroll = (PREROLL_MS / 1000) * rate;
    while (this.prerollSamples > maxPreroll && this.preroll.length > 1) {
      this.prerollSamples -= this.preroll.shift()!.length;
    }
  }

  /** Manda al modelo la frase acumulada. */
  private flush(): void {
    const rate = this.ctx?.sampleRate ?? TARGET_RATE;
    const chunks = this.chunks;
    const samples = this.speechSamples;
    this.chunks = [];
    this.speaking = false;
    this.silenceSamples = 0;
    this.speechSamples = 0;

    if (samples / rate < MIN_SPEECH_MS / 1000) return;

    const joined = new Float32Array(samples);
    let at = 0;
    for (const c of chunks) {
      joined.set(c, at);
      at += c.length;
    }
    const audio = normalize(rate === TARGET_RATE ? joined : downsample(joined, rate, TARGET_RATE));

    this.pending++;
    this.onStatus({ kind: 'thinking' });
    this.post({
      type: 'transcribe',
      id: this.nextId++,
      audio,
      language: this.language,
    });
  }

}

/**
 * Remuestreo por promediado de ventana.
 *
 * El micrófono suele dar 48 kHz y Whisper quiere 16 kHz. Coger una muestra de
 * cada tres (que es lo primero que uno escribe) mete aliasing y el modelo
 * empieza a inventar palabras; promediar la ventana no.
 */
function downsample(input: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return input;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), input.length);
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    out[i] = end > start ? sum / (end - start) : 0;
  }
  return out;
}

/**
 * Sube el volumen de la frase antes de dárselo al modelo.
 *
 * Sin el control de ganancia del navegador, un sermón captado a diez metros
 * llega muy flojo, y Whisper con señal débil se inventa palabras. Se escala
 * al 95 % del máximo: es la misma frase, más alta, sin recortar picos.
 */
function normalize(audio: Float32Array): Float32Array {
  let peak = 0;
  for (const v of audio) {
    const abs = Math.abs(v);
    if (abs > peak) peak = abs;
  }
  // Silencio absoluto o ya al máximo: no hay nada que ganar tocándolo.
  if (peak < 1e-4 || peak > 0.95) return audio;
  const gain = 0.95 / peak;
  const out = new Float32Array(audio.length);
  for (let i = 0; i < audio.length; i++) out[i] = audio[i] * gain;
  return out;
}

/**
 * Whisper, cuando no oye nada claro, rellena con muletillas aprendidas de los
 * subtítulos con los que se entrenó: «Gracias por ver el vídeo», música entre
 * corchetes, puntos suspensivos. Eso en una jutba no puede aparecer.
 */
const HALLUCINATIONS =
  /^(\[.*\]|\(.*\)|[.…·\s]*|شكرا(\s|لكم|على المشاهدة)*|ترجمة.*|subscribe.*|thank you for watching.*|thanks for watching.*|ご視聴ありがとうございました。?|字幕.*)$/i;

/** Palabras mínimas para que un fragmento merezca ocupar el subtítulo. */
const MIN_WORDS = 2;

export function clean(text: string): string {
  const trimmed = text.trim();
  if (!trimmed || HALLUCINATIONS.test(trimmed)) return '';
  // Una palabra suelta arrancada de una frase se traduce mal y confunde más
  // de lo que ayuda: mejor esperar a la siguiente.
  if (trimmed.split(/\s+/).length < MIN_WORDS) return '';
  return trimmed;
}
