/**
 * Traducción con Workers AI, el modelo que corre en la propia Cloudflare.
 *
 * Por qué hizo falta: MyMemory y el endpoint gratuito de Google limitan por
 * dirección IP. Desde un portátil funcionan; desde un Worker la IP de salida
 * la comparten miles de proyectos, así que la cuota está agotada siempre y
 * los dos devolvían vacío. El síntoma era el peor posible: la jutba escribía
 * bien lo que oía y no traducía nada, sin ningún error.
 *
 * Este camino no sale de la red de Cloudflare, así que no hay cuota ajena que
 * agotar. El plan gratuito trae una asignación diaria; si se acaba, se cae a
 * los proveedores de antes en vez de dejar al usuario sin nada.
 *
 * No toca las aleyas: el árabe del Corán sigue saliendo literal de Tanzil.
 */

/** Binding `AI` de Workers AI (solo existe en el Worker, no en Node). */
export interface AiBinding {
  run(
    model: string,
    input:
      | { text: string; source_lang: string; target_lang: string }
      | {
          messages: Array<{ role: 'system' | 'user'; content: string }>;
          max_tokens?: number;
          temperature?: number;
        },
  ): Promise<{ translated_text?: string; response?: string }>;
}

/** Modelo multilingüe de traducción (100 idiomas, incluidos ar/ja/ur/id). */
const MODEL = '@cf/meta/m2m100-1.2b';

/** 'ar-SA' → 'ar'. El modelo quiere el código corto. */
function shortLang(locale: string): string {
  return locale.split('-')[0]!.toLowerCase();
}

/**
 * Traduce, o devuelve null para que el llamante pruebe el siguiente proveedor.
 * Nunca lanza: un fallo de traducción no puede tumbar la jutba entera.
 */
export async function aiTranslate(
  ai: AiBinding,
  text: string,
  sourceLocale: string,
  target: string,
): Promise<string | null> {
  const source = shortLang(sourceLocale);
  const tgt = shortLang(target);
  if (source === tgt) return text;

  try {
    const out = await ai.run(MODEL, {
      text,
      source_lang: source,
      target_lang: tgt,
    });
    const translated = out.translated_text?.trim();
    return translated ? translated : null;
  } catch {
    return null;
  }
}

import { isDegenerate } from './quality.ts';

/* ============================================================
   Traducción con modelo de lenguaje
   ============================================================

   m2m100 es un traductor pequeño y no entiende instrucciones: traduce palabra
   por palabra y en registro religioso se pierde. Medido, convertía «الزكاة» en
   «cárcel» y «yakuza».

   Un modelo instruido hace dos cosas que aquel no puede:
   1. Se le explica QUÉ está traduciendo (un sermón del viernes), así que
      escoge el registro correcto.
   2. Se le da el glosario en el propio prompt, y coloca cada término en su
      sitio con la gramática de destino, en vez de encajarlo a martillazos
      donde estaba el marcador.

   Sigue siendo Workers AI, o sea gratis y dentro de Cloudflare.
   ============================================================ */

/** El mismo binding sirve para el traductor y para el modelo de lenguaje. */
export type AiChatBinding = AiBinding;

/** 70B cuantizado y optimizado para latencia: es una traducción en directo. */
const CHAT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const LANG_NAME: Record<string, string> = {
  es: 'Spanish',
  en: 'English',
  ja: 'Japanese',
  ar: 'Arabic',
  ur: 'Urdu',
  id: 'Indonesian',
  bn: 'Bengali',
  hi: 'Hindi',
  tr: 'Turkish',
  ms: 'Malay',
  fr: 'French',
  zh: 'Chinese',
  ru: 'Russian',
  fa: 'Persian',
  th: 'Thai',
  vi: 'Vietnamese',
  ta: 'Tamil',
  ne: 'Nepali',
  si: 'Sinhala',
  fil: 'Filipino',
  uz: 'Uzbek',
  my: 'Burmese',
  sw: 'Swahili',
  am: 'Amharic',
};

function langName(code: string): string {
  const short = code.split('-')[0]!.toLowerCase();
  return LANG_NAME[short] ?? short;
}

/**
 * Traduce un fragmento de jutba. Devuelve null para que el llamante pruebe el
 * siguiente motor; nunca lanza.
 */
export async function chatTranslate(
  ai: AiChatBinding,
  text: string,
  sourceLocale: string,
  target: string,
  hints: string[],
): Promise<string | null> {
  const from = langName(sourceLocale);
  const to = langName(target);
  if (from === to) return text;

  const glossary =
    hints.length > 0
      ? `\nUse exactly these renderings for religious terms:\n${hints.join('\n')}`
      : '';

  const system = [
    `You translate fragments of a live Friday sermon (khutbah) from ${from} into ${to}.`,
    'The fragment comes from speech recognition: it may be cut off mid-sentence, and may contain recognition errors. Translate what is there. Never invent a continuation.',
    'Keep the register of a sermon: formal, plain, reverent. Do not paraphrase or explain.',
    `Reply with ONLY the ${to} translation. No quotes, no notes, no romanisation, no original text.`,
    glossary,
  ].join('\n');

  // Un fragmento de jutba son una o dos frases. Si llega mucho más, o es un
  // error del reconocedor o alguien está probando la API: los modelos se
  // atascan repitiendo con entradas largas y repetitivas (medido: 1.200
  // caracteres devolvían «¡Hazlo bien!» ochenta veces).
  const fragment = text.slice(0, 400);

  try {
    const out = await ai.run(CHAT_MODEL, {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: fragment },
      ],
      // Un fragmento de sermón es corto; el tope evita que se enrolle.
      max_tokens: 300,
      // Traducir no es crear: cuanto menos invente, mejor.
      temperature: 0.1,
    });
    return cleanUp(out.response);
  } catch {
    return null;
  }
}

/**
 * Los modelos instruidos a veces envuelven la respuesta en comillas o añaden
 * un «Translation:» delante, aunque se les pida que no. Se quita aquí en vez
 * de confiar en que obedezcan.
 */
function cleanUp(raw: string | undefined): string | null {
  if (!raw) return null;
  let out = raw.trim();
  out = out.replace(/^(translation|traducción|翻訳)\s*[:：]\s*/i, '');
  out = out.replace(/^["'«「](.*)["'»」]$/s, '$1');
  out = out.trim();
  if (out.length === 0) return null;
  return isDegenerate(out) ? null : out;
}


/**
 * Interior expuesto solo para las pruebas.
 *
 * `cleanUp` es la puerta por la que pasa todo lo que devuelve el modelo antes
 * de llegar a una pantalla, así que merece prueba propia; pero no es API del
 * módulo y nadie más debería llamarla.
 */
export const __testing = { cleanUp };
