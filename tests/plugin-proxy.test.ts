/**
 * Guardián: un plugin de Capacitor no se devuelve NUNCA desde una función async.
 *
 * El plugin es un Proxy que responde a cualquier propiedad, también a `then`.
 * `return plugin` dentro de `async` hace que JavaScript lo trate como promesa y
 * llame a `.then()`; en Android eso lanza «"X.then()" is not implemented» y la
 * función falla fuera de su propio try/catch. Así murió la escucha de la jutba
 * en Android sin que nada se viera en pantalla.
 *
 * La forma segura es la de translate-ondevice.ts y speech-native.ts:
 * `registerPlugin<T>('Nombre')` a nivel de módulo, y funciones síncronas.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../src', import.meta.url).pathname;

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

describe('plugins de Capacitor', () => {
  it('ninguna función async devuelve el módulo importado de un plugin', () => {
    const culpables: string[] = [];
    for (const file of tsFiles(SRC)) {
      const code = stripComments(readFileSync(file, 'utf8'));
      // `const mod = await import('@capacitor…')` seguido de `return mod.X`
      const re = /const\s+(\w+)\s*=\s*await\s+import\(\s*['"]@(capacitor|capgo|capacitor-mlkit)[^)]*\)[\s\S]{0,200}?return\s+\1\.\w+/g;
      if (re.test(code)) culpables.push(file.replace(SRC, 'src'));
    }
    expect(culpables).toEqual([]);
  });
});
