/* Petit Pas — service worker (offline support) */
const CACHE = 'petitpas-v1';
const CORE = [
  './',
  './index.html',
  './app/main.js',
  './app/store.js',
  './app/audio.js',
  './app/style.css',
  './manifest.webmanifest',
  './icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: serve from cache instantly, refresh in the background.
// Large data/*.json files get cached on first fetch so the app works offline.
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || !request.url.startsWith('http')) return;
  e.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((resp) => {
          if (resp && resp.ok && resp.type === 'basic') {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return resp;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
