/**
 * Captura de voz con Web Speech API (continuous + interim) y buffer por frases.
 * Chrome Android es el objetivo principal; la lista de locales de origen
 * mantiene solo los probados (SpeechRecognition no expone los soportados).
 */
import { isNative } from '../../backend';


/* Web Speech API no está en lib.dom completa: tipos mínimos propios. */
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  start(): void;
  stop(): void;
}

/**
 * Locales de origen probados en Chrome Android (spec §5).
 *
 * El orden importa más de lo que parece: el primero es el que sale elegido
 * para quien nunca ha tocado el desplegable, y escuchar una jutba en árabe
 * con el reconocedor puesto en urdu no devuelve ni una palabra — devuelve
 * resultados vacíos, que en pantalla se ven igual que una aplicación rota.
 *
 * El orden es el de las mezquitas de Kansai, no el que uno supondría: la
 * parte ritual va en árabe, y el sermón lo dan en urdu (comunidad
 * paquistaní), en indonesio o malayo, y a veces en inglés. En japonés casi
 * nunca, aunque la mezquita esté en Japón: el japonés es la lengua a la que
 * se TRADUCE, no en la que se predica.
 */
export const SOURCE_LOCALES: Array<{ code: string; label: string }> = [
  { code: 'ar-SA', label: 'العربية' },
  { code: 'ur-PK', label: 'اردو (Urdu)' },
  { code: 'id-ID', label: 'Bahasa Indonesia' },
  { code: 'ms-MY', label: 'Bahasa Melayu' },
  { code: 'en-US', label: 'English' },
  { code: 'bn-BD', label: 'বাংলা (Bangla)' },
  { code: 'ja-JP', label: '日本語' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)' },
  { code: 'ne-NP', label: 'नेपाली (Nepali)' },
  { code: 'ta-IN', label: 'தமிழ் (Tamil)' },
  { code: 'si-LK', label: 'සිංහල (Sinhala)' },
  { code: 'tr-TR', label: 'Türkçe' },
  { code: 'fa-IR', label: 'فارسی' },
  { code: 'vi-VN', label: 'Tiếng Việt' },
  { code: 'th-TH', label: 'ไทย' },
  { code: 'fil-PH', label: 'Filipino' },
  { code: 'zh-CN', label: '中文' },
  { code: 'uz-UZ', label: "O'zbekcha" },
  { code: 'ru-RU', label: 'Русский' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'es-ES', label: 'Español' },
  { code: 'my-MM', label: 'မြန်မာ (Burmese)' },
  { code: 'sw-TZ', label: 'Kiswahili' },
  { code: 'am-ET', label: 'አማርኛ (Amharic)' },
];

/** Idiomas de destino (el LLM traduce a cualquiera). */
export const TARGET_LANGS: Array<{ code: string; label: string }> = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'ur', label: 'اردو' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ja', label: '日本語' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ne', label: 'नेपाली' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'si', label: 'සිංහල' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ms', label: 'Bahasa Melayu' },
  { code: 'fa', label: 'فارسی' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'th', label: 'ไทย' },
  { code: 'fil', label: 'Filipino' },
  { code: 'zh', label: '中文' },
  { code: 'uz', label: "O'zbekcha" },
  { code: 'ru', label: 'Русский' },
  { code: 'fr', label: 'Français' },
  { code: 'my', label: 'မြန်မာ' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'am', label: 'አማርኛ' },
];

export interface SpeechCallbacks {
  /** Frase completa lista para traducir. */
  onSentence: (text: string) => void;
  /** Texto provisional (interim) para feedback inmediato. */
  onInterim: (text: string) => void;
  onError: (error: string) => void;
  /**
   * El reconocedor está devolviendo resultados vacíos: oye algo y no saca
   * palabras. Casi siempre es que el sermón no está en el idioma elegido, o
   * que el teléfono está demasiado lejos del altavoz. Sin esto, la pantalla
   * se queda muda y parece que la aplicación está rota (ocurrió en la
   * mezquita, con el sermón empezado, y no había forma de saber qué pasaba).
   */
  onNoMatch?: () => void;
  /** Ha entrado texto de verdad: se acabó cualquier aviso anterior. */
  onHeard?: () => void;
}

const SENTENCE_END = /[.!?。؟।…]\s*$/;

/**
 * Cuándo se manda a traducir lo acumulado.
 *
 * Antes solo se soltaba con un signo de puntuación o a los 160 caracteres. El
 * reconocimiento de árabe casi nunca devuelve puntuación, así que en la
 * práctica había que llenar los 160: más de veinte segundos de sermón antes
 * de ver la primera palabra traducida. Inservible en una jutba.
 *
 * Ahora manda la PAUSA del orador, que es la unidad natural del habla: en
 * cuanto deja de llegar texto durante `PAUSE_MS`, se traduce lo que haya.
 */
const PAUSE_MS = 1200;

/** Tope duro: si alguien habla seguido sin respirar, no esperamos a la pausa. */
const MAX_BUFFER_CHARS = 90;

/** Por debajo de esto no se manda: una palabra suelta se traduce fatal. */
const MIN_FLUSH_CHARS = 12;

/**
 * Cuántos resultados finales vacíos seguidos hacen falta para avisar.
 *
 * Uno suelto es normal: una tos, una pausa, un ruido. Tres seguidos ya no:
 * está entrando sonido y no sale ni una palabra, y eso hay que decirlo.
 */
const EMPTY_FINALS_TO_WARN = 3;

/** Espera antes de volver a arrancar el reconocedor cuando Chrome lo corta. */
const RESTART_MS = 250;

/**
 * Nombres del navegador → nombres que la pantalla sabe explicar.
 *
 * `not-allowed` no le dice nada a nadie en mitad de un sermón; «falta el
 * permiso del micrófono» sí.
 */
function errorCode(error: string): string {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'denied';
    case 'audio-capture':
      return 'audioCapture';
    case 'network':
      return 'network';
    case 'language-not-supported':
    case 'bad-grammar':
      return 'langUnsupported';
    default:
      return error;
  }
}

export function isSpeechSupported(): boolean {
  // Dentro de la app el WebView expone el objeto pero no reconoce nada: en
  // iOS no hay motor y en Android el de Chrome no está disponible ahí. Pero
  // la app ya no depende de eso: usa el reconocedor del propio teléfono
  // (ver speech-native.ts), así que el modo «mi micrófono» sí está.
  if (isNative()) return true;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

export class KhutbahListener {
  private recognition: SpeechRecognitionLike | null = null;
  private buffer = '';
  private active = false;
  private pauseTimer: ReturnType<typeof setTimeout> | null = null;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  /** Resultados finales vacíos seguidos: oye algo y no saca palabras. */
  private emptyFinals = 0;

  constructor(private callbacks: SpeechCallbacks) {}

  start(locale: string): void {
    const w = window as unknown as Record<string, new () => SpeechRecognitionLike>;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      this.callbacks.onError('unsupported');
      return;
    }
    this.active = true;
    const rec = new Ctor();
    rec.lang = locale;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (ev) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        if (res.isFinal) {
          const text = res[0].transcript.trim();
          if (!text) {
            // Resultado final vacío: oyó algo y no reconoció nada.
            this.emptyFinals++;
            if (this.emptyFinals >= EMPTY_FINALS_TO_WARN) this.callbacks.onNoMatch?.();
            continue;
          }
          this.emptyFinals = 0;
          this.callbacks.onHeard?.();
          // Sin el separador, el final de una frase se pegaba al principio de
          // la siguiente y salían palabras inventadas («ايهايها»).
          this.buffer += (this.buffer ? ' ' : '') + text;
          this.flushIfSentence();
          this.armPauseFlush();
        } else {
          interim += res[0].transcript;
        }
      }
      if (interim) this.callbacks.onInterim(interim);
    };

    rec.onerror = (ev) => {
      if (ev.error === 'no-speech' || ev.error === 'aborted') return; // benignos
      this.callbacks.onError(errorCode(ev.error));
    };

    // Chrome corta la sesión periódicamente: reiniciar mientras estemos
    // activos. Volver a arrancar en el acto lanza InvalidStateError si el
    // motor aún no ha soltado el micrófono, y entonces la escucha moría en
    // silencio hasta que alguien volvía a pulsar el botón.
    rec.onend = () => {
      if (!this.active) return;
      this.restartTimer = setTimeout(() => {
        this.restartTimer = null;
        if (!this.active) return;
        try {
          rec.start();
        } catch {
          // Ya estaba arrancado, o el motor no está listo: se reintenta en
          // el siguiente onend, que llegará.
        }
      }, RESTART_MS);
    };

    this.recognition = rec;
    try {
      rec.start();
    } catch {
      this.callbacks.onError('start');
    }
  }

  stop(): void {
    this.active = false;
    this.emptyFinals = 0;
    if (this.restartTimer !== null) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    this.clearPauseTimer();
    this.flush();
    this.recognition?.stop();
    this.recognition = null;
  }

  private flushIfSentence(): void {
    if (SENTENCE_END.test(this.buffer) || this.buffer.length >= MAX_BUFFER_CHARS) {
      this.flush();
    }
  }

  /** Reinicia la cuenta atrás: se traduce cuando el orador calla, no antes. */
  private armPauseFlush(): void {
    this.clearPauseTimer();
    if (this.buffer.trim().length < MIN_FLUSH_CHARS) return;
    this.pauseTimer = setTimeout(() => {
      this.pauseTimer = null;
      this.flush();
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
