# Fichas de tienda y formularios de privacidad

Halal Kansai · preparado el 14/09/2026 · rama `feature/khutbah-ollama-gratis`

Todo lo de aquí está listo para copiar y pegar. Lo que **no** puedo hacer yo
está marcado con 🔴 (necesita tus cuentas de desarrollador o tu Mac abierto).

**Política de privacidad (URL obligatoria en las dos tiendas):**
`https://halal-kansai.2troll-p.workers.dev/privacidad.html`
Está en `public/privacidad.html`, en ES/EN/JA/AR con RTL, y se publica sola con
`npm run deploy`. Si algún día compras dominio propio, cambia la URL en las dos
fichas.

---

## 1. Textos de la ficha

### Nombre de la app
`Halal Kansai`

### Subtítulo / descripción corta (máx. 30 car. Apple · 80 Google)
| Idioma | Texto |
|---|---|
| ES | Rezo, qibla, halal y jutba |
| EN | Prayer, qibla, halal & khutbah |
| JA | 礼拝・キブラ・ハラール・説教 |
| AR | الصلاة والقبلة والحلال والخطبة |

### Descripción completa — español
```
Halal Kansai es la herramienta diaria para la comunidad musulmana en Japón.
Gratis, sin anuncios y sin registro.

• HORAS DE ORACIÓN calculadas para donde estés, con aviso y widget en la
  pantalla de inicio.
• BRÚJULA QIBLA que apunta a La Meca desde tu posición.
• MAPA HALAL con restaurantes, tiendas y mezquitas de Kansai, y la opción de
  sugerir los que falten.
• LECTOR DE ETIQUETAS: apunta la cámara al 原材料名 de un producto japonés y te
  dice qué ingredientes son dudosos y por qué.
• TRADUCCIÓN DE LA JUTBA EN VIVO: el sermón del viernes, traducido a tu idioma
  mientras se pronuncia, EN TU PROPIO TELÉFONO. El audio no se graba ni sale
  del aparato. Funciona sin conexión una vez descargados los modelos.

Las aleyas del Corán nunca las traduce una máquina: se muestran con la
traducción oficial de Tanzil.

Sin cuentas. Sin anuncios. Sin analítica. Sin rastreo.
```

### Descripción completa — English
```
Halal Kansai is the daily tool for the Muslim community in Japan.
Free, no ads, no sign-up.

• PRAYER TIMES calculated for wherever you are, with notifications and a
  home-screen widget.
• QIBLA COMPASS pointing to Mecca from your position.
• HALAL MAP with restaurants, shops and mosques across Kansai, and a way to
  suggest the ones that are missing.
• LABEL READER: point the camera at the 原材料名 list on a Japanese product and
  it tells you which ingredients are doubtful, and why.
• LIVE KHUTBAH TRANSLATION: the Friday sermon translated into your language as
  it is spoken, ON YOUR OWN PHONE. Audio is never recorded and never leaves the
  device. Works offline once the models are downloaded.

Qur'anic verses are never machine-translated: they are shown with the official
Tanzil translation.

No accounts. No ads. No analytics. No tracking.
```

### Descripción completa — 日本語
```
Halal Kansai は、日本に暮らすムスリムのための毎日の道具です。
無料・広告なし・登録不要。

• 礼拝時刻：今いる場所に合わせて計算。通知とホーム画面ウィジェット付き。
• キブラコンパス：現在地からマッカの方角を示します。
• ハラールマップ：関西のレストラン・店舗・モスク。未掲載の店の提案も可能。
• 原材料リーダー：日本の商品の「原材料名」にカメラを向けると、疑わしい原材料と
  その理由を表示します。
• 説教（フトバ）のライブ翻訳：金曜礼拝の説教を、話されるそばから母語へ。
  処理はすべて端末内で行い、音声は録音も送信もされません。モデルを一度
  ダウンロードすればオフラインで動作します。

クルアーンの章句は機械翻訳しません。Tanzil の公式訳を表示します。

アカウントなし。広告なし。解析なし。追跡なし。
```

### Descripción completa — العربية
```
حلال كنساي أداة يومية للجالية المسلمة في اليابان.
مجاني، بلا إعلانات، وبلا تسجيل.

• أوقات الصلاة محسوبة لمكانك، مع تنبيه وأداة على الشاشة الرئيسية.
• بوصلة القبلة تشير إلى مكة من موقعك.
• خريطة الحلال: مطاعم ومتاجر ومساجد في كنساي، مع إمكانية اقتراح ما ينقص.
• قارئ الملصقات: وجّه الكاميرا إلى قائمة «原材料名» على المنتج الياباني ليخبرك
  بالمكوّنات المشبوهة وسببها.
• ترجمة الخطبة مباشرة: خطبة الجمعة تُترجَم إلى لغتك أثناء إلقائها، داخل هاتفك.
  لا يُسجَّل الصوت ولا يغادر الجهاز. وتعمل دون إنترنت بعد تنزيل النماذج.

آيات القرآن لا تُترجَم آليًا أبدًا: تُعرض بترجمة Tanzil الرسمية.

بلا حسابات. بلا إعلانات. بلا تحليلات. بلا تتبُّع.
```

### Categoría y clasificación
- **Categoría**: Estilo de vida (Lifestyle). Alternativa: Referencia.
- **Clasificación de contenido**: para todos / 4+. No hay violencia, ni compras,
  ni contenido generado por usuarios visible sin revisión (las sugerencias de
  lugares se revisan antes de publicarse — dilo así en el cuestionario).
- **Palabras clave (Apple, 100 car.)**:
  `halal,salat,qibla,muslim,japan,kansai,osaka,prayer,khutbah,mosque,ハラール,礼拝`

---

## 2. Google Play — formulario de Seguridad de los datos

Responde exactamente esto. Está comprobado contra el código.

| Pregunta | Respuesta |
|---|---|
| ¿Recopila o comparte datos de usuario? | **Sí** (por lo de abajo; el resto es todo local) |
| Ubicación | **No se recopila.** Se usa solo en el aparato para calcular rezo y qibla; no se envía a ningún servidor. |
| Audio / grabaciones de voz | **No se recopila.** El audio se transcribe en el propio teléfono y nunca se sube. |
| Fotos / vídeos | **No se recopila.** El OCR de etiquetas es local; la foto no se sube. |
| Contenido generado por el usuario — *texto del sermón* | **Sí se recopila** · Finalidad: **funcionalidad de la app** · **Procesado de forma efímera** (no se almacena) · No se comparte con terceros. Solo cuando el par de idiomas no puede traducirse en el aparato, o en modo sala. |
| Contenido generado por el usuario — *sugerencia de un lugar* | **Sí se recopila y se almacena** · Finalidad: funcionalidad de la app · Opcional para el usuario · Se revisa antes de publicarse. |
| Información personal (nombre, correo, teléfono) | **No.** La app no tiene cuentas. |
| Identificadores del dispositivo / publicidad | **No.** |
| ¿Se cifran los datos en tránsito? | **Sí** (HTTPS/WSS). |
| ¿Puede el usuario pedir que se borren sus datos? | **Sí**, escribiendo a `pagos.euros73@gmail.com`. No hay cuentas que borrar; solo, si acaso, una sugerencia de lugar enviada. |

> 🟢 **Punto fuerte que conviene decir en la ficha**: el audio del sermón se
> procesa en el dispositivo y no se sube. A los revisores les gusta y es verdad.

### Permisos declarados (y por qué)
| Permiso | Para qué |
|---|---|
| `RECORD_AUDIO` | Escuchar la jutba. No se graba ni se sube. |
| `CAMERA` | Leer el 原材料名 y los códigos de barras. |
| `ACCESS_COARSE/FINE_LOCATION` | Horas de rezo y qibla. Cálculo local. |
| `INTERNET` | Mapa, datos de lugares y descarga inicial de modelos. |

---

## 3. App Store — App Privacy

No marques "Data Not Collected": no sería exacto por el texto del sermón en el
caso de reserva. Lo correcto es:

| Sección | Respuesta |
|---|---|
| **Data Not Linked to You** → *User Content* | Marcado. Uso: **App Functionality**. No se usa para seguimiento. |
| **Tracking** | **No.** La app no rastrea y no usa el IDFA. |
| Location | **No recopilado** (se usa solo en el dispositivo). |
| Audio Data | **No recopilado.** |
| Contact Info / Identifiers / Usage Data / Diagnostics | **No.** |

**Textos de permiso** (ya están en `ios/App/App/Info.plist`, revisados y en
inglés claro): micrófono, reconocimiento de voz, cámara, fotos y ubicación.
Todos explican el porqué y dicen que el dato no sale del teléfono — que es
justo lo que Apple exige.

**Nota de revisión para Apple** (pégala en "Notes" al enviar):
```
Halal Kansai is a free tool for the Muslim community in Japan.

The Friday sermon translation runs entirely on the device: speech recognition
(Whisper via transformers.js) and translation (Google ML Kit) both execute
locally. Audio is never recorded, stored or transmitted.

To test the sermon feature: open the "Khutbah" tab, choose source language
Arabic and any target language, press start and play any Arabic speech near the
microphone. The first run downloads the on-device models (Wi-Fi recommended).

No account is required. There is no paid content.
```

---

## 4. Capturas de pantalla 🔴 (hay que hacerlas en un móvil real)

Mínimos: Google pide 2 (hasta 8); Apple pide 6,7" y 5,5" para iPhone.
Las cinco que cuentan la historia, en este orden:
1. Horas de oración con el widget.
2. Brújula qibla.
3. La jutba traduciéndose en directo — **es la pantalla que vende la app**.
4. Mapa halal de Osaka.
5. Lector de etiquetas señalando un ingrediente dudoso.

Se pueden sacar del emulador, pero la de la jutba conviene que sea real.

---

## 5. Pasos para publicar

### Google Play (25 USD, pago único — lo más rápido)
```bash
cd ~/projects/Halal-Kansai
npm run app:build          # compila y sincroniza
npx cap open android       # abre Android Studio
```
En Android Studio: `Build > Generate Signed App Bundle` → crear la clave de
subida (🔴 **guárdala: si se pierde, no se puede volver a actualizar la app**)
→ genera el `.aab` → súbelo en Play Console.

### App Store (99 USD/año)
```bash
npm run app:ios            # abre Xcode
```
En Xcode: elegir el equipo en *Signing & Capabilities*, `Product > Archive`,
y subir con el Organizer a App Store Connect.

---

## 6. Estado, a día de hoy

| Cosa | Estado |
|---|---|
| Traducción dentro del móvil (ML Kit) | ✅ Instalada, sincronizada en Android e iOS |
| Transcripción dentro del móvil (Whisper) | ✅ Ya estaba |
| La jutba no llama al servidor por cada frase | ✅ Arreglado |
| Aguanta una hora sin degradarse | ✅ Lista podada a 80 frases |
| Modelos descargados al elegir idioma | ✅ Conectado |
| `RECORD_AUDIO` declarado | ✅ Explícito en el manifest |
| Textos de permisos iOS | ✅ Revisados |
| Política de privacidad | ✅ ES/EN/JA/AR en `/privacidad.html` |
| Fichas y formularios | ✅ Este documento |
| Build · tests · lint | ✅ 182 tests en verde |
| **Probado en un móvil real** | 🔴 **Falta — el viernes** |
| Capturas | 🔴 Faltan |
| Cuentas de desarrollador | 🔴 Sin comprar |
