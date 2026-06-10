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

## Desarrollo

```bash
npm install
npm run dev       # servidor de desarrollo (proxy /api → localhost:8787)
npm test          # vitest: salat ±2 min y qibla
npm run lint      # eslint
npm run build     # type-check + build de producción en dist/
npm run icons     # regenerar iconos PNG de la PWA desde tools/gen-icons.mjs
```

## Identidad visual

Paleta: noche `#10211d` · esmeralda `#1d6a55` · oro `#c9a24b` · papel `#f6f1e6`.
Tipografías: Fraunces (títulos) · Inter (texto) · Amiri (árabe).
Firma visual: arco mihrab (`border-radius: 999px 999px 14px 14px`).

## Próximas fases

- **Fase 2** — Backend Hono en Cloudflare Workers: `/api/translate` (proxy
  Anthropic con streaming y rate limit), quran.json de Tanzil + fuzzy match
  (sin tashkeel, Levenshtein) para versos 100 % exactos.
- **Fase 3** — Sugerir lugar + moderación, compartir horarios como imagen,
  modo viernes (Wake Lock).
- **Fase 4** — Whisper streaming y modo «transmisor» por WebSocket.

Especificación completa: `PROYECTO_HALAL_KANSAI_CLAUDE_CODE.md` (v1.0, junio 2026).
