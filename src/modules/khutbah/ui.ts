import { KhutbahListener, SOURCE_LOCALES, TARGET_LANGS, isSpeechSupported } from './speech';
import { KhutbahRoom } from './room';
import { translateSegment, type TranslatedSegment } from './translate';
import { disableFridayMode, enableFridayMode } from './wakelock';
import { t, getLang } from '../../i18n';
import { qrSvg } from './qr';
import {
  getVoiceName,
  setVoiceName,
  voicesFor,
  setVoiceEnabled,
  speakTranslation,
  speechOutputSupported,
  stopSpeaking,
  voiceEnabled,
  warmUpVoices,
} from './speak';

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
  // Al parar, callar de inmediato: si no, la voz sigue diciendo la cola
  // pendiente después de que el usuario haya pulsado «parar».
  stopSpeaking();
  void disableFridayMode();
}

export function renderKhutbah(container: HTMLElement): void {
  if (running) stopAll();

  const savedSource = localStorage.getItem(PREF_SOURCE) ?? 'ur-PK';
  const savedTarget = localStorage.getItem(PREF_TARGET) ?? getLang();
  // Enlace de un QR escaneado: entra directo a esa sala, sin teclear nada.
  const invited = new URLSearchParams(location.search).get('room');
  const savedMode = (invited ? 'join' : (localStorage.getItem(PREF_MODE) ?? 'local')) as Mode;
  const savedRoom = invited ?? localStorage.getItem(PREF_ROOM) ?? '';

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
      ${
        speechOutputSupported()
          ? `<label class="notify-row">
               <input type="checkbox" id="chk-voice" ${voiceEnabled() ? 'checked' : ''} />
               <span>🎧 ${t('voiceOutput')}</span>
             </label>
             <label id="lbl-voice" ${voiceEnabled() ? '' : 'hidden'}>${t('voicePick')}
               <select id="sel-voice"></select>
             </label>
             <p class="note">${t('voiceOutputHint')}</p>`
          : ''
      }
      <button class="btn" id="btn-listen"></button>
      <span class="status-pill" id="status" hidden><span class="dot"></span><span id="status-text"></span></span>
      <p class="note" id="khutbah-note"></p>
    </div>
    <div class="room-qr" id="room-qr" hidden></div>
    <div class="live-caption" id="live-caption" hidden aria-live="polite"></div>
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
    const qr = container.querySelector<HTMLElement>('#room-qr');
    if (qr) qr.hidden = true;
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

  const qrBox = container.querySelector<HTMLElement>('#room-qr')!;

  /**
   * El QR de la sala, para el que transmite.
   *
   * En una mezquita, decirle un código a doscientas personas y que cada una
   * lo teclee bien no ocurre. Se enseña esto en una pantalla y cada uno
   * apunta la cámara: entra directamente en la sala y en su idioma.
   */
  const showRoomQr = (code: string): void => {
    const url = `${location.origin}${location.pathname}?room=${encodeURIComponent(code)}`;
    try {
      qrBox.innerHTML = `
        ${qrSvg(url, t('roomQrLabel'))}
        <p class="room-qr-code">${code}</p>
        <p class="note">${t('roomQrHint')}</p>`;
      qrBox.hidden = false;
    } catch {
      // Sala con nombre larguísimo: el código escrito sigue sirviendo.
      qrBox.hidden = true;
    }
  };

  warmUpVoices();

  const selVoice = container.querySelector<HTMLSelectElement>('#sel-voice');
  const lblVoice = container.querySelector<HTMLElement>('#lbl-voice');

  /** Rellena la lista con las voces que el aparato tiene para ese idioma. */
  const fillVoices = (): void => {
    if (!selVoice) return;
    const list = voicesFor(selTarget.value);
    if (list.length === 0) {
      selVoice.innerHTML = `<option value="">${t('voiceNone')}</option>`;
      return;
    }
    const chosen = getVoiceName();
    selVoice.innerHTML = list
      .map(
        (v, i) =>
          `<option value="${v.name}" ${v.name === chosen || (!chosen && i === 0) ? 'selected' : ''}>${v.name}</option>`,
      )
      .join('');
  };
  fillVoices();
  // La lista llega tarde en algunos navegadores.
  speechSynthesis?.addEventListener?.('voiceschanged', fillVoices);

  selVoice?.addEventListener('change', () => {
    setVoiceName(selVoice.value);
    // Oírla al elegirla: es la única forma de saber si suena bien.
    speakTranslation(t('voiceOutputTest'), selTarget.value);
  });
  selTarget.addEventListener('change', fillVoices);
  const chkVoice = container.querySelector<HTMLInputElement>('#chk-voice');
  chkVoice?.addEventListener('change', () => {
    setVoiceEnabled(chkVoice.checked);
    if (lblVoice) lblVoice.hidden = !chkVoice.checked;
    // Una frase corta al activarlo: confirma que el auricular está puesto y
    // en el oído correcto antes de que empiece la jutba.
    if (chkVoice.checked) speakTranslation(t('voiceOutputTest'), selTarget.value);
  });
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

  const caption = container.querySelector<HTMLElement>('#live-caption')!;

  const addSegment = (seg: TranslatedSegment) => {
    clearInterim();
    // Subtítulo: la última traducción, grande y fija arriba. Quien no lleve
    // auricular sigue el sermón leyendo, sin tener que buscar en la lista.
    caption.textContent = seg.translation;
    caption.hidden = false;
    transcript.insertAdjacentHTML('afterbegin', segmentCard(seg));
    // Solo la traducción: el árabe original ya lo está diciendo el imán.
    speakTranslation(seg.translation, selTarget.value);
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
    if (currentMode === 'transmit') showRoomQr(roomCode);
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
