'use strict';
// SM172 (handshake de versões): v250-runtime.js precisa obter do Service Worker o nome do cache e comparar com o esperado.
// Fonte única do identificador esperado: CACHE_NAME definido em sw.js (CACHE_PREFIX + SW_VERSION). Sem rede, sem produção.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const repo = path.join(__dirname, '..');
const sw = fs.readFileSync(path.join(repo, 'sw.js'), 'utf8');
const runtimeSource = fs.readFileSync(path.join(repo, 'v250-runtime.js'), 'utf8');
const index = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');

const SW_VERSION = /var SW_VERSION = '([^']+)'/.exec(sw)[1];
const CACHE_PREFIX = /var CACHE_PREFIX = '([^']+)'/.exec(sw)[1];
const EXPECTED_CACHE = CACHE_PREFIX + SW_VERSION;
const SW_HANDLED_TYPES = new Set([...sw.matchAll(/data\.type === '([A-Z0-9_]+)'/g)].map(m => m[1]));
const RUNTIME_POSTED_TYPES = [...runtimeSource.matchAll(/postMessage\(\{ type: '([A-Z0-9_]+)'/g)].map(m => m[1]);

// Runtime real, executado num ambiente falso mínimo. `workerReply(type)` decide a resposta do worker (undefined = sem resposta).
function loadRuntime(workerReply, { withWorker = true } = {}) {
  class FakeChannel {
    constructor() {
      this.port1 = { onmessage: null };
      this.port2 = { postMessage: data => { if (this.port1.onmessage) this.port1.onmessage({ data }); } };
    }
  }
  const worker = {
    postMessage(message, ports) {
      const reply = workerReply(message.type);
      if (reply !== undefined && ports && ports[0]) ports[0].postMessage(reply);
    },
  };
  const el = () => ({ style: {}, dataset: {}, setAttribute() {}, appendChild() {}, addEventListener() {}, textContent: '' });
  const context = {
    navigator: { onLine: true, serviceWorker: withWorker ? { getRegistration: async () => ({ active: worker }), controller: null } : undefined },
    MessageChannel: FakeChannel,
    setTimeout, clearTimeout, Promise, Object, Array, Map, JSON, String, Number, Date,
    performance: { mark() {}, getEntriesByType: () => [], getEntriesByName: () => [] },
    requestAnimationFrame: fn => fn(),
    console: { log() {}, warn() {}, error() {}, info() {} },
  };
  context.window = context;
  context.addEventListener = () => {};
  context.document = {
    readyState: 'complete', documentElement: { dataset: {} }, body: el(), head: el(),
    getElementById: () => null, querySelector: () => null, createElement: el,
    addEventListener() {}, removeEventListener() {},
  };
  vm.createContext(context);
  vm.runInContext(runtimeSource, context);
  return context.V250Runtime;
}

// Respostas que o sw.js real produz para as mensagens que ele trata (GET_SW_VERSION -> cacheName = CACHE_NAME).
const realSwReply = type => (type === 'GET_SW_VERSION' && SW_HANDLED_TYPES.has('GET_SW_VERSION') ? { swVersion: SW_VERSION, cacheName: EXPECTED_CACHE } : undefined);

test('SM172 protocolo: toda mensagem enviada pelo runtime é tratada pelo sw.js', () => {
  assert.ok(RUNTIME_POSTED_TYPES.length > 0, 'runtime deve enviar ao menos uma mensagem de versão');
  for (const type of RUNTIME_POSTED_TYPES) {
    assert.ok(SW_HANDLED_TYPES.has(type), 'runtime envia ' + type + ' mas sw.js não trata essa mensagem');
  }
});

test('SM172 identificador: runtime e index.html esperam exatamente o CACHE_NAME do sw.js', () => {
  assert.equal(EXPECTED_CACHE, 'carteira-investimentos-' + SW_VERSION);
  assert.match(runtimeSource, new RegExp("const SW_CACHE = '" + EXPECTED_CACHE.replace(/\./g, '\\.') + "';"));
  assert.ok(index.includes("window.__EXPECTED_SERVICE_WORKER_CACHE__='" + EXPECTED_CACHE + "'"), 'index.html deve esperar ' + EXPECTED_CACHE);
});

test('SM172 PASS: worker responde com o cache esperado', async () => {
  const runtime = loadRuntime(realSwReply);
  const result = await runtime.checkVersionCoherence();
  assert.equal(result.status, 'PASS', JSON.stringify(result));
  assert.equal(result.serviceWorker.cacheName, EXPECTED_CACHE);
});

test('SM172 MISMATCH: worker responde com outra versão de cache', async () => {
  const runtime = loadRuntime(type => (type === 'GET_SW_VERSION' ? { swVersion: 'v251.0', cacheName: 'carteira-investimentos-v251.0' } : undefined));
  const result = await runtime.checkVersionCoherence();
  assert.equal(result.status, 'MISMATCH', JSON.stringify(result));
  assert.equal(result.serviceWorker.cacheName, 'carteira-investimentos-v251.0');
});

test('SM172 UNAVAILABLE: worker não responde (sem handshake)', async () => {
  const runtime = loadRuntime(() => undefined);
  const result = await runtime.checkVersionCoherence();
  assert.equal(result.status, 'UNAVAILABLE', JSON.stringify(result));
});

test('SM172 UNAVAILABLE: sem service worker registrado', async () => {
  const runtime = loadRuntime(realSwReply, { withWorker: false });
  const result = await runtime.checkVersionCoherence();
  assert.equal(result.status, 'UNAVAILABLE', JSON.stringify(result));
});
