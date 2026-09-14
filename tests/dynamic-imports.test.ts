/**
 * Guardián: ningún `import()` con especificador que Vite no pueda resolver.
 *
 * De dónde sale esta prueba. La traducción de la jutba dentro del móvil no se
 * ejecutó NI UNA VEZ, y nadie lo notó, porque el plugin se cargaba así:
 *
 *     const spec = '@capacitor-mlkit/translation';
 *     await import(spec);          // con un comentario @vite-ignore delante
 *
 * Con el especificador en una VARIABLE y `@vite-ignore`, Vite deja el import
 * tal cual. En el navegador eso no se puede resolver —y dentro de la app, con
 * origen `capacitor://localhost`, menos— así que lanzaba, un `catch` se lo
 * tragaba y la app caía al servidor siempre, en silencio.
 *
 * El matiz que importa: `import('@capacitor/camera')` con la cadena LITERAL sí
 * funciona; Vite la resuelve al compilar y genera su trozo. El problema es solo
 * el especificador dinámico. Esta prueba deja fijada esa diferencia para que no
 * vuelva a colarse.
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

/** Quita comentarios, para no acusar a un texto que solo HABLA del problema. */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/** Los `import(...)` cuyo argumento NO es una cadena literal simple. */
function dynamicSpecifiers(code: string): string[] {
  const out: string[] = [];
  const re = /\bimport\s*\(\s*([^)]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    const arg = m[1].trim();
    const literal = /^(['"])[^'"]+\1$/.test(arg) || /^`[^`$]+`$/.test(arg);
    if (!literal) out.push(arg);
  }
  return out;
}

describe('imports dinámicos', () => {
  const files = tsFiles(SRC);

  it('encuentra ficheros que revisar (la prueba no se queda vacía sin avisar)', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('ninguno usa un especificador variable: no se resolvería en la app', () => {
    const culpables: string[] = [];
    for (const file of files) {
      for (const spec of dynamicSpecifiers(stripComments(readFileSync(file, 'utf8')))) {
        culpables.push(`${file.replace(SRC, 'src')} → import(${spec})`);
      }
    }
    expect(culpables, culpables.join('\n')).toEqual([]);
  });

  it('nadie silencia a Vite con @vite-ignore', () => {
    const culpables = files
      .filter((f) => readFileSync(f, 'utf8').includes('@vite-ignore'))
      .map((f) => f.replace(SRC, 'src'));
    expect(culpables, culpables.join('\n')).toEqual([]);
  });
});

describe('el detector, probado contra sí mismo', () => {
  it('deja pasar la cadena literal, que Vite sí resuelve', () => {
    expect(dynamicSpecifiers(`await import('@capacitor/camera')`)).toEqual([]);
    expect(dynamicSpecifiers(`await import("./modulo")`)).toEqual([]);
  });

  it('caza el especificador en una variable, que es lo que rompía', () => {
    expect(dynamicSpecifiers('await import(spec)')).toEqual(['spec']);
  });

  it('caza también la plantilla con interpolación', () => {
    expect(dynamicSpecifiers('await import(`@scope/${name}`)')).toEqual(['`@scope/${name}`']);
  });
});
