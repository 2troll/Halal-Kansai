/**
 * La búsqueda de las 20 pistas: un secreto para quien toca el arco del logo
 * cinco veces seguidas.
 *
 * Cada pista lleva a otra parte de la app, así que quien la termina ha
 * recorrido TODO lo que la app sabe hacer: es un paseo guiado disfrazado de
 * juego. Las pistas hablan de la app y de cosas buenas (la qibla, el tiempo,
 * la comunidad, la comida lícita, el conocimiento), nada más.
 *
 * Texto en inglés, español, árabe y japonés; el resto de idiomas cae al
 * inglés, como el resto de la app.
 */

/** Lo que la app emite cuando alguien hace algo (ver ui.ts, SIGNALS). */
export type Signal = string;

export interface Step {
  /** La acción que resuelve la pista. */
  matches: (signal: Signal) => boolean;
  /** Cuántas veces hay que hacerla (el tasbih: 33). */
  times?: number;
  clue: Partial<Record<HuntLang, string>> & { en: string };
}

export type HuntLang = 'en' | 'es' | 'ar' | 'ja';

const is = (want: Signal) => (s: Signal) => s === want;

export const STEPS: readonly Step[] = [
  {
    matches: is('tab:qibla'),
    clue: {
      en: 'Every prayer turns toward one House. Find the tab that points to it.',
      es: 'Toda oración mira hacia una sola Casa. Busca la pestaña que apunta hacia ella.',
      ar: 'كل صلاة تتجه إلى بيت واحد. ابحث عن التبويب الذي يشير إليه.',
      ja: 'すべての礼拝は一つの館に向かいます。その方向を指すタブを探してください。',
    },
  },
  {
    matches: is('qibla-degrees'),
    clue: {
      en: 'The way is measured from the north. Touch the number of degrees.',
      es: 'El camino se mide desde el norte. Toca el número de grados.',
      ar: 'يُقاس الاتجاه من الشمال. المس رقم الدرجات.',
      ja: '方角は北から測ります。角度の数字をタップしてください。',
    },
  },
  {
    matches: is('tab:salat'),
    clue: {
      en: 'Now return to time itself: go back to the prayer times.',
      es: 'Ahora vuelve al tiempo: regresa a los horarios del rezo.',
      ar: 'عُد الآن إلى الوقت نفسه: ارجع إلى مواقيت الصلاة.',
      ja: '次は「時」に戻りましょう。礼拝時刻のタブへ。',
    },
  },
  {
    matches: is('mihrab'),
    clue: {
      en: 'In a mosque, a niche shows the direction. Touch the card shaped like it: the next prayer.',
      es: 'En la mezquita, un nicho marca la dirección. Toca la tarjeta que tiene su forma: el próximo rezo.',
      ar: 'في المسجد يدلّ المحراب على الاتجاه. المس البطاقة التي على شكله: الصلاة القادمة.',
      ja: 'モスクではミフラーブが方角を示します。その形のカード（次の礼拝）をタップ。',
    },
  },
  {
    matches: is('week'),
    clue: {
      en: 'Seven days are written further down. Open the week.',
      es: 'Siete días están escritos más abajo. Abre la semana.',
      ar: 'سبعة أيام مكتوبة في الأسفل. افتح جدول الأسبوع.',
      ja: '下の方に七日間が書かれています。一週間の表を開いてください。',
    },
  },
  {
    matches: is('settings'),
    clue: {
      en: 'Scholars measure dawn and dusk in different ways. Open the calculation settings.',
      es: 'Los sabios miden el alba y el ocaso de maneras distintas. Abre los ajustes del cálculo.',
      ar: 'يقدّر العلماء الفجر والعشاء بطرق مختلفة. افتح إعدادات طريقة الحساب.',
      ja: '学者たちは夜明けと日没をさまざまな方法で計ります。計算方法の設定を開いてください。',
    },
  },
  {
    matches: is('tab:places'),
    clue: {
      en: 'Leave home. Find where the community gathers.',
      es: 'Sal de casa. Busca dónde se reúne la comunidad.',
      ar: 'اخرج من البيت. ابحث عن مكان اجتماع الجماعة.',
      ja: '外へ出ましょう。コミュニティが集まる場所を探してください。',
    },
  },
  {
    matches: (s) => /^search:.*(kobe|神戸|كوبي)/i.test(s),
    clue: {
      en: "Japan's oldest mosque opened in 1935 in a port city. Search for that city.",
      es: 'La mezquita más antigua de Japón abrió en 1935 en una ciudad portuaria. Busca esa ciudad.',
      ar: 'افتُتح أقدم مسجد في اليابان عام 1935 في مدينة ساحلية. ابحث عن تلك المدينة.',
      ja: '日本最古のモスクは1935年、ある港町に建てられました。その町を検索してください。',
    },
  },
  {
    matches: is('show-map'),
    clue: {
      en: 'A list is not a map. Show it on the map.',
      es: 'Una lista no es un mapa. Muéstrala en el mapa.',
      ar: 'القائمة ليست خريطة. اعرضه على الخريطة.',
      ja: 'リストは地図ではありません。地図で表示してください。',
    },
  },
  {
    matches: is('tab:food'),
    clue: {
      en: 'Eat of what is good and lawful. Go where food is checked.',
      es: 'Come de lo bueno y lícito. Ve adonde se revisa la comida.',
      ar: 'كلوا من الحلال الطيب. اذهب إلى حيث يُفحص الطعام.',
      ja: '良いもの、ハラールなものを食べましょう。食品をチェックする場所へ。',
    },
  },
  {
    matches: is('food-example'),
    clue: {
      en: 'Not sure what to check? Touch one of the examples.',
      es: '¿No sabes qué revisar? Toca uno de los ejemplos.',
      ar: 'لا تعرف ماذا تفحص؟ المس أحد الأمثلة.',
      ja: '何を調べるか迷ったら、例を一つタップしてください。',
    },
  },
  {
    matches: is('phrases'),
    clue: {
      en: 'Words open doors in any shop. Find the phrases.',
      es: 'Las palabras abren puertas en cualquier tienda. Busca las frases.',
      ar: 'الكلمات تفتح الأبواب في أي متجر. ابحث عن العبارات.',
      ja: '言葉はどの店でも扉を開きます。フレーズを探してください。',
    },
  },
  {
    matches: is('phrase'),
    clue: {
      en: 'Choose one phrase, as if you were showing it to the shopkeeper.',
      es: 'Elige una frase, como si se la enseñaras al dependiente.',
      ar: 'اختر عبارة، كأنك تُريها للبائع.',
      ja: '店員さんに見せるつもりで、フレーズを一つ選んでください。',
    },
  },
  {
    matches: is('tab:khutbah'),
    clue: {
      en: 'On Friday, the imam speaks. Go where his words are translated.',
      es: 'El viernes habla el imam. Ve adonde se traducen sus palabras.',
      ar: 'يوم الجمعة يخطب الإمام. اذهب إلى حيث تُترجم كلماته.',
      ja: '金曜日、イマームが語ります。その言葉が翻訳される場所へ。',
    },
  },
  {
    matches: is('khutbah-lang'),
    clue: {
      en: 'Understanding is a gift. Change the language you want to read.',
      es: 'Entender es un regalo. Cambia el idioma en el que quieres leer.',
      ar: 'الفهم نعمة. غيّر اللغة التي تريد القراءة بها.',
      ja: '理解は贈り物です。読みたい言語を変えてみてください。',
    },
  },
  {
    matches: is('tab:guide'),
    clue: {
      en: 'Knowledge is the last door. Open the guide.',
      es: 'El conocimiento es la última puerta. Abre la guía.',
      ar: 'العلم هو الباب الأخير. افتح الدليل.',
      ja: '知識は最後の扉です。ガイドを開いてください。',
    },
  },
  {
    matches: is('tasbih'),
    times: 33,
    clue: {
      en: 'SubhanAllah, thirty-three times. Complete one round of the counter.',
      es: 'SubhanAllah, treinta y tres veces. Completa una vuelta del contador.',
      ar: 'سبحان الله ثلاثًا وثلاثين مرة. أكمل دورة واحدة في العدّاد.',
      ja: 'スブハーナッラーを33回。カウンターを一周させてください。',
    },
  },
  {
    matches: is('appearance'),
    clue: {
      en: 'Night and day are both signs. Open the appearance settings.',
      es: 'La noche y el día son signos. Abre los ajustes de apariencia.',
      ar: 'الليل والنهار آيتان. افتح إعدادات المظهر.',
      ja: '夜も昼もしるしです。表示の設定を開いてください。',
    },
  },
  {
    matches: is('theme'),
    clue: {
      en: 'Choose any colour you like.',
      es: 'Elige el color que más te guste.',
      ar: 'اختر اللون الذي يعجبك.',
      ja: '好きな色を選んでください。',
    },
  },
  {
    matches: is('logo'),
    clue: {
      en: 'Every journey returns to where it began. Touch the arch at the top.',
      es: 'Todo viaje vuelve adonde empezó. Toca el arco de arriba.',
      ar: 'كل رحلة تعود إلى حيث بدأت. المس القوس في الأعلى.',
      ja: 'すべての旅は始まりの場所に戻ります。上のアーチをタップしてください。',
    },
  },
];

export const TEXT = {
  intro: {
    en: 'You found a secret. 20 clues are hidden in this app; each one leads to the next.',
    es: 'Has encontrado un secreto. Hay 20 pistas escondidas en la app; cada una lleva a la siguiente.',
    ar: 'لقد وجدت سرًّا. في هذا التطبيق 20 دليلًا مخفيًّا، كل دليل يقود إلى التالي.',
    ja: '秘密を見つけました。このアプリには20のヒントが隠れていて、一つが次へと導きます。',
  },
  clue: { en: 'Clue', es: 'Pista', ar: 'الدليل', ja: 'ヒント' },
  close: { en: 'Close', es: 'Cerrar', ar: 'إغلاق', ja: '閉じる' },
  done: {
    en: 'MashaAllah! You found all 20 clues. "Allah is Beautiful and loves beauty" (Sahih Muslim). A secret theme is now yours: Kiswah.',
    es: '¡MashaAllah! Has encontrado las 20 pistas. «Allah es Bello y ama la belleza» (Sahih Muslim). Ya tienes un tema secreto: Kiswa.',
    ar: 'ما شاء الله! وجدتَ الأدلة العشرين كلها. «إن الله جميل يحب الجمال» (صحيح مسلم). أصبح لك مظهر سري: الكسوة.',
    ja: 'マーシャーアッラー！20のヒントをすべて見つけました。「アッラーは美しく、美を愛される」（サヒーフ・ムスリム）。秘密のテーマ「キスワ」が使えるようになりました。',
  },
  tell: {
    en: 'Tell the creator',
    es: 'Avisar a quien hizo la app',
    ar: 'أخبر صانع التطبيق',
    ja: '作者に伝える',
  },
  told: { en: 'Sent. Thank you!', es: 'Enviado. ¡Gracias!', ar: 'تم الإرسال. شكرًا!', ja: '送信しました。ありがとう！' },
} satisfies Record<string, Record<HuntLang, string>>;
