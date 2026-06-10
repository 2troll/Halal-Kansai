import './styles/main.css';
import { applyDirection, getLang, onLangChange, setLang, t, type Lang } from './i18n';
import { renderSalat } from './modules/salat/ui';
import { renderQibla } from './modules/qibla/ui';
import { renderPlaces } from './modules/places/ui';
import { renderKhutbah } from './modules/khutbah/ui';
import { renderGuide } from './modules/guide/ui';

type Tab = 'salat' | 'qibla' | 'places' | 'khutbah' | 'guide';

const TABS: Array<{ id: Tab; icon: string; labelKey: 'navSalat' | 'navQibla' | 'navPlaces' | 'navKhutbah' | 'navGuide' }> = [
  { id: 'salat', icon: '🕌', labelKey: 'navSalat' },
  { id: 'qibla', icon: '🧭', labelKey: 'navQibla' },
  { id: 'places', icon: '📍', labelKey: 'navPlaces' },
  { id: 'khutbah', icon: '🎙', labelKey: 'navKhutbah' },
  { id: 'guide', icon: '📖', labelKey: 'navGuide' },
];

const RENDERERS: Record<Tab, (el: HTMLElement) => void> = {
  salat: renderSalat,
  qibla: renderQibla,
  places: renderPlaces,
  khutbah: renderKhutbah,
  guide: renderGuide,
};

let activeTab: Tab = 'salat';

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
      <div class="lang-switch" role="group" aria-label="${t('language')}">
        ${(['ar', 'en', 'es'] as Lang[])
          .map(
            (l) =>
              `<button data-lang="${l}" aria-pressed="${String(l === getLang())}">${l.toUpperCase()}</button>`,
          )
          .join('')}
      </div>
    </header>
    <main id="view"></main>
    <nav class="tabbar" role="tablist">
      ${TABS.map(
        (tab) => `
        <button role="tab" data-tab="${tab.id}" aria-selected="${String(tab.id === activeTab)}">
          <span class="icon">${tab.icon}</span>${t(tab.labelKey)}
        </button>`,
      ).join('')}
    </nav>
  `;

  app.querySelectorAll<HTMLButtonElement>('.lang-switch button').forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang as Lang));
  });

  app.querySelectorAll<HTMLButtonElement>('.tabbar button').forEach((btn) => {
    btn.addEventListener('click', () => {
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

applyDirection();
renderShell();
onLangChange(renderShell);

// PWA: registrar el service worker (solo en producción).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* sin SW seguimos funcionando online */
    });
  });
}
