'use strict';
// SM173.11 — sessão offline em cache não libera a carteira. Sem usuário Firebase, o gate de acesso permanece ativo.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const body = (() => {
  const s = html.indexOf('function shouldShowAccessGate(){');
  assert.ok(s >= 0, 'shouldShowAccessGate existe');
  return html.slice(s, html.indexOf('\n}\n', s) + 3);
})();

test('sem usuário Firebase o gate é exibido (sessão offline não prova identidade)', () => {
  assert.match(body, /if\(!FB\.user && !isProtectedReadOnlyQaBoot\(\)\) return true;/);
});

test('o gate de teste local continua funcionando (sem regressão)', () => {
  assert.match(body, /if\(isLocalTestMode\(\)\) return false;/);
});

test('a checagem de usuário vem antes da liberação por acesso', () => {
  assert.ok(body.indexOf('!FB.user') < body.indexOf('FB.access.allowed'), 'usuário é verificado antes de allowed');
});
