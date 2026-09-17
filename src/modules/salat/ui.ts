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
import { FARD, currentPrayerOf, hijriDate, loadPrayed, prayerDate, togglePrayed } from './today';
import { PLACES } from '../places/data';
import { directionsUrl } from '../places/directions';
import { escapeHtml } from '../escape';
import { getLang, t, type Lang } from '../../i18n';
import { icon } from '../../ui/icons';
import { updatePrayerWidget } from '../../native/widget';
import { isNative } from '../../backend';
import {
  NOTIFY_CHOICES,
  cancelPrayerNotifications,
  mutedPrayers,
  notificationsEnabled,
  toggleMuted,
  type NotifyChoice,
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
  const current = currentPrayerOf(times, now);
  const isPrayed = (name: string) => loadPrayed(prayerDate(name, times, now)).has(name);
  const hijri = hijriDate(now, getLang());

  // El widget de la pantalla de inicio se alimenta de este mismo cálculo.
  void updatePrayerWidget(t(next.name), formatTime(times[next.name]), t('city'));

  container.innerHTML = `
    <h2>${t('salatTitle')}</h2>
    <p class="subtitle">${hijri ? `${escapeHtml(hijri)} · ` : ''}${methodSummary()}</p>
    <div class="mihrab-card">
      <div class="label">${t('nextPrayer')}</div>
      <div class="big">${t(next.name)}</div>
      <div class="small">${formatTime(times[next.name])} · ${withInTime(countdown)}</div>
    </div>
    <ul class="times-list">
      ${ORDER.map(
        (name) => `
        <li class="${name === next.name ? 'next' : ''}${name === current ? ' current' : ''}">
          ${
            FARD.includes(name)
              ? `<button class="prayed-mark" type="button" data-prayer="${name}" aria-pressed="${String(isPrayed(name))}" aria-label="${t('markPrayed')}: ${t(name)}"></button>`
              : '<span class="prayed-spacer" aria-hidden="true"></span>'
          }
          <span class="name">${t(name)}</span>
          ${name === current ? `<span class="pill now">${t('salatNow')}</span>` : ''}
          ${name === next.name ? `<span class="pill soon">${withInTime(countdown)}</span>` : ''}
          <span class="t">${formatTime(times[name])}</span>
        </li>`,
      ).join('')}
    </ul>
    ${fastingCardHtml(now, coords)}
    ${nearestPlaceHtml(coords)}
    ${weekTableHtml(now, coords)}
    ${
      isNative()
        ? `<label class="notify-row">
             <input type="checkbox" id="chk-notify" ${notificationsEnabled() ? 'checked' : ''} />
             <span>${icon('salat', 19)}${t('notifyPrayers')}</span>
           </label>
           <div class="notify-which" role="group" aria-label="${t('notifyPrayers')}" ${notificationsEnabled() ? '' : 'hidden'}>
             ${NOTIFY_CHOICES.map(
               (c) =>
                 `<button type="button" class="notify-chip" data-choice="${c}" aria-pressed="${String(!mutedPrayers().has(c))}">${t(c)}</button>`,
             ).join('')}
           </div>`
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

  container.querySelectorAll<HTMLButtonElement>('.prayed-mark').forEach((btn) => {
    btn.addEventListener('click', () => {
      // La fecha de cuando se pintó la lista, no la de ahora: si la pestaña
      // sigue abierta pasada la medianoche, el botón y lo guardado coinciden.
      const name = btn.dataset.prayer!;
      const set = togglePrayed(prayerDate(name, times, now), name);
      btn.setAttribute('aria-pressed', String(set.has(name)));
      if (set.size === FARD.length) navigator.vibrate?.(30);
    });
  });

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
  const which = container.querySelector<HTMLElement>('.notify-which');
  which?.querySelectorAll<HTMLButtonElement>('.notify-chip').forEach((b) =>
    b.addEventListener('click', async () => {
      const muted = toggleMuted(b.dataset.choice as NotifyChoice);
      b.setAttribute('aria-pressed', String(!muted.has(b.dataset.choice as NotifyChoice)));
      await rescheduleNotifications();
    }),
  );
  chk?.addEventListener('change', async () => {
    setNotificationsEnabled(chk.checked);
    if (which) which.hidden = !chk.checked;
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
/**
 * «en 2 h 5 min». En urdu, bengalí, turco y nepalí la palabra va DETRÁS
 * («2 h 5 min kalan»): delante se lee al revés. Lo señalaron las cuatro
 * traducciones por separado.
 */
const IN_TIME_AFTER: ReadonlySet<Lang> = new Set(['ur', 'bn', 'tr', 'ne', 'hi', 'ko', 'si', 'my']);

function withInTime(countdown: string): string {
  return IN_TIME_AFTER.has(getLang()) ? `${countdown} ${t('inTime')}` : `${t('inTime')} ${countdown}`;
}

/** Unidades en la escritura de cada idioma: [horas, minutos]. */
const UNITS: Partial<Record<Lang, [string, string]>> = {
  // En urdu, con «h» y «min» latinos, el sentido de escritura dejaba
  // «باقی min 36»: el mismo fallo que ya se vio en árabe.
  ur: ['گھنٹے', 'منٹ'],
  bn: ['ঘণ্টা', 'মিনিট'],
  ne: ['घण्टा', 'मिनेट'],
  id: ['jam', 'menit'],
  ms: ['jam', 'minit'],
  tr: ['sa', 'dk'],
  vi: ['giờ', 'phút'],
  hi: ['घंटे', 'मिनट'],
  si: ['පැය', 'මිනිත්තු'],
  my: ['နာရီ', 'မိနစ်'],
  th: ['ชม.', 'นาที'],
  fil: ['oras', 'min'],
  pt: ['h', 'min'],
};

function formatCountdown(h: number, m: number, lang: Lang): string {
  if (lang === 'ja') return h > 0 ? `${h}時間${m}分` : `${m}分`;
  if (lang === 'zh') return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`;
  if (lang === 'ko') return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
  if (lang === 'ar') return h > 0 ? `${h} ساعة و${m} دقيقة` : `${m} دقيقة`;
  const [hu, mu] = UNITS[lang] ?? ['h', 'min'];
  return h > 0 ? `${h} ${hu} ${m} ${mu}` : `${m} ${mu}`;
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

/**
 * La mezquita o sala de oración con coordenadas más cercana, con su ruta.
 * Sale de los datos de la app, sin red: justo lo que hace falta cuando entra
 * la hora del rezo fuera de casa.
 */
function nearestOf(coords: Coordinates, types: ReadonlyArray<string>): { p: (typeof PLACES)[number]; d: number } | undefined {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const km = (lat: number, lng: number) => {
    const x =
      Math.sin(rad(lat - coords.lat) / 2) ** 2 +
      Math.cos(rad(coords.lat)) * Math.cos(rad(lat)) * Math.sin(rad(lng - coords.lng) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  };
  return PLACES.filter((p) => types.includes(p.type) && p.lat !== undefined)
    .map((p) => ({ p, d: km(p.lat!, p.lng!) }))
    .sort((a, b) => a.d - b.d)[0];
}

function nearestPlaceHtml(coords: Coordinates): string {
  const best = nearestOf(coords, ['mosque', 'prayer']);
  if (!best) return '';
  const { p, d } = best;
  return `
    <a class="nearest-card" href="${directionsUrl(p.lat!, p.lng!)}" target="_blank" rel="noopener">
      <span class="nearest-icon" aria-hidden="true">${icon(p.type === 'mosque' ? 'salat' : 'prayer', 22)}</span>
      <span class="nearest-body">
        <span class="eyebrow">${t('nearestTitle')}</span>
        <strong>${escapeHtml(p.name)}</strong>
        <span class="note">${escapeHtml(p.city)} · ${d < 10 ? d.toFixed(1) : Math.round(d)} ${t('kmAway')}</span>
      </span>
      <span class="nearest-go" aria-hidden="true">${icon('location', 20)}</span>
    </a>`;
}

/** Horario de los próximos 7 días, plegado: para planear la semana o imprimirlo. */
function weekTableHtml(now: Date, coords: Coordinates): string {
  const cols: Array<keyof PrayerTimes> = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const locale = getLang() === 'ar' || getLang() === 'ur' ? 'en' : getLang();
  const rows = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const times = computePrayerTimes(
      { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() },
      coords,
      timezoneHours(d),
      currentMethod(),
    );
    const label = i === 0 ? t('today') : d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' });
    return `<tr${i === 0 ? ' class="today"' : ''}><th scope="row">${label}</th>${cols
      .map((c) => `<td>${formatTime(times[c])}</td>`)
      .join('')}</tr>`;
  }).join('');
  return `
    <details class="week-card">
      <summary>${t('weekTitle')}</summary>
      <div class="week-scroll" dir="ltr">
        <table class="week-table">
          <thead><tr><th></th>${cols.map((c) => `<th scope="col">${t(c)}</th>`).join('')}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
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
  // El jumu'ah es en mezquita, no en una sala de oración.
  await schedulePrayerNotifications(days, nearestOf(coords, ['mosque'])?.p.name);
}
