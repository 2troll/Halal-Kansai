/**
 * La traducción, en voz alta por el auricular.
 *
 * En una jutba no puedes estar mirando la pantalla: estás sentado, escuchando
 * y siguiendo al imán. Con un auricular puesto, la traducción se oye mientras
 * él habla y el móvil se queda en el bolsillo.
 *
 * Usa la voz del propio dispositivo (SpeechSynthesis). Es gratis, no manda el
 * texto a ningún sitio y funciona sin conexión. En los tres sistemas existe:
 * Chrome en Android, Safari y el WebView de iOS, y cualquier navegador de
 * escritorio.
 *
 * Dos decisiones que se notan al usarlo:
 *
 * - **Cola, no interrupción.** Los fragmentos llegan más rápido de lo que se
 *   leen. Si cada uno cortase al anterior, no se entendería ninguno. Se
 *   encolan y se dicen enteros.
 * - **Se descarta lo viejo.** Si la cola crece demasiado, la voz se queda
 *   atrás del sermón y deja de servir. Por encima de `MAX_QUEUE` se tira lo
 *   más antiguo: vale más ir al día que decirlo todo.
 */

const PREF_KEY = 'hk-khutbah-voice';

/** Más de esto y la voz iría tan retrasada que estorbaría. */
const MAX_QUEUE = 4;

export function speechOutputSupported(): boolean {
  return typeof globalThis.speechSynthesis !== 'undefined';
}

export function voiceEnabled(): boolean {
  return localStorage.getItem(PREF_KEY) === '1';
}

export function setVoiceEnabled(on: boolean): void {
  localStorage.setItem(PREF_KEY, on ? '1' : '0');
  if (!on) stopSpeaking();
}

/**
 * Mejor voz disponible para un idioma.
 *
 * Prioriza las locales (no dependen de la red y no tienen latencia) y, dentro
 * de ellas, las marcadas por defecto del sistema, que suelen ser las de mejor
 * calidad. Si no hay ninguna del idioma pedido, se devuelve null y el motor
 * usa la que tenga: peor acento, pero se entiende.
 */
function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const short = lang.split('-')[0]!.toLowerCase();
  const matching = voices.filter((v) => v.lang.toLowerCase().startsWith(short));
  if (matching.length === 0) return null;

  return (
    matching.find((v) => v.localService && v.default) ??
    matching.find((v) => v.localService) ??
    matching[0]!
  );
}

const queue: Array<{ text: string; lang: string }> = [];
let speaking = false;

/** Encola un fragmento. No hace nada si el usuario no ha activado la voz. */
export function speakTranslation(text: string, lang: string): void {
  if (!voiceEnabled() || !speechOutputSupported()) return;
  const clean = text.trim();
  if (!clean) return;

  queue.push({ text: clean, lang });
  // Ir al día importa más que decirlo todo.
  while (queue.length > MAX_QUEUE) queue.shift();
  if (!speaking) void drain();
}

async function drain(): Promise<void> {
  speaking = true;
  while (queue.length > 0) {
    const item = queue.shift()!;
    await sayOne(item.text, item.lang);
  }
  speaking = false;
}

function sayOne(text: string, lang: string): Promise<void> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    const voice = pickVoice(lang);
    if (voice) utterance.voice = voice;
    // Un pelo más lento que el habla normal: es contenido religioso y se
    // escucha una sola vez, sin poder rebobinar.
    utterance.rate = 0.95;
    utterance.pitch = 1;

    // Si el motor se atasca (pasa en Android tras varios minutos), no dejamos
    // la cola bloqueada para siempre.
    const safety = setTimeout(() => resolve(), 20000);
    const done = (): void => {
      clearTimeout(safety);
      resolve();
    };
    utterance.onend = done;
    utterance.onerror = done;

    speechSynthesis.speak(utterance);
  });
}

/** Corta lo que se esté diciendo y vacía la cola (al pulsar «parar»). */
export function stopSpeaking(): void {
  queue.length = 0;
  speaking = false;
  if (speechOutputSupported()) speechSynthesis.cancel();
}

/**
 * La lista de voces llega de forma asíncrona en algunos navegadores. Llamar a
 * esto al abrir la pestaña evita que el primer fragmento salga con la voz
 * equivocada.
 */
export function warmUpVoices(): void {
  if (!speechOutputSupported()) return;
  speechSynthesis.getVoices();
  speechSynthesis.addEventListener?.('voiceschanged', () => {
    speechSynthesis.getVoices();
  });
}
