
/* LinexioAbi Service Worker V4.1 - Smart Navigation Recovery */
/* Build Timestamp: 2025-05-22-1615 */

const CACHE_NAME = 'linexioabi-cache-v4.1';
const STATIC_ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'favicon.svg',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png'
];

// Installation: Robustes Caching
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn(`[PWA] Skipping optional asset: ${asset}`);
        }
      }
    })
  );
  self.skipWaiting();
});

// Aktivierung: Cache-Migration
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch-Strategie: Network-First mit 404-Fallback für Navigation
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. NAVIGATION (HTML/App-Start)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Falls das Netzwerk antwortet, aber eine Fehlerseite (404/500) sendet:
          // Nutze die gecachte App-Shell.
          if (!response || response.status >= 400) {
            return caches.match('index.html');
          }
          return response;
        })
        .catch(() => {
          // Totaler Offline-Zustand: Nutze Cache
          return caches.match('index.html');
        })
    );
    return;
  }

  // 2. ASSETS (JS, CSS, Bilder)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        return new Response('Offline Content Unavailable', { status: 408 });
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
