import { describe, expect, it } from 'vitest';
import { nativeReading } from '../src/modules/khutbah/mic-level';

describe('nativeReading (nivel del reconocedor de Android)', () => {
  it('silencio, flojo y bien según los dB relativos', () => {
    expect(nativeReading(-2, 0).state).toBe('silence');
    expect(nativeReading(2.5, 0).state).toBe('weak');
    expect(nativeReading(8, 0).state).toBe('good');
  });
  it('decide con la media, no con un pico suelto', () => {
    expect(nativeReading(9.8, 0, -1).state).toBe('silence');
    expect(nativeReading(-1, 0, 4.5).state).toBe('good');
  });
  it('la barra sube al instante y baja despacio', () => {
    const up = nativeReading(10, 0);
    expect(up.level).toBe(1);
    const down = nativeReading(-2, up.level);
    expect(down.level).toBeGreaterThan(0.8);
  });
});
