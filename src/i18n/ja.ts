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
  nearestTitle: '最寄りの礼拝場所',
  weekTitle: '今後7日間',
  today: '今日',
  methodMwl: 'ムスリム世界連盟',
  methodKarachi: 'カラチ・イスラーム科学大学',
  methodIsna: '北米イスラーム協会（ISNA）',
  methodEgypt: 'エジプト測量庁',
  methodMakkah: 'ウンム・アル＝クラー（マッカ）',
  methodIndonesia: 'インドネシア宗教省',
  asrShafii: 'アスルはシャーフィイー派',
  asrHanafi: 'アスルはハナフィー派',
  calcSettings: '計算方式',
  asrSchool: 'アスル',
  calcHint: '通っているモスクの方式を選んでください。わからない場合はイマームに聞いてください。',
  fastTitle: '今日の断食',
  fastSuhoor: 'スフール終了',
  fastIftar: 'イフタール',
  fastToIftar: 'イフタールまで',
  fastToSuhoor: 'スフール終了まで',

  // Qibla
  qiblaTitle: 'キブラの方角',
  qiblaFromNorth: '真北から',
  qiblaDistance: 'カアバまで',
  compassStart: 'コンパスを開始',
  compassHint: 'スマートフォンを水平に持ち、金属製品から離してください。',
  compassCalibrate: 'スマートフォンを8の字に数回動かして、コンパスを補正してください。',
  compassTrueNorth: '真北に補正済み',
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
  directions: '経路',
  filterPrayer: '礼拝室',
  typePrayer: '礼拝室',
  searchPlaces: '名前や地域で検索',
  jumuah: 'ジュムア（金曜礼拝）',
  showOnMap: '地図で見る',
  mapOffline: '地図を読み込めませんでした（インターネット未接続、またはVPN・ブロッカーが妨げています）。下のリストと経路案内は使えます。',
  noPlacesFound: '検索に一致する場所はありません。',
  donate: '寄付',
  donateTitle: 'Halal Kansaiを応援する',
  donateText: 'このアプリは無料で、広告も追跡もありません。役に立ったら、開発とサーバー費用を応援していただけます。',
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
  fbTitle: '改善してほしいことは？',
  fbIntro: '動かないこと、足りないこと、わかりにくいことを教えてください。すべてのメッセージを読みます。個人情報は書かないでください。',
  fbKind: '内容',
  fbKindBug: 'うまく動かない',
  fbKindIdea: 'アイデア・足りない機能',
  fbKindData: '情報の誤り（時刻・場所・原材料）',
  fbKindOther: 'その他',
  fbRating: 'このアプリはどのくらい役に立っていますか？',
  fbRatingNone: '回答しない',
  fbMessage: 'メッセージ',
  fbSend: '送信',
  fbSent: 'ありがとうございます。メッセージが届きました。',
  fbQueued: '現在オフラインです。接続が戻ると自動で送信されます。',
  fbTooShort: '内容がわかるように、もう少し書いてください。',
  fbError: '送信できませんでした。しばらくしてからもう一度お試しください。',
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
  scanExamples: '例で試す',
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

  micLevelLabel: 'マイク',
  micGood: 'フトバが聞こえています。',
  micWeak: '音がとても小さいです。スピーカーに近づけてください。',
  micSilence: '音が聞こえません。スピーカーに近づけてください。',
  micUnavailable: 'この端末ではマイクの音量を測れません。',
  micNoMatch: '声は聞こえますが、次の言語の言葉として認識できません：',
  micNoMatchHint: 'イマームが別の言語で話している場合は、上の「フトバの言語」を変更してください。',
  errNetwork: '接続がありません。音声認識にはインターネットが必要です。',
  errAudioCapture: 'マイクを使用できません。他のアプリが使用している可能性があります。',
  errLangUnsupported: 'この端末では、選択したフトバの言語を認識できません。',
  errStart: '音声認識を開始できませんでした。停止してから、もう一度開始してください。',
  earphonesNote: '翻訳を読むためにイヤホンは必要ありません。音声で聞く場合にのみ使います。',

  engineLabel: '音声認識',
  engineBrowser: 'ブラウザで認識（高速・インターネットが必要）',
  engineWhisper: 'この端末で認識（オフライン可・広い場所に強い）',
  engineWhisperHint:
    '初回のみ約80MBを取得し、以後は端末内に残ります。フトバの音声が端末の外に出ることはありません。',
  whisperLoading: 'この端末で認識の準備をしています',
  whisperReady: '準備完了。この端末で動作しています',
  whisperThinking: '文字起こし中…',
  whisperOnGpu: 'グラフィック処理あり',
  whisperOnCpu: 'グラフィック処理なし（低速ですが動作します）',
  whisperSize: 'モデル',
  whisperTiny: '小（80MB・古い端末向け）',
  whisperBase: '標準（150MB・訛りに強い）',

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
  // Base de konbini (feed del productor)
  konbiniFound: 'コンビニ商品データベース',
  konbiniCertified: 'ハラール認証あり（有効）',
  konbiniCertifiedBody:
    '認証はこの商品とこの工場が対象で、ブランド全体ではありません。下の対象範囲をご確認ください。',
  konbiniConfirmed: 'メーカーが書面で確認',
  konbiniConfirmedBody:
    '禁止された原材料はないという書面回答があります。認証ではありません。',
  konbiniLabelClear: '表示に該当する用語なし',
  konbiniLabelClearBody:
    '表示された原材料に禁止・要確認の用語はありません。共用ラインまでは分かりません。',
  konbiniAmbiguous: '情報が足りません',
  konbiniAmbiguousBody:
    '一つ以上の用語はメーカーの回答が必要です。「不可」という意味ではありません。',
  konbiniExcluded: '禁止された原材料が表示されています',
  konbiniExcludedBody:
    'パッケージ自体が禁止に分類される原材料を記載しています。問い合わせるまでもありません。',
  konbiniUnknown: '未確認',
  konbiniUnknownBody: '確認待ちの商品です。いまは表示をお読みください。',
  konbiniExpired: '認証の有効期限切れ',
  konbiniExpiredBody:
    '認証がありましたが期限が切れています。更新されるまでは表示だけが頼りです。',
  konbiniSourceCertificate: 'ハラール認証書より',
  konbiniSourceReply: 'メーカーの書面回答より',
  konbiniSourceLabel: '原材料名の表示より',
  konbiniSourceAllergen: 'チェーンのアレルギー表より',
  konbiniSourceNone: '出典の記録なし',
  konbiniCheckedOn: '確認日',
  konbiniTerms: '問い合わせるべき用語',
  konbiniCertBody: '認証機関',
  konbiniCertScope: '対象範囲',
  konbiniCertExpires: '有効期限',
  konbiniOfflineCopy: '保存済みのデータ（オフライン）',
  konbiniNeedsUpdate:
    '公開されているデータベースはこのアプリより新しい版です。アプリを更新してください。それまでは保存済みのデータを使います。',
  konbiniUnknownCode:
    'このバージョンのアプリはこのコードをまだ知りません。更新すると説明が表示されます。',
  konbiniDisclaimer:
    'これは表示された原材料についての情報です。認証ではなく、コンタミネーションや共用ラインは対象外です。',
  konbiniReadLabelToo:
    '手元のパッケージが最終的な判断材料です。表示が違えば表示に従い、上に貼り付けてください。',
};
