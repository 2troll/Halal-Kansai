/**
 * Código QR de la sala, dibujado en el propio móvil.
 *
 * El problema real de una mezquita: quien transmite tiene que darle el código
 * de la sala a doscientas personas y que cada una lo teclee bien. Con un QR en
 * una pantalla, cada uno apunta la cámara y entra, ya en su idioma.
 *
 * Nota sobre cómo se llegó aquí, porque es la lección del módulo: primero se
 * escribió el codificador a mano para no añadir dependencias. Pasaba todos los
 * tests de estructura —patrones de posición, sincronización, tamaños— y aun
 * así **ningún lector conseguía leerlo**: se comprobó decodificando el SVG
 * generado con BarcodeDetector del navegador. Un QR que no se lee es peor que
 * no tener QR, y el fallo solo habría aparecido el viernes, delante de la
 * comunidad. Se cambió por un codificador probado (MIT, sin dependencias, ~14
 * KB) y se volvió a verificar decodificando de verdad.
 *
 * Se mantiene propio el dibujado en SVG: escala sin pixelarse en una pantalla
 * grande y no necesita canvas.
 *
 * Nada sale del dispositivo: el QR se genera aquí, no en un servicio ajeno al
 * que habría que mandarle el nombre de la sala de la mezquita.
 */
import qrcode from 'qrcode-generator';

/**
 * Matriz de módulos (true = negro).
 *
 * Tipo 0 = versión automática, la más pequeña en la que quepa el texto.
 * Corrección L: la más baja, que deja más sitio para datos y basta de sobra
 * para una pantalla limpia a un metro. En papel arrugado convendría M.
 */
export function encodeQr(text: string): boolean[][] {
  const qr = qrcode(0, 'L');
  qr.addData(text);
  qr.make();

  const size = qr.getModuleCount();
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => qr.isDark(row, col)),
  );
}

/**
 * El QR como SVG listo para insertar.
 *
 * Fondo blanco fijo y margen de 4 módulos: son requisitos del formato, no
 * decoración. Un QR sobre fondo oscuro o sin margen no lo lee ninguna cámara,
 * y esta app tiene temas oscuros.
 */
export function qrSvg(text: string, label: string): string {
  const matrix = encodeQr(text);
  const size = matrix.length;
  const quiet = 4;
  const total = size + quiet * 2;

  const rects = matrix
    .flatMap((row, y) =>
      row.map((on, x) =>
        on ? `<rect x="${x + quiet}" y="${y + quiet}" width="1" height="1"/>` : '',
      ),
    )
    .join('');

  return `<svg viewBox="0 0 ${total} ${total}" role="img" aria-label="${label}"
    xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
    <rect width="${total}" height="${total}" fill="#ffffff"/>
    <g fill="#000000">${rects}</g>
  </svg>`;
}
