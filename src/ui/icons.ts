/**
 * Iconos de línea, dibujados a mano en SVG.
 *
 * Por qué se van los emojis. Se pusieron porque son gratis y se leen en
 * cualquier idioma, pero tienen tres problemas serios en esta app:
 *
 * 1. **Cada sistema los dibuja distinto.** 🕌 es una mezquita plana en iOS,
 *    un dibujo con degradado en Android y una silueta en Windows. La barra de
 *    pestañas parecía de otra app en cada teléfono.
 * 2. **No heredan el color.** Un emoji sale siempre del mismo color, así que
 *    en el tema de alto contraste seguían en gris y amarillo pastel: justo lo
 *    que no ve quien necesita ese tema.
 * 3. **Ruido visual.** Cinco emojis de colores en una barra son cinco cosas
 *    compitiendo por la atención.
 *
 * Estos son de trazo, `currentColor` y un solo grosor. Se tiñen con el tema,
 * se leen a cualquier tamaño y desaparecen del camino.
 *
 * Rejilla de 24, trazo de 1.6: lo bastante fino para parecer de sistema, lo
 * bastante grueso para verse en una pantalla al sol.
 */

export type IconName =
  | 'salat'
  | 'qibla'
  | 'places'
  | 'food'
  | 'khutbah'
  | 'guide'
  | 'settings'
  | 'location'
  | 'share'
  | 'search'
  | 'camera'
  | 'speech'
  | 'clear'
  | 'stop'
  | 'listen'
  | 'broadcast'
  | 'join';

const PATHS: Record<IconName, string> = {
  // Arco de mihrab: la firma visual de la app, ya reducida a una línea.
  salat: 'M6 21V11a6 6 0 0 1 12 0v10M3 21h18M12 5V3',
  // Aguja de brújula.
  qibla: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM15.5 8.5l-2 5-5 2 2-5 5-2Z',
  places: 'M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  // Plato con cubiertos: comida, no un emoji de restaurante.
  food: 'M4 3v8a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M6 13v8M17 3c-1.7 0-3 2.2-3 5s1.3 4 3 4 3-1.2 3-4-1.3-5-3-5ZM17 12v9',
  // Micrófono.
  khutbah: 'M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3ZM19 11a7 7 0 0 1-14 0M12 18v3M9 21h6',
  guide: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5ZM4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5A2.5 2.5 0 0 1 4 20.5Z',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.8 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.5 1Z',
  location: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3M12 19v3M2 12h3M19 12h3',
  share: 'M12 16V3M8 7l4-4 4 4M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3',
  camera:
    'M3 8.5A2.5 2.5 0 0 1 5.5 6h1.9l1.2-2h6.8l1.2 2h1.9A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-9ZM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  // Bocadillo: la tarjeta que se le enseña al camarero.
  speech: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4V6Z',
  clear: 'M6 6l12 12M18 6L6 18',
  stop: 'M7 7h10v10H7z',
  listen: 'M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3ZM19 11a7 7 0 0 1-14 0M12 18v3',
  // Ondas saliendo: transmitir a la sala.
  broadcast: 'M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7.8 7.8a6 6 0 0 0 0 8.4M16.2 16.2a6 6 0 0 0 0-8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 19.1a10 10 0 0 0 0-14.2',
  // Auricular: unirse a una sala.
  join: 'M4 14v-2a8 8 0 0 1 16 0v2M4 14a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2v-2ZM20 14a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2v-2Z',
};

/**
 * Devuelve el SVG del icono. `size` en píxeles; hereda el color del texto.
 *
 * `aria-hidden` porque estos iconos siempre van acompañados de su etiqueta:
 * anunciarlos otra vez sería repetir la palabra a quien usa un lector.
 */
export function icon(name: IconName, size = 24): string {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" focusable="false"><path d="${PATHS[name]}"/></svg>`;
}
