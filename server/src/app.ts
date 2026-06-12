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
import { getMatcher, type QuranStore } from './store.ts';
import { parseSuggestion, type SuggestionStatus, type SuggestionStore } from './suggestions.ts';

export interface AppConfig {
  store: QuranStore;
  llm: LlmConfig;
  /** Orígenes permitidos para CORS; '*' solo en desarrollo. */
  allowedOrigins: string[];
  /** Peticiones por minuto y por IP en /api/translate. */
  rateLimitPerMinute?: number;
  /** Cola de moderación de lugares sugeridos (Fase 3). */
  suggestions?: SuggestionStore;
  /** Token Bearer del panel admin; sin él, las rutas admin devuelven 503. */
  adminToken?: string;
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
        config.allowedOrigins.includes('*') || config.allowedOrigins.includes(origin)
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

  // ---------- Panel admin (token Bearer) ----------

  const requireAdmin = (authHeader: string | undefined): boolean =>
    Boolean(config.adminToken) && authHeader === `Bearer ${config.adminToken}`;

  app.get('/api/admin/suggestions', async (c) => {
    if (!config.suggestions || !config.adminToken) return c.json({ error: 'no disponible' }, 503);
    if (!requireAdmin(c.req.header('Authorization'))) return c.json({ error: 'no autorizado' }, 401);
    const status = c.req.query('status') as SuggestionStatus | undefined;
    return c.json({ suggestions: await config.suggestions.list(status) });
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
      return c.json(await buildSegment({ llm: config.llm, store: config.store }, text, source, target));
    } catch {
      return c.json({ error: 'translation failed' }, 502);
    }
  });

  return app;
}
