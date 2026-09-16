/**
 * Guardián: nunca `algoGlobal?.x` con una API del navegador que puede no existir.
 *
 * De dónde sale esta prueba. En Android la pestaña de la jutba se dibujaba a
 * medias y «Empezar a escuchar» no hacía NADA, sin error visible. La línea era:
 *
 *     speechSynthesis?.addEventListener?.('voiceschanged', fillVoices);
 *
 * El `?.` protege de `undefined`, pero no de una variable global que no está
 * declarada: el WebView de Android no trae `speechSynthesis`, así que lanzaba
 * `ReferenceError`, cortaba `renderKhutbah` y el botón se quedaba sin su
 * manejador. En Chrome de escritorio sí existe, por eso nadie lo vio.
 *
 * Lo correcto es `globalThis.speechSynthesis?.…`, que sí da `undefined`.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../src', import.meta.url).pathname;

/** APIs que faltan en algún WebView (Android, iOS) o en navegadores viejos. */
const OPTIONAL_GLOBALS = [
  'speechSynthesis',
  'SpeechRecognition',
  'webkitSpeechRecognition',
  'SpeechSynthesisUtterance',
  'DeviceOrientationEvent',
  'Notification',
];

function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return tsFiles(full);
    return name.endsWith('.ts') ? [full] : [];
  });
}

function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('globales opcionales', () => {
  const files = tsFiles(SRC);

  it('encuentra ficheros que revisar', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('ninguna API opcional se usa como `Global?.` sin pasar por globalThis/window', () => {
    const culpables: string[] = [];
    for (const file of files) {
      const code = stripComments(readFileSync(file, 'utf8'));
      for (const name of OPTIONAL_GLOBALS) {
        // Precedido de «.» (globalThis.x, window.x) está bien; suelto, no.
        const re = new RegExp(`(^|[^.\\w$])${name}\\?\\.`, 'g');
        if (re.test(code)) culpables.push(`${file.replace(SRC, 'src')}: ${name}?.`);
      }
    }
    expect(culpables).toEqual([]);
  });
});
