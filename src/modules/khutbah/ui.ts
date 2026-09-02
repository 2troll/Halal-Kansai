import { KhutbahListener, SOURCE_LOCALES, TARGET_LANGS, isSpeechSupported } from './speech';
import { KhutbahRoom } from './room';
import { translateSegment, type TranslatedSegment } from './translate';
import { disableFridayMode, enableFridayMode } from './wakelock';
import { t, getLang } from '../../i18n';

type Mode = 'local' | 'transmit' | 'join';

let listener: KhutbahListener | null = null;
let room: KhutbahRoom | null = null;
let running = false;

const PREF_SOURCE = 'hk-khutbah-source';
const PREF_TARGET = 'hk-khutbah-target';
const PREF_MODE = 'hk-khutbah-mode';
const PREF_ROOM = 'hk-khutbah-room';

function segmentCard(seg: TranslatedSegment): string {
  if (seg.kind === 'quran') {
    const unofficial =
      seg.verified && seg.translationSource !== 'tanzil' ? ` · ${t('translationUnofficial')}` : '';
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

function stopAll(): void {
  listener?.stop();
  listener = null;
  room?.close();
  room = null;
  running = false;
  void disableFridayMode();
}

export function renderKhutbah(container: HTMLElement): void {
  if (running) stopAll();

  const savedSource = localStorage.getItem(PREF_SOURCE) ?? 'ur-PK';
  const savedTarget = localStorage.getItem(PREF_TARGET) ?? getLang();
  const savedMode = (localStorage.getItem(PREF_MODE) ?? 'local') as Mode;
  const savedRoom = localStorage.getItem(PREF_ROOM) ?? '';

  container.innerHTML = `
    <h2>${t('khutbahTitle')}</h2>
    <div class="disclaimer">⚠ ${t('khutbahDisclaimer')}</div>
    <div class="khutbah-controls">
      <label>${t('modeLabel')}
        <select id="sel-mode">
          <option value="local" ${savedMode === 'local' ? 'selected' : ''}>🎙 ${t('modeLocal')}</option>
          <option value="transmit" ${savedMode === 'transmit' ? 'selected' : ''}>📡 ${t('modeTransmit')}</option>
          <option value="join" ${savedMode === 'join' ? 'selected' : ''}>📻 ${t('modeJoin')}</option>
        </select>
      </label>
      <input id="inp-room" maxlength="24" placeholder="${t('roomCode')}"
        value="${savedRoom}" ${savedMode === 'local' ? 'hidden' : ''} />
      <label id="lbl-source" ${savedMode === 'join' ? 'hidden' : ''}>${t('sourceLang')}
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
      <button class="btn" id="btn-listen"></button>
      <span class="status-pill" id="status" hidden><span class="dot"></span><span id="status-text"></span></span>
      <p class="note" id="khutbah-note"></p>
    </div>
    <div class="transcript" id="transcript"></div>
  `;

  const btn = container.querySelector<HTMLButtonElement>('#btn-listen')!;
  const status = container.querySelector<HTMLElement>('#status')!;
  const statusText = container.querySelector<HTMLElement>('#status-text')!;
  const note = container.querySelector<HTMLElement>('#khutbah-note')!;
  const transcript = container.querySelector<HTMLElement>('#transcript')!;
  const selMode = container.querySelector<HTMLSelectElement>('#sel-mode')!;
  const inpRoom = container.querySelector<HTMLInputElement>('#inp-room')!;
  const lblSource = container.querySelector<HTMLElement>('#lbl-source')!;
  const selSource = container.querySelector<HTMLSelectElement>('#sel-source')!;
  const selTarget = container.querySelector<HTMLSelectElement>('#sel-target')!;

  const mode = (): Mode => selMode.value as Mode;

  const idleButtonLabel = (): string =>
    mode() === 'transmit'
      ? `📡 ${t('startBroadcast')}`
      : mode() === 'join'
        ? `📻 ${t('joinRoom')}`
        : `🎙 ${t('startListening')}`;

  const setIdleUi = () => {
    btn.textContent = idleButtonLabel();
    btn.classList.remove('stop');
    status.hidden = true;
  };
  setIdleUi();

  selMode.addEventListener('change', () => {
    localStorage.setItem(PREF_MODE, mode());
    inpRoom.hidden = mode() === 'local';
    lblSource.hidden = mode() === 'join';
    setIdleUi();
  });
  selSource.addEventListener('change', () => localStorage.setItem(PREF_SOURCE, selSource.value));
  selTarget.addEventListener('change', () => localStorage.setItem(PREF_TARGET, selTarget.value));
  inpRoom.addEventListener('change', () => localStorage.setItem(PREF_ROOM, inpRoom.value.trim()));

  if (!isSpeechSupported() && mode() !== 'join') {
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

  const addSegment = (seg: TranslatedSegment) => {
    clearInterim();
    transcript.insertAdjacentHTML('afterbegin', segmentCard(seg));
  };

  const errorText = (code: string): string =>
    code === 'roomTaken' ? t('roomTaken') : code === 'roomFull' ? t('roomFull') : t('connectionLost');

  const startListener = (onSentence: (text: string) => void) => {
    listener = new KhutbahListener({
      onSentence,
      onInterim: showInterim,
      onError: (err) => {
        note.textContent = err === 'unsupported' ? t('speechUnsupported') : `⚠ ${err}`;
      },
    });
    listener.start(selSource.value);
  };

  const setRunningUi = (statusLabel: string) => {
    running = true;
    void enableFridayMode();
    note.textContent = `🔆 ${t('fridayMode')}`;
    btn.textContent = `■ ${t('stopListening')}`;
    btn.classList.add('stop');
    statusText.textContent = statusLabel;
    status.hidden = false;
  };

  const roomCallbacks = (isTransmitter: boolean) => ({
    onJoined: (listeners: number) => {
      setRunningUi(
        `${isTransmitter ? t('broadcasting') : t('joinedRoom')} · ${listeners} ${t('listenersLabel')}`,
      );
      if (isTransmitter) startListener((text) => room?.sendSegment(text));
    },
    onSegment: addSegment,
    onListeners: (count: number) => {
      statusText.textContent = `${isTransmitter ? t('broadcasting') : t('joinedRoom')} · ${count} ${t('listenersLabel')}`;
    },
    onError: (code: string) => {
      note.textContent = `⚠ ${errorText(code)}`;
      stopAll();
      setIdleUi();
    },
    onClose: () => {
      note.textContent = `⚠ ${t('connectionLost')}`;
      stopAll();
      setIdleUi();
    },
  });

  btn.addEventListener('click', () => {
    if (running) {
      stopAll();
      setIdleUi();
      note.textContent = '';
      return;
    }

    const currentMode = mode();
    if (currentMode === 'local') {
      startListener(async (text) => {
        try {
          addSegment(await translateSegment(text, selSource.value, selTarget.value));
        } catch {
          note.textContent = t('backendUnavailable');
          transcript.insertAdjacentHTML(
            'afterbegin',
            `<div class="bubble"><div class="orig">${text}</div></div>`,
          );
        }
      });
      setRunningUi(t('listening'));
      return;
    }

    const roomCode = inpRoom.value.trim().toLowerCase();
    if (!/^[a-z0-9-]{3,24}$/.test(roomCode)) {
      inpRoom.focus();
      return;
    }
    localStorage.setItem(PREF_ROOM, roomCode);
    room = new KhutbahRoom();
    room.connect(
      {
        room: roomCode,
        role: currentMode === 'transmit' ? 'transmitter' : 'receiver',
        lang: selTarget.value,
        source: currentMode === 'transmit' ? selSource.value : undefined,
      },
      roomCallbacks(currentMode === 'transmit'),
    );
  });
}
