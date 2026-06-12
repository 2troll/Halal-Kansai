/**
 * Entrada de desarrollo local: npm run dev:server
 * (el proxy de Vite apunta /api → localhost:8787, WebSocket incluido)
 */
import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { buildSegment } from './segment.ts';
import { RoomHub, type RoomConnection } from './room.ts';
import { NodeStore } from './store.ts';
import { FileSuggestionStore } from './suggestions.ts';

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.warn('⚠ ANTHROPIC_API_KEY no definida: /api/translate devolverá 502.');
}

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), '../data');
const store = new NodeStore(dataDir);
const llm = { apiKey: apiKey ?? '', model: process.env.ANTHROPIC_MODEL };

const app = createApp({
  store,
  llm,
  allowedOrigins: ['*'], // solo desarrollo; en producción ver worker.ts
  rateLimitPerMinute: 60,
  suggestions: new FileSuggestionStore(`${dataDir}/suggestions.json`),
  adminToken: process.env.ADMIN_TOKEN ?? 'dev-admin-token',
});

// ---------- Modo transmisor (WebSocket, Fase 4) ----------

const hub = new RoomHub({
  translate: (text, source, target) => buildSegment({ llm, store }, text, source, target),
});

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.get(
  '/api/khutbah/ws',
  upgradeWebSocket(() => {
    let conn: RoomConnection | null = null;
    return {
      onOpen(_evt, ws) {
        conn = {
          send: (data) => ws.send(data),
          close: (code, reason) => ws.close(code, reason),
        };
      },
      onMessage(evt) {
        if (conn) hub.handleMessage(conn, evt.data);
      },
      onClose() {
        if (conn) hub.handleClose(conn);
      },
    };
  }),
);

const port = Number(process.env.PORT ?? 8787);
const server = serve({ fetch: app.fetch, port }, () => {
  console.log(`Halal Kansai API → http://localhost:${port}/api/health`);
});
injectWebSocket(server);
