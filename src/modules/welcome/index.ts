/**
 * Bienvenida de la primera vez: una sola pantalla, no un carrusel.
 *
 * Las nueve apps revisadas el 17/09/2026 tenían bienvenida; varias, de cuatro
 * pantallas con permisos y encuestas antes de dejar ver nada. Aquí basta con
 * decir qué hace la app, prometer lo que la diferencia (gratis, sin cuenta,
 * sin anuncios) y dejar cambiar el idioma. Los permisos se piden después,
 * cuando se usa la función que los necesita.
 */
import { LANGS, getLang, onLangChange, setLang, t, type Lang } from '../../i18n';
import { LANG_LABEL } from '../../i18n/labels';
import { icon, type IconName } from '../../ui/icons';

const KEY = 'hk-welcomed';

export function needsWelcome(): boolean {
  try {
    return localStorage.getItem(KEY) !== '1';
  } catch {
    return false; // sin almacenamiento saldría cada vez: mejor no enseñarla
  }
}

const FEATURES: Array<[IconName, 'welcomeF1' | 'welcomeF2' | 'welcomeF3' | 'welcomeF4']> = [
  ['salat', 'welcomeF1'],
  ['places', 'welcomeF2'],
  ['food', 'welcomeF3'],
  ['khutbah', 'welcomeF4'],
];

export function showWelcome(): void {
  const box = document.createElement('div');
  box.className = 'welcome';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');

  const paint = (): void => {
    box.setAttribute('aria-label', t('appName'));
    box.innerHTML = `
      <div class="welcome-inner">
        <div class="brand-arch welcome-arch" aria-hidden="true"></div>
        <p class="welcome-salam" lang="ar" dir="rtl">السَّلَامُ عَلَيْكُمْ</p>
        <h1>${t('appName')}</h1>
        <p class="welcome-sub">${t('welcomeSub')}</p>
        <ul class="welcome-features">
          ${FEATURES.map(([ic, key]) => `<li><span class="welcome-icon">${icon(ic, 22)}</span><span>${t(key)}</span></li>`).join('')}
        </ul>
        <p class="welcome-promise">${t('welcomePromise')}</p>
        <label class="welcome-lang">
          <span>${t('welcomeLangHint')}</span>
          <select id="welcome-lang" aria-label="${t('language')}">
            ${LANGS.map((l) => `<option value="${l}" ${l === getLang() ? 'selected' : ''}>${LANG_LABEL[l]}</option>`).join('')}
          </select>
        </label>
        <button class="btn welcome-start" type="button">${t('welcomeStart')}</button>
      </div>`;
    box.querySelector<HTMLSelectElement>('#welcome-lang')!.addEventListener('change', (ev) => {
      setLang((ev.target as HTMLSelectElement).value as Lang);
    });
    box.querySelector<HTMLButtonElement>('.welcome-start')!.addEventListener('click', () => {
      try {
        localStorage.setItem(KEY, '1');
      } catch {
        /* se cierra igual */
      }
      box.remove();
    });
  };

  paint();
  // Al cambiar de idioma aquí, la bienvenida también cambia al momento.
  onLangChange(() => {
    if (box.isConnected) paint();
  });
  document.body.appendChild(box);
  box.querySelector<HTMLButtonElement>('.welcome-start')!.focus();
}
