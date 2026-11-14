'use strict';
// SM156 — R3 (pré-cache obrigatório) e R4 (geração HTML/JS sem Date). Executa o sw.js real num ambiente falso
// (caches, fetch, eventos). Não usa rede nem produção.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const ORIGIN = 'https://app.test';
const SW_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const APP_SHELL = (() => {
  const block = SW_SOURCE.slice(SW_SOURCE.indexOf('var APP_SHELL = ['), SW_SOURCE.indexOf('];', SW_SOURCE.indexOf('var APP_SHELL = [')));
  return [...block.matchAll(/'(\.\/[^']*)'/g)].map(m => m[1]);
})();

function absolute(u) { return new URL(String(u), ORIGIN + '/').href; }

class FakeHeaders {
  constructor(init = {}) { this.map = {}; for (const k of Object.keys(init)) this.map[k.toLowerCase()] = String(init[k]); }
  get(name) { const v = this.map[String(name).toLowerCase()]; return v === undefined ? null : v; }
}
class FakeResponse {
  constructor(body = '', init = {}) {
    this._body = String(body); this.status = init.status === undefined ? 200 : init.status;
    this.ok = this.status >= 200 && this.status < 300; this.type = init.type || 'basic';
    this.headers = new FakeHeaders(init.headers || {});
  }
  text() { return Promise.resolve(this._body); }
  clone() { return new FakeResponse(this._body, { status: this.status, headers: this.headers.map, type: this.type }); }
  static error() { return new FakeResponse('', { status: 0, type: 'error' }); }
}
class FakeRequest {
  constructor(url, init = {}) { this.url = absolute(url); this.method = init.method || 'GET'; this.mode = init.mode || 'cors'; this.destination = init.destination || ''; }
  clone() { return this; }
}

function makeEnv(options) {
  const storage = new Map();   // nome -> Map(url -> FakeResponse)
  const log = { skipWaiting: 0 };
  const listeners = {};
  const network = options.network || (() => Promise.reject(new TypeError('offline')));
  const cacheOf = name => {
    if (!storage.has(name)) storage.set(name, new Map());
    const store = storage.get(name);
    return {
      add(req) {
        const url = absolute(req && req.url !== undefined ? req.url : req);
        return Promise.resolve(options.serve ? options.serve(url) : network(url)).then(res => {
          if (!res || !res.ok) throw new TypeError('cache.add falhou: ' + url);
          store.set(url, res.clone());
        });
      },
      // Semântica atômica do Cache.addAll: ou todos os itens entram, ou nenhum.
      addAll(reqs) {
        const urls = reqs.map(r => absolute(r && r.url !== undefined ? r.url : r));
        return Promise.all(urls.map(url => Promise.resolve(options.serve ? options.serve(url) : network(url)))).then(responses => {
          responses.forEach((res, i) => { if (!res || !res.ok) throw new TypeError('cache.addAll falhou: ' + urls[i]); });
          responses.forEach((res, i) => store.set(urls[i], res.clone()));
        });
      },
      put(req, res) { store.set(absolute(req && req.url !== undefined ? req.url : req), res); return Promise.resolve(); },
      match(req) { const r = store.get(absolute(req && req.url !== undefined ? req.url : req)); return Promise.resolve(r ? r.clone() : undefined); },
      keys() { return Promise.resolve([...store.keys()].map(u => new FakeRequest(u))); },
      _store: store,
    };
  };
  const caches = {
    open: name => Promise.resolve(cacheOf(name)),
    keys: () => Promise.resolve([...storage.keys()]),
    match(req) {
      for (const store of storage.values()) { const r = store.get(absolute(req && req.url !== undefined ? req.url : req)); if (r) return Promise.resolve(r.clone()); }
      return Promise.resolve(undefined);
    },
    delete(name) { return Promise.resolve(storage.delete(name)); },
  };
  const self = {
    location: { origin: ORIGIN, href: ORIGIN + '/sw.js' },
    addEventListener(type, fn) { listeners[type] = fn; },
    skipWaiting() { log.skipWaiting++; return Promise.resolve(); },
    clients: { claim: () => Promise.resolve() },
  };
  const context = vm.createContext({
    self, caches, Request: FakeRequest, Response: FakeResponse, Headers: FakeHeaders, URL,
    fetch: req => network(req.url !== undefined ? req.url : req),
    console: { log() {}, warn() {}, error() {}, info() {} },
    setTimeout, clearTimeout, Date, Promise, Number, String, Set, Map, Array, Object, JSON, isNaN, Math,
  });
  vm.runInContext(SW_SOURCE, context);
  return { storage, log, listeners, caches, cacheOf, self };
}

function runEvent(env, type, request) {
  let pending = null;
  const event = { request, waitUntil(p) { pending = p; }, respondWith(p) { pending = p; } };
  env.listeners[type](event);
  return pending;
}

const INSTALL_OK = () => Promise.resolve(new FakeResponse('ok', { status: 200 }));

// ---------- R3: pré-cache ----------

test('R3 instalação completa: todo APP_SHELL em cache e skipWaiting chamado', async () => {
  const env = makeEnv({ serve: INSTALL_OK });
  await runEvent(env, 'install', null);
  const cached = [...env.cacheOf(getStaticName(env))._store.keys()];
  for (const rel of APP_SHELL) assert.ok(cached.includes(absolute(rel)), 'faltou no cache: ' + rel);
  assert.equal(env.log.skipWaiting, 1, 'instalação completa deve ativar');
});

test('R3 cloud-sync-state.js é pré-cacheado e obrigatório', async () => {
  const requested = [];
  const env = makeEnv({ serve: url => { requested.push(url); return INSTALL_OK(url); } });
  await runEvent(env, 'install', null);
  assert.ok(requested.some(u => u.endsWith('/cloud-sync-state.js')), 'cloud-sync-state.js precisa ser pedido na instalação');
});

test('R3 falha em um recurso obrigatório: install rejeita e skipWaiting não é chamado', async () => {
  const env = makeEnv({ serve: url => (url.endsWith('/auth/boot.js') ? Promise.resolve(new FakeResponse('', { status: 404 })) : INSTALL_OK(url)) });
  const pending = runEvent(env, 'install', null);
  await assert.rejects(pending, 'instalação com APP_SHELL incompleto deve falhar');
  assert.equal(env.log.skipWaiting, 0, 'skipWaiting não pode ocorrer após falha obrigatória');
});

test('R3 falha de instalação preserva caches de versão anterior utilizáveis', async () => {
  const env = makeEnv({ serve: url => (url.endsWith('/index.html') ? Promise.resolve(new FakeResponse('', { status: 500 })) : INSTALL_OK(url)) });
  const previous = env.cacheOf('carteira-investimentos-static-v251');
  await previous.put(new FakeRequest('./index.html'), new FakeResponse('versao anterior'));
  await assert.rejects(runEvent(env, 'install', null));
  const kept = await env.caches.match(new FakeRequest('./index.html'));
  assert.ok(kept, 'cache anterior deve permanecer');
  assert.equal(await kept.text(), 'versao anterior');
  assert.ok((await env.caches.keys()).includes('carteira-investimentos-static-v251'), 'nome anterior não pode ser apagado na instalação');
});

test('R3 recuperação posterior: nova tentativa com recursos íntegros ativa normalmente', async () => {
  let fail = true;
  const env = makeEnv({ serve: url => (fail && url.endsWith('/icon.svg') ? Promise.resolve(new FakeResponse('', { status: 404 })) : INSTALL_OK(url)) });
  await assert.rejects(runEvent(env, 'install', null));
  assert.equal(env.log.skipWaiting, 0);
  fail = false;
  await runEvent(env, 'install', null);
  assert.equal(env.log.skipWaiting, 1, 'segunda tentativa íntegra deve ativar');
});

test('R3 analytics continua opcional: falha nele não impede a ativação', async () => {
  const env = makeEnv({ serve: url => (url.includes('/analytics-') ? Promise.resolve(new FakeResponse('', { status: 404 })) : INSTALL_OK(url)) });
  await runEvent(env, 'install', null);
  assert.equal(env.log.skipWaiting, 1);
});

// ---------- R4: geração HTML/JS ----------

const MARK_KEY = './__html-generation';

// Cenário: JS em cache com `date` (ou sem) e marco de geração gravado em `markAt`. Rede do JS falha.
async function fetchScriptFallback({ cachedDate, markAt, body = 'js-A' }) {
  const env = makeEnv({ network: () => Promise.reject(new TypeError('rede indisponível')) });
  const headers = cachedDate === undefined ? {} : { date: cachedDate };
  await env.cacheOf(getStaticName(env)).put(new FakeRequest('./app.js'), new FakeResponse(body, { status: 200, headers }));
  if (markAt !== undefined) await env.cacheOf(getDynamicName(env)).put(new FakeRequest(MARK_KEY), new FakeResponse(String(markAt)));
  const response = await runEvent(env, 'fetch', new FakeRequest('./app.js', { destination: 'script' }));
  return response;
}

const T0 = Date.parse('2026-11-14T10:00:00Z');
const httpDate = ms => new Date(ms).toUTCString();

test('R4 HTML A + JS A: sem marco, JS em cache é servido (offline mesma geração)', async () => {
  const r = await fetchScriptFallback({ cachedDate: httpDate(T0) });
  assert.equal(r.status, 200);
  assert.equal(await r.text(), 'js-A');
});

test('R4 atualização: marco mais novo que JS antigo com Date válido é recusado', async () => {
  const r = await fetchScriptFallback({ cachedDate: httpDate(T0), markAt: T0 + 60000 });
  assert.equal(r.ok, false, 'JS antigo não pode ser servido após troca de geração');
});

test('R4 HTML B + JS B com Date válido: JS mais novo que o marco é servido', async () => {
  const r = await fetchScriptFallback({ cachedDate: httpDate(T0 + 61000), markAt: T0 + 60000, body: 'js-B' });
  assert.equal(r.status, 200);
  assert.equal(await r.text(), 'js-B');
});

test('R4 HTML B com JS A e Date válido: incompatível é recusado', async () => {
  const r = await fetchScriptFallback({ cachedDate: httpDate(T0), markAt: T0 + 60000, body: 'js-A' });
  assert.equal(r.ok, false);
});

test('R4 HTML B com JS A SEM Date e marco presente: falha fechada (não mistura)', async () => {
  const r = await fetchScriptFallback({ cachedDate: undefined, markAt: T0 + 60000, body: 'js-A' });
  assert.equal(r.ok, false, 'sem Date confiável e com marco, a cópia não pode ser servida');
});

test('R4 sem Date e sem marco: offline da mesma geração continua funcionando', async () => {
  const r = await fetchScriptFallback({ cachedDate: undefined, markAt: undefined, body: 'js-A' });
  assert.equal(r.status, 200);
  assert.equal(await r.text(), 'js-A');
});

test('R4 rede lenta e intermitente: sem cópia, a falha continua sendo erro (não fabrica resposta)', async () => {
  const env = makeEnv({ network: () => Promise.reject(new TypeError('timeout')) });
  const r = await runEvent(env, 'fetch', new FakeRequest('./app.js', { destination: 'script' }));
  assert.equal(r.ok, false);
});

// Os nomes de cache dependem da versão atual; obtidos do próprio sw.js.
function getStaticName(env) { return env && env.staticName || staticNameFromSource(); }
function getDynamicName() { return dynamicNameFromSource(); }
function staticNameFromSource() {
  const prefix = /var CACHE_PREFIX = '([^']+)'/.exec(SW_SOURCE)[1];
  const ver = /var SW_VERSION = '([^']+)'/.exec(SW_SOURCE)[1];
  return prefix + 'static-' + ver;
}
function dynamicNameFromSource() {
  const prefix = /var CACHE_PREFIX = '([^']+)'/.exec(SW_SOURCE)[1];
  const ver = /var SW_VERSION = '([^']+)'/.exec(SW_SOURCE)[1];
  return prefix + 'dynamic-' + ver;
}

// SM167: falha ao gravar o marco de geração deixa a geração desconhecida ('unknown'). O fallback deve falhar fechado,
// mesmo com Date válido; sem marco e com Date válido, a cópia continua sendo servida (comportamento preservado).
test('SM167 marco de geração inválido (falha ao gravar): fallback recusado mesmo com Date válido', async () => {
  const r = await fetchScriptFallback({ cachedDate: httpDate(T0 + 120000), markAt: 'unknown', body: 'js-A' });
  assert.equal(r.ok, false, 'geração desconhecida nunca serve cache sem verificação');
});

test('SM167 sem marco e com Date válido: cópia continua servida (regressão preservada)', async () => {
  const r = await fetchScriptFallback({ cachedDate: httpDate(T0), markAt: undefined, body: 'js-A' });
  assert.equal(r.status, 200);
  assert.equal(await r.text(), 'js-A');
});
