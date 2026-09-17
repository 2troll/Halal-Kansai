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
import { MemoryFeedbackStore } from './feedback.ts';
import { ollamaHealth, type OllamaConfig } from './ollama-translate.ts';

const apiKey = process.env.ANTHROPIC_API_KEY;

// Ollama local: motor de traducción GRATIS y SIN CUOTA para la jutba. Se
// activa definiendo OLLAMA_URL (p. ej. http://127.0.0.1:11434). Es lo que
// permite traducir una jutba entera de 1-1,5 h sin toparse con ningún tope de
// pago. Requiere `ollama serve` encendido en esta máquina o en la red.
const ollama: OllamaConfig | undefined = process.env.OLLAMA_URL
  ? {
      baseUrl: process.env.OLLAMA_URL,
      model: process.env.OLLAMA_MODEL, // undefined → qwen2.5:7b por defecto
    }
  : undefined;

if (ollama) {
  console.log(`🟢 Ollama activado (${ollama.baseUrl}, modelo ${ollama.model ?? 'qwen2.5:7b'}).`);
  console.log('   Traducción gratis y sin cuota — la jutba no se cortará por límite de pago.');
} else if (!apiKey) {
  console.warn(
    '⚠ Sin OLLAMA_URL ni ANTHROPIC_API_KEY: /api/translate usará MyMemory/Google (límite por IP).',
  );
  console.warn('   Para traducción gratis e ilimitada: OLLAMA_URL=http://127.0.0.1:11434 npm run dev:server');
}

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), '../data');
const store = new NodeStore(dataDir);
const llm = { apiKey: apiKey ?? '', model: process.env.ANTHROPIC_MODEL };

const app = createApp({
  store,
  llm,
  ollama,
  allowedOrigins: ['*'], // solo desarrollo; en producción ver worker.ts
  rateLimitPerMinute: 60,
  suggestions: new FileSuggestionStore(`${dataDir}/suggestions.json`),
  feedback: new MemoryFeedbackStore(),
  adminToken: process.env.ADMIN_TOKEN ?? 'dev-admin-token',
});

// Aviso honesto al arrancar: comprobamos que Ollama responde y que el modelo
// está descargado. No bloquea el arranque; solo avisa por consola.
if (ollama) {
  void ollamaHealth(ollama).then((h) => {
    if (!h.ok) {
      console.warn(`⚠ Ollama no responde en ${ollama.baseUrl} (${h.error ?? 'sin detalle'}).`);
      console.warn('   Enciéndelo con `ollama serve`. Mientras, se usará MyMemory/Google.');
      return;
    }
    const want = ollama.model ?? 'qwen2.5:7b';
    const has = h.models.some((m) => m === want || m.startsWith(`${want}:`) || m.split(':')[0] === want.split(':')[0]);
    if (!has) {
      console.warn(`⚠ Ollama responde pero el modelo "${want}" no está descargado.`);
      console.warn(`   Descárgalo con: ollama pull ${want}   (modelos: ${h.models.join(', ') || 'ninguno'})`);
    } else {
      console.log(`✓ Ollama listo. Modelos disponibles: ${h.models.join(', ')}`);
    }
  });
}

// ---------- Modo transmisor (WebSocket, Fase 4) ----------

const hub = new RoomHub({
  translate: (text, source, target) => buildSegment({ llm, store, ollama }, text, source, target),
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
