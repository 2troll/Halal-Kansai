/**
 * Acceso a los datos coránicos (server/data/*) con caché en memoria.
 * - Node (desarrollo local): lee del sistema de archivos.
 * - Cloudflare Workers: lee del binding de Static Assets (env.ASSETS),
 *   porque 29 MB de traducciones no caben en el bundle del worker.
 */
import type { QuranMatcher } from './match.ts';

export interface TranslationFile {
  meta: { language: string; translator: string; source: string; license: string };
  verses: Record<string, string>;
}

export interface QuranStore {
  loadUthmani(): Promise<Record<string, string>>;
  /** null si no hay traducción Tanzil para ese idioma (→ fallback LLM). */
  loadTranslation(lang: string): Promise<TranslationFile | null>;
}

const LANG_RE = /^[a-z]{2,3}$/;

export class NodeStore implements QuranStore {
  private translations = new Map<string, TranslationFile | null>();
  private dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  async loadUthmani(): Promise<Record<string, string>> {
    const { readFile } = await import('node:fs/promises');
    return JSON.parse(await readFile(`${this.dataDir}/quran-uthmani.json`, 'utf8'));
  }

  async loadTranslation(lang: string): Promise<TranslationFile | null> {
    if (!LANG_RE.test(lang)) return null;
    if (this.translations.has(lang)) return this.translations.get(lang) ?? null;
    const { readFile } = await import('node:fs/promises');
    let result: TranslationFile | null;
    try {
      result = JSON.parse(await readFile(`${this.dataDir}/translations/${lang}.json`, 'utf8'));
    } catch {
      result = null; // idioma sin traducción Tanzil
    }
    this.translations.set(lang, result);
    return result;
  }
}

interface AssetsBinding {
  fetch(request: Request | string): Promise<Response>;
}

export class WorkersAssetsStore implements QuranStore {
  private translations = new Map<string, TranslationFile | null>();
  private assets: AssetsBinding;

  constructor(assets: AssetsBinding) {
    this.assets = assets;
  }

  private async fetchJson<T>(path: string): Promise<T | null> {
    const res = await this.assets.fetch(`https://assets.local${path}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  }

  async loadUthmani(): Promise<Record<string, string>> {
    // El binding ASSETS monta server/data/ en la raíz del path.
    const data = await this.fetchJson<Record<string, string>>('/quran-uthmani.json');
    if (!data) throw new Error('quran-uthmani.json no disponible en assets');
    return data;
  }

  async loadTranslation(lang: string): Promise<TranslationFile | null> {
    if (!LANG_RE.test(lang)) return null;
    if (this.translations.has(lang)) return this.translations.get(lang) ?? null;
    const result = await this.fetchJson<TranslationFile>(`/translations/${lang}.json`);
    this.translations.set(lang, result);
    return result;
  }
}

/** El índice de matching se construye una vez por proceso/isolate. */
let matcherPromise: Promise<QuranMatcher> | null = null;

export function getMatcher(store: QuranStore): Promise<QuranMatcher> {
  if (!matcherPromise) {
    matcherPromise = (async () => {
      const { QuranMatcher } = await import('./match.ts');
      return new QuranMatcher(await store.loadUthmani());
    })();
  }
  return matcherPromise;
}
