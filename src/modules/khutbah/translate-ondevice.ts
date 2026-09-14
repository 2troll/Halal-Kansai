/**
 * Traducción ON-DEVICE (en el propio móvil, sin servidor y sin conexión).
 *
 * Por qué existe: para publicar la app en las tiendas y que funcione para
 * cualquiera en cualquier sitio de Japón, la traducción NO puede depender del
 * Mac de Luigi ni de una cuota en la nube que se agota. Google ML Kit traduce
 * en el propio aparato: descarga un modelo pequeño por par de idiomas (~30 MB,
 * una sola vez) y a partir de ahí traduce offline, gratis e ilimitado.
 *
 * Cobertura honesta:
 *  - Solo funciona en la app NATIVA (Android/iOS) con el plugin
 *    `@capacitor-mlkit/translation`. En un navegador normal no hay ML Kit, así
 *    que `translateOnDevice` devuelve null y el llamante cae al servidor.
 *  - ML Kit soporta árabe, japonés, inglés, español, urdu, indonesio, etc.
 *    (~59 idiomas). Calidad: buena para habla normal; por debajo de un modelo
 *    grande de nube en frases largas o registro clásico. El texto del Corán NO
 *    lo traduce ML Kit: las aleyas siguen saliendo literales de Tanzil (ese es
 *    el texto sagrado y no se deja a una MT pequeña).
 *
 * Diseño a prueba de build: el plugin se carga con import() de especificador
 * VARIABLE, así que `tsc`/Vite no intentan resolverlo en tiempo de compilación
 * y el proyecto compila aunque el paquete todavía no esté instalado. Cuando
 * Luigi ejecute `npm i @capacitor-mlkit/translation && npx cap sync`, empieza a
 * funcionar en el móvil sin tocar nada más.
 */
import { isNative } from '../../backend';
import { translateSegment, type TranslatedSegment } from './translate';

/**
 * Idiomas que la app ofrece y que ML Kit soporta on-device. Si el par no está
 * aquí, se cae al servidor en vez de arriesgar una traducción mala.
 * (ML Kit usa códigos BCP-47 cortos: 'ar', 'ja', 'en', 'es', ...)
 */
const MLKIT_SUPPORTED = new Set([
  'ar', 'ja', 'en', 'es', 'ur', 'id', 'bn', 'hi', 'tr', 'ms', 'fr', 'zh',
  'ru', 'fa', 'th', 'vi', 'ta', 'sw',
]);

/** 'ar-SA' → 'ar'. ML Kit quiere el código corto de idioma. */
export function toMlkitLang(locale: string): string {
  return (locale.split('-')[0] || '').toLowerCase();
}

/** ¿Puede ML Kit, en teoría, traducir este par de idiomas? (pura, testeable) */
export function mlkitCanTranslate(sourceLocale: string, targetLocale: string): boolean {
  const s = toMlkitLang(sourceLocale);
  const t = toMlkitLang(targetLocale);
  if (!s || !t || s === t) return false;
  return MLKIT_SUPPORTED.has(s) && MLKIT_SUPPORTED.has(t);
}

/** Forma mínima del plugin que usamos (declarada a mano: no dependemos de sus tipos). */
interface MlkitTranslationPlugin {
  translate(opts: {
    text: string;
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<{ text: string }>;
  downloadModel?(opts: { language: string }): Promise<void>;
}

let cached: MlkitTranslationPlugin | null | undefined;

/** Carga perezosa del plugin. null si no es nativo o el plugin no está. */
async function loadPlugin(): Promise<MlkitTranslationPlugin | null> {
  if (cached !== undefined) return cached;
  if (!isNative()) {
    cached = null;
    return null;
  }
  try {
    // Especificador VARIABLE a propósito: evita que tsc/Vite resuelvan el
    // módulo en build (y que fallen si aún no está instalado).
    const spec = '@capacitor-mlkit/translation';
    const mod = (await import(/* @vite-ignore */ spec)) as {
      Translation?: MlkitTranslationPlugin;
    };
    cached = mod.Translation ?? null;
  } catch {
    cached = null;
  }
  return cached;
}

/**
 * Traduce un fragmento en el propio móvil. Devuelve null si no se puede
 * (navegador web, plugin ausente, par no soportado, modelo no descargado o
 * error): en ese caso el llamante debe caer al servidor. NUNCA lanza.
 */
export async function translateOnDevice(
  text: string,
  sourceLocale: string,
  targetLocale: string,
): Promise<string | null> {
  if (!text.trim()) return null;
  if (!mlkitCanTranslate(sourceLocale, targetLocale)) return null;

  const plugin = await loadPlugin();
  if (!plugin) return null;

  try {
    const { text: out } = await plugin.translate({
      text,
      sourceLanguage: toMlkitLang(sourceLocale),
      targetLanguage: toMlkitLang(targetLocale),
    });
    const trimmed = out?.trim();
    return trimmed ? trimmed : null;
  } catch {
    // Modelo aún descargándose, sin espacio, etc. Que decida el servidor.
    return null;
  }
}

/**
 * Traducción "inteligente" para la jutba: primero intenta ON-DEVICE (gratis,
 * offline, independiente); si no se puede, cae al servidor EXACTAMENTE como
 * hasta ahora. En web se comporta igual que antes (on-device devuelve null).
 *
 * Nota: la ruta on-device no verifica aleyas contra Tanzil (eso vive en el
 * servidor). Por eso marca `verified:false` y `translationSource:'ondevice'`. La
 * verificación coránica offline queda como mejora futura (ver el doc de
 * arquitectura); mientras, con conexión el servidor sigue verificando.
 */
export async function translateSegmentSmart(
  text: string,
  sourceLocale: string,
  targetLocale: string,
): Promise<TranslatedSegment> {
  const local = await translateOnDevice(text, sourceLocale, targetLocale);
  if (local) {
    return {
      kind: 'speech',
      translation: local,
      original: text,
      verified: false,
      translationSource: 'ondevice',
    };
  }
  return translateSegment(text, sourceLocale, targetLocale);
}

/**
 * Pre-descarga los modelos de un par de idiomas para que la primera frase del
 * viernes no espere a la descarga. Silencioso: si no se puede, no pasa nada.
 * Llamar al elegir idioma de destino, idealmente con WiFi.
 */
export async function ensureModels(sourceLocale: string, targetLocale: string): Promise<void> {
  const plugin = await loadPlugin();
  if (!plugin?.downloadModel) return;
  const langs = [toMlkitLang(sourceLocale), toMlkitLang(targetLocale)];
  for (const language of langs) {
    if (!MLKIT_SUPPORTED.has(language)) continue;
    try {
      await plugin.downloadModel({ language });
    } catch {
      /* sin conexión o sin espacio: se intentará traducir igual y caerá al servidor */
    }
  }
}
