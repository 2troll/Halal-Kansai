# Jutba: traducción en vivo gratis y sin cuota (Ollama local)

Rama: `feature/khutbah-ollama-gratis`

## 1. El problema (diagnóstico)

La transcripción **ya es gratis e ilimitada**: Whisper corre dentro del móvil
(`src/modules/khutbah/whisper-worker.ts`, vía `@huggingface/transformers`), sin
conexión y sin coste. El tope de "~10.000 palabras y luego se paga" **no está en
la transcripción, sino en la traducción**, que ocurre en el servidor.

El backend elige motor de traducción en `server/src/segment.ts → buildSegment()`:

- **Con `ANTHROPIC_API_KEY`** → usa Claude (`server/src/llm.ts`, modelo
  `claude-opus-4-8`). Es de pago y `worker.ts` lo describe como "clave con
  límite de gasto mensual": al agotar el presupuesto, deja de traducir.
- **Sin clave (el despliegue por defecto en Cloudflare)** → usa **Workers AI**
  (`server/src/ai-translate.ts`, `@cf/meta/llama-3.3-70b-...`) vía el binding
  `AI` de `wrangler.jsonc`. **El plan gratuito de Workers AI trae ~10.000
  "Neurons" al día**; una jutba de 1–1,5 h los agota y, a partir de ahí, o
  factura o Workers AI falla y se cae a MyMemory/Google
  (`server/src/free-translate.ts`), que **desde la nube comparten IP y devuelven
  vacío** → la mezquita ve el original sin traducir.

Ese "~10.000" que notas es la asignación diaria gratuita de Workers AI. Es un
tope **por día y por servicio en la nube**, no algo que se pueda subir sin pagar.

## 2. La solución: Ollama local (gratis, sin cuota)

Se añade un motor de traducción nuevo que corre en **tu Mac** con los modelos
que ya tienes (`qwen2.5:7b`, `llama3.2:3b`). Ollama **no cuenta tokens ni cobra**:
cada fragmento del sermón es una petición independiente a un modelo local, así
que **aguanta una jutba entera —o diez seguidas— sin ningún tope de pago**.

Por qué no se corta en sesiones largas: la arquitectura ya trocea el sermón por
voz (VAD) en fragmentos de una o dos frases. Cada fragmento se traduce por
separado; **no hay ventana de contexto ni presupuesto acumulado que se agote a
la media hora**. Con Ollama detrás, 90 minutos son simplemente muchos fragmentos
cortos, todos gratis.

### Qué se cambió (todo aditivo, no rompe producción)

- **Nuevo** `server/src/ollama-translate.ts`: llama a `POST /api/chat` de Ollama
  con el mismo prompt afinado para jutba que ya usaba el motor de Cloudflare
  (registro de sermón, glosario de términos religiosos, no inventa
  continuaciones). Nunca lanza: si Ollama está apagado o el modelo no está
  descargado, devuelve `null` y el sistema cae al motor de siempre.
- `server/src/segment.ts`: si hay `ollama` configurado, es el **motor
  prioritario**; si no responde, cae al camino existente (Workers AI /
  MyMemory). El árabe del Corán se sigue verificando y mostrando desde Tanzil,
  igual que antes.
- `server/src/app.ts`: `/api/translate` y `/api/refine` usan Ollama si está
  disponible.
- `server/src/node.ts`: lee `OLLAMA_URL` y `OLLAMA_MODEL`, y hace un
  **health-check al arrancar** que avisa por consola si Ollama está apagado o el
  modelo no está descargado. También lo usa el modo transmisor (WebSocket).
- `server/src/worker.ts` y `room-do.ts`: aceptan `OLLAMA_URL` **opcional**. Si
  no se define (el caso normal en Cloudflare), **producción se comporta
  exactamente igual que hoy**.

**Clave de honestidad:** el servidor de Cloudflare **no puede** llamar al
`localhost` de tu Mac. Para que Ollama funcione, la traducción tiene que pasar
por un servidor que **sí** alcance tu Mac. Hay dos formas (abajo).

## 3. Cómo usarlo

### Requisitos en el Mac
```bash
ollama serve                 # deja Ollama encendido
ollama pull qwen2.5:7b       # o el modelo que prefieras
```

### Opción A — RECOMENDADA: todo en el Mac + móviles en la misma WiFi
La más limpia, 100% gratis y sin exponer nada a internet. El Mac tiene que estar
en la mezquita, encendido y en la misma red WiFi que los móviles.

```bash
# Terminal 1 — backend con Ollama
OLLAMA_URL=http://127.0.0.1:11434 OLLAMA_MODEL=qwen2.5:7b npm run dev:server

# Terminal 2 — la PWA (Vite ya expone en la red local: host:true)
npm run dev
```
Los móviles de la congregación abren `http://<IP-de-tu-Mac>:5173` en el
navegador (Vite proxya `/api` → `:8787` → Ollama). El móvil transmisor hace la
transcripción Whisper local y manda los fragmentos; el servidor los traduce con
Ollama a cada idioma presente en la sala. **Sin tope, sin coste.**

Al arrancar verás en consola:
```
🟢 Ollama activado (http://127.0.0.1:11434, modelo qwen2.5:7b).
✓ Ollama listo. Modelos disponibles: qwen2.5:7b, llama3.2:3b
```
Si Ollama está apagado o falta el modelo, te lo dice ahí mismo.

### Opción B — mantener la app de Cloudflare, Ollama por túnel
Si prefieres seguir usando la app desplegada (`halal-kansai.2troll-p.workers.dev`
o la app nativa), expón Ollama con un túnel y define la variable en el Worker:
```bash
cloudflared tunnel --url http://127.0.0.1:11434   # da una URL https pública
# luego, como secreto del Worker:
npx wrangler secret put OLLAMA_URL     # pega la URL del túnel
```
Funciona, pero **el texto del sermón sale de tu Mac por internet** y el túnel
tiene que estar encendido. Menos limpio que la Opción A.

## 4. Trade-offs honestos

- **Calidad**: Claude (nube, de pago) sigue siendo el mejor. `qwen2.5:7b` local
  da una traducción **buena y de registro correcto** para un sermón —claramente
  mejor que MyMemory/Google— pero puede quedar por debajo de Claude en frases
  largas o mezcla de idiomas. `llama3.2:3b` es más rápido pero de menor calidad;
  úsalo solo si el 7B va lento en tu Mac.
- **Latencia**: en Apple Silicon, `qwen2.5:7b` tarda ~1–3 s por fragmento;
  `llama3.2:3b`, ~0,5–1,5 s. La app ya muestra rápido y **refina después**
  (`/api/refine`), así que la latencia se nota poco. En un Mac antiguo/Intel
  puede ir más lento: prueba `llama3.2:3b`.
- **Requisitos**: Ollama **encendido** (`ollama serve`) y el **modelo
  descargado**. Con la Opción A, el Mac debe estar en la mezquita, encendido y
  en la misma WiFi que los móviles. Si eso no es posible, Ollama no puede
  ayudar y la alternativa gratuita es la nube (con su tope) — no hay forma
  gratis e ilimitada que no pase por una máquina tuya.
- **El Corán no cambia**: las aleyas se siguen verificando y mostrando literales
  desde Tanzil; la IA nunca genera el árabe.

## 5. Cómo verificarlo

- **Automático (hecho en sandbox, 9/9 OK)**: `tsc --noEmit` pasa sin errores y
  un arnés con `fetch` simulado confirma: Ollama traduce y limpia la respuesta,
  y si Ollama está caído se cae al motor gratuito sin romperse. Hay además un
  test nuevo `tests/ollama-translate.test.ts` para `npm test` en tu Mac.
- **En una jutba real (Opción A)**:
  1. `ollama serve` + `ollama pull qwen2.5:7b` en el Mac.
  2. Arranca los dos comandos de la Opción A y confirma el `🟢 Ollama activado`.
  3. Abre la jutba en un móvil por `http://<IP-del-Mac>:5173`, habla al
     micrófono unos minutos y comprueba que traduce de forma continua.
  4. Prueba clave: **déjalo 30–40 min sin parar**. Antes se cortaba al agotar la
     cuota; con Ollama debe seguir traduciendo indefinidamente.
  5. Apaga Ollama a propósito un momento: la app no debe quedarse muda (cae al
     motor de respaldo), y al reactivarlo vuelve a traducir con Ollama.
