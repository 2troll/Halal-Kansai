/**
 * Opiniones de quien usa la app: qué falla, qué falta, qué mejorar.
 *
 * Flujo: POST /api/feedback (público, con límite por IP) → se guarda → el
 * fundador lo lee en /admin.html con el token.
 *
 * Sin datos personales a propósito: ni correo, ni nombre, ni identificador del
 * aparato. Solo lo que la persona escribe y el contexto técnico mínimo para
 * reproducir un fallo (idioma, plataforma, versión, pestaña). Si alguien
 * quiere respuesta, la ficha de la tienda ya da un correo de contacto.
 */

export type FeedbackKind = 'bug' | 'idea' | 'data' | 'other';
export type FeedbackPlatform = 'android' | 'ios' | 'web';

export interface Feedback {
  id: string;
  kind: FeedbackKind;
  message: string;
  /** 1–5, opcional. */
  rating?: number;
  lang?: string;
  platform?: FeedbackPlatform;
  appVersion?: string;
  tab?: string;
  createdAt: string;
}

export interface FeedbackStore {
  add(f: Feedback): Promise<void>;
  list(): Promise<Feedback[]>;
}

const KINDS: ReadonlySet<string> = new Set(['bug', 'idea', 'data', 'other']);
const PLATFORMS: ReadonlySet<string> = new Set(['android', 'ios', 'web']);
// Los 19 idiomas de la app (src/i18n LANGS). Antes solo había 4 y el idioma
// de quien escribía en urdu, nepalí o vietnamita se perdía por el camino.
const LANGS: ReadonlySet<string> = new Set([
  'en', 'ja', 'ar', 'id', 'ur', 'bn', 'ms', 'tr', 'ne', 'vi', 'zh', 'ko', 'fil', 'pt', 'th', 'my', 'si', 'hi', 'es',
]);
const TABS: ReadonlySet<string> = new Set(['salat', 'qibla', 'places', 'food', 'khutbah', 'guide']);

export const MESSAGE_MIN = 5;
export const MESSAGE_MAX = 1000;
/** Las más antiguas se descartan: una sola clave de KV no debe crecer sin fin. */
export const MAX_STORED = 500;

/** Valida y sanea el formulario público. Devuelve null si no vale. */
export function parseFeedback(body: unknown): Feedback | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;

  const message = typeof b.message === 'string' ? b.message.trim().slice(0, MESSAGE_MAX) : '';
  if (message.length < MESSAGE_MIN) return null;

  const kind = typeof b.kind === 'string' && KINDS.has(b.kind) ? (b.kind as FeedbackKind) : null;
  if (!kind) return null;

  const rating =
    typeof b.rating === 'number' && Number.isInteger(b.rating) && b.rating >= 1 && b.rating <= 5
      ? b.rating
      : undefined;

  const pick = (v: unknown, allowed: ReadonlySet<string>) =>
    typeof v === 'string' && allowed.has(v) ? v : undefined;

  const appVersion =
    typeof b.appVersion === 'string' && /^\d{1,3}(\.\d{1,3}){0,2}$/.test(b.appVersion) ? b.appVersion : undefined;

  return {
    id: crypto.randomUUID(),
    kind,
    message,
    rating,
    lang: pick(b.lang, LANGS),
    platform: pick(b.platform, PLATFORMS) as FeedbackPlatform | undefined,
    appVersion,
    tab: pick(b.tab, TABS),
    createdAt: new Date().toISOString(),
  };
}

/** Para tests y desarrollo local. */
export class MemoryFeedbackStore implements FeedbackStore {
  private items: Feedback[] = [];

  async add(f: Feedback): Promise<void> {
    this.items = [...this.items, f].slice(-MAX_STORED);
  }

  async list(): Promise<Feedback[]> {
    return [...this.items].reverse();
  }
}

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

/**
 * Producción: la misma KV que las sugerencias de lugares, con su propia clave.
 * Volumen esperado bajo; con MAX_STORED el valor se queda muy por debajo del
 * límite de 25 MB de una clave.
 */
export class KVFeedbackStore implements FeedbackStore {
  // Campo explícito y no `constructor(private kv)`: el servidor Node corre el
  // TypeScript sin compilar (strip-only) y no admite propiedades de parámetro.
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  private async read(): Promise<Feedback[]> {
    const raw = await this.kv.get('feedback');
    return raw ? (JSON.parse(raw) as Feedback[]) : [];
  }

  async add(f: Feedback): Promise<void> {
    const items = [...(await this.read()), f].slice(-MAX_STORED);
    await this.kv.put('feedback', JSON.stringify(items));
  }

  async list(): Promise<Feedback[]> {
    return (await this.read()).reverse();
  }
}
