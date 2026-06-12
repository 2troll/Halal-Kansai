/**
 * Cliente del modo transmisor: un móvil junto al altavoz transmite los
 * segmentos reconocidos; los demás reciben por WebSocket la traducción
 * en su idioma (el servidor traduce una vez por idioma distinto).
 */
import type { TranslatedSegment } from './translate';

export type RoomRole = 'transmitter' | 'receiver';

export interface RoomCallbacks {
  onJoined(listeners: number): void;
  onSegment(segment: TranslatedSegment): void;
  onListeners(count: number): void;
  /** code: 'roomTaken' | 'roomFull' | 'badRequest' | 'connection' */
  onError(code: string): void;
  onClose(): void;
}

export interface RoomOptions {
  room: string;
  role: RoomRole;
  /** Idioma en el que quieres recibir los segmentos. */
  lang: string;
  /** Locale del reconocimiento de voz (solo transmisor). */
  source?: string;
}

export class KhutbahRoom {
  private ws: WebSocket | null = null;
  private closedByUs = false;

  connect(opts: RoomOptions, callbacks: RoomCallbacks): void {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${location.host}/api/khutbah/ws?room=${encodeURIComponent(opts.room)}`;
    const ws = new WebSocket(url);
    this.ws = ws;
    this.closedByUs = false;

    ws.addEventListener('open', () => {
      ws.send(
        JSON.stringify({
          type: 'hello',
          role: opts.role,
          room: opts.room,
          lang: opts.lang,
          source: opts.source,
        }),
      );
    });

    ws.addEventListener('message', (ev) => {
      let msg: { type: string; [k: string]: unknown };
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (msg.type === 'joined') callbacks.onJoined(Number(msg.listeners ?? 0));
      else if (msg.type === 'segment') callbacks.onSegment(msg.segment as TranslatedSegment);
      else if (msg.type === 'listeners') callbacks.onListeners(Number(msg.count ?? 0));
      else if (msg.type === 'error') callbacks.onError(String(msg.code ?? 'connection'));
    });

    ws.addEventListener('error', () => callbacks.onError('connection'));
    ws.addEventListener('close', () => {
      if (!this.closedByUs) callbacks.onClose();
    });
  }

  sendSegment(text: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'segment', text }));
    }
  }

  close(): void {
    this.closedByUs = true;
    this.ws?.close(1000);
    this.ws = null;
  }
}
