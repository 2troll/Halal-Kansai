import { getLang, t } from '../../i18n';
import { INGREDIENTS, lookup, scanLabel, type HalalStatus, type Ingredient } from './ingredients';
import { PHRASES, type Phrase } from './phrases';

type Mode = 'scan' | 'phrases';

let mode: Mode = 'scan';

const STATUS_ICON: Record<HalalStatus, string> = {
  haram: '⛔',
  doubtful: '⚠️',
  halal: '✅',
};

function statusLabel(s: HalalStatus): string {
  return s === 'haram' ? t('foodHaram') : s === 'doubtful' ? t('foodDoubtful') : t('foodHalal');
}

function noteFor(ing: Ingredient): string {
  return ing.note[getLang()];
}

function phraseFor(p: Phrase): string {
  return p[getLang()];
}

function ingredientCard(ing: Ingredient, matched?: string): string {
  const reading = ing.kana && ing.kana !== ing.ja ? ` · ${ing.kana}` : '';
  return `
    <article class="place-card food-card food-${ing.status}">
      <div class="food-head">
        <span class="food-icon" aria-hidden="true">${STATUS_ICON[ing.status]}</span>
        <div>
          <strong lang="ja">${ing.ja}</strong>${reading}
          <div class="note">${ing.romaji}</div>
        </div>
        <span class="badge">${statusLabel(ing.status)}</span>
      </div>
      <p>${noteFor(ing)}</p>
      ${matched && matched !== ing.ja ? `<p class="note">${t('foodMatchedAs')}: <span lang="ja">${matched}</span></p>` : ''}
    </article>`;
}

function renderScan(container: HTMLElement): void {
  const root = container.querySelector<HTMLElement>('#food-body')!;
  root.innerHTML = `
    <label class="food-label" for="food-input">${t('foodScanLabel')}</label>
    <textarea id="food-input" class="food-input" rows="4"
      placeholder="${t('foodScanPlaceholder')}" lang="ja"></textarea>
    <div class="filters">
      <button class="btn" id="btn-scan">${t('foodScanBtn')}</button>
      <button class="btn" id="btn-clear">${t('foodClear')}</button>
    </div>
    <div id="food-results"></div>
    <details class="food-all">
      <summary>${t('foodBrowseAll')} (${INGREDIENTS.length})</summary>
      ${INGREDIENTS.map((i) => ingredientCard(i)).join('')}
    </details>
    <p class="disclaimer">${t('foodDisclaimer')}</p>
  `;

  const input = root.querySelector<HTMLTextAreaElement>('#food-input')!;
  const results = root.querySelector<HTMLElement>('#food-results')!;

  const run = () => {
    const text = input.value.trim();
    if (!text) {
      results.innerHTML = '';
      return;
    }

    // Una sola palabra corta se trata como búsqueda; un bloque, como etiqueta.
    const isSearch = text.length <= 12 && !/[\s、,・]/.test(text);
    if (isSearch) {
      const found = lookup(text);
      results.innerHTML = found.length
        ? found.map((i) => ingredientCard(i)).join('')
        : `<p class="note">${t('foodNoMatch')}</p>`;
      return;
    }

    const { verdict, hits, inconclusive } = scanLabel(text);
    const banner = inconclusive
      ? `<div class="food-verdict food-doubtful">
           <strong>❔ ${t('foodInconclusive')}</strong>
           <p>${t('foodInconclusiveNote')}</p>
         </div>`
      : `<div class="food-verdict food-${verdict}">
           <strong>${STATUS_ICON[verdict]} ${statusLabel(verdict)}</strong>
           <p>${t('foodVerdictNote')}</p>
         </div>`;

    results.innerHTML =
      banner + hits.map((h) => ingredientCard(h.ingredient, h.matched)).join('');
  };

  root.querySelector<HTMLButtonElement>('#btn-scan')!.addEventListener('click', run);
  root.querySelector<HTMLButtonElement>('#btn-clear')!.addEventListener('click', () => {
    input.value = '';
    results.innerHTML = '';
    input.focus();
  });
  input.addEventListener('input', () => {
    if (input.value.trim().length >= 2) run();
    else results.innerHTML = '';
  });
}

function renderPhrases(container: HTMLElement): void {
  const root = container.querySelector<HTMLElement>('#food-body')!;
  root.innerHTML = `
    <p class="subtitle">${t('foodPhrasesHint')}</p>
    <div class="phrase-list">
      ${PHRASES.map(
        (p) => `
        <button class="phrase-item" data-id="${p.id}">
          <span class="phrase-own">${phraseFor(p)}</span>
          <span class="phrase-ja" lang="ja">${p.ja}</span>
        </button>`,
      ).join('')}
    </div>
    <div class="phrase-sheet" id="phrase-sheet" hidden role="dialog" aria-modal="true">
      <div class="phrase-sheet-inner">
        <p class="phrase-sheet-own" id="sheet-own"></p>
        <p class="phrase-sheet-ja" id="sheet-ja" lang="ja"></p>
        <p class="phrase-sheet-romaji" id="sheet-romaji"></p>
        <button class="btn" id="sheet-close">${t('foodClose')}</button>
      </div>
    </div>
  `;

  const sheet = root.querySelector<HTMLElement>('#phrase-sheet')!;
  const own = root.querySelector<HTMLElement>('#sheet-own')!;
  const ja = root.querySelector<HTMLElement>('#sheet-ja')!;
  const romaji = root.querySelector<HTMLElement>('#sheet-romaji')!;

  const close = () => {
    sheet.hidden = true;
    document.body.classList.remove('sheet-open');
  };

  root.querySelectorAll<HTMLButtonElement>('.phrase-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = PHRASES.find((x) => x.id === btn.dataset.id);
      if (!p) return;
      own.textContent = phraseFor(p);
      ja.textContent = p.ja;
      romaji.textContent = p.romaji;
      sheet.hidden = false;
      document.body.classList.add('sheet-open');
    });
  });

  root.querySelector<HTMLButtonElement>('#sheet-close')!.addEventListener('click', close);
  sheet.addEventListener('click', (e) => {
    if (e.target === sheet) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sheet.hidden) close();
  });
}

export function renderFood(container: HTMLElement): void {
  container.innerHTML = `
    <h2>${t('foodTitle')}</h2>
    <div class="filters" role="tablist">
      <button class="btn" role="tab" data-mode="scan" aria-selected="${String(mode === 'scan')}">${t('foodTabScan')}</button>
      <button class="btn" role="tab" data-mode="phrases" aria-selected="${String(mode === 'phrases')}">${t('foodTabPhrases')}</button>
    </div>
    <div id="food-body"></div>
  `;

  const draw = () => (mode === 'scan' ? renderScan(container) : renderPhrases(container));

  container.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.mode as Mode;
      container
        .querySelectorAll<HTMLButtonElement>('[data-mode]')
        .forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
      draw();
    });
  });

  draw();
}
