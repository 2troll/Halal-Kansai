import { t } from '../../i18n';

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
  `;
}
