/**
 * Jutbas guardadas en el teléfono (idea de Baian, pero sin cuenta ni nube).
 *
 * El recordatorio no acaba con la salat: se puede releer por la tarde o
 * pasárselo a la familia. Solo se guarda lo que ya se vio en pantalla, y solo
 * aquí; nada sale del teléfono.
 */
import type { TranslatedSegment } from './translate';

export interface SavedSegment {
  kind: TranslatedSegment['kind'];
  translation: string;
  original: string;
  reference?: string;
  arabicVerified?: string;
  verified: boolean;
  translationSource?: TranslatedSegment['translationSource'];
}

export interface SavedKhutbah {
  id: string;
  startedAt: string;
  source: string;
  target: string;
  segments: SavedSegment[];
}

const KEY = 'hk-khutbah-history';
export const MAX_SESSIONS = 12;
export const MAX_SEGMENTS = 400;
const KINDS = new Set(['speech', 'quran', 'hadith', 'dua']);

const str = (v: unknown, max = 4000): string | undefined =>
  typeof v === 'string' ? v.slice(0, max) : undefined;

export function parseHistory(raw: string | null): SavedKhutbah[] {
  let data: unknown;
  try {
    data = JSON.parse(raw ?? '[]');
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: SavedKhutbah[] = [];
  for (const item of data) {
    if (typeof item !== 'object' || item === null) continue;
    const k = item as Record<string, unknown>;
    if (!str(k.id) || !str(k.startedAt) || Number.isNaN(Date.parse(k.startedAt as string)) || !Array.isArray(k.segments)) continue;
    const segments = (k.segments as unknown[])
      .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
      .filter((s) => KINDS.has(s.kind as string) && typeof s.translation === 'string' && typeof s.original === 'string')
      .slice(0, MAX_SEGMENTS)
      .map((s) => ({
        kind: s.kind as SavedSegment['kind'],
        translation: str(s.translation)!,
        original: str(s.original)!,
        reference: str(s.reference, 20),
        arabicVerified: str(s.arabicVerified),
        verified: s.verified === true,
        translationSource: str(s.translationSource, 10) as SavedSegment['translationSource'],
      }));
    if (segments.length === 0) continue;
    out.push({ id: str(k.id, 40)!, startedAt: k.startedAt as string, source: str(k.source, 12) ?? '', target: str(k.target, 12) ?? '', segments });
  }
  return out.slice(0, MAX_SESSIONS);
}

export function loadHistory(): SavedKhutbah[] {
  try {
    return parseHistory(localStorage.getItem(KEY));
  } catch {
    return [];
  }
}

function write(list: SavedKhutbah[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Almacenamiento lleno: se sacrifica la más antigua y se reintenta una vez.
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, Math.max(1, list.length - 1))));
    } catch {
      /* no se puede guardar: la jutba sigue en pantalla */
    }
  }
}

/** La más reciente primero. Una sesión sin frases no se guarda. */
export function saveKhutbah(k: SavedKhutbah): SavedKhutbah[] {
  if (k.segments.length === 0) return loadHistory();
  const list = [{ ...k, segments: k.segments.slice(-MAX_SEGMENTS) }, ...loadHistory().filter((x) => x.id !== k.id)].slice(0, MAX_SESSIONS);
  write(list);
  return list;
}

export function deleteKhutbah(id: string): SavedKhutbah[] {
  const list = loadHistory().filter((x) => x.id !== id);
  write(list);
  return list;
}

export function toSaved(seg: TranslatedSegment): SavedSegment {
  const { kind, translation, original, reference, arabicVerified, verified, translationSource } = seg;
  return { kind, translation, original, reference, arabicVerified, verified, translationSource };
}

/** Texto plano para copiar: sin traducir las aleyas no verificadas. */
export function historyText(k: SavedKhutbah, quranLabel: string): string {
  return k.segments
    .map((s) => {
      if (s.kind === 'quran') {
        return s.verified && s.reference
          ? `[${quranLabel} ${s.reference}] ${s.arabicVerified ?? ''}\n“${s.translation}” (Tanzil.net)`
          : `[${quranLabel}?] ${s.original}`;
      }
      return s.translation;
    })
    .join('\n\n');
}

export function verseCount(k: SavedKhutbah): number {
  return k.segments.filter((s) => s.kind === 'quran' && s.verified && s.reference).length;
}
