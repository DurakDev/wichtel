const CACHE = 'wichteln-v3';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {

  const url = new URL(event.request.url);

  // ----------------------------------------------------------
  // API
  // ----------------------------------------------------------

  // API calls must always go directly to the Worker.
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // ----------------------------------------------------------
  // VIDEO
  // ----------------------------------------------------------

  // Videos must NOT be handled by the cache.
  // Let the browser fetch them directly.
  //
  // This is especially important because video playback
  // can use HTTP Range Requests (206 Partial Content).
  if (
    url.pathname.endsWith('.mp4') ||
    url.pathname.endsWith('.webm') ||
    url.pathname.endsWith('.mov')
  ) {
    return;
  }

  // ----------------------------------------------------------
  // APP.JS / SERVICE WORKER
  // ----------------------------------------------------------

  // These files must always be fetched fresh.
  if (
    url.pathname === '/app.js' ||
    url.pathname === '/sw.js'
  ) {
    event.respondWith(
      fetch(event.request, {
        cache: 'no-store'
      })
    );
    return;
  }

  // ----------------------------------------------------------
  // NORMAL STATIC FILES
  // ----------------------------------------------------------

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        return cached || fetch(event.request);
      })
  );

});
