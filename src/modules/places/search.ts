/**
 * Búsqueda de lugares, sin DOM, para poder probarla.
 *
 * Antes «Kobe» sacaba primero la sala de oración de Rokko (más cerca) y la
 * Mezquita de Kobe quedaba debajo: quien escribe un nombre busca ESE sitio.
 * Ahora cuenta primero dónde aparece la búsqueda y después la distancia.
 */

/** Sin tildes ni mayúsculas: «kyoto» encuentra «Kyōto». */
export const fold = (v: string) => v.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

export interface Searchable {
  name: string;
  city: string;
  address?: string;
  notes?: string;
}

/**
 * 0 = todas las palabras en el nombre, 1 = en nombre o ciudad,
 * 2 = en cualquier campo, null = no coincide. Sin búsqueda, todo vale 0.
 */
export function searchRank(p: Searchable, query: string): number | null {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const name = fold(p.name);
  const nameCity = `${name} ${fold(p.city)}`;
  const all = `${nameCity} ${fold(p.address ?? '')} ${fold(p.notes ?? '')}`;
  const every = (text: string) => words.every((w) => text.includes(w));
  if (every(name)) return 0;
  if (every(nameCity)) return 1;
  if (every(all)) return 2;
  return null;
}
