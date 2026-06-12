/**
 * Entrada de desarrollo local: npm run dev:server
 * (el proxy de Vite apunta /api → localhost:8787)
 */
import { serve } from '@hono/node-server';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { NodeStore } from './store.ts';
import { FileSuggestionStore } from './suggestions.ts';

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.warn('⚠ ANTHROPIC_API_KEY no definida: /api/translate devolverá 502.');
}

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), '../data');
const app = createApp({
  store: new NodeStore(dataDir),
  llm: { apiKey: apiKey ?? '', model: process.env.ANTHROPIC_MODEL },
  allowedOrigins: ['*'], // solo desarrollo; en producción ver worker.ts
  rateLimitPerMinute: 60,
  suggestions: new FileSuggestionStore(`${dataDir}/suggestions.json`),
  adminToken: process.env.ADMIN_TOKEN ?? 'dev-admin-token',
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, () => {
  console.log(`Halal Kansai API → http://localhost:${port}/api/health`);
});
