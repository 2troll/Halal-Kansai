/**
 * Escapado del texto del sermón.
 *
 * Las tarjetas se pintan con insertAdjacentHTML y el texto viene de fuera: del
 * micrófono, del traductor y —en modo sala— de otro teléfono por WebSocket.
 * Sin escapar, un `<` rompía la tarjeta y cualquiera con el código de la sala
 * podía meter HTML en la pantalla de todos los asistentes.
 */
import { describe, expect, it } from 'vitest';
import { escapeHtml, safeText } from '../src/modules/escape.ts';

describe('escapeHtml', () => {
  it('neutraliza un script inyectado desde una sala', () => {
    const ataque = '<script>alert(1)</script>';
    const salida = escapeHtml(ataque);
    expect(salida).not.toContain('<script>');
    expect(salida).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('neutraliza el escape por atributo (comillas y onerror)', () => {
    const ataque = '"><img src=x onerror="alert(1)">';
    const salida = escapeHtml(ataque);
    expect(salida).not.toContain('<img');
    expect(salida).not.toContain('">');
  });

  it('escapa el & antes que el resto, sin doble escapado', () => {
    // Si el & se escapara al final, saldría &amp;lt; en vez de &lt;
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('a & b')).toBe('a &amp; b');
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('deja intacto el texto normal de un sermón', () => {
    expect(escapeHtml('Alabado sea Dios')).toBe('Alabado sea Dios');
    expect(escapeHtml('الحمد لله رب العالمين')).toBe('الحمد لله رب العالمين');
    expect(escapeHtml('神に称えあれ')).toBe('神に称えあれ');
  });

  it('no se come los apóstrofos del texto, solo los codifica', () => {
    expect(escapeHtml("l'imam")).toBe('l&#39;imam');
  });
});

describe('safeText', () => {
  it('convierte lo que no es texto en cadena vacía, no en "undefined"', () => {
    // El segmento de una sala llega del WebSocket con `as`, sin validar:
    // cualquier campo puede faltar o venir con otro tipo.
    expect(safeText(undefined)).toBe('');
    expect(safeText(null)).toBe('');
    expect(safeText({})).toBe('');
    expect(safeText([])).toBe('');
  });

  it('acepta números finitos (p. ej. una referencia de aleya mal tipada)', () => {
    expect(safeText(2)).toBe('2');
    expect(safeText(Number.NaN)).toBe('');
    expect(safeText(Number.POSITIVE_INFINITY)).toBe('');
  });

  it('escapa igual que escapeHtml cuando sí es texto', () => {
    expect(safeText('<b>')).toBe('&lt;b&gt;');
  });
});
