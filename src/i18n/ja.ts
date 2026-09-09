import type { Dict } from './index';

/**
 * 日本語. Registro cortés (ですます) en todo lo que ve el usuario: la app se
 * enseña a personal de restaurante y a organizaciones japonesas, y el registro
 * llano sonaría brusco.
 */
export const ja: Dict = {
  appName: 'ハラール関西',
  tagline: '日本に暮らすムスリムのための毎日の相棒',

  // Navigation
  navSalat: '礼拝時刻',
  navQibla: 'キブラ',
  navPlaces: 'スポット',
  navKhutbah: 'フトバ',
  navGuide: 'ガイド',

  // Salat
  salatTitle: '礼拝の時刻',
  salatMethod: 'ムスリム世界連盟方式 ・ アスルはシャーフィイー派',
  fajr: 'ファジュル（夜明け前）',
  sunrise: '日の出',
  dhuhr: 'ズフル（正午）',
  asr: 'アスル（午後）',
  maghrib: 'マグリブ（日没）',
  isha: 'イシャー（夜）',
  nextPrayer: '次の礼拝',
  inTime: 'あと',
  useMyLocation: '現在地を使う',
  shareTimes: '時刻を共有',
  shareError: '画像を作成できませんでした。',
  locationDenied: '現在地を取得できないため、大阪の時刻を表示しています。',
  city: '都市',

  // Qibla
  qiblaTitle: 'キブラの方角',
  qiblaFromNorth: '真北から',
  qiblaDistance: 'カアバまで',
  compassStart: 'コンパスを開始',
  compassHint: 'スマートフォンを水平に持ち、金属製品から離してください。',
  compassUnsupported:
    'この端末ではコンパスを利用できません。表示された角度を方位磁石でお使いください。',
  compassPermissionDenied: 'コンパスの利用が許可されませんでした。',
  qiblaAligned: 'キブラを向いています',

  // Places
  placesTitle: '関西のハラール・スポット',
  filterAll: 'すべて',
  filterMosque: 'モスク',
  filterRestaurant: '飲食店',
  filterShop: '店舗',
  typeMosque: 'モスク',
  typeRestaurant: '飲食店',
  typeShop: 'ハラール食品店',
  unverified: '現地での確認が必要です',
  openMap: '地図',
  kmAway: 'km先',
  suggestPlace: 'スポットを提案する',
  fieldName: '名称',
  fieldAddress: '住所（任意）',
  fieldNote: '管理者への メモ（任意）',
  attachLocation: '現在地を添える',
  send: '送信',
  suggestThanks: 'ありがとうございます。掲載前に内容を確認いたします。',
  suggestError: '送信できませんでした。しばらくしてからお試しください。',

  // Khutbah
  khutbahTitle: 'フトバ（説教）のリアルタイム翻訳',
  khutbahDisclaimer:
    'リアルタイム翻訳は理解の補助にすぎません。ファトワーでも公式な宗教文書でもありません。',
  sourceLang: 'フトバの言語',
  targetLang: '翻訳先',
  startListening: '聞き取りを開始',
  stopListening: '停止',
  listening: '聞き取り中…',
  fridayMode: '金曜モード：聞き取り中は画面が消えません。',
  modeLabel: 'モード',
  modeLocal: '自分のマイクで聞く',
  modeTransmit: 'ルームに配信する（スピーカーの近くに端末を置く）',
  modeJoin: '配信に参加する',
  roomCode: 'ルームコード（例：osaka-masjid）',
  startBroadcast: '配信を開始',
  joinRoom: '参加',
  leaveRoom: '退出',
  broadcasting: '配信中…',
  joinedRoom: 'ルームに接続しました',
  listenersLabel: '人が視聴中',
  roomTaken: 'このルームには既に配信者がいます。',
  roomFull: 'ルームが満員です。',
  connectionLost: '接続が切れました。',
  speechUnsupported:
    'このブラウザは音声認識に対応していません。Android の Chrome をご利用ください。',
  backendUnavailable: '翻訳サービスに接続できません。通信状況をご確認ください。',
  citationQuran: 'クルアーン',
  citationHadith: 'ハディース ― 出典の確認が必要',
  citationDua: 'ドゥアー（祈願）',
  citationUnverified: '出典は未確認です',
  translationUnofficial: '非公式訳',

  // Guide
  guideTitle: 'ガイド',
  guideSalatH: '日本での礼拝',
  guideSalatP:
    '礼拝時刻は天文計算（ムスリム世界連盟方式）で求めており、通信がなくても動きます。関西では駅や商業施設に祈祷室が増えています。「スポット」タブをご覧ください。',
  guideHalalH: 'ハラールの食べ物を探す',
  guideHalalP:
    '日本にはハラール表示の公的制度がありません。認証マーク（JMA、NAHA など）を探し、店員に原材料を尋ね、加工食品のみりん・酒・動物性ショートニングにご注意ください。',
  guideJummahH: '金曜礼拝',
  guideJummahP:
    '関西のフトバはウルドゥー語・インドネシア語・日本語・アラビア語で行われることが多いです。「フトバ」タブが説教をその場であなたの言語に訳します。',
  guideAboutH: 'このアプリについて',
  guideAboutP:
    '無料・広告なし・アカウント不要・追跡なし。関西のムスリム・コミュニティが自分たちのためにつくりました。',

  // Ingredient checker
  scanSubtitle:
    'バーコードを読み取るか、パッケージの「原材料名」の行を貼り付けてください。判定は端末の中で行われます。アカウントは不要で、通信がなくても使えます。',
  scanPlaceholder: '原材料名：小麦粉、豚脂、しょうゆ、みりん…',
  scanCheck: '原材料を調べる',
  scanClear: '消去',
  scanCamera: 'バーコードを読み取る',
  scanCameraStop: 'カメラを止める',
  scanPointCamera: 'カメラをバーコードに向けてください。',
  scanCameraUnsupported:
    'このブラウザはバーコードを読み取れません。Android の Chrome をお使いになるか、下に原材料名を貼り付けてください。',
  scanCameraDenied: 'カメラを利用できません。下に原材料名を貼り付けてください。',
  scanLookingUp: 'バーコードを照会しています…',
  scanFound: '商品',
  scanNotFound:
    'このバーコードはまだオープンデータベースにありません。パッケージの原材料名を貼り付けてください。',
  scanNoIngredients:
    '商品はデータベースにありますが、原材料の記載がありません。パッケージから貼り付けてください。',
  scanOffline:
    'オフラインのためバーコードを照会できません。原材料名を貼り付けてください。判定自体はオフラインで動きます。',
  scanNetworkError:
    '商品データベースに接続できませんでした。代わりに原材料名を貼り付けてください。',
  scanEmpty: 'まず原材料名を貼り付けてください。',
  scanVerdict: '結果',
  verdictHaramTitle: '禁じられた原材料が見つかりました',
  verdictHaramBody: '明文で禁じられている原材料が、少なくとも一つ記載されています。',
  verdictMushboohTitle: '疑わしい ― 口にする前に確認してください',
  verdictMushboohBody:
    '明らかに禁じられたものはありませんが、由来が表示されていない原材料や、学者の見解が分かれる原材料があります。製造者にお尋ねください。',
  verdictNoHaramTitle: '禁じられた原材料は見当たりません',
  verdictNoHaramBody:
    'この表示の中で判別できた語は、いずれも問題ありません。判別できなかった語は未確認のままです。',
  verdictUnknownTitle: '判別できた語がありません',
  verdictUnknownBody:
    '一語も判別できませんでした。「原材料名」の行を貼り付けたかご確認のうえ、パッケージをご自身でお読みください。',
  scanNotClearance:
    'これはハラール認証ではありません。このアプリは知っている語だけを読み取るもので、安全のお墨付きは一切与えません。',
  scanNoFatwa:
    '学者の見解が分かれる点はそのように示し、判断はあなたとあなたの師に委ねます。',
  scanMarkedLabel: '印をつけた表示',
  scanFoundTerms: '判別できた語',
  scanAskMaker: '製造者への問い合わせ文をコピー（日本語）',
  scanCopied: 'コピーしました。製造者のお問い合わせ先にお送りください。',
  statusHaram: 'ハラーム（禁止）',
  statusMushbooh: 'シュブハ（疑わしい）',
  statusHalal: '問題なし',
  scanOfflineNote: '判定は端末の中で、オフラインで行われます。',
  scanSource: '商品データ：Open Food Facts（ODbL）',

  // 認証表示
  verdictCertConflictTitle: '表示と原材料が矛盾しています',
  verdictCertConflictBody:
    'ハラール認証を謳いながら、明文で禁じられている原材料も記載されています。認証があってもその事実は変わりません。表示を頼りにせず、認証機関にお問い合わせのうえご判断ください。',
  verdictCertDoubtfulTitle: '認証あり ― 下記の「疑わしい」語は認証機関が確認する項目です',
  verdictCertDoubtfulBody:
    'ハラール認証の表示があり、明文で禁じられた原材料は見つかりませんでした。下記の疑わしい語（ゼラチン・乳化剤・油脂の由来）は、まさに認証機関が工場で確認する項目ですので、すでに解決している可能性が高いです。認証が有効であること、また認証機関が信頼できることをご確認ください。',
  certBadgeCertified: '認証の表示あり',
  certBadgeFriendly: 'これは認証ではありません',
  certFriendlyNote:
    'この表示は「ムスリムフレンドリー」「ノンポーク」等です。これは製造者の自己申告であり、第三者の認証ではありません。他の原材料の由来は誰も確認しておりません。下記をお読みのうえ、お尋ねください。',
  certVerifyNote: '認証機関と有効期限をご確認ください。表示だけでは証明になりません。',

  notifyPrayers: '礼拝の時刻に通知する',

  // Misc
  language: '言語',
  offlineReady: 'オフラインで利用できます',
  loading: '読み込み中…',

  // Comida
  navFood: '食べ物',
  foodTitle: '日本の原材料表示とメニューを読む',
  foodTabScan: '🔍 原材料',
  foodTabPhrases: '💬 店員さんに見せる',
  foodScanLabel: '原材料名を貼り付けるか、語をひとつ入力してください',
  foodNoMatch:
    'データベースにありません。許されているという意味ではありませんので、お尋ねください。',
  foodBrowseAll: 'すべての語を見る',
  foodDisclaimer:
    'よりよい質問をするための手引きであり、ファトワーでもハラール認証でもありません。学者の見解が分かれる点はそう明記し、判断はあなたに委ねます。',
  foodPhrasesHint: '文をタップすると全画面で表示され、店員さんに見せられます。',
  foodClose: '閉じる',
};
