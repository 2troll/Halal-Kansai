/* Service worker Halal Kansai.
   Estrategia (spec §Fase 1):
   - /api/*           → network-only (nunca cachear traducciones).
   - navegación (HTML)→ network-first con caída a caché: si no se hace así, el
     index.html cacheado se sirve para siempre y una versión nueva de la app
     NUNCA llega al usuario (ni a una demo) aunque se haya desplegado.
   - resto del shell  → cache-first (los assets de Vite llevan hash en el nombre).
   - tiles/fonts CDN  → cache-first con tope de entradas.
   Salat y qibla funcionan 100% offline porque todo su código va en el shell. */

const SHELL_CACHE = 'hk-shell-v5';
const RUNTIME_CACHE = 'hk-runtime-v5';
const RUNTIME_MAX_ENTRIES = 120;

/* Base de productos de konbini (contrato de datos §6). No lleva hash en el
   nombre: si se sirviera cache-first como el resto del shell, se quedaría
   congelada para siempre y un producto reclasificado no llegaría nunca. */
const FEED_PATH = '/feed/products.json';

/* El recolector de audio del reconocedor local. Sin hash en el nombre: la
   versión va en la consulta, y hay que subirla al tocar el fichero o los
   navegadores seguirán con el viejo. Debe coincidir con whisper-local.ts. */
const WORKLET_PATH = '/vad-worklet.js?v=1';

const PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // La base de productos de konbini: se guarda desde la instalación porque el
  // sitio donde hace falta es el pasillo de una tienda, sin cobertura.
  FEED_PATH,
  // El recolector de audio de la jutba. Va aparte del resto del código (tiene
  // que correr en el hilo de audio) y no lleva hash en el nombre, así que sin
  // esto no estaría disponible sin conexión — que es justo donde hace falta,
  // dentro de una mezquita de hormigón.
  WORKLET_PATH,
];

self.addEventListener('install', (event) => {
  event.waitUntil(install());
});

/**
 * En la instalación no basta con guardar `/`: hay que guardar TAMBIÉN los
 * archivos que ese HTML necesita.
 *
 * El agujero medido: en la primera visita el service worker se instala DESPUÉS
 * de que la página haya pedido su JS y su CSS, así que esas peticiones no pasan
 * por él y no se guardan. La caché quedaba con cuatro entradas y ningún
 * archivo de la app. Quien instalaba la app y se quedaba sin cobertura antes
 * de volver a abrirla, veía una pantalla en blanco — justo el usuario al que
 * le prometemos que funciona sin conexión.
 */
async function install() {
  const cache = await caches.open(SHELL_CACHE);

  // Uno a uno, NO con addAll.
  //
  // addAll es todo-o-nada: si una sola dirección devuelve 404, rechaza entero
  // y la caché se queda vacía sin decir nada. Pasó de verdad — un icono se
  // quedó por el camino al regenerarlos, y la app llevaba desde entonces
  // prometiendo en pantalla que funciona sin conexión mientras su caché
  // estaba vacía. Un archivo que falte puede costar un icono, nunca el modo
  // sin conexión entero.
  await Promise.all(
    PRECACHE.map(async (url) => {
      const res = await fetch(url, { cache: 'reload' }).catch(() => null);
      if (res && res.ok) await cache.put(url, res);
    }),
  );

  const html = await fetch('/', { cache: 'reload' }).catch(() => null);
  if (html && html.ok) {
    await cache.put('/', html.clone());
    await warmAssets(html, SHELL_CACHE);
  }

  await self.skipWaiting();
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await cache.delete(keys[0]);
    await trimCache(cacheName, maxEntries);
  }
}

/**
 * Guarda en caché los JS y CSS que el HTML nuevo referencia.
 *
 * El agujero que tapa: tras un despliegue, el HTML se actualiza (network-first)
 * y pasa a apuntar a archivos con hash NUEVO, que todavía no están en caché.
 * Si el usuario pierde la cobertura en ese momento —el metro, un sótano de
 * mezquita— abre la app y ve una pantalla en blanco: tiene el HTML nuevo y
 * ninguno de sus archivos.
 *
 * La app promete en su propia pantalla que funciona sin conexión. Esto es lo
 * que hace que la promesa sea cierta también el día que se despliega.
 */
async function warmAssets(response, cacheName) {
  try {
    const html = await response.clone().text();
    const refs = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)]
      .map((m) => new URL(m[1], self.location.origin).href)
      .filter((u) => u.startsWith(self.location.origin));
    if (refs.length === 0) return;

    const cache = await caches.open(cacheName);
    await Promise.all(
      refs.map(async (url) => {
        if (await cache.match(url)) return; // ya estaba
        const res = await fetch(url).catch(() => null);
        if (res && res.ok) await cache.put(url, res);
      }),
    );
  } catch {
    /* calentar la caché nunca puede romper la navegación */
  }
}

/** HTML: la red manda; la caché solo salva cuando no hay conexión. */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      // Sin esperar: la página no se retrasa por precargar sus archivos.
      warmAssets(response, cacheName);
    }
    return response;
  } catch (err) {
    const cached = (await caches.match(request)) || (await caches.match('/'));
    if (cached) return cached;
    throw err;
  }
}

/**
 * Feed de konbini: se responde con lo guardado y se refresca por detrás.
 *
 * Cache-first dejaría el feed congelado; network-first haría esperar a quien
 * está en la tienda sin cobertura hasta que la petición fallara. Esto da lo
 * uno y lo otro: respuesta inmediata siempre, y la copia actualizada para la
 * próxima vez que se abra la app.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) return cached;
  const fresh = await network;
  if (fresh) return fresh;
  // Ni copia ni red: 404 explícito. La app cae a Open Food Facts y a la
  // lectura manual de la etiqueta, que es exactamente lo que hacía sin feed.
  return new Response('', { status: 404 });
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    trimCache(cacheName, RUNTIME_MAX_ENTRIES);
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;

  // Jutba y demás API: siempre red, nunca caché.
  if (url.pathname.startsWith('/api/')) return;

  if (url.origin === self.location.origin) {
    // El documento se pide siempre a la red: es lo único sin hash en el nombre
    // y, por tanto, lo único que puede quedarse congelado en una versión vieja.
    if (event.request.mode === 'navigate' || event.request.destination === 'document') {
      event.respondWith(networkFirst(event.request, SHELL_CACHE));
      return;
    }

    if (url.pathname === FEED_PATH) {
      event.respondWith(staleWhileRevalidate(event.request, SHELL_CACHE));
      return;
    }

    // JS/CSS/iconos: cache-first sin riesgo, porque Vite les pone hash.
    event.respondWith(
      cacheFirst(event.request, SHELL_CACHE).catch(() => caches.match('/')),
    );
    return;
  }

  // Recursos externos (fuentes, tiles OSM): cache-first con tope.
  event.respondWith(
    cacheFirst(event.request, RUNTIME_CACHE).catch(() => new Response('', { status: 504 })),
  );
});
