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

  // Misc
  language: 'Language',
  offlineReady: 'Available offline',
  loading: 'Loading…',
} as const;
