# Probar Halal Kansai en tu Mac (con traducción real) — 5 minutos

Esto te da la jutba **traduciendo de verdad**, gratis, sin desplegar nada.
El Mac capta el audio (su micrófono funciona en `localhost`) y el teléfono
recibe la traducción por la WiFi. Lo único de pago es la API de Anthropic,
y solo gastas por uso (céntimos para una prueba).

## 1. Clave de Anthropic (una vez)

1. Entra en https://console.anthropic.com/ → **API Keys** → crea una clave.
2. En **Settings → Limits** ponle un límite de gasto mensual bajo (ej. 5 €)
   para dormir tranquilo.

## 2. Bajar el código y arrancar

En la Terminal del Mac:

```bash
git clone https://github.com/2troll/Halal-Kansai.git
cd Halal-Kansai
git checkout claude/halal-kansai-app-fswvap
npm start
```

`npm start` te pedirá la clave (se queda solo en memoria, no se guarda en el
repo), instalará todo y arrancará backend + frontend. Para no pegarla cada vez,
crea un archivo `.env` con:

```
ANTHROPIC_API_KEY=sk-ant-...
```

> Necesitas Node 20+ (`node -v`). Si no lo tienes: `brew install node`.

## 3. Probar — opción A: solo el Mac (lo más rápido)

1. Abre **Chrome** en el Mac → http://localhost:5173
2. Pestaña **Khutbah** → modo **«Escuchar con mi micrófono»**.
3. Idioma de la jutba: **اردو (Urdu)**. Traducir a: **Español** (o el que quieras).
4. Pulsa **Empezar a escuchar** y pon un vídeo de jutba en urdu de YouTube
   cerca del Mac (o habla tú). Verás las tarjetas de traducción aparecer, y
   las citas del Corán con el árabe verificado de la base de datos.

## 4. Probar — opción B: Mac transmite, móvil recibe (como en la mezquita)

1. En el **Mac** (Chrome, http://localhost:5173): pestaña Khutbah → modo
   **«Transmitir a una sala»** → código `test-osaka` → idioma urdu → **Empezar a transmitir**.
2. En el **móvil**, misma WiFi: abre la URL que Vite imprime como **Network**
   (algo tipo `http://192.168.x.x:5173`).
3. Pestaña Khutbah → modo **«Unirse a una transmisión»** → código `test-osaka`
   → **Traducir a** tu idioma → **Unirse**.
4. Lo que capta el Mac se traduce y aparece en el móvil. Cada idioma distinto
   en la sala se traduce una sola vez (no por persona).

> El móvil como **oyente** no necesita micrófono, por eso funciona por HTTP en
> la red local. Para que un móvil sea **transmisor** de verdad en la mezquita,
> hace falta HTTPS (un despliegue) — eso es el siguiente paso si la prueba va bien.

## 5. Parar

`Ctrl + C` en la Terminal corta backend y frontend.

---

**¿Qué estamos probando aquí?** Lo más frágil: que el reconocimiento capte el
urdu (con árabe coránico intercalado) y que la traducción + verificación de
versos sea útil. Si el oído falla con la acústica real, el plan B es Whisper
(ver `docs/FASE4_WHISPER.md`).
