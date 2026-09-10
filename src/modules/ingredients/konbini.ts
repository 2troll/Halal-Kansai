/**
 * Base de productos de konbini: el feed que publica el productor (repo
 * `halal-konbini`) y que esta app consume.
 *
 * El productor rastrea y criba; la app solo lee. Las dos mitades no se conocen:
 * comparten un único archivo, `products.json`, descrito en `DATA-CONTRACT.md`.
 *
 * Reglas del consumidor que están implementadas aquí (contrato §6):
 *
 * - **El JAN es la clave primaria.** El nombre cambia cada vez que renuevan el
 *   envoltorio; el código de barras, no. No se busca por nombre.
 * - **El feed se guarda.** El caso de uso real es dentro de un konbini, con el
 *   móvil sin cobertura y la nevera delante. Se sirve lo guardado al instante y
 *   se refresca por detrás cuando hay red.
 * - **Un `schema_version` mayor que el soportado no rompe la app**: se sigue
 *   usando la copia guardada y se avisa de que hay que actualizar.
 *
 * Nunca lanza. Sin feed, la pestaña Comida funciona exactamente como antes:
 * Open Food Facts, o pegar la etiqueta a mano.
 */

/** Versión del contrato que esta app sabe leer. */
export const SUPPORTED_SCHEMA_VERSION = 1;

/** Ruta publicada dentro de la app (`public/feed/`), no una URL externa. */
export const FEED_PATH = 'feed/products.json';

const STORAGE_KEY = 'hk-konbini-feed';
/** Tope para no llenar `localStorage` y tumbar el resto de ajustes. */
const STORAGE_MAX_BYTES = 3_000_000;

export type ProductStatus =
  | 'certified'
  | 'manufacturer_confirmed'
  | 'label_clear'
  | 'ambiguous'
  | 'excluded'
  | 'unknown'
  | 'expired';

export type ProductSource = 'certificate' | 'manufacturer_reply' | 'label' | 'allergen_table' | 'none';

export type Chain = 'seven_eleven' | 'lawson' | 'familymart' | 'ministop' | 'daily_yamazaki' | 'other';

export interface Certification {
  body: string;
  certificate_id?: string | null;
  /** Obligatorio en el contrato: un certificado cubre un SKU y una planta. */
  scope: string;
  issued_at: string;
  expires_at: string;
  source_url?: string | null;
}

export interface KonbiniProduct {
  jan: string;
  name: string;
  chain: Chain;
  manufacturer?: string | null;
  factory_code?: string | null;
  status: ProductStatus;
  source: ProductSource;
  reason_codes: string[];
  certification: Certification | null;
  label_hash?: string | null;
  checked_at: string;
  recheck_after?: string | null;
  first_seen_at?: string | null;
}

export interface KonbiniFeed {
  schema_version: number;
  generated_at: string;
  dictionary_version?: string;
  policy_version?: string;
  count: number;
  products: KonbiniProduct[];
}

/**
 * De dónde salió lo que se está enseñando. La app lo muestra: no es lo mismo
 * un feed de esta semana que el que quedó guardado hace ocho meses.
 */
export type FeedStatus =
  /** Recién traído de la red. */
  | 'fresh'
  /** De la copia guardada: sin cobertura, o la red falló. */
  | 'cached'
  /** El feed publicado es de una versión de contrato que esta app no sabe leer. */
  | 'needs-update'
  /** No hay feed ni copia guardada. */
  | 'unavailable';

export interface FeedState {
  status: FeedStatus;
  feed: KonbiniFeed | null;
}

const STATUSES: ReadonlySet<string> = new Set([
  'certified',
  'manufacturer_confirmed',
  'label_clear',
  'ambiguous',
  'excluded',
  'unknown',
  'expired',
]);

const SOURCES: ReadonlySet<string> = new Set([
  'certificate',
  'manufacturer_reply',
  'label',
  'allergen_table',
  'none',
]);

const CHAINS: ReadonlySet<string> = new Set([
  'seven_eleven',
  'lawson',
  'familymart',
  'ministop',
  'daily_yamazaki',
  'other',
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Convierte un registro del JSON en producto, o lo descarta.
 *
 * Descartar uno malo y quedarse con los demás es deliberado: un registro roto
 * en un feed de mil no puede dejar sin base de datos a quien está en la tienda.
 */
function toProduct(raw: unknown): KonbiniProduct | null {
  if (!isObject(raw)) return null;
  const { jan, name, chain, status, source, checked_at: checkedAt } = raw;
  if (typeof jan !== 'string' || !/^\d{8}$|^\d{13}$/.test(jan)) return null;
  if (typeof name !== 'string' || name.length === 0) return null;
  if (typeof status !== 'string' || !STATUSES.has(status)) return null;
  if (typeof source !== 'string' || !SOURCES.has(source)) return null;
  if (typeof checkedAt !== 'string' || checkedAt.length === 0) return null;

  const codes = Array.isArray(raw.reason_codes)
    ? raw.reason_codes.filter((c): c is string => typeof c === 'string')
    : [];

  return {
    jan,
    name,
    chain: typeof chain === 'string' && CHAINS.has(chain) ? (chain as Chain) : 'other',
    manufacturer: typeof raw.manufacturer === 'string' ? raw.manufacturer : null,
    factory_code: typeof raw.factory_code === 'string' ? raw.factory_code : null,
    status: status as ProductStatus,
    source: source as ProductSource,
    reason_codes: codes,
    certification: toCertification(raw.certification),
    label_hash: typeof raw.label_hash === 'string' ? raw.label_hash : null,
    checked_at: checkedAt,
    recheck_after: typeof raw.recheck_after === 'string' ? raw.recheck_after : null,
    first_seen_at: typeof raw.first_seen_at === 'string' ? raw.first_seen_at : null,
  };
}

function toCertification(raw: unknown): Certification | null {
  if (!isObject(raw)) return null;
  const { body, scope, issued_at: issued, expires_at: expires } = raw;
  if (typeof body !== 'string' || typeof scope !== 'string') return null;
  if (typeof issued !== 'string' || typeof expires !== 'string') return null;
  return {
    body,
    certificate_id: typeof raw.certificate_id === 'string' ? raw.certificate_id : null,
    scope,
    issued_at: issued,
    expires_at: expires,
    source_url: typeof raw.source_url === 'string' ? raw.source_url : null,
  };
}

/**
 * Lee el JSON del feed. Devuelve `null` si no es un feed, y el feed con
 * `schema_version` tal cual viene: decidir si se sabe leer es de quien llama.
 */
export function parseFeed(raw: unknown): KonbiniFeed | null {
  if (!isObject(raw)) return null;
  const version = raw.schema_version;
  if (typeof version !== 'number' || !Number.isInteger(version)) return null;
  if (typeof raw.generated_at !== 'string') return null;
  if (!Array.isArray(raw.products)) return null;

  const products = raw.products.map(toProduct).filter((p): p is KonbiniProduct => p !== null);

  return {
    schema_version: version,
    generated_at: raw.generated_at,
    dictionary_version: typeof raw.dictionary_version === 'string' ? raw.dictionary_version : undefined,
    policy_version: typeof raw.policy_version === 'string' ? raw.policy_version : undefined,
    count: typeof raw.count === 'number' ? raw.count : products.length,
    products,
  };
}

/** Búsqueda por clave primaria. Nunca por nombre (contrato §6). */
export function findProduct(feed: KonbiniFeed | null, jan: string): KonbiniProduct | null {
  if (!feed) return null;
  const key = jan.trim();
  return feed.products.find((p) => p.jan === key) ?? null;
}

function readStored(): KonbiniFeed | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const feed = parseFeed(JSON.parse(raw));
    // Una copia guardada por una versión futura de la app tampoco se sabe leer.
    return feed && feed.schema_version <= SUPPORTED_SCHEMA_VERSION ? feed : null;
  } catch {
    return null;
  }
}

function store(text: string): void {
  try {
    if (text.length > STORAGE_MAX_BYTES) return;
    localStorage.setItem(STORAGE_KEY, text);
  } catch {
    // Cuota llena o modo privado: se pierde el modo sin conexión, no la app.
  }
}

let pending: Promise<FeedState> | null = null;
let memo: FeedState | null = null;

/** URL del feed dentro de la app, respetando la base del build (Pages). */
function feedUrl(): string {
  const base = typeof import.meta.env?.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/';
  return `${base.endsWith('/') ? base : `${base}/`}${FEED_PATH}`;
}

/**
 * Trae el feed una sola vez por sesión.
 *
 * Orden: red primero (el service worker ya responde con lo guardado y refresca
 * por detrás), y la copia de `localStorage` cuando la red no da nada. Un feed
 * de versión superior no se guarda ni se usa: se conserva el anterior.
 */
export async function getFeed(): Promise<FeedState> {
  if (memo) return memo;
  if (pending) return pending;

  pending = (async (): Promise<FeedState> => {
    const stored = readStored();
    try {
      const res = await fetch(feedUrl(), { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const text = await res.text();
        const feed = parseFeed(JSON.parse(text));
        if (feed && feed.schema_version > SUPPORTED_SCHEMA_VERSION) {
          return { status: 'needs-update', feed: stored };
        }
        if (feed) {
          store(text);
          return { status: 'fresh', feed };
        }
      }
    } catch {
      // Sin cobertura dentro de la tienda: es el caso normal, no un error.
    }
    return stored ? { status: 'cached', feed: stored } : { status: 'unavailable', feed: null };
  })();

  const state = await pending;
  pending = null;
  // Solo se memoriza un resultado con feed: sin él, merece reintentarse cuando
  // el usuario vuelva a escanear (puede haber recuperado la cobertura).
  if (state.feed) memo = state;
  return state;
}

export interface KonbiniHit {
  product: KonbiniProduct;
  feed: KonbiniFeed;
  /** Frescura de la copia con la que se ha respondido. */
  freshness: FeedStatus;
}

/** Busca un JAN en el feed. `null` si no está o si no hay feed. */
export async function lookupKonbini(jan: string): Promise<KonbiniHit | null> {
  const state = await getFeed();
  const product = findProduct(state.feed, jan);
  if (!product || !state.feed) return null;
  return { product, feed: state.feed, freshness: state.status };
}

/** Estado del feed para la pantalla de diagnóstico y los avisos. */
export async function feedState(): Promise<FeedState> {
  return getFeed();
}

/** Solo para las pruebas: olvida lo memorizado entre casos. */
export function resetFeedCache(): void {
  memo = null;
  pending = null;
}
