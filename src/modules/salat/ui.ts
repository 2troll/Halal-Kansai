import { computePrayerTimes, formatTime, type Coordinates, type PrayerTimes } from './calculator';
import { t } from '../../i18n';

const OSAKA: Coordinates = { lat: 34.6937, lng: 135.5023 };
const JST = 9;
const STORAGE_KEY = 'hk-coords';

const ORDER: Array<keyof PrayerTimes> = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

function loadCoords(): Coordinates {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const c = JSON.parse(raw) as Coordinates;
      if (Number.isFinite(c.lat) && Number.isFinite(c.lng)) return c;
    }
  } catch {
    /* coordenadas corruptas: usar Osaka */
  }
  return OSAKA;
}

function nextPrayerOf(times: PrayerTimes, now: Date): { name: keyof PrayerTimes; minutesLeft: number } {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const name of ORDER) {
    if (name === 'sunrise') continue; // el amanecer no es oración
    const tMin = Math.round(times[name] * 60);
    if (tMin > nowMin) return { name, minutesLeft: tMin - nowMin };
  }
  // Pasada Isha: la próxima es Fajr de mañana.
  return { name: 'fajr', minutesLeft: 24 * 60 - nowMin + Math.round(times.fajr * 60) };
}

export function renderSalat(container: HTMLElement): void {
  const coords = loadCoords();
  const now = new Date();
  const times = computePrayerTimes(
    { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() },
    coords,
    JST,
  );
  const next = nextPrayerOf(times, now);
  const h = Math.floor(next.minutesLeft / 60);
  const m = next.minutesLeft % 60;
  const countdown = h > 0 ? `${h} h ${m} min` : `${m} min`;

  container.innerHTML = `
    <h2>${t('salatTitle')}</h2>
    <p class="subtitle">${t('salatMethod')}</p>
    <div class="mihrab-card">
      <div class="label">${t('nextPrayer')}</div>
      <div class="big">${t(next.name)}</div>
      <div class="small">${formatTime(times[next.name])} · ${t('inTime')} ${countdown}</div>
    </div>
    <ul class="times-list">
      ${ORDER.map(
        (name) => `
        <li class="${name === next.name ? 'next' : ''}">
          <span>${t(name)}</span>
          <span class="t">${formatTime(times[name])}</span>
        </li>`,
      ).join('')}
    </ul>
    <button class="btn" id="btn-locate">📍 ${t('useMyLocation')}</button>
    <button class="btn" id="btn-share">📤 ${t('shareTimes')}</button>
    <p class="note" id="salat-note"></p>
  `;

  container.querySelector<HTMLButtonElement>('#btn-share')!.addEventListener('click', async () => {
    const { shareTimesImage } = await import('./share');
    try {
      await shareTimesImage(times, now);
    } catch {
      container.querySelector('#salat-note')!.textContent = t('shareError');
    }
  });

  container.querySelector<HTMLButtonElement>('#btn-locate')!.addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        );
        renderSalat(container);
      },
      () => {
        container.querySelector('#salat-note')!.textContent = t('locationDenied');
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  });
}

export function getCoords(): Coordinates {
  return loadCoords();
}
