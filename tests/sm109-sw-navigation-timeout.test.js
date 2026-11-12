'use strict';
// SM109: rotas network-first do service worker (navegação, scripts/estilos/json/manifest) não podem ficar
// pendentes sem prazo. Antes: fetch(request, {cache:'no-store'}) sem limite; com rede travada a página
// ficava em branco porque o script síncrono de index.html nunca terminava de carregar.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

test('existe prazo limitado (NAV_NETWORK_TIMEOUT_MS) e helper de rede com fallback', () => {
  assert.match(sw, /var NAV_NETWORK_TIMEOUT_MS = \d+;/);
  assert.match(sw, /function fetchNetworkWithTimeout\(request\)/);
  assert.match(sw, /reject\(new Error\('NAV_NETWORK_TIMEOUT'\)\)/);
});

test('nenhuma rota network-first usa fetch sem prazo', () => {
  assert.equal(/return fetch\(request, \{ cache: 'no-store' \}\)\.then/.test(sw), false);
  const uses = sw.match(/fetchNetworkWithTimeout\(request\)/g) || [];
  assert.ok(uses.length >= 4, `esperado >=4 usos do helper, encontrado ${uses.length}`);
});

test('navegação mantém fallback para cache antes do offline', () => {
  const start = sw.indexOf("if (request.mode === 'navigate')");
  const block = sw.slice(start, start + 1400);
  assert.match(block, /caches\.match\(request, \{ ignoreSearch: true \}\)/);
  assert.match(block, /caches\.match\('\.\/index\.html'\)/);
});

test('SW_VERSION e nomes de cache inalterados', () => {
  assert.match(sw, /var SW_VERSION = 'v252\.0';/);
});
