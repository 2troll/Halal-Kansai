/**
 * Traducción con Ollama: modelos que corren en la propia máquina (el Mac de
 * la mezquita), sin coste y SIN CUOTA. Esto es lo que resuelve el problema del
 * viernes: Workers AI del plan gratuito trae ~10.000 «Neurons» al día y una
 * jutba de hora y media los agota a mitad del sermón; a partir de ahí, o
 * factura o se cae a MyMemory (que desde la nube comparte IP y devuelve
 * vacío). Ollama no cuenta: cada fragmento es una petición independiente a un
 * modelo local, así que aguanta una jutba entera —o diez seguidas— sin tope.
 *
 * Requisito honesto: Ollama tiene que estar ENCENDIDO y accesible por red
 * desde donde corre este servidor (`ollama serve`, por defecto en
 * 127.0.0.1:11434). En el despliegue de Cloudflare no hay `OLLAMA_URL` y este
 * módulo ni se toca: producción se comporta exactamente igual que hoy.
 *
 * No inventa árabe: igual que los demás motores, el Corán se sigue verificando
 * y mostrando desde Tanzil en segment.ts. Esto solo TRADUCE el fragmento.
 */
import { isDegenerate } from './quality.ts';

/** Config del proveedor Ollama. `baseUrl` sin barra final. */
export interface OllamaConfig {
  baseUrl: string;
  /** Modelo instalado en Ollama (ej. 'qwen2.5:7b', 'llama3.2:3b'). */
  model?: string;
  /** Tope por petición; un fragmento de sermón no necesita más. */
  timeoutMs?: number;
}

/** Modelo por defecto: buen equilibrio calidad/latencia para traducir. */
export const DEFAULT_OLLAMA_MODEL = 'qwen2.5:7b';

/** Un fragmento de jutba es corto; un modelo local no debería tardar más. */
const DEFAULT_TIMEOUT_MS = 8000;

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
 * Traduce un fragmento de jutba con Ollama. Devuelve null para que el llamante
 * pruebe el siguiente motor; NUNCA lanza: un fallo de red o un modelo que no
 * está descargado no puede tumbar la jutba entera.
 */
export async function ollamaTranslate(
  config: OllamaConfig,
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

  // Mismo tope que los demás motores: entradas largas y repetitivas hacen que
  // los modelos se atasquen repitiendo. Un fragmento real son una o dos frases.
  const fragment = text.slice(0, 400);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model ?? DEFAULT_OLLAMA_MODEL,
        stream: false,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: fragment },
        ],
        options: {
          // Traducir no es crear: cuanto menos invente, mejor.
          temperature: 0.1,
          // Un fragmento de sermón es corto; el tope evita que se enrolle.
          num_predict: 300,
        },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { message?: { content?: string } };
    return cleanUp(data.message?.content);
  } catch {
    // Timeout, Ollama apagado, modelo sin descargar, red caída: el llamante
    // probará el siguiente motor. Nunca propagamos.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Comprueba que Ollama responde y (si se pide) que el modelo está descargado.
 * Se usa una vez al arrancar para avisar por consola, no en el camino caliente.
 */
export async function ollamaHealth(
  config: OllamaConfig,
): Promise<{ ok: boolean; models: string[]; error?: string }> {
  try {
    const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/api/tags`, {
      method: 'GET',
    });
    if (!res.ok) return { ok: false, models: [], error: `HTTP ${res.status}` };
    const data = (await res.json()) as { models?: Array<{ name?: string }> };
    const models = (data.models ?? []).map((m) => m.name ?? '').filter(Boolean);
    return { ok: true, models };
  } catch (err) {
    return { ok: false, models: [], error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Los modelos a veces envuelven la respuesta en comillas o anteponen
 * «Translation:», aunque se les pida que no. Se limpia aquí, igual que en
 * ai-translate.ts, en vez de confiar en que obedezcan.
 */
function cleanUp(raw: string | undefined): string | null {
  if (!raw) return null;
  let out = raw.trim();
  // Modelos con «thinking» a veces devuelven <think>...</think> delante.
  out = out.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  out = out.replace(/^(translation|traducción|翻訳)\s*[:：]\s*/i, '');
  out = out.replace(/^["'«「](.*)["'»」]$/s, '$1');
  out = out.trim();
  if (out.length === 0) return null;
  return isDegenerate(out) ? null : out;
}

/** Interior expuesto solo para las pruebas. */
export const __testing = { cleanUp };
