/* Service worker Halal Kansai.
   Estrategia (spec §Fase 1):
   - /api/*           → network-only (nunca cachear traducciones).
   - navegación (HTML)→ network-first con caída a caché: si no se hace así, el
     index.html cacheado se sirve para siempre y una versión nueva de la app
     NUNCA llega al usuario (ni a una demo) aunque se haya desplegado.
   - resto del shell  → cache-first (los assets de Vite llevan hash en el nombre).
   - tiles/fonts CDN  → cache-first con tope de entradas.
   Salat y qibla funcionan 100% offline porque todo su código va en el shell. */

const SHELL_CACHE = 'hk-shell-v2';
const RUNTIME_CACHE = 'hk-runtime-v2';
const RUNTIME_MAX_ENTRIES = 120;

const PRECACHE = ['/', '/manifest.webmanifest', '/icons/icon.svg', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

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

/** HTML: la red manda; la caché solo salva cuando no hay conexión. */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = (await caches.match(request)) || (await caches.match('/'));
    if (cached) return cached;
    throw err;
  }
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
