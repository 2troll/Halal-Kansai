/**
 * Durable Object de Cloudflare para el modo transmisor: cada sala vive en
 * una instancia (idFromName(roomId)), así todas las conexiones WebSocket de
 * la sala comparten el mismo RoomHub aunque lleguen a isolates distintos.
 *
 * Tipos mínimos declarados a mano para no depender de @cloudflare/workers-types.
 */
import { buildSegment } from './segment.ts';
import { RoomHub, type RoomConnection } from './room.ts';
import { WorkersAssetsStore } from './store.ts';
import type { AiBinding } from './ai-translate.ts';

interface WorkersWebSocket {
  accept(): void;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: 'message' | 'close', cb: (ev: { data?: unknown }) => void): void;
}

declare const WebSocketPair: new () => Record<string, WorkersWebSocket>;

interface DOEnv {
  ASSETS: { fetch(request: Request | string): Promise<Response> };
  /**
   * Workers AI. Sin esto, la sala de transmisión NO traducía: caía al
   * proveedor externo, que limita por IP y desde Cloudflare está siempre
   * agotado, y acababa mostrando el árabe original a toda la mezquita.
   * El fallo era mudo: la sala funcionaba, los oyentes se conectaban, y lo
   * que les llegaba era el sermón sin traducir.
   */
  AI?: AiBinding;
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_MODEL?: string;
}

export class KhutbahRoomDO {
  private hub: RoomHub;

  constructor(_state: unknown, env: DOEnv) {
    const store = new WorkersAssetsStore(env.ASSETS);
    const llm = { apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL };
    const ai = env.AI;
    this.hub = new RoomHub({
      translate: (text, source, target) => buildSegment({ llm, store, ai }, text, source, target),
    });
  }

  fetch(request: Request): Response {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('expected websocket', { status: 426 });
    }
    const pair = new WebSocketPair();
    const client = pair['0'];
    const server = pair['1'];
    server.accept();

    const conn: RoomConnection = {
      send: (data) => server.send(data),
      close: (code, reason) => server.close(code, reason),
    };
    server.addEventListener('message', (ev) => this.hub.handleMessage(conn, ev.data));
    server.addEventListener('close', () => this.hub.handleClose(conn));

    return new Response(null, { status: 101, webSocket: client } as unknown as ResponseInit);
  }
}
