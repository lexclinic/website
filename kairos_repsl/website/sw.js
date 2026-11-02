/*
  LexClinic Education Platform — Progressive Web App Service Worker
  Strategy: Network-First for HTML/JS/CSS/JSON with Offline Cache Fallback;
            Direct Pass-Through for HTTP 206 Byte-Range Media (.m4a/.mp4) & POST APIs
*/
const CACHE_NAME = 'lexclinic-pwa-v20261025_v23';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/101/',
  '/event/',
  '/interview/',
  '/attest/',
  '/erc7827/',
  '/nft/',
  '/styles.css?v=20261025_v23',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Always pass through byte-range requests and large audio/video streams so seeking works natively
  if (req.headers.has('range') || url.pathname.endsWith('.m4a') || url.pathname.endsWith('.mp4')) {
    return;
  }

  // Network-first with cache fallback for same-origin pages, scripts, styles, and JSON
  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
          const copy = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return networkRes;
      })
      .catch(() => caches.match(req).then((cachedRes) => cachedRes || caches.match('/')))
  );
});
