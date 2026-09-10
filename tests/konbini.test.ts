/**
 * El consumidor del feed de konbini.
 *
 * Lo que se comprueba aquí son las reglas del contrato de datos que esta mitad
 * tiene que cumplir (§6, y §2 sobre cómo se presenta cada estado). No son
 * detalles de implementación: son promesas hechas al productor y al usuario que
 * está delante de una nevera en una tienda.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  findProduct,
  getFeed,
  lookupKonbini,
  parseFeed,
  resetFeedCache,
  SUPPORTED_SCHEMA_VERSION,
  type KonbiniFeed,
} from '../src/modules/ingredients/konbini';
import {
  REASON_CODES,
  isReasonCode,
  reasonLabel,
  reasonStatus,
  reasonWhy,
} from '../src/modules/ingredients/reason-codes';

const LANGS = ['ar', 'en', 'es', 'ja'] as const;

const PRODUCT = {
  jan: '4901234567894',
  name: 'セブンプレミアム ミルクチョコレート',
  chain: 'seven_eleven',
  manufacturer: '○○製菓株式会社',
  factory_code: '+AB',
  status: 'ambiguous',
  source: 'label',
  reason_codes: ['EMULSIFIER_UNSPECIFIED', 'FLAVORING_UNSPECIFIED'],
  certification: null,
  evidence: [],
  label_hash: 'sha256:9f2c',
  checked_at: '2026-09-08T11:20:00Z',
  recheck_after: '2027-03-08T00:00:00Z',
  first_seen_at: '2026-09-01T03:00:00Z',
};

function feedWith(products: unknown[], overrides: Record<string, unknown> = {}): unknown {
  return {
    schema_version: 1,
    generated_at: '2026-09-09T03:00:00Z',
    dictionary_version: '2026-09-09',
    policy_version: '2026-09-09',
    count: products.length,
    products,
    ...overrides,
  };
}

/** `localStorage` de mentira: el módulo lo usa para la copia sin conexión. */
function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage;
}

describe('lectura del feed', () => {
  it('acepta el registro del contrato tal cual está escrito en él', () => {
    const feed = parseFeed(feedWith([PRODUCT]));
    expect(feed).not.toBeNull();
    expect(feed!.products).toHaveLength(1);
    expect(feed!.products[0]!.jan).toBe('4901234567894');
    expect(feed!.products[0]!.reason_codes).toEqual([
      'EMULSIFIER_UNSPECIFIED',
      'FLAVORING_UNSPECIFIED',
    ]);
  });

  it('un registro roto se descarta, y los demás sobreviven', () => {
    // Quien está en la tienda no puede quedarse sin base de datos porque un
    // producto de mil salga mal del productor.
    const feed = parseFeed(
      feedWith([{ ...PRODUCT, jan: 'no-es-un-jan' }, { ...PRODUCT, jan: '4901234567900' }]),
    );
    expect(feed!.products.map((p) => p.jan)).toEqual(['4901234567900']);
  });

  it('lo que no es un feed no se convierte en un feed vacío', () => {
    expect(parseFeed(null)).toBeNull();
    expect(parseFeed({ productos: [] })).toBeNull();
    expect(parseFeed({ schema_version: 1, generated_at: 'x' })).toBeNull();
  });

  it('el JAN es la clave; el nombre no busca nada', () => {
    const feed = parseFeed(feedWith([PRODUCT])) as KonbiniFeed;
    expect(findProduct(feed, '4901234567894')!.name).toBe(PRODUCT.name);
    expect(findProduct(feed, PRODUCT.name)).toBeNull();
    expect(findProduct(feed, '4909999999999')).toBeNull();
    expect(findProduct(null, '4901234567894')).toBeNull();
  });
});

describe('traída del feed', () => {
  beforeEach(() => {
    resetFeedCache();
    vi.unstubAllGlobals();
    vi.stubGlobal('localStorage', fakeStorage());
  });

  it('lo traído de la red se guarda para la próxima vez que no haya', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(feedWith([PRODUCT])), { status: 200 })),
    );
    const first = await getFeed();
    expect(first.status).toBe('fresh');
    expect(first.feed!.products).toHaveLength(1);

    // Ahora sin red: la copia guardada responde igual.
    resetFeedCache();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('sin cobertura');
      }),
    );
    const offline = await getFeed();
    expect(offline.status).toBe('cached');
    expect(offline.feed!.products[0]!.jan).toBe('4901234567894');
  });

  it('un feed de una versión futura no rompe nada: se usa la copia anterior', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(feedWith([PRODUCT])), { status: 200 })),
    );
    await getFeed();

    resetFeedCache();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify(
              feedWith([PRODUCT], { schema_version: SUPPORTED_SCHEMA_VERSION + 1 }),
            ),
            { status: 200 },
          ),
      ),
    );
    const state = await getFeed();
    expect(state.status).toBe('needs-update');
    expect(state.feed!.schema_version).toBe(SUPPORTED_SCHEMA_VERSION);
  });

  it('sin feed y sin copia, la búsqueda simplemente no encuentra nada', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    expect(await lookupKonbini('4901234567894')).toBeNull();
  });

  it('encuentra el producto por su JAN y dice de qué copia viene', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(feedWith([PRODUCT])), { status: 200 })),
    );
    const hit = await lookupKonbini('4901234567894');
    expect(hit!.product.status).toBe('ambiguous');
    expect(hit!.freshness).toBe('fresh');
  });
});

describe('códigos del contrato', () => {
  it('los 30 códigos del esquema tienen nombre y explicación en los cuatro idiomas', () => {
    expect(REASON_CODES).toHaveLength(30);
    for (const code of REASON_CODES) {
      for (const lang of LANGS) {
        expect(reasonLabel(code, lang), `${code}/${lang}`).not.toBe('');
        // El nombre traducido nunca puede ser el propio código.
        expect(reasonLabel(code, lang), `${code}/${lang}`).not.toBe(code);
        expect(reasonWhy(code, lang).length, `${code}/${lang}`).toBeGreaterThan(20);
      }
    }
  });

  it('el término prohibido no se enseña con el ámbar de "hay que preguntar"', () => {
    // Dentro de una ficha que ya dice "excluido", 豚肉 con un ⚠️ se lee como una
    // contradicción. El dictamen del término es el mismo que da el lector de
    // etiquetas en el resto de la app.
    expect(reasonStatus('PORK_MEAT')).toBe('haram');
    expect(reasonStatus('EMULSIFIER_UNSPECIFIED')).toBe('mushbooh');
    expect(reasonStatus('BREWED_VINEGAR')).toBe('halal');
    expect(reasonStatus('CODIGO_DEL_FUTURO')).toBeNull();
  });

  it('un código que esta versión no conoce se enseña crudo, sin inventar el porqué', () => {
    expect(isReasonCode('CODIGO_DEL_FUTURO')).toBe(false);
    expect(reasonLabel('CODIGO_DEL_FUTURO', 'es')).toBe('CODIGO_DEL_FUTURO');
    expect(reasonWhy('CODIGO_DEL_FUTURO', 'es')).toBe('');
  });
});

describe('la ficha en pantalla', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('localStorage', fakeStorage());
    vi.stubGlobal('navigator', { language: 'es' });
  });

  async function render(product: Record<string, unknown>): Promise<string> {
    const { konbiniCardHtml } = await import('../src/modules/food/konbini-card');
    const feed = parseFeed(feedWith([product])) as KonbiniFeed;
    return konbiniCardHtml({ product: feed.products[0]!, feed, freshness: 'fresh' });
  }

  it('«falta información» no se pinta de rojo', async () => {
    const html = await render(PRODUCT);
    expect(html).toContain('verdict mushbooh');
    expect(html).not.toContain('verdict haram');
  });

  it('un término prohibido declarado sí se pinta de rojo', async () => {
    const html = await render({
      ...PRODUCT,
      status: 'excluded',
      reason_codes: ['PORK_EXTRACT'],
    });
    expect(html).toContain('verdict haram');
  });

  it('cada término lleva el símbolo del dictamen que la app ya le da', async () => {
    const html = await render({ ...PRODUCT, status: 'excluded', reason_codes: ['PORK_MEAT'] });
    expect(html).toContain('finding haram');
    expect(html).toContain('⛔');
  });

  it('siempre enseña la fuente y la fecha, no solo un color', async () => {
    const html = await render(PRODUCT);
    expect(html).toContain('2026'); // fecha de comprobación
    expect(html).toContain('原材料名'); // fuente: la etiqueta
    expect(html).toContain('4901234567894'); // la clave real del dato
  });

  it('el alcance del certificado se enseña entero', async () => {
    const html = await render({
      ...PRODUCT,
      status: 'certified',
      source: 'certificate',
      reason_codes: [],
      certification: {
        body: 'NAHA',
        certificate_id: 'JP-2025-0417',
        scope: 'SKU + planta Osaka únicamente',
        issued_at: '2025-04-17',
        expires_at: '2027-04-16',
      },
    });
    expect(html).toContain('NAHA');
    expect(html).toContain('SKU + planta Osaka');
  });

  it('el aviso legal va en la ficha, no en un pie de página lejano', async () => {
    const html = await render(PRODUCT);
    expect(html).toContain('No certifica nada');
  });

  it('el nombre del producto se escapa: viene de un archivo externo', async () => {
    const html = await render({ ...PRODUCT, name: '<img src=x onerror=alert(1)>' });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });
});
