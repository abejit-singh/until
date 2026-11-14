/**
 * UNTIL — service worker.
 *
 * Makes the app installable and usable offline after the first visit.
 *
 * Every file comes from this site and the strategy is NETWORK FIRST: when
 * online the latest version is always used, so an update published on GitHub
 * Pages shows on the very next visit, and the page, its styles and its scripts
 * always come from the same release. The cached copies are only used offline.
 *
 * Nothing is ever sent anywhere: this file only keeps copies of what the page
 * downloads anyway. Bump CACHE_NAME whenever a file in APP_SHELL is added,
 * renamed or removed (tests/unit/app-shell.test.js checks the list).
 */
const CACHE_NAME = 'until-cache-v9';

/** Everything the app needs to start offline. Fonts for other alphabets are cached when first used. */
const APP_SHELL = [
  './',
  './index.html',
  './css/fonts.css',
  './css/style.css',
  './js/config.js',
  './js/effects.js',
  './js/events.js',
  './js/flow.js',
  './js/habits.js',
  './js/life.js',
  './js/main.js',
  './js/milestones.js',
  './js/state.js',
  './js/utils.js',
  './js/weeks.js',
  './js/what-if.js',
  './manifest.json',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './fonts/inter-latin.woff2',
  './fonts/jetbrains-mono-latin.woff2',
  './fonts/space-grotesk-latin.woff2'
];

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

// Fetch: this site's files only. The network when online (keeping a copy), the cache when offline.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() =>
          cache
            .match(req)
            .then((hit) => hit || (req.mode === 'navigate' ? cache.match('./index.html') : undefined))
            .then((hit) => hit || Response.error())
        )
    )
  );
});
