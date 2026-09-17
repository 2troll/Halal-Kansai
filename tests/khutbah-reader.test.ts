import { beforeEach, describe, expect, it } from 'vitest';
import { segmentCardHtml } from '../src/modules/khutbah/reader.ts';
import {
  MAX_SESSIONS,
  deleteKhutbah,
  historyText,
  loadHistory,
  parseHistory,
  saveKhutbah,
  verseCount,
  type SavedKhutbah,
} from '../src/modules/khutbah/history.ts';
import type { TranslatedSegment } from '../src/modules/khutbah/translate.ts';

const verse: TranslatedSegment = {
  kind: 'quran',
  translation: 'Allah is with the steadfast.',
  original: 'ان الله مع الصابرين',
  arabicVerified: 'إِنَّ ٱللَّهَ مَعَ ٱلصَّٰبِرِينَ',
  reference: '2:153',
  verified: true,
  translationSource: 'tanzil',
};
const possible: TranslatedSegment = {
  kind: 'quran',
  translation: 'MACHINE TRANSLATION',
  original: 'واعتصموا بحبل الله',
  verified: false,
};
const speech: TranslatedSegment = { kind: 'speech', translation: 'Dear brothers <b>', original: 'أيها الإخوة', verified: true };

describe('lector de la jutba', () => {
  it('aleya verificada: referencia, árabe verificado y fuente Tanzil', () => {
    const html = segmentCardHtml(verse, 'ar-SA', 'en');
    expect(html).toContain('2:153');
    expect(html).toContain('Tanzil.net');
    expect(html).toContain('ٱلصَّٰبِرِينَ');
  });

  it('posible Corán sin verificar: se enseña como se recitó y NO se traduce', () => {
    const html = segmentCardHtml(possible, 'ar-SA', 'en');
    expect(html).toContain('واعتصموا بحبل الله');
    expect(html).not.toContain('MACHINE TRANSLATION');
  });

  it('escapa el texto reconocido', () => {
    expect(segmentCardHtml(speech, 'ar-SA', 'en')).not.toContain('<b>');
  });
});

class MemoryStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

const session = (id: string, segs: TranslatedSegment[] = [speech, verse, possible]): SavedKhutbah => ({
  id,
  startedAt: '2026-09-18T03:30:00.000Z',
  source: 'ar-SA',
  target: 'en',
  segments: segs,
});

describe('historial de jutbas', () => {
  beforeEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();
  });

  it('guarda la más reciente primero, sin duplicar y con tope', () => {
    for (let i = 0; i < MAX_SESSIONS + 3; i++) saveKhutbah(session(`s${i}`));
    saveKhutbah(session('s5'));
    const list = loadHistory();
    expect(list).toHaveLength(MAX_SESSIONS);
    expect(list[0].id).toBe('s5');
    expect(list.filter((k) => k.id === 's5')).toHaveLength(1);
  });

  it('una sesión vacía no se guarda; borrar funciona', () => {
    saveKhutbah(session('vacia', []));
    expect(loadHistory()).toHaveLength(0);
    saveKhutbah(session('a'));
    expect(deleteKhutbah('a')).toHaveLength(0);
  });

  it('el texto copiado no incluye traducción de aleyas sin verificar', () => {
    const text = historyText(session('x'), 'Qur’an');
    expect(text).toContain('[Qur’an 2:153]');
    expect(text).toContain('(Tanzil.net)');
    expect(text).not.toContain('MACHINE TRANSLATION');
    expect(verseCount(session('x'))).toBe(1);
  });

  it('descarta datos guardados rotos o manipulados', () => {
    expect(parseHistory('{roto')).toEqual([]);
    expect(parseHistory('[{"id":"a","startedAt":"no-fecha","segments":[]}]')).toEqual([]);
    const ok = parseHistory(JSON.stringify([{ id: 'a', startedAt: '2026-09-18T03:30:00Z', segments: [{ kind: 'evil', translation: 'x', original: 'y' }, { kind: 'speech', translation: 'x', original: 'y', verified: 'yes' }] }]));
    expect(ok[0].segments).toHaveLength(1);
    expect(ok[0].segments[0].verified).toBe(false);
  });
});
