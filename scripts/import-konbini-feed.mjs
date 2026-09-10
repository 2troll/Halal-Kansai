#!/usr/bin/env node
/**
 * Trae el feed de productos de konbini a la app.
 *
 * El productor (repo `halal-konbini`) genera `dist/products.json` y no sabe
 * nada de esta app: el contrato de datos dice que las dos mitades solo
 * comparten ese archivo. Por eso es el consumidor quien va a buscarlo, y no el
 * productor quien escribe aquí dentro.
 *
 *   npm run feed:import                    # ~/halal-konbini/dist/products.json
 *   npm run feed:import -- /otra/ruta.json
 *   KONBINI_FEED=/otra/ruta.json npm run feed:import
 *
 * Comprueba antes de copiar. Un feed inválido publicado es peor que no tener
 * feed: la app lo cachea en el móvil de alguien que está en una tienda.
 */

import { copyFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = join(ROOT, 'public', 'feed', 'products.json');

/** La versión del contrato que sabe leer `src/modules/ingredients/konbini.ts`. */
const SCHEMA_SOPORTADO = 1;

const ESTADOS = new Set([
  'certified',
  'manufacturer_confirmed',
  'label_clear',
  'ambiguous',
  'excluded',
  'unknown',
  'expired',
]);

function morir(mensaje) {
  console.error(`feed: ${mensaje}`);
  process.exit(1);
}

const origen = resolve(
  process.argv[2] ?? process.env.KONBINI_FEED ?? join(homedir(), 'halal-konbini', 'dist', 'products.json'),
);

if (!statSync(origen, { throwIfNoEntry: false })?.isFile()) {
  morir(
    `no existe ${origen}\n` +
      '      Genéralo en el productor:  cd ~/halal-konbini && .venv/bin/halal export',
  );
}

let feed;
try {
  feed = JSON.parse(readFileSync(origen, 'utf8'));
} catch (err) {
  morir(`${origen} no es JSON válido: ${err.message}`);
}

if (typeof feed?.schema_version !== 'number') morir('falta schema_version');
if (feed.schema_version > SCHEMA_SOPORTADO) {
  morir(
    `schema_version ${feed.schema_version}; esta app lee hasta ${SCHEMA_SOPORTADO}.\n` +
      '      Actualiza el consumidor antes de publicar este feed.',
  );
}
if (typeof feed.generated_at !== 'string') morir('falta generated_at');
if (!Array.isArray(feed.products)) morir('falta la lista de productos');

// Clave primaria: sin JAN el registro no se puede buscar, y repetido tapa a otro.
const vistos = new Set();
for (const p of feed.products) {
  if (!/^\d{8}$|^\d{13}$/.test(p?.jan ?? '')) morir(`JAN inválido: ${JSON.stringify(p?.jan)}`);
  if (vistos.has(p.jan)) morir(`JAN repetido: ${p.jan}`);
  vistos.add(p.jan);
  if (!ESTADOS.has(p?.status)) morir(`estado desconocido en ${p.jan}: ${p?.status}`);
  if (typeof p?.name !== 'string' || p.name.length === 0) morir(`sin nombre: ${p.jan}`);
  if (typeof p?.checked_at !== 'string') morir(`sin checked_at: ${p.jan}`);
  // El contrato prohíbe el veredicto "haram" y exige motivo cuando hay dictamen.
  if ((p.status === 'ambiguous' || p.status === 'excluded') && !(p.reason_codes?.length > 0)) {
    morir(`${p.jan} es ${p.status} y no trae reason_codes`);
  }
}

mkdirSync(dirname(DESTINO), { recursive: true });
copyFileSync(origen, DESTINO);

const cuenta = feed.products.length;
console.log(`feed: ${cuenta} producto(s), generado ${feed.generated_at}`);
console.log(`feed: ${origen}\n   -> ${DESTINO}`);
if (cuenta === 0) {
  console.log('feed: la base está vacía. Añade productos con `halal add` en el productor.');
}
