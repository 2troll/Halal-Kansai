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

  // 表示設定
  appearance: '表示設定',
  appearanceHint: '見やすい配色と、無理なく読める文字の大きさをお選びください。',
  theme: '配色',
  themeNight: '夜',
  themePaper: '紙',
  themeSand: '砂',
  themeIndigo: '藍',
  themeContrast: '高コントラスト',
  textSize: '文字の大きさ',
  textNormal: '標準',
  textLarge: '大',
  textXLarge: '特大',
  textXXLarge: '最大',
  done: '完了',

  voiceOutput: '翻訳を音声で読み上げる',
  voiceOutputHint: 'イヤホンをお使いください。導師のお話の最中に、携帯をポケットに入れたまま翻訳を聞けます。',
  voiceOutputTest: '翻訳を音声で読み上げます。',

  voicePick: '音声',
  voiceNone: 'この言語の音声が端末に入っていません',

  roomQrLabel: 'このルームに参加するQRコード',
  roomQrHint: '会衆にお見せください。カメラを向けるだけで、それぞれの言語で参加できます。',

  micDenied: 'マイクまたは音声認識の許可がありません。',

  scanPhoto: '原材料名を撮影する',
  scanPhotoWorking: '原材料名を読み取っています…',
  scanPhotoFailed: '読み取れませんでした。近づいて撮り直すか、下に入力してください。',

  broadcasterLeft: '配信が終了しました。説教を送信していた端末の接続が切れました。',

  screenMode: '画面に映す',
  screenExit: '終了',
  screenWaiting: '説教の開始をお待ちください…',

  // 判定ルール一覧
  revisionTitle: '原材料判定ルール一覧 ― ご確認のお願い',
  revisionIntro: '本アプリが下しうる判定のすべてを一覧にしたものです。ご訂正をお願いいたします。誤りがございましたら番号をお知らせくだされば、そのとおりに改めます。',
  revisionP1T: '決定的であり、AIモデルではありません。',
  revisionP1: 'これは辞書です。同じ表示は常に同じ結果になり、各判定は一行ずつ検証できます。',
  revisionP2T: 'ファトワーは出しません。',
  revisionP2: '学者の見解が分かれる点は、そのように明記し、両論を示したうえで、判断は利用者とその師に委ねます。',
  revisionP3T: '安全のお墨付きは一切与えません。',
  revisionP3: '最も好意的な表現でも「禁じられた原材料は認められませんでした」までです。ハラールであるとは決して申しません。',
  revisionTerms: 'パッケージ上の表記',
  revisionName: '原材料',
  revisionWhy: '判定の理由',
  revisionPrint: '印刷',
  revisionFooter: 'どの規則についてもご指摘を歓迎いたします。番号をお知らせください。いただいた訂正はすべて反映し、あらためてご確認いただきます。',

  // 動作確認
  diagTitle: 'この端末で使えますか',
  diagIntro: 'この端末で実際に何が使えるかを確認します。うまく動かないときに原因を知るためのものです。金曜の当日ではなく、その前にお使いください。',
  diagRun: '確認する',
  diagCopy: '結果をコピー',
  diagPlatform: '動作環境',
  diagPlatformApp: 'インストール済みアプリ',
  diagPlatformWeb: 'ブラウザ',
  diagServer: '翻訳サーバー',
  diagNoConnection: '接続なし',
  diagSpeechIn: '音声認識',
  diagUseRoomMode: 'ここでは使えません ―「配信に参加する」をお使いください',
  diagMic: 'マイクの許可',
  diagVoices: '読み上げ用の音声',
  diagBarcode: 'バーコード読み取り',
  diagTypeInstead: 'ここでは使えません ― 原材料名を貼り付けてください',
  diagPhoto: '原材料名の撮影',
  diagNotifications: '礼拝の通知',
  diagWakeLock: '画面を消さない',
  diagScreenMaySleep: '説教中に画面が消える可能性があります',
  diagOffline: 'オフラインでの動作',
  diagCachedFiles: '件を保存済み',
  diagAvailable: '利用できます',
  diagNotSupported: 'この環境では利用できません',
  diagOnlyInApp: 'インストール済みアプリのみ',

  // Misc
  language: '言語',
  offlineReady: 'オフラインで利用できます',
  loading: '読み込み中…',

  // Comida
  navFood: '食べ物',
  foodTitle: '日本の原材料表示とメニューを読む',
  foodTabScan: '原材料',
  foodTabPhrases: '店員さんに見せる',
  foodScanLabel: '原材料名を貼り付けるか、語をひとつ入力してください',
  foodNoMatch:
    'データベースにありません。許されているという意味ではありませんので、お尋ねください。',
  foodBrowseAll: 'すべての語を見る',
  foodDisclaimer:
    'よりよい質問をするための手引きであり、ファトワーでもハラール認証でもありません。学者の見解が分かれる点はそう明記し、判断はあなたに委ねます。',
  foodPhrasesHint: '文をタップすると全画面で表示され、店員さんに見せられます。',
  foodClose: '閉じる',
};
