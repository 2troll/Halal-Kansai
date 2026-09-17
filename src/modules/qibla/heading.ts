/** Suavizado del rumbo: menos es más estable pero responde más lento. */
const SMOOTHING = 0.2;

/**
 * Rumbo respecto al norte GEOGRÁFICO a partir de la lectura del sensor.
 *
 * - El sensor mide el norte magnético: se suma la declinación del lugar
 *   (WMM2025). En Osaka son unos −8°: sin esto la brújula apuntaba bien y la
 *   app decía que no.
 * - Con el móvil en horizontal la pantalla gira 90°: se suma su ángulo.
 */
export function trueHeading(magnetic: number, declinationDeg: number, screenAngle = 0): number {
  return (((magnetic + declinationDeg + screenAngle) % 360) + 360) % 360;
}

/** Media circular exponencial: 359° y 1° promedian 0°, no 180°. */
export function smoothHeading(prev: number | null, next: number, k = SMOOTHING): number {
  if (prev === null) return next;
  const diff = ((next - prev + 540) % 360) - 180;
  return (((prev + k * diff) % 360) + 360) % 360;
}
