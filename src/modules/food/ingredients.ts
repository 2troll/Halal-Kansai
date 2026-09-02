/**
 * Base de ingredientes japoneses y su condición halal.
 *
 * El problema real que resuelve: en Japón las etiquetas están en japonés y los
 * términos que importan (豚脂, 料理酒, ゼラチン) no aparecen en ningún traductor
 * con el matiz religioso. Aquí cada término lleva su veredicto y el porqué.
 *
 * Criterio aplicado:
 *  - `haram`    — prohibición clara (cerdo, alcohol añadido).
 *  - `doubtful` — mushbooh: depende del origen o del proceso. No se afirma que
 *                 sea ilícito; se avisa de que hay que preguntar.
 *  - `halal`    — lícito salvo contaminación cruzada.
 *
 * Deliberadamente NO emitimos fatwa. Donde hay diferencia entre escuelas
 * (醤油, 味噌) se dice que la hay, y no se decide por el usuario.
 *
 * 100% offline, sin API.
 */

export type HalalStatus = 'haram' | 'doubtful' | 'halal';

export interface Ingredient {
  /** Forma tal y como suele imprimirse en la etiqueta. */
  ja: string;
  /** Lectura en kana, si el término va en kanji. */
  kana?: string;
  romaji: string;
  status: HalalStatus;
  /** Grafías alternativas que aparecen en etiquetas reales. */
  aliases?: string[];
  note: { en: string; es: string; ar: string };
}

const H = 'haram' as const;
const D = 'doubtful' as const;
const L = 'halal' as const;

export const INGREDIENTS: Ingredient[] = [
  // ── Cerdo ──────────────────────────────────────────────────────────────
  {
    ja: '豚肉', kana: 'ぶたにく', romaji: 'butaniku', status: H,
    aliases: ['豚', 'ポーク', 'ぶた'],
    note: {
      en: 'Pork. Explicitly forbidden.',
      es: 'Carne de cerdo. Prohibida de forma explícita.',
      ar: 'لحم الخنزير. محرّم صراحةً.',
    },
  },
  {
    ja: '豚骨', kana: 'とんこつ', romaji: 'tonkotsu', status: H,
    aliases: ['トンコツ'],
    note: {
      en: 'Pork-bone broth. The most common hidden pork in ramen — the noodles may look plain but the soup is pork.',
      es: 'Caldo de hueso de cerdo. Es el cerdo oculto más frecuente en el ramen: los fideos parecen inocentes, el caldo no lo es.',
      ar: 'مرق عظام الخنزير. أكثر مصادر الخنزير خفاءً في الرامن: المعكرونة تبدو عادية لكن الحساء من الخنزير.',
    },
  },
  {
    ja: 'ラード', romaji: 'rādo', status: H,
    aliases: ['豚脂', '豚油'],
    note: {
      en: 'Lard (pork fat). Very common as frying oil and in bread and pastry.',
      es: 'Manteca de cerdo. Muy común como aceite de fritura y en pan y bollería.',
      ar: 'شحم الخنزير. شائع جدًا في القلي وفي الخبز والمعجّنات.',
    },
  },
  {
    ja: 'チャーシュー', romaji: 'chāshū', status: H,
    aliases: ['焼豚', '叉焼'],
    note: {
      en: 'Braised pork slices, standard ramen topping.',
      es: 'Lonchas de cerdo estofado, el acompañamiento estándar del ramen.',
      ar: 'شرائح لحم خنزير مطهوّة، إضافة أساسية في الرامن.',
    },
  },
  {
    ja: 'ベーコン', romaji: 'bēkon', status: H,
    note: { en: 'Bacon.', es: 'Beicon.', ar: 'لحم مقدّد من الخنزير.' },
  },
  {
    ja: 'ハム', romaji: 'hamu', status: H,
    note: {
      en: 'Ham. Unless labelled chicken or turkey ham, assume pork.',
      es: 'Jamón. Salvo que indique pollo o pavo, dé por hecho que es cerdo.',
      ar: 'لحم مُملّح. ما لم يُذكر أنه دجاج أو ديك رومي، فافترض أنه خنزير.',
    },
  },
  {
    ja: 'ゼラチン', romaji: 'zerachin', status: D,
    note: {
      en: 'Gelatin. In Japan usually pork-derived unless the label states fish or beef. Ask.',
      es: 'Gelatina. En Japón suele ser de cerdo salvo que la etiqueta diga pescado o vacuno. Pregunte.',
      ar: 'جيلاتين. في اليابان غالبًا من الخنزير ما لم يُذكر أنه من السمك أو البقر. اسأل.',
    },
  },
  {
    ja: 'ポークエキス', romaji: 'pōku ekisu', status: H,
    aliases: ['豚エキス'],
    note: {
      en: 'Pork extract. Frequent in instant noodles, crisps and sauces.',
      es: 'Extracto de cerdo. Frecuente en fideos instantáneos, aperitivos y salsas.',
      ar: 'خلاصة الخنزير. شائعة في النودلز السريعة والمقرمشات والصلصات.',
    },
  },

  // ── Alcohol ────────────────────────────────────────────────────────────
  {
    ja: '料理酒', kana: 'りょうりしゅ', romaji: 'ryōrishu', status: H,
    note: {
      en: 'Cooking sake. Added alcohol, not a trace of fermentation. Extremely common in Japanese home and restaurant cooking.',
      es: 'Sake de cocina. Alcohol añadido, no un resto de fermentación. Habitualísimo en la cocina japonesa, doméstica y de restaurante.',
      ar: 'ساكي الطهي. كحول مُضاف، وليس أثرًا للتخمير. شائع جدًا في المطبخ الياباني.',
    },
  },
  {
    ja: 'みりん', romaji: 'mirin', status: H,
    aliases: ['味醂', 'ミリン'],
    note: {
      en: 'Sweet rice wine used for glazing. Added alcohol. Hon-mirin is about 14% ABV.',
      es: 'Vino dulce de arroz para glasear. Alcohol añadido. El hon-mirin ronda el 14% vol.',
      ar: 'نبيذ أرز حلو يُستخدم للتزجيج. كحول مُضاف؛ نسبة الكحول في الـ hon-mirin نحو ١٤٪.',
    },
  },
  {
    ja: '酒', kana: 'さけ', romaji: 'sake', status: H,
    aliases: ['日本酒', '清酒', '焼酎', '泡盛', 'ワイン', 'ビール', 'ブランデー', 'ラム酒', '洋酒'],
    note: {
      en: 'Alcoholic drink used as an ingredient.',
      es: 'Bebida alcohólica empleada como ingrediente.',
      ar: 'مشروب كحولي يُستخدم كمكوّن.',
    },
  },
  {
    ja: 'アルコール', romaji: 'arukōru', status: H,
    aliases: ['エタノール', '酒精'],
    note: {
      en: 'Alcohol. On Japanese labels 酒精 often appears as a preservative.',
      es: 'Alcohol. En etiquetas japonesas 酒精 aparece a menudo como conservante.',
      ar: 'كحول. في الملصقات اليابانية يظهر 酒精 غالبًا كمادة حافظة.',
    },
  },

  // ── Dudosos ────────────────────────────────────────────────────────────
  {
    ja: '動物性油脂', romaji: 'dōbutsusei yushi', status: D,
    aliases: ['食用油脂', '牛脂'],
    note: {
      en: 'Animal fats, source unspecified. Could be pork. Ask before eating.',
      es: 'Grasas animales sin especificar origen. Puede ser cerdo. Pregunte antes de comer.',
      ar: 'دهون حيوانية غير محدّدة المصدر. قد تكون من الخنزير. اسأل قبل الأكل.',
    },
  },
  {
    ja: '乳化剤', kana: 'にゅうかざい', romaji: 'nyūkazai', status: D,
    note: {
      en: 'Emulsifier. May be plant- or animal-derived; the label rarely says which.',
      es: 'Emulgente. Puede ser de origen vegetal o animal; la etiqueta rara vez lo aclara.',
      ar: 'مستحلِب. قد يكون نباتيًا أو حيوانيًا، والملصق نادرًا ما يوضّح.',
    },
  },
  {
    ja: 'ショートニング', romaji: 'shōtoningu', status: D,
    note: {
      en: 'Shortening. Usually vegetable in Japan, but animal fat is possible.',
      es: 'Manteca vegetal (shortening). En Japón suele ser vegetal, pero puede llevar grasa animal.',
      ar: 'دهن نباتي صناعي. غالبًا نباتي في اليابان، لكن قد يحتوي دهنًا حيوانيًا.',
    },
  },
  {
    ja: '鶏肉', kana: 'とりにく', romaji: 'toriniku', status: D,
    aliases: ['牛肉', 'チキン', 'ビーフ', '鶏', '牛'],
    note: {
      en: 'Chicken or beef. Lawful meat, but not slaughtered per Islamic rite unless certified. Some accept it, some do not — your choice, not ours.',
      es: 'Pollo o vacuno. Carne lícita, pero no sacrificada según el rito islámico salvo certificación. Hay quien lo acepta y quien no: la decisión es suya, no nuestra.',
      ar: 'دجاج أو لحم بقر. لحم حلال في أصله، لكنه غير مذبوح على الطريقة الإسلامية ما لم يكن معتمدًا. المسألة خلافية، والقرار قرارك.',
    },
  },
  {
    ja: '醤油', kana: 'しょうゆ', romaji: 'shōyu', status: D,
    note: {
      en: 'Soy sauce. Brewed soy sauce contains roughly 2% alcohol formed during fermentation, not added. Scholars differ. Alcohol-free versions exist.',
      es: 'Salsa de soja. La elaborada por fermentación contiene en torno al 2% de alcohol generado en el proceso, no añadido. Los sabios difieren. Existen versiones sin alcohol.',
      ar: 'صلصة الصويا. المخمّرة تحتوي نحو ٢٪ كحولًا ناتجًا عن التخمير لا مضافًا. اختلف العلماء في ذلك، وتوجد أنواع خالية من الكحول.',
    },
  },
  {
    ja: '味噌', kana: 'みそ', romaji: 'miso', status: D,
    note: {
      en: 'Miso. Fermented; some varieties have alcohol added as a preservative. Check for 酒精 on the label.',
      es: 'Miso. Fermentado; algunas variedades llevan alcohol añadido como conservante. Busque 酒精 en la etiqueta.',
      ar: 'ميسو مخمّر؛ بعض الأنواع يُضاف إليها كحول كمادة حافظة. ابحث عن 酒精 في الملصق.',
    },
  },
  {
    ja: 'エキス', romaji: 'ekisu', status: D,
    aliases: ['ブイヨン', 'コンソメ'],
    note: {
      en: 'Extract or stock. Check what it is extracted from — the word alone tells you nothing.',
      es: 'Extracto o caldo concentrado. Compruebe de qué está extraído: la palabra sola no dice nada.',
      ar: 'خلاصة أو مرق مركّز. تحقّق من مصدرها؛ الكلمة وحدها لا تكفي.',
    },
  },

  // ── Lícitos ────────────────────────────────────────────────────────────
  {
    ja: '鰹だし', kana: 'かつおだし', romaji: 'katsuo dashi', status: L,
    aliases: ['だし', '出汁', '昆布', '海苔', '鰹節'],
    note: {
      en: 'Fish or kelp stock. Lawful. The backbone of Japanese cooking and safe.',
      es: 'Caldo de pescado o de alga kombu. Lícito. Es la base de la cocina japonesa y es seguro.',
      ar: 'مرق سمك أو أعشاب بحرية. حلال، وهو أساس المطبخ الياباني.',
    },
  },
  {
    ja: '豆腐', kana: 'とうふ', romaji: 'tōfu', status: L,
    aliases: ['大豆', '納豆', '枝豆'],
    note: {
      en: 'Soy products. Lawful.',
      es: 'Productos de soja. Lícitos.',
      ar: 'منتجات الصويا. حلال.',
    },
  },
  {
    ja: '野菜', kana: 'やさい', romaji: 'yasai', status: L,
    aliases: ['米', '魚', '卵', '塩', '砂糖', '小麦'],
    note: {
      en: 'Vegetables, rice, fish, egg, salt, sugar, wheat. Lawful.',
      es: 'Verduras, arroz, pescado, huevo, sal, azúcar, trigo. Lícitos.',
      ar: 'خضروات وأرز وسمك وبيض وملح وسكر وقمح. حلال.',
    },
  },
];

const SEVERITY: Record<HalalStatus, number> = { haram: 2, doubtful: 1, halal: 0 };

function normalise(s: string): string {
  // \u3000 espacio ideográfico, \u30fb punto medio katakana, \u3001 coma japonesa.
  return s.toLowerCase().replace(/[\s\u3000\u00b7\u30fb\u3001,]/g, '');
}

/** Todas las grafías por las que un ingrediente puede reconocerse. */
function formsOf(ing: Ingredient): string[] {
  return [ing.ja, ing.kana, ing.romaji, ...(ing.aliases ?? [])].filter(Boolean) as string[];
}

/** Busca por cualquier grafía: kanji, kana, romaji o alias. */
export function lookup(query: string): Ingredient[] {
  const q = normalise(query);
  if (!q) return [];
  return INGREDIENTS.filter((ing) =>
    formsOf(ing).some((form) => normalise(form).includes(q)),
  ).sort((a, b) => SEVERITY[b.status] - SEVERITY[a.status]);
}

export interface ScanResult {
  /** El peor estado encontrado; `halal` si no se reconoció nada preocupante. */
  verdict: HalalStatus;
  /** Coincidencias, de más grave a menos. */
  hits: Array<{ ingredient: Ingredient; matched: string }>;
  /** true si no se reconoció ningún término: ausencia de prueba, no prueba de ausencia. */
  inconclusive: boolean;
}

/**
 * Escanea una lista de ingredientes pegada de una etiqueta y devuelve el
 * veredicto más restrictivo encontrado.
 *
 * Importante: no reconocer nada NO significa que sea lícito. Por eso existe
 * `inconclusive` — la interfaz debe decirlo en lugar de dar un visto bueno.
 */
export function scanLabel(text: string): ScanResult {
  const haystack = normalise(text);
  const hits: ScanResult['hits'] = [];

  for (const ing of INGREDIENTS) {
    const matched = formsOf(ing).find((form) => haystack.includes(normalise(form)));
    if (matched) hits.push({ ingredient: ing, matched });
  }

  hits.sort((a, b) => SEVERITY[b.ingredient.status] - SEVERITY[a.ingredient.status]);

  const worrying = hits.filter((h) => h.ingredient.status !== 'halal');
  const verdict = hits.length ? hits[0].ingredient.status : 'halal';

  return { verdict, hits, inconclusive: worrying.length === 0 };
}
