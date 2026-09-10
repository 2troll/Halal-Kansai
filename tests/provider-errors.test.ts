/**
 * Mensajes de error del proveedor disfrazados de traducción.
 *
 * Caso real, encontrado probando la API en producción con un texto largo: la
 * pantalla mostraba «QUERY LENGTH LIMIT EXCEEDED. MAX ALLOWED QUERY : 500
 * CHARS» donde tenía que ir la traducción del sermón. MyMemory contesta 200
 * por HTTP y mete el error dentro del JSON, así que nada fallaba: solo se
 * enseñaba basura con toda naturalidad.
 *
 * El filtro anterior solo aceptaba letras, espacios y comillas — el mensaje
 * se colaba por llevar dos puntos y un número.
 */
import { describe, expect, it } from 'vitest';
import { looksLikeProviderError } from '../server/src/free-translate';

describe('errores del proveedor de traducción', () => {
  it('caza el mensaje exacto que llegó a producción', () => {
    expect(
      looksLikeProviderError('QUERY LENGTH LIMIT EXCEEDED. MAX ALLOWED QUERY : 500 CHARS'),
    ).toBe(true);
  });

  it('caza los demás avisos conocidos de MyMemory', () => {
    expect(looksLikeProviderError('INVALID LANGUAGE PAIR SPECIFIED')).toBe(true);
    expect(looksLikeProviderError('NO QUERY SPECIFIED. EXAMPLE REQUEST: GET?Q=HELLO')).toBe(true);
    expect(looksLikeProviderError('PLEASE SELECT TWO DISTINCT LANGUAGES')).toBe(true);
  });

  it('trata el vacío como error, no como traducción vacía', () => {
    expect(looksLikeProviderError('')).toBe(true);
    expect(looksLikeProviderError('   ')).toBe(true);
    expect(looksLikeProviderError(undefined)).toBe(true);
  });

  it('deja pasar traducciones de verdad', () => {
    expect(looksLikeProviderError('Sabed que la oración es el pilar de la religión')).toBe(false);
    expect(looksLikeProviderError('礼拝は宗教の柱です')).toBe(false);
    expect(looksLikeProviderError('اتقوا الله')).toBe(false);
  });

  it('no confunde una traducción corta y legítima con un error', () => {
    expect(looksLikeProviderError('La paz')).toBe(false);
    expect(looksLikeProviderError('Amén')).toBe(false);
  });

  it('deja pasar una sigla dentro de una frase normal', () => {
    expect(looksLikeProviderError('El certificado JHCPO está vigente')).toBe(false);
  });
});
