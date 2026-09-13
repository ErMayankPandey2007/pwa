// Service Worker for basic PWA installability and offline support
const CACHE_NAME = 'janseva-pwa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through network requests without interfering
  if (event.request.method === 'GET' && !event.request.url.startsWith('chrome-extension')) {
    event.respondWith(
      fetch(event.request).then((res) => {
        if (res) return res;
        return new Response('', { status: 404 });
      }).catch(() => {
        return caches.match(event.request).then((c) => c || new Response('', { status: 503 }));
      })
    );
  }
});
