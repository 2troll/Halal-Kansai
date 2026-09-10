/**
 * La ficha de un producto encontrado en la base de konbini.
 *
 * Lo que enseña esta tarjeta lo manda el contrato de datos (§6), y cada punto
 * está ahí por un motivo:
 *
 * - **Fuente y fecha, siempre.** Un producto comprobado hace ocho meses no es
 *   lo mismo que uno de la semana pasada, y un color solo no dice cuál es cuál.
 * - **`ambiguous` no se pinta de rojo.** Significa "falta información", no
 *   "rechazado". Va en ámbar, junto al término que hay que preguntar.
 * - **El alcance del certificado se enseña entero.** Un certificado cubre un
 *   SKU y una planta; la versión de exportación puede estar certificada y la
 *   doméstica no.
 * - **El aviso legal va en cada ficha**, no en un pie de página: esto informa
 *   sobre ingredientes declarados en la etiqueta y no certifica nada.
 */

import { getLang, t } from '../../i18n';
import { isReasonCode, reasonLabel, reasonStatus, reasonWhy } from '../ingredients/reason-codes';
import type {
  Chain,
  FeedStatus,
  KonbiniHit,
  KonbiniProduct,
  ProductSource,
  ProductStatus,
} from '../ingredients/konbini';

/** Nombre comercial de la cadena. No se traduce: es el rótulo de la tienda. */
const CHAIN_NAME: Record<Chain, string> = {
  seven_eleven: '7-Eleven',
  lawson: 'Lawson',
  familymart: 'FamilyMart',
  ministop: 'Ministop',
  daily_yamazaki: 'Daily Yamazaki',
  other: '',
};

/**
 * Clase visual por estado. `ambiguous` y `expired` comparten el ámbar del
 * lector de etiquetas; solo `excluded` es rojo.
 */
const STATUS_CLASS: Record<ProductStatus, string> = {
  certified: '',
  manufacturer_confirmed: '',
  label_clear: '',
  ambiguous: 'mushbooh',
  excluded: 'haram',
  unknown: 'nothing-recognised',
  expired: 'mushbooh',
};

const STATUS_TITLE: Record<ProductStatus, () => string> = {
  certified: () => t('konbiniCertified'),
  manufacturer_confirmed: () => t('konbiniConfirmed'),
  label_clear: () => t('konbiniLabelClear'),
  ambiguous: () => t('konbiniAmbiguous'),
  excluded: () => t('konbiniExcluded'),
  unknown: () => t('konbiniUnknown'),
  expired: () => t('konbiniExpired'),
};

const STATUS_BODY: Record<ProductStatus, () => string> = {
  certified: () => t('konbiniCertifiedBody'),
  manufacturer_confirmed: () => t('konbiniConfirmedBody'),
  label_clear: () => t('konbiniLabelClearBody'),
  ambiguous: () => t('konbiniAmbiguousBody'),
  excluded: () => t('konbiniExcludedBody'),
  unknown: () => t('konbiniUnknownBody'),
  expired: () => t('konbiniExpiredBody'),
};

const SOURCE_LABEL: Record<ProductSource, () => string> = {
  certificate: () => t('konbiniSourceCertificate'),
  manufacturer_reply: () => t('konbiniSourceReply'),
  label: () => t('konbiniSourceLabel'),
  allergen_table: () => t('konbiniSourceAllergen'),
  none: () => t('konbiniSourceNone'),
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/**
 * Fecha legible en el idioma de la app.
 *
 * Si la marca de tiempo no se entiende se enseña cruda: una fecha rara es
 * información; un hueco en blanco donde debería ir la fecha, no.
 */
function humanDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const lang = getLang();
  return date.toLocaleDateString(lang === 'ar' ? 'ar' : lang, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const TERM_ICON: Record<string, string> = { haram: '⛔', mushbooh: '⚠️', halal: '✅' };

/** Tarjeta de un `reason_code`: qué término es y por qué está marcado. */
function codeHtml(code: string): string {
  const lang = getLang();
  const known = isReasonCode(code);
  const why = known ? reasonWhy(code, lang) : t('konbiniUnknownCode');
  // Sin regla que lo cubra, ámbar: "hay algo que preguntar" nunca sobra.
  const status = reasonStatus(code) ?? 'mushbooh';
  return `
    <article class="finding ${status}">
      <h3><span class="icon" aria-hidden="true">${TERM_ICON[status]}</span>
        ${escapeHtml(reasonLabel(code, lang))}
        <code>${escapeHtml(code)}</code>
      </h3>
      <p>${escapeHtml(why)}</p>
    </article>`;
}

/** Bloque del certificado. El alcance es obligatorio y por eso va entero. */
function certificationHtml(product: KonbiniProduct): string {
  const cert = product.certification;
  if (!cert) return '';
  const id = cert.certificate_id ? ` · ${escapeHtml(cert.certificate_id)}` : '';
  return `
    <p class="cert-note certified">
      <strong>${t('konbiniCertBody')}:</strong> ${escapeHtml(cert.body)}${id}<br>
      <strong>${t('konbiniCertScope')}:</strong> ${escapeHtml(cert.scope)}<br>
      <strong>${t('konbiniCertExpires')}:</strong> ${escapeHtml(humanDate(cert.expires_at))}
    </p>`;
}

/** Aviso de frescura: solo cuando lo que se enseña no viene de la red. */
function freshnessHtml(freshness: FeedStatus, generatedAt: string): string {
  if (freshness === 'fresh') return '';
  const text =
    freshness === 'needs-update'
      ? t('konbiniNeedsUpdate')
      : `${t('konbiniOfflineCopy')} · ${humanDate(generatedAt)}`;
  return `<p class="note">${escapeHtml(text)}</p>`;
}

/** La ficha completa. Devuelve HTML; quien llama lo inserta y lo enfoca. */
export function konbiniCardHtml(hit: KonbiniHit): string {
  const { product, feed, freshness } = hit;
  const chain = CHAIN_NAME[product.chain];
  const meta = [
    chain,
    product.manufacturer ?? '',
    product.factory_code ? `製造所固有記号 ${product.factory_code}` : '',
  ]
    .filter(Boolean)
    .map((s) => escapeHtml(s))
    .join(' · ');

  return `
    <section class="verdict ${STATUS_CLASS[product.status]}">
      <p class="label">${t('konbiniFound')}</p>
      <p class="big">${STATUS_TITLE[product.status]()}</p>
      <p class="small">${STATUS_BODY[product.status]()}</p>
    </section>

    <p class="konbini-id">
      <strong dir="auto" lang="ja">${escapeHtml(product.name)}</strong><br>
      <code>${escapeHtml(product.jan)}</code>${meta ? ` · ${meta}` : ''}
    </p>

    ${certificationHtml(product)}

    <p class="note strong">
      ${t('konbiniCheckedOn')} ${escapeHtml(humanDate(product.checked_at))} ·
      ${SOURCE_LABEL[product.source]()}
    </p>

    ${
      product.reason_codes.length > 0
        ? `<h3 class="section-h">${t('konbiniTerms')}</h3>
           ${product.reason_codes.map(codeHtml).join('')}`
        : ''
    }

    ${freshnessHtml(freshness, feed.generated_at)}
    <p class="disclaimer">${t('konbiniDisclaimer')}</p>
    <p class="note">${t('konbiniReadLabelToo')}</p>`;
}
