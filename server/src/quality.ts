/**
 * Control de calidad de una traducción antes de que llegue a una pantalla.
 *
 * Los traductores automáticos, grandes y pequeños, se atascan repitiendo
 * cuando la entrada es larga o repetitiva. Medido en producción: 1.200
 * caracteres devolvían «¡Hazlo bien!» ochenta veces seguidas.
 *
 * Proyectado en la pantalla de una mezquita eso es peor que no traducir,
 * porque parece que la app funciona. Vale más enseñar el original árabe y que
 * cada uno sepa a qué atenerse.
 *
 * Vive aparte del traductor a propósito: la comprobación tiene que aplicarse
 * a TODOS los motores. El fallo real fue tenerla solo en uno — el modelo
 * grande la pasaba y caía al pequeño, que devolvía la misma basura sin que
 * nadie la mirase.
 */

/** ¿Se ha atascado el traductor repitiendo? */
export function isDegenerate(text: string): boolean {
  const clean = text.trim();
  if (clean.length < 40) return false;

  // Un trozo corto repetido muchas veces seguidas: la firma del atasco.
  for (let size = 3; size <= 25; size++) {
    const chunk = clean.slice(0, size);
    if (!chunk.trim()) continue;
    let repeats = 0;
    while (clean.startsWith(chunk.repeat(repeats + 1))) repeats++;
    if (repeats >= 4) return true;
  }

  // O muy poca variedad de palabras para lo largo que es. Cubre el caso en
  // que la repetición no empieza justo al principio.
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 12 && new Set(words).size <= words.length / 4) return true;

  return false;
}

/**
 * La traducción si es utilizable, o `null` para que el llamante pruebe otro
 * motor o se quede con el original.
 */
export function usableTranslation(text: string | null | undefined): string | null {
  if (!text) return null;
  const clean = text.trim();
  if (clean.length === 0) return null;
  return isDegenerate(clean) ? null : clean;
}
