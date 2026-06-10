/**
 * Captura de voz con Web Speech API (continuous + interim) y buffer por frases.
 * Chrome Android es el objetivo principal; la lista de locales de origen
 * mantiene solo los probados (SpeechRecognition no expone los soportados).
 */

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

/** Locales de origen probados en Chrome Android (spec §5). */
export const SOURCE_LOCALES: Array<{ code: string; label: string }> = [
  { code: 'ur-PK', label: 'اردو (Urdu)' },
  { code: 'id-ID', label: 'Bahasa Indonesia' },
  { code: 'ja-JP', label: '日本語' },
  { code: 'ar-SA', label: 'العربية' },
  { code: 'en-US', label: 'English' },
  { code: 'bn-BD', label: 'বাংলা (Bangla)' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)' },
  { code: 'ne-NP', label: 'नेपाली (Nepali)' },
  { code: 'ta-IN', label: 'தமிழ் (Tamil)' },
  { code: 'si-LK', label: 'සිංහල (Sinhala)' },
  { code: 'tr-TR', label: 'Türkçe' },
  { code: 'ms-MY', label: 'Bahasa Melayu' },
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
}

const SENTENCE_END = /[.!?。؟।…]\s*$/;
const MAX_BUFFER_CHARS = 160;

export function isSpeechSupported(): boolean {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

export class KhutbahListener {
  private recognition: SpeechRecognitionLike | null = null;
  private buffer = '';
  private active = false;

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
          this.buffer += res[0].transcript;
          this.flushIfSentence();
        } else {
          interim += res[0].transcript;
        }
      }
      if (interim) this.callbacks.onInterim(interim);
    };

    rec.onerror = (ev) => {
      if (ev.error === 'no-speech' || ev.error === 'aborted') return; // benignos
      this.callbacks.onError(ev.error);
    };

    // Chrome corta la sesión periódicamente: reiniciar mientras estemos activos.
    rec.onend = () => {
      if (this.active) rec.start();
    };

    this.recognition = rec;
    rec.start();
  }

  stop(): void {
    this.active = false;
    this.flush();
    this.recognition?.stop();
    this.recognition = null;
  }

  private flushIfSentence(): void {
    if (SENTENCE_END.test(this.buffer) || this.buffer.length >= MAX_BUFFER_CHARS) {
      this.flush();
    }
  }

  private flush(): void {
    const text = this.buffer.trim();
    this.buffer = '';
    if (text) this.callbacks.onSentence(text);
  }
}
