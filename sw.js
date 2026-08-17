const CACHE_NAME = 'nie-hub-static-v7';
const PRECACHE = [
  './',
  './index.html',
  './moodle/',
  './moodle/index.html',
  './results/',
  './results/index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './js/config.js',
  './js/api.js',
  './js/shared.js',
  './js/dashboard.js',
  './js/attendance.js',
  './js/moodle.js',
  './js/results.js'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE).catch(() => {}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function cacheResponse(request, response) {
  if (response && response.status === 200) {
    const clone = response.clone();
    caches.open(CACHE_NAME).then(c => c.put(request, clone));
  }
  return response;
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Never cache API calls or external worker requests
  if (url.pathname.includes('/api/') || url.pathname.includes('/auth') || url.hostname.includes('workers.dev')) {
    return;
  }

  // Never cache attendance — always fetch live from network
  if (url.pathname.includes('/attendance')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('Attendance is unavailable offline.', {
        headers: { 'Content-Type': 'text/plain' }
      }))
    );
    return;
  }

  // Network-First for other JS and HTML files to avoid stale cache
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.js') || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => cacheResponse(e.request, res))
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-First for static media (images, fonts, svg, icons)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => cacheResponse(e.request, res));
    })
  );
});
