import { distanceToKaabaKm, qiblaBearing } from './qibla';
import { getCoords } from '../salat/ui';
import { t } from '../../i18n';
import { icon } from '../../ui/icons';
import { isNative } from '../../backend';

/** Evento webkit de iOS con rumbo de brújula real. */
interface WebkitOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

type IOSPermissionAPI = {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

/** Margen para dar la qibla por alineada, en grados. */
const ALIGNED_DEG = 5;

/**
 * El manejador del sensor que está activo, con el nombre de su evento.
 *
 * Antes era un booleano `listening` de módulo: el sensor se registraba una
 * vez, atado a la esfera de la PRIMERA pantalla. Al salir de la pestaña y
 * volver se pintaba una esfera nueva, pero el sensor seguía moviendo la
 * vieja, ya fuera del documento: la brújula se quedaba quieta. Ahora cada
 * pantalla quita el suyo antes de poner otro.
 */
let active: { event: string; handler: EventListener } | null = null;

/** Apaga el sensor (al cambiar de pestaña: no gastar batería de fondo). */
export function stopCompass(): void {
  if (!active) return;
  window.removeEventListener(active.event, active.handler);
  active = null;
}

/** Esfera en SVG: marcas cada 5°, números cada 30°, cardinales y la qibla. */
function dialSvg(bearing: number): string {
  const C = 150;
  const R = 138;
  const ticks: string[] = [];
  for (let d = 0; d < 360; d += 5) {
    const len = d % 30 === 0 ? 14 : d % 10 === 0 ? 9 : 5;
    const cls = d % 30 === 0 ? 'tick major' : 'tick';
    ticks.push(
      `<line class="${cls}" x1="${C}" y1="${C - R}" x2="${C}" y2="${C - R + len}" transform="rotate(${d} ${C} ${C})"/>`,
    );
  }
  const cardinals = [
    ['N', 0],
    ['E', 90],
    ['S', 180],
    ['W', 270],
  ]
    .map(
      ([label, d]) =>
        `<text class="cardinal ${label === 'N' ? 'north' : ''}" x="${C}" y="${C - R + 34}" transform="rotate(${d} ${C} ${C})">${label}</text>`,
    )
    .join('');
  // Arco dorado de ±8° alrededor de la qibla, sobre el borde.
  const arc = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return `${(C + R * Math.cos(rad)).toFixed(2)} ${(C + R * Math.sin(rad)).toFixed(2)}`;
  };
  return `
    <svg class="dial-svg" viewBox="0 0 300 300" aria-hidden="true">
      <circle class="dial-face" cx="${C}" cy="${C}" r="${R + 8}"/>
      ${ticks.join('')}
      ${cardinals}
      <path class="qibla-arc" d="M ${arc(bearing - 8)} A ${R} ${R} 0 0 1 ${arc(bearing + 8)}"/>
      <g transform="rotate(${bearing} ${C} ${C})">
        <text class="kaaba" x="${C}" y="${C - R + 60}">🕋</text>
      </g>
    </svg>`;
}

export function renderQibla(container: HTMLElement): void {
  stopCompass();
  const { lat, lng } = getCoords();
  const bearing = qiblaBearing(lat, lng);
  const distance = Math.round(distanceToKaabaKm(lat, lng));

  container.innerHTML = `
    <h2>${t('qiblaTitle')}</h2>
    <p class="subtitle">${distance.toLocaleString()} km ${t('qiblaDistance')}</p>
    <div class="compass" id="compass">
      <div class="compass-dial" id="dial">${dialSvg(bearing)}</div>
      <div class="compass-needle" id="needle" style="transform: rotate(${bearing}deg)">
        <svg viewBox="0 0 40 150" aria-hidden="true">
          <path class="needle-head" d="M20 0 L34 40 L20 32 L6 40 Z"/>
          <rect class="needle-body" x="17" y="30" width="6" height="90" rx="3"/>
        </svg>
      </div>
      <div class="compass-hub"></div>
    </div>
    <div class="qibla-card">
      <div>
        <div class="qibla-deg">${bearing.toFixed(1)}°</div>
        <div class="note">${t('qiblaFromNorth')}</div>
      </div>
      <div class="qibla-turn" id="qibla-turn" aria-live="polite"></div>
    </div>
    <div class="qibla-actions">
      <button class="btn" id="btn-compass">${icon('qibla', 19)}${t('compassStart')}</button>
      <p class="note" id="qibla-note">${t('compassHint')}</p>
    </div>
  `;

  const dial = container.querySelector<HTMLElement>('#dial')!;
  const needle = container.querySelector<HTMLElement>('#needle')!;
  const wrap = container.querySelector<HTMLElement>('#compass')!;
  const note = container.querySelector<HTMLElement>('#qibla-note')!;
  const turn = container.querySelector<HTMLElement>('#qibla-turn')!;
  let wasAligned = false;

  const onOrientation = (ev: DeviceOrientationEvent) => {
    const webkit = (ev as WebkitOrientationEvent).webkitCompassHeading;
    // iOS expone el rumbo directamente; en Android alpha es antihorario desde el norte.
    const heading = webkit !== undefined ? webkit : ev.alpha !== null ? 360 - ev.alpha : null;
    if (heading === null) return;
    // La esfera gira con el norte; la aguja marca la qibla relativa a la pantalla.
    dial.style.transform = `rotate(${-heading}deg)`;
    needle.style.transform = `rotate(${bearing - heading}deg)`;
    // Diferencia con signo: positiva = la qibla queda a la derecha.
    const signed = ((bearing - heading + 540) % 360) - 180;
    const aligned = Math.abs(signed) < ALIGNED_DEG;
    wrap.classList.toggle('aligned', aligned);
    note.textContent = aligned ? `✅ ${t('qiblaAligned')}` : t('compassHint');
    // Sin palabras a propósito: una flecha y los grados se leen en los once idiomas.
    turn.textContent = aligned ? '🕋' : signed > 0 ? `${Math.round(signed)}° →` : `← ${Math.round(-signed)}°`;
    if (aligned && !wasAligned) void buzz();
    wasAligned = aligned;
  };

  container.querySelector<HTMLButtonElement>('#btn-compass')!.addEventListener('click', async () => {
    if (!('DeviceOrientationEvent' in window)) {
      note.textContent = t('compassUnsupported');
      return;
    }
    // iOS 13+ exige permiso explícito mediante gesto del usuario.
    const api = DeviceOrientationEvent as unknown as IOSPermissionAPI;
    if (typeof api.requestPermission === 'function') {
      try {
        const result = await api.requestPermission();
        if (result !== 'granted') {
          note.textContent = t('compassPermissionDenied');
          return;
        }
      } catch {
        note.textContent = t('compassPermissionDenied');
        return;
      }
    }
    stopCompass();
    // 'deviceorientationabsolute' da norte verdadero en Android cuando existe.
    const event = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    active = { event, handler: onOrientation as EventListener };
    window.addEventListener(event, active.handler);
  });
}

/** Una vibración corta al quedar alineado: se nota sin mirar la pantalla. */
async function buzz(): Promise<void> {
  try {
    if (isNative()) {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else {
      navigator.vibrate?.(40);
    }
  } catch {
    /* sin vibración no pasa nada */
  }
}
