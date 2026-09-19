/**
 * Lo que un imán dice en una jutba y NO es Corán.
 *
 * El riesgo de este reconocedor no es dejar de ver una aleya: es lo contrario.
 * Si toma por aleya algo que no lo es, la app enseña la traducción oficial de
 * Tanzil de un versículo distinto y le pone al Corán palabras que no dijo. Eso
 * es peor que no traducir nada, y es justo lo que la app promete no hacer.
 *
 * Había una sola prueba de rechazo. Estas dieciséis son la guardia: si alguien
 * baja CONFIDENCE_THRESHOLD para pescar más aleyas, aquí se ve el precio.
 *
 * Auditado el 19-9-2026: las dieciséis se rechazan y las seis aleyas de
 * control se reconocen, con confianza de 0,944 a 1,000.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { QuranMatcher } from '../server/src/match.ts';

let matcher: QuranMatcher;
beforeAll(() => {
  const uthmani = JSON.parse(
    readFileSync(new URL('../server/data/quran-uthmani.json', import.meta.url), 'utf8'),
  );
  matcher = new QuranMatcher(uthmani);
});

const NO_ES_CORAN: Array<[string, string]> = [
  ['إن الحمد لله نحمده ونستعينه ونستغفره', 'khutbat al-haajah'],
  ['من يهده الله فلا مضل له ومن يضلل فلا هادي له', 'hadiz'],
  ['وأشهد أن لا إله إلا الله وحده لا شريك له وأشهد أن محمدا عبده ورسوله', 'shahada ampliada'],
  ['قال رسول الله صلى الله عليه وسلم', 'introducción de hadiz'],
  ['إنما الأعمال بالنيات وإنما لكل امرئ ما نوى', 'hadiz de las intenciones'],
  ['المسلم من سلم المسلمون من لسانه ويده', 'hadiz'],
  ['طلب العلم فريضة على كل مسلم', 'hadiz'],
  ['اللهم صل على محمد وعلى آل محمد', 'salat ibrahimiya'],
  ['أقول قولي هذا وأستغفر الله لي ولكم', 'cierre de jutba'],
  ['سبحان الله والحمد لله ولا إله إلا الله والله أكبر', 'dhikr'],
  ['الصلاة خير من النوم', 'adhan del fajr'],
  ['أما بعد فيا عباد الله أوصيكم ونفسي بتقوى الله', 'fórmula de jutba'],
  ['بارك الله فيكم وجزاكم الله خيرا', 'cortesía'],
  ['اليوم سوف نتحدث عن اهمية الصدق في التجارة', 'prosa moderna'],
  ['يا أيها الناس اتقوا ربكم واعلموا أن الساعة قريبة', 'suena coránico y no lo es'],
  ['نسأل الله أن يتقبل منا ومنكم صالح الأعمال', 'súplica'],
];

const SI_ES_CORAN: Array<[string, string]> = [
  ['بسم الله الرحمن الرحيم', '1:1'],
  ['الحمد لله رب العالمين', '1:2'],
  ['إن الله لا يغير ما بقوم حتى يغيروا ما بأنفسهم', '13:11'],
  ['ولقد كرمنا بني آدم', '17:70'],
  ['إن مع العسر يسرا', '94:6'],
  ['قل هو الله أحد الله الصمد', '112'],
  // Casi literal de 7:43, y se cita mucho en jutbas: SÍ debe reconocerse.
  ['الحمد لله الذي هدانا لهذا وما كنا لنهتدي لولا أن هدانا الله', '7:43'],
];

describe('no confundir la jutba con el Corán', () => {
  it.each(NO_ES_CORAN)('rechaza «%s» (%s)', (texto) => {
    expect(matcher.match(texto)).toBeNull();
  });
});

describe('pero sí reconoce las aleyas de verdad', () => {
  it.each(SI_ES_CORAN)('reconoce «%s» (%s)', (texto) => {
    const r = matcher.match(texto);
    expect(r, texto).not.toBeNull();
    expect(r!.confidence).toBeGreaterThanOrEqual(0.78);
  });
});
