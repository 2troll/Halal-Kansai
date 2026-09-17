import { describe, expect, it } from 'vitest';
import { createApp } from '../server/src/app.ts';
import { MAX_STORED, MemoryFeedbackStore, parseFeedback } from '../server/src/feedback.ts';
import type { QuranStore } from '../server/src/store.ts';

const fakeQuran: QuranStore = { loadUthmani: async () => ({}), loadTranslation: async () => null };

function makeApp(allowedOrigins: string[] = ['*']) {
  return createApp({
    store: fakeQuran,
    llm: { apiKey: '' },
    allowedOrigins,
    feedback: new MemoryFeedbackStore(),
    adminToken: 'secreto',
  });
}

const post = (body: unknown, headers: Record<string, string> = {}) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

const VALID = { kind: 'bug', message: 'El Asr sale a otra hora que en mi mezquita' };

describe('parseFeedback', () => {
  it('acepta lo mínimo y guarda el contexto técnico válido', () => {
    const f = parseFeedback({ ...VALID, rating: 4, lang: 'es', platform: 'android', appVersion: '1.0.0', tab: 'salat' });
    expect(f).toMatchObject({ kind: 'bug', rating: 4, lang: 'es', platform: 'android', appVersion: '1.0.0', tab: 'salat' });
  });

  it('rechaza mensajes vacíos o muy cortos y tipos desconocidos', () => {
    expect(parseFeedback({ ...VALID, message: '  ok ' })).toBeNull();
    expect(parseFeedback({ ...VALID, kind: 'spam' })).toBeNull();
    expect(parseFeedback(null)).toBeNull();
  });

  it('descarta en silencio los campos que no son de la lista, sin guardar basura', () => {
    const f = parseFeedback({ ...VALID, rating: 9, lang: 'xx', platform: 'windows', appVersion: '<script>', tab: 'x', email: 'a@b.c' });
    expect(f).not.toBeNull();
    expect(f).not.toHaveProperty('email');
    expect([f!.rating, f!.lang, f!.platform, f!.appVersion, f!.tab]).toEqual([undefined, undefined, undefined, undefined, undefined]);
  });

  it('recorta mensajes larguísimos', () => {
    expect(parseFeedback({ ...VALID, message: 'x'.repeat(5000) })!.message).toHaveLength(1000);
  });
});

describe('POST /api/feedback y panel admin', () => {
  it('guarda y el admin lo lee, lo último primero', async () => {
    const app = makeApp();
    expect((await app.request('/api/feedback', post(VALID))).status).toBe(201);
    expect((await app.request('/api/feedback', post({ kind: 'idea', message: 'Añadir horario de Jumu‘ah' }))).status).toBe(201);
    const res = await app.request('/api/admin/feedback', { headers: { Authorization: 'Bearer secreto' } });
    const data = (await res.json()) as { feedback: Array<{ kind: string }> };
    expect(data.feedback.map((f) => f.kind)).toEqual(['idea', 'bug']);
  });

  it('sin token no se leen las opiniones', async () => {
    const res = await makeApp().request('/api/admin/feedback');
    expect(res.status).toBe(401);
  });

  it('datos inválidos → 400', async () => {
    expect((await makeApp().request('/api/feedback', post({ kind: 'bug' }))).status).toBe(400);
  });

  it('no crece sin fin', async () => {
    const store = new MemoryFeedbackStore();
    for (let i = 0; i < MAX_STORED + 20; i++) await store.add(parseFeedback(VALID)!);
    expect((await store.list()).length).toBe(MAX_STORED);
  });
});

describe('CORS de la app nativa', () => {
  it('la app instalada (Android e iOS) puede llamar a la API aunque ALLOWED_ORIGINS esté vacío', async () => {
    const app = makeApp([]);
    for (const origin of ['https://localhost', 'capacitor://localhost']) {
      const res = await app.request('/api/feedback', {
        method: 'OPTIONS',
        headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
      });
      expect(res.headers.get('access-control-allow-origin')).toBe(origin);
    }
  });

  it('una web cualquiera sigue sin permiso', async () => {
    const res = await makeApp([]).request('/api/feedback', {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' },
    });
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });
});
