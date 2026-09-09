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

export const THEMES = ['night', 'paper', 'sand', 'indigo', 'contrast'] as const;
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
};

const THEME_LABEL: Record<Theme, () => string> = {
  night: () => t('themeNight'),
  paper: () => t('themePaper'),
  sand: () => t('themeSand'),
  indigo: () => t('themeIndigo'),
  contrast: () => t('themeContrast'),
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

export function getTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY);
  if (isTheme(saved)) return saved;
  // Sin elección previa: seguimos al sistema. Quien tiene el móvil en claro
  // suele tenerlo así por la vista, no por capricho.
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'paper' : 'night';
}

export function getTextSize(): TextSize {
  const saved = localStorage.getItem(TEXT_KEY);
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
  root.dataset.theme = getTheme();
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
  backdrop.setAttribute('aria-label', t('appearance'));

  backdrop.innerHTML = `
    <div class="sheet">
      <h2>${t('appearance')}</h2>
      <p class="sheet-sub">${t('appearanceHint')}</p>

      <h3>${t('theme')}</h3>
      <div class="theme-grid">
        ${THEMES.map(
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

  document.body.appendChild(backdrop);
  backdrop.querySelector<HTMLButtonElement>('.sheet-close')!.focus();
}
