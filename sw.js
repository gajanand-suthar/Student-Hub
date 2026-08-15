const CACHE_NAME = 'nie-hub-static-v3';
const PRECACHE = [
  './',
  './index.html',
  './attendance/',
  './attendance/index.html',
  './moodle/',
  './moodle/index.html',
  './results/',
  './results/index.html',
  './manifest.json',
  './icon.svg',
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

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Never cache API calls or external worker requests
  if (url.pathname.includes('/api/') || url.pathname.includes('/auth') || url.hostname.includes('workers.dev')) {
    return;
  }

  // Network-First for JS and HTML files to avoid stale config cache
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.js') || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const c = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, c));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-First for static assets (images, fonts, svg)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, resClone));
        }
        return res;
      });
    })
  );
});
