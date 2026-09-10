/**
 * Modo pantalla: la traducción proyectada para toda la sala.
 *
 * Sale de mirar cómo lo resuelven las apps de pago que ya existen: además de
 * que cada fiel siga el sermón en su móvil, las mezquitas quieren **una
 * pantalla grande** donde se lea desde el fondo de la sala. Sirve para quien
 * no trae teléfono, para quien no sabe instalarlo, y para el que llega tarde.
 *
 * Decisiones que vienen de cómo es una mezquita de verdad, no de cómo queda
 * bonito en una captura:
 *
 * - **Una sola frase, enorme.** Un historial en pantalla obliga a buscar
 *   dónde va la lectura. La última frase, centrada y grande, no.
 * - **Fondo oscuro y sólido.** Se proyecta sobre pared o televisión, muchas
 *   veces con la luz encendida. Ni cristal ni degradados: contraste puro.
 * - **El código de la sala siempre visible.** Quien llega tarde entra desde
 *   su móvil sin preguntarle a nadie.
 * - **La pantalla no se apaga.** Un sermón dura veinte minutos y nadie va a
 *   estar tocando la tele.
 */
import { t } from '../../i18n';
import { qrSvg } from './qr';
import { disableFridayMode, enableFridayMode } from './wakelock';

let overlay: HTMLElement | null = null;

export function screenModeOpen(): boolean {
  return overlay !== null;
}

/**
 * Abre la proyección. Devuelve la función que actualiza el texto, para que
 * la pantalla de la jutba no tenga que conocer el interior de este módulo.
 */
export function openScreenMode(roomCode: string, onClose: () => void): (text: string) => void {
  close();

  const url = roomCode
    ? `${location.origin}${location.pathname}?room=${encodeURIComponent(roomCode)}`
    : '';

  overlay = document.createElement('div');
  overlay.className = 'screen-mode';
  overlay.innerHTML = `
    <button class="screen-exit" aria-label="${t('screenExit')}">${t('screenExit')}</button>
    <p class="screen-caption" aria-live="polite">${t('screenWaiting')}</p>
    ${
      url
        ? `<div class="screen-join">
             ${qrSvg(url, t('roomQrLabel'))}
             <p class="screen-room">${roomCode}</p>
           </div>`
        : ''
    }
  `;

  const salir = (): void => {
    close();
    onClose();
  };

  overlay.querySelector<HTMLButtonElement>('.screen-exit')!.addEventListener('click', salir);
  document.addEventListener('keydown', onKey);
  function onKey(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') {
      document.removeEventListener('keydown', onKey);
      salir();
    }
  }

  document.body.appendChild(overlay);
  void enableFridayMode();
  // Pantalla completa si el navegador deja; si no, la superposición ya ocupa
  // todo y funciona igual. Nunca se insiste: un fallo aquí no puede impedir
  // que la jutba se proyecte.
  void document.documentElement.requestFullscreen?.().catch(() => {});

  const caption = overlay.querySelector<HTMLElement>('.screen-caption')!;
  return (text: string) => {
    if (text.trim()) caption.textContent = text;
  };
}

export function closeScreenMode(): void {
  close();
}

function close(): void {
  if (!overlay) return;
  overlay.remove();
  overlay = null;
  void disableFridayMode();
  if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
}
