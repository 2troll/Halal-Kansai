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
const PREF_VOICE_NAME = 'hk-khutbah-voice-name';

/**
 * Voces que el sistema marca como «compactas»: son las robóticas de toda la
 * vida, y son las que sale eligiendo por defecto si uno no mira. Las buenas
 * (Siri en iOS, las neuronales de Google en Android) se llaman Enhanced,
 * Premium, Neural o Natural. Se ordenan para que la primera de la lista sea
 * la mejor que tenga el aparato, no la primera que devuelva el navegador.
 */
const GOOD_VOICE = /enhanced|premium|neural|natural|siri|wavenet|studio/i;
const POOR_VOICE = /compact|espeak|robot/i;

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
export function voicesFor(lang: string): SpeechSynthesisVoice[] {
  if (!speechOutputSupported()) return [];
  const short = lang.split('-')[0]!.toLowerCase();
  return speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith(short))
    .sort((a, b) => voiceScore(b) - voiceScore(a));
}

/** Mayor puntuación = mejor voz. Calidad primero, y local antes que de red. */
function voiceScore(v: SpeechSynthesisVoice): number {
  let score = 0;
  if (GOOD_VOICE.test(v.name)) score += 10;
  if (POOR_VOICE.test(v.name)) score -= 10;
  if (v.localService) score += 3; // sin latencia y sin conexión
  if (v.default) score += 1;
  return score;
}

/** La voz elegida por el usuario, o la mejor que haya para ese idioma. */
function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const candidates = voicesFor(lang);
  if (candidates.length === 0) return null;

  const chosen = localStorage.getItem(PREF_VOICE_NAME);
  return candidates.find((v) => v.name === chosen) ?? candidates[0]!;
}

export function getVoiceName(): string {
  return localStorage.getItem(PREF_VOICE_NAME) ?? '';
}

export function setVoiceName(name: string): void {
  if (name) localStorage.setItem(PREF_VOICE_NAME, name);
  else localStorage.removeItem(PREF_VOICE_NAME);
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
    // Ligeramente por encima del habla normal: la traducción entra DESPUÉS
    // de que el imán haya dicho la frase, así que hay que recuperar terreno
    // o la voz se va quedando atrás sermón adelante.
    utterance.rate = 1.05;
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
