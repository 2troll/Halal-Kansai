/**
 * Escapar lo que va a pintarse como HTML.
 *
 * El texto de las tarjetas del sermón NO es nuestro. Viene de tres sitios, y
 * ninguno es de fiar:
 *  - lo que Whisper entiende del micrófono,
 *  - lo que devuelve el traductor (ML Kit o el servidor),
 *  - y en **modo sala**, del WebSocket: o sea, de OTRO teléfono.
 *
 * Las tarjetas se pintan con `insertAdjacentHTML`. Sin escapar, un simple `<`
 * en la transcripción rompía la tarjeta, y en una sala cualquiera que tuviese
 * el código podía meter HTML —o un script— en la pantalla de todos los que
 * estuvieran siguiendo la jutba. En una app que va a las tiendas y se usa en
 * una mezquita llena, eso no puede quedarse así.
 *
 * Se escapan los cinco caracteres de siempre. El `&` va primero: si fuera
 * después, volvería a escapar los `&` que acaban de introducir los otros.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Lo mismo, pero tolerando que no llegue una cadena.
 *
 * En modo sala el segmento llega del WebSocket y se convierte con `as`, sin
 * comprobar nada: cualquier campo puede venir ausente, ser un número o un
 * objeto. Antes eso acababa pintando «undefined» o «[object Object]» en mitad
 * del sermón.
 */
export function safeText(value: unknown): string {
  if (typeof value === 'string') return escapeHtml(value);
  if (typeof value === 'number' && Number.isFinite(value)) return escapeHtml(String(value));
  return '';
}
