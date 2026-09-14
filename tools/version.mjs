/**
 * Una sola versión para las tres plataformas.
 *
 * Había tres sitios diciendo cosas distintas: `package.json` con 0.1.0, Android
 * con versionName "1.0" y iOS con MARKETING_VERSION 1.0. Eso no es un detalle
 * cosmético: las tiendas RECHAZAN una subida cuyo número de build no sea único
 * y mayor que el anterior, y se descubre con el .aab ya generado.
 *
 * La fuente de verdad es `package.json`. Este script la escribe en los dos
 * proyectos nativos.
 *
 *   node tools/version.mjs           escribe la versión en Android e iOS
 *   node tools/version.mjs --check   no toca nada; falla si no cuadran (CI)
 *
 * El número de build se DERIVA del semver, no se lleva a mano:
 *
 *   major * 10000 + minor * 100 + patch     1.2.3 -> 10203
 *
 * Así siempre crece al subir la versión y nadie tiene que acordarse de
 * incrementarlo. Tope por tramo: 99 (de sobra; si algún día hacen falta más de
 * 99 parches seguidos, el problema es otro).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

/** "1.2.3" -> { version, code }. Revienta claro si el formato no es semver. */
function parseVersion(raw) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(raw);
  if (!m) fail(`La versión de package.json debe ser MAJOR.MINOR.PATCH, no "${raw}".`);
  const [, major, minor, patch] = m.map(Number);
  if (minor > 99 || patch > 99) {
    fail(`minor y patch no pueden pasar de 99 (son "${raw}"): el versionCode se solaparía.`);
  }
  return { version: raw, code: major * 10000 + minor * 100 + patch };
}

/** Sustituye una sola vez y avisa si el patrón ya no está donde debía. */
function replaceOnce(text, re, replacement, what, file) {
  const hits = text.match(new RegExp(re.source, re.flags.replace('g', '') + 'g'));
  if (!hits || hits.length === 0) fail(`No encuentro ${what} en ${file}. ¿Cambió el formato?`);
  return text.replace(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'), replacement);
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const { version, code } = parseVersion(pkg.version);

const targets = [
  {
    file: 'android/app/build.gradle',
    apply: (t) => {
      t = replaceOnce(t, /versionCode \d+/, `versionCode ${code}`, 'versionCode', 'build.gradle');
      return replaceOnce(t, /versionName "[^"]*"/, `versionName "${version}"`, 'versionName', 'build.gradle');
    },
  },
  {
    file: 'ios/App/App.xcodeproj/project.pbxproj',
    apply: (t) => {
      t = replaceOnce(t, /MARKETING_VERSION = [^;]+;/, `MARKETING_VERSION = ${version};`, 'MARKETING_VERSION', 'project.pbxproj');
      return replaceOnce(t, /CURRENT_PROJECT_VERSION = [^;]+;/, `CURRENT_PROJECT_VERSION = ${code};`, 'CURRENT_PROJECT_VERSION', 'project.pbxproj');
    },
  },
];

let changed = false;
for (const { file, apply } of targets) {
  const path = join(root, file);
  const before = readFileSync(path, 'utf8');
  const after = apply(before);
  if (before === after) continue;
  changed = true;
  if (check) {
    fail(`${file} no está a la versión ${version} (build ${code}). Ejecuta: npm run version:sync`);
  }
  writeFileSync(path, after);
  console.log(`  · ${file}`);
}

if (check) {
  console.log(`✓ Android e iOS están a ${version} (build ${code}).`);
} else if (changed) {
  console.log(`✓ Versión ${version} (build ${code}) escrita en Android e iOS.`);
  console.log('  Recuerda: npx cap sync antes de generar el paquete.');
} else {
  console.log(`✓ Ya estaba todo a ${version} (build ${code}). Nada que hacer.`);
}
