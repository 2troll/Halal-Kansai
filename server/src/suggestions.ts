/**
 * Cola de moderación de lugares sugeridos por la comunidad.
 *
 * Flujo: POST /api/places/suggest (público, rate-limited) → cola "pending" →
 * el admin (token) aprueba o rechaza → los aprobados salen en GET /api/places
 * y el frontend los fusiona con los lugares de fábrica.
 */

export type PlaceType = 'mosque' | 'restaurant' | 'shop';
export type SuggestionStatus = 'pending' | 'approved' | 'rejected';

export interface Suggestion {
  id: string;
  name: string;
  type: PlaceType;
  city: string;
  address?: string;
  lat?: number;
  lng?: number;
  note?: string;
  status: SuggestionStatus;
  createdAt: string;
}

export interface SuggestionStore {
  add(s: Suggestion): Promise<void>;
  list(status?: SuggestionStatus): Promise<Suggestion[]>;
  setStatus(id: string, status: SuggestionStatus): Promise<Suggestion | null>;
}

const PLACE_TYPES: ReadonlySet<string> = new Set(['mosque', 'restaurant', 'shop']);

/** Valida y sanea la entrada del formulario público. Devuelve null si no vale. */
export function parseSuggestion(body: unknown): Suggestion | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name.trim().slice(0, 120) : '';
  const city = typeof b.city === 'string' ? b.city.trim().slice(0, 60) : '';
  const type = typeof b.type === 'string' ? b.type : '';
  if (!name || !city || !PLACE_TYPES.has(type)) return null;

  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  const lat = num(b.lat);
  const lng = num(b.lng);
  if ((lat === undefined) !== (lng === undefined)) return null;
  if (lat !== undefined && (Math.abs(lat) > 90 || Math.abs(lng!) > 180)) return null;

  return {
    id: crypto.randomUUID(),
    name,
    type: type as PlaceType,
    city,
    address: typeof b.address === 'string' ? b.address.trim().slice(0, 200) || undefined : undefined,
    lat,
    lng,
    note: typeof b.note === 'string' ? b.note.trim().slice(0, 500) || undefined : undefined,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

/** Para tests y como base de las demás implementaciones. */
export class MemorySuggestionStore implements SuggestionStore {
  protected items: Suggestion[] = [];

  async add(s: Suggestion): Promise<void> {
    this.items.push(s);
    await this.persist();
  }

  async list(status?: SuggestionStatus): Promise<Suggestion[]> {
    await this.load();
    return status ? this.items.filter((s) => s.status === status) : [...this.items];
  }

  async setStatus(id: string, status: SuggestionStatus): Promise<Suggestion | null> {
    await this.load();
    const item = this.items.find((s) => s.id === id);
    if (!item) return null;
    item.status = status;
    await this.persist();
    return item;
  }

  protected async persist(): Promise<void> {}
  protected async load(): Promise<void> {}
}

/** Desarrollo local: persiste en server/data/suggestions.json. */
export class FileSuggestionStore extends MemorySuggestionStore {
  private path: string;
  private loaded = false;

  constructor(path: string) {
    super();
    this.path = path;
  }

  protected override async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const { readFile } = await import('node:fs/promises');
      this.items = JSON.parse(await readFile(this.path, 'utf8'));
    } catch {
      this.items = [];
    }
  }

  protected override async persist(): Promise<void> {
    await this.load();
    const { writeFile } = await import('node:fs/promises');
    await writeFile(this.path, JSON.stringify(this.items, null, 2));
  }

  override async add(s: Suggestion): Promise<void> {
    await this.load();
    await super.add(s);
  }
}

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

/** Producción (Cloudflare Workers): KV con una sola clave-lista.
 *  Volumen esperado bajísimo (sugerencias manuales); si creciera,
 *  migrar a una clave por sugerencia o a D1. */
export class KVSuggestionStore implements SuggestionStore {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  private async read(): Promise<Suggestion[]> {
    const raw = await this.kv.get('suggestions');
    return raw ? (JSON.parse(raw) as Suggestion[]) : [];
  }

  async add(s: Suggestion): Promise<void> {
    const items = await this.read();
    items.push(s);
    await this.kv.put('suggestions', JSON.stringify(items));
  }

  async list(status?: SuggestionStatus): Promise<Suggestion[]> {
    const items = await this.read();
    return status ? items.filter((x) => x.status === status) : items;
  }

  async setStatus(id: string, status: SuggestionStatus): Promise<Suggestion | null> {
    const items = await this.read();
    const item = items.find((x) => x.id === id);
    if (!item) return null;
    item.status = status;
    await this.kv.put('suggestions', JSON.stringify(items));
    return item;
  }
}
