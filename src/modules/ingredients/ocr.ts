/**
 * Fotografiar el 原材料名 y leerlo, en vez de teclearlo.
 *
 * Por qué existe, con los datos de las quejas reales a las apps que ya hacen
 * esto (reseñas de App Store y Google Play de los lectores halal existentes):
 *
 * - «No está en la base de datos» es la queja número uno. Las apps que solo
 *   leen el código de barras fallan con la mayoría de productos japoneses,
 *   porque las bases están hechas con productos de Europa y Norteamérica.
 * - La segunda es que sale «desconocido» en productos que llevan sello halal
 *   impreso. Eso ya lo resolvimos leyendo la pegatina (ver certification.ts).
 *
 * Nuestro análisis nunca dependió de una base de datos: lee el texto. Pero
 * obligaba a escribirlo a mano, de pie en un pasillo del súper y con una sola
 * mano libre. Eso, en la práctica, es no tener la función.
 *
 * Ahora se le hace una foto. El reconocimiento usa el modelo japonés de ML
 * Kit, que ya viaja dentro de la app para leer códigos de barras: no añade
 * descarga, funciona sin conexión y **la foto no sale del teléfono**.
 *
 * Lo que NO cambia: el dictamen lo sigue poniendo el analizador local sobre
 * el texto. La cámara solo sustituye al teclado.
 */
import { isNative } from '../../backend';

export function ocrAvailable(): boolean {
  return isNative();
}

export type OcrError = 'cancelled' | 'denied' | 'unreadable';

/**
 * Abre la cámara, lee el texto japonés de la foto y lo devuelve.
 * `null` si el usuario cerró la cámara sin hacer la foto.
 */
export async function readLabelPhoto(): Promise<string | null> {
  const [{ Camera, CameraResultType, CameraSource }, { TextRecognition, Script }] =
    await Promise.all([
      import('@capacitor/camera'),
      import('@capacitor-mlkit/text-recognition'),
    ]);

  let path: string | undefined;
  try {
    const photo = await Camera.getPhoto({
      // Ruta a fichero, no base64: la imagen no pasa por la memoria de la web
      // ni se convierte a texto para nada.
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      // Una etiqueta de ingredientes es letra pequeña: sin calidad no hay OCR.
      quality: 90,
      // Recortar ayuda mucho: el usuario encuadra solo la línea de原材料名 y
      // el reconocedor deja de pelearse con el resto del envase.
      allowEditing: true,
      correctOrientation: true,
    });
    path = photo.path ?? photo.webPath;
  } catch {
    return null; // cerró la cámara
  }

  if (!path) throw new Error('unreadable' satisfies OcrError);

  const { blocks } = await TextRecognition.processImage({
    path,
    // El modelo japonés: sin esto lee 原材料名 como símbolos sueltos.
    script: Script.Japanese,
  });

  // Los bloques vienen en orden de lectura. Se unen con saltos de línea: el
  // analizador ya ignora los espacios, y así se conserva el orden impreso.
  const text = blocks
    .map((b) => b.text)
    .join('\n')
    .trim();

  if (!text) throw new Error('unreadable' satisfies OcrError);
  return text;
}
