/**
 * Cuánto sonido le está entrando al teléfono, medido y enseñado.
 *
 * Por qué existe. El viernes en la mezquita la pantalla se quedaba muda y no
 * había forma de saber por qué: ¿está sordo el micrófono, está el imán
 * hablando en otro idioma, o está rota la aplicación? Las tres cosas se ven
 * igual desde la butaca. El reconocedor tampoco ayuda: cuando oye ruido que
 * no entiende devuelve un resultado FINAL VACÍO, sin error y sin texto.
 *
 * Esto mide la señal que entra por el micrófono, aparte del reconocedor, y
 * deja decir tres cosas distintas: «no te oigo», «te oigo muy flojo» y «te
 * oigo bien». Combinado con los resultados vacíos, la pantalla ya puede
 * distinguir «el micrófono está sordo» de «te oigo pero no es este idioma».
 *
 * Se pide el micrófono con el mismo procesado que usa el reconocimiento de
 * voz (cancelación de eco incluida) a propósito: medir una señal distinta de
 * la que se reconoce daría un indicador que miente.
 */

export type MicState = 'silence' | 'weak' | 'good' | 'unavailable';

/** Por debajo de esto, en la práctica, es el ruido de fondo de la sala. */
const SILENCE_DBFS = -50;
/** Entre esto y el silencio se oye, pero el reconocedor acierta poco. */
const WEAK_DBFS = -38;

/** Cada cuánto se refresca el indicador. Diez veces por segundo basta. */
const TICK_MS = 100;

export interface MicReading {
  /** 0..1 para pintar la barra. */
  level: number;
  state: MicState;
}

export class MicMeter {
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private peak = 0;

  /**
   * Abre el micrófono solo para medir. Si no puede (permiso denegado, otro
   * programa lo tiene, o el navegador no lo permite) avisa con 'unavailable'
   * y no vuelve a intentarlo: el reconocimiento de voz es lo importante y no
   * se toca.
   */
  async start(onReading: (r: MicReading) => void): Promise<void> {
    // Contexto creado durante el toque, antes de esperar al micrófono: en
    // Safari, creado después nace suspendido y el medidor marca silencio.
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      void this.ctx.resume().catch(() => {});
    } catch {
      onReading({ level: 0, state: 'unavailable' });
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onReading({ level: 0, state: 'unavailable' });
      this.stop();
      return;
    }

    try {
      if (!this.ctx) throw new Error('parado');
      await this.ctx.resume().catch(() => {});
      const source = this.ctx.createMediaStreamSource(this.stream);
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);

      const buf = new Float32Array(analyser.fftSize);
      this.timer = setInterval(() => {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += v * v;
        const rms = Math.sqrt(sum / buf.length);
        const dbfs = rms > 0 ? 20 * Math.log10(rms) : -100;

        // La barra sube al instante y baja despacio: un medidor que parpadea
        // con cada sílaba no se puede leer de reojo durante el sermón.
        const level = Math.max(0, Math.min(1, (dbfs + 60) / 60));
        this.peak = level > this.peak ? level : this.peak * 0.85 + level * 0.15;

        onReading({
          level: this.peak,
          state: dbfs < SILENCE_DBFS ? 'silence' : dbfs < WEAK_DBFS ? 'weak' : 'good',
        });
      }, TICK_MS);
    } catch {
      onReading({ level: 0, state: 'unavailable' });
      this.stop();
    }
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    for (const track of this.stream?.getTracks() ?? []) track.stop();
    this.stream = null;
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.peak = 0;
  }
}

/**
 * Umbrales del nivel que da el reconocedor de Android (`onRmsChanged`, en dB
 * relativos). Medido el 17-9-2026 en un Nothing Phone (2a): sala en silencio
 * entre −2 y 3 con picos sueltos; voz por un altavoz a un metro, media ≈ 4,5.
 * Como cada muestra salta mucho, el estado se decide sobre la media móvil.
 */
const NATIVE_SILENCE_DB = 1.5;
const NATIVE_WEAK_DB = 3;

/** Convierte una lectura nativa en la misma forma que el medidor del navegador. */
export function nativeReading(db: number, prevPeak: number, avgDb = db): MicReading {
  const level = Math.max(0, Math.min(1, (db + 2) / 12));
  const peak = level > prevPeak ? level : prevPeak * 0.85 + level * 0.15;
  return { level: peak, state: avgDb < NATIVE_SILENCE_DB ? 'silence' : avgDb < NATIVE_WEAK_DB ? 'weak' : 'good' };
}

interface RmsSource {
  addListener(event: 'rmsChanged', fn: (ev: { value?: number }) => void): Promise<{ remove(): Promise<void> }>;
}

/**
 * Medidor para la app nativa: escucha el nivel que ya calcula el reconocedor.
 *
 * NO abre el micrófono. Si el WebView graba a la vez que el reconocedor de
 * Android, el sistema silencia al reconocedor: la barra decía «estoy oyendo la
 * jutba» y no salía ni una frase (registro de audio: «VOICE_RECOGNITION
 * silenced»). Así fallaba la jutba en la mezquita.
 */
export class NativeMicMeter {
  private handle: { remove(): Promise<void> } | null = null;
  private stopped = false;
  private peak = 0;
  /** Media móvil (≈2 s) de los dB: una sílaba suelta no cambia el estado. */
  private avg: number | null = null;

  constructor(private source: RmsSource) {}

  async start(onReading: (r: MicReading) => void): Promise<void> {
    try {
      const handle = await this.source.addListener('rmsChanged', (ev) => {
        if (typeof ev.value !== 'number') return;
        this.avg = this.avg === null ? ev.value : this.avg * 0.9 + ev.value * 0.1;
        const reading = nativeReading(ev.value, this.peak, this.avg);
        this.peak = reading.level;
        onReading(reading);
      });
      if (this.stopped) void handle.remove().catch(() => {});
      else this.handle = handle;
    } catch {
      onReading({ level: 0, state: 'unavailable' });
    }
  }

  stop(): void {
    this.stopped = true;
    void this.handle?.remove().catch(() => {});
    this.handle = null;
    this.peak = 0;
    this.avg = null;
  }
}

/**
 * ¿Se puede medir el micrófono aparte mientras el navegador reconoce voz?
 *
 * En ordenador sí. En un móvil (Chrome de Android, Safari de iPhone) el
 * reconocimiento del navegador usa el mismo micrófono por debajo, y abrirlo
 * otra vez para el medidor hace que el sistema deje sordo al reconocedor. Es
 * lo que le pasó a quien lo probó en la mezquita: «te oigo» y ni una frase.
 */
export function canMeterAlongsideSpeech(ua: string, maxTouchPoints: number): boolean {
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return false;
  // iPad con iPadOS se presenta como Mac de escritorio, pero es táctil.
  if (/Macintosh/.test(ua) && maxTouchPoints > 1) return false;
  return true;
}
