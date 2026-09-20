// Bump only when the app-shell/static asset contract changes. Activate removes
// older caches with this app-owned prefix and preserves unrelated origin data.
const SW_VERSION = 'v250.1';
const CACHE_PREFIX = 'carteira-investimentos-';
const CACHE_NAME = `${CACHE_PREFIX}${SW_VERSION}`;
const CRITICAL_RUNTIME_PATHS = new Set([
  '/protected-local-cloud-authority.js',
]);
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './v250-offline-session.js',
  './v250-runtime.js',
  './icon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

const NEVER_CACHE_PATHS = [
  /\/api\//,
  /\/local-imports\//i,
  /\/firestore/i,
  /\/identitytoolkit/i,
  /\/securetoken/i,
  /\/oauth/i,
  /(?:carteira-investimentos-backup|\.backup)\.(?:json|zip)$/i,
];

function isNeverCache(url) {
  return NEVER_CACHE_PATHS.some(pattern => pattern.test(url.pathname) || pattern.test(url.href));
}

function isVersionSensitiveAsset(request, url) {
  return request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'manifest' ||
    /\.(?:js|css|json)$/i.test(url.pathname);
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const requests = APP_SHELL.map((url) => new Request(url, { cache: 'reload' }));
      await cache.addAll(requests);
    } catch (_) {}
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'GET_V250_VERSION' && event.ports?.[0]) {
    event.ports[0].postMessage({ swVersion: SW_VERSION, cacheName: CACHE_NAME });
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/sw.js') || isNeverCache(url)) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request, { cache: 'no-store' });
        if (fresh.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, fresh.clone());
          await cache.put('./index.html', fresh.clone());
        }
        return fresh;
      } catch (_) {
        const cached = await caches.match(request, { ignoreSearch: true })
          || await caches.match('./index.html')
          || await caches.match('./');
        return cached || Response.error();
      }
    })());
    return;
  }

  if (CRITICAL_RUNTIME_PATHS.has(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const fresh = await fetch(request, { cache: 'no-store' });
        if (fresh.ok && fresh.type === 'basic') await cache.put(request, fresh.clone());
        return fresh;
      } catch (_) {
        const cached = await cache.match(request);
        return cached || Response.error();
      }
    })());
    return;
  }

  if (isVersionSensitiveAsset(request, url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const fresh = await fetch(request, { cache: 'no-store' });
        if (fresh.ok && fresh.type === 'basic') await cache.put(request, fresh.clone());
        return fresh;
      } catch (_) {
        return await cache.match(request) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const fresh = await fetch(request);
      if (fresh.ok && fresh.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, fresh.clone());
      }
      return fresh;
    } catch (_) {
      return cached || Response.error();
    }
  })());
});
