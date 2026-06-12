/**
 * Lugares comunitarios: sugerencias (POST /api/places/suggest) y lugares
 * aprobados por moderación (GET /api/places), con caché local para que la
 * lista siga disponible offline.
 */
import type { Place } from './data';

const CACHE_KEY = 'hk-community-places';

export interface SuggestionInput {
  name: string;
  type: Place['type'];
  city: string;
  address?: string;
  lat?: number;
  lng?: number;
  note?: string;
}

export async function submitSuggestion(input: SuggestionInput): Promise<void> {
  const res = await fetch('/api/places/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`suggest: HTTP ${res.status}`);
}

function readCache(): Place[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]') as Place[];
  } catch {
    return [];
  }
}

/**
 * Lugares aprobados, refrescados de la red cuando hay conexión;
 * si falla, devuelve la última copia cacheada (offline-first).
 */
export async function fetchCommunityPlaces(): Promise<Place[]> {
  try {
    const res = await fetch('/api/places');
    if (!res.ok) return readCache();
    const data = (await res.json()) as { places: Place[] };
    // Sin coordenadas también vale: saldrá en la lista aunque no en el mapa.
    localStorage.setItem(CACHE_KEY, JSON.stringify(data.places));
    return data.places;
  } catch {
    return readCache();
  }
}
