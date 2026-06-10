# PROYECTO: Halal Kansai — App comunitaria musulmana para Japón
### Especificación para Claude Code · v1.0 · Junio 2026

> **Cómo usar este documento:** abre Claude Code en una carpeta vacía y pega:
> *"Lee PROYECTO_HALAL_KANSAI_CLAUDE_CODE.md y ejecuta la Fase 1. Tengo el prototipo
> halal-kansai.html en esta carpeta como referencia del diseño y la lógica ya validada."*
> Copia también `halal-kansai.html` a la carpeta del proyecto.

---

## 1. VISIÓN

Herramienta diaria gratuita para la comunidad musulmana en Japón (residentes,
conversos japoneses, trabajadores inmigrantes y turistas). Cuatro problemas reales:

1. **Salat** — horas de oración precisas y qibla, offline.
2. **Comida** — encontrar halal en un país sin etiquetado claro.
3. **Jutba del viernes** — el sermón se da en urdu/indonesio/japonés según la mezquita;
   la mayoría de asistentes no lo entiende. Traducción en vivo a +20 idiomas.
4. **Versos del Corán exactos** — cuando el jatib recita, mostrar el árabe REAL
   (de base de datos, no generado por IA) + traducción + referencia.

Usuario objetivo inicial: comunidades de Kansai (mezquitas de Osaka, Kobe, Kioto, Ibaraki).
Idiomas de la interfaz: árabe, inglés, español (ampliable). Soporte RTL obligatorio.

## 2. PROTOTIPO EXISTENTE (punto de partida)

`halal-kansai.html` ya contiene, validado y funcionando:
- Cálculo astronómico de horas de oración (método MWL: Fajr 18°, Isha 17°, Asr Shafi'i) — **portar tal cual**.
- Cálculo de rumbo qibla + brújula con DeviceOrientation (incl. permiso iOS).
- Mapa Leaflet + directorio de lugares con filtros (mezquita/restaurante/tienda).
- Sistema i18n trilingüe con RTL.
- Jutba en vivo: Web Speech API (continuous + interim) → buffer por frases → traducción
  vía LLM con detección de citas (quran/hadith/dua) → tarjetas diferenciadas.
- Identidad visual definida: paleta (noche #10211d, esmeralda #1d6a55, oro #c9a24b,
  papel #f6f1e6), tipografías Fraunces + Inter + Amiri, arco mihrab como firma visual.
  **Mantener esta identidad.**

## 3. ARQUITECTURA OBJETIVO

```
┌─────────────────────────────────────────────┐
│  PWA (frontend)                             │
│  Vite + vanilla TS (o Svelte, decidir en    │
│  Fase 1) · instalable · offline-first       │
│  - Salat/Qibla: 100% offline                │
│  - Lugares: cache offline + sync            │
│  - Jutba: requiere conexión                 │
└──────────────┬──────────────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────────────┐
│  Backend (Node/Hono o FastAPI) en           │
│  Cloudflare Workers / Fly.io / Railway      │
│  - /api/translate  → proxy a Anthropic API  │
│    (la clave API vive AQUÍ, nunca en el     │
│    cliente) + rate limiting por IP          │
│  - /api/quran/match → verificación de       │
│    versos contra BD coránica local          │
│  - /api/places     → CRUD lugares (admin)   │
└──────────────┬──────────────────────────────┘
               │
   ┌───────────▼───────────┐
   │ Datos                 │
   │ - quran.json (texto   │
   │   Uthmani completo,   │
   │   fuente Tanzil.net,  │
   │   licencia libre)     │
   │ - traducciones del    │
   │   Corán (Tanzil tiene │
   │   ES/EN/JA/UR/ID/NE…) │
   │ - places.json/SQLite  │
   └───────────────────────┘
```

## 4. EL PUNTO CRÍTICO: VERSOS 100% EXACTOS

Flujo de la jutba mejorado respecto al prototipo:

1. Speech-to-text capta el fragmento (puede venir destrozado).
2. El LLM clasifica: ¿habla normal o cita (quran/hadith/dua)?
3. **Si es Corán:** el LLM propone sura:aleya candidata → el backend busca en
   `quran.json` con fuzzy matching (normalizar diacríticos árabes, distancia
   Levenshtein sobre texto sin tashkeel) → si hay match con confianza alta,
   se devuelve el **texto Uthmani literal de la base de datos** + la traducción
   **oficial de Tanzil** en el idioma del usuario. La IA nunca "escribe" el verso.
4. Si la confianza es baja → mostrar solo traducción con etiqueta "cita no verificada".
5. Hadices: misma idea en fase posterior con corpus de sunnah (Bujari/Muslim, hay
   datasets libres); mientras tanto, etiqueta "hadiz — verificar fuente".

Datasets a descargar en Fase 2:
- Texto: https://tanzil.net/download/ (Uthmani, XML/txt, libre con atribución)
- Traducciones Tanzil: español (Cortés/García), inglés (Saheeh Int.), japonés,
  urdu, indonesio, bengalí, nepalí*, hindi, tamil, turco, persa, ruso, francés,
  chino, etc. (*si no existe en Tanzil, fallback a traducción LLM marcada como tal).

## 5. IDIOMAS

**Origen (reconocimiento de voz):** ur-PK, id-ID, bn-BD, ne-NP, hi-IN, ta-IN, si-LK,
ja-JP, ar-SA, en-US, tr-TR, ms-MY, fa-IR, vi-VN, th-TH, my-MM, fil-PH, zh-CN, uz-UZ,
ru-RU, fr-FR, sw-TZ, am-ET, es-ES.
⚠️ Probar soporte real de cada locale en Chrome Android; ocultar los no soportados
en runtime (`SpeechRecognition` no expone lista → mantener tabla de probados).

**Destino (traducción):** los mismos +cualquiera (el LLM traduce a todo).

**Mejora futura (Fase 4):** sustituir Web Speech API por Whisper en el backend
(streaming por WebSocket) → mejor con acentos, mezcla de idiomas y árabe coránico
intercalado. Coste: necesita GPU o API de transcripción.

## 6. FASES DE TRABAJO PARA CLAUDE CODE

### Fase 1 — Migración a proyecto real (1 sesión)
- Scaffold: Vite + TS, ESLint, estructura `/src/modules/{salat,qibla,places,khutbah,guide}`.
- Portar todo el prototipo a módulos. Mantener diseño idéntico.
- PWA: manifest.json (nombre "Halal Kansai", iconos verde/oro), service worker
  (cache-first para app shell, network-only para /api).
- Tests unitarios del cálculo de salat (comparar contra horarios publicados de
  Osaka/Tokio, tolerancia ±2 min) y del rumbo qibla (Osaka ≈ 293°).

### Fase 2 — Backend + Corán verificado (1-2 sesiones)
- API Hono en Cloudflare Workers: /api/translate (proxy Anthropic, streaming),
  rate limit, CORS solo desde nuestro dominio.
- Descargar e indexar quran.json + traducciones; implementar fuzzy match
  (normalización árabe: quitar tashkeel, unificar alef/ta marbuta/ya).
- Conectar el flujo de jutba al backend.

### Fase 3 — Comunidad (1 sesión)
- Formulario "sugerir lugar" (va a cola de moderación, panel admin simple
  protegido por token).
- Compartir horarios de salat como imagen (canvas) para grupos de WhatsApp.
- Modo viernes: pantalla siempre encendida (Wake Lock API) durante la jutba.

### Fase 4 — Calidad de audio (investigación)
- Whisper streaming en backend; evaluación de coste.
- Modo "transmisor": un solo móvil junto al altavoz transmite, los demás
  reciben la traducción por WebSocket (resuelve el problema de acústica y
  ahorra batería/datos a todos). **Esta es probablemente la killer feature.**

## 7. PRINCIPIOS NO NEGOCIABLES

- Versos del Corán: solo de base de datos verificada, jamás generados.
- Gratuito, sin anuncios, sin cuentas obligatorias, sin tracking.
- Funciona en móviles baratos Android (mayoría de la comunidad inmigrante).
- RTL perfecto en árabe/urdu/persa.
- Aviso visible: las traducciones de la jutba son ayuda de comprensión,
  no fatwa ni texto religioso oficial.

## 8. PENDIENTE DEL FUNDADOR (Luigi)

- [ ] Verificar in situ coordenadas y datos de los 10 lugares iniciales.
- [ ] Prueba de campo de la jutba un viernes (acústica real de mezquita).
- [ ] Hablar con el imam/comité de la mezquita de Osaka: permiso y difusión.
- [ ] Dominio (ej. halalkansai.jp / .app) y cuenta Cloudflare.
- [ ] Clave API de Anthropic para el backend (con límite de gasto mensual).
