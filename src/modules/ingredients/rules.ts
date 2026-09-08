/**
 * Base de reglas del lector de etiquetas japonesas.
 *
 * Cada regla es un término tal y como aparece impreso en un paquete japonés
 * (原材料名) con su dictamen. Tres principios, y son los que defienden el
 * proyecto ante una organización certificadora:
 *
 * 1. **Determinista.** Esto es un diccionario, no un modelo. La misma etiqueta
 *    da siempre el mismo resultado y cada dictamen es auditable línea a línea.
 * 2. **No emite fatwa.** Donde los sabios difieren (alcohol de fermentación del
 *    醤油, 酒精 añadido, carne no sacrificada según el rito) la regla es
 *    `mushbooh` y el texto explica las dos posturas; la decisión es del usuario.
 * 3. **No da vía libre.** Ninguna regla `halal` significa "producto halal":
 *    solo que ESE término, aislado, no es problemático.
 *
 * Fuentes de los términos: etiquetado japonés real (食品表示法, 原材料名 y la
 * línea de alérgenos) y los aditivos por número E de uso común en Japón.
 */

export type Status = 'haram' | 'mushbooh' | 'halal';

export type Category =
  | 'pork'
  | 'alcohol'
  | 'animal'
  | 'insect'
  | 'additive'
  | 'plant'
  | 'seafood'
  | 'dairy';

/** Texto en los tres idiomas de la app. El japonés se muestra siempre tal cual. */
export interface Trilingual {
  ar: string;
  en: string;
  es: string;
}

export interface Rule {
  id: string;
  /** Variantes tal y como se imprimen (kanji, kana, romaji, número E). */
  terms: string[];
  /** Solo para la búsqueda por palabra: romaji y nombres corrientes. */
  search?: string[];
  status: Status;
  category: Category;
  /** Nombre del ingrediente. */
  label: Trilingual;
  /** Por qué recibe ese dictamen. En `mushbooh`, ambas posturas. */
  why: Trilingual;
}

export const RULES: readonly Rule[] = [
  // ─────────────────────────────────────────────────────────────── cerdo ──
  {
    id: 'pork-meat',
    terms: ['豚肉', 'ポーク', '豚', 'ぶた肉', 'pork'],
    status: 'haram',
    category: 'pork',
    label: { ar: 'لحم الخنزير', en: 'Pork', es: 'Carne de cerdo' },
    why: {
      ar: 'الخنزير محرَّم بنص القرآن (المائدة ٣). لا خلاف في ذلك.',
      en: 'Pork is forbidden by explicit Qur’anic text (5:3). There is no difference of opinion.',
      es: 'El cerdo está prohibido por texto explícito del Corán (5:3). No hay diferencia de opinión.',
    },
  },
  {
    id: 'pork-fat',
    terms: ['豚脂', '豚脂肪', 'ラード', '豚油'],
    search: ['lard', 'rado'],
    status: 'haram',
    category: 'pork',
    label: { ar: 'شحم الخنزير', en: 'Lard (pork fat)', es: 'Manteca de cerdo' },
    why: {
      ar: 'دهن مستخرج من الخنزير؛ حكمه حكم لحمه. شائع جدًّا في المقليات والمخبوزات اليابانية.',
      en: 'Fat rendered from pork; it takes the same ruling as the meat. Very common in Japanese fried food and baked goods.',
      es: 'Grasa extraída del cerdo; tiene el mismo dictamen que la carne. Muy común en frituras y bollería japonesa.',
    },
  },
  {
    id: 'pork-extract',
    terms: ['ポークエキス', '豚エキス', '豚肉エキス', 'ポークエキスパウダー', 'ポーク調味料'],
    search: ['pork extract', 'poku ekisu'],
    status: 'haram',
    category: 'pork',
    label: { ar: 'خلاصة لحم الخنزير', en: 'Pork extract', es: 'Extracto de cerdo' },
    why: {
      ar: 'خلاصة مركّزة من لحم الخنزير، تُستعمل كثيرًا في مرق الرامن وحساء المعكرونة سريعة التحضير.',
      en: 'Concentrated pork extract, very common in ramen broth and instant-noodle soup bases.',
      es: 'Extracto concentrado de cerdo, muy habitual en caldos de ramen y sopas de fideos instantáneos.',
    },
  },
  {
    id: 'pork-derived',
    terms: ['豚由来', '豚ゼラチン', '豚由来ゼラチン', '豚コラーゲン', '豚血漿', 'ポークブイヨン'],
    status: 'haram',
    category: 'pork',
    label: { ar: 'مشتق من الخنزير', en: 'Pork-derived ingredient', es: 'Derivado de cerdo' },
    why: {
      ar: 'الملصق نفسه يصرّح بأن المصدر خنزير، فلا حاجة إلى استفسار.',
      en: 'The label itself states the source is pork, so no further enquiry is needed.',
      es: 'La propia etiqueta declara que el origen es porcino; no hace falta preguntar más.',
    },
  },
  {
    id: 'pork-bone-broth',
    terms: ['豚骨', 'とんこつ', 'トンコツ', '豚骨スープ'],
    search: ['tonkotsu'],
    status: 'haram',
    category: 'pork',
    label: { ar: 'مرق عظام الخنزير (تونكوتسو)', en: 'Tonkotsu (pork bone broth)', es: 'Tonkotsu (caldo de hueso de cerdo)' },
    why: {
      ar: 'أكثر مصادر الخنزير خفاءً في اليابان: المعكرونة تبدو عادية والحساء كله من الخنزير.',
      en: 'The most hidden pork in Japan: the noodles look plain while the entire broth is pork.',
      es: 'El cerdo más escondido de Japón: los fideos parecen inocentes y todo el caldo es de cerdo.',
    },
  },
  {
    id: 'char-siu',
    terms: ['チャーシュー', '焼豚', '叉焼', '角煮'],
    search: ['chashu', 'charsiu'],
    status: 'haram',
    category: 'pork',
    label: { ar: 'شرائح خنزير مطهوّة (تشاشو)', en: 'Chāshū (braised pork)', es: 'Chāshū (cerdo estofado)' },
    why: {
      ar: 'الإضافة الأساسية فوق الرامن، وهي لحم خنزير مطهوّ.',
      en: 'The standard ramen topping, and it is braised pork.',
      es: 'El acompañamiento estándar del ramen, y es cerdo estofado.',
    },
  },
  {
    id: 'ham',
    terms: ['ハム', 'ロースハム'],
    search: ['hamu', 'ham'],
    status: 'haram',
    category: 'pork',
    label: { ar: 'لحم مُملّح (هام)', en: 'Ham', es: 'Jamón' },
    why: {
      ar: 'ما لم يُكتب صراحةً أنه من الدجاج (鶏ハム) أو الديك الرومي، فهو من الخنزير.',
      en: 'Unless the label explicitly says chicken (鶏ハム) or turkey, it is pork.',
      es: 'Salvo que la etiqueta diga explícitamente pollo (鶏ハム) o pavo, es cerdo.',
    },
  },
  {
    id: 'bacon',
    terms: ['ベーコン', 'bacon'],
    status: 'haram',
    category: 'pork',
    label: { ar: 'بيكون', en: 'Bacon', es: 'Bacon' },
    why: {
      ar: 'المواصفة اليابانية (JAS) تعرّف «ベーコン» بأنه من بطن الخنزير؛ فإن كان من الديك الرومي وجب أن يُكتب صراحة.',
      en: 'The Japanese JAS standard defines ベーコン as cured pork belly; turkey bacon must be labelled explicitly as such.',
      es: 'La norma japonesa JAS define ベーコン como panceta de cerdo curada; el bacon de pavo debe indicarse explícitamente.',
    },
  },
  {
    id: 'gelatin-pork-hidden',
    terms: ['豚脂肪酸', 'ポークオイル', 'ポークラード'],
    status: 'haram',
    category: 'pork',
    label: { ar: 'دهون خنزير معالَجة', en: 'Processed pork fat', es: 'Grasa de cerdo procesada' },
    why: {
      ar: 'مشتق دهني من الخنزير مهما بلغت درجة المعالجة.',
      en: 'A fat derivative of pork regardless of how far it has been processed.',
      es: 'Derivado graso del cerdo por muy procesado que esté.',
    },
  },
  {
    id: 'blood',
    terms: ['血液', '血粉', '豚血', '血漿たん白'],
    status: 'haram',
    category: 'animal',
    label: { ar: 'الدم', en: 'Blood', es: 'Sangre' },
    why: {
      ar: 'الدم المسفوح محرَّم بالنص (الأنعام ١٤٥).',
      en: 'Flowing blood is forbidden by explicit text (6:145).',
      es: 'La sangre derramada está prohibida por texto explícito (6:145).',
    },
  },

  // ──────────────────────────────────────────────────────────── alcohol ──
  {
    id: 'cooking-sake',
    terms: ['料理酒', '清酒', '日本酒', '純米酒', '合成清酒'],
    search: ['ryorishu', 'sake', 'seishu'],
    status: 'haram',
    category: 'alcohol',
    label: { ar: 'خمر الطهي (ساكي)', en: 'Cooking sake', es: 'Sake de cocina' },
    why: {
      ar: 'خمر أُضيف عمدًا كمكوّن، لا أثرًا للتخمير الطبيعي. المضاف يبقى محرَّمًا وإن تبخّر أكثره.',
      en: 'Wine deliberately added as an ingredient, not a trace of natural fermentation. Added liquor remains forbidden even if most of it evaporates.',
      es: 'Vino añadido deliberadamente como ingrediente, no un resto de fermentación natural. El licor añadido sigue prohibido aunque se evapore la mayor parte.',
    },
  },
  {
    id: 'mirin',
    terms: ['みりん', '味醂', '本みりん', 'ミリン'],
    search: ['mirin', 'honmirin'],
    status: 'haram',
    category: 'alcohol',
    label: { ar: 'ميرين (خمر أرز حلو)', en: 'Mirin (sweet rice wine)', es: 'Mirin (vino dulce de arroz)' },
    why: {
      ar: 'الميرين الأصلي (本みりん) يحتوي نحو ١٤٪ كحولًا وهو خمر بذاته. انتبه: «みりん風調味料» شيء آخر.',
      en: 'Genuine mirin (本みりん) contains around 14% alcohol and is itself a wine. Note: みりん風調味料 is a different product.',
      es: 'El mirin auténtico (本みりん) tiene cerca del 14 % de alcohol y es vino en sí mismo. Ojo: みりん風調味料 es otro producto.',
    },
  },
  {
    id: 'mirin-style',
    terms: ['みりん風調味料', 'みりんタイプ調味料'],
    search: ['mirinfu'],
    status: 'mushbooh',
    category: 'alcohol',
    label: { ar: 'توابل بنكهة الميرين', en: 'Mirin-style seasoning', es: 'Condimento tipo mirin' },
    why: {
      ar: 'يُصنع ليبقى دون ١٪ كحول، فلا يُعدّ خمرًا. ومع ذلك يضيف بعض المصنّعين 酒精 إليه، فالسؤال للشركة ضروري.',
      en: 'Formulated to stay below 1% alcohol, so it is not wine. Some makers still add 酒精 to it, so the manufacturer must be asked.',
      es: 'Se formula para quedar por debajo del 1 % de alcohol, así que no es vino. Aun así algunos fabricantes le añaden 酒精; hay que preguntar a la empresa.',
    },
  },
  {
    id: 'spirits',
    terms: ['焼酎', 'ウイスキー', 'ブランデー', 'ラム酒', 'リキュール', '洋酒', '泡盛', 'ワイン', '白ワイン', '赤ワイン', 'ビール', '発泡酒', '酒粕'],
    status: 'haram',
    category: 'alcohol',
    label: { ar: 'مشروب كحولي', en: 'Alcoholic drink', es: 'Bebida alcohólica' },
    why: {
      ar: 'خمر بالنص والإجماع، سواء أُضيف للنكهة أو للطهي.',
      en: 'Intoxicating liquor by text and consensus, whether added for flavour or for cooking.',
      es: 'Licor embriagante por texto y consenso, tanto si se añade por sabor como para cocinar.',
    },
  },
  {
    id: 'shusei',
    terms: ['酒精', 'アルコール', 'エチルアルコール', '醸造アルコール'],
    search: ['shusei', 'ethanol', 'alcohol'],
    status: 'mushbooh',
    category: 'alcohol',
    label: { ar: 'كحول مضاف (شوسي)', en: 'Added ethanol (shusei)', es: 'Etanol añadido (shusei)' },
    why: {
      ar: 'كحول يُضاف حافظًا (شائع في الميسو والخبز والصلصات). فريق يحرّمه لأنه خمر مضاف، وفريق يجيزه لأنه ليس مسكرًا بهذه النسبة ولا يُشرب لذاته. الترجيح للمستخدم ولمرجعه.',
      en: 'Ethanol added as a preservative (common in miso, bread and sauces). One group forbids it as added liquor; another permits it because at that ratio it does not intoxicate and is not drunk as such. The judgement is yours and your scholar’s.',
      es: 'Etanol añadido como conservante (común en miso, pan y salsas). Un grupo lo prohíbe por ser licor añadido; otro lo permite porque en esa proporción no embriaga ni se bebe como tal. El dictamen es tuyo y de tu sabio.',
    },
  },
  {
    id: 'shoyu',
    terms: ['醤油', 'しょうゆ', 'こいくちしょうゆ', '本醸造醤油', '大豆醤油'],
    search: ['shoyu', 'soy sauce'],
    status: 'mushbooh',
    category: 'alcohol',
    label: { ar: 'صلصة الصويا المخمَّرة', en: 'Brewed soy sauce', es: 'Salsa de soja fermentada' },
    why: {
      ar: 'التخمير الطبيعي يولّد نحو ٢٪ كحولًا لم يُضَف قصدًا. كثير من العلماء يجيزها لأن الكحول ناتج ثانوي غير مسكر، وبعضهم يتوقّف. بعض الأنواع يُضاف إليها 酒精 فوق ذلك.',
      en: 'Natural brewing generates roughly 2% alcohol that was never deliberately added. Many scholars permit it as a non-intoxicating by-product; some abstain. Some brands additionally add 酒精.',
      es: 'La fermentación natural genera cerca del 2 % de alcohol que nadie añadió a propósito. Muchos sabios la permiten por ser un subproducto no embriagante; otros se abstienen. Algunas marcas además le añaden 酒精.',
    },
  },
  {
    id: 'fermented-seasoning',
    terms: ['発酵調味料', '醸造調味料'],
    status: 'mushbooh',
    category: 'alcohol',
    label: { ar: 'توابل مخمَّرة', en: 'Fermented seasoning', es: 'Condimento fermentado' },
    why: {
      ar: 'تسمية عامة تخفي غالبًا سائلًا كحوليًّا مملَّحًا يشبه الساكي. المصدر الحقيقي لا يظهر إلا بسؤال المصنّع.',
      en: 'A generic label that often hides a salted sake-like alcoholic liquid. The real source only appears if you ask the manufacturer.',
      es: 'Denominación genérica que a menudo esconde un líquido alcohólico salado tipo sake. El origen real solo se sabe preguntando al fabricante.',
    },
  },
  {
    id: 'vanilla-extract',
    terms: ['バニラエッセンス', 'バニラエキストラクト', 'バニラオイル'],
    status: 'mushbooh',
    category: 'alcohol',
    label: { ar: 'خلاصة الفانيليا', en: 'Vanilla extract', es: 'Extracto de vainilla' },
    why: {
      ar: 'غالبًا ما يكون الكحول هو المذيب الحامل. الخلاف فيه كالخلاف في الكحول المضاف بنسبة ضئيلة.',
      en: 'Alcohol is usually the carrier solvent. The disagreement here is the same as over trace added alcohol.',
      es: 'El alcohol suele ser el disolvente portador. La discrepancia es la misma que sobre el alcohol añadido en traza.',
    },
  },

  // ─────────────────────────────────────────── origen animal sin declarar ──
  {
    id: 'gelatin',
    terms: ['ゼラチン', 'ゼラチン加工品', 'gelatin', 'gelatine', 'E441'],
    search: ['zerachin'],
    status: 'mushbooh',
    category: 'animal',
    label: { ar: 'جيلاتين', en: 'Gelatin', es: 'Gelatina' },
    why: {
      ar: 'يُستخرج من جلد الخنزير أو عظم البقر أو السمك، والملصق الياباني لا يلزم بذكر المصدر. جيلاتين السمك حلال، وجيلاتين الخنزير حرام: لا بد من سؤال الشركة.',
      en: 'Made from pig skin, cattle bone or fish, and Japanese labelling does not require the source. Fish gelatin is lawful, pork gelatin is forbidden: the company must be asked.',
      es: 'Se obtiene de piel de cerdo, hueso de vacuno o pescado, y el etiquetado japonés no obliga a declarar el origen. La gelatina de pescado es lícita y la de cerdo prohibida: hay que preguntar a la empresa.',
    },
  },
  {
    id: 'gelatin-fish',
    terms: ['魚由来ゼラチン', '魚ゼラチン', 'フィッシュゼラチン'],
    status: 'halal',
    category: 'seafood',
    label: { ar: 'جيلاتين سمكي', en: 'Fish gelatin', es: 'Gelatina de pescado' },
    why: {
      ar: 'المصدر مصرَّح به وهو السمك، وميتة البحر حلال.',
      en: 'The declared source is fish, and sea creatures are lawful without slaughter.',
      es: 'El origen declarado es pescado, y los animales marinos son lícitos sin sacrificio ritual.',
    },
  },
  {
    id: 'animal-fat',
    terms: ['動物性油脂', '動物油脂', '動物性脂肪'],
    search: ['dobutsusei yushi'],
    status: 'mushbooh',
    category: 'animal',
    label: { ar: 'دهون حيوانية غير محددة', en: 'Unspecified animal fat', es: 'Grasa animal sin especificar' },
    why: {
      ar: 'لم يذكر الحيوان: قد يكون خنزيرًا، وقد يكون بقرًا لم يُذكَّ على الوجه الشرعي. ما دام المصدر مجهولًا فالحكم التوقّف.',
      en: 'The animal is not named: it may be pork, or cattle not slaughtered according to Islamic rite. While the source is unknown the ruling is to withhold.',
      es: 'No se nombra el animal: puede ser cerdo, o vacuno no sacrificado según el rito islámico. Mientras el origen sea desconocido, lo correcto es abstenerse.',
    },
  },
  {
    id: 'animal-protein',
    terms: ['動物性たん白', '動物性たんぱく', '動物性蛋白', '動物性たん白加水分解物'],
    status: 'mushbooh',
    category: 'animal',
    label: { ar: 'بروتين حيواني غير محدد', en: 'Unspecified animal protein', es: 'Proteína animal sin especificar' },
    why: {
      ar: 'مثل الدهون الحيوانية: الحيوان مجهول وطريقة الذبح مجهولة.',
      en: 'Like animal fat: neither the animal nor the method of slaughter is stated.',
      es: 'Igual que la grasa animal: ni el animal ni el método de sacrificio constan.',
    },
  },
  {
    id: 'shortening',
    terms: ['ショートニング', 'shortening'],
    search: ['shotoningu'],
    status: 'mushbooh',
    category: 'animal',
    label: { ar: 'دهن الخبز (شورتنينغ)', en: 'Shortening', es: 'Grasa vegetal/animal (shortening)' },
    why: {
      ar: 'في اليابان غالبًا نباتي، لكن الاسم لا يمنع خلطه بدهن حيواني أو شحم خنزير. يُسأل المصنّع.',
      en: 'In Japan usually vegetable, but the name does not rule out blending with animal fat or lard. Ask the manufacturer.',
      es: 'En Japón suele ser vegetal, pero el nombre no excluye la mezcla con grasa animal o manteca de cerdo. Pregunta al fabricante.',
    },
  },
  {
    id: 'margarine',
    terms: ['マーガリン', 'ファットスプレッド'],
    status: 'mushbooh',
    category: 'animal',
    label: { ar: 'مرغرين', en: 'Margarine', es: 'Margarina' },
    why: {
      ar: 'أساسه نباتي عادةً، لكنه قد يحتوي دهنًا حيوانيًّا أو مستحلبات حيوانية المصدر.',
      en: 'Usually vegetable-based, but it may contain animal fat or animal-derived emulsifiers.',
      es: 'Suele ser de base vegetal, pero puede llevar grasa animal o emulgentes de origen animal.',
    },
  },
  {
    id: 'emulsifier',
    terms: ['乳化剤', 'モノグリセリド', 'グリセリン脂肪酸エステル', 'E471', 'E472'],
    search: ['nyukazai', 'emulsifier'],
    status: 'mushbooh',
    category: 'additive',
    label: { ar: 'مستحلب', en: 'Emulsifier', es: 'Emulgente' },
    why: {
      ar: 'يُصنع من زيت نباتي أو من دهن حيواني. الرمز وحده لا يكشف المصدر.',
      en: 'Made from vegetable oil or from animal fat. The code alone does not reveal the source.',
      es: 'Se fabrica a partir de aceite vegetal o de grasa animal. El código por sí solo no revela el origen.',
    },
  },
  {
    id: 'glycerin',
    terms: ['グリセリン', 'グリセロール', 'E422'],
    status: 'mushbooh',
    category: 'additive',
    label: { ar: 'غليسرين', en: 'Glycerin', es: 'Glicerina' },
    why: {
      ar: 'نباتية أو حيوانية المصدر، والحيوانية قد تكون من الخنزير.',
      en: 'Vegetable or animal in origin, and the animal kind may come from pork.',
      es: 'De origen vegetal o animal, y la animal puede proceder del cerdo.',
    },
  },
  {
    id: 'stearate',
    terms: ['ステアリン酸', 'ステアリン酸カルシウム', 'ステアリン酸マグネシウム'],
    status: 'mushbooh',
    category: 'additive',
    label: { ar: 'حمض الستياريك', en: 'Stearic acid', es: 'Ácido esteárico' },
    why: {
      ar: 'حمض دهني يُستخرج من الزيوت النباتية أو من شحوم حيوانية.',
      en: 'A fatty acid obtained from vegetable oils or from animal tallow.',
      es: 'Ácido graso obtenido de aceites vegetales o de sebo animal.',
    },
  },
  {
    id: 'collagen',
    terms: ['コラーゲン', 'コラーゲンペプチド'],
    status: 'mushbooh',
    category: 'animal',
    label: { ar: 'كولاجين', en: 'Collagen', es: 'Colágeno' },
    why: {
      ar: 'يُستخرج من جلود وعظام حيوانية، وغالبًا من الخنزير في المنتجات اليابانية ما لم يُذكر السمك.',
      en: 'Extracted from animal skin and bone, often porcine in Japanese products unless fish is stated.',
      es: 'Se extrae de piel y hueso animal, con frecuencia porcino en productos japoneses salvo que se indique pescado.',
    },
  },
  {
    id: 'meat-extract',
    terms: [
      'チキンエキス', '鶏エキス', 'ビーフエキス', '牛肉エキス', '肉エキス',
      'チキンブイヨン', 'ビーフブイヨン', '牛脂',
    ],
    status: 'mushbooh',
    category: 'animal',
    label: { ar: 'خلاصة لحم (غير الخنزير)', en: 'Meat extract (non-pork)', es: 'Extracto de carne (no cerdo)' },
    why: {
      ar: 'الحيوان حلال في أصله، لكن الذبح في اليابان لا يكون على الوجه الشرعي إلا بشهادة. جمهور يشترط التذكية، وبعض العلماء يتوسّع في ذبيحة أهل الكتاب.',
      en: 'The animal is lawful in itself, but slaughter in Japan is not Islamic unless certified. The majority require ritual slaughter; some scholars are broader regarding People of the Book.',
      es: 'El animal es lícito en sí, pero el sacrificio en Japón no es islámico salvo certificación. La mayoría exige degüello ritual; algunos sabios son más amplios respecto a la Gente del Libro.',
    },
  },
  {
    id: 'meat-nonpork',
    terms: ['鶏肉', 'とり肉', 'チキン', '牛肉', 'ビーフ', 'マトン', '羊肉'],
    search: ['toriniku', 'chicken', 'gyuniku', 'beef'],
    status: 'mushbooh',
    category: 'animal',
    label: { ar: 'لحم حلال في أصله (غير مذكّى)', en: 'Lawful meat, slaughter unknown', es: 'Carne lícita, sacrificio desconocido' },
    why: {
      ar: 'الدجاج والبقر حلال في ذاتهما، لكن الذبح في اليابان ليس على الوجه الشرعي إلا بشهادة. المسألة خلافية والقرار قرارك.',
      en: 'Chicken and beef are lawful in themselves, but slaughter in Japan is not Islamic unless certified. Scholars differ; the decision is yours.',
      es: 'El pollo y el vacuno son lícitos en sí, pero el sacrificio en Japón no es islámico salvo certificación. Los sabios difieren; la decisión es tuya.',
    },
  },
  {
    id: 'extract-generic',
    terms: ['エキス', 'コンソメ', 'ブイヨン', 'スープの素'],
    search: ['ekisu', 'consomme', 'bouillon'],
    status: 'mushbooh',
    category: 'animal',
    label: { ar: 'خلاصة أو مرق مركّز', en: 'Extract or stock', es: 'Extracto o caldo concentrado' },
    why: {
      ar: 'الكلمة وحدها لا تقول شيئًا: قد تكون من الخنزير أو الدجاج أو الخميرة. الواجب معرفة مصدرها.',
      en: 'The word alone says nothing: it may come from pork, chicken or yeast. The source has to be established.',
      es: 'La palabra sola no dice nada: puede venir de cerdo, de pollo o de levadura. Hay que saber el origen.',
    },
  },
  {
    id: 'rennet',
    terms: ['レンネット', '凝乳酵素', 'キモシン'],
    status: 'mushbooh',
    category: 'dairy',
    label: { ar: 'إنفحة', en: 'Rennet', es: 'Cuajo' },
    why: {
      ar: 'قد تكون من معدة عجل غير مذكّى، وقد تكون ميكروبية حلال. الخلاف في إنفحة غير المذكّى معروف.',
      en: 'It may come from the stomach of a non-ritually slaughtered calf, or be microbial and lawful. The disagreement over non-slaughtered rennet is well known.',
      es: 'Puede venir del estómago de un ternero no sacrificado ritualmente, o ser microbiano y lícito. La discrepancia sobre el cuajo de animal no sacrificado es conocida.',
    },
  },
  {
    id: 'cheese-whey',
    terms: ['チーズ', 'ホエイパウダー', 'ホエイ', '乳清', 'ナチュラルチーズ'],
    status: 'mushbooh',
    category: 'dairy',
    label: { ar: 'جبن ومصل اللبن', en: 'Cheese and whey', es: 'Queso y suero lácteo' },
    why: {
      ar: 'اللبن حلال، لكن الجبن ومصله يُصنعان بالإنفحة، فالحكم تابع لمصدرها.',
      en: 'Milk is lawful, but cheese and its whey are made with rennet, so the ruling follows the rennet’s source.',
      es: 'La leche es lícita, pero el queso y su suero se elaboran con cuajo, así que el dictamen depende del origen de este.',
    },
  },
  {
    id: 'pepsin',
    terms: ['ペプシン', 'パンクレアチン'],
    status: 'mushbooh',
    category: 'animal',
    label: { ar: 'إنزيمات هضمية حيوانية', en: 'Animal digestive enzymes', es: 'Enzimas digestivas animales' },
    why: {
      ar: 'كثيرًا ما تُستخرج من معدة الخنزير في الاستعمال الصناعي.',
      en: 'Frequently extracted from pig stomach in industrial use.',
      es: 'Con frecuencia se extraen del estómago del cerdo en uso industrial.',
    },
  },
  {
    id: 'l-cysteine',
    terms: ['L-システイン', 'システイン', 'E920'],
    status: 'mushbooh',
    category: 'additive',
    label: { ar: 'سيستئين', en: 'L-cysteine', es: 'L-cisteína' },
    why: {
      ar: 'محسّن عجين يُنتج من ريش الطير أو شعر الإنسان أو بالتخمير. المصدر البشري والخنزيري مرفوضان.',
      en: 'A dough conditioner produced from poultry feathers, human hair, or by fermentation. Human and porcine sources are rejected.',
      es: 'Mejorante de masa producido a partir de plumas, cabello humano o por fermentación. Las fuentes humana y porcina se rechazan.',
    },
  },
  {
    id: 'inosinate',
    terms: ['イノシン酸ナトリウム', '5\'-イノシン酸ナトリウム', 'E631'],
    status: 'mushbooh',
    category: 'additive',
    label: { ar: 'إينوزينات الصوديوم', en: 'Disodium inosinate', es: 'Inosinato disódico' },
    why: {
      ar: 'يُنتج من السمك أو اللحم أو بالتخمير؛ إن كان من لحم غير مذكّى فهو موضع توقّف.',
      en: 'Produced from fish, meat or fermentation; if from non-ritually slaughtered meat it is doubtful.',
      es: 'Se produce a partir de pescado, carne o fermentación; si procede de carne no sacrificada ritualmente, es dudoso.',
    },
  },
  {
    id: 'amino-seasoning',
    terms: ['調味料(アミノ酸等)', '調味料（アミノ酸等）', 'アミノ酸等'],
    status: 'mushbooh',
    category: 'additive',
    label: { ar: 'محسّنات نكهة (أحماض أمينية)', en: 'Flavour enhancer (amino acids)', es: 'Potenciador de sabor (aminoácidos)' },
    why: {
      ar: 'غالبه غلوتامات من تخمير قصب السكر وهو حلال، لكن كلمة «等» تغطي مركّبات أخرى قد تكون حيوانية المصدر.',
      en: 'Mostly glutamate from sugarcane fermentation, which is lawful, but the word 等 (“and others”) covers further compounds that can be animal-derived.',
      es: 'En su mayoría glutamato de fermentación de caña, que es lícito, pero la palabra 等 («y otros») cubre compuestos adicionales que pueden ser de origen animal.',
    },
  },
  {
    id: 'flavouring',
    terms: ['香料', '合成香料', 'フレーバー'],
    status: 'mushbooh',
    category: 'additive',
    label: { ar: 'نكهات', en: 'Flavourings', es: 'Aromas' },
    why: {
      ar: 'تسمية جامعة قد تحمل كحولًا مذيبًا أو مشتقات حيوانية دون بيان.',
      en: 'A blanket term that may carry alcohol as a solvent or animal derivatives without disclosure.',
      es: 'Término genérico que puede llevar alcohol como disolvente o derivados animales sin declararlo.',
    },
  },
  {
    id: 'caramel-colour',
    terms: ['カラメル色素', 'カラメルI', 'カラメルIII', 'カラメルIV'],
    status: 'mushbooh',
    category: 'additive',
    label: { ar: 'لون الكراميل', en: 'Caramel colour', es: 'Colorante de caramelo' },
    why: {
      ar: 'اللون نفسه من السكر، لكن بعض الأنواع تُذاب أو تُنقل بمذيب كحولي.',
      en: 'The colour itself is from sugar, but some grades are dissolved or carried in an alcohol solvent.',
      es: 'El color en sí procede del azúcar, pero algunos grados se disuelven o vehiculan en disolvente alcohólico.',
    },
  },

  // ──────────────────────────────────────────────────────────── insectos ──
  {
    id: 'cochineal',
    terms: ['コチニール色素', 'カルミン酸色素', 'カルミン', 'E120'],
    status: 'mushbooh',
    category: 'insect',
    label: { ar: 'قرمز (كوشنيل)', en: 'Cochineal / carmine', es: 'Cochinilla / carmín' },
    why: {
      ar: 'صبغة من حشرة القرمز. المالكية يجيزون الحشرات غير المستقذرة، وغيرهم يمنع أكل الحشرات.',
      en: 'A dye from the cochineal insect. The Maliki school permits non-repugnant insects; other schools prohibit eating insects.',
      es: 'Colorante obtenido del insecto cochinilla. La escuela malikí permite insectos no repugnantes; otras escuelas prohíben comer insectos.',
    },
  },
  {
    id: 'shellac',
    terms: ['シェラック', 'ラック色素', 'E904'],
    status: 'mushbooh',
    category: 'insect',
    label: { ar: 'شيلاك', en: 'Shellac', es: 'Goma laca' },
    why: {
      ar: 'راتنج تفرزه حشرة اللك ويُستعمل لتلميع الحلوى؛ الخلاف فيه كالخلاف في القرمز.',
      en: 'A resin secreted by the lac insect, used to glaze sweets; the disagreement mirrors that over cochineal.',
      es: 'Resina segregada por el insecto de la laca, usada para abrillantar dulces; la discrepancia es la misma que con la cochinilla.',
    },
  },

  // ─────────────────────────────────────── reconocidos y sin problema ──
  {
    id: 'vegetable-oil',
    terms: ['植物性油脂', '植物油脂', '菜種油', 'なたね油', '大豆油', 'パーム油', 'オリーブオイル', 'ごま油'],
    status: 'halal',
    category: 'plant',
    label: { ar: 'زيوت نباتية', en: 'Vegetable oil', es: 'Aceite vegetal' },
    why: {
      ar: 'أصل نباتي مصرَّح به، لا إشكال فيه.',
      en: 'A declared plant origin, with nothing problematic in it.',
      es: 'Origen vegetal declarado, sin nada problemático.',
    },
  },
  {
    id: 'grains',
    terms: [
      '小麦粉', '米', 'うるち米', '大豆', 'とうもろこし', 'じゃがいも',
      '加工でん粉', 'でん粉', '澱粉', '豆腐', 'とうふ', '納豆', '枝豆', '野菜', 'やさい',
    ],
    search: ['tofu', 'natto', 'daizu', 'yasai'],
    status: 'halal',
    category: 'plant',
    label: { ar: 'حبوب ونشويات', en: 'Grains and starches', es: 'Cereales y almidones' },
    why: {
      ar: 'مواد نباتية أساسية لا يدخلها مصدر حيواني ولا كحول.',
      en: 'Basic plant materials, with no animal source and no alcohol involved.',
      es: 'Materias vegetales básicas, sin origen animal ni alcohol de por medio.',
    },
  },
  {
    id: 'sugar-salt',
    terms: ['砂糖', '食塩', 'ぶどう糖', '果糖ぶどう糖液糖', '水あめ', 'はちみつ', '香辛料', '酵母エキス'],
    status: 'halal',
    category: 'plant',
    label: { ar: 'سكر وملح وتوابل', en: 'Sugar, salt and spices', es: 'Azúcar, sal y especias' },
    why: {
      ar: 'مكوّنات نباتية أو معدنية لا إشكال فيها.',
      en: 'Plant or mineral ingredients with nothing problematic in them.',
      es: 'Ingredientes vegetales o minerales sin nada problemático.',
    },
  },
  {
    id: 'vinegar',
    terms: ['酢', '米酢', '穀物酢', 'りんご酢'],
    status: 'halal',
    category: 'plant',
    label: { ar: 'خلّ', en: 'Vinegar', es: 'Vinagre' },
    why: {
      ar: 'الخلّ حلال بالنص («نِعمَ الإدامُ الخلُّ»)؛ وخلّ النبيذ المستحيل بنفسه يجيزه الجمهور. أما «ワインビネガー» فيتوقّف فيه بعضهم.',
      en: 'Vinegar is lawful by explicit hadith; vinegar that turned on its own is permitted by the majority. Wine vinegar (ワインビネガー) is withheld by some.',
      es: 'El vinagre es lícito por hadiz explícito; el vinagre transformado por sí solo lo permite la mayoría. El vinagre de vino (ワインビネガー) lo evitan algunos.',
    },
  },
  {
    id: 'seafood',
    terms: [
      'かつお節', 'かつおぶし', '鰹節', '昆布', '昆布エキス', '魚醤', 'いりこ', '煮干し',
      '海苔', 'わかめ', 'だし', '出汁', '鰹だし', 'かつおだし', '昆布だし',
    ],
    search: ['dashi', 'katsuobushi', 'kombu', 'nori'],
    status: 'halal',
    category: 'seafood',
    label: { ar: 'بحريات', en: 'Seafood and seaweed', es: 'Productos del mar y algas' },
    why: {
      ar: 'صيد البحر حلال ولا يحتاج تذكية.',
      en: 'Sea catch is lawful and needs no ritual slaughter.',
      es: 'Lo que se captura en el mar es lícito y no requiere sacrificio ritual.',
    },
  },
  {
    id: 'dairy-basic',
    terms: ['牛乳', '生クリーム', 'バター', '脱脂粉乳', 'ヨーグルト', '卵', '全卵', '鶏卵'],
    status: 'halal',
    category: 'dairy',
    label: { ar: 'ألبان وبيض', en: 'Milk and eggs', es: 'Leche y huevo' },
    why: {
      ar: 'حلال في ذاتها ما لم تُعالَج بإنفحة أو تُضَف إليها مواد مشبوهة.',
      en: 'Lawful in themselves unless treated with rennet or combined with doubtful additives.',
      es: 'Lícitos en sí mismos salvo que se traten con cuajo o se combinen con aditivos dudosos.',
    },
  },
  {
    id: 'miso',
    terms: ['味噌', 'みそ', '米みそ', '豆みそ'],
    search: ['miso'],
    status: 'halal',
    category: 'plant',
    label: { ar: 'ميسو', en: 'Miso', es: 'Miso' },
    why: {
      ar: 'فول صويا مخمَّر، حلال في أصله. لكن كثيرًا ما يُضاف إليه 酒精 حافظًا، فاقرأ بقية السطر.',
      en: 'Fermented soybean, lawful in origin. It is often preserved with 酒精, so read the rest of the line.',
      es: 'Soja fermentada, lícita de origen. Con frecuencia lleva 酒精 como conservante, así que lee el resto de la línea.',
    },
  },
  {
    id: 'halal-certified',
    terms: ['ハラール認証', 'ハラル認証', 'ハラール', 'HALAL'],
    status: 'halal',
    category: 'plant',
    label: { ar: 'شهادة حلال مذكورة', en: 'Halal certification stated', es: 'Certificación halal declarada' },
    why: {
      ar: 'الملصق يدّعي شهادة حلال. تأكّد من الجهة المانحة ومن سريان الشهادة؛ الادعاء وحده ليس دليلًا.',
      en: 'The label claims halal certification. Verify the issuing body and that the certificate is current; the claim alone is not proof.',
      es: 'La etiqueta declara certificación halal. Verifica la entidad emisora y la vigencia del certificado; la declaración por sí sola no es prueba.',
    },
  },
] as const;

/** Aviso de contaminación cruzada: no es un ingrediente, pero cambia el juicio. */
export const CROSS_CONTAMINATION = {
  id: 'cross-contamination',
  status: 'mushbooh' as Status,
  category: 'pork' as Category,
  patterns: ['同一製造ライン', '同じ製造ライン', '共通の設備', '共通のライン', '製造しています'],
  triggers: ['豚', 'ポーク', 'アルコール', '酒'],
  label: {
    ar: 'خط إنتاج مشترك',
    en: 'Shared production line',
    es: 'Línea de producción compartida',
  } as Trilingual,
  why: {
    ar: 'المصنع يصرّح بأن المنتج يُصنع على خط يُستعمل لمواد محرَّمة. الأثر هنا نجاسة عارضة لا مكوّن، وأكثر جهات الاعتماد تشترط فصل الخطوط.',
    en: 'The maker states the product runs on a line also used for forbidden material. This is incidental contact rather than an ingredient, and most certifiers require separated lines.',
    es: 'El fabricante declara que el producto se elabora en una línea usada también para material prohibido. Es contacto incidental, no un ingrediente, y la mayoría de certificadoras exigen líneas separadas.',
  } as Trilingual,
};
