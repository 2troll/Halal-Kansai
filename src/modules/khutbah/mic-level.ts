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
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onReading({ level: 0, state: 'unavailable' });
      return;
    }

    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
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
