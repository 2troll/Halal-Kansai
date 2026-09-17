/**
 * Apariencia: tema y tamaño del texto.
 *
 * Dos ejes separados a propósito. El color es gusto y contexto (de noche en
 * casa, a pleno sol delante de una estantería del súper). El tamaño no se
 * elige: o se lee, o no se lee. Mezclarlos en un solo control obliga a quien
 * necesita letra grande a tragarse además un color que no quiere.
 *
 * El estado vive en el atributo del <html>, no en clases de componentes: así
 * el CSS resuelve todo con variables y ningún módulo tiene que enterarse de
 * qué tema está puesto.
 */
import { t } from '../../i18n';
import { bindSettingsSections, settingsSectionsHtml } from '../settings/sections';

export const THEMES = ['night', 'paper', 'sand', 'indigo', 'contrast', 'amoled', 'sakura', 'matcha', 'ramadan', 'kiswah'] as const;
/** Temas con fondo claro: comparten los ajustes de legibilidad de [data-tone='light']. */
export const LIGHT_THEMES: ReadonlySet<Theme> = new Set(['paper', 'sand', 'sakura', 'matcha']);
/** Se gana al terminar la búsqueda de las 20 pistas (ver modules/hunt). */
export const SECRET_THEMES: ReadonlySet<Theme> = new Set(['kiswah']);
const UNLOCK_KEY = 'hk-unlocked-themes';
export type Theme = (typeof THEMES)[number];

export const TEXT_SIZES = ['normal', 'large', 'xlarge', 'xxlarge'] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

const THEME_KEY = 'hk-theme';
const TEXT_KEY = 'hk-text-size';

/** Muestra de color de cada tema: fondo + acento, para verlo antes de elegir. */
const SWATCH: Record<Theme, { bg: string; accent: string }> = {
  night: { bg: '#10211d', accent: '#c9a24b' },
  paper: { bg: '#f6f1e6', accent: '#1d6a55' },
  sand: { bg: '#efe4d2', accent: '#8a6520' },
  indigo: { bg: '#101a2e', accent: '#3a76ad' },
  contrast: { bg: '#000000', accent: '#ffd400' },
  amoled: { bg: '#000000', accent: '#2a8169' },
  sakura: { bg: '#fbeff2', accent: '#9b3a5a' },
  matcha: { bg: '#eef2e3', accent: '#3f6b2a' },
  ramadan: { bg: '#1a1330', accent: '#d9a441' },
  kiswah: { bg: '#0a0a0a', accent: '#d4af37' },
};

const THEME_LABEL: Record<Theme, () => string> = {
  night: () => t('themeNight'),
  paper: () => t('themePaper'),
  sand: () => t('themeSand'),
  indigo: () => t('themeIndigo'),
  contrast: () => t('themeContrast'),
  amoled: () => t('themeAmoled'),
  sakura: () => t('themeSakura'),
  matcha: () => t('themeMatcha'),
  ramadan: () => t('themeRamadan'),
  kiswah: () => t('themeKiswah'),
};

const SIZE_LABEL: Record<TextSize, () => string> = {
  normal: () => t('textNormal'),
  large: () => t('textLarge'),
  xlarge: () => t('textXLarge'),
  xxlarge: () => t('textXXLarge'),
};

function isTheme(v: string | null): v is Theme {
  return v !== null && (THEMES as readonly string[]).includes(v);
}

function isTextSize(v: string | null): v is TextSize {
  return v !== null && (TEXT_SIZES as readonly string[]).includes(v);
}

/** Lee localStorage sin romper si el navegador lo bloquea. */
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function isUnlocked(theme: Theme): boolean {
  if (!SECRET_THEMES.has(theme)) return true;
  return (read(UNLOCK_KEY) ?? '').split(',').includes(theme);
}

export function unlockTheme(theme: Theme): void {
  if (isUnlocked(theme)) return;
  const list = (read(UNLOCK_KEY) ?? '').split(',').filter(Boolean);
  try {
    localStorage.setItem(UNLOCK_KEY, [...list, theme].join(','));
  } catch {
    /* sin almacenamiento: el tema no se recuerda, pero la app sigue */
  }
}

/** Los temas que se enseñan en el panel: los normales y los ya ganados. */
export function visibleThemes(): Theme[] {
  return THEMES.filter(isUnlocked);
}

export function getTheme(): Theme {
  const saved = read(THEME_KEY);
  // Un tema secreto guardado pero no ganado (p. ej. copiado a mano) no vale.
  if (isTheme(saved) && isUnlocked(saved)) return saved;
  // Sin elección previa: seguimos al sistema. Quien tiene el móvil en claro
  // suele tenerlo así por la vista, no por capricho.
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'paper' : 'night';
}

export function getTextSize(): TextSize {
  const saved = read(TEXT_KEY);
  return isTextSize(saved) ? saved : 'normal';
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
  applyAppearance();
}

export function setTextSize(size: TextSize): void {
  localStorage.setItem(TEXT_KEY, size);
  applyAppearance();
}

/**
 * Escribe el estado en <html>. Se llama ANTES del primer pintado (en main.ts)
 * para que no se vea un fogonazo del tema anterior.
 */
export function applyAppearance(): void {
  const root = document.documentElement;
  const theme = getTheme();
  root.dataset.theme = theme;
  root.dataset.tone = LIGHT_THEMES.has(theme) ? 'light' : 'dark';
  root.dataset.text = getTextSize();
  // La barra del navegador y la del móvil, a juego con el fondo real.
  const bg = getComputedStyle(root).getPropertyValue('--night').trim();
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', bg || '#10211d');
}

/**
 * Panel de apariencia. Se monta y se desmonta entero: es una pantalla de
 * ajustes, no un estado que haya que mantener sincronizado con nada.
 */
export function openAppearanceSheet(onChange: () => void): void {
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', t('settings'));

  backdrop.innerHTML = `
    <div class="sheet">
      <h2>${t('settings')}</h2>
      <p class="sheet-sub">${t('appearanceHint')}</p>

      <h3>${t('theme')}</h3>
      <div class="theme-grid">
        ${visibleThemes().map(
          (name) => `
          <button class="theme-option" data-theme-option="${name}"
                  aria-pressed="${String(name === getTheme())}">
            <span class="theme-swatch" aria-hidden="true"
                  style="--sw-bg:${SWATCH[name].bg};--sw-accent:${SWATCH[name].accent}"></span>
            <span>${THEME_LABEL[name]()}</span>
          </button>`,
        ).join('')}
      </div>

      <h3>${t('textSize')}</h3>
      <div class="size-row">
        ${TEXT_SIZES.map(
          (size) => `
          <button class="size-option" data-size="${size}"
                  aria-pressed="${String(size === getTextSize())}">
            <span class="sample" aria-hidden="true">Aa</span>
            <span class="size-name">${SIZE_LABEL[size]()}</span>
          </button>`,
        ).join('')}
      </div>

      ${settingsSectionsHtml()}

      <button class="sheet-close">${t('done')}</button>
    </div>
  `;

  const close = (): void => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape') close();
  };

  backdrop.addEventListener('click', (ev) => {
    if (ev.target === backdrop) close();
  });
  document.addEventListener('keydown', onKey);

  backdrop.querySelectorAll<HTMLButtonElement>('[data-theme-option]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setTheme(btn.dataset.themeOption as Theme);
      backdrop
        .querySelectorAll<HTMLButtonElement>('[data-theme-option]')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      onChange();
    });
  });

  backdrop.querySelectorAll<HTMLButtonElement>('.size-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      setTextSize(btn.dataset.size as TextSize);
      backdrop
        .querySelectorAll<HTMLButtonElement>('.size-option')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      onChange();
    });
  });

  backdrop.querySelector<HTMLButtonElement>('.sheet-close')!.addEventListener('click', close);
  bindSettingsSections(backdrop);

  document.body.appendChild(backdrop);
  backdrop.querySelector<HTMLButtonElement>('.sheet-close')!.focus();
}
