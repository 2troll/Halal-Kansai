/**
 * Clasificación + traducción de segmentos de jutba vía Anthropic Messages API.
 * La clave API vive SOLO aquí (backend); el cliente nunca la ve.
 *
 * El LLM clasifica el fragmento y, si cree que es Corán, propone sura:aleya.
 * NUNCA se usa su árabe: la verificación y el texto literal salen de match.ts.
 */
import Anthropic from '@anthropic-ai/sdk';

export type SegmentKind = 'speech' | 'quran' | 'hadith' | 'dua';

export interface LlmAnalysis {
  kind: SegmentKind;
  translation: string;
  candidate: { sura: number; ayah: number } | null;
}

const DEFAULT_MODEL = 'claude-opus-4-8';

/** Salida estructurada: el modelo no puede desviarse de este esquema. */
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    kind: {
      type: 'string',
      enum: ['speech', 'quran', 'hadith', 'dua'],
      description: 'Classification of the transcribed fragment.',
    },
    translation: {
      type: 'string',
      description: 'Translation of the fragment into the target language.',
    },
    candidate: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            sura: { type: 'integer', description: 'Surah number, 1-114' },
            ayah: { type: 'integer', description: 'Ayah number within the surah' },
          },
          required: ['sura', 'ayah'],
        },
        { type: 'null' },
      ],
      description: 'If kind is quran: best guess of the verse reference. Otherwise null.',
    },
  },
  required: ['kind', 'translation', 'candidate'],
} as const;

const SYSTEM_PROMPT = `You translate live Friday khutbah (sermon) fragments for a mosque congregation app in Japan.

Input: a fragment transcribed by speech-to-text (it may be garbled, cut mid-sentence, or mix languages — khateebs often interleave Quranic Arabic with Urdu/Indonesian/Japanese speech).

Your tasks:
1. Classify the fragment:
   - "quran": a recitation or quotation of the Quran (usually classical Arabic).
   - "hadith": a quotation attributed to the Prophet (hadith).
   - "dua": a supplication/prayer formula.
   - "speech": everything else (normal sermon speech).
2. Translate the fragment into the target language, faithfully and naturally. If the fragment is garbled, translate the most plausible reading; do not invent content that is not there.
3. If kind is "quran", give your best guess of the verse reference (sura and ayah numbers). The app verifies your guess against a Quran database and only displays database text — your guess is a search hint, never shown to users. If you cannot guess, use null.

Never include explanations or commentary. The translation is a comprehension aid, not a religious ruling.`;

export interface LlmConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
}

export async function analyzeSegment(
  config: LlmConfig,
  text: string,
  sourceLocale: string,
  targetLang: string,
): Promise<LlmAnalysis> {
  const client = new Anthropic({ apiKey: config.apiKey, baseURL: config.baseURL });

  const response = await client.messages.create({
    model: config.model ?? DEFAULT_MODEL,
    max_tokens: 1024,
    // Traducción en vivo: latencia mínima, sin razonamiento extendido.
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: OUTPUT_SCHEMA },
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Source language (speech recognition locale): ${sourceLocale}\nTarget language (ISO 639-1): ${targetLang}\n\nFragment:\n${text}`,
      },
    ],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('model refused');
  }
  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') {
    throw new Error('empty model response');
  }
  return JSON.parse(block.text) as LlmAnalysis;
}
