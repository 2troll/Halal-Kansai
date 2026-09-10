import { getLang, t } from '../../i18n';

export function renderGuide(container: HTMLElement): void {
  const sections = [
    { h: t('guideSalatH'), p: t('guideSalatP') },
    { h: t('guideHalalH'), p: t('guideHalalP') },
    { h: t('guideJummahH'), p: t('guideJummahP') },
    { h: t('guideAboutH'), p: t('guideAboutP') },
  ];

  container.innerHTML = `
    <h2>${t('guideTitle')}</h2>
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
