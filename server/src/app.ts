/**
 * API Halal Kansai (Hono): corre igual en Node (dev) y Cloudflare Workers.
 *
 *   POST /api/translate    → clasifica + traduce un segmento de jutba;
 *                            citas coránicas verificadas contra Tanzil.
 *   POST /api/quran/match  → verificación directa de un texto contra la BD.
 *   GET  /api/health       → estado.
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { LlmConfig } from './llm.ts';
import { CONFIDENCE_THRESHOLD, type VerseRef } from './match.ts';
import { buildSegment } from './segment.ts';
import { chatTranslate } from './ai-translate.ts';
import { ollamaTranslate, type OllamaConfig } from './ollama-translate.ts';
import { glossaryHints } from './glossary.ts';
import { usableTranslation } from './quality.ts';
import { getMatcher, type QuranStore } from './store.ts';
import { parseSuggestion, type SuggestionStatus, type SuggestionStore } from './suggestions.ts';
import { parseFeedback, type FeedbackStore } from './feedback.ts';
import { notifyTelegram, type TelegramConfig } from './notify.ts';
import type { AiBinding } from './ai-translate.ts';

export interface AppConfig {
  store: QuranStore;
  llm: LlmConfig;
  /** Orígenes permitidos para CORS; '*' solo en desarrollo. */
  allowedOrigins: string[];
  /** Peticiones por minuto y por IP en /api/translate. */
  rateLimitPerMinute?: number;
  /** Cola de moderación de lugares sugeridos (Fase 3). */
  suggestions?: SuggestionStore;
  /** Opiniones de los usuarios (qué falla, qué mejorar). */
  feedback?: FeedbackStore;
  /** Aviso de cada opinión a Telegram (opcional). */
  telegram?: TelegramConfig;
  /** Token Bearer del panel admin; sin él, las rutas admin devuelven 503. */
  adminToken?: string;
  /** Workers AI: traduce dentro de Cloudflare, sin cuotas de terceros por IP. */
  ai?: AiBinding;
  /**
   * Ollama local (modelos en el Mac): motor gratis y SIN CUOTA. Si se define
   * (típicamente vía OLLAMA_URL en el servidor Node), es el traductor
   * prioritario y la jutba aguanta 1-1,5 h sin toparse con ningún límite de
   * pago. Sin definir (p. ej. en Cloudflare), todo funciona como hoy.
   */
  ollama?: OllamaConfig;
}

/**
 * Rate limit en memoria por IP (ventana de 1 min). Suficiente por isolate;
 * para límites globales en producción, respaldar con KV o Durable Objects.
 */
function makeRateLimiter(limit: number) {
  const hits = new Map<string, { count: number; windowStart: number }>();
  return (ip: string): boolean => {
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || now - entry.windowStart > 60_000) {
      hits.set(ip, { count: 1, windowStart: now });
      if (hits.size > 10_000) hits.clear(); // tope de memoria
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  };
}

/**
 * Orígenes de la propia app instalada: Capacitor sirve la app desde
 * https://localhost en Android y capacitor://localhost en iOS.
 *
 * Van en el código y no en ALLOWED_ORIGINS porque sin ellos la app nativa no
 * puede hablar con su propio servidor. Con la variable vacía en producción,
 * en el Nothing Phone 3a fallaban TODAS las llamadas («Failed to fetch»):
 * lugares de la comunidad, sugerencias y traducción por servidor.
 */
export const NATIVE_APP_ORIGINS: ReadonlySet<string> = new Set([
  'https://localhost',
  'capacitor://localhost',
]);

function clientIp(headers: Headers): string {
  return (
    headers.get('cf-connecting-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown'
  );
}

export function createApp(config: AppConfig): Hono {
  const app = new Hono();
  const allowRequest = makeRateLimiter(config.rateLimitPerMinute ?? 30);

  app.use(
    '/api/*',
    cors({
      origin: (origin) =>
        config.allowedOrigins.includes('*') ||
        config.allowedOrigins.includes(origin) ||
        NATIVE_APP_ORIGINS.has(origin)
          ? origin
          : null,
      allowMethods: ['GET', 'POST'],
    }),
  );

  app.get('/api/health', (c) => c.json({ ok: true }));

  // ---------- Lugares comunitarios (Fase 3) ----------

  // Lugares aprobados por moderación; el frontend los fusiona con los de fábrica.
  app.get('/api/places', async (c) => {
    if (!config.suggestions) return c.json({ places: [] });
    const approved = await config.suggestions.list('approved');
    return c.json({
      places: approved.map(({ id, name, type, city, address, lat, lng }) => ({
        id: `community-${id}`,
        name,
        type,
        city,
        address,
        lat,
        lng,
        verified: true, // aprobado por el moderador
      })),
    });
  });

  app.post('/api/places/suggest', async (c) => {
    if (!config.suggestions) return c.json({ error: 'no disponible' }, 503);
    if (!allowRequest(clientIp(c.req.raw.headers))) {
      return c.json({ error: 'rate limit' }, 429);
    }
    const suggestion = parseSuggestion(await c.req.json().catch(() => null));
    if (!suggestion) return c.json({ error: 'datos inválidos' }, 400);
    await config.suggestions.add(suggestion);
    return c.json({ ok: true, id: suggestion.id }, 201);
  });

  app.post('/api/feedback', async (c) => {
    if (!config.feedback) return c.json({ error: 'no disponible' }, 503);
    if (!allowRequest(clientIp(c.req.raw.headers))) {
      return c.json({ error: 'rate limit' }, 429);
    }
    const feedback = parseFeedback(await c.req.json().catch(() => null));
    if (!feedback) return c.json({ error: 'datos inválidos' }, 400);
    await config.feedback.add(feedback);
    if (config.telegram) {
      const sending = notifyTelegram(config.telegram, feedback);
      // En Workers, waitUntil deja terminar el envío sin retrasar la respuesta.
      const ctx = (c as unknown as { executionCtx?: { waitUntil(p: Promise<unknown>): void } }).executionCtx;
      try {
        if (ctx) ctx.waitUntil(sending);
        else await sending;
      } catch {
        await sending;
      }
    }
    return c.json({ ok: true, id: feedback.id }, 201);
  });

  // ---------- Panel admin (token Bearer) ----------

  const requireAdmin = (authHeader: string | undefined): boolean =>
    Boolean(config.adminToken) && authHeader === `Bearer ${config.adminToken}`;

  app.get('/api/admin/suggestions', async (c) => {
    if (!config.suggestions || !config.adminToken) return c.json({ error: 'no disponible' }, 503);
    if (!requireAdmin(c.req.header('Authorization'))) return c.json({ error: 'no autorizado' }, 401);
    const status = c.req.query('status') as SuggestionStatus | undefined;
    return c.json({ suggestions: await config.suggestions.list(status) });
  });

  app.get('/api/admin/feedback', async (c) => {
    if (!config.feedback || !config.adminToken) return c.json({ error: 'no disponible' }, 503);
    if (!requireAdmin(c.req.header('Authorization'))) return c.json({ error: 'no autorizado' }, 401);
    return c.json({ feedback: await config.feedback.list() });
  });

  app.post('/api/admin/suggestions/:id', async (c) => {
    if (!config.suggestions || !config.adminToken) return c.json({ error: 'no disponible' }, 503);
    if (!requireAdmin(c.req.header('Authorization'))) return c.json({ error: 'no autorizado' }, 401);
    const body = await c.req.json<{ action?: string }>().catch(() => null);
    if (body?.action !== 'approve' && body?.action !== 'reject') {
      return c.json({ error: 'action debe ser approve o reject' }, 400);
    }
    const updated = await config.suggestions.setStatus(
      c.req.param('id'),
      body.action === 'approve' ? 'approved' : 'rejected',
    );
    if (!updated) return c.json({ error: 'no existe' }, 404);
    return c.json({ ok: true, suggestion: updated });
  });

  app.post('/api/quran/match', async (c) => {
    const body = await c.req.json<{ text?: string; candidate?: VerseRef }>().catch(() => null);
    if (!body?.text) return c.json({ error: 'text requerido' }, 400);

    const matcher = await getMatcher(config.store);
    const result = matcher.match(body.text, body.candidate);
    return c.json({ match: result, threshold: CONFIDENCE_THRESHOLD });
  });

  app.post('/api/translate', async (c) => {
    if (!allowRequest(clientIp(c.req.raw.headers))) {
      return c.json({ error: 'rate limit' }, 429);
    }

    const body = await c.req
      .json<{ text?: string; source?: string; target?: string }>()
      .catch(() => null);
    if (!body?.text || !body.target) {
      return c.json({ error: 'text y target requeridos' }, 400);
    }
    const text = body.text.slice(0, 1000);
    const target = body.target.slice(0, 8);
    const source = (body.source ?? 'unknown').slice(0, 12);

    try {
      return c.json(
        await buildSegment(
          { llm: config.llm, store: config.store, ai: config.ai, ollama: config.ollama },
          text,
          source,
          target,
        ),
      );
    } catch {
      return c.json({ error: 'translation failed' }, 502);
    }
  });

  /**
   * La misma frase, mejor traducida, unos segundos después.
   *
   * El problema que resuelve. Hay dos traductores: uno pequeño que contesta
   * en un segundo y otro bueno que tarda entre tres y cinco. Con una carrera
   * entre los dos, el bueno perdía SIEMPRE —medido en producción con árabe,
   * urdu e indonesio—, así que la mezquita leía la traducción del pequeño
   * sin que nadie lo hubiera decidido: «la oración es la columna de la
   * religión, y el Día de la Resurrección será el primero de ellos».
   *
   * Alargar el plazo no vale: castiga a todas las frases para salvar
   * algunas. Así que la pantalla enseña enseguida lo que haya y pide aparte
   * la versión buena; cuando llega, sustituye a la anterior. Es lo que hacen
   * los subtítulos de las conferencias, y es honesto: primero entiendes, y
   * un momento después lo entiendes bien.
   *
   * No toca el Corán: una aleya verificada ya trae la traducción oficial de
   * Tanzil, que no hay que mejorar.
   */
  app.post('/api/refine', async (c) => {
    if (!allowRequest(clientIp(c.req.raw.headers))) {
      return c.json({ error: 'rate limit' }, 429);
    }
    // La mejora la puede dar Ollama (local, gratis) o Workers AI. Sin ninguno
    // de los dos no hay nada que refinar y la pantalla se queda como está.
    if (!config.ollama && !config.ai) return c.json({ error: 'unavailable' }, 503);

    const body = await c.req
      .json<{ text?: string; source?: string; target?: string }>()
      .catch(() => null);
    if (!body?.text || !body.target) {
      return c.json({ error: 'text y target requeridos' }, 400);
    }
    const text = body.text.slice(0, 400);
    const target = body.target.slice(0, 8);
    const source = (body.source ?? 'unknown').slice(0, 12);
    const hints = glossaryHints(text, target);

    // Prioridad al motor local: gratis y sin cuota. Si no da nada, Workers AI.
    let refined: string | null = null;
    if (config.ollama) {
      refined = await ollamaTranslate(config.ollama, text, source, target, hints).catch(() => null);
    }
    if (!refined && config.ai) {
      refined = await chatTranslate(config.ai, text, source, target, hints).catch(() => null);
    }
    const out = usableTranslation(refined);
    // Sin mejora que ofrecer se dice, y la pantalla se queda como está.
    if (!out) return c.json({ error: 'no-refinement' }, 404);
    return c.json({ translation: out, translationSource: 'llm' });
  });

  return app;
}
