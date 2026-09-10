export const en = {
  appName: 'Halal Kansai',
  tagline: 'Daily companion for the Muslim community in Japan',

  // Navigation
  navSalat: 'Salat',
  navQibla: 'Qibla',
  navPlaces: 'Places',
  navKhutbah: 'Khutbah',
  navGuide: 'Guide',

  // Salat
  salatTitle: 'Prayer times',
  salatMethod: 'Muslim World League · Asr Shafi‘i',
  fajr: 'Fajr',
  sunrise: 'Sunrise',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
  nextPrayer: 'Next prayer',
  inTime: 'in',
  useMyLocation: 'Use my location',
  shareTimes: 'Share times',
  shareError: 'Could not create the image.',
  locationDenied: 'Location unavailable — showing Osaka times.',
  city: 'City',

  // Qibla
  qiblaTitle: 'Qibla direction',
  qiblaFromNorth: 'from true north',
  qiblaDistance: 'to the Kaaba',
  compassStart: 'Start compass',
  compassHint: 'Hold your phone flat and away from metal objects.',
  compassUnsupported: 'Compass not available on this device. Use the bearing with a physical compass.',
  compassPermissionDenied: 'Compass permission denied.',
  qiblaAligned: 'Facing the qibla',

  // Places
  placesTitle: 'Halal places in Kansai',
  filterAll: 'All',
  filterMosque: 'Mosques',
  filterRestaurant: 'Restaurants',
  filterShop: 'Shops',
  typeMosque: 'Mosque',
  typeRestaurant: 'Restaurant',
  typeShop: 'Halal shop',
  unverified: 'To be verified on site',
  openMap: 'Map',
  kmAway: 'km away',
  suggestPlace: 'Suggest a place',
  fieldName: 'Name',
  fieldAddress: 'Address (optional)',
  fieldNote: 'Note for the moderator (optional)',
  attachLocation: 'Attach my current location',
  send: 'Send',
  suggestThanks: 'Thank you! Your suggestion will be reviewed before publishing.',
  suggestError: 'Could not send the suggestion. Try again later.',

  // Khutbah
  khutbahTitle: 'Live khutbah translation',
  khutbahDisclaimer:
    'Live translations are a comprehension aid only — not a fatwa nor official religious text.',
  sourceLang: 'Khutbah language',
  targetLang: 'Translate to',
  startListening: 'Start listening',
  stopListening: 'Stop',
  listening: 'Listening…',
  fridayMode: 'Friday mode: the screen stays on while listening.',
  modeLabel: 'Mode',
  modeLocal: 'Listen with my microphone',
  modeTransmit: 'Broadcast to a room (phone near the speaker)',
  modeJoin: 'Join a broadcast',
  roomCode: 'Room code (e.g. osaka-masjid)',
  startBroadcast: 'Start broadcasting',
  joinRoom: 'Join',
  leaveRoom: 'Leave',
  broadcasting: 'Broadcasting…',
  joinedRoom: 'Connected to the room',
  listenersLabel: 'listeners',
  roomTaken: 'That room already has a broadcaster.',
  roomFull: 'The room is full.',
  connectionLost: 'Connection lost.',
  speechUnsupported:
    'Speech recognition is not supported in this browser. Use Chrome on Android.',
  backendUnavailable: 'Translation service unavailable. Check your connection.',
  citationQuran: 'Qur’an',
  citationHadith: 'Hadith — verify source',
  citationDua: 'Du‘a',
  citationUnverified: 'Citation not verified',
  translationUnofficial: 'unofficial translation',

  // Guide
  guideTitle: 'Guide',
  guideSalatH: 'Prayer in Japan',
  guideSalatP:
    'Prayer times here are computed astronomically (MWL method) and work fully offline. Many stations and malls in Kansai now have prayer rooms — check the Places tab.',
  guideHalalH: 'Finding halal food',
  guideHalalP:
    'Japan has no official halal labelling. Look for certification posters (JMA, NAHA), ask staff for ingredient lists, and beware of mirin, sake and animal-derived shortening in processed food.',
  guideJummahH: 'Friday prayer',
  guideJummahP:
    'Khutbahs in Kansai are usually given in Urdu, Indonesian, Japanese or Arabic. The Khutbah tab translates the sermon live to your language.',
  guideAboutH: 'About this app',
  guideAboutP:
    'Free, no ads, no accounts, no tracking. Built by and for the Muslim community of Kansai.',

  // Ingredient checker
  scanSubtitle:
    'Scan the barcode, or paste the 原材料名 line from the package. The reading happens on your phone: no account, and it works with no connection.',
  scanPlaceholder: '原材料名：小麦粉、豚脂、しょうゆ、みりん…',
  scanCheck: 'Check the label',
  scanClear: 'Clear',
  scanCamera: 'Scan barcode',
  scanCameraStop: 'Stop camera',
  scanPointCamera: 'Point the camera at the barcode.',
  scanCameraUnsupported:
    'This browser cannot read barcodes. Use Chrome on Android, or paste the ingredient list below.',
  scanCameraDenied: 'Camera unavailable. Paste the ingredient list below.',
  scanLookingUp: 'Looking up the barcode…',
  scanFound: 'Product',
  scanNotFound:
    'That barcode is not in the open database yet. Paste the ingredient list from the package.',
  scanNoIngredients:
    'The product is in the database but carries no ingredient text. Paste it from the package.',
  scanOffline:
    'No connection, so the barcode cannot be looked up. Paste the ingredient list — the analysis itself works offline.',
  scanNetworkError: 'Could not reach the product database. Paste the ingredient list instead.',
  scanEmpty: 'Paste an ingredient list first.',
  scanVerdict: 'Result',
  verdictHaramTitle: 'Forbidden ingredient found',
  verdictHaramBody: 'The label names at least one ingredient forbidden by explicit text.',
  verdictMushboohTitle: 'Doubtful — verify before eating',
  verdictMushboohBody:
    'Nothing openly forbidden, but there are ingredients whose source the label does not state, or on which scholars differ. Ask the manufacturer.',
  verdictNoHaramTitle: 'No forbidden ingredient recognised',
  verdictNoHaramBody:
    'Every term recognised on this label is unproblematic. Whatever the app did not recognise remains unchecked.',
  verdictUnknownTitle: 'Nothing recognised',
  verdictUnknownBody:
    'Not a single term was recognised. Check that you pasted the 原材料名 line, and read the package yourself.',
  scanNotClearance:
    'This is not a halal certification. The app only reads the words it knows, and never issues a clearance.',
  scanNoFatwa:
    'Where scholars differ, this app says so and leaves the judgement to you and your scholar.',
  scanMarkedLabel: 'The label, marked',
  scanFoundTerms: 'What was recognised',
  scanAskMaker: 'Copy the question for the manufacturer (Japanese)',
  scanCopied: 'Copied. Send it to the maker’s enquiry address.',
  statusHaram: 'Forbidden',
  statusMushbooh: 'Doubtful',
  statusHalal: 'No objection',
  scanOfflineNote: 'The analysis runs offline, on your phone.',
  scanSource: 'Product data: Open Food Facts (ODbL)',

  // Certificación en la pegatina
  verdictCertConflictTitle: 'The sticker and the ingredients contradict each other',
  verdictCertConflictBody:
    'The label claims halal certification, yet it also names an ingredient forbidden by explicit text. A certification does not override that. Do not rely on the sticker: ask the issuing body before eating this.',
  verdictCertDoubtfulTitle: 'Certified — the doubtful terms below are what a certifier audits',
  verdictCertDoubtfulBody:
    'The label claims halal certification, and nothing forbidden by explicit text was found. The doubtful terms below (the source of gelatin, emulsifiers, fats) are exactly what a certification body verifies at the factory, so they are likely already resolved. Check that the certificate is current and that you trust the issuing body.',
  certBadgeCertified: 'Certification declared on the label',
  certBadgeFriendly: 'Not a certification',
  certFriendlyNote:
    'This label says “Muslim friendly”, “no pork” or similar. That is the manufacturer\u2019s own claim, not an audited certification: nobody has verified the source of the other ingredients. Read the list below and ask.',
  certVerifyNote: 'Verify the issuing body and the expiry date. The claim alone is not proof.',

  notifyPrayers: 'Notify me at prayer times',

  // Apariencia
  appearance: 'Appearance',
  appearanceHint: 'Choose the colours you find easiest to look at, and the text size you read comfortably.',
  theme: 'Colours',
  themeNight: 'Night',
  themePaper: 'Paper',
  themeSand: 'Sand',
  themeIndigo: 'Indigo',
  themeContrast: 'High contrast',
  textSize: 'Text size',
  textNormal: 'Normal',
  textLarge: 'Large',
  textXLarge: 'Larger',
  textXXLarge: 'Largest',
  done: 'Done',

  voiceOutput: 'Read the translation aloud',
  voiceOutputHint: 'Put on earphones: you hear the translation while the imam speaks, with the phone in your pocket.',
  voiceOutputTest: 'The translation will be read aloud.',

  voicePick: 'Voice',
  voiceNone: 'No voice installed for this language',

  roomQrLabel: 'QR code to join this room',
  roomQrHint: 'Show this to the congregation: they point their camera at it and join in their own language.',

  micDenied: 'Microphone or speech recognition permission denied.',

  scanPhoto: 'Photograph the label',
  scanPhotoWorking: 'Reading the label…',
  scanPhotoFailed: 'Could not read the label. Try again closer, or type the list below.',

  broadcasterLeft: 'The broadcast has ended: the phone sending the sermon lost its connection.',

  // Misc
  language: 'Language',
  offlineReady: 'Available offline',
  loading: 'Loading…',

  // Comida
  navFood: 'Food',
  foodTitle: 'Reading Japanese labels and menus',
  foodTabScan: 'Ingredients',
  foodTabPhrases: 'Show the staff',
  foodScanLabel: 'Paste an ingredient list, or type one word',
  foodNoMatch: 'Not in the database. That does not mean it is lawful — ask.',
  foodBrowseAll: 'Browse every term',
  foodDisclaimer: 'Guidance to help you ask better questions — not a fatwa and not a halal certification. Where scholars differ, we say so and leave the decision to you.',
  foodPhrasesHint: 'Tap a phrase to show it full-screen to the staff.',
  foodClose: 'Close',
} as const;
