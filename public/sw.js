// Sacred Core service worker — cache-first app shell.
// Bump CACHE_VERSION on deploys that change the shell files below;
// the activate handler drops any caches from older versions.
const CACHE_VERSION = 'sacred-core-shell-v1';
const SHELL_URLS = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // don't intercept cross-origin (APIs, CDNs)
  if (url.pathname.startsWith('/api/')) return; // never cache auth/API responses

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Cache-first: serve immediately, refresh the cache in the background
        // so the next visit picks up new hashed asset chunks after a deploy.
        event.waitUntil(
          fetch(request)
            .then((response) => {
              if (response && response.ok) {
                caches.open(CACHE_VERSION).then((cache) => cache.put(request, response.clone()));
              }
            })
            .catch(() => {})
        );
        return cached;
      }

      return fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match('/'));
    })
  );
});
