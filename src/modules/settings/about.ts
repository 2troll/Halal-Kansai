/**
 * Quién hace la app, dónde está el código y a quién hay que dar las gracias.
 *
 * Los créditos no se traducen: son nombres propios y licencias, y una
 * licencia traducida deja de ser la licencia.
 */
import { FEEDBACK_EMAIL } from '../../config';

export const AUTHOR = 'Tony Hanma';
export const SOURCE_URL = 'https://github.com/2troll/Halal-Kansai';
export const PRIVACY_URL = 'https://halal-kansai.2troll-p.workers.dev/privacidad';
export const CONTACT_EMAIL = FEEDBACK_EMAIL;

export interface Credit {
  name: string;
  what: string;
  licence: string;
  url: string;
}

export const CREDITS: readonly Credit[] = [
  { name: 'OpenStreetMap', what: 'Map data © OpenStreetMap contributors', licence: 'ODbL', url: 'https://www.openstreetmap.org/copyright' },
  { name: 'Leaflet', what: 'Interactive map', licence: 'BSD-2-Clause', url: 'https://leafletjs.com' },
  { name: 'Tanzil', what: 'Verified Quran text', licence: 'CC BY 3.0 (no changes to the text)', url: 'https://tanzil.net' },
  { name: 'NOAA / BGS', what: 'World Magnetic Model 2025 (true north for the qibla)', licence: 'Public domain', url: 'https://www.ncei.noaa.gov/products/world-magnetic-model' },
  { name: 'Capacitor', what: 'Native app shell', licence: 'MIT', url: 'https://capacitorjs.com' },
  { name: 'Google ML Kit', what: 'On-device text, barcode and translation', licence: 'Google APIs Terms of Service', url: 'https://developers.google.com/ml-kit/terms' },
  { name: 'Capgo Speech Recognition', what: 'Native speech recognition', licence: 'MPL-2.0', url: 'https://github.com/Cap-go/capacitor-speech-recognition' },
  { name: 'Transformers.js', what: 'Whisper on the phone', licence: 'Apache-2.0', url: 'https://github.com/huggingface/transformers.js' },
  { name: 'OpenAI Whisper', what: 'Speech recognition model', licence: 'MIT', url: 'https://github.com/openai/whisper' },
  { name: 'Hono', what: 'Server', licence: 'MIT', url: 'https://hono.dev' },
  { name: 'qrcode-generator', what: 'Room QR codes', licence: 'MIT', url: 'https://github.com/kazuhikoarase/qrcode-generator' },
];

/** Versión visible: la del paquete web y, en la app nativa, también el build. */
export async function versionLabel(): Promise<string> {
  const web = __APP_VERSION__;
  try {
    const { isNative } = await import('../../backend');
    if (!isNative()) return web;
    const { App } = await import('@capacitor/app');
    const info = await App.getInfo();
    return `${info.version} (${info.build})`;
  } catch {
    return web;
  }
}
