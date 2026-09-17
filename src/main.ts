import './styles/main.css';
import './styles/themes.css';
import './styles/refined.css';
import './styles/modern.css';
import { LANGS, applyDirection, getLang, onLangChange, setLang, t, type Lang } from './i18n';
import { applyAppearance, openAppearanceSheet } from './modules/appearance';
import { icon, type IconName } from './ui/icons';

/** Etiqueta del botón: sigla, salvo el japonés, que se lee de un vistazo. */
/**
 * El idioma va en un selector compacto junto a los ajustes, no en una fila de
 * cuatro botones: esa fila hacía que la cabecera ocupara casi un cuarto de la
 * pantalla en todas las pestañas. En la lista, cada idioma en su propia
 * lengua, para que lo encuentre quien no lee la actual.
 */
const LANG_LABEL: Record<Lang, string> = {
  en: 'English',
  ja: '日本語',
  ar: 'العربية',
  id: 'Bahasa Indonesia',
  ur: 'اردو',
  bn: 'বাংলা',
  ms: 'Bahasa Melayu',
  tr: 'Türkçe',
  ne: 'नेपाली',
  vi: 'Tiếng Việt',
  es: 'Español',
};
const LANG_CODE: Record<Lang, string> = {
  en: 'EN',
  ja: '日本',
  ar: 'ع',
  id: 'ID',
  ur: 'اردو',
  bn: 'বাং',
  ms: 'MS',
  tr: 'TR',
  ne: 'ने',
  vi: 'VI',
  es: 'ES',
};
import { renderSalat } from './modules/salat/ui';
import { renderQibla, stopCompass } from './modules/qibla/ui';
import { renderPlaces } from './modules/places/ui';
import { renderKhutbah } from './modules/khutbah/ui';
import { renderGuide } from './modules/guide/ui';
import { renderFood, stopFoodCamera } from './modules/food/ui';
import { DONATE_URL } from './config';
import { isNative } from './backend';

type Tab = 'salat' | 'qibla' | 'places' | 'food' | 'khutbah' | 'guide';

const TABS: Array<{ id: Tab; icon: IconName; labelKey: 'navSalat' | 'navQibla' | 'navPlaces' | 'navFood' | 'navKhutbah' | 'navGuide' }> = [
  { id: 'salat', icon: 'salat', labelKey: 'navSalat' },
  { id: 'qibla', icon: 'qibla', labelKey: 'navQibla' },
  { id: 'places', icon: 'places', labelKey: 'navPlaces' },
  { id: 'food', icon: 'food', labelKey: 'navFood' },
  { id: 'khutbah', icon: 'khutbah', labelKey: 'navKhutbah' },
  { id: 'guide', icon: 'guide', labelKey: 'navGuide' },
];

const RENDERERS: Record<Tab, (el: HTMLElement) => void> = {
  salat: renderSalat,
  qibla: renderQibla,
  places: renderPlaces,
  food: renderFood,
  khutbah: renderKhutbah,
  guide: renderGuide,
};

let activeTab: Tab = 'salat';

/** Donar: solo en la web y solo si hay enlace (ver config.ts). */
export function showDonate(): boolean {
  return DONATE_URL !== '' && !isNative();
}

function renderShell(): void {
  const app = document.getElementById('app')!;
  app.innerHTML = `
    <header class="header">
      <div class="brand">
        <div class="brand-arch" aria-hidden="true"></div>
        <div>
          <h1>${t('appName')}</h1>
          <p class="tagline">${t('tagline')}</p>
        </div>
      </div>
      <div class="header-actions">
        <label class="lang-select" title="${t('language')}">
          <span class="lang-code" aria-hidden="true">${LANG_CODE[getLang()]}</span>
          <select id="sel-lang" aria-label="${t('language')}">
            ${LANGS
              .map((l) => `<option value="${l}" ${l === getLang() ? 'selected' : ''}>${LANG_LABEL[l]}</option>`)
              .join('')}
          </select>
        </label>
        ${
          showDonate()
            ? `<a class="btn-donate" href="${DONATE_URL}" target="_blank" rel="noopener" aria-label="${t('donate')}" title="${t('donateTitle')}">${icon('heart', 18)}<span>${t('donate')}</span></a>`
            : ''
        }
        <button class="btn-appearance" id="btn-appearance" aria-label="${t('appearance')}" title="${t('appearance')}">${icon('settings', 20)}</button>
      </div>
    </header>
    <main id="view"></main>
    <nav class="tabbar" role="tablist">
      ${TABS.map(
        (tab) => `
        <button role="tab" data-tab="${tab.id}" aria-selected="${String(tab.id === activeTab)}">
          ${icon(tab.icon, 25)}${t(tab.labelKey)}
        </button>`,
      ).join('')}
    </nav>
  `;

  app.querySelector<HTMLButtonElement>('#btn-appearance')!.addEventListener('click', () => {
    openAppearanceSheet(() => applyDirection());
  });

  app.querySelector<HTMLSelectElement>('#sel-lang')!.addEventListener('change', (ev) => {
    setLang((ev.target as HTMLSelectElement).value as Lang);
  });

  app.querySelectorAll<HTMLButtonElement>('.tabbar button').forEach((btn) => {
    btn.addEventListener('click', () => {
      // Salir de la pestaña de comida debe apagar la cámara, no dejarla viva.
      if (activeTab === 'food') stopFoodCamera();
      // Y la de la qibla, el sensor de la brújula.
      if (activeTab === 'qibla') stopCompass();
      activeTab = btn.dataset.tab as Tab;
      app
        .querySelectorAll<HTMLButtonElement>('.tabbar button')
        .forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
      renderView();
    });
  });

  renderView();
}

function renderView(): void {
  const view = document.getElementById('view')!;
  RENDERERS[activeTab](view);
}

applyAppearance();
applyDirection();
renderShell();
onLangChange(renderShell);

// Opiniones escritas sin conexión: salen ahora si ya hay red.
void import('./modules/guide/feedback').then(({ flushFeedbackQueue }) => flushFeedbackQueue());

// App nativa: barra de estado, splash y reprogramación de avisos al volver.
void (async () => {
  const [{ initNative }, { rescheduleNotifications }] = await Promise.all([
    import('./native'),
    import('./modules/salat/ui'),
  ]);
  await initNative(rescheduleNotifications);
  await rescheduleNotifications();
})();

// PWA: registrar el service worker (solo en producción).
// En GitHub Pages (subruta) lo saltamos: el SW cachea rutas absolutas y el
// despliegue de Pages es solo para probar el reconocimiento de voz online.
if (
  'serviceWorker' in navigator &&
  import.meta.env.PROD &&
  !location.hostname.endsWith('github.io')
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* sin SW seguimos funcionando online */
    });
  });
}
