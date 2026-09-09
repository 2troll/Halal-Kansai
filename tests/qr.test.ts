/**
 * Estos tests comprueban la ESTRUCTURA del QR y el envoltorio SVG.
 *
 * Aviso ganado a base de fallar: pasarlos NO demuestra que un móvil lea el
 * código. La primera versión, escrita a mano, los pasaba todos y no la leía
 * ningún lector. La verificación de verdad es decodificar el SVG generado con
 * un lector real (BarcodeDetector del navegador), y está hecha aparte.
 */
import { describe, expect, it } from 'vitest';
import { encodeQr, qrSvg } from '../src/modules/khutbah/qr';

/** Las tres esquinas llevan el mismo patrón de 7×7 con su anillo blanco. */
function hasFinder(m: boolean[][], row: number, col: number): boolean {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const borde = r === 0 || r === 6 || c === 0 || c === 6;
      const centro = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      if (m[row + r]![col + c] !== (borde || centro)) return false;
    }
  }
  return true;
}

describe('código QR de la sala', () => {
  it('genera una matriz cuadrada de tamaño válido', () => {
    const m = encodeQr('https://halal-kansai.example/?room=osaka');
    expect(m.length).toBeGreaterThanOrEqual(21);
    expect(m.length % 4).toBe(1); // 21, 25, 29, 33… siempre 4n+1
    for (const row of m) expect(row).toHaveLength(m.length);
  });

  it('coloca los tres patrones de posición', () => {
    const m = encodeQr('https://x.dev/?room=masjid');
    const size = m.length;
    expect(hasFinder(m, 0, 0)).toBe(true);
    expect(hasFinder(m, 0, size - 7)).toBe(true);
    expect(hasFinder(m, size - 7, 0)).toBe(true);
    // La cuarta esquina NO lleva patrón: es lo que da la orientación.
    expect(hasFinder(m, size - 7, size - 7)).toBe(false);
  });

  it('coloca los patrones de sincronización alternos', () => {
    const m = encodeQr('https://x.dev/?room=a');
    for (let i = 8; i < m.length - 8; i++) {
      expect(m[6]![i]).toBe(i % 2 === 0);
      expect(m[i]![6]).toBe(i % 2 === 0);
    }
  });

  it('crece de versión cuando el texto es más largo', () => {
    const corto = encodeQr('https://x.dev/?room=a');
    const largo = encodeQr(
      'https://halal-kansai.2troll-p.workers.dev/?room=osaka-masjid-jumua',
    );
    expect(largo.length).toBeGreaterThan(corto.length);
  });

  it('acomoda una URL larga subiendo de versión, sin romperse', () => {
    const m = encodeQr(`https://halal-kansai.example/?room=${'a'.repeat(24)}`);
    expect(m.length).toBeGreaterThan(21);
  });

  it('el SVG lleva el margen blanco obligatorio', () => {
    const svg = qrSvg('https://x.dev/?room=a', 'sala');
    const m = encodeQr('https://x.dev/?room=a');
    // viewBox = tamaño + 4 módulos de margen a cada lado.
    expect(svg).toContain(`viewBox="0 0 ${m.length + 8} ${m.length + 8}"`);
    expect(svg).toContain('role="img"');
  });
});
