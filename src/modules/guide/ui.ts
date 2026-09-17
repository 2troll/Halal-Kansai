import { getLang, t } from '../../i18n';
import { MESSAGE_MIN, submitFeedback, type FeedbackKind } from './feedback';
import { DONATE_URL, FEEDBACK_EMAIL } from '../../config';
import { isNative } from '../../backend';
import { icon } from '../../ui/icons';

export function renderGuide(container: HTMLElement): void {
  const sections = [
    { h: t('guideSalatH'), p: t('guideSalatP') },
    { h: t('guideHalalH'), p: t('guideHalalP') },
    { h: t('guideJummahH'), p: t('guideJummahP') },
    { h: t('guideAboutH'), p: t('guideAboutP') },
  ];

  container.innerHTML = `
    <h2>${t('guideTitle')}</h2>
    ${feedbackCardHtml()}
    ${donateCardHtml()}
    ${sections
      .map(
        (s) => `
      <div class="guide-card">
        <h3>${s.h}</h3>
        <p>${s.p}</p>
      </div>`,
      )
      .join('')}

    <details class="diag">
      <summary>${t('diagTitle')}</summary>
      <p class="note">${t('diagIntro')}</p>
      <button class="btn" id="diag-run">${t('diagRun')}</button>
      <div id="diag-out"></div>
    </details>
  `;

  wireFeedback(container);

  container.querySelector<HTMLButtonElement>('#diag-run')!.addEventListener('click', () => {
    void (async () => {
      const salida = container.querySelector<HTMLElement>('#diag-out')!;
      salida.innerHTML = `<p class="note">${t('loading')}</p>`;

      const { ejecutarDiagnostico } = await import('./diagnostics');
      const idiomaVoz = localStorage.getItem('hk-khutbah-target') ?? getLang();
      const filas = await ejecutarDiagnostico(idiomaVoz);

      const ICONO = { ok: '●', aviso: '●', fallo: '●' };
      salida.innerHTML = `
        <ul class="diag-list">
          ${filas
            .map(
              (f) => `
            <li class="diag-${f.estado}">
              <span class="diag-dot" aria-hidden="true">${ICONO[f.estado]}</span>
              <span class="diag-name">${f.nombre}</span>
              <span class="diag-detail">${f.detalle}</span>
            </li>`,
            )
            .join('')}
        </ul>
        <button class="btn ghost" id="diag-copy">${t('diagCopy')}</button>`;

      // Copiar al portapapeles: si hay que contarle a alguien qué falla, se
      // pega el diagnóstico entero en vez de describirlo de memoria.
      salida.querySelector<HTMLButtonElement>('#diag-copy')!.addEventListener('click', () => {
        const texto = filas.map((f) => `${f.estado.toUpperCase()} · ${f.nombre}: ${f.detalle}`).join('\n');
        void navigator.clipboard.writeText(texto);
      });
    })();
  });
}

const KINDS: Array<[FeedbackKind, Parameters<typeof t>[0]]> = [
  ['bug', 'fbKindBug'],
  ['idea', 'fbKindIdea'],
  ['data', 'fbKindData'],
  ['other', 'fbKindOther'],
];

/**
 * Opiniones: arriba del todo de la guía, plegada para no empujar el contenido.
 * Sin correo ni nombre: lo que se envía es el mensaje y el contexto técnico
 * (idioma, plataforma, versión). Ver server/src/feedback.ts.
 */
function feedbackCardHtml(): string {
  return `
    <details class="feedback-card" id="feedback">
      <summary>💬 ${t('fbTitle')}</summary>
      <p class="note">${t('fbIntro')}</p>
      <form class="suggest-form" id="feedback-form">
        <label>${t('fbKind')}
          <select name="kind">
            ${KINDS.map(([v, k]) => `<option value="${v}">${t(k)}</option>`).join('')}
          </select>
        </label>
        <label>${t('fbRating')}
          <select name="rating">
            <option value="">${t('fbRatingNone')}</option>
            ${[5, 4, 3, 2, 1].map((n) => `<option value="${n}">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</option>`).join('')}
          </select>
        </label>
        <label>${t('fbMessage')}
          <textarea name="message" rows="5" maxlength="1000" required></textarea>
        </label>
        <button class="btn" type="submit">${t('fbSend')}</button>
        <p class="note" id="feedback-note" role="status"></p>
        <a class="btn ghost" id="feedback-mail" hidden>✉️ ${t('fbByEmail')}</a>
      </form>
    </details>`;
}

function wireFeedback(container: HTMLElement): void {
  const form = container.querySelector<HTMLFormElement>('#feedback-form')!;
  const note = container.querySelector<HTMLElement>('#feedback-note')!;
  const button = form.querySelector<HTMLButtonElement>('button[type=submit]')!;

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const data = new FormData(form);
    const message = String(data.get('message') ?? '').trim();
    if (message.length < MESSAGE_MIN) {
      note.textContent = t('fbTooShort');
      return;
    }
    const rating = Number(data.get('rating'));
    button.disabled = true;
    void submitFeedback({
      kind: String(data.get('kind')) as FeedbackKind,
      message,
      rating: rating >= 1 && rating <= 5 ? rating : undefined,
      lang: getLang(),
      tab: 'guide',
    })
      .then((result) => {
        note.textContent = result === 'sent' ? t('fbSent') : result === 'queued' ? t('fbQueued') : t('fbError');
        // Sin conexión (o con una VPN/bloqueador que corta la app) el mensaje
        // se queda en la cola del móvil. Por si tarda en salir, se ofrece
        // mandarlo ya por el correo del teléfono, que sí suele tener red.
        const mail = container.querySelector<HTMLAnchorElement>('#feedback-mail')!;
        if (result !== 'sent') {
          const subject = `Halal Kansai — ${String(data.get('kind'))}`;
          const body = `${message}\n\n(${getLang()} · v${__APP_VERSION__})`;
          mail.href = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          mail.hidden = false;
        } else {
          mail.hidden = true;
        }
        if (result !== 'rejected') form.reset();
      })
      .finally(() => {
        button.disabled = false;
      });
  });
}

/** Tarjeta de apoyo: solo en la web y con enlace (ver config.ts). */
function donateCardHtml(): string {
  if (DONATE_URL === '' || isNative()) return '';
  return `
    <div class="donate-card">
      <div>
        <h3>${t('donateTitle')}</h3>
        <p>${t('donateText')}</p>
      </div>
      <a class="btn" href="${DONATE_URL}" target="_blank" rel="noopener">${icon('heart', 18)}${t('donate')}</a>
    </div>`;
}

