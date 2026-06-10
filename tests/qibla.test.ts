import { describe, expect, it } from 'vitest';
import { distanceToKaabaKm, qiblaBearing } from '../src/modules/qibla/qibla';

describe('qiblaBearing', () => {
  // Valores verificados contra api.aladhan.com/v1/qibla (2026-06-10).
  // Nota: la spec decía "Osaka ≈ 293°", pero 293° es Tokio; Osaka es 290,8°.
  it('Osaka ≈ 290,8°', () => {
    const bearing = qiblaBearing(34.6937, 135.5023);
    expect(bearing).toBeCloseTo(290.84, 1);
  });

  it('Tokio ≈ 293,0°', () => {
    const bearing = qiblaBearing(35.6762, 139.6503);
    expect(bearing).toBeCloseTo(293.0, 1);
  });

  it('desde el norte de la Kaaba apunta al sur (≈180°)', () => {
    const bearing = qiblaBearing(30, 39.826206);
    expect(Math.abs(bearing - 180)).toBeLessThan(0.5);
  });

  it('devuelve valores normalizados 0–360', () => {
    const bearing = qiblaBearing(-33.8688, 151.2093); // Sídney
    expect(bearing).toBeGreaterThanOrEqual(0);
    expect(bearing).toBeLessThan(360);
  });
});

describe('distanceToKaabaKm', () => {
  it('Osaka está a ~9.160 km de la Kaaba', () => {
    const d = distanceToKaabaKm(34.6937, 135.5023);
    expect(d).toBeGreaterThan(9100);
    expect(d).toBeLessThan(9250);
  });
});
