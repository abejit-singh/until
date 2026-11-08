/**
 * UNTIL — service worker.
 *
 * Makes the app installable and usable offline after the first visit.
 *
 * Two strategies:
 *  - Pages (HTML navigations): NETWORK FIRST. When online, the latest
 *    version is always shown, so an update published on GitHub Pages is
 *    visible on the very next visit. The cached copy is only used offline.
 *    (A cache-first page would keep showing the old version after an update.)
 *  - Everything else (icons, manifest, Google Fonts): STALE-WHILE-REVALIDATE.
 *    Served instantly from the cache, refreshed in the background.
 *
 * Only this app's own files and Google Fonts are ever cached, and nothing
 * is ever sent anywhere: this file only keeps copies of what the page
 * downloads anyway. Bump CACHE_NAME whenever an app file changes.
 */
const CACHE_NAME = 'until-cache-v6';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './favicon-32.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png'
];

/** Third-party hosts whose responses may be cached (public, static files only). */
const CACHEABLE_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// Install: pre-cache the app shell, then activate right away.
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

// Activate: delete caches left by older versions, then take control of open pages.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/** Stores a copy of a successful response (or an opaque cross-origin font file). */
function remember(cache, request, response) {
  if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && CACHEABLE_HOSTS.indexOf(url.hostname) === -1) return; // not ours: browser handles it

  if (req.mode === 'navigate') {
    // Network first for pages; fall back to the cached page when offline.
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        fetch(req)
          .then((res) => remember(cache, req, res))
          .catch(() =>
            cache
              .match(req)
              .then((hit) => hit || cache.match('./index.html'))
              .then((hit) => hit || Response.error())
          )
      )
    );
    return;
  }

  // Stale-while-revalidate for everything else.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => remember(cache, req, res))
          .catch(() => cached || Response.error());
        return cached || network;
      })
    )
  );
});
