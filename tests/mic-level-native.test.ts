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

import { canMeterAlongsideSpeech } from '../src/modules/khutbah/mic-level';

describe('canMeterAlongsideSpeech', () => {
  it('no abre un segundo micrófono en móviles', () => {
    expect(canMeterAlongsideSpeech('Mozilla/5.0 (Linux; Android 16; A059) Chrome/140 Mobile Safari/537.36', 5)).toBe(false);
    expect(canMeterAlongsideSpeech('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari', 5)).toBe(false);
    expect(canMeterAlongsideSpeech('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari', 5)).toBe(false);
  });
  it('en ordenador sí mide', () => {
    expect(canMeterAlongsideSpeech('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/140', 0)).toBe(true);
    expect(canMeterAlongsideSpeech('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140', 0)).toBe(true);
  });
});
