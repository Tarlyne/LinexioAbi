
/* LinexioAbi Service Worker V3.8 - GitHub Pages Robustness Fix */
/* Build Timestamp: 2025-05-22-1230 */

const CACHE_NAME = 'linexioabi-cache-v3.8';
const FONT_CACHE_NAME = 'linexioabi-fonts-v1';

// Wir fügen die kritischen Code-Dateien zur Pre-Cache-Liste hinzu.
const ASSETS = [
  'index.html',
  'index.tsx',
  'index.css',
  'favicon.svg',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'manifest.json'
];

// Installation: Core Assets cachen
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.debug('[SW] Pre-caching core assets including logic and styles');
      return cache.addAll(['./', ...ASSETS]);
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
          if (cacheName !== CACHE_NAME && cacheName !== FONT_CACHE_NAME) {
            console.debug('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch-Strategien
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. NAVIGATIONS-STRATEGIE: App Shell Pattern
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('index.html').then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Falls wir online sind, aktualisieren wir den Cache im Hintergrund
          if (networkResponse && networkResponse.status === 200) {
             const responseClone = networkResponse.clone();
             caches.open(CACHE_NAME).then(cache => cache.put('index.html', responseClone));
          }
          return networkResponse;
        }).catch(() => {
          console.debug('[SW] Navigation failed, serving from cache');
          return cachedResponse;
        });
        
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 2. FONT-STRATEGIE: Cache-First für Google Fonts
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          return response || fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // 3. STANDARD-STRATEGIE: Cache-First mit Network-Fallback für statische Assets
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Nachrichtenschnittstelle für SKIP_WAITING
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
