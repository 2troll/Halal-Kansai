/**
 * Las secciones de Ajustes que no son apariencia: permisos, acerca de,
 * legal y créditos. Plegadas por defecto: quien abre Ajustes casi siempre va
 * a cambiar el tema, y el resto no debe empujarlo fuera de la pantalla.
 */
import { t, type Dict } from '../../i18n';
import { AUTHOR, CONTACT_EMAIL, CREDITS, PRIVACY_URL, SOURCE_URL, versionLabel } from './about';
import { PERM_KINDS, checkPermission, requestPermission, type PermKind, type PermState } from './permissions';

const PERM_TEXT: Record<PermKind, { name: keyof Dict; why: keyof Dict; icon: string }> = {
  location: { name: 'permLocation', why: 'permLocationWhy', icon: '📍' },
  camera: { name: 'permCamera', why: 'permCameraWhy', icon: '📷' },
  microphone: { name: 'permMic', why: 'permMicWhy', icon: '🎙️' },
  notifications: { name: 'permNotifications', why: 'permNotificationsWhy', icon: '🔔' },
};

const STATE_TEXT: Record<PermState, keyof Dict> = {
  granted: 'permGranted',
  denied: 'permDenied',
  prompt: 'permPrompt',
  unknown: 'permUnknown',
};

export function settingsSectionsHtml(): string {
  return `
    <details class="settings-section" data-section="permissions">
      <summary>${t('permsTitle')}</summary>
      <p class="sheet-sub">${t('permsHint')}</p>
      <ul class="perm-list">
        ${PERM_KINDS.map(
          (kind) => `
          <li class="perm" data-perm="${kind}">
            <span class="perm-icon" aria-hidden="true">${PERM_TEXT[kind].icon}</span>
            <div class="perm-body">
              <strong>${t(PERM_TEXT[kind].name)}</strong>
              <span class="perm-why">${t(PERM_TEXT[kind].why)}</span>
            </div>
            <div class="perm-side">
              <span class="perm-state" data-state="unknown">…</span>
              <button class="btn ghost perm-ask" type="button" hidden>${t('permAsk')}</button>
            </div>
          </li>`,
        ).join('')}
      </ul>
      <p class="note perm-help" hidden>${t('permDeniedHelp')}</p>
    </details>

    <details class="settings-section" data-section="about">
      <summary>${t('aboutTitle')}</summary>
      <dl class="about-facts">
        <dt>${t('aboutVersion')}</dt><dd id="about-version">${__APP_VERSION__}</dd>
        <dt>${t('aboutMadeBy')}</dt><dd>${AUTHOR}</dd>
        <dt>${t('aboutContact')}</dt><dd><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></dd>
        <dt>${t('aboutSource')}</dt><dd><a href="${SOURCE_URL}" target="_blank" rel="noopener">GitHub</a></dd>
      </dl>
      <h4>${t('aboutWhyTitle')}</h4>
      <p class="about-why">${t('aboutWhy')}</p>
      <p class="note">${t('aboutNonProfit')}</p>
    </details>

    <details class="settings-section" data-section="legal">
      <summary>${t('legalTitle')}</summary>
      <p><a class="btn ghost" href="${PRIVACY_URL}" target="_blank" rel="noopener">${t('legalPrivacy')} ↗</a></p>
      <ul class="legal-list">
        <li>${t('legalReligious')}</li>
        <li>${t('legalHalal')}</li>
        <li>${t('legalTimes')}</li>
        <li>${t('legalPlaces')}</li>
      </ul>
    </details>

    <details class="settings-section" data-section="credits">
      <summary>${t('creditsTitle')}</summary>
      <ul class="credit-list" dir="ltr">
        ${CREDITS.map(
          (c) => `<li><a href="${c.url}" target="_blank" rel="noopener">${c.name}</a> — ${c.what} · <span class="licence">${c.licence}</span></li>`,
        ).join('')}
      </ul>
    </details>
  `;
}

function paintPerm(li: HTMLElement, state: PermState): void {
  const label = li.querySelector<HTMLElement>('.perm-state')!;
  label.dataset.state = state;
  label.textContent = t(STATE_TEXT[state]);
  // Solo se ofrece «Permitir» cuando pedirlo sirve: si está bloqueado, el
  // sistema ya no vuelve a preguntar y el botón no haría nada.
  li.querySelector<HTMLButtonElement>('.perm-ask')!.hidden = state !== 'prompt';
}

export function bindSettingsSections(root: HTMLElement): void {
  void versionLabel().then((v) => {
    const el = root.querySelector('#about-version');
    if (el) el.textContent = v;
  });

  const permsBox = root.querySelector<HTMLDetailsElement>('[data-section="permissions"]')!;
  const help = root.querySelector<HTMLElement>('.perm-help')!;
  const refresh = async (): Promise<void> => {
    const states = await Promise.all(
      PERM_KINDS.map(async (kind) => {
        const state = await checkPermission(kind);
        paintPerm(root.querySelector<HTMLElement>(`[data-perm="${kind}"]`)!, state);
        return state;
      }),
    );
    help.hidden = !states.includes('denied');
  };
  // Se leen al abrir, no al montar: así están al día si se cambiaron fuera.
  permsBox.addEventListener('toggle', () => {
    if (permsBox.open) void refresh();
  });

  root.querySelectorAll<HTMLElement>('[data-perm]').forEach((li) => {
    li.querySelector<HTMLButtonElement>('.perm-ask')!.addEventListener('click', async (ev) => {
      const btn = ev.currentTarget as HTMLButtonElement;
      btn.disabled = true;
      paintPerm(li, await requestPermission(li.dataset.perm as PermKind));
      btn.disabled = false;
      void refresh();
    });
  });
}
