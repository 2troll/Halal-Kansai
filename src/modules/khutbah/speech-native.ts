/**
 * Reconocimiento de voz NATIVO, para la app de Android y iOS.
 *
 * El problema que resuelve: dentro del contenedor de la app, el WebView no
 * reconoce voz. En iPhone no existe el motor, y en Android el de Chrome no
 * está disponible ahí. El modo «mi micrófono» quedaba oculto en las apps, que
 * es justo donde más falta hace.
 *
 * Se estudió mandar el audio a Whisper en el servidor. Esto es mejor por tres
 * razones, y la primera pesa más que las otras dos juntas:
 *
 * 1. **El audio no sale del teléfono.** Una jutba es una reunión religiosa.
 *    Subir el audio de un sermón a un servidor, aunque nadie lo guarde, es
 *    pedirle a la comunidad una confianza que no hace falta pedir.
 * 2. **No gasta cuota.** El reconocimiento va en el aparato: no hay
 *    asignación diaria que agotar a mitad del sermón del viernes.
 * 3. **Menos latencia.** No hay que subir audio ni esperar respuesta, y ya
 *    peleamos por bajar de 23 segundos a dos.
 *
 * Usa SFSpeechRecognizer (o SpeechAnalyzer en iOS 26+) y el SpeechRecognizer
 * de Android. La misma interfaz que `KhutbahListener` del navegador, para que
 * la pantalla de la jutba no tenga que saber en cuál de los dos está.
 */
import { isNative } from '../../backend';
import type { SpeechCallbacks } from './speech';

/** Términos que el reconocedor debe acertar sí o sí en una jutba. */
const CONTEXT_TERMS = [
  'الله',
  'الصلاة',
  'الزكاة',
  'التقوى',
  'القرآن',
  'رسول الله',
  'رمضان',
  'الجمعة',
];

/** Corta la frase cuando el orador hace una pausa, igual que en el navegador. */
const PAUSE_MS = 1200;
const MIN_FLUSH_CHARS = 12;

interface SpeechPlugin {
  available(): Promise<{ available: boolean }>;
  requestPermissions(): Promise<{ speechRecognition?: string; microphone?: string }>;
  start(options?: Record<string, unknown>): Promise<unknown>;
  stop(): Promise<void>;
  addListener(
    event: 'partialResults' | 'segmentResults' | 'error',
    fn: (ev: { matches?: string[]; accumulatedText?: string; message?: string }) => void,
  ): Promise<{ remove(): Promise<void> }>;
}

async function plugin(): Promise<SpeechPlugin | null> {
  if (!isNative()) return null;
  try {
    const mod = await import('@capgo/capacitor-speech-recognition');
    return mod.SpeechRecognition as unknown as SpeechPlugin;
  } catch {
    return null;
  }
}

/** ¿Puede esta app escuchar por el micrófono del teléfono? */
export async function nativeSpeechAvailable(): Promise<boolean> {
  const sr = await plugin();
  if (!sr) return false;
  try {
    return (await sr.available()).available;
  } catch {
    return false;
  }
}

/**
 * Escucha nativa. Misma forma que `KhutbahListener`: `start(locale)` y
 * `stop()`, y las mismas devoluciones de llamada.
 */
export class NativeKhutbahListener {
  private handles: Array<{ remove(): Promise<void> }> = [];
  private buffer = '';
  private pauseTimer: ReturnType<typeof setTimeout> | null = null;
  private active = false;

  constructor(private callbacks: SpeechCallbacks) {}

  async start(locale: string): Promise<void> {
    const sr = await plugin();
    if (!sr) {
      this.callbacks.onError('unsupported');
      return;
    }

    const permission = await sr.requestPermissions().catch(() => null);
    if (!permission || permission.speechRecognition === 'denied') {
      this.callbacks.onError('denied');
      return;
    }

    this.active = true;

    this.handles.push(
      await sr.addListener('partialResults', (ev) => {
        const text = ev.accumulatedText ?? ev.matches?.[0] ?? '';
        if (text) this.callbacks.onInterim(text);
      }),
    );

    this.handles.push(
      await sr.addListener('segmentResults', (ev) => {
        const text = ev.matches?.[0] ?? '';
        if (!text) return;
        this.buffer += (this.buffer ? ' ' : '') + text;
        this.armPauseFlush();
      }),
    );

    this.handles.push(
      await sr.addListener('error', (ev) => {
        // El reconocedor calla y reintenta solo entre frases: un silencio no
        // es un error que haya que enseñarle a nadie a mitad del sermón.
        const message = ev.message ?? '';
        if (/no-speech|no match|timeout/i.test(message)) return;
        this.callbacks.onError(message || 'speech');
      }),
    );

    await sr
      .start({
        language: locale,
        partialResults: true,
        popup: false,
        addPunctuation: true,
        contextualStrings: CONTEXT_TERMS,
      })
      .catch(() => this.callbacks.onError('start'));
  }

  async stop(): Promise<void> {
    this.active = false;
    this.clearPauseTimer();
    this.flush();

    const sr = await plugin();
    await sr?.stop().catch(() => {});
    for (const handle of this.handles) await handle.remove().catch(() => {});
    this.handles = [];
  }

  private armPauseFlush(): void {
    this.clearPauseTimer();
    if (this.buffer.trim().length < MIN_FLUSH_CHARS) return;
    this.pauseTimer = setTimeout(() => {
      this.pauseTimer = null;
      if (this.active) this.flush();
    }, PAUSE_MS);
  }

  private clearPauseTimer(): void {
    if (this.pauseTimer !== null) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }
  }

  private flush(): void {
    const text = this.buffer.trim();
    this.buffer = '';
    if (text) this.callbacks.onSentence(text);
  }
}
