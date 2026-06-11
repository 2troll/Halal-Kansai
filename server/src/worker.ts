/**
 * Entrada para Cloudflare Workers (despliegue: wrangler deploy).
 * Los datos coránicos (29 MB) se sirven desde Static Assets (binding ASSETS),
 * no desde el bundle del worker.
 *
 * Secretos/vars (wrangler.jsonc + `wrangler secret put ANTHROPIC_API_KEY`):
 *   ANTHROPIC_API_KEY  (secreto) — clave con límite de gasto mensual.
 *   ANTHROPIC_MODEL    (var, opcional) — por defecto claude-opus-4-8.
 *   ALLOWED_ORIGINS    (var) — orígenes CORS separados por coma.
 */
import type { Hono } from 'hono';
import { createApp } from './app.ts';
import { WorkersAssetsStore } from './store.ts';

interface Env {
  ASSETS: { fetch(request: Request | string): Promise<Response> };
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_MODEL?: string;
  ALLOWED_ORIGINS?: string;
}

let app: Hono | null = null;

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    if (!app) {
      app = createApp({
        store: new WorkersAssetsStore(env.ASSETS),
        llm: { apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL },
        allowedOrigins: (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
        rateLimitPerMinute: 30,
      });
    }
    return app.fetch(request);
  },
};
