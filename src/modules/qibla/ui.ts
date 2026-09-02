import { distanceToKaabaKm, qiblaBearing } from './qibla';
import { getCoords } from '../salat/ui';
import { t } from '../../i18n';

/** Evento webkit de iOS con rumbo de brújula real. */
interface WebkitOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

type IOSPermissionAPI = {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

let listening = false;

export function renderQibla(container: HTMLElement): void {
  const { lat, lng } = getCoords();
  const bearing = qiblaBearing(lat, lng);
  const distance = Math.round(distanceToKaabaKm(lat, lng));

  container.innerHTML = `
    <h2>${t('qiblaTitle')}</h2>
    <p class="subtitle">${distance.toLocaleString()} km ${t('qiblaDistance')}</p>
    <div class="compass-wrap" id="compass">
      <div class="compass-dial" id="dial">
        <span class="cardinal" style="top:6px">N</span>
        <span class="cardinal" style="bottom:6px">S</span>
        <span class="compass-kaaba" id="kaaba-mark"
          style="transform: rotate(${bearing}deg) translateY(-104px) rotate(${-bearing}deg)">🕋</span>
      </div>
      <div class="compass-needle" id="needle" style="transform: rotate(${bearing}deg)"></div>
    </div>
    <p class="qibla-readout">${bearing.toFixed(1)}° <span style="font-size:.8rem">${t('qiblaFromNorth')}</span></p>
    <div style="text-align:center">
      <button class="btn" id="btn-compass">🧭 ${t('compassStart')}</button>
      <p class="note" id="qibla-note">${t('compassHint')}</p>
    </div>
  `;

  const dial = container.querySelector<HTMLElement>('#dial')!;
  const needle = container.querySelector<HTMLElement>('#needle')!;
  const wrap = container.querySelector<HTMLElement>('#compass')!;
  const note = container.querySelector<HTMLElement>('#qibla-note')!;

  const onOrientation = (ev: DeviceOrientationEvent) => {
    const webkit = (ev as WebkitOrientationEvent).webkitCompassHeading;
    // iOS expone el rumbo directamente; en Android alpha es antihorario desde el norte.
    const heading = webkit !== undefined ? webkit : ev.alpha !== null ? 360 - ev.alpha : null;
    if (heading === null) return;
    // La esfera gira con el norte; la aguja marca la qibla relativa a la pantalla.
    dial.style.transform = `rotate(${-heading}deg)`;
    needle.style.transform = `rotate(${bearing - heading}deg)`;
    const diff = Math.abs(((bearing - heading + 540) % 360) - 180);
    wrap.classList.toggle('aligned', diff < 5);
    note.textContent = diff < 5 ? `✅ ${t('qiblaAligned')}` : t('compassHint');
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
    if (!listening) {
      // 'deviceorientationabsolute' da norte verdadero en Android cuando existe.
      const evName =
        'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
      window.addEventListener(evName, onOrientation as EventListener);
      listening = true;
    }
  });
}
