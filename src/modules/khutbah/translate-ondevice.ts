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
 * Cómo se habla con el plugin: por su NOMBRE nativo, con `registerPlugin` de
 * `@capacitor/core`. Ver la nota larga junto a `Translation`, más abajo: el
 * import dinámico que había antes no funcionaba dentro de la app y hacía que
 * esta ruta no se ejecutara nunca.
 */
import { registerPlugin } from '@capacitor/core';

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

/**
 * El plugin nativo, por su nombre registrado.
 *
 * Antes esto se resolvía con `await import('@capacitor-mlkit/translation')` y
 * un especificador VARIABLE, para que el proyecto compilase aunque el paquete
 * no estuviera instalado. El efecto secundario era fatal y además silencioso:
 * Vite deja ese import tal cual, y dentro de la app —origen
 * `capacitor://localhost`— un especificador desnudo no se puede resolver. La
 * llamada lanzaba, el `catch` se la tragaba y la app caía al servidor SIEMPRE.
 * Resultado: la traducción on-device no llegó a ejecutarse ni una sola vez,
 * tampoco en el móvil, y no había forma de notarlo salvo mirando la red.
 *
 * `registerPlugin` viene de `@capacitor/core`, que ya entra en el bundle, y
 * habla con el plugin nativo por su nombre ('Translation'). Es exactamente lo
 * que hace por dentro el JS del propio plugin. En un navegador normal devuelve
 * un objeto que lanza «not implemented» al llamarlo; de eso se encarga el
 * try/catch de cada llamada, y por eso en web se sigue cayendo al servidor.
 */
const Translation = registerPlugin<MlkitTranslationPlugin>('Translation');

/** El plugin si estamos dentro de la app nativa; null en un navegador. */
function loadPlugin(): MlkitTranslationPlugin | null {
  return isNative() ? Translation : null;
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

  const plugin = loadPlugin();
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
  const plugin = loadPlugin();
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
