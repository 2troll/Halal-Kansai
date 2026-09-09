/**
 * Pestaña Comida: leer la etiqueta y hablar con el personal.
 *
 * Dos modos, que son los dos momentos reales del problema:
 *  - **Etiqueta**: escanear el código de barras del producto o pegar la línea
 *    原材料名 y obtener el dictamen término a término (motor local en
 *    `../ingredients`).
 *  - **Personal**: tarjetas en japonés cortés para enseñar al camarero, porque
 *    en Japón la barrera no es la mala voluntad sino el idioma.
 */

import { analyze, searchRules, segmentsFor, type Analysis, type Finding, type Rule, type Verdict } from '../ingredients/analyze';
import {
  barcodeSupported,
  lookupProduct,
  startBarcodeScan,
  type LookupError,
  type ScanStop,
} from '../ingredients/scan';
import { RULES, type Status } from '../ingredients/rules';
import { PHRASES, type Phrase } from './phrases';
import { getLang, t } from '../../i18n';
import { ruleText } from '../ingredients/localize';

type Mode = 'label' | 'phrases';

/** Etiquetas japonesas reales para enseñar la herramienta sin producto delante. */
const EXAMPLES: Array<{ name: string; text: string }> = [
  {
    name: '🍜 カップ麺',
    text: '原材料名：油揚げめん（小麦粉、植物油脂、食塩）、スープ（ポークエキス、豚脂、しょうゆ、みりん、香辛料）、調味料（アミノ酸等）、カラメル色素、香料',
  },
  {
    name: '🍞 菓子パン',
    text: '原材料名：小麦粉、砂糖、マーガリン、ショートニング、ゼラチン、卵、乳化剤、香料、L-システイン（本品製造工場では豚肉を含む製品を製造しています）',
  },
  {
    name: '🍶 調味料',
    text: '原材料名：大豆、食塩、米、昆布エキス、米酢、みりん風調味料、酒精、植物性油脂',
  },
];

const STATUS_ICON: Record<Status, string> = { haram: '⛔', mushbooh: '⚠️', halal: '✅' };

const STATUS_LABEL: Record<Status, () => string> = {
  haram: () => t('statusHaram'),
  mushbooh: () => t('statusMushbooh'),
  halal: () => t('statusHalal'),
};

const VERDICT_TITLE: Record<Verdict, () => string> = {
  haram: () => t('verdictHaramTitle'),
  mushbooh: () => t('verdictMushboohTitle'),
  'no-haram-found': () => t('verdictNoHaramTitle'),
  'nothing-recognised': () => t('verdictUnknownTitle'),
};

const VERDICT_BODY: Record<Verdict, () => string> = {
  haram: () => t('verdictHaramBody'),
  mushbooh: () => t('verdictMushboohBody'),
  'no-haram-found': () => t('verdictNoHaramBody'),
  'nothing-recognised': () => t('verdictUnknownBody'),
};

let mode: Mode = 'label';
let stopCamera: ScanStop | null = null;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/** El texto de la etiqueta con cada término reconocido resaltado por estado. */
function markedLabel(label: string, findings: Finding[]): string {
  return segmentsFor(label, findings)
    .map((seg) =>
      seg.status
        ? `<mark class="hit ${seg.status}">${escapeHtml(seg.text)}</mark>`
        : escapeHtml(seg.text),
    )
    .join('');
}

/**
 * Pregunta lista para enviar al fabricante en japonés cortés, con los términos
 * dudosos encontrados. Resolver una duda es preguntar a la empresa, y la única
 * barrera real era redactarlo en japonés de negocios.
 */
function makerQuestion(findings: Finding[], productName: string): string {
  const doubtful = findings.filter((f) => f.status !== 'halal').map((f) => f.matched);
  const item = productName ? `「${productName}」` : '貴社製品';
  const list = doubtful.length > 0 ? doubtful.map((d) => `「${d}」`).join('、') : '原材料';
  return [
    'お世話になっております。',
    `${item}について、${list}の由来（豚由来・牛由来・魚由来・植物由来）と、`,
    '原材料および製造工程におけるアルコール（酒精）の使用の有無をお教えいただけますでしょうか。',
    '宗教上の理由により確認しております。お手数をおかけしますが、よろしくお願いいたします。',
  ].join('');
}

function findingHtml(f: Finding): string {
  const lang = getLang();
  return `
    <article class="finding ${f.status}">
      <h3><span class="icon" aria-hidden="true">${STATUS_ICON[f.status]}</span>
        ${escapeHtml(ruleText(f.id, f.label, 'label', lang))}
        <code lang="ja">${escapeHtml(f.matched)}</code>
      </h3>
      <span class="badge ${f.status}">${STATUS_LABEL[f.status]()}</span>
      <p>${escapeHtml(ruleText(f.id, f.why, 'why', lang))}</p>
    </article>`;
}

/** Ficha de diccionario: la misma tarjeta, pero sin etiqueta de por medio. */
function ruleHtml(rule: Rule): string {
  const lang = getLang();
  return `
    <article class="finding ${rule.status}">
      <h3><span class="icon" aria-hidden="true">${STATUS_ICON[rule.status]}</span>
        ${escapeHtml(ruleText(rule.id, rule.label, 'label', lang))}
        <code lang="ja">${escapeHtml(rule.terms.slice(0, 3).join('・'))}</code>
      </h3>
      <span class="badge ${rule.status}">${STATUS_LABEL[rule.status]()}</span>
      <p>${escapeHtml(ruleText(rule.id, rule.why, 'why', lang))}</p>
    </article>`;
}

function resultHtml(label: string, analysis: Analysis, product: string): string {
  const { verdict, findings, counts } = analysis;
  const tally = [
    counts.haram > 0 ? `⛔ ${counts.haram}` : '',
    counts.mushbooh > 0 ? `⚠️ ${counts.mushbooh}` : '',
    counts.halal > 0 ? `✅ ${counts.halal}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return `
    <section class="verdict ${verdict}">
      <p class="label">${t('scanVerdict')}</p>
      <p class="big">${VERDICT_TITLE[verdict]()}</p>
      <p class="small">${VERDICT_BODY[verdict]()}</p>
      ${tally ? `<p class="tally">${tally}</p>` : ''}
    </section>

    <p class="note strong">${t('scanNotClearance')}</p>

    ${
      findings.length > 0
        ? `<h3 class="section-h">${t('scanMarkedLabel')}</h3>
           <p class="marked-label" dir="auto" lang="ja">${markedLabel(label, findings)}</p>
           <h3 class="section-h">${t('scanFoundTerms')}</h3>
           ${findings.map(findingHtml).join('')}
           <button class="btn ghost" id="copy-question">📋 ${t('scanAskMaker')}</button>
           <p class="note" id="copy-note" hidden>${t('scanCopied')}</p>
           <p class="note">${t('scanNoFatwa')}</p>`
        : ''
    }
    <p class="note" data-question="${escapeHtml(makerQuestion(findings, product))}" hidden></p>`;
}

function renderLabelMode(body: HTMLElement): void {
  body.innerHTML = `
    <p class="subtitle">${t('scanSubtitle')}</p>

    <div class="scan-actions">
      <button class="btn" id="scan-camera">📷 ${t('scanCamera')}</button>
      ${EXAMPLES.map(
        (ex, i) => `<button class="btn ghost" data-example="${i}" lang="ja">${ex.name}</button>`,
      ).join('')}
    </div>

    <div class="camera-box" id="camera-box" hidden>
      <video id="scan-video" muted playsinline></video>
      <button class="btn stop" id="scan-stop">${t('scanCameraStop')}</button>
    </div>

    <p class="note" id="scan-status" hidden></p>

    <label class="food-label" for="label-input">${t('foodScanLabel')}</label>
    <textarea
      id="label-input"
      class="label-input"
      dir="auto"
      lang="ja"
      rows="5"
      placeholder="${t('scanPlaceholder')}"
    ></textarea>

    <div class="scan-actions">
      <button class="btn" id="run-check">🔍 ${t('scanCheck')}</button>
      <button class="btn ghost" id="clear-input">${t('scanClear')}</button>
    </div>

    <div id="scan-result"></div>

    <details class="food-all">
      <summary>${t('foodBrowseAll')} (${RULES.length})</summary>
      ${RULES.map(ruleHtml).join('')}
    </details>

    <p class="disclaimer">${t('foodDisclaimer')}</p>
    <p class="note">${t('scanOfflineNote')} · ${t('scanSource')}</p>
  `;

  const input = body.querySelector<HTMLTextAreaElement>('#label-input')!;
  const result = body.querySelector<HTMLElement>('#scan-result')!;
  const status = body.querySelector<HTMLElement>('#scan-status')!;
  const cameraBox = body.querySelector<HTMLElement>('#camera-box')!;
  const video = body.querySelector<HTMLVideoElement>('#scan-video')!;
  let productName = '';

  const say = (msg: string): void => {
    status.textContent = msg;
    status.hidden = false;
  };

  const run = (): void => {
    const text = input.value.trim();
    if (!text) {
      say(t('scanEmpty'));
      result.innerHTML = '';
      return;
    }
    status.hidden = true;

    // Una palabra suelta se trata como consulta de diccionario; un bloque de
    // texto, como etiqueta. Es la diferencia entre "¿qué es みりん?" y
    // "¿puedo comerme esto?".
    const isSingleWord = text.length <= 12 && !/[\s、,・：:]/.test(text);
    if (isSingleWord) {
      const found = searchRules(text, getLang());
      result.innerHTML = found.length
        ? found.map(ruleHtml).join('')
        : `<p class="note">${t('foodNoMatch')}</p>`;
      return;
    }

    result.innerHTML = resultHtml(text, analyze(text), productName);
    wireCopy(result);
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  body.querySelector<HTMLButtonElement>('#run-check')!.addEventListener('click', run);

  body.querySelector<HTMLButtonElement>('#clear-input')!.addEventListener('click', () => {
    input.value = '';
    productName = '';
    result.innerHTML = '';
    status.hidden = true;
    input.focus();
  });

  body.querySelectorAll<HTMLButtonElement>('[data-example]').forEach((btn) => {
    btn.addEventListener('click', () => {
      productName = '';
      input.value = EXAMPLES[Number(btn.dataset.example)]!.text;
      run();
    });
  });

  body.querySelector<HTMLButtonElement>('#scan-stop')!.addEventListener('click', () => {
    stopFoodCamera();
    cameraBox.hidden = true;
  });

  body.querySelector<HTMLButtonElement>('#scan-camera')!.addEventListener('click', () => {
    void openCamera();
  });

  async function openCamera(): Promise<void> {
    if (!barcodeSupported()) {
      say(t('scanCameraUnsupported'));
      return;
    }
    try {
      cameraBox.hidden = false;
      say(t('scanPointCamera'));
      stopCamera = await startBarcodeScan(video, (code) => {
        cameraBox.hidden = true;
        stopCamera = null;
        void fetchProduct(code);
      });
    } catch {
      cameraBox.hidden = true;
      say(t('scanCameraDenied'));
    }
  }

  async function fetchProduct(code: string): Promise<void> {
    say(`${t('scanLookingUp')} (${code})`);
    const found = await lookupProduct(code);

    if (!found.ok) {
      const messages: Record<LookupError, string> = {
        offline: t('scanOffline'),
        'not-found': t('scanNotFound'),
        'no-ingredients': t('scanNoIngredients'),
        network: t('scanNetworkError'),
      };
      say(messages[found.reason]);
      input.focus();
      return;
    }

    productName = found.product.name;
    input.value = found.product.ingredients;
    run();
    // `run` oculta el estado; se vuelve a mostrar de qué producto se trata.
    const title = [found.product.brand, found.product.name].filter(Boolean).join(' · ');
    say(`${t('scanFound')}: ${title || code}`);
  }

  function wireCopy(container: HTMLElement): void {
    const btn = container.querySelector<HTMLButtonElement>('#copy-question');
    const question = container.querySelector<HTMLElement>('[data-question]')?.dataset.question;
    const note = container.querySelector<HTMLElement>('#copy-note');
    if (!btn || !question) return;
    btn.addEventListener('click', () => {
      void navigator.clipboard
        .writeText(question)
        .then(() => {
          if (note) note.hidden = false;
        })
        .catch(() => {
          // Sin permiso de portapapeles: se muestra el texto para copiarlo a mano.
          if (note) {
            note.textContent = question;
            note.hidden = false;
          }
        });
    });
  }
}

function phraseFor(p: Phrase): string {
  return p[getLang()];
}

function renderPhrasesMode(body: HTMLElement): void {
  body.innerHTML = `
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

  const sheet = body.querySelector<HTMLElement>('#phrase-sheet')!;
  const own = body.querySelector<HTMLElement>('#sheet-own')!;
  const ja = body.querySelector<HTMLElement>('#sheet-ja')!;
  const romaji = body.querySelector<HTMLElement>('#sheet-romaji')!;

  const close = (): void => {
    sheet.hidden = true;
    document.body.classList.remove('sheet-open');
  };

  body.querySelectorAll<HTMLButtonElement>('.phrase-item').forEach((btn) => {
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

  body.querySelector<HTMLButtonElement>('#sheet-close')!.addEventListener('click', close);
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
      <button class="btn" role="tab" data-mode="label" aria-selected="${String(mode === 'label')}">${t('foodTabScan')}</button>
      <button class="btn" role="tab" data-mode="phrases" aria-selected="${String(mode === 'phrases')}">${t('foodTabPhrases')}</button>
    </div>
    <div id="food-body"></div>
  `;

  const body = container.querySelector<HTMLElement>('#food-body')!;
  const draw = (): void => {
    stopFoodCamera();
    if (mode === 'label') renderLabelMode(body);
    else renderPhrasesMode(body);
  };

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

/** Se abandona la pestaña: la cámara se apaga sí o sí. */
export function stopFoodCamera(): void {
  stopCamera?.();
  stopCamera = null;
}
