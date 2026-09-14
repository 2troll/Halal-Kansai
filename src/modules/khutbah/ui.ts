import { KhutbahListener, SOURCE_LOCALES, TARGET_LANGS, isSpeechSupported } from './speech';
import { KhutbahRoom } from './room';
import { refineTranslation, type TranslatedSegment } from './translate';
import { translateSegmentSmart, ensureModels } from './translate-ondevice';
import { disableFridayMode, enableFridayMode } from './wakelock';
import { t, getLang } from '../../i18n';
import { qrSvg } from './qr';
import { closeScreenMode, openScreenMode, screenModeOpen } from './screen';
import { isNative } from '../../backend';
import { NativeKhutbahListener } from './speech-native';
import { MicMeter, type MicReading } from './mic-level';
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
let meter: MicMeter | null = null;

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
  meter?.stop();
  meter = null;
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
    <div class="disclaimer">⚠ ${t('khutbahDisclaimer')}</div>
    <div class="khutbah-controls">
      <label>${t('modeLabel')}
        <select id="sel-mode">
          <option value="local" ${savedMode === 'local' ? 'selected' : ''}>${t('modeLocal')}</option>
          <option value="transmit" ${savedMode === 'transmit' ? 'selected' : ''}>${t('modeTransmit')}</option>
          <option value="join" ${savedMode === 'join' ? 'selected' : ''}>${t('modeJoin')}</option>
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
      <button class="btn" id="btn-listen"></button>
      <button class="btn ghost" id="btn-screen">${icon('guide', 19)}${t('screenMode')}</button>
      <span class="status-pill" id="status" hidden><span class="dot"></span><span id="status-text"></span></span>
      <p class="note" id="khutbah-note"></p>
    </div>
    <div class="room-qr" id="room-qr" hidden></div>
    <div class="mic-meter" id="mic-meter" hidden>
      <div class="mic-bar"><span id="mic-fill"></span></div>
      <p class="mic-state" id="mic-state" aria-live="polite"></p>
      <p class="mic-state whisper-state" id="whisper-state" aria-live="polite" hidden></p>
    </div>
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

  /** Actualiza la proyección, si está abierta. */
  let proyectar: ((texto: string) => void) | null = null;

  const addSegment = (seg: TranslatedSegment) => {
    clearInterim();
    // Subtítulo: la última traducción, grande y fija arriba. Quien no lleve
    // auricular sigue el sermón leyendo, sin tener que buscar en la lista.
    caption.textContent = seg.translation;
    caption.hidden = false;
    proyectar?.(seg.translation);
    transcript.insertAdjacentHTML('afterbegin', segmentCard(seg));
    const card = transcript.firstElementChild;
    while (transcript.childElementCount > MAX_CARDS) transcript.lastElementChild?.remove();
    // Solo la traducción: el árabe original ya lo está diciendo el imán.
    speakTranslation(seg.translation, selTarget.value);

    // Y ahora, la buena. Lo que se acaba de enseñar viene del traductor
    // rápido; el bueno tarda tres o cuatro segundos más y merece la pena
    // esperarlo APARTE, sin retrasar lo que ya se está leyendo. Las aleyas
    // no se tocan: su traducción es la oficial de Tanzil.
    // Ni tampoco si la tradujo el propio móvil: pedir refinado al servidor por
    // cada frase son cientos de peticiones en una jutba de una hora, y devuelve
    // la app a depender de la red justo de lo que queríamos librarla. Con ML Kit
    // funcionando, el sermón entero se traduce sin salir del aparato.
    if (
      seg.kind === 'quran' ||
      seg.translationSource === 'llm' ||
      seg.translationSource === 'ondevice'
    ) {
      return;
    }
    const target = selTarget.value;
    void refineTranslation(seg.original, selSource.value, target).then((better) => {
      if (!better || better === seg.translation) return;
      // El idioma pudo cambiar mientras tanto: no pisar la pantalla con una
      // traducción al idioma de antes.
      if (selTarget.value !== target) return;
      const line = card?.querySelector('div');
      if (line) line.textContent = better;
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
    meter = new MicMeter();
    void meter.start((reading) => {
      lastReading = reading;
      paintMeter();
    });
  };

  const setRunningUi = (statusLabel: string) => {
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
          addSegment(await translateSegmentSmart(text, selSource.value, selTarget.value));
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
