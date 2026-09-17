import { KhutbahListener, SOURCE_LOCALES, TARGET_LANGS, isSpeechSupported } from './speech';
import { KhutbahRoom } from './room';
import { refineTranslation, shouldRefine, type TranslatedSegment } from './translate';
import { translateSegmentSmart, ensureModels } from './translate-ondevice';
import { safeText } from '../escape';
import { dirFor, baseLang } from '../text-direction';
import { segmentCardHtml } from './reader';
import {
  deleteKhutbah,
  historyText,
  loadHistory,
  saveKhutbah,
  toSaved,
  verseCount,
  type SavedKhutbah,
  type SavedSegment,
} from './history';
import { disableFridayMode, enableFridayMode } from './wakelock';
import { t, getLang } from '../../i18n';
import { qrSvg } from './qr';
import { closeScreenMode, openScreenMode, screenModeOpen } from './screen';
import { isNative } from '../../backend';
import { NativeKhutbahListener, speechPlugin } from './speech-native';
import { MicMeter, NativeMicMeter, type MicReading } from './mic-level';
import {
  WhisperKhutbahListener,
  webGpuAvailable,
  type WhisperSize,
  type WhisperStatus,
} from './whisper-local';
import { icon } from '../../ui/icons';
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

/** Lo unico que la pantalla necesita de un reconocedor, sea cual sea. */
interface Listener {
  start(locale: string): void | Promise<void>;
  stop(): void | Promise<void>;
}

let listener: Listener | null = null;
let room: KhutbahRoom | null = null;
let running = false;
let meter: MicMeter | NativeMicMeter | null = null;

const PREF_SOURCE = 'hk-khutbah-source';
const PREF_TARGET = 'hk-khutbah-target';
const PREF_MODE = 'hk-khutbah-mode';
const PREF_ROOM = 'hk-khutbah-room';
const PREF_ENGINE = 'hk-khutbah-engine';
const PREF_WHISPER_SIZE = 'hk-khutbah-whisper-size';

/**
 * Cuántas frases se mantienen en la lista.
 *
 * Una jutba de una hora deja varios cientos de tarjetas, y cada frase nueva
 * obliga al móvil a recalcular la columna entera: al final del sermón —justo
 * cuando el imán llega a lo importante— el subtítulo empieza a llegar tarde y
 * la batería se va. Se conservan las últimas; lo de más arriba ya lo ha leído
 * todo el mundo y nadie vuelve a ello en directo.
 */
const MAX_CARDS = 80;

type Engine = 'browser' | 'whisper';

/**
 * Qué motor sale elegido cuando nadie ha tocado nada.
 *
 * En iPhone el reconocimiento del navegador no es de fiar —y es el aparato
 * desde el que probó la certificadora—, así que ahí se empieza directamente
 * por Whisper en el propio teléfono. En Android y escritorio se empieza por
 * el del navegador, que es instantáneo y no descarga nada.
 */
function defaultEngine(): Engine {
  const saved = localStorage.getItem(PREF_ENGINE);
  if (saved === 'browser' || saved === 'whisper') return saved;
  const ua = navigator.userAgent;
  const isApple = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document);
  return isApple || !isSpeechSupported() ? 'whisper' : 'browser';
}

/** Lo que se va leyendo en esta sesión, para guardarlo al parar. */
let session: SavedKhutbah | null = null;

function saveSession(): void {
  if (session && session.segments.length > 0) saveKhutbah(session);
  session = null;
}

const PREF_READER_SCALE = 'hk-reader-scale';
const PREF_READER_ORIG = 'hk-reader-orig';

function readPref(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writePref(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* sin almacenamiento: vale para esta sesión */
  }
}

function stopAll(): void {
  listener?.stop();
  listener = null;
  meter?.stop();
  meter = null;
  room?.close();
  room = null;
  running = false;
  saveSession();
  delete document.documentElement.dataset.dim;
  // Al parar, callar de inmediato: si no, la voz sigue diciendo la cola
  // pendiente después de que el usuario haya pulsado «parar».
  stopSpeaking();
  void disableFridayMode();
}

/** Para todo si está escuchando (al cambiar de idioma se rehacen las pestañas). */
export function stopKhutbah(): void {
  if (running) stopAll();
  delete document.documentElement.dataset.dim;
}

export function renderKhutbah(container: HTMLElement): void {
  if (running) stopAll();
  // Atenuar no puede quedarse puesto en una pantalla nueva sin su botón.
  delete document.documentElement.dataset.dim;

  const savedSource = localStorage.getItem(PREF_SOURCE) ?? SOURCE_LOCALES[0].code;
  const savedTarget = localStorage.getItem(PREF_TARGET) ?? getLang();
  // Enlace de un QR escaneado: entra directo a esa sala, sin teclear nada.
  const invited = new URLSearchParams(location.search).get('room');
  const savedMode = (invited ? 'join' : (localStorage.getItem(PREF_MODE) ?? 'local')) as Mode;
  const savedEngine = defaultEngine();
  // Sin aceleración gráfica el modelo normal va demasiado lento para seguir
  // un sermón, así que en esos aparatos se empieza por el pequeño.
  const savedSize = (localStorage.getItem(PREF_WHISPER_SIZE) ??
    (webGpuAvailable() ? 'base' : 'tiny')) as WhisperSize;
  const savedRoom = invited ?? localStorage.getItem(PREF_ROOM) ?? '';

  container.innerHTML = `
    <h2>${t('khutbahTitle')}</h2>
    <div class="khutbah-hero">
      <div class="lang-pair">
        <label id="lbl-source" ${savedMode === 'join' ? 'hidden' : ''}><span>${t('sourceLang')}</span>
          <select id="sel-source">
            ${SOURCE_LOCALES.map(
              (l) =>
                `<option value="${l.code}" ${l.code === savedSource ? 'selected' : ''}>${l.label}</option>`,
            ).join('')}
          </select>
        </label>
        <span class="lang-arrow" aria-hidden="true">→</span>
        <label><span>${t('targetLang')}</span>
          <select id="sel-target">
            ${TARGET_LANGS.map(
              (l) =>
                `<option value="${l.code}" ${l.code === savedTarget ? 'selected' : ''}>${l.label}</option>`,
            ).join('')}
          </select>
        </label>
      </div>
      <button class="btn listen-hero" id="btn-listen"></button>
      <span class="status-pill" id="status" hidden><span class="dot"></span><span id="status-text"></span></span>
      <p class="note" id="khutbah-note"></p>
    </div>
    <details class="khutbah-controls khutbah-more" ${savedMode !== 'local' ? 'open' : ''}>
      <summary>${t('khutbahMoreOptions')}</summary>
      <label>${t('modeLabel')}
        <select id="sel-mode">
          <option value="local" ${savedMode === 'local' ? 'selected' : ''}>${t('modeLocal')}</option>
          <option value="transmit" ${savedMode === 'transmit' ? 'selected' : ''}>${t('modeTransmit')}</option>
          <option value="join" ${savedMode === 'join' ? 'selected' : ''}>${t('modeJoin')}</option>
        </select>
      </label>
      <input id="inp-room" maxlength="24" placeholder="${t('roomCode')}"
        value="${savedRoom}" ${savedMode === 'local' ? 'hidden' : ''} />
      ${
        speechOutputSupported()
          ? `<label class="notify-row">
               <input type="checkbox" id="chk-voice" ${voiceEnabled() ? 'checked' : ''} />
               <span>${icon('join', 19)}${t('voiceOutput')}</span>
             </label>
             <label id="lbl-voice" ${voiceEnabled() ? '' : 'hidden'}>${t('voicePick')}
               <select id="sel-voice"></select>
             </label>
             <p class="note">${t('voiceOutputHint')}</p>`
          : ''
      }
      <label>${t('engineLabel')}
        <select id="sel-engine">
          <option value="browser" ${savedEngine === 'browser' ? 'selected' : ''}>${t('engineBrowser')}</option>
          <option value="whisper" ${savedEngine === 'whisper' ? 'selected' : ''}>${t('engineWhisper')}</option>
        </select>
      </label>
      <label id="lbl-whisper-size" ${savedEngine === 'whisper' ? '' : 'hidden'}>${t('whisperSize')}
        <select id="sel-whisper-size">
          <option value="tiny" ${savedSize === 'tiny' ? 'selected' : ''}>${t('whisperTiny')}</option>
          <option value="base" ${savedSize === 'base' ? 'selected' : ''}>${t('whisperBase')}</option>
        </select>
      </label>
      <p class="note" id="engine-note" ${savedEngine === 'whisper' ? '' : 'hidden'}>${t('engineWhisperHint')}</p>
      <p class="note">${t('earphonesNote')}</p>
      <button class="btn ghost" id="btn-screen">${icon('guide', 19)}${t('screenMode')}</button>
      <div class="disclaimer">⚠ ${t('khutbahDisclaimer')}</div>
    </details>
    <div class="room-qr" id="room-qr" hidden></div>
    <div class="mic-meter" id="mic-meter" hidden>
      <div class="mic-bar"><span id="mic-fill"></span></div>
      <p class="mic-state" id="mic-state" aria-live="polite"></p>
      <p class="mic-state whisper-state" id="whisper-state" aria-live="polite" hidden></p>
    </div>
    <div class="live-caption" id="live-caption" hidden aria-live="polite"></div>
    <div class="reader-bar" id="reader-bar" hidden>
      <button class="btn ghost" type="button" id="reader-smaller" aria-label="${t('readerTextSmaller')}">A−</button>
      <button class="btn ghost" type="button" id="reader-bigger" aria-label="${t('readerTextBigger')}">A+</button>
      <button class="btn ghost" type="button" id="reader-orig" aria-pressed="false">${t('readerOriginal')}</button>
      <button class="btn ghost" type="button" id="reader-dim" aria-pressed="false">🌙 ${t('readerDim')}</button>
    </div>
    <div class="transcript reader" id="transcript"></div>
    <section class="khutbah-history" id="khutbah-history"></section>
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
  const selEngine = container.querySelector<HTMLSelectElement>('#sel-engine')!;
  const selSize = container.querySelector<HTMLSelectElement>('#sel-whisper-size')!;
  const lblSize = container.querySelector<HTMLElement>('#lbl-whisper-size')!;
  const engineNote = container.querySelector<HTMLElement>('#engine-note')!;

  const engine = (): Engine => selEngine.value as Engine;

  selEngine.addEventListener('change', () => {
    localStorage.setItem(PREF_ENGINE, engine());
    const isWhisper = engine() === 'whisper';
    lblSize.hidden = !isWhisper;
    engineNote.hidden = !isWhisper;
  });
  selSize.addEventListener('change', () =>
    localStorage.setItem(PREF_WHISPER_SIZE, selSize.value),
  );

  const mode = (): Mode => selMode.value as Mode;

  const idleButtonLabel = (): string =>
    mode() === 'transmit'
      ? `${icon('broadcast', 19)}${t('startBroadcast')}`
      : mode() === 'join'
        ? `${icon('join', 19)}${t('joinRoom')}`
        : `${icon('listen', 19)}${t('startListening')}`;

  const setIdleUi = () => {
    container.querySelector('#reader-dim')?.setAttribute('aria-pressed', 'false');
    btn.innerHTML = idleButtonLabel();
    btn.classList.remove('stop');
    status.hidden = true;
    const box = container.querySelector<HTMLElement>('#mic-meter');
    if (box) box.hidden = true;
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
  /**
   * Al elegir idioma se baja ya el modelo de ML Kit (~30 MB por idioma, una
   * sola vez). Si se deja para el viernes, la primera frase del imán espera a
   * la descarga con la sala llena y la antena saturada. Silencioso: en la web
   * o sin conexión no hace nada y se reintenta sola al traducir.
   */
  const prepareModels = (): void => {
    void ensureModels(selSource.value, selTarget.value);
  };

  selSource.addEventListener('change', () => {
    localStorage.setItem(PREF_SOURCE, selSource.value);
    prepareModels();
  });
  selTarget.addEventListener('change', () => {
    localStorage.setItem(PREF_TARGET, selTarget.value);
    prepareModels();
  });
  prepareModels();

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

  container.querySelector<HTMLButtonElement>('#btn-screen')?.addEventListener('click', () => {
    if (screenModeOpen()) {
      closeScreenMode();
      proyectar = null;
      return;
    }
    // El código de sala solo tiene sentido si se está transmitiendo: proyectar
    // un QR de una sala que no existe manda a la comunidad a ninguna parte.
    const code = mode() === 'transmit' && running ? inpRoom.value.trim().toLowerCase() : '';
    proyectar = openScreenMode(code, () => {
      proyectar = null;
    });
  });

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
  globalThis.speechSynthesis?.addEventListener?.('voiceschanged', fillVoices);

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
      interimEl.className = 'seg interim';
      transcript.append(interimEl);
    }
    interimEl.textContent = text;
  };
  const clearInterim = () => {
    interimEl?.remove();
    interimEl = null;
  };

  const caption = container.querySelector<HTMLElement>('#live-caption')!;
  const readerBar = container.querySelector<HTMLElement>('#reader-bar')!;
  const historyBox = container.querySelector<HTMLElement>('#khutbah-history')!;

  // --- Opciones de lectura (Manarah): tamaño, original y atenuar ---
  let scale = Number(readPref(PREF_READER_SCALE)) || 1;
  const applyScale = (): void => {
    scale = Math.min(1.8, Math.max(0.85, Math.round(scale * 100) / 100));
    transcript.style.setProperty('--reader-scale', String(scale));
    writePref(PREF_READER_SCALE, String(scale));
  };
  applyScale();
  container.querySelector('#reader-smaller')!.addEventListener('click', () => {
    scale -= 0.1;
    applyScale();
  });
  container.querySelector('#reader-bigger')!.addEventListener('click', () => {
    scale += 0.1;
    applyScale();
  });
  const origBtn = container.querySelector<HTMLButtonElement>('#reader-orig')!;
  const applyOrig = (show: boolean): void => {
    transcript.classList.toggle('hide-orig', !show);
    origBtn.setAttribute('aria-pressed', String(show));
    writePref(PREF_READER_ORIG, show ? '1' : '0');
  };
  applyOrig(readPref(PREF_READER_ORIG) !== '0');
  origBtn.addEventListener('click', () => applyOrig(origBtn.getAttribute('aria-pressed') !== 'true'));
  const dimBtn = container.querySelector<HTMLButtonElement>('#reader-dim')!;
  dimBtn.addEventListener('click', () => {
    const on = document.documentElement.dataset.dim !== '1';
    if (on) document.documentElement.dataset.dim = '1';
    else delete document.documentElement.dataset.dim;
    dimBtn.setAttribute('aria-pressed', String(on));
  });

  // --- Jutbas anteriores (Baian), guardadas solo en el teléfono ---
  const formatWhen = (iso: string): string => {
    try {
      return new Date(iso).toLocaleString(getLang(), { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return iso;
    }
  };
  const langLabel = (code: string): string =>
    SOURCE_LOCALES.find((l) => l.code === code)?.label ?? TARGET_LANGS.find((l) => l.code === code)?.label ?? code;
  const renderHistory = (): void => {
    if (running) return;
    const list = loadHistory();
    historyBox.hidden = false;
    historyBox.innerHTML = `
      <h3>${t('historyTitle')}</h3>
      ${
        list.length === 0
          ? `<p class="note">${t('historyEmpty')}</p>`
          : `<ul class="history-list">${list
              .map(
                (k) => `
            <li><button type="button" class="history-item" data-id="${safeText(k.id)}">
              <strong>${safeText(formatWhen(k.startedAt))}</strong>
              <span>${safeText(langLabel(k.source))} → ${safeText(langLabel(k.target))}${verseCount(k) ? ` · ◆ ${t('citationQuran')} ×${verseCount(k)}` : ''}</span>
            </button></li>`,
              )
              .join('')}</ul>`
      }`;
    historyBox.querySelectorAll<HTMLButtonElement>('.history-item').forEach((b) =>
      b.addEventListener('click', () => {
        const k = loadHistory().find((x) => x.id === b.dataset.id);
        if (k) openSaved(k);
      }),
    );
  };
  const openSaved = (k: SavedKhutbah): void => {
    historyBox.innerHTML = `
      <div class="history-head">
        <button type="button" class="btn ghost" id="hist-back">← ${t('historyBack')}</button>
        <button type="button" class="btn ghost" id="hist-copy">${t('historyCopy')}</button>
        <button type="button" class="btn ghost danger" id="hist-delete">${t('historyDelete')}</button>
      </div>
      <h3>${safeText(formatWhen(k.startedAt))}</h3>
      <div class="transcript reader saved">${k.segments.map((sg) => segmentCardHtml(sg, k.source, k.target)).join('')}</div>`;
    historyBox.querySelector('.saved')?.setAttribute('style', `--reader-scale:${scale}`);
    historyBox.querySelector('#hist-back')!.addEventListener('click', renderHistory);
    historyBox.querySelector('#hist-delete')!.addEventListener('click', () => {
      deleteKhutbah(k.id);
      renderHistory();
    });
    const copyBtn = historyBox.querySelector<HTMLButtonElement>('#hist-copy')!;
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(historyText(k, t('citationQuran')));
        copyBtn.textContent = `✓ ${t('historyCopied')}`;
      } catch {
        /* sin portapapeles: el texto sigue en pantalla para seleccionarlo */
      }
    });
    historyBox.scrollIntoView({ block: 'start' });
  };
  renderHistory();

  /** Actualiza la proyección, si está abierta. */
  let proyectar: ((texto: string) => void) | null = null;

  const addSegment = (seg: TranslatedSegment) => {
    clearInterim();
    // Subtítulo: la última traducción, grande y fija arriba. Quien no lleve
    // auricular sigue el sermón leyendo, sin tener que buscar en la lista.
    caption.textContent = seg.translation;
    // El subtítulo es lo que lee quien no lleva auricular: si va al urdu o al
    // árabe tiene que ir de derecha a izquierda, mande lo que mande la app.
    caption.lang = baseLang(selTarget.value);
    caption.dir = dirFor(selTarget.value);
    caption.hidden = false;
    proyectar?.(seg.translation);
    // Se lee de arriba abajo, como un texto. Solo se baja sola si quien lee
    // ya estaba al final: si subió a releer algo, no se le arrastra.
    const atEnd = window.innerHeight + window.scrollY >= document.body.scrollHeight - 160;
    transcript.querySelector('.seg.latest')?.classList.remove('latest');
    transcript.insertAdjacentHTML('beforeend', segmentCardHtml(seg, mode() === 'join' ? '' : selSource.value, selTarget.value));
    const card = transcript.lastElementChild;
    card?.classList.add('latest');
    while (transcript.childElementCount > MAX_CARDS) transcript.firstElementChild?.remove();
    readerBar.hidden = false;
    if (atEnd && !container.hidden) card?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    const saved: SavedSegment = toSaved(seg);
    const owner = session;
    owner?.segments.push(saved);
    // Solo la traducción: el árabe original ya lo está diciendo el imán.
    speakTranslation(seg.translation, selTarget.value);

    // Y ahora, la buena. Lo que se acaba de enseñar viene del traductor
    // rápido; el bueno tarda tres o cuatro segundos más y merece la pena
    // esperarlo APARTE, sin retrasar lo que ya se está leyendo. Las aleyas
    // no se tocan: su traducción es la oficial de Tanzil.
    if (!shouldRefine(seg)) return;
    const target = selTarget.value;
    void refineTranslation(seg.original, selSource.value, target).then((better) => {
      if (!better || better === seg.translation) return;
      // El idioma pudo cambiar mientras tanto: no pisar la pantalla con una
      // traducción al idioma de antes.
      if (selTarget.value !== target) return;
      const line = card?.querySelector('.seg-tr');
      if (line) line.textContent = better;
      saved.translation = better;
      // Si ya se paró y se guardó, se vuelve a guardar con la buena.
      if (owner && owner !== session) saveKhutbah(owner);
      // El subtítulo grande solo se corrige si sigue siendo esta frase: si el
      // imán ya va por la siguiente, cambiarla sería peor que dejarla.
      if (caption.textContent === seg.translation) {
        caption.textContent = better;
        proyectar?.(better);
      }
    });
  };

  const errorText = (code: string): string =>
    code === 'roomTaken' ? t('roomTaken') : code === 'roomFull' ? t('roomFull') : t('connectionLost');

  const meterBox = container.querySelector<HTMLElement>('#mic-meter')!;
  const meterFill = container.querySelector<HTMLElement>('#mic-fill')!;
  const meterState = container.querySelector<HTMLElement>('#mic-state')!;

  /**
   * Lo que ve quien está sentado en la sala.
   *
   * Hay tres fallos distintos que antes se veían exactamente igual (una
   * pantalla en blanco): el micrófono no oye nada, oye pero el sermón no es
   * en el idioma elegido, o falta un permiso. Aquí se separan, y cada uno
   * dice qué hacer. `noMatch` manda sobre el nivel: si está entrando sonido
   * de sobra y aun así no sale ni una palabra, el problema es el idioma.
   */
  let lastReading: MicReading = { level: 0, state: 'unavailable' };
  let noMatch = false;

  const sourceLabel = (): string =>
    SOURCE_LOCALES.find((l) => l.code === selSource.value)?.label ?? selSource.value;

  const paintMeter = () => {
    meterFill.style.width = `${Math.round(lastReading.level * 100)}%`;
    // Si ya no entra sonido, el aviso del idioma sobra: se calló el imán, o
    // se acabó el sermón. Decir «oigo una voz» cuando no se oye nada es
    // justo el tipo de mensaje que hace desconfiar de todos los demás.
    const wrongLanguage = noMatch && lastReading.state !== 'silence';
    meterBox.dataset.state = wrongLanguage ? 'nomatch' : lastReading.state;
    meterState.textContent = wrongLanguage
      ? `${t('micNoMatch')} ${sourceLabel()}. ${t('micNoMatchHint')}`
      : lastReading.state === 'good'
        ? t('micGood')
        : lastReading.state === 'weak'
          ? t('micWeak')
          : lastReading.state === 'silence'
            ? t('micSilence')
            : t('micUnavailable');
  };

  /**
   * Lo que pasa con el modelo, dicho en la pantalla.
   *
   * La primera vez hay que descargar ochenta megas, y sin decirlo la
   * aplicación parece colgada justo cuando el imán está subiendo al minbar.
   */
  const whisperState = container.querySelector<HTMLElement>('#whisper-state')!;

  const showWhisperStatus = (s: WhisperStatus): void => {
    whisperState.hidden = false;
    if (s.kind === 'loading') {
      meterBox.hidden = false;
      whisperState.textContent = `${t('whisperLoading')} · ${s.pct}%`;
      return;
    }
    if (s.kind === 'ready') {
      const how = s.device === 'webgpu' ? t('whisperOnGpu') : t('whisperOnCpu');
      whisperState.textContent = `${t('whisperReady')} — ${how}`;
      return;
    }
    if (s.kind === 'thinking') {
      whisperState.textContent = t('whisperThinking');
      return;
    }
    whisperState.hidden = true;
  };

  const startListener = (onSentence: (text: string) => void) => {
    const callbacks = {
      onSentence,
      onInterim: showInterim,
      onNoMatch: () => {
        noMatch = true;
        paintMeter();
      },
      onHeard: () => {
        if (!noMatch) return;
        noMatch = false;
        paintMeter();
      },
      onError: (err: string) => {
        note.textContent =
          err === 'unsupported'
            ? t('speechUnsupported')
            : err === 'denied'
              ? t('micDenied')
              : err === 'network'
                ? t('errNetwork')
                : err === 'audioCapture'
                  ? t('errAudioCapture')
                  : err === 'langUnsupported'
                    ? t('errLangUnsupported')
                    : err === 'start'
                      ? t('errStart')
                      : `⚠ ${err}`;
      },
    };

    // Tres motores, una sola interfaz: el del teléfono dentro de la app, el
    // del navegador, y Whisper ejecutándose aquí mismo. La pantalla no
    // necesita saber en cuál está.
    listener =
      engine() === 'whisper'
        ? new WhisperKhutbahListener(callbacks, showWhisperStatus, selSize.value as WhisperSize)
        : isNative()
          ? new NativeKhutbahListener(callbacks)
          : new KhutbahListener(callbacks);
    void listener?.start(selSource.value);

    // El medidor va aparte del reconocedor a propósito: es lo único que
    // sigue informando cuando el reconocedor no devuelve nada.
    noMatch = false;
    meterBox.hidden = false;
    paintMeter();
    // En la app nativa, el nivel lo da el propio reconocedor: abrir el
    // micrófono otra vez desde aquí hace que Android lo deje sordo.
    meter = listener instanceof NativeKhutbahListener ? new NativeMicMeter(speechPlugin()) : new MicMeter();
    void meter.start((reading) => {
      lastReading = reading;
      paintMeter();
    });
  };

  const setRunningUi = (statusLabel: string) => {
    if (!running) {
      // Quien se une a una sala no elige el idioma del imán: no se sabe.
      session = { id: `k${Date.now()}`, startedAt: new Date().toISOString(), source: mode() === 'join' ? '' : selSource.value, target: selTarget.value, segments: [] };
      clearInterim();
      transcript.innerHTML = '';
      historyBox.hidden = true;
    }
    running = true;
    void enableFridayMode();
    note.textContent = `🔆 ${t('fridayMode')}`;
    btn.innerHTML = `${icon('stop', 19)}${t('stopListening')}`;
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
      renderHistory();
    },
    onClose: () => {
      note.textContent = `⚠ ${t('connectionLost')}`;
      stopAll();
      setIdleUi();
      renderHistory();
    },
  });

  btn.addEventListener('click', () => {
    if (running) {
      stopAll();
      clearInterim();
      setIdleUi();
      note.textContent = '';
      renderHistory();
      return;
    }

    const currentMode = mode();
    if (currentMode === 'local') {
      startListener(async (text) => {
        try {
          addSegment(await translateSegmentSmart(text, selSource.value, selTarget.value));
        } catch {
          note.textContent = t('backendUnavailable');
          session?.segments.push({ kind: 'speech', translation: '', original: text, verified: false });
          transcript.insertAdjacentHTML(
            'beforeend',
            `<article class="seg"><p class="orig">${safeText(text)}</p></article>`,
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
