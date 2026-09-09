/**
 * Lectura del código de barras con la cámara NATIVA (ML Kit de Google).
 *
 * Por qué existe además del lector del navegador:
 *
 * - En iOS el WebView no trae `BarcodeDetector`, así que dentro de la app la
 *   versión web simplemente no lee nada. Aquí es donde una app deja de ser
 *   una web envuelta y hace algo que la web no puede.
 * - En un konbini con poca luz, el enfoque y la exposición nativos leen un
 *   JAN arrugado que el vídeo del navegador no saca.
 * - Funciona sin conexión: el reconocimiento ocurre en el móvil.
 *
 * En Android el modelo de ML Kit lo sirve Google Play Services y se descarga
 * la primera vez; por eso `ensureModule()`, para no fallar en el primer uso.
 */
import { isNative } from '../../backend';

/** Solo formatos de producto: JAN/EAN japonés y los UPC de importación. */
const FORMATS = ['Ean13', 'Ean8', 'UpcA', 'UpcE'] as const;

export function nativeScanAvailable(): boolean {
  return isNative();
}

export type NativeScanError = 'denied' | 'cancelled' | 'unavailable';

/**
 * Abre la cámara nativa a pantalla completa y devuelve el primer código.
 * `null` si el usuario cerró el escáner sin leer nada.
 */
export async function scanBarcodeNative(): Promise<string | null> {
  const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');

  const { camera } = await BarcodeScanner.requestPermissions();
  if (camera !== 'granted' && camera !== 'limited') {
    throw new Error('denied' satisfies NativeScanError);
  }

  // Android: el módulo de ML Kit llega con Play Services, no con el APK.
  if ((await BarcodeScanner.isSupported()).supported) {
    const available = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable().catch(
      () => ({ available: true }),
    );
    if (!available.available) {
      await BarcodeScanner.installGoogleBarcodeScannerModule().catch(() => {});
    }
  }

  const { barcodes } = await BarcodeScanner.scan({
    formats: FORMATS.map((f) => f as unknown as never),
  });

  return barcodes[0]?.rawValue ?? null;
}
