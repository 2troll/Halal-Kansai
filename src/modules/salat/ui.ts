import { computePrayerTimes, formatTime, type AsrSchool, type Coordinates, type MethodId, type PrayerTimes } from './calculator';
import {
  METHOD_IDS,
  SCHOOLS,
  currentMethod,
  getMethodId,
  getSchool,
  methodLabel,
  methodSummary,
  schoolLabel,
  setMethod,
  timezoneHours,
} from './settings';
import { fastingCountdown } from '../ramadan/fasting';
import { getLang, t, type Lang } from '../../i18n';
import { icon } from '../../ui/icons';
import { updatePrayerWidget } from '../../native/widget';
import { isNative } from '../../backend';
import {
  cancelPrayerNotifications,
  notificationsEnabled,
  schedulePrayerNotifications,
  setNotificationsEnabled,
} from '../../native';

const OSAKA: Coordinates = { lat: 34.6937, lng: 135.5023 };
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
    timezoneHours(now),
    currentMethod(),
  );
  const next = nextPrayerOf(times, now);
  const h = Math.floor(next.minutesLeft / 60);
  const m = next.minutesLeft % 60;
  const countdown = formatCountdown(h, m, getLang());

  // El widget de la pantalla de inicio se alimenta de este mismo cálculo.
  void updatePrayerWidget(t(next.name), formatTime(times[next.name]), t('city'));

  container.innerHTML = `
    <h2>${t('salatTitle')}</h2>
    <p class="subtitle">${methodSummary()}</p>
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
    ${fastingCardHtml(now, coords)}
    ${
      isNative()
        ? `<label class="notify-row">
             <input type="checkbox" id="chk-notify" ${notificationsEnabled() ? 'checked' : ''} />
             <span>${icon('salat', 19)}${t('notifyPrayers')}</span>
           </label>`
        : ''
    }
    <details class="salat-settings">
      <summary>${icon('settings', 17)}${t('calcSettings')}</summary>
      <label>${t('calcSettings')}
        <select id="sel-method">
          ${METHOD_IDS.map((id) => `<option value="${id}" ${id === getMethodId() ? 'selected' : ''}>${methodLabel(id)}</option>`).join('')}
        </select>
      </label>
      <label>${t('asrSchool')}
        <select id="sel-asr">
          ${SCHOOLS.map((s) => `<option value="${s}" ${s === getSchool() ? 'selected' : ''}>${schoolLabel(s)}</option>`).join('')}
        </select>
      </label>
      <p class="note">${t('calcHint')}</p>
    </details>
    <div class="btn-row">
      <button class="btn" id="btn-locate">${icon('location', 19)}${t('useMyLocation')}</button>
      <button class="btn ghost" id="btn-share">${icon('share', 19)}${t('shareTimes')}</button>
    </div>
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

  // Cambiar de método reprograma también los avisos y el widget: si no,
  // sonarían a la hora del método anterior.
  const selMethod = container.querySelector<HTMLSelectElement>('#sel-method')!;
  const selAsr = container.querySelector<HTMLSelectElement>('#sel-asr')!;
  const onMethodChange = async (): Promise<void> => {
    setMethod(selMethod.value as MethodId, selAsr.value as AsrSchool);
    renderSalat(container);
    container.querySelector<HTMLDetailsElement>('.salat-settings')!.open = true;
    if (notificationsEnabled()) await rescheduleNotifications();
  };
  selMethod.addEventListener('change', () => void onMethodChange());
  selAsr.addEventListener('change', () => void onMethodChange());

  const chk = container.querySelector<HTMLInputElement>('#chk-notify');
  chk?.addEventListener('change', async () => {
    setNotificationsEnabled(chk.checked);
    if (chk.checked) await rescheduleNotifications();
    else await cancelPrayerNotifications();
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

/**
 * La cuenta atrás, en el idioma de quien mira.
 *
 * Dos cosas que no se pueden hacer con «h» y «min» y ya está:
 *
 * - El japonés no usa abreviaturas latinas: es 8時間35分.
 * - En árabe, además de estar sin traducir, el sentido de escritura le daba
 *   la vuelta al orden y se leía «بعد 5 min 20 h»: primero los minutos y
 *   después las horas. Con las palabras en árabe el problema desaparece,
 *   porque ya no hay un trozo latino suelto dentro de un texto de derecha a
 *   izquierda.
 */
function formatCountdown(h: number, m: number, lang: Lang): string {
  if (lang === 'ja') return h > 0 ? `${h}時間${m}分` : `${m}分`;
  if (lang === 'ar') return h > 0 ? `${h} ساعة و${m} دقيقة` : `${m} دقيقة`;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

/**
 * Suhur hasta el fajr, iftar en el maghrib, con la cuenta atrás de lo que toca.
 *
 * Sin fecha hégira a propósito (ver ramadan/fasting.ts): sirve igual para
 * Ramadán que para los ayunos voluntarios, y no finge saber cuándo empieza
 * el mes. Va plegada: a quien no ayuna no le ocupa la pantalla.
 */
function fastingCardHtml(now: Date, coords: Coordinates): string {
  const date = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  // Con el método elegido, para que el suhur y el iftar coincidan con el
  // fajr y el maghrib de la lista de arriba.
  const times = computePrayerTimes(date, coords, timezoneHours(now), currentMethod());
  const day = {
    date,
    imsak: times.fajr,
    iftar: times.maghrib,
    durationMinutes: Math.round((times.maghrib - times.fajr) * 60),
  };
  const c = fastingCountdown(day, now.getHours() + now.getMinutes() / 60);
  const left = formatCountdown(Math.floor(c.minutesRemaining / 60), c.minutesRemaining % 60, getLang());
  return `
    <details class="fast-card">
      <summary>
        <span>${t('fastTitle')}</span>
        <span class="fast-times">${t('fastSuhoor')} <b>${formatTime(day.imsak)}</b> · ${t('fastIftar')} <b>${formatTime(day.iftar)}</b></span>
      </summary>
      <p class="fast-left">${c.phase === 'fasting' ? t('fastToIftar') : t('fastToSuhoor')}: <b>${left}</b></p>
    </details>`;
}

export function getCoords(): Coordinates {
  return loadCoords();
}

/**
 * Reprograma los avisos de los próximos 7 días.
 *
 * Siete y no más porque iOS limita a 64 avisos pendientes por app: 5 rezos ×
 * 7 días = 35, con margen de sobra. Se vuelve a llamar cada vez que la app
 * pasa a primer plano, así que la ventana se renueva sola.
 */
export async function rescheduleNotifications(): Promise<void> {
  const coords = loadCoords();
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    return {
      date,
      times: computePrayerTimes(
        { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() },
        coords,
        timezoneHours(date),
        currentMethod(),
      ),
    };
  });
  await schedulePrayerNotifications(days);
}
