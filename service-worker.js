/**
 * UNTIL — service worker.
 *
 * Makes the app installable and usable offline after the first visit.
 *
 * Two strategies:
 *  - The app's own files (the page, style.css, script.js, icons, manifest):
 *    NETWORK FIRST. When online the latest version is always used, so an
 *    update published on GitHub Pages shows on the very next visit and the
 *    page, its styles and its script always come from the same release.
 *    The cached copies are only used offline.
 *  - Third-party files (Google Fonts): STALE-WHILE-REVALIDATE.
 *    Served instantly from the cache, refreshed in the background.
 *
 * Only this app's own files and Google Fonts are ever cached, and nothing
 * is ever sent anywhere: this file only keeps copies of what the page
 * downloads anyway. Bump CACHE_NAME whenever an app file changes.
 */
const CACHE_NAME = 'until-cache-v7';

const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './script.js',
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
  if (!sameOrigin && !CACHEABLE_HOSTS.includes(url.hostname)) return; // not ours: the browser handles it
  event.respondWith(sameOrigin ? networkFirst(req) : staleWhileRevalidate(req));
});

/** The app's own files: the network when online, the cache when offline (a page falls back to index.html). */
function networkFirst(req) {
  return caches.open(CACHE_NAME).then((cache) =>
    fetch(req)
      .then((res) => remember(cache, req, res))
      .catch(() =>
        cache
          .match(req)
          .then((hit) => hit || (req.mode === 'navigate' ? cache.match('./index.html') : undefined))
          .then((hit) => hit || Response.error())
      )
  );
}

/** Third-party static files: straight from the cache if there, refreshed in the background. */
function staleWhileRevalidate(req) {
  return caches.open(CACHE_NAME).then((cache) =>
    cache.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => remember(cache, req, res))
        .catch(() => cached || Response.error());
      return cached || network;
    })
  );
}
