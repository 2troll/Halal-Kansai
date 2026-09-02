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


## Fase 5 — Comida: leer etiquetas y hablar con el camarero

El problema que faltaba por resolver. En Japón las etiquetas están en japonés y
los términos que de verdad importan —豚脂, 料理酒, ゼラチン, 酒精— no salen en
ningún traductor con el matiz religioso. Y en el restaurante la barrera no es la
mala voluntad, es que nadie entiende la pregunta.

- ✅ **Base de ingredientes japoneses** (`src/modules/food/ingredients.ts`).
  Búsqueda por kanji, kana, romaji o alias. Clasificación en `haram` /
  `doubtful` / `halal` con el motivo explicado en los tres idiomas.
- ✅ **Escaneo de etiqueta**: se pega la lista de ingredientes completa y
  devuelve el hallazgo más grave, con el detalle de cada coincidencia.
- ✅ **`inconclusive` es un estado de primera clase.** Si no se reconoce ningún
  término, la aplicación dice *«no se reconoció nada»* y **nunca** da el visto
  bueno. No reconocer no es lo mismo que ser lícito, y confundir las dos cosas
  en una app religiosa es peor que no tener la función.
- ✅ **Tarjetas para el personal** (`phrases.ts`): once frases en japonés cortés
  (ですます) que se muestran a pantalla completa. Resuelven en cinco segundos lo
  que cinco minutos de gestos no resuelven.
- ✅ i18n completo ES/EN/AR con RTL, offline, sin API ni claves.
- ✅ 14 tests nuevos (67 en total).

### Los límites, dichos en la propia aplicación

No emitimos fatwa. Donde las escuelas difieren —醤油 y su ~2% de alcohol de
fermentación, 味噌, la carne no sacrificada según el rito— se dice que difieren
y la decisión queda en el usuario. La aplicación ayuda a **preguntar mejor**;
no sustituye a una certificación halal ni a un sabio.


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

## Desarrollo

```bash
npm install
npm run dev         # frontend Vite (proxy /api → localhost:8787)
npm run dev:server  # API local (requiere ANTHROPIC_API_KEY para /api/translate)
npm test            # vitest: salat ±2 min, qibla y matching coránico
npm run lint        # eslint
npm run build       # type-check + build de producción en dist/
npm run icons       # regenerar iconos PNG de la PWA
npm run build:quran # re-descargar Corán + traducciones de Tanzil.net
```

### Despliegue del backend (Cloudflare Workers)

```bash
npx wrangler secret put ANTHROPIC_API_KEY   # clave con límite de gasto mensual
npx wrangler deploy                          # usa wrangler.jsonc
```

## Identidad visual

Paleta: noche `#10211d` · esmeralda `#1d6a55` · oro `#c9a24b` · papel `#f6f1e6`.
Tipografías: Fraunces (títulos) · Inter (texto) · Amiri (árabe).
Firma visual: arco mihrab (`border-radius: 999px 999px 14px 14px`).

## Próximas fases

- Whisper en el backend (ver `docs/FASE4_WHISPER.md`) tras la prueba de
  campo del modo transmisor.
- Hadices verificados contra corpus de sunnah (Bujari/Muslim) — spec §4.5.

Especificación completa: `PROYECTO_HALAL_KANSAI_CLAUDE_CODE.md` (v1.0, junio 2026).
