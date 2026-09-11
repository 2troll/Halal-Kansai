/**
 * El índice precalculado y la búsqueda en caliente tienen que decir lo mismo.
 *
 * Por qué esta prueba. El índice se genera en el build (tools/build-quran-index.mjs)
 * y el servidor lo lee ya hecho, porque construirlo en caliente cuesta 30 ms de
 * CPU y Cloudflare concede 10 por petición: ese fue el 503 que dejó el sermón sin
 * traducir. El riesgo que se compra con eso es que el índice envejezca —alguien
 * cambia la normalización, no regenera el fichero, y el servidor busca con un
 * mapa viejo sin que nada falle a la vista—. Esto lo detecta.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QuranMatcher, type QuranIndex } from '../server/src/match.ts';
import { buildIndex } from '../tools/build-quran-index.mjs';

const uthmani: Record<string, string> = JSON.parse(
  readFileSync('server/data/quran-uthmani.json', 'utf8'),
);
const fichero: QuranIndex = JSON.parse(readFileSync('server/data/quran-index.json', 'utf8'));

/** Fragmentos tal como los devuelve el reconocimiento de voz, sin tashkeel. */
const CITAS: Array<[string, string]> = [
  ['اتقوا الله حق تقاته ولا تموتن الا وانتم مسلمون', '3:102'],
  ['ان الله يامر بالعدل والاحسان وايتاء ذي القربى', '16:90'],
  ['يا ايها الناس اتقوا ربكم الذي خلقكم من نفس واحدة', '4:1'],
];

const HABLA = [
  'ايها الاخوه الكرام اليوم نتحدث عن الصبر في حياه المسلم وعن اهميه الصدق',
  'نسال الله ان يوفقنا جميعا لما يحب ويرضى في هذا اليوم المبارك',
  // Sermón con vocabulario coránico de sobra: la tentación de marcarlo como
  // cita es máxima, y atribuir al Libro lo que no está en él es lo único
  // que esta aplicación no puede permitirse.
  'الحمد لله نحمده ونستعينه ونستغفره ونعوذ بالله من شرور انفسنا',
  'اتقوا الله في اولادكم وفي جيرانكم وفي اعمالكم يا عباد الله',
  'ان المسلم الحق هو من سلم الناس من لسانه ويده كما علمنا نبينا',
  'والصلاه والسلام على رسول الله وعلى اله وصحبه اجمعين',
];

/** Así se cita de verdad: la aleya va dentro de la frase, no sola. */
const CITAS_EMBEBIDAS: Array<[string, string]> = [
  [
    'قال الله تعالى في كتابه الكريم يا ايها الذين امنوا اتقوا الله حق تقاته ولا تموتن الا وانتم مسلمون',
    '3:102',
  ],
  [
    'ايها الاخوه الكرام نحن في زمن كثرت فيه الفتن وقد قال ربنا ان الله يامر بالعدل والاحسان وايتاء ذي القربى فاتقوا الله في انفسكم وفي اهليكم',
    '16:90',
  ],
  ['ونختم بقول الله تعالى ان مع العسر يسرا', '94:6'],
];

describe('índice coránico precalculado', () => {
  it('el fichero del repositorio es el que generaría el build de hoy', () => {
    const recien = buildIndex(uthmani);
    expect(fichero.keys).toEqual(recien.keys);
    expect(fichero.norm).toEqual(recien.norm);
    expect(Object.keys(fichero.words).length).toBe(Object.keys(recien.words).length);
  });

  it('encuentra las mismas aleyas con índice y sin él', () => {
    const conIndice = new QuranMatcher(uthmani, fichero);
    const sinIndice = new QuranMatcher(uthmani);
    for (const [texto, referencia] of CITAS) {
      const a = conIndice.match(texto);
      const b = sinIndice.match(texto);
      expect(a).not.toBeNull();
      expect(`${a!.ref.sura}:${a!.ref.ayah}`).toBe(referencia);
      expect(`${b!.ref.sura}:${b!.ref.ayah}`).toBe(referencia);
    }
  });

  it('no inventa citas donde solo hay sermón', () => {
    const matcher = new QuranMatcher(uthmani, fichero);
    for (const frase of HABLA) expect(matcher.match(frase)).toBeNull();
  });

  it('reconoce la aleya citada dentro de la frase del sermón', () => {
    // Era el único de los cuatro modos de citar que fallaba: con sermón por
    // delante y por detrás, la confianza del fragmento entero se hundía y la
    // cita se traducía como habla corriente, sin texto Uthmani ni referencia.
    const matcher = new QuranMatcher(uthmani, fichero);
    for (const [frase, referencia] of CITAS_EMBEBIDAS) {
      const r = matcher.match(frase);
      expect(r, `no detectó ${referencia} en: ${frase.slice(0, 40)}…`).not.toBeNull();
      expect(`${r!.ref.sura}:${r!.ref.ayah}`).toBe(referencia);
    }
  });

  it('cada búsqueda cabe en el presupuesto de CPU de Cloudflare', () => {
    // 10 ms por petición, y la traducción todavía tiene que caber. El
    // escaneo completo de las 6.236 aleyas gastaba 170.
    const matcher = new QuranMatcher(uthmani, fichero);
    const frases = [...CITAS.map(([t]) => t), ...CITAS_EMBEBIDAS.map(([t]) => t), ...HABLA];
    const t0 = performance.now();
    for (const frase of frases) matcher.match(frase);
    const porFrase = (performance.now() - t0) / frases.length;
    expect(porFrase).toBeLessThan(5);
  });
});
