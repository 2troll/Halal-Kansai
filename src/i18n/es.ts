import type { Dict } from './index';

export const es: Dict = {
  appName: 'Halal Kansai',
  tagline: 'Compañera diaria de la comunidad musulmana en Japón',

  navSalat: 'Salat',
  navQibla: 'Qibla',
  navPlaces: 'Lugares',
  navKhutbah: 'Jutba',
  navGuide: 'Guía',

  salatTitle: 'Horas de oración',
  salatMethod: 'Liga del Mundo Islámico · Asr Shafi‘i',
  fajr: 'Fayr',
  sunrise: 'Amanecer',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Magrib',
  isha: 'Isha',
  nextPrayer: 'Próxima oración',
  inTime: 'en',
  useMyLocation: 'Usar mi ubicación',
  shareTimes: 'Compartir horarios',
  shareError: 'No se pudo crear la imagen.',
  locationDenied: 'Ubicación no disponible — mostrando horarios de Osaka.',
  city: 'Ciudad',

  qiblaTitle: 'Dirección de la qibla',
  qiblaFromNorth: 'desde el norte verdadero',
  qiblaDistance: 'hasta la Kaaba',
  compassStart: 'Activar brújula',
  compassHint: 'Sostén el móvil en horizontal y lejos de objetos metálicos.',
  compassUnsupported:
    'Brújula no disponible en este dispositivo. Usa el rumbo con una brújula física.',
  compassPermissionDenied: 'Permiso de brújula denegado.',
  qiblaAligned: 'Mirando a la qibla',

  placesTitle: 'Lugares halal en Kansai',
  filterAll: 'Todos',
  filterMosque: 'Mezquitas',
  filterRestaurant: 'Restaurantes',
  filterShop: 'Tiendas',
  typeMosque: 'Mezquita',
  typeRestaurant: 'Restaurante',
  typeShop: 'Tienda halal',
  unverified: 'Pendiente de verificar in situ',
  openMap: 'Mapa',
  kmAway: 'km de distancia',
  suggestPlace: 'Sugerir un lugar',
  fieldName: 'Nombre',
  fieldAddress: 'Dirección (opcional)',
  fieldNote: 'Nota para el moderador (opcional)',
  attachLocation: 'Adjuntar mi ubicación actual',
  send: 'Enviar',
  suggestThanks: '¡Gracias! Tu sugerencia se revisará antes de publicarse.',
  suggestError: 'No se pudo enviar la sugerencia. Inténtalo más tarde.',

  khutbahTitle: 'Traducción de la jutba en vivo',
  khutbahDisclaimer:
    'Las traducciones en vivo son una ayuda de comprensión — no son fatwa ni texto religioso oficial.',
  sourceLang: 'Idioma de la jutba',
  targetLang: 'Traducir a',
  startListening: 'Empezar a escuchar',
  stopListening: 'Detener',
  listening: 'Escuchando…',
  fridayMode: 'Modo viernes: la pantalla sigue encendida mientras escuchas.',
  modeLabel: 'Modo',
  modeLocal: 'Escuchar con mi micrófono',
  modeTransmit: 'Transmitir a una sala (móvil junto al altavoz)',
  modeJoin: 'Unirse a una transmisión',
  roomCode: 'Código de sala (ej. osaka-masjid)',
  startBroadcast: 'Empezar a transmitir',
  joinRoom: 'Unirse',
  leaveRoom: 'Salir',
  broadcasting: 'Transmitiendo…',
  joinedRoom: 'Conectado a la sala',
  listenersLabel: 'oyentes',
  roomTaken: 'Esa sala ya tiene un transmisor.',
  roomFull: 'La sala está llena.',
  connectionLost: 'Conexión perdida.',
  speechUnsupported:
    'El reconocimiento de voz no funciona en este navegador. Usa Chrome en Android.',
  backendUnavailable: 'Servicio de traducción no disponible. Comprueba tu conexión.',
  citationQuran: 'Corán',
  citationHadith: 'Hadiz — verificar fuente',
  citationDua: 'Du‘a',
  citationUnverified: 'Cita no verificada',
  translationUnofficial: 'traducción no oficial',

  guideTitle: 'Guía',
  guideSalatH: 'La oración en Japón',
  guideSalatP:
    'Las horas se calculan astronómicamente (método MWL) y funcionan sin conexión. Muchas estaciones y centros comerciales de Kansai ya tienen salas de oración — mira la pestaña Lugares.',
  guideHalalH: 'Encontrar comida halal',
  guideHalalP:
    'Japón no tiene etiquetado halal oficial. Busca carteles de certificación (JMA, NAHA), pide la lista de ingredientes y cuidado con el mirin, el sake y las grasas animales en procesados.',
  guideJummahH: 'La oración del viernes',
  guideJummahP:
    'Las jutbas en Kansai suelen darse en urdu, indonesio, japonés o árabe. La pestaña Jutba traduce el sermón en vivo a tu idioma.',
  guideAboutH: 'Sobre esta app',
  guideAboutP:
    'Gratuita, sin anuncios, sin cuentas, sin rastreo. Hecha por y para la comunidad musulmana de Kansai.',

  // Lector de etiquetas
  scanSubtitle:
    'Escanea el código de barras o pega la línea 原材料名 del paquete. La lectura ocurre en tu móvil: sin cuenta y sin necesidad de conexión.',
  scanPlaceholder: '原材料名：小麦粉、豚脂、しょうゆ、みりん…',
  scanCheck: 'Analizar la etiqueta',
  scanClear: 'Limpiar',
  scanCamera: 'Escanear código',
  scanCameraStop: 'Apagar cámara',
  scanPointCamera: 'Apunta la cámara al código de barras.',
  scanCameraUnsupported:
    'Este navegador no lee códigos de barras. Usa Chrome en Android o pega la lista de ingredientes abajo.',
  scanCameraDenied: 'Cámara no disponible. Pega la lista de ingredientes abajo.',
  scanLookingUp: 'Buscando el código…',
  scanFound: 'Producto',
  scanNotFound:
    'Ese código todavía no está en la base abierta. Pega la lista de ingredientes del paquete.',
  scanNoIngredients:
    'El producto está en la base pero sin texto de ingredientes. Cópialo del paquete.',
  scanOffline:
    'Sin conexión, así que no se puede buscar el código. Pega la lista de ingredientes: el análisis funciona sin internet.',
  scanNetworkError: 'No se pudo llegar a la base de productos. Pega la lista de ingredientes.',
  scanEmpty: 'Pega primero una lista de ingredientes.',
  scanVerdict: 'Resultado',
  verdictHaramTitle: 'Ingrediente prohibido encontrado',
  verdictHaramBody: 'La etiqueta nombra al menos un ingrediente prohibido por texto explícito.',
  verdictMushboohTitle: 'Dudoso — verifica antes de comer',
  verdictMushboohBody:
    'Nada abiertamente prohibido, pero hay ingredientes cuyo origen la etiqueta no declara, o sobre los que los sabios difieren. Pregunta al fabricante.',
  verdictNoHaramTitle: 'No se reconoció ningún ingrediente prohibido',
  verdictNoHaramBody:
    'Todos los términos reconocidos en esta etiqueta son inofensivos. Lo que la app no reconoció sigue sin comprobar.',
  verdictUnknownTitle: 'No se reconoció nada',
  verdictUnknownBody:
    'No se reconoció ni un solo término. Comprueba que pegaste la línea 原材料名 y lee el paquete tú mismo.',
  scanNotClearance:
    'Esto no es una certificación halal. La app solo lee las palabras que conoce y nunca da vía libre.',
  scanNoFatwa:
    'Donde los sabios difieren, esta app lo dice y deja el dictamen en tus manos y las de tu sabio.',
  scanMarkedLabel: 'La etiqueta, marcada',
  scanFoundTerms: 'Lo que se ha reconocido',
  scanAskMaker: 'Copiar la pregunta para el fabricante (en japonés)',
  scanCopied: 'Copiado. Envíalo a la dirección de consultas del fabricante.',
  statusHaram: 'Prohibido',
  statusMushbooh: 'Dudoso',
  statusHalal: 'Sin objeción',
  scanOfflineNote: 'El análisis se ejecuta sin conexión, en tu móvil.',
  scanSource: 'Datos de producto: Open Food Facts (ODbL)',

  language: 'Idioma',
  offlineReady: 'Disponible sin conexión',
  loading: 'Cargando…',

  // Certificación en la pegatina
  verdictCertConflictTitle: 'La pegatina y los ingredientes se contradicen',
  verdictCertConflictBody:
    'La etiqueta declara certificación halal y a la vez nombra un ingrediente prohibido por texto explícito. Una certificación no anula eso. No te fíes de la pegatina: pregunta a la entidad emisora antes de comerlo.',
  verdictCertDoubtfulTitle: 'Certificado: lo dudoso de abajo es justo lo que audita una certificadora',
  verdictCertDoubtfulBody:
    'La etiqueta declara certificación halal y no se encontró nada prohibido por texto explícito. Los términos dudosos de abajo (el origen de la gelatina, los emulgentes, las grasas) son exactamente lo que una certificadora comprueba en la fábrica, así que es probable que ya estén resueltos. Verifica que el certificado esté vigente y que la entidad emisora te merezca confianza.',
  certBadgeCertified: 'Certificación declarada en la etiqueta',
  certBadgeFriendly: 'Esto no es una certificación',
  certFriendlyNote:
    'La etiqueta dice «apto para musulmanes», «sin cerdo» o algo parecido. Eso lo afirma el fabricante, no es una certificación auditada: nadie ha comprobado el origen del resto de ingredientes. Lee la lista de abajo y pregunta.',
  certVerifyNote: 'Verifica la entidad emisora y la fecha de caducidad. La declaración por sí sola no es prueba.',

  notifyPrayers: 'Avisarme a la hora del rezo',

  // Apariencia
  appearance: 'Apariencia',
  appearanceHint: 'Elige los colores que mejor te entren por los ojos y el tamaño de letra que leas sin esfuerzo.',
  theme: 'Colores',
  themeNight: 'Noche',
  themePaper: 'Papel',
  themeSand: 'Arena',
  themeIndigo: 'Índigo',
  themeContrast: 'Alto contraste',
  textSize: 'Tamaño del texto',
  textNormal: 'Normal',
  textLarge: 'Grande',
  textXLarge: 'Más grande',
  textXXLarge: 'El mayor',
  done: 'Listo',

  voiceOutput: 'Leer la traducción en voz alta',
  voiceOutputHint: 'Ponte los auriculares: oyes la traducción mientras habla el imán, con el móvil en el bolsillo.',
  voiceOutputTest: 'La traducción se leerá en voz alta.',

  // Comida
  navFood: 'Comer',
  foodTitle: 'Leer etiquetas y cartas en japonés',
  foodTabScan: '🔍 Ingredientes',
  foodTabPhrases: '💬 Enseñar al camarero',
  foodScanLabel: 'Pegue una lista de ingredientes, o escriba una palabra',
  foodNoMatch: 'No está en la base. Eso no significa que sea lícito: pregunte.',
  foodBrowseAll: 'Ver todos los términos',
  foodDisclaimer: 'Orientación para que pueda preguntar mejor. No es una fatwa ni una certificación halal. Donde los sabios difieren, se dice y la decisión queda en sus manos.',
  foodPhrasesHint: 'Toque una frase para enseñarla a pantalla completa.',
  foodClose: 'Cerrar',
};
