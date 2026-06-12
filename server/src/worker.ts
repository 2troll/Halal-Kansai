/**
 * Entrada para Cloudflare Workers (despliegue: wrangler deploy).
 * Los datos coránicos (29 MB) se sirven desde Static Assets (binding ASSETS),
 * no desde el bundle del worker.
 *
 * Secretos/vars (wrangler.jsonc):
 *   ANTHROPIC_API_KEY  (secreto) — clave con límite de gasto mensual.
 *   ADMIN_TOKEN        (secreto) — panel de moderación /admin.html.
 *   ANTHROPIC_MODEL    (var, opcional) — por defecto claude-opus-4-8.
 *   ALLOWED_ORIGINS    (var) — orígenes CORS separados por coma.
 *   SUGGESTIONS        (KV) — cola de moderación de lugares.
 *   KHUTBAH_ROOMS      (Durable Object) — salas del modo transmisor.
 */
import type { Hono } from 'hono';
import { createApp } from './app.ts';
import { WorkersAssetsStore } from './store.ts';
import { KVSuggestionStore } from './suggestions.ts';

export { KhutbahRoomDO } from './room-do.ts';

interface DurableObjectNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(request: Request): Promise<Response> };
}

interface Env {
  ASSETS: { fetch(request: Request | string): Promise<Response> };
  SUGGESTIONS?: { get(key: string): Promise<string | null>; put(key: string, value: string): Promise<void> };
  KHUTBAH_ROOMS?: DurableObjectNamespace;
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_MODEL?: string;
  ALLOWED_ORIGINS?: string;
  ADMIN_TOKEN?: string;
}

const ROOM_RE = /^[a-z0-9-]{3,24}$/i;

let app: Hono | null = null;

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    const url = new URL(request.url);

    // Modo transmisor: cada sala es un Durable Object (estado compartido
    // entre todas las conexiones de la sala).
    if (url.pathname === '/api/khutbah/ws') {
      if (!env.KHUTBAH_ROOMS) return new Response('rooms disabled', { status: 503 });
      const room = (url.searchParams.get('room') ?? '').toLowerCase();
      if (!ROOM_RE.test(room)) return new Response('bad room', { status: 400 });
      const stub = env.KHUTBAH_ROOMS.get(env.KHUTBAH_ROOMS.idFromName(room));
      return stub.fetch(request);
    }

    if (!app) {
      app = createApp({
        store: new WorkersAssetsStore(env.ASSETS),
        llm: { apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL },
        allowedOrigins: (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
        rateLimitPerMinute: 30,
        suggestions: env.SUGGESTIONS ? new KVSuggestionStore(env.SUGGESTIONS) : undefined,
        adminToken: env.ADMIN_TOKEN,
      });
    }
    return app.fetch(request);
  },
};
