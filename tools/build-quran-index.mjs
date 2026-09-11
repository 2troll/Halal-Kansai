/**
 * Índice de búsqueda del Corán, precalculado.
 *
 * Por qué existe. El servidor compara cada frase del sermón con las aleyas
 * para saber si es una cita. Normalizar las 6.236 aleyas y construir el
 * índice de palabras cuesta unos 30 ms de CPU, y en el plan gratuito de
 * Cloudflare cada petición dispone de 10 ms. El servidor se pasaba del
 * límite y devolvía 503: el reconocimiento de voz funcionaba, la pantalla
 * enseñaba el árabe, y la traducción no llegaba nunca. Hecho aquí, una vez,
 * leerlo cuesta 3 ms.
 *
 * Se ejecuta solo (npm run build:index) o desde build-quran-data.mjs.
 * Sin red: parte del quran-uthmani.json ya descargado.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeArabic } from '../server/src/normalize.ts';
import { INDEX_WORD_MIN, indexableWords } from '../server/src/match.ts';

const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../server/data');

/** @param {Record<string,string>} uthmani mapa "sura:ayah" → texto Uthmani */
export function buildIndex(uthmani) {
  const keys = Object.keys(uthmani);
  const norm = keys.map((k) => normalizeArabic(uthmani[k]));
  /** @type {Record<string, number[]>} */
  const words = {};
  norm.forEach((text, i) => {
    // Las mismas palabras que buscará el servidor: si las dos listas no
    // coinciden, el índice no encuentra lo que debería.
    for (const word of indexableWords(text)) (words[word] ??= []).push(i);
  });
  return { keys, norm, words };
}

export function writeIndex(dataDir = DATA_DIR) {
  const uthmani = JSON.parse(readFileSync(join(dataDir, 'quran-uthmani.json'), 'utf8'));
  const index = buildIndex(uthmani);
  const out = join(dataDir, 'quran-index.json');
  writeFileSync(out, JSON.stringify(index));
  return { out, verses: index.keys.length, words: Object.keys(index.words).length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { out, verses, words } = writeIndex();
  console.log(`✓ ${out} · ${verses} aleyas · ${words} palabras (mínimo ${INDEX_WORD_MIN} letras)`);
}
