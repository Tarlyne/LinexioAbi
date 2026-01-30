
/* LinexioAbi Service Worker V4.2 - Root Protocol */
/* Build Timestamp: 2025-05-22-1745 */

const CACHE_NAME = 'linexioabi-cache-v4.2';
const BASE_PATH = '/LinexioAbi/';

const STATIC_ASSETS = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.json',
  BASE_PATH + 'favicon.svg',
  BASE_PATH + 'apple-touch-icon.png',
  BASE_PATH + 'icon-192.png',
  BASE_PATH + 'icon-512.png'
];

// Installation: Robustes Caching mit absoluten Pfaden
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn(`[PWA] Skipping asset: ${asset}`, err);
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

// Fetch-Strategie: Network-First mit 404-Fallback auf die absolute App-Shell
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || response.status >= 400) {
            return caches.match(BASE_PATH + 'index.html');
          }
          return response;
        })
        .catch(() => {
          return caches.match(BASE_PATH + 'index.html');
        })
    );
    return;
  }

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
        // Fallback für Bilder oder kritische Assets falls nötig
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
