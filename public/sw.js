/* Service worker Halal Kansai.
   Estrategia (spec §Fase 1):
   - /api/*           → network-only (nunca cachear traducciones).
   - app shell        → cache-first con relleno en segundo plano.
   - tiles/fonts CDN  → cache-first con tope de entradas.
   Salat y qibla funcionan 100% offline porque todo su código va en el shell. */

const SHELL_CACHE = 'hk-shell-v1';
const RUNTIME_CACHE = 'hk-runtime-v1';
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
    // App shell (HTML/JS/CSS/iconos): cache-first; los assets de Vite llevan hash.
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
