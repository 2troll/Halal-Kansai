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
import { registerPlugin } from '@capacitor/core';
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

interface SpeechEvent {
  matches?: string[];
  accumulatedText?: string;
  message?: string;
  code?: string;
  state?: string;
  status?: 'started' | 'stopped';
  /** rmsChanged: nivel del micrófono en dB relativos. */
  value?: number;
}

interface SpeechPlugin {
  available(): Promise<{ available: boolean }>;
  requestPermissions(): Promise<{ speechRecognition?: string; microphone?: string }>;
  checkPermissions(): Promise<{ speechRecognition?: string; microphone?: string }>;
  start(options?: Record<string, unknown>): Promise<unknown>;
  stop(): Promise<void>;
  addListener(
    event: 'partialResults' | 'segmentResults' | 'error' | 'listeningState' | 'rmsChanged',
    fn: (ev: SpeechEvent) => void,
  ): Promise<{ remove(): Promise<void> }>;
}

/**
 * El plugin nativo, por su nombre registrado (el mismo que usa el JS del
 * propio paquete).
 *
 * Antes salía de una función `async` que hacía `return mod.SpeechRecognition`.
 * Un objeto de plugin de Capacitor es un Proxy que responde a CUALQUIER
 * propiedad, también a `then`: al resolver la promesa, JavaScript lo tomó por
 * una promesa, llamó a `.then()` y Android contestó «"SpeechRecognition.then()"
 * is not implemented». La escucha nunca arrancaba. Por eso aquí es síncrono y
 * el plugin no se devuelve nunca desde una función `async`.
 */
const SpeechRecognition = registerPlugin<SpeechPlugin>('SpeechRecognition');

function plugin(): SpeechPlugin | null {
  return isNative() ? SpeechRecognition : null;
}

/** ¿Puede esta app escuchar por el micrófono del teléfono? */
/** El plugin, para la pantalla de permisos. */
export function speechPlugin(): SpeechPlugin {
  return SpeechRecognition;
}

export async function nativeSpeechAvailable(): Promise<boolean> {
  const sr = plugin();
  if (!sr) return false;
  try {
    return (await sr.available()).available;
  } catch {
    return false;
  }
}

/** Silencios y «no te he entendido»: normales entre frases, no son errores. */
const SILENCE_ERROR = /no[- ]?speech|no match|timeout|didn.t understand/i;

/** Cuánto esperar antes de volver a abrir el micrófono tras cerrar sesión. */
const RESTART_MS = 250;

/**
 * Aperturas fallidas seguidas antes de rendirse. Los silencios NO cuentan:
 * quien abre la escucha durante el adhan puede esperar diez minutos callado.
 */
const MAX_FAILED_STARTS = 5;

/**
 * Escucha nativa. Misma forma que `KhutbahListener`: `start(locale)` y
 * `stop()`, y las mismas devoluciones de llamada.
 *
 * Tres cosas que el reconocedor del sistema NO hace solo, y sin las cuales la
 * jutba en Android traducía como mucho una frase y se quedaba muda:
 *
 * 1. **Frases.** Android solo manda `segmentResults` en una sesión
 *    segmentada, que se pide con `allowForSilence`. Sin eso no llegaba nunca
 *    una frase completa, solo texto provisional.
 * 2. **Seguir escuchando.** La sesión se cierra tras la primera pausa larga
 *    (Android e iOS). Mientras estemos activos, se vuelve a abrir.
 * 3. **La última frase.** iOS no tiene segmentos: lo último que se oyó llega
 *    como resultado provisional y, al cerrarse la sesión, se da por frase.
 */
export class NativeKhutbahListener {
  private handles: Array<{ remove(): Promise<void> }> = [];
  private buffer = '';
  private lastInterim = '';
  private pauseTimer: ReturnType<typeof setTimeout> | null = null;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private failedStarts = 0;
  private locale = '';
  private active = false;

  constructor(private callbacks: SpeechCallbacks) {}

  async start(locale: string): Promise<void> {
    const sr = plugin();
    if (!sr) {
      this.callbacks.onError('unsupported');
      return;
    }

    const permission = await sr.requestPermissions().catch(() => null);
    if (!permission || permission.speechRecognition === 'denied') {
      this.callbacks.onError('denied');
      return;
    }

    this.locale = locale;
    this.active = true;
    this.failedStarts = 0;

    this.handles.push(
      await sr.addListener('partialResults', (ev) => {
        const text = ev.accumulatedText ?? ev.matches?.[0] ?? '';
        if (!text) return;
        this.lastInterim = text;
        this.callbacks.onInterim(text);
      }),
    );

    this.handles.push(
      await sr.addListener('segmentResults', (ev) => {
        const text = ev.matches?.[0] ?? '';
        this.lastInterim = '';
        if (!text) return;
        this.buffer += (this.buffer ? ' ' : '') + text;
        this.armPauseFlush();
      }),
    );

    this.handles.push(
      await sr.addListener('error', (ev) => {
        // El reconocedor calla y se reabre solo entre frases: un silencio no
        // es un error que haya que enseñarle a nadie a mitad del sermón.
        const message = ev.message ?? '';
        if (SILENCE_ERROR.test(message) || SILENCE_ERROR.test(ev.code ?? '')) return;
        // Un «ocupado» al reabrir se resuelve reabriendo un poco después.
        if (/busy/i.test(message)) return;
        this.callbacks.onError(message || 'speech');
      }),
    );

    this.handles.push(
      await sr.addListener('listeningState', (ev) => {
        const stopped = ev.status === 'stopped' || ev.state === 'stopped' || ev.state === 'idle';
        if (!stopped || !this.active) return;
        this.onSessionEnded();
      }),
    );

    await this.openSession();
  }

  async stop(): Promise<void> {
    this.active = false;
    this.clearPauseTimer();
    if (this.restartTimer !== null) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    this.takeLastInterim();
    this.flush();

    const sr = plugin();
    await sr?.stop().catch(() => {});
    for (const handle of this.handles) await handle.remove().catch(() => {});
    this.handles = [];
  }

  private async openSession(): Promise<void> {
    const sr = plugin();
    if (!sr || !this.active) return;
    await sr
      .start({
        language: this.locale,
        partialResults: true,
        popup: false,
        addPunctuation: true,
        contextualStrings: CONTEXT_TERMS,
        // Android: sesión segmentada, una frase por pausa (ver punto 1).
        allowForSilence: PAUSE_MS,
        // Android pita al abrir el micrófono; reabriéndolo cada pocos
        // segundos, sonaría en plena mezquita.
        muteRecognizerBeep: true,
      })
      .then(() => {
        this.failedStarts = 0;
      })
      .catch(() => {
        if (!this.active) return;
        this.failedStarts += 1;
        if (this.failedStarts >= MAX_FAILED_STARTS) {
          this.active = false;
          this.callbacks.onError('start');
          return;
        }
        // Sin sesión abierta no llegará ningún «stopped»: reintentar aquí.
        this.scheduleRestart(RESTART_MS * 4 * this.failedStarts);
      });
  }

  private onSessionEnded(): void {
    this.takeLastInterim();
    this.flush();
    this.scheduleRestart(RESTART_MS);
  }

  private scheduleRestart(delayMs: number): void {
    // Android avisa «stopped» e «idle» del mismo cierre: una sola reapertura.
    if (this.restartTimer !== null || !this.active) return;
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      void this.openSession();
    }, delayMs);
  }

  /** Lo último oído que no llegó como segmento se trata como frase (iOS). */
  private takeLastInterim(): void {
    const text = this.lastInterim.trim();
    this.lastInterim = '';
    if (text) this.buffer += (this.buffer ? ' ' : '') + text;
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
    this.clearPauseTimer();
    const text = this.buffer.trim();
    this.buffer = '';
    if (text) this.callbacks.onSentence(text);
  }
}
