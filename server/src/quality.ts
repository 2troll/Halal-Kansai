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

/**
 * Cobertura a partir de la cual una repetición ya no es un recurso retórico
 * sino un traductor atascado.
 */
const REPEAT_COVERAGE = 0.6;

/** ¿Se ha atascado el traductor repitiendo? */
export function isDegenerate(text: string): boolean {
  const clean = text.trim();
  // Veinte caracteres, no cuarenta: en japonés y en chino cada carácter es
  // una sílaba entera, y «何のために、何のために、何のために…» —una respuesta
  // real de producción, traduciendo una jutba indonesia— cabía por debajo
  // del listón anterior y llegaba entera a la pantalla.
  if (clean.length < 20) return false;

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

  // Y lo mismo sin depender de los espacios.
  //
  // Las dos comprobaciones de arriba cuentan palabras sueltas, y el japonés
  // —que es el idioma al que más se traduce aquí— no las separa: para ellas
  // «何のために、何のために、何のために…» es UNA palabra larguísima y por lo
  // tanto variada. Esto busca el trozo que más se repite y mira cuánto del
  // texto ocupa; si un mismo trozo cubre la mayor parte, el traductor se
  // atascó, escriba el idioma con espacios o sin ellos.
  for (const size of [2, 3, 4, 5, 6, 8, 10]) {
    if (clean.length < size * 3) break;
    const counts = new Map<string, number>();
    for (let i = 0; i + size <= clean.length; i++) {
      const gram = clean.slice(i, i + size);
      if (!gram.trim()) continue;
      counts.set(gram, (counts.get(gram) ?? 0) + 1);
    }
    for (const [, times] of counts) {
      if (times >= 3 && (times * size) / clean.length >= REPEAT_COVERAGE) return true;
    }
  }

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
