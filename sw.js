
/* LinexioAbi Service Worker V4.0 - Robust Asset Management */
/* Build Timestamp: 2025-05-22-1530 */

const CACHE_NAME = 'linexioabi-cache-v4.0';
const STATIC_ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'favicon.svg',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png'
];

// Installation: Robustes Caching der statischen Kern-Dateien
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.debug('[PWA] Pre-caching static assets...');
      // Wir nutzen eine Schleife statt addAll, damit ein einzelner 404 
      // nicht die gesamte Installation abbricht.
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn(`[PWA] Failed to pre-cache: ${asset}`);
        }
      }
    })
  );
  self.skipWaiting();
});

// Aktivierung: Alte Caches aufräumen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.debug('[PWA] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch-Strategie: Cache-First für Assets, Network-First für Navigation
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Navigation (HTML): Immer Netzwerk versuchen, Fallback auf Cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('index.html'))
    );
    return;
  }

  // 2. Statische Assets & Vite Bundles: Dynamisches Caching
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Nur gültige Responses cachen (keine opaque/error responses)
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Wir cachen alle lokalen Assets (JS, CSS, Bilder) dynamisch
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback für Offline-Bilder (optional)
        return new Response('Offline', { status: 408, statusText: 'Network unavailable' });
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
