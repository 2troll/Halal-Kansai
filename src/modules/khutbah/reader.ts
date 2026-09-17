/**
 * Cómo se pinta cada frase de la jutba: el «lector».
 *
 * Inspirado en Manarah (revisada en el Nothing, 17/09/2026): lectura de
 * arriba abajo como un texto, aleyas en su propia tarjeta con la referencia
 * encima y la fuente debajo, y —lo más importante— si parece Corán pero no se
 * ha podido verificar, se enseña tal como se recitó y NO se traduce. Una
 * traducción automática presentada como palabra de Allah es justo lo que esta
 * app no puede hacer nunca.
 */
import { safeText } from '../escape';
import { langAttrs } from '../text-direction';
import { t } from '../../i18n';
import type { TranslatedSegment } from './translate';

export function segmentCardHtml(seg: TranslatedSegment, source: string, target: string): string {
  const tr = langAttrs(target);
  const or = langAttrs(source);

  if (seg.kind === 'quran') {
    if (!(seg.verified && seg.reference)) {
      return `
      <article class="seg quran possible">
        <div class="seg-label">◇ ${t('possibleQuran')}</div>
        <p class="arabic"${or}>${safeText(seg.original)}</p>
      </article>`;
    }
    const source2 =
      seg.translationSource === 'tanzil' ? 'Tanzil.net' : `Tanzil.net · ${t('translationUnofficial')}`;
    return `
      <article class="seg quran">
        <div class="seg-label">◆ ${t('citationQuran')} · ${safeText(seg.reference)}</div>
        ${seg.arabicVerified ? `<p class="arabic" lang="ar" dir="rtl">${safeText(seg.arabicVerified)}</p>` : ''}
        <blockquote class="seg-tr"${tr}>${safeText(seg.translation)}</blockquote>
        <div class="seg-source">${source2}</div>
      </article>`;
  }

  if (seg.kind === 'hadith' || seg.kind === 'dua') {
    return `
      <article class="seg ${seg.kind}">
        <div class="seg-label">${t(seg.kind === 'hadith' ? 'citationHadith' : 'citationDua')}</div>
        <p class="seg-tr"${tr}>${safeText(seg.translation)}</p>
        <p class="orig"${or}>${safeText(seg.original)}</p>
      </article>`;
  }

  return `
    <article class="seg">
      <p class="seg-tr"${tr}>${safeText(seg.translation)}</p>
      <p class="orig"${or}>${safeText(seg.original)}</p>
    </article>`;
}
