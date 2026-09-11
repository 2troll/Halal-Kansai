/**
 * Las piezas puras del reconocedor que corre en el propio teléfono.
 *
 * Lo que no se puede probar aquí (micrófono, WebGPU, el modelo) se probó a
 * mano con el audio de una jutba real delante del micrófono. Lo que sí se
 * puede probar es lo que decide qué llega a la pantalla, y eso es justo lo
 * que no puede fallar: Whisper, cuando el audio le llega roto, no calla —
 * rellena. Estas son las defensas contra ese relleno.
 */
import { describe, expect, it } from 'vitest';
import { clean } from '../src/modules/khutbah/whisper-local';

describe('limpieza de lo que devuelve el modelo', () => {
  it('deja pasar el sermón', () => {
    expect(clean(' الحمد لله رب العالمين ')).toBe('الحمد لله رب العالمين');
    expect(clean('اتقوا الله حق تقاته')).toBe('اتقوا الله حق تقاته');
  });

  it('descarta las muletillas de subtítulos con las que se entrenó', () => {
    // Aparecen cuando el audio no se entiende, y en una jutba serían
    // sencillamente vergonzosas.
    expect(clean('ご視聴ありがとうございました')).toBe('');
    expect(clean('Thanks for watching!')).toBe('');
    expect(clean('شكرا على المشاهدة')).toBe('');
    expect(clean('[موسيقى]')).toBe('');
    expect(clean('(Music)')).toBe('');
    expect(clean('...')).toBe('');
    expect(clean('   ')).toBe('');
  });

  it('descarta la palabra suelta', () => {
    // Una palabra arrancada de una frase se traduce mal y ocupa el subtítulo
    // que necesita la frase siguiente.
    expect(clean('الله')).toBe('');
    expect(clean('نعم')).toBe('');
    expect(clean('الحمد لله')).toBe('الحمد لله');
  });
});
