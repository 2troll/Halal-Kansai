/**
 * Ruta hasta el lugar en el mapa del teléfono.
 *
 * La URL universal de Google Maps: sin clave ni API, abre la app de Google
 * Maps si está instalada (Android, y iPhone si la tiene) y la web si no. Lleva
 * coordenadas y no el nombre, porque varias mezquitas de Kansai no aparecen
 * con el nombre con el que las conoce la comunidad.
 */
export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`;
}
