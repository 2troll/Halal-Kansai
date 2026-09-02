import { describe, expect, it } from 'vitest';
import { createApp } from '../server/src/app.ts';
import { MemorySuggestionStore, parseSuggestion } from '../server/src/suggestions.ts';
import type { QuranStore } from '../server/src/store.ts';

const fakeQuran: QuranStore = {
  loadUthmani: async () => ({}),
  loadTranslation: async () => null,
};

function makeApp(adminToken = 'secreto') {
  return createApp({
    store: fakeQuran,
    llm: { apiKey: '' },
    allowedOrigins: ['*'],
    suggestions: new MemorySuggestionStore(),
    adminToken,
  });
}

const json = (body: unknown) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const VALID = { name: 'Mezquita Nara', type: 'mosque', city: 'Nara' };

describe('parseSuggestion', () => {
  it('acepta una sugerencia mínima válida', () => {
    const s = parseSuggestion(VALID);
    expect(s).not.toBeNull();
    expect(s!.status).toBe('pending');
  });

  it('rechaza tipo desconocido, nombre vacío y coordenadas incompletas', () => {
    expect(parseSuggestion({ ...VALID, type: 'casino' })).toBeNull();
    expect(parseSuggestion({ ...VALID, name: '  ' })).toBeNull();
    expect(parseSuggestion({ ...VALID, lat: 34.6 })).toBeNull(); // lng falta
    expect(parseSuggestion({ ...VALID, lat: 234.6, lng: 135.5 })).toBeNull();
  });

  it('trunca campos largos', () => {
    const s = parseSuggestion({ ...VALID, name: 'x'.repeat(500) });
    expect(s!.name.length).toBe(120);
  });
});

describe('flujo de moderación', () => {
  it('sugerir → pending → aprobar → aparece en /api/places', async () => {
    const app = makeApp();

    const created = await app.request('/api/places/suggest', json(VALID));
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };

    // Pendiente: aún no es público.
    const before = (await (await app.request('/api/places')).json()) as { places: unknown[] };
    expect(before.places).toHaveLength(0);

    // Listado admin con token.
    const list = await app.request('/api/admin/suggestions?status=pending', {
      headers: { Authorization: 'Bearer secreto' },
    });
    expect(list.status).toBe(200);
    expect(((await list.json()) as { suggestions: unknown[] }).suggestions).toHaveLength(1);

    // Aprobar.
    const approve = await app.request(`/api/admin/suggestions/${id}`, {
      ...json({ action: 'approve' }),
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer secreto' },
    });
    expect(approve.status).toBe(200);

    // Ya es público y marcado como verificado por moderación.
    const after = (await (await app.request('/api/places')).json()) as {
      places: Array<{ name: string; verified: boolean }>;
    };
    expect(after.places).toHaveLength(1);
    expect(after.places[0].name).toBe('Mezquita Nara');
    expect(after.places[0].verified).toBe(true);
  });

  it('rechazar deja la sugerencia fuera de /api/places', async () => {
    const app = makeApp();
    const { id } = (await (await app.request('/api/places/suggest', json(VALID))).json()) as {
      id: string;
    };
    await app.request(`/api/admin/suggestions/${id}`, {
      ...json({ action: 'reject' }),
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer secreto' },
    });
    const places = (await (await app.request('/api/places')).json()) as { places: unknown[] };
    expect(places.places).toHaveLength(0);
  });

  it('las rutas admin exigen el token correcto', async () => {
    const app = makeApp();
    expect((await app.request('/api/admin/suggestions')).status).toBe(401);
    expect(
      (await app.request('/api/admin/suggestions', { headers: { Authorization: 'Bearer malo' } }))
        .status,
    ).toBe(401);
    const bad = await app.request('/api/admin/suggestions/xyz', {
      ...json({ action: 'approve' }),
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer secreto' },
    });
    expect(bad.status).toBe(404);
  });

  it('una entrada inválida devuelve 400', async () => {
    const app = makeApp();
    expect((await app.request('/api/places/suggest', json({ name: 'x' }))).status).toBe(400);
  });
});
