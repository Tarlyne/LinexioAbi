
/* LinexioAbi Service Worker V3.9 - Manifest Sync Fix */
/* Build Timestamp: 2025-05-22-1400 */

const CACHE_NAME = 'linexioabi-cache-v3.9';
const FONT_CACHE_NAME = 'linexioabi-fonts-v1';

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

// Installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Aktivierung
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== FONT_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Navigations-Strategie
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('index.html').then((cached) => {
        return cached || fetch(event.request);
      })
    );
    return;
  }

  // Manifest-Strategie: Immer Netzwerk bevorzugen, um 404s bei Updates zu vermeiden
  if (url.pathname.endsWith('manifest.json')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Standard-Strategie
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
