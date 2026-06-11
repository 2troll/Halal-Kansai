import { KhutbahListener, SOURCE_LOCALES, TARGET_LANGS, isSpeechSupported } from './speech';
import { translateSegment, type TranslatedSegment } from './translate';
import { t, getLang } from '../../i18n';

let listener: KhutbahListener | null = null;
let running = false;

const PREF_SOURCE = 'hk-khutbah-source';
const PREF_TARGET = 'hk-khutbah-target';

function segmentCard(seg: TranslatedSegment): string {
  if (seg.kind === 'quran') {
    const unofficial =
      seg.verified && seg.translationSource === 'llm' ? ` · ${t('translationUnofficial')}` : '';
    return `
      <div class="bubble quran">
        ${seg.arabicVerified ? `<div class="arabic">${seg.arabicVerified}</div>` : ''}
        <div>${seg.translation}</div>
        <span class="ref">${
          seg.verified && seg.reference
            ? `${t('citationQuran')} ${seg.reference}${unofficial}`
            : `⚠ ${t('citationUnverified')}`
        }</span>
      </div>`;
  }
  if (seg.kind === 'hadith') {
    return `
      <div class="bubble hadith">
        <div>${seg.translation}</div>
        <span class="ref">${t('citationHadith')}</span>
      </div>`;
  }
  if (seg.kind === 'dua') {
    return `
      <div class="bubble dua">
        <div>${seg.translation}</div>
        <span class="ref">${t('citationDua')}</span>
      </div>`;
  }
  return `
    <div class="bubble">
      <div>${seg.translation}</div>
      <div class="orig">${seg.original}</div>
    </div>`;
}

export function renderKhutbah(container: HTMLElement): void {
  if (running && listener) {
    listener.stop();
    running = false;
  }

  const savedSource = localStorage.getItem(PREF_SOURCE) ?? 'ur-PK';
  const savedTarget = localStorage.getItem(PREF_TARGET) ?? getLang();

  container.innerHTML = `
    <h2>${t('khutbahTitle')}</h2>
    <div class="disclaimer">⚠ ${t('khutbahDisclaimer')}</div>
    <div class="khutbah-controls">
      <label>${t('sourceLang')}
        <select id="sel-source">
          ${SOURCE_LOCALES.map(
            (l) =>
              `<option value="${l.code}" ${l.code === savedSource ? 'selected' : ''}>${l.label}</option>`,
          ).join('')}
        </select>
      </label>
      <label>${t('targetLang')}
        <select id="sel-target">
          ${TARGET_LANGS.map(
            (l) =>
              `<option value="${l.code}" ${l.code === savedTarget ? 'selected' : ''}>${l.label}</option>`,
          ).join('')}
        </select>
      </label>
      <button class="btn" id="btn-listen">🎙 ${t('startListening')}</button>
      <span class="status-pill" id="status" hidden><span class="dot"></span>${t('listening')}</span>
      <p class="note" id="khutbah-note"></p>
    </div>
    <div class="transcript" id="transcript"></div>
  `;

  const btn = container.querySelector<HTMLButtonElement>('#btn-listen')!;
  const status = container.querySelector<HTMLElement>('#status')!;
  const note = container.querySelector<HTMLElement>('#khutbah-note')!;
  const transcript = container.querySelector<HTMLElement>('#transcript')!;
  const selSource = container.querySelector<HTMLSelectElement>('#sel-source')!;
  const selTarget = container.querySelector<HTMLSelectElement>('#sel-target')!;

  selSource.addEventListener('change', () => localStorage.setItem(PREF_SOURCE, selSource.value));
  selTarget.addEventListener('change', () => localStorage.setItem(PREF_TARGET, selTarget.value));

  if (!isSpeechSupported()) {
    btn.disabled = true;
    note.textContent = t('speechUnsupported');
  }

  let interimEl: HTMLElement | null = null;

  const showInterim = (text: string) => {
    if (!interimEl) {
      interimEl = document.createElement('div');
      interimEl.className = 'bubble interim';
      transcript.prepend(interimEl);
    }
    interimEl.textContent = text;
  };

  const clearInterim = () => {
    interimEl?.remove();
    interimEl = null;
  };

  const onSentence = async (text: string) => {
    clearInterim();
    try {
      const seg = await translateSegment(text, selSource.value, selTarget.value);
      transcript.insertAdjacentHTML('afterbegin', segmentCard(seg));
    } catch {
      // Backend caído (o Fase 2 aún no desplegada): mostrar el original.
      note.textContent = t('backendUnavailable');
      transcript.insertAdjacentHTML(
        'afterbegin',
        `<div class="bubble"><div class="orig">${text}</div></div>`,
      );
    }
  };

  btn.addEventListener('click', () => {
    if (running) {
      listener?.stop();
      running = false;
      btn.textContent = `🎙 ${t('startListening')}`;
      btn.classList.remove('stop');
      status.hidden = true;
      return;
    }
    note.textContent = '';
    listener = new KhutbahListener({
      onSentence,
      onInterim: showInterim,
      onError: (err) => {
        note.textContent = err === 'unsupported' ? t('speechUnsupported') : `⚠ ${err}`;
      },
    });
    listener.start(selSource.value);
    running = true;
    btn.textContent = `■ ${t('stopListening')}`;
    btn.classList.add('stop');
    status.hidden = false;
  });
}
