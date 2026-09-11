/**
 * Detección de respuestas atascadas del modelo.
 *
 * Caso medido en producción: 1.200 caracteres de entrada devolvían
 * «¡Hazlo bien!» ochenta veces seguidas. Proyectado en la pantalla de una
 * mezquita, eso es peor que no traducir: parece que la app funciona.
 *
 * Se prueba a través de `cleanUp`, que es la puerta por la que pasa todo lo
 * que devuelve el modelo antes de llegar a nadie.
 */
import { describe, expect, it } from 'vitest';
import { __testing } from '../server/src/ai-translate';
import { isDegenerate } from '../server/src/quality';

const { cleanUp } = __testing;

describe('respuestas atascadas del modelo', () => {
  it('descarta un trozo corto repetido muchas veces', () => {
    expect(cleanUp('¡Hazlo bien!'.repeat(20))).toBeNull();
  });

  it('descarta un texto largo con muy pocas palabras distintas', () => {
    expect(cleanUp('la oración la oración la oración la oración la oración la oración')).toBeNull();
  });

  it('deja pasar una traducción normal', () => {
    const bueno = 'Sabed que la oración es el pilar de la religión';
    expect(cleanUp(bueno)).toBe(bueno);
  });

  it('deja pasar una frase larga y variada', () => {
    const bueno =
      'A quien ayune Ramadán con fe y buscando la recompensa de Dios, se le perdonará lo que haya cometido antes de sus pecados.';
    expect(cleanUp(bueno)).toBe(bueno);
  });

  it('no confunde una repetición legítima y corta con un atasco', () => {
    // El árabe y el español repiten de verdad en el registro religioso.
    const bueno = 'Alabado sea Dios, alabado sea Dios por siempre.';
    expect(cleanUp(bueno)).toBe(bueno);
  });

  it('quita las comillas y el «Translation:» que el modelo añade a veces', () => {
    expect(cleanUp('Translation: La paciencia es la clave')).toBe('La paciencia es la clave');
    expect(cleanUp('"La paciencia es la clave"')).toBe('La paciencia es la clave');
  });

  it('una respuesta vacía es null, no una cadena vacía en pantalla', () => {
    expect(cleanUp('')).toBeNull();
    expect(cleanUp('   ')).toBeNull();
    expect(cleanUp(undefined)).toBeNull();
  });
});

describe('atascos en idiomas que no separan palabras', () => {
  it('detecta la repetición en japonés', () => {
    // Respuesta real de producción traduciendo una jutba indonesa: el
    // traductor pequeño se atascó y esto llegó entero a la pantalla, porque
    // las comprobaciones contaban palabras separadas por espacios y el
    // japonés no las tiene.
    expect(isDegenerate('何のために、何のために、何のために、何のために、何のために、何のために')).toBe(true);
    expect(isDegenerate('私は私は私は私は私は私は私は私は私は私は私は')).toBe(true);
  });

  it('no confunde el paralelismo del sermón con un atasco', () => {
    // Un jatib repite a propósito, y eso hay que respetarlo: la frase es
    // correcta y tiene que llegar tal cual.
    expect(
      isDegenerate('私たちが祈りを捧げるのは何のためか、断食をするのは何のためか、礼拝を行うのは何のためか'),
    ).toBe(false);
    expect(isDegenerate('アッラーを畏れなさい、そして正義をもって行いなさい。')).toBe(false);
    expect(isDegenerate('兄弟たちよ、礼拝は宗教の柱であり、成功の鍵です。')).toBe(false);
  });
});
