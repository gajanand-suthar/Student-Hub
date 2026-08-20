const CACHE_NAME = 'student-hub-spa-v2';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './css/shared.css',
  './css/dashboard.css',
  './css/attendance.css',
  './css/moodle.css',
  './css/results.css',
  './js/config.js',
  './js/api.js',
  './js/shared.js',
  './js/router.js',
  './js/app.js',
  './js/dashboard.js',
  './js/attendance.js',
  './js/moodle.js',
  './js/results.js'
];

// Known SPA routes — all resolve to index.html
const SPA_ROUTES = ['/', '/index.html', '/moodle/', '/moodle', '/attendance/', '/attendance', '/results/', '/results'];

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

  // SPA Navigation Fallback: serve index.html for all known SPA routes
  if (e.request.mode === 'navigate' && (SPA_ROUTES.includes(url.pathname) || !url.pathname.includes('.'))) {
    e.respondWith(
      fetch(e.request)
        .then(res => cacheResponse(e.request, res))
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Network-First for JS, HTML, and CSS files to avoid stale cache
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.js') || url.pathname.endsWith('.html') || url.pathname.endsWith('.css')) {
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
