import { describe, expect, it, vi } from 'vitest';
import { RoomHub, type RoomConnection } from '../server/src/room.ts';
import type { TranslatedSegment } from '../server/src/segment.ts';

/** Conexión falsa que acumula los mensajes recibidos. */
function fakeConn() {
  const sent: Array<Record<string, unknown>> = [];
  let closed = false;
  const conn: RoomConnection = {
    send: (d) => sent.push(JSON.parse(d)),
    close: () => {
      closed = true;
    },
  };
  return {
    conn,
    sent,
    isClosed: () => closed,
    last: (type: string) => [...sent].reverse().find((m) => m.type === type),
  };
}

const fakeSegment = (text: string, lang: string): TranslatedSegment => ({
  kind: 'speech',
  translation: `[${lang}] ${text}`,
  original: text,
  verified: false,
  translationSource: 'llm',
});

function makeHub(translate = vi.fn(async (text: string, _s: string, lang: string) => fakeSegment(text, lang))) {
  return { hub: new RoomHub({ translate, maxListeners: 3 }), translate };
}

const hello = (role: string, room = 'osaka-masjid', lang = 'es') =>
  JSON.stringify({ type: 'hello', role, room, lang, source: 'ur-PK' });

async function flush() {
  await new Promise((r) => setTimeout(r, 0));
}

describe('RoomHub', () => {
  it('transmisor + oyentes en idiomas distintos: una traducción por idioma', async () => {
    const { hub, translate } = makeHub();
    const tx = fakeConn();
    const rxEs = fakeConn();
    const rxJa = fakeConn();
    const rxJa2 = fakeConn();

    hub.handleMessage(tx.conn, hello('transmitter', 'osaka-masjid', 'ur'));
    hub.handleMessage(rxEs.conn, hello('receiver', 'osaka-masjid', 'es'));
    hub.handleMessage(rxJa.conn, hello('receiver', 'osaka-masjid', 'ja'));
    hub.handleMessage(rxJa2.conn, hello('receiver', 'osaka-masjid', 'ja'));

    expect(tx.last('joined')).toBeTruthy();
    expect(tx.last('listeners')!.count).toBe(3);

    hub.handleMessage(tx.conn, JSON.stringify({ type: 'segment', text: 'hola hermanos' }));
    await flush();

    // 3 idiomas distintos (ur del transmisor, es, ja) → 3 llamadas, no 4.
    expect(translate).toHaveBeenCalledTimes(3);
    expect((rxEs.last('segment')!.segment as TranslatedSegment).translation).toBe('[es] hola hermanos');
    expect((rxJa.last('segment')!.segment as TranslatedSegment).translation).toBe('[ja] hola hermanos');
    expect((rxJa2.last('segment')!.segment as TranslatedSegment).translation).toBe('[ja] hola hermanos');
    expect((tx.last('segment')!.segment as TranslatedSegment).translation).toBe('[ur] hola hermanos');
  });

  it('rechaza un segundo transmisor en la misma sala', () => {
    const { hub } = makeHub();
    const tx1 = fakeConn();
    const tx2 = fakeConn();
    hub.handleMessage(tx1.conn, hello('transmitter'));
    hub.handleMessage(tx2.conn, hello('transmitter'));
    expect(tx2.last('error')!.code).toBe('roomTaken');
    expect(tx2.isClosed()).toBe(true);
  });

  it('si el transmisor se va, otro puede ocupar la sala', () => {
    const { hub } = makeHub();
    const tx1 = fakeConn();
    const rx = fakeConn();
    const tx2 = fakeConn();
    hub.handleMessage(tx1.conn, hello('transmitter'));
    hub.handleMessage(rx.conn, hello('receiver'));
    hub.handleClose(tx1.conn);
    hub.handleMessage(tx2.conn, hello('transmitter'));
    expect(tx2.last('joined')).toBeTruthy();
  });

  it('los oyentes no pueden emitir segmentos', async () => {
    const { hub, translate } = makeHub();
    const tx = fakeConn();
    const rx = fakeConn();
    hub.handleMessage(tx.conn, hello('transmitter'));
    hub.handleMessage(rx.conn, hello('receiver'));
    hub.handleMessage(rx.conn, JSON.stringify({ type: 'segment', text: 'spam' }));
    await flush();
    expect(rx.last('error')!.code).toBe('notTransmitter');
    expect(translate).not.toHaveBeenCalled();
  });

  it('si el LLM falla, reenvía el original sin traducir (la sala sigue viva)', async () => {
    const { hub } = makeHub(vi.fn(async () => Promise.reject(new Error('sin clave'))));
    const tx = fakeConn();
    const rx = fakeConn();
    hub.handleMessage(tx.conn, hello('transmitter'));
    hub.handleMessage(rx.conn, hello('receiver'));
    hub.handleMessage(tx.conn, JSON.stringify({ type: 'segment', text: 'texto crudo' }));
    await flush();
    const seg = rx.last('segment')!.segment as TranslatedSegment;
    expect(seg.translation).toBe('texto crudo');
    expect(seg.verified).toBe(false);
  });

  it('aplica el límite de oyentes y valida la sala', () => {
    const { hub } = makeHub();
    hub.handleMessage(fakeConn().conn, hello('transmitter'));
    for (let i = 0; i < 3; i++) hub.handleMessage(fakeConn().conn, hello('receiver'));
    const extra = fakeConn();
    hub.handleMessage(extra.conn, hello('receiver'));
    expect(extra.last('error')!.code).toBe('roomFull');

    const bad = fakeConn();
    hub.handleMessage(bad.conn, hello('receiver', 'x'));
    expect(bad.last('error')!.code).toBe('badRequest');
  });

  it('las salas vacías se eliminan', () => {
    const { hub } = makeHub();
    const tx = fakeConn();
    const rx = fakeConn();
    hub.handleMessage(tx.conn, hello('transmitter'));
    hub.handleMessage(rx.conn, hello('receiver'));
    expect(hub.roomCount).toBe(1);
    hub.handleClose(tx.conn);
    hub.handleClose(rx.conn);
    expect(hub.roomCount).toBe(0);
  });
});
