# Halal-Kansai: arquitectura para publicar en las tiendas (gratis e independiente)

Rama: `feature/khutbah-ollama-gratis` · Fecha: 2026-09-14

Este documento reemplaza, **para la versión pública distribuible**, el enfoque
de "Ollama en el Mac de Luigi" (que solo servía en la mezquita con el portátil
presente). El objetivo ahora es: **app gratis en App Store y Google Play, que
funcione para cualquiera en cualquier sitio de Japón, sin depender del Mac de
Luigi ni de su WiFi, e idealmente incluso sin buena conexión.**

> Resumen en una frase: **cada móvil se vuelve autónomo.** Transcribe con
> Whisper en el aparato (ya lo hace) y **traduce con Google ML Kit en el
> aparato** (nuevo), todo offline y gratis. El servidor pasa a ser un extra
> opcional (verificación de aleyas y datos de lugares), no una dependencia.

---

## 1. Arquitectura recomendada

```
   MÓVIL (app nativa Capacitor, funciona sola)
   ┌─────────────────────────────────────────────┐
   │  🎙  Micrófono                                │
   │   └─ Whisper on-device (ya existe)            │  offline · gratis
   │        transcribe la jutba en el aparato      │
   │            │ texto (ar/ur/id/…)               │
   │            ▼                                  │
   │  🌐 Traducción ML Kit on-device (NUEVO)       │  offline · gratis · ilimitado
   │        ar→ja / ar→es / ar→en …                │
   │            │ (si no puede: par no soportado   │
   │            │  o quiere verificación coránica) │
   │            ▼                                  │
   │  ☁  Servidor (opcional, solo si hay conexión) │
   │     · verifica aleyas contra Tanzil           │
   │     · traducción de mayor calidad (Workers AI)│
   └─────────────────────────────────────────────┘
                     │  (solo lectura de datos)
                     ▼
   ☁  Cloudflare (mismo Worker de hoy)
      · D1: lugares halal, mezquitas (plan gratis)
      · Corán Tanzil (assets estáticos, ya está)
```

Tres piezas, y su estado:

| Pieza | Cómo | Estado |
|---|---|---|
| **Transcripción** | Whisper dentro del móvil (`@huggingface/transformers`) | ✅ Ya existe, offline y gratis. Se mantiene. |
| **Traducción del habla** | Google ML Kit on-device (`@capacitor-mlkit/translation`) | ✅ Instalado y sincronizado (Android + iOS). Compila para iPhone real. Falta probarlo en un móvil (viernes). |
| **Texto del Corán** | Tanzil (texto literal, nunca IA) | ✅ Ya existe. La verificación vive hoy en el servidor (mejora offline futura, ver §6). |
| **Datos de lugares/mezquitas** | Cloudflare D1 (plan gratis) + caché en el móvil | 🔶 Recomendación + plan (hoy usa un JSON estático + KV). |

---

## 2. Traducción: on-device vs nube (evaluación honesta)

### Opción A — ON-DEVICE con Google ML Kit  ✅ RECOMENDADA
- **Qué es**: el mismo ML Kit que la app ya usa para escanear códigos y leer
  etiquetas, ahora para traducir. Descarga un modelo pequeño por par de idiomas
  (~30 MB, **una sola vez**) y luego traduce **en el aparato, offline**.
- **Árabe**: **sí, soportado** (junto a ja, en, es, ur, id, bn, hi, tr, ms, fr,
  zh, ru, fa, th, vi, ta, sw… ~59 idiomas).
- **Precio**: **gratis e ilimitado.** No hay cuota diaria ni servidor.
- **Independiente**: no necesita el Mac de Luigi ni su WiFi. Funciona en
  cualquier sitio, incluso sin conexión una vez descargado el modelo.
- **Plugin**: `@capacitor-mlkit/translation` (Android + iOS), del mismo equipo
  (Capawesome) que los plugins ML Kit que ya tienes. Encaja sin fricción.
- **Calidad — el matiz honesto**: ML Kit usa modelos de traducción **pequeños**.
  Para **habla normal** de un sermón (ar/ur/id → ja/es/en) da un resultado
  **comprensible y útil**, claramente mejor que MyMemory/Google-gratis. Pero
  **no llega al nivel** de un modelo grande de nube (Claude/GPT) en frases
  largas, poéticas o de registro clásico. **Punto clave a favor**: el texto más
  delicado —las **aleyas del Corán— NO lo traduce ML Kit**; sale literal de
  Tanzil. Así, lo sagrado se mantiene exacto y ML Kit solo carga con el habla
  corriente, que es donde su calidad basta.

### Opción B — ON-DEVICE con Apple Translation (solo iOS)
- iOS 18+ trae un framework de traducción con **árabe offline** descargable.
  Gratis. Pero **solo iOS** y requiere iOS 18+. Usarlo obligaría a mantener dos
  caminos (uno iOS, otro Android). **No merece la pena**: ML Kit cubre las dos
  plataformas con un solo código. (Se puede añadir más adelante como mejora de
  calidad solo-iOS si se quiere.)

### Opción C — modelo pequeño empaquetado (p. ej. Whisper-style / NLLB reducido)
- Empaquetar tu propio modelo de traducción da control, pero **pesa mucho**
  (cientos de MB), complica el build nativo y es un mantenimiento serio.
  **No recomendado** frente a ML Kit, que ya resuelve descarga y ejecución.

### Opción D — BACKEND gratis en la nube (para muchos usuarios)
Sé honesto: **casi todo lo "gratis en la nube" tiene tope, y un tope por CUENTA
se comparte entre TODOS tus usuarios**, así que se agota rápido con una app
distribuida. Comparativa real:

| Servicio | Tier gratis | ¿Escala a muchos usuarios? |
|---|---|---|
| **Cloudflare Workers AI** (lo que usa hoy) | **10.000 "Neurons"/día por cuenta** (~1.300 respuestas de LLM) | ❌ El tope es de tu cuenta, no por usuario: entre muchos móviles se agota el mismo día. |
| Google Cloud Translation | 500.000 caracteres/mes gratis, luego de pago (tarjeta) | ❌ Se agota y requiere facturación. |
| DeepL API Free | 500.000 caracteres/mes | ❌ No cubre árabe bien; tope mensual. |
| LibreTranslate público | Sin garantías, rate-limited | ❌ Poco fiable; el árabe es flojo. |

**Conclusión**: no existe una traducción de nube "gratis + ilimitada + para
todos". Por eso la **traducción principal debe ser on-device (Opción A)**. La
nube queda como **extra opcional cuando hay conexión** (verificar aleyas y, si
se quiere, refinar una frase), nunca como el motor del que depende la app.

---

## 3. Base de datos en la nube para lugares halal / mezquitas

Cada móvil debe poder consultar los datos **directamente**, sin pasar por el
Mac. Opciones (plan gratis):

| Opción | Límites gratis (2026) | Notas |
|---|---|---|
| **Cloudflare D1** ✅ | 5 GB · **5 M filas leídas/día** · 100 K escritas/día (aplicado en firme desde 1-sep-2026) | **Recomendada**: ya despliegas en Cloudflare Workers, cero cuentas nuevas, mismo `wrangler`. |
| Supabase (Postgres) | 500 MB · el proyecto **se pausa tras ~7 días sin uso** | La pausa es mala para una app comunitaria de tráfico bajo/irregular. |
| Firebase Firestore | 1 GB · 50 K lecturas/día · 20 K escrituras/día | Cuenta Google aparte y SDK más pesado en el bundle. |

**Recomendación: Cloudflare D1.** Es el encaje natural. Para no acercarte
siquiera a los límites: los lugares cambian poco, así que **el móvil descarga la
lista una vez y la cachea** (y/o el Worker la sirve como JSON cacheado en el
edge). Con eso, miles de usuarios consumen muy pocas lecturas reales. Hoy la app
ya sirve lugares como asset estático + cola de sugerencias en KV; migrar la
parte dinámica a D1 es un paso pequeño y encaja en `server/src/store.ts` /
`suggestions.ts`.

> La transcripción (Whisper on-device) **se mantiene tal cual**: ya es offline y
> gratis, no toca nada de esto.

---

## 4. Qué es gratis DE VERDAD vs qué tiene límites

| Elemento | ¿Gratis? | Límite / matiz honesto |
|---|---|---|
| Transcripción Whisper on-device | ✅ Sí | Ninguno. Offline. Usa batería/CPU del móvil. |
| Traducción ML Kit on-device | ✅ Sí | Ilimitada y offline. Descarga ~30 MB/idioma la 1ª vez. Calidad media (no nivel nube). |
| Texto del Corán (Tanzil) | ✅ Sí | Ninguno. Datos estáticos. |
| Cloudflare D1 (lugares) | ✅ Sí | 5 M lecturas/día por cuenta (sobra si se cachea). |
| Traducción de nube (Workers AI) | 🔶 Parcial | 10.000 Neurons/día **por cuenta**, compartidos entre todos. No para producción a escala. |
| **Cuenta de desarrollador Apple** | ❌ No | **99 USD/año, recurrente.** Sin ella no se publica en App Store. |
| **Cuenta de desarrollador Google Play** | ❌ No | **25 USD, pago único** (para siempre). |

La **app puede ser gratis de descargar** en ambas tiendas. Lo que **no** es
gratis es la **membresía de desarrollador** para poder publicar: **~124 USD el
primer año** (99 Apple + 25 Google) y **99 USD/año** a partir del segundo (solo
Apple recurre). No hay forma legal de publicar en App Store sin la cuota anual
de Apple. En Google, los 25 USD son una sola vez.

---

## 5. Pasos para publicar (desde el proyecto Capacitor actual)

Ya tienes `android/` e `ios/` (Capacitor 8). Camino resumido:

**Comunes**
1. Icono y splash (ya hay `tools/gen-icons.mjs`), nombre, descripción, política
   de privacidad (obligatoria en ambas tiendas — hace falta una URL; se puede
   servir desde el propio Worker).
2. `npm run app:build` (compila la web y hace `cap sync`).

**Google Play (más rápido y barato: 25 USD único)**
3. Crear cuenta en Google Play Console (25 USD una vez).
4. `npx cap open android` → en Android Studio, generar un **Android App Bundle
   (.aab)** firmado (clave de subida).
5. Rellenar ficha, clasificación de contenido, y el cuestionario de **Data
   Safety** (declarar que el audio se procesa **en el dispositivo** y no se
   sube — es un punto fuerte de esta app).
6. Subir a "producción" o primero a pruebas cerradas. Revisión: horas a días.

**App Store (99 USD/año)** — ✅ viable: Xcode ya está instalado en el Mac de Luigi.
7. Inscribirse en el Apple Developer Program (99 USD/año). Requiere un Mac con
   Xcode para compilar y subir (solo para *publicar*, no para que la app
   funcione en los móviles de los usuarios). **Xcode ya está listo en tu Mac.**
8. `npx cap open ios` → en Xcode, configurar *signing* (equipo, bundle id),
   `Product > Archive`, subir con el Organizer a App Store Connect.
9. Rellenar ficha + **App Privacy** (igual: audio procesado on-device).
10. Enviar a revisión de Apple (suele ser 1–3 días; a veces piden aclaraciones).

**Permisos a declarar**: micrófono (para la jutba), y ubicación si usas la
brújula/qibla o lugares cercanos. Ambas tiendas exigen textos claros de por qué.

---

## 6. Lo implementado en esta rama (y lo que falta)

**Hecho (compila; `tsc --noEmit` en verde):**
- `src/modules/khutbah/translate-ondevice.ts` — traducción on-device con ML Kit
  y **fallback automático al servidor**: `translateSegmentSmart()` intenta
  primero on-device (gratis/offline) y, si no puede (navegador web, par no
  soportado, modelo sin descargar), llama al servidor **exactamente como antes**.
  Escrito para **compilar sin el plugin instalado** (import dinámico), así que
  no rompe el build actual.
- `src/modules/khutbah/ui.ts` — el modo "local" de la jutba ahora usa
  `translateSegmentSmart` (un cambio de una línea; en web se comporta igual).
- `package.json` — declara `@capacitor-mlkit/translation`.
- `tests/translate-ondevice.test.ts` — pruebas de la lógica de selección de
  idioma (verificado 7/7 con arnés).

**Lo que tienes que hacer tú, Luigi (en tu Mac):** ver la lista de comandos
exactos al final (§8). En resumen: `npm install` + `npx cap sync`, y probar en
un móvil real con `npm run app:android` y `npm run app:ios`. La primera
traducción de cada par de idiomas descarga el modelo (~30 MB) — hazlo con WiFi.

---

> ⚠️ **El simulador de iOS no sirve para probar la traducción.** Los pods de
> ML Kit traen `EXCLUDED_ARCHS[sdk=iphonesimulator*] = arm64`, así que en un Mac
> con Apple Silicon el simulador compila pero SIN ML Kit dentro. Hay que probar
> en un iPhone físico. (Comprobado el 14/09/2026: build de simulador sin
> símbolos de ML Kit; build de `iphoneos` correcto.)

## 7. Decisiones tomadas y roadmap

**Decisiones confirmadas por Luigi (2026-09-14):**
- ✅ **ML Kit on-device es el traductor principal.** (Calidad media en el habla,
  aceptada; el Corán no se ve afectado — sigue saliendo literal de Tanzil.)
- ✅ **Se publica en LAS DOS tiendas** (Google Play + App Store). Luigi paga las
  cuentas de desarrollador (Google 25 USD única + Apple 99 USD/año).
- ✅ **iOS es viable**: Xcode ya está instalado en su Mac.

### FASE 1 — Lanzamiento (lo que bloquea publicar). Estado: casi listo.
1. `npm install` + `npx cap sync` (traer el plugin ML Kit ya declarado).
2. Probar la jutba on-device en Android e iOS reales.
3. Fichas de tienda: icono/splash, textos, **política de privacidad** (URL;
   se puede servir desde el Worker) y cuestionarios de privacidad declarando
   que **el audio se procesa en el dispositivo y no se sube**.
4. Google Play: generar **.aab** firmado y subir. App Store: `Archive` en Xcode
   y subir a App Store Connect. Enviar ambas a revisión.

La app **ya funciona de forma independiente** en Fase 1: transcripción y
traducción on-device, aleyas desde Tanzil, lugares desde el asset estático + KV
actuales. **Nada de lo de Fase 2 bloquea el lanzamiento.**

### FASE 2 — Mejoras (después de publicar, no bloquean)
- **Migrar lugares/mezquitas a Cloudflare D1** y cachearlos en el móvil. Hoy
  funciona con asset estático + KV, así que no corre prisa; se hace cuando el
  volumen de sugerencias comunitarias lo pida. Encaja en `server/src/store.ts`
  y `suggestions.ts`.
- **Verificación de aleyas offline**: hoy vive en el servidor (Tanzil + fuzzy
  match, ~29 MB) y funciona con conexión. Llevarla al móvil (o empaquetar una
  versión reducida) permitiría verificar el Corán **sin conexión**, a cambio de
  más tamaño de app. Mientras, sin conexión se muestra el árabe reconocido sin
  verificar; con conexión, verificado como hoy.
- **Pre-descarga de modelos** al elegir idioma (`ensureModels()` ya está listo
  en el módulo; falta llamarlo desde la pantalla de ajustes, con WiFi).
- **(Opcional, solo iOS)** Apple Translation como motor de mayor calidad en
  iPhone si algún día se quiere subir el listón del habla.

Motivo de dejar D1 y aleyas-offline en Fase 2: **no impiden que la app sea
autónoma hoy** y meterlos antes del lanzamiento solo retrasaría llegar a las
tiendas. Si en pruebas el árabe sin verificar molesta mucho, se adelanta la
verificación offline; sáltalo si no.

---

## 8. Comandos exactos en el Mac (para cerrar la rama)

```bash
cd ~/projects/Halal-Kansai

# 1) Limpiar los temporales que el sandbox no pudo borrar (y el lock de git)
rm -f .verify-*.ts .git/index.lock

# 2) Instalar el plugin de traducción on-device ya declarado + sincronizar nativo
npm install
npx cap sync

# 3) (recomendado) Verificar que todo compila y pasan los tests
npm run build        # tsc --noEmit + vite build
npm test             # incluye tests/translate-ondevice.test.ts

# 4) Confirmar el trabajo en la rama (no toca main ni el despliegue)
git add -A
git commit -m "Distribución: traducción on-device (ML Kit) + arquitectura tiendas"

# 5) Probar en móviles reales (la 1ª traducción de cada par baja ~30 MB, usa WiFi)
npm run app:android  # abre Android Studio → ejecutar en un móvil/emulador
npm run app:ios      # abre Xcode → ejecutar en un iPhone real
```

Notas:
- La rama es `feature/khutbah-ollama-gratis`. Cuando la valides, súbela con
  `git push -u origin feature/khutbah-ollama-gratis` y abre el PR.
- Para publicar (Fase 1, §7): Google Play → `.aab` firmado; App Store → Xcode
  `Product > Archive` → App Store Connect.

## Fuentes
- [ML Kit translation: supported languages (incluye árabe)](https://developers.google.com/ml-kit/language/translation/translation-language-support)
- [ML Kit Translation (on-device)](https://developers.google.com/ml-kit/language/translation)
- [Capacitor ML Kit Translation Plugin (Capawesome)](https://capawesome.io/docs/plugins/mlkit/translation/) · [npm @capacitor-mlkit/translation](https://www.npmjs.com/package/@capacitor-mlkit/translation)
- [Apple Translation framework — LanguageAvailability](https://developer.apple.com/documentation/translation/languageavailability/supportedlanguages) · [iOS 18 Translation API](https://medium.com/aviv-product-tech-blog/ios-18-apples-translation-api-ea9a5afc281f)
- [Cloudflare Workers AI — free tier 10.000 Neurons/día](https://developers.cloudflare.com/workers/platform/pricing/) · [resumen](https://toolfreebie.com/cloudflare-workers-ai/)
- [Cloudflare D1 — pricing/límites](https://developers.cloudflare.com/d1/platform/pricing/)
- [Costes tiendas: Apple 99/año, Google 25 único](https://splitmetrics.com/blog/google-play-apple-app-store-fees/)
