const CACHE = 'wichteln-v4';

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

  // API calls must always go directly to the Worker.
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Videos must bypass the cache because playback can use Range Requests.
  if (
    url.pathname.endsWith('.mp4') ||
    url.pathname.endsWith('.webm') ||
    url.pathname.endsWith('.mov')
  ) {
    return;
  }

  // Always fetch the app and service worker fresh.
  if (
    url.pathname === '/app.js' ||
    url.pathname === '/sw.js'
  ) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
    );
    return;
  }

  // If a navigation fails (including participant URLs with query strings),
  // fall back to the cached app shell rather than rejecting the fetch event.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cachedShell =
          await caches.match('/index.html') ||
          await caches.match('/');

        return cachedShell || new Response(
          'Die App ist momentan nicht erreichbar. Bitte prüfe deine Verbindung und lade die Seite erneut.',
          {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          }
        );
      })
    );
    return;
  }

  // Use cached static files when available, otherwise fetch from network.
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});
