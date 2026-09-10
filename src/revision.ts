/**
 * Hoja de revisión de las 49 reglas.
 *
 * Existe por un compromiso escrito: se le pidió a una organización
 * certificadora (JHCPO) que revise los dictámenes, y lo que se le puede
 * enseñar no puede ser una app donde las reglas salen de una en una dentro de
 * un desplegable. Para revisar 49 dictámenes hace falta leerlos de corrido,
 * imprimirlos y anotarlos.
 *
 * Decisiones de esta página, todas pensadas para quien la va a revisar:
 *
 * - **En japonés por defecto.** Quien revisa es una organización japonesa.
 * - **Numeradas.** Para que una corrección se pueda referir a «la 23» en un
 *   correo, sin transcribir el término.
 * - **Agrupadas por dictamen**, no por categoría: lo primero que discute un
 *   revisor es si algo prohibido debería ser dudoso, o al revés.
 * - **Se imprime bien.** Mucha gente revisa sobre papel, con bolígrafo.
 * - **Los tres principios arriba.** Son lo que se comprometió por escrito, y
 *   quien revisa tiene que poder juzgar las reglas contra ellos.
 */
import './styles/main.css';
import './styles/themes.css';
import './styles/refined.css';
import './styles/revision.css';
import { RULES, type Status } from './modules/ingredients/rules';
import { ruleText } from './modules/ingredients/localize';
import { setLang, t, type Lang } from './i18n';
import { applyAppearance } from './modules/appearance';

const IDIOMAS: Lang[] = ['ja', 'en', 'es', 'ar'];

const ORDEN: Status[] = ['haram', 'mushbooh', 'halal'];

const TITULO: Record<Status, () => string> = {
  haram: () => t('statusHaram'),
  mushbooh: () => t('statusMushbooh'),
  halal: () => t('statusHalal'),
};

function idiomaActual(): Lang {
  const url = new URLSearchParams(location.search).get('lang');
  return (IDIOMAS as string[]).includes(url ?? '') ? (url as Lang) : 'ja';
}

function escapar(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function render(): void {
  const lang = idiomaActual();
  setLang(lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  // La numeración es estable: se asigna sobre el orden de la base, no sobre
  // el orden en que se pinta. Si mañana se reordena la presentación, «la 23»
  // sigue siendo la misma regla en el correo de alguien.
  const numeradas = RULES.map((rule, i) => ({ rule, numero: i + 1 }));

  document.getElementById('revision')!.innerHTML = `
    <header class="rev-head">
      <h1>${t('revisionTitle')}</h1>
      <p class="rev-sub">${t('revisionIntro')}</p>

      <ol class="rev-principios">
        <li><strong>${t('revisionP1T')}</strong> ${t('revisionP1')}</li>
        <li><strong>${t('revisionP2T')}</strong> ${t('revisionP2')}</li>
        <li><strong>${t('revisionP3T')}</strong> ${t('revisionP3')}</li>
      </ol>

      <nav class="rev-idiomas no-print">
        ${IDIOMAS.map(
          (l) =>
            `<a href="?lang=${l}" ${l === lang ? 'aria-current="page"' : ''}>${l.toUpperCase()}</a>`,
        ).join('')}
        <button onclick="window.print()">${t('revisionPrint')}</button>
      </nav>
    </header>

    ${ORDEN.map((estado) => {
      const grupo = numeradas.filter(({ rule }) => rule.status === estado);
      if (grupo.length === 0) return '';
      return `
        <section class="rev-grupo ${estado}">
          <h2>${TITULO[estado]()} <span class="rev-cuenta">${grupo.length}</span></h2>
          <table class="rev-tabla">
            <thead>
              <tr>
                <th class="rev-num">#</th>
                <th>${t('revisionTerms')}</th>
                <th>${t('revisionName')}</th>
                <th>${t('revisionWhy')}</th>
              </tr>
            </thead>
            <tbody>
              ${grupo
                .map(
                  ({ rule, numero }) => `
                <tr id="regla-${numero}">
                  <td class="rev-num">${numero}</td>
                  <td lang="ja" class="rev-terminos">${rule.terms.map((x) => escapar(x)).join('<br>')}</td>
                  <td>${escapar(ruleText(rule.id, rule.label, 'label', lang))}</td>
                  <td>${escapar(ruleText(rule.id, rule.why, 'why', lang))}</td>
                </tr>`,
                )
                .join('')}
            </tbody>
          </table>
        </section>`;
    }).join('')}

    <footer class="rev-pie">
      <p>${t('revisionFooter')}</p>
      <p class="rev-contacto">pagos.euros73@gmail.com</p>
    </footer>
  `;
}

applyAppearance();
render();
