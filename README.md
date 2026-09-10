# Halal Kansai

Herramienta diaria **gratuita** para la comunidad musulmana en Japón: horas de
oración y qibla offline, directorio de lugares halal en Kansai y traducción de
la jutba del viernes en vivo a más de 20 idiomas.

> Gratuita, sin anuncios, sin cuentas obligatorias, sin tracking.
> Las traducciones de la jutba son ayuda de comprensión, no fatwa ni texto
> religioso oficial. Los versos del Corán solo saldrán de base de datos
> verificada (Tanzil), jamás generados por IA.

## Estado: Fase 1 completada

- ✅ PWA instalable con Vite + **vanilla TypeScript** (decisión de Fase 1:
  sin framework — bundle mínimo para móviles Android baratos).
- ✅ Módulos en `src/modules/{salat,qibla,places,khutbah,guide}`.
- ✅ Salat: cálculo astronómico MWL (Fajr 18°, Isha 17°, Asr Shafi'i), 100% offline.
- ✅ Qibla: rumbo de círculo máximo + brújula DeviceOrientation (incl. permiso iOS).
- ✅ Lugares: mapa Leaflet + directorio con filtros (mezquita/restaurante/tienda).
  ⚠ Los 10 lugares iniciales están **pendientes de verificación in situ**.
- ✅ Jutba: Web Speech API (continuous + interim) → buffer por frases → cliente
  de `/api/translate` (el backend llega en Fase 2; mientras tanto muestra el
  original con aviso de servicio no disponible).
- ✅ i18n árabe/inglés/español con RTL completo.
- ✅ Service worker: cache-first para el app shell, network-only para `/api/*`.
- ✅ Tests: horarios contra valores publicados MWL (AlAdhan) con tolerancia
  ±2 min para Osaka y Tokio en 3 estaciones, y rumbo qibla verificado.

### Nota sobre la qibla de Osaka

La spec decía «Osaka ≈ 293°». Verificado contra `api.aladhan.com/v1/qibla`:
**Osaka es 290,8°**; 293,0° corresponde a Tokio. Los tests usan los valores
verificados.

## Estado: Fase 2 completada

- ✅ API Hono (`server/`) que corre igual en Node (dev) y **Cloudflare Workers**:
  - `POST /api/translate` — clasifica el segmento (habla/corán/hadiz/dua) y lo
    traduce vía Anthropic Messages API (salida JSON estructurada con
    `output_config.format`). La clave API vive solo en el backend.
  - `POST /api/quran/match` — verificación directa contra la BD coránica.
  - Rate limit por IP y CORS restringido por `ALLOWED_ORIGINS`.
- ✅ **Corán verificado**: texto Uthmani completo de Tanzil.net (6236 aleyas) +
  18 traducciones oficiales (es en ja ur id bn hi ta tr fa ru fr zh ms sw am th uz).
  Para idiomas sin traducción Tanzil (ne, si, vi, my, fil) se usa la del LLM
  marcada como «traducción no oficial».
- ✅ Fuzzy matching: normalización árabe (tashkeel fuera, alef superíndice → alef,
  unificación alef/ta marbuta/ya) + distancia de edición semi-global. El LLM
  solo propone sura:aleya; **el árabe mostrado sale siempre literal de la BD**.
  Umbral de confianza 0,78; por debajo → «cita no verificada».

### Notas de diseño (Fase 2)

- La respuesta de `/api/translate` es JSON completo por segmento, no streaming:
  los segmentos de jutba son frases cortas (~1–2 s de generación) y el cliente
  necesita el objeto entero para elegir la tarjeta. Si se quisiera streaming,
  el sitio natural es la Fase 4 (WebSocket del modo transmisor).
- Modelo por defecto `claude-opus-4-8` (configurable con `ANTHROPIC_MODEL`),
  con `effort: low` para latencia mínima.
- Los 29 MB de datos coránicos no caben en el bundle del worker: en Workers se
  sirven como Static Assets (binding `ASSETS`, ver `wrangler.jsonc`) y se
  cachean en memoria por isolate.


## Estado: Fase 3 completada

- ✅ **Sugerir lugar**: formulario en la pestaña Lugares (con ubicación opcional)
  → `POST /api/places/suggest` → cola de moderación. Panel admin en
  `/admin.html` protegido por token Bearer (`ADMIN_TOKEN`); los lugares
  aprobados salen en `GET /api/places` y la app los fusiona con los de
  fábrica (caché local para offline). En Workers la cola vive en KV
  (binding `SUGGESTIONS`, ver `wrangler.jsonc`).
- ✅ **Compartir horarios como imagen**: canvas 1080×1350 con la identidad
  visual (arco mihrab), vía Web Share API con fallback a descarga PNG —
  pensado para grupos de WhatsApp.
- ✅ **Modo viernes**: Wake Lock API mantiene la pantalla encendida mientras
  la jutba está activa (se re-adquiere al volver a la pestaña y se libera
  al parar).

## Estado: Fase 4 — modo transmisor implementado

- ✅ **Modo transmisor** (la killer feature): en la pestaña Jutba, el móvil
  junto al altavoz elige «Transmitir a una sala» con un código (ej.
  `osaka-masjid`); los demás eligen «Unirse a una transmisión» y reciben por
  WebSocket la traducción **en su propio idioma** (el servidor traduce una
  vez por idioma distinto, no por oyente). Un solo micrófono y una sola
  conexión de datos por mezquita; el resto ahorra batería y datos.
  - Dev local: WebSocket integrado en `npm run dev:server` (@hono/node-ws).
  - Producción: Durable Object por sala (`KhutbahRoomDO`, ver
    `wrangler.jsonc`) para compartir estado entre conexiones.
  - Si el LLM falla, la sala reenvía el texto original sin traducir.
- 📄 **Whisper**: investigación de coste/arquitectura en
  `docs/FASE4_WHISPER.md` (recomendación: Workers AI por chunks; ~13 h/mes
  de jutba → coste casi nulo, y el pipeline posterior no cambia).

## Fase 5 — Comida: escanear el producto, leer la etiqueta y hablar con el camarero

El problema que faltaba por resolver. En Japón las etiquetas están en japonés y
los términos que de verdad importan —豚脂, 豚骨, 料理酒, ゼラチン, 酒精— no salen
en ningún traductor con el matiz religioso. Y en el restaurante la barrera no es
la mala voluntad, es que nadie entiende la pregunta.

- ✅ **Escaneo del producto**: `BarcodeDetector` (API nativa del navegador, sin
  librería) lee el código JAN/EAN con la cámara y trae la lista de ingredientes
  de **Open Food Facts** (base abierta ODbL, sin clave, sin cuota y sin tarjeta).
  Si el producto no está o no hay cobertura, se pega la lista a mano y el
  resultado es idéntico: el dictamen nunca depende de la red.
- ✅ **Motor local y determinista** (`src/modules/ingredients/`): un diccionario
  de términos impresos en envases japoneses —cerdo (豚脂, 豚骨, チャーシュー,
  ハム, ポークエキス), alcohol (料理酒, みりん, 酒精), origen animal sin declarar
  (ゼラチン, 動物性油脂, 乳化剤), aditivos por número E (E441, E120, E920, E631)—
  clasificados en **prohibido / dudoso / sin objeción** con el porqué en árabe,
  inglés y español. Sin modelo y sin red: la misma etiqueta da siempre el mismo
  resultado y cada dictamen es auditable regla a regla.
- ✅ **Coincidencia más larga**, que es donde se juegan los dictámenes:
  `動物性油脂` no se confunde con `植物性油脂`, `みりん風調味料` (dudoso) no se
  confunde con `本みりん` (prohibido), `昆布エキス` no cae en el `エキス` genérico
  y `豚由来ゼラチン` cuenta una sola vez.
- ✅ **Aviso de línea compartida**: «本品製造工場では豚肉を含む製品を製造しています»
  se trata como contaminación cruzada, **no** como cerdo en el producto. Acusar
  de llevar cerdo a algo que solo comparte fábrica es el falso positivo más caro
  que puede cometer esta herramienta.
- ✅ **Nunca da el visto bueno.** Lo más favorable que dice es «no se reconoció
  ningún ingrediente prohibido», y si no reconoce nada lo dice. No reconocer no
  es lo mismo que ser lícito, y confundir las dos cosas en una app religiosa es
  peor que no tener la función.
- ✅ **La etiqueta, marcada**: se devuelve el texto original con cada término
  resaltado por estado, para ver de dónde sale el dictamen.
- ✅ **Pregunta al fabricante lista para enviar**, redactada en japonés cortés de
  negocios con los términos dudosos encontrados: resolver una duda es preguntar
  a la empresa, y la barrera real era escribirlo en japonés.
- ✅ **Diccionario consultable**: una palabra suelta (kanji, kana, romaji o el
  nombre en tu idioma) devuelve la ficha en vez del análisis de etiqueta.
- ✅ **Tarjetas para el personal** (`phrases.ts`): once frases en japonés cortés
  (ですます) que se muestran a pantalla completa. Resuelven en cinco segundos lo
  que cinco minutos de gestos no resuelven.
- ✅ i18n completo ES/EN/AR con RTL, offline, sin API ni claves.
- ✅ Tests: etiquetas japonesas reales, desambiguación por longitud, japonés
  normalizado (全角, katakana/hiragana), contaminación cruzada e integridad
  trilingüe de la base (102 en total).

### Los límites, dichos en la propia aplicación

No emitimos fatwa. Donde las escuelas difieren —醤油 y su ~2% de alcohol de
fermentación, 酒精 añadido, 味噌, la carne no sacrificada según el rito, la
cochinilla— se dice que difieren y la decisión queda en el usuario. La
aplicación ayuda a **preguntar mejor**; no sustituye a una certificación halal
ni a un sabio.


## Fase 6 — Ayuno: imsak, iftar y calendario de Ramadán

Reutiliza el mismo cálculo astronómico de las horas de oración, así que también
funciona sin conexión y sin API.

- ✅ `fastingDay()` — imsak, iftar y duración del ayuno para cualquier fecha.
- ✅ `ramadanCalendar()` — mes completo desde el primer día, de 29 o 30 días.
- ✅ `fastingCountdown()` — cuánto falta para romper o para empezar. Es una
  función **pura**: recibe la hora en lugar de leer el reloj, y por eso puede
  probarse de verdad.
- ✅ 17 tests nuevos (84 en total).

### Dos decisiones honestas

**El margen de imsak es 0 por defecto.** Muchos calendarios adelantan el inicio
del ayuno unos minutos por precaución. Ese margen es costumbre, no obligación:
mostramos el fayr real y dejamos que el usuario añada el suyo si lo desea.

**No calculamos fechas hiyríes.** El comienzo de Ramadán depende del
avistamiento de la luna y cambia de un país a otro. El usuario indica el primer
día y a partir de ahí contamos. Fingir precisión astronómica sobre algo que se
decide mirando el cielo sería mentir con buena presentación.

### Un caso que el test detectó

Después del iftar, el siguiente hito es el imsak de **mañana**. Sin tratarlo,
la cuenta atrás devuelve minutos negativos toda la noche. Hay un test dedicado
justamente a eso.

## En producción

**https://halal-kansai.2troll-p.workers.dev**

Un único Cloudflare Worker sirve la PWA y la API en el mismo origen. Al no
haber dos orígenes no hay CORS que configurar, y el modo transmisor de la
jutba funciona sin ajustes en el cliente.

Todo en plan gratuito, **sin tarjeta y sin ninguna clave de pago**:

| Pieza | Servicio | Nota |
|---|---|---|
| PWA + API | Workers | mismo origen |
| Corán y traducciones Tanzil (27 MB) | Static Assets | fuera del bundle |
| Salas del modo transmisor | Durable Objects | `new_sqlite_classes` = plan gratis |
| Cola de moderación de lugares | KV | |
| Traducción de la jutba | Workers AI | asignación diaria; agotada, cae a MT externa |

### Operación

```bash
npm run deploy      # build + copia de datos + wrangler deploy
npm run smoke       # 21 comprobaciones contra el despliegue REAL
npm run app:android # compila, sincroniza y abre Android Studio
npm run app:ios     # ídem con Xcode
```

**Panel de moderación:** `/admin.html`, protegido por `ADMIN_TOKEN` (secreto
de Cloudflare). Para rotarlo:

```bash
npx wrangler secret put ADMIN_TOKEN
```

### Pruebas de humo: por qué existen

En un solo día aparecieron siete fallos en producción y **ninguno rompía un
test, una compilación ni el lint**: el QR que no leía ningún lector, el panel
de moderación con el texto negro sobre negro, «sugerir un lugar» devolviendo
503, la sala de transmisión que nunca había traducido una palabra, el aviso
de caída que no llegaba, el error del proveedor mostrado como si fuera la
traducción, y el traductor atascado repitiendo una frase ochenta veces.

Los tests unitarios prueban que las piezas funcionan. `npm run smoke` prueba
que el **sistema desplegado** hace lo que promete, que es otra cosa. Cada
comprobación corresponde a un fallo que llegó a producción.

```bash
npm run smoke                          # contra producción
BASE=http://localhost:5173 npm run smoke
ADMIN_TOKEN=... npm run smoke          # incluye el ciclo de moderación
```

Después de cada `npm run deploy`, pasar `npm run smoke`.

Ciclo de un lugar sugerido: la comunidad lo manda desde la pestaña Spots →
aparece en `/admin.html` → al aprobarlo entra en `/api/places` y sale en el
mapa de todos. Verificado extremo a extremo.

## Desarrollo

```bash
npm install
npm run dev         # frontend Vite (proxy /api → localhost:8787)
npm run dev:server  # API local; sin clave usa el traductor libre
npm test            # vitest
npm run lint        # eslint
npm run build       # type-check + build de producción en dist/
npm run icons       # regenerar iconos PNG de la PWA
npm run build:quran # re-descargar Corán + traducciones de Tanzil.net
```

`ANTHROPIC_API_KEY` es **opcional**: sin ella la jutba usa Workers AI y, si
falla, los proveedores libres. Las aleyas salen siempre de Tanzil.

## Aplicaciones nativas

Una sola base de código (Capacitor). Lo que justifica empaquetarla, frente a
la PWA: los avisos a la hora del rezo con el móvil bloqueado (imposible en una
web instalada en iPhone) y la cámara nativa para el código de barras.

- **Android:** APK de 29 MB. Necesita JDK 21 y el SDK de Android.
- **iOS:** 25 MB, arm64, objetivo iOS 16 (lo exige ML Kit). Requiere Xcode con
  la plataforma de iOS descargada (`xcodebuild -downloadPlatform iOS`).

### Dos límites conocidos, para no redescubrirlos

1. **ML Kit no publica arm64 para el simulador de iOS.** En un Mac con Apple
   Silicon la app no se puede probar en el simulador: hay que usar un iPhone.
2. **El WebView no reconoce voz.** El modo «mi micrófono» de la jutba solo
   funciona en el navegador; dentro de la app se oculta y queda el modo
   «unirse a una sala», que es el que se usa en la mezquita.

## Identidad visual

Paleta base: noche `#10211d` · esmeralda `#1d6a55` · oro `#c9a24b` · papel
`#f6f1e6`. Firma visual: arco mihrab (`border-radius: 999px 999px 14px 14px`).

Tipografía del sistema (SF, Roboto, Hiragino según plataforma): es la que el
usuario ya lee todo el día, trae japonés y árabe de verdad y no cuesta una
descarga de red.

**Cinco temas** (noche, papel, arena, índigo, alto contraste) y **cuatro
tamaños de texto**, en dos ejes separados: el color es gusto y luz del sitio,
el tamaño no se elige. Los nombres de variable heredados (`--night`, `--paper`)
son **roles**, no colores literales: un tema nuevo son quince líneas en
`src/styles/themes.css`.

**Sin emojis.** Cada sistema los dibuja distinto, no heredan el color —en alto
contraste seguían en pastel— y hacen ruido. Se sustituyeron por 17 iconos de
trazo en `src/ui/icons.ts`, que se tiñen con el tema y engordan solos cuando
hace falta.

## Próximas fases

- Whisper en el backend (ver `docs/FASE4_WHISPER.md`) tras la prueba de
  campo del modo transmisor.
- Hadices verificados contra corpus de sunnah (Bujari/Muslim) — spec §4.5.

Especificación completa: `PROYECTO_HALAL_KANSAI_CLAUDE_CODE.md` (v1.0, junio 2026).
