/**
 * Modo transmisor (Fase 4): un móvil junto al altavoz de la mezquita
 * transmite los segmentos reconocidos; los demás reciben la traducción
 * en SU idioma por WebSocket.
 *
 * RoomHub es independiente del transporte: lo usan igual el servidor Node
 * de desarrollo (@hono/node-ws) y el Durable Object de Cloudflare.
 *
 * Protocolo (JSON por mensaje):
 *   cliente → servidor
 *     { type:'hello', role:'transmitter'|'receiver', room, lang, source? }
 *     { type:'segment', text }              (solo transmisor)
 *   servidor → cliente
 *     { type:'joined', room, listeners }
 *     { type:'listeners', count }
 *     { type:'segment', segment }           (TranslatedSegment en tu idioma)
 *     { type:'error', code }                ('roomTaken'|'badRequest'|'notTransmitter')
 */
import type { TranslatedSegment } from './segment.ts';

export interface RoomConnection {
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export interface HubDeps {
  /** Traduce un segmento al idioma dado (LLM + verificación coránica). */
  translate(text: string, source: string, target: string): Promise<TranslatedSegment>;
  maxListeners?: number;
}

interface Member {
  conn: RoomConnection;
  role: 'transmitter' | 'receiver';
  lang: string;
  source: string;
}

interface Room {
  transmitter: Member | null;
  receivers: Set<Member>;
}

const ROOM_RE = /^[a-z0-9-]{3,24}$/i;
const MAX_SEGMENT_CHARS = 1000;

function fallbackSegment(text: string): TranslatedSegment {
  // Si el LLM falla, la sala sigue viva: se reenvía el original sin traducir.
  return {
    kind: 'speech',
    translation: text,
    original: text,
    verified: false,
    translationSource: 'llm',
  };
}

export class RoomHub {
  private deps: HubDeps;
  private rooms = new Map<string, Room>();
  private members = new Map<RoomConnection, { roomId: string; member: Member }>();

  constructor(deps: HubDeps) {
    this.deps = deps;
  }

  /** Número de salas activas (para tests/diagnóstico). */
  get roomCount(): number {
    return this.rooms.size;
  }

  handleMessage(conn: RoomConnection, raw: unknown): void {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(String(raw)) as Record<string, unknown>;
    } catch {
      conn.send(JSON.stringify({ type: 'error', code: 'badRequest' }));
      return;
    }
    if (msg.type === 'hello') {
      this.join(conn, msg);
    } else if (msg.type === 'segment') {
      this.segment(conn, msg);
    } else {
      conn.send(JSON.stringify({ type: 'error', code: 'badRequest' }));
    }
  }

  handleClose(conn: RoomConnection): void {
    const entry = this.members.get(conn);
    if (!entry) return;
    this.members.delete(conn);
    const room = this.rooms.get(entry.roomId);
    if (!room) return;

    if (entry.member.role === 'transmitter') {
      room.transmitter = null;
    } else {
      room.receivers.delete(entry.member);
    }
    if (!room.transmitter && room.receivers.size === 0) {
      this.rooms.delete(entry.roomId);
    } else {
      this.broadcastListeners(entry.roomId);
    }
  }

  private join(conn: RoomConnection, msg: Record<string, unknown>): void {
    const roomId = typeof msg.room === 'string' ? msg.room.toLowerCase() : '';
    const role = msg.role === 'transmitter' || msg.role === 'receiver' ? msg.role : null;
    const lang = typeof msg.lang === 'string' ? msg.lang.slice(0, 8) : '';
    if (!ROOM_RE.test(roomId) || !role || !lang) {
      conn.send(JSON.stringify({ type: 'error', code: 'badRequest' }));
      conn.close(1008, 'badRequest');
      return;
    }

    let room = this.rooms.get(roomId);
    if (!room) {
      room = { transmitter: null, receivers: new Set() };
      this.rooms.set(roomId, room);
    }

    const member: Member = {
      conn,
      role,
      lang,
      source: typeof msg.source === 'string' ? msg.source.slice(0, 12) : 'unknown',
    };

    if (role === 'transmitter') {
      if (room.transmitter) {
        conn.send(JSON.stringify({ type: 'error', code: 'roomTaken' }));
        conn.close(1008, 'roomTaken');
        return;
      }
      room.transmitter = member;
    } else {
      if (room.receivers.size >= (this.deps.maxListeners ?? 300)) {
        conn.send(JSON.stringify({ type: 'error', code: 'roomFull' }));
        conn.close(1008, 'roomFull');
        return;
      }
      room.receivers.add(member);
    }

    this.members.set(conn, { roomId, member });
    conn.send(JSON.stringify({ type: 'joined', room: roomId, listeners: room.receivers.size }));
    this.broadcastListeners(roomId);
  }

  private segment(conn: RoomConnection, msg: Record<string, unknown>): void {
    const entry = this.members.get(conn);
    if (!entry || entry.member.role !== 'transmitter') {
      conn.send(JSON.stringify({ type: 'error', code: 'notTransmitter' }));
      return;
    }
    const text = typeof msg.text === 'string' ? msg.text.trim().slice(0, MAX_SEGMENT_CHARS) : '';
    if (!text) return;

    const room = this.rooms.get(entry.roomId);
    if (!room) return;

    // Una traducción por idioma distinto en la sala, no por oyente.
    const byLang = new Map<string, Member[]>();
    const everyone = [entry.member, ...room.receivers];
    for (const m of everyone) {
      const list = byLang.get(m.lang) ?? [];
      list.push(m);
      byLang.set(m.lang, list);
    }

    const source = entry.member.source;
    for (const [lang, members] of byLang) {
      void this.deps
        .translate(text, source, lang)
        .catch(() => fallbackSegment(text))
        .then((segment) => {
          const payload = JSON.stringify({ type: 'segment', segment });
          for (const m of members) {
            try {
              m.conn.send(payload);
            } catch {
              /* conexión muerta: la limpiará handleClose */
            }
          }
        });
    }
  }

  private broadcastListeners(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const payload = JSON.stringify({ type: 'listeners', count: room.receivers.size });
    for (const m of [room.transmitter, ...room.receivers]) {
      if (!m) continue;
      try {
        m.conn.send(payload);
      } catch {
        /* idem */
      }
    }
  }
}
