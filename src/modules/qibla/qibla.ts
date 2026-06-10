/**
 * Rumbo qibla: acimut del círculo máximo hacia la Kaaba desde cualquier punto.
 * 100% offline. Osaka ≈ 293°.
 */

export const KAABA = { lat: 21.422487, lng: 39.826206 } as const;

const DEG = Math.PI / 180;

/** Acimut hacia la Kaaba en grados desde el norte verdadero (0–360). */
export function qiblaBearing(lat: number, lng: number): number {
  const phi = lat * DEG;
  const phiK = KAABA.lat * DEG;
  const dLng = (KAABA.lng - lng) * DEG;

  const bearing = Math.atan2(
    Math.sin(dLng),
    Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(dLng),
  );
  return ((bearing / DEG) % 360 + 360) % 360;
}

/** Distancia haversine a la Kaaba en km (dato informativo en la UI). */
export function distanceToKaabaKm(lat: number, lng: number): number {
  const R = 6371;
  const dPhi = (KAABA.lat - lat) * DEG;
  const dLng = (KAABA.lng - lng) * DEG;
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(lat * DEG) * Math.cos(KAABA.lat * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
