/**
 * Descarga e indexa el Corán de Tanzil.net (texto Uthmani + traducciones).
 * Licencia Tanzil: libre con atribución, sin modificar el texto.
 * Uso: node tools/build-quran-data.mjs
 *
 * Salida:
 *   server/data/quran-uthmani.json        { "1:1": "بِسْمِ…", … }  (6236 aleyas)
 *   server/data/translations/<lang>.json  { meta: {...}, verses: { "1:1": "...", … } }
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../server/data');

/** Traducciones Tanzil por idioma de la app (códigos ISO-639-1 del frontend). */
export const TRANSLATIONS = {
  es: { id: 'es.cortes', name: 'Julio Cortés' },
  en: { id: 'en.sahih', name: 'Saheeh International' },
  ja: { id: 'ja.japanese', name: 'Japanese (Tanzil)' },
  ur: { id: 'ur.jalandhry', name: 'Fateh Muhammad Jalandhry' },
  id: { id: 'id.indonesian', name: 'Bahasa Indonesia (Kemenag)' },
  bn: { id: 'bn.bengali', name: 'Muhiuddin Khan' },
  hi: { id: 'hi.hindi', name: 'Suhel Farooq Khan & Saifur Rahman Nadwi' },
  ta: { id: 'ta.tamil', name: 'Jan Turst Foundation' },
  tr: { id: 'tr.diyanet', name: 'Diyanet İşleri' },
  fa: { id: 'fa.makarem', name: 'Naser Makarem Shirazi' },
  ru: { id: 'ru.kuliev', name: 'Эльмир Кулиев' },
  fr: { id: 'fr.hamidullah', name: 'Muhammad Hamidullah' },
  zh: { id: 'zh.jian', name: 'Ma Jian' },
  ms: { id: 'ms.basmeih', name: 'Abdullah Muhammad Basmeih' },
  sw: { id: 'sw.barwani', name: 'Ali Muhsin Al-Barwani' },
  am: { id: 'am.sadiq', name: 'Sadiq & Sani' },
  th: { id: 'th.thai', name: 'King Fahad Quran Complex' },
  uz: { id: 'uz.sodik', name: 'Muhammad Sodik Muhammad Yusuf' },
  // ne, si, vi, my, fil: no existen en Tanzil → fallback a traducción LLM
  // marcada como "no oficial" en el backend.
};

function parseTanzil(text) {
  const verses = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [sura, ayah, ...rest] = trimmed.split('|');
    if (!sura || !ayah || rest.length === 0) continue;
    verses[`${sura}:${ayah}`] = rest.join('|');
  }
  return verses;
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

async function main() {
  mkdirSync(join(DATA_DIR, 'translations'), { recursive: true });

  console.log('Descargando texto Uthmani…');
  const uthmani = parseTanzil(
    await fetchText('https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true'),
  );
  const count = Object.keys(uthmani).length;
  if (count !== 6236) throw new Error(`Esperaba 6236 aleyas, obtuve ${count}`);
  writeFileSync(join(DATA_DIR, 'quran-uthmani.json'), JSON.stringify(uthmani));
  console.log(`✓ quran-uthmani.json (${count} aleyas)`);

  // Las traducciones en formato txt vienen sin prefijo sura|aleya:
  // una aleya por línea en el orden canónico del texto Uthmani.
  const orderedKeys = Object.keys(uthmani);

  for (const [lang, { id, name }] of Object.entries(TRANSLATIONS)) {
    const raw = await fetchText(`https://tanzil.net/pub/trans/?transID=${id}&type=txt`);
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
    if (lines.length !== 6236) {
      console.warn(`⚠ ${lang} (${id}): ${lines.length} líneas — omitido`);
      continue;
    }
    const verses = {};
    orderedKeys.forEach((key, i) => {
      verses[key] = lines[i];
    });
    const out = {
      meta: { language: lang, translator: name, source: `Tanzil.net (${id})`, license: 'Free, with attribution; text unmodified' },
      verses,
    };
    writeFileSync(join(DATA_DIR, 'translations', `${lang}.json`), JSON.stringify(out));
    console.log(`✓ translations/${lang}.json (${name})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
