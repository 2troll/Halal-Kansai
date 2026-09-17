/**
 * Guardián: ninguna hoja de estilos remota puede bloquear el arranque.
 *
 * Un <link rel="stylesheet"> a otro dominio detiene la ejecución de la app
 * hasta que responde. En el Nothing Phone 3a, con fonts.googleapis.com lenta,
 * la app se quedaba en la pantalla de carga. Sin cobertura pasaría siempre.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('index.html', () => {
  it('las hojas de estilos remotas cargan sin bloquear (media="print" + onload)', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const links = html.match(/<link\b[^>]*>/g) ?? [];
    const blocking = links.filter(
      (l) => /rel="stylesheet"/.test(l) && /href="https?:\/\//.test(l) && !/media="print"/.test(l),
    );
    expect(blocking).toEqual([]);
  });
});
