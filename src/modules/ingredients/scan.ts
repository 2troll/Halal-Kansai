/**
 * Escaneo del producto: cámara → código de barras (JAN/EAN) → lista de
 * ingredientes → analizador local.
 *
 * Dos piezas, ambas gratuitas y sin clave de API:
 *
 * - **BarcodeDetector**, API nativa del navegador (Chrome en Android, que es el
 *   móvil de la mayoría de la comunidad). Sin librería, sin bundle extra.
 * - **Open Food Facts**, base de datos abierta y colaborativa (licencia ODbL).
 *   Sin registro, sin cuota, sin tarjeta.
 *
 * El escaneo solo trae el TEXTO de los ingredientes. El dictamen lo pone
 * siempre el analizador local: si el producto no está en la base, o no hay
 * cobertura, el usuario copia la lista a mano y la app funciona igual.
 */

/** Subconjunto de la BarcodeDetector API; TypeScript aún no la trae en lib.dom. */
interface DetectedBarcode {
  rawValue: string;
  format: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?(): Promise<string[]>;
};

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];

function detectorCtor(): BarcodeDetectorCtor | null {
  const ctor = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  return ctor ?? null;
}

export function barcodeSupported(): boolean {
  return detectorCtor() !== null && typeof navigator?.mediaDevices?.getUserMedia === 'function';
}

export type ScanStop = () => void;

/**
 * Abre la cámara trasera sobre `video` y llama a `onCode` con el primer código
 * leído. Devuelve la función que apaga la cámara — llámala siempre, o el LED
 * se queda encendido.
 */
export async function startBarcodeScan(
  video: HTMLVideoElement,
  onCode: (code: string) => void,
): Promise<ScanStop> {
  const ctor = detectorCtor();
  if (!ctor) throw new Error('barcode-unsupported');

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' } },
    audio: false,
  });

  video.srcObject = stream;
  video.setAttribute('playsinline', 'true');
  await video.play();

  const detector = new ctor({ formats: FORMATS });
  let stopped = false;
  let timer = 0;

  const stop: ScanStop = () => {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  };

  const tick = async (): Promise<void> => {
    if (stopped) return;
    try {
      const found = await detector.detect(video);
      const code = found.find((b) => /^\d{8,14}$/.test(b.rawValue))?.rawValue;
      if (code) {
        stop();
        onCode(code);
        return;
      }
    } catch {
      // Un fotograma ilegible no es un error: se reintenta con el siguiente.
    }
    timer = window.setTimeout(() => void tick(), 250);
  };

  void tick();
  return stop;
}

export interface ProductInfo {
  code: string;
  name: string;
  brand: string;
  /** Lista de ingredientes tal cual, preferentemente en japonés. */
  ingredients: string;
  source: string;
}

export type LookupError = 'offline' | 'not-found' | 'no-ingredients' | 'network';

/** Resultado explícito: la UI siempre tiene algo que decir y nada que capturar. */
export type LookupResult =
  | { ok: true; product: ProductInfo }
  | { ok: false; reason: LookupError };

const OFF_ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product';
const OFF_FIELDS = [
  'product_name',
  'product_name_ja',
  'brands',
  'ingredients_text',
  'ingredients_text_ja',
  'ingredients_text_en',
].join(',');

interface OffResponse {
  status?: number;
  product?: {
    product_name?: string;
    product_name_ja?: string;
    brands?: string;
    ingredients_text?: string;
    ingredients_text_ja?: string;
    ingredients_text_en?: string;
  };
}

/**
 * Busca el producto por código de barras en Open Food Facts.
 *
 * Nunca lanza: cada fallo es un motivo con nombre, porque en todos ellos la
 * salida es la misma para el usuario — pegar la lista a mano y seguir.
 */
export async function lookupProduct(code: string): Promise<LookupResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, reason: 'offline' };
  }

  let data: OffResponse;
  try {
    const res = await fetch(
      `${OFF_ENDPOINT}/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`,
      { headers: { Accept: 'application/json' } },
    );
    // Open Food Facts responde 404 cuando el código no está en la base.
    if (res.status === 404) return { ok: false, reason: 'not-found' };
    if (!res.ok) return { ok: false, reason: 'network' };
    data = (await res.json()) as OffResponse;
  } catch {
    // Sin red, CORS o JSON roto: para el usuario es el mismo caso.
    return { ok: false, reason: 'network' };
  }

  const product = data.product;
  if (data.status === 0 || !product) return { ok: false, reason: 'not-found' };

  const ingredients =
    product.ingredients_text_ja?.trim() ||
    product.ingredients_text?.trim() ||
    product.ingredients_text_en?.trim() ||
    '';
  if (!ingredients) return { ok: false, reason: 'no-ingredients' };

  return {
    ok: true,
    product: {
      code,
      name: (product.product_name_ja || product.product_name || '').trim(),
      brand: (product.brands || '').trim(),
      ingredients,
      source: 'Open Food Facts (ODbL)',
    },
  };
}
