/**
 * Service Worker v252 — PWA Foundation: Periodic Sync, Install Prompt, Offline Fallback, Cache Warming
 * Bump only when the app-shell/static asset contract changes.
 */
var SW_VERSION = 'v252.0';
var CACHE_PREFIX = 'carteira-investimentos-';
var CACHE_NAME = CACHE_PREFIX + SW_VERSION;
var CACHE_STATIC = CACHE_PREFIX + 'static-' + SW_VERSION;
var CACHE_DYNAMIC = CACHE_PREFIX + 'dynamic-' + SW_VERSION;
var CACHE_API = CACHE_PREFIX + 'api-' + SW_VERSION;
var CACHE_ANALYTICS = CACHE_PREFIX + 'analytics-' + SW_VERSION;

var CRITICAL_RUNTIME_PATHS = new Set([
  '/protected-local-cloud-authority.js',
]);

var APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './v250-offline-session.js',
  './v250-runtime.js',
  './cloud-sync-state.js',
  './auth/account-mode.js',
  './auth/data-source.js',
  './auth/boot.js',
  './auth/boot-ui.js',
  './icon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

var ANALYTICS_MODULES = [
  './analytics-passive-income-projection.js',
  './analytics-dividend-evolution.js',
  './analytics-asset-class-comparison.js',
  './analytics-wealth-goals.js',
  './analytics-financial-insights.js',
  './analytics-code-splitter.js',
  './analytics-memory-profiler.js',
  './analytics-bundle-analyzer.js',
  './analytics-performance-budgets.js'
];

var NEVER_CACHE_PATHS = [
  /\/api\//,
  /\/local-imports\//i,
  /\/firestore/i,
  /\/identitytoolkit/i,
  /\/securetoken/i,
  /\/oauth/i,
  /(?:carteira-investimentos-backup|\.backup)\.(?:json|zip)$/i
];

function isNeverCache(url) {
  return NEVER_CACHE_PATHS.some(function(pattern) {
    return pattern.test(url.pathname) || pattern.test(url.href);
  });
}

function isVersionSensitiveAsset(request, url) {
  return request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'manifest' ||
    /\.(?:js|css|json)$/i.test(url.pathname);
}

var STRATEGIES = {
  staleWhileRevalidate: function(request, cacheName) {
    return caches.open(cacheName).then(function(cache) {
      return cache.match(request).then(function(cachedResponse) {
        var fetchPromise = fetch(request).then(function(networkResponse) {
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(function() { return cachedResponse; });
        return cachedResponse || fetchPromise;
      });
    });
  },

  cacheFirst: function(request, cacheName) {
    return caches.open(cacheName).then(function(cache) {
      return cache.match(request).then(function(cachedResponse) {
        if (cachedResponse) return cachedResponse;

        return fetch(request).then(function(networkResponse) {
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(function(error) {
          return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        });
      });
    });
  },

  networkFirst: function(request, cacheName) {
    return caches.open(cacheName).then(function(cache) {
      return fetch(request).then(function(networkResponse) {
        if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(function(error) {
        return cache.match(request).then(function(cachedResponse) {
          return cachedResponse || new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        });
      });
    });
  },

  cacheOnly: function(request, cacheName) {
    return caches.open(cacheName).then(function(cache) {
      return cache.match(request).then(function(cachedResponse) {
        return cachedResponse || new Response(JSON.stringify({ error: 'Offline - Not cached' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      });
    });
  }
};

function getStrategy(request) {
  var url = new URL(request.url);

  if (request.method === 'GET' && (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2')
  )) {
    return { strategy: STRATEGIES.cacheFirst, cacheName: CACHE_STATIC };
  }

  if (url.pathname.startsWith('/api/') ||
      url.hostname.includes('api.') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('brapi')) {
    return { strategy: STRATEGIES.networkFirst, cacheName: CACHE_API };
  }

  if (request.method === 'GET' && (
    url.pathname === '/' ||
    url.pathname.endsWith('.html')
  )) {
    return { strategy: STRATEGIES.staleWhileRevalidate, cacheName: CACHE_DYNAMIC };
  }

  if (url.pathname.startsWith('/analytics-')) {
    return { strategy: STRATEGIES.cacheFirst, cacheName: CACHE_ANALYTICS };
  }

  return { strategy: STRATEGIES.staleWhileRevalidate, cacheName: CACHE_DYNAMIC };
}

self.addEventListener('install', function(event) {
  console.log('[SW v252] Installing...');

  event.waitUntil(
    caches.open(CACHE_STATIC).then(function(cache) {
      console.log('[SW v252] Caching app shell');
      var requests = APP_SHELL.map(function(url) {
        return new Request(url, { credentials: 'same-origin', cache: 'reload' });
      });
      // SM156 (R3): APP_SHELL é obrigatório e tudo-ou-nada. Falha propaga: a instalação não conclui,
      // skipWaiting não é chamado e o SW anterior (com seus caches) continua no controle.
      return cache.addAll(requests);
    }).then(function() {
      return caches.open(CACHE_ANALYTICS);
    }).then(function(cache) {
      console.log('[SW v252] Caching analytics modules');
      var requests = ANALYTICS_MODULES.map(function(url) {
        return new Request(url, { credentials: 'same-origin', cache: 'reload' });
      });
      return cache.addAll(requests).catch(function(err) {
        console.warn('[SW v252] Some analytics modules failed to cache:', err);
      });
    }).then(function() {
      console.log('[SW v252] All assets cached');
      return self.skipWaiting();
    })
  );

  self.clients.claim();
});

self.addEventListener('activate', function(event) {
  console.log('[SW v252] Activating...');

  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName.startsWith('carteira-investimentos-') &&
              cacheName !== CACHE_STATIC &&
              cacheName !== CACHE_DYNAMIC &&
              cacheName !== CACHE_API &&
              cacheName !== CACHE_ANALYTICS) {
            console.log('[SW v252] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('[SW v252] Activated');
      return self.clients.claim();
    })
  );
});

self.addEventListener('sync', function(event) {
  if (event.tag === 'pending-writes') {
    console.log('[SW v252] Background sync: pending-writes');
    event.waitUntil(processPendingWrites());
  }

  if (event.tag === 'analytics-sync') {
    console.log('[SW v252] Background sync: analytics');
    event.waitUntil(syncAnalytics());
  }

  if (event.tag === 'data-refresh') {
    console.log('[SW v252] Background sync: data-refresh');
    event.waitUntil(refreshQuotesAndDividends());
  }
});

self.addEventListener('periodicsync', function(event) {
  if (event.tag === 'cache-cleanup') {
    console.log('[SW v252] Periodic sync: cache-cleanup');
    event.waitUntil(cleanupOldEntries());
  }

  if (event.tag === 'data-refresh') {
    console.log('[SW v252] Periodic sync: data-refresh');
    event.waitUntil(refreshQuotesAndDividends());
  }

  if (event.tag === 'analytics-flush') {
    console.log('[SW v252] Periodic sync: analytics-flush');
    event.waitUntil(syncAnalytics());
  }
});

function refreshQuotesAndDividends() {
  return self.clients.matchAll({ includeUncontrolled: true }).then(function(clients) {
    if (clients.length === 0) return Promise.resolve();

    return openDB().then(function(db) {
      var tx = db.transaction('pending-writes', 'readwrite');
      var store = tx.objectStore('pending-writes');
      return getAll(store).then(function(writes) {
        if (writes.length > 0) {
          console.log('[SW v252] Processing', writes.length, 'pending writes');
          return processPendingWrites();
        }
      });
    }).then(function() {
      return self.registration.sync.register('data-refresh').catch(function() {});
    });
  }).catch(function(error) {
    console.warn('[SW v252] Data refresh failed:', error);
  });
}

function processPendingWrites() {
  return openDB().then(function(db) {
    var tx = db.transaction('pending-writes', 'readwrite');
    var store = tx.objectStore('pending-writes');
    return getAll(store).then(function(writes) {
      return Promise.all(writes.map(function(write) {
        return fetch(write.url, {
          method: write.method,
          headers: write.headers,
          body: write.body
        }).then(function(response) {
          if (response.ok) {
            return deleteFromStore(db, 'pending-writes', write.id);
          } else {
            return incrementRetries(db, write.id);
          }
        }).catch(function(error) {
          console.warn('[SW v252] Failed to sync write:', write.url, error);
          return incrementRetries(db, write.id);
        });
      }));
    });
  }).catch(function(error) {
    console.error('[SW v252] Background sync failed:', error);
  });
}

function syncAnalytics() {
  return openDB().then(function(db) {
    var tx = db.transaction('analytics-queue', 'readwrite');
    var store = tx.objectStore('analytics-queue');
    return getAll(store).then(function(events) {
      if (events.length > 0) {
        return fetch('/api/analytics/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events: events })
        }).then(function() {
          return clearStore(db, 'analytics-queue');
        });
      }
    });
  }).catch(function(error) {
    console.warn('[SW v252] Analytics sync failed:', error);
  });
}

function incrementRetries(db, id) {
  return new Promise(function(resolve, reject) {
    var tx = db.transaction('pending-writes', 'readwrite');
    var store = tx.objectStore('pending-writes');
    var request = store.get(id);
    request.onsuccess = function() {
      var write = request.result;
      if (write) {
        write.retries = (write.retries || 0) + 1;
        if (write.retries > 5) {
          store.delete(id).onsuccess = function() { resolve(); };
        } else {
          store.put(write).onsuccess = function() { resolve(); };
        }
      } else {
        resolve();
      }
    };
    request.onerror = function() { reject(request.error); };
  });
}

function openDB() {
  return new Promise(function(resolve, reject) {
    var request = indexedDB.open('carteira-sw-db', 2);

    request.onupgradeneeded = function(event) {
      var db = event.target.result;
      if (!db.objectStoreNames.contains('pending-writes')) {
        var writesStore = db.createObjectStore('pending-writes', { keyPath: 'id', autoIncrement: true });
        writesStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains('analytics-queue')) {
        db.createObjectStore('analytics-queue', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('offline-indicator')) {
        db.createObjectStore('offline-indicator', { keyPath: 'key' });
      }
    };

    request.onsuccess = function() { resolve(request.result); };
    request.onerror = function() { reject(request.error); };
  });
}

function getAll(store) {
  return new Promise(function(resolve, reject) {
    var request = store.getAll();
    request.onsuccess = function() { resolve(request.result); };
    request.onerror = function() { reject(request.error); };
  });
}

function deleteFromStore(db, storeName, id) {
  return new Promise(function(resolve, reject) {
    var tx = db.transaction(storeName, 'readwrite');
    var store = tx.objectStore(storeName);
    var request = store.delete(id);
    request.onsuccess = function() { resolve(); };
    request.onerror = function() { reject(request.error); };
  });
}

function clearStore(db, storeName) {
  return new Promise(function(resolve, reject) {
    var tx = db.transaction(storeName, 'readwrite');
    var store = tx.objectStore(storeName);
    var request = store.clear();
    request.onsuccess = function() { resolve(); };
    request.onerror = function() { reject(request.error); };
  });
}

function queueWrite(writeData) {
  return openDB().then(function(db) {
    var tx = db.transaction('pending-writes', 'readwrite');
    var store = tx.objectStore('pending-writes');
    return new Promise(function(resolve, reject) {
      var request = store.add({
        url: writeData.url,
        method: writeData.method,
        headers: writeData.headers,
        body: writeData.body,
        timestamp: Date.now(),
        retries: 0
      });
      request.onsuccess = function() { resolve(); };
      request.onerror = function() { reject(request.error); };
    });
  });
}

function queueAnalytics(eventData) {
  return openDB().then(function(db) {
    var tx = db.transaction('analytics-queue', 'readwrite');
    var store = tx.objectStore('analytics-queue');
    return new Promise(function(resolve, reject) {
      var request = store.add({
        type: eventData.type,
        data: eventData.data,
        timestamp: Date.now()
      });
      request.onsuccess = function() { resolve(); };
      request.onerror = function() { reject(request.error); };
    });
  });
}

function cleanupOldEntries() {
  return openDB().then(function(db) {
    var cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

    var tx = db.transaction('pending-writes', 'readwrite');
    var store = tx.objectStore('pending-writes');
    var index = store.index('timestamp');
    var range = IDBKeyRange.upperBound(cutoff);
    return index.openCursor(range).then(function(cursor) {
      var loop = function(cursor) {
        if (!cursor) return Promise.resolve();
        return cursor.delete().then(function() {
          return cursor.continue().then(loop);
        });
      };
      return loop(cursor);
    });
  }).catch(function(error) {
    console.warn('[SW v252] Cleanup failed:', error);
  });
}

self.addEventListener('message', function(event) {
  var data = event.data;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (data.type === 'GET_SW_VERSION' && event.ports && event.ports[0]) {
    event.ports[0].postMessage({
      swVersion: SW_VERSION,
      cacheName: CACHE_NAME,
      staticCache: CACHE_STATIC,
      dynamicCache: CACHE_DYNAMIC,
      apiCache: CACHE_API,
      analyticsCache: CACHE_ANALYTICS
    });
  }

  if (data.type === 'CLEAR_CACHES') {
    clearAllCaches().then(function() {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: true });
      }
    });
  }

  if (data.type === 'QUEUE_WRITE') {
    queueWrite(data.write).then(function() {
      self.registration.sync.register('pending-writes').catch(function() {});
    });
  }

  if (data.type === 'QUEUE_ANALYTICS') {
    queueAnalytics(data.event).then(function() {
      self.registration.sync.register('analytics-sync').catch(function() {});
    });
  }

  if (data.type === 'REGISTER_PERIODIC_SYNC') {
    if ('periodicSync' in self.registration) {
      self.registration.periodicSync.register('data-refresh', { minInterval: 24 * 60 * 60 * 1000 })
        .catch(function(err) { console.warn('[SW v252] Periodic sync registration failed:', err); });
      self.registration.periodicSync.register('analytics-flush', { minInterval: 60 * 60 * 1000 })
        .catch(function(err) { console.warn('[SW v252] Analytics periodic sync failed:', err); });
      self.registration.periodicSync.register('cache-cleanup', { minInterval: 7 * 24 * 60 * 60 * 1000 })
        .catch(function(err) { console.warn('[SW v252] Cache cleanup periodic sync failed:', err); });
    }
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ success: true });
    }
  }

  if (data.type === 'GET_PENDING_COUNT' && event.ports && event.ports[0]) {
    openDB().then(function(db) {
      var tx = db.transaction('pending-writes', 'readonly');
      var store = tx.objectStore('pending-writes');
      return getAll(store);
    }).then(function(writes) {
      event.ports[0].postMessage({ count: writes.length });
    }).catch(function() {
      event.ports[0].postMessage({ count: 0 });
    });
  }
});

function clearAllCaches() {
  return caches.keys().then(function(cacheNames) {
    return Promise.all(cacheNames.map(function(name) {
      return caches.delete(name);
    }));
  });
}

// SM109: rotas network-first (navegação, scripts, estilos, json, manifest) com prazo. Sem prazo, uma rede que não responde
// deixa a página em branco: os scripts síncronos do index.html ficam pendentes. Após NAV_NETWORK_TIMEOUT_MS cai para o cache.
// Disjuntor (SM132): depois de um prazo esgotado, por NETWORK_DEGRADED_MS os recursos com cópia EXATA em cache usam o
// cache direto. Os sem cópia não falham na hora: têm teto de UNCACHED_NETWORK_TIMEOUT_MS. Qualquer resposta da rede
// com status < 500 fecha o disjuntor. Versão e URL (incl. ?v=) determinam a cópia. Navegação não usa o atalho.
var NAV_NETWORK_TIMEOUT_MS = 4000;
// SM132 (revisão e medição): recurso SEM cópia recebe teto maior (20 s). Com 4 s, script novo de rede lenta (5 s e 8 s) falhava.
// Teto finito: rede travada não espera indefinidamente.
var UNCACHED_NETWORK_TIMEOUT_MS = 20000;
var NETWORK_DEGRADED_MS = 60000;
var networkDegradedUntil = 0;
function fetchNetworkNow(request, timeoutMs) {
  return new Promise(function(resolve, reject) {
    var timer = setTimeout(function() {
      networkDegradedUntil = Date.now() + NETWORK_DEGRADED_MS;
      reject(new Error('NAV_NETWORK_TIMEOUT'));
    }, timeoutMs);
    fetch(request, { cache: 'no-store' }).then(function(response) {
      clearTimeout(timer);
      if (response.status < 500) networkDegradedUntil = 0;
      resolve(response);
    }, function(error) {
      clearTimeout(timer); reject(error);
    });
  });
}
// SM132: HTML novo da rede + script antigo do cache = mistura. Ao receber da rede um HTML diferente do guardado, grava-se o
// marco da geração; o fallback de cache só serve cópia gravada a partir dele (Date da resposta, tolerância de 1 s). Sem marco,
// serve a cópia: o offline puro (HTML também do cache) segue igual. Com marco e sem Date, falha fechada (SM156, R4).
var HTML_GENERATION_KEY = './__html-generation';
function markHtmlGeneration(cache, fresh) {
  return cache.match('./index.html').then(function(old) {
    if (!old) return;
    return Promise.all([old.text(), fresh.text()]).then(function(t) {
      if (t[0] !== t[1]) return cache.put(HTML_GENERATION_KEY, new Response(String(Date.now())));
    });
  }).catch(function(err) {
    // SM168: sem marco válido a geração não pode ser garantida. Tenta gravar 'unknown' (fail-closed para scripts) e, em
    // qualquer caso, PROPAGA a falha: o HTML novo não é gravado no cache e a navegação cai no fallback consistente.
    // Antes, a segunda falha era engolida e o HTML novo era gravado sem marco válido (mistura HTML novo + JS antigo).
    return cache.put(HTML_GENERATION_KEY, new Response('unknown')).then(function() { throw err; }, function() { throw err; });
  });
}
function matchConsistent(cache, request) {
  return Promise.all([cache.match(request), caches.match(HTML_GENERATION_KEY)]).then(function(r) {
    var cached = r[0];
    if (!cached) return Response.error();
    if (!r[1]) return cached;
    return r[1].text().then(function(at) {
      var d = Date.parse(cached.headers.get('date') || '');
      // SM156 (R4): com marco e sem Date confiável não há como provar a geração: falha fechada, sem mistura HTML/JS.
      return (!isNaN(d) && d + 1000 >= Number(at)) ? cached : Response.error();
    });
  });
}
// Recursos versionados (scripts, estilos, json, manifest). Com cópia exata: prazo de NAV_NETWORK_TIMEOUT_MS e cai no cache
// (o chamador faz o fallback). Sem cópia: teto UNCACHED_NETWORK_TIMEOUT_MS. Disjuntor aberto: com cópia exata, tentar a rede
// primeiro (teto de UNCACHED_NETWORK_TIMEOUT_MS) antes de servir a cópia em cache, para não misturar HTML novo com JS antigo
// quando a rede demora mais que o prazo curto. Se a rede responder (status < 500), usar a rede e fechar o disjuntor; se não,
// servir a cópia em cache (fallback offline verdadeiro).
function fetchNetworkWithTimeout(request) {
  return caches.match(request).then(function(cached) {
    if (cached && Date.now() < networkDegradedUntil) {
      return fetchNetworkNow(request, UNCACHED_NETWORK_TIMEOUT_MS).then(function(fresh) {
        if (fresh.status < 500) networkDegradedUntil = 0;
        return fresh;
      });
    }
    return fetchNetworkNow(request, cached ? NAV_NETWORK_TIMEOUT_MS : UNCACHED_NETWORK_TIMEOUT_MS);
  });
}

self.addEventListener('fetch', function(event) {
  var request = event.request;

  if (request.method !== 'GET') return;

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/sw.js') || isNeverCache(url)) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((function() {
      // Navegação não usa o atalho do disjuntor: sempre tenta a rede, com o prazo de 4 s, e cai no cache depois.
      return fetchNetworkNow(request, NAV_NETWORK_TIMEOUT_MS).then(function(fresh) {
        if (fresh.ok) {
          return caches.open(CACHE_DYNAMIC).then(function(cache) {
            return markHtmlGeneration(cache, fresh.clone()).then(function() {
              return cache.put(request, fresh.clone());
            }).then(function() {
              return cache.put('./index.html', fresh.clone());
            }).then(function() {
              return fresh;
            });
          });
        }
        return fresh;
      }).catch(function(_) {
        return caches.match(request, { ignoreSearch: true })
          .then(function(cached) { return cached || caches.match('./index.html'); })
          .then(function(cached) { return cached || caches.match('./'); })
          .then(function(cached) { return cached || getOfflineFallback(); });
      });
    })());
    return;
  }

  if (CRITICAL_RUNTIME_PATHS.has(url.pathname)) {
    event.respondWith((function() {
      return caches.open(CACHE_STATIC).then(function(cache) {
        return fetchNetworkWithTimeout(request).then(function(fresh) {
          if (fresh.ok && fresh.type === 'basic') {
            return cache.put(request, fresh.clone()).then(function() { return fresh; });
          }
          return fresh;
        }).catch(function(_) {
          return matchConsistent(cache, request);
        });
      });
    })());
    return;
  }

  if (isVersionSensitiveAsset(request, url)) {
    event.respondWith((function() {
      return caches.open(CACHE_STATIC).then(function(cache) {
        return fetchNetworkWithTimeout(request).then(function(fresh) {
          if (fresh.ok && fresh.type === 'basic') {
            return cache.put(request, fresh.clone()).then(function() { return fresh; });
          }
          return fresh;
        }).catch(function(_) {
          return matchConsistent(cache, request);
        });
      });
    })());
    return;
  }

  if (isNeverCache(url)) {
    event.respondWith(fetch(request));
    return;
  }

  var strategyInfo = getStrategy(request);
  var strategy = strategyInfo.strategy;
  var cacheName = strategyInfo.cacheName;

  event.respondWith(
    strategy(request, cacheName).catch(function(error) {
      console.warn('[SW v252] Fetch failed:', error);
      return new Response(JSON.stringify({ error: 'Network error', offline: true }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    })
  );
});

function getOfflineFallback() {
  var html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Offline - Carteira de Investimentos</title><style>body{font-family:system-ui,sans-serif;background:#07090f;color:#e8ebf0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center}.icon{font-size:64px;margin-bottom:16px}h1{font-size:24px;margin-bottom:8px}p{font-size:16px;color:#9ab4d6;margin-bottom:24px}.btn{background:#1e3a5f;color:#e8ebf0;border:none;padding:12px 24px;border-radius:8px;font-size:16px;cursor:pointer}.btn:hover{background:#2d4a7a}</style></head><body><div class="icon">📱</div><h1>Você está offline</h1><p>Algumas funcionalidades podem estar limitadas.<br>Seus dados serão sincronizados quando a conexão voltar.</p><button class="btn" onclick="window.location.reload()">Tentar novamente</button></body></html>';
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

console.log('[SW v252] Service Worker loaded');