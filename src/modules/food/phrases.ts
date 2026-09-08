/**
 * Tarjetas para enseñar al personal del restaurante.
 *
 * En Japón la barrera no es la mala voluntad: es que el camarero no entiende
 * la pregunta y el cliente no entiende la respuesta. Una tarjeta en japonés
 * grande y educado resuelve en cinco segundos lo que cinco minutos de gestos
 * no resuelven.
 *
 * Japonés en registro cortés (ですます), que es el que corresponde al hablar
 * con personal de servicio.
 */

export interface Phrase {
  id: string;
  ja: string;
  romaji: string;
  en: string;
  es: string;
  ar: string;
}

export const PHRASES: Phrase[] = [
  {
    id: 'intro',
    ja: '私はムスリムです。豚肉とアルコールが食べられません。',
    romaji: 'Watashi wa musurimu desu. Butaniku to arukōru ga taberaremasen.',
    en: 'I am Muslim. I cannot eat pork or alcohol.',
    es: 'Soy musulmán. No puedo comer cerdo ni alcohol.',
    ar: 'أنا مسلم، ولا آكل لحم الخنزير ولا الكحول.',
  },
  {
    id: 'pork',
    ja: 'これに豚肉は入っていますか。',
    romaji: 'Kore ni butaniku wa haitte imasu ka.',
    en: 'Does this contain pork?',
    es: '¿Esto lleva cerdo?',
    ar: 'هل يحتوي هذا على لحم الخنزير؟',
  },
  {
    id: 'alcohol',
    ja: 'これにお酒やみりんは使っていますか。',
    romaji: 'Kore ni osake ya mirin wa tsukatte imasu ka.',
    en: 'Is sake or mirin used in this?',
    es: '¿Se usa sake o mirin en esto?',
    ar: 'هل استُخدم الساكي أو الميرين في هذا الطبق؟',
  },
  {
    id: 'broth',
    ja: 'スープは豚骨ですか。',
    romaji: 'Sūpu wa tonkotsu desu ka.',
    en: 'Is the broth pork-based?',
    es: '¿El caldo es de hueso de cerdo?',
    ar: 'هل المرق مصنوع من عظام الخنزير؟',
  },
  {
    id: 'lard',
    ja: 'ラードで揚げていますか。',
    romaji: 'Rādo de agete imasu ka.',
    en: 'Is it fried in lard?',
    es: '¿Está frito en manteca de cerdo?',
    ar: 'هل قُلي بشحم الخنزير؟',
  },
  {
    id: 'without-meat',
    ja: '肉なしで作っていただけますか。',
    romaji: 'Niku nashi de tsukutte itadakemasu ka.',
    en: 'Could you make it without meat?',
    es: '¿Podrían prepararlo sin carne?',
    ar: 'هل يمكنكم تحضيره بدون لحم؟',
  },
  {
    id: 'which-dishes',
    ja: '豚肉とアルコールを使っていない料理はどれですか。',
    romaji: 'Butaniku to arukōru o tsukatte inai ryōri wa dore desu ka.',
    en: 'Which dishes contain no pork and no alcohol?',
    es: '¿Qué platos no llevan cerdo ni alcohol?',
    ar: 'أي الأطباق خالية من لحم الخنزير والكحول؟',
  },
  {
    id: 'fish-ok',
    ja: '魚と野菜は大丈夫です。',
    romaji: 'Sakana to yasai wa daijōbu desu.',
    en: 'Fish and vegetables are fine for me.',
    es: 'El pescado y la verdura sí puedo comerlos.',
    ar: 'السمك والخضروات لا مانع لديّ منها.',
  },
  {
    id: 'seasoning',
    ja: '調味料にアルコールは含まれていますか。',
    romaji: 'Chōmiryō ni arukōru wa fukumarete imasu ka.',
    en: 'Do the seasonings contain alcohol?',
    es: '¿Los condimentos contienen alcohol?',
    ar: 'هل تحتوي التوابل على كحول؟',
  },
  {
    id: 'prayer-room',
    ja: 'お祈りをする場所はありますか。',
    romaji: 'Oinori o suru basho wa arimasu ka.',
    en: 'Is there somewhere I could pray?',
    es: '¿Hay algún sitio donde pueda rezar?',
    ar: 'هل يوجد مكان يمكنني الصلاة فيه؟',
  },
  {
    id: 'thanks',
    ja: 'ご配慮ありがとうございます。',
    romaji: 'Gohairyo arigatō gozaimasu.',
    en: 'Thank you for accommodating me.',
    es: 'Gracias por su amabilidad.',
    ar: 'شكرًا لتفهّمكم ومراعاتكم.',
  },
];
