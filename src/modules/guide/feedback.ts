/**
 * Enviar una opinión (POST /api/feedback), con cola si no hay conexión.
 *
 * La cola importa: donde más se usa la app (una mezquita de hormigón, un
 * konbini en un sótano) es donde menos cobertura hay, y justo ahí es cuando
 * alguien ve algo que falla. Se guarda en el teléfono y sale sola al volver
 * a abrir la app con red.
 */
import { apiUrl, isNative } from '../../backend';

export type FeedbackKind = 'bug' | 'idea' | 'data' | 'other';

export interface FeedbackInput {
  kind: FeedbackKind;
  message: string;
  rating?: number;
  lang?: string;
  tab?: string;
}

const QUEUE_KEY = 'hk-feedback-queue';
const QUEUE_MAX = 20;
export const MESSAGE_MIN = 5;

type Payload = FeedbackInput & { platform: string; appVersion: string };

function platform(): 'android' | 'ios' | 'web' {
  if (!isNative()) return 'web';
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'ios' : 'android';
}

function readQueue(): Payload[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as Payload[];
  } catch {
    return [];
  }
}

function writeQueue(items: Payload[]): void {
  try {
    if (items.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-QUEUE_MAX)));
    else localStorage.removeItem(QUEUE_KEY);
  } catch {
    /* sin almacenamiento: se pierde la cola, no la app */
  }
}

/**
 * Límite de espera. Con una VPN o un bloqueador que corta la app, la conexión
 * no falla: se queda colgada. Sin tope, en un Nothing Phone con DuckDuckGo la
 * pantalla se quedaba esperando sin decir nada y sin ofrecer el correo.
 */
const TIMEOUT_MS = 8000;

async function post(payload: Payload): Promise<'sent' | 'rejected' | 'offline'> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(apiUrl('/api/feedback'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (res.ok) return 'sent';
    // 400: el servidor no lo acepta nunca; reintentar no sirve. 429 y 5xx sí.
    return res.status === 400 ? 'rejected' : 'offline';
  } catch {
    return 'offline';
  } finally {
    clearTimeout(timer);
  }
}

/** 'sent' si llegó; 'queued' si se enviará al volver la conexión. */
export async function submitFeedback(input: FeedbackInput): Promise<'sent' | 'queued' | 'rejected'> {
  const payload: Payload = { ...input, platform: platform(), appVersion: __APP_VERSION__ };
  const result = await post(payload);
  if (result === 'offline') {
    writeQueue([...readQueue(), payload]);
    return 'queued';
  }
  return result;
}

/** Reintenta lo pendiente. Se llama al abrir la app; nunca lanza. */
export async function flushFeedbackQueue(): Promise<void> {
  const queue = readQueue();
  if (!queue.length) return;
  const left: Payload[] = [];
  for (const item of queue) {
    if ((await post(item)) === 'offline') left.push(item);
  }
  writeQueue(left);
}
