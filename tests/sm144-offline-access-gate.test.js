'use strict';
// SM144 — tela de acesso sem internet: estado claro, sem "Verificando" indefinido. Extrai accessGateBox do index.html real.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function gate(state, online) {
  const start = html.indexOf('function accessGateBox(){');
  assert.ok(start >= 0, 'accessGateBox ausente');
  const end = html.indexOf('\n}', start) + 2;
  const ctx = { FB: state, esc: x => String(x), AuthBootUi: null, navigator: { onLine: online } };
  vm.createContext(ctx);
  vm.runInContext(html.slice(start, end), ctx);
  return ctx.accessGateBox();
}
const base = { accountMode: '', authResolved: true, user: null, access: { loading: true, reason: '' } };

test('offline com verificação pendente mostra Sem conexão e não fica em Verificando', () => {
  const out = gate(base, false);
  assert.match(out, /Sem conexão/);
  assert.match(out, /Conecte-se para verificar sua conta/);
  assert.equal(/Verificando sua conta/.test(out), false);
});

test('online com verificação pendente mantém o estado de verificação', () => {
  const out = gate(base, true);
  assert.match(out, /Verificando sua conta/);
  assert.match(out, /role="status"/);
});

test('sem pendência, o estado restrito permanece igual', () => {
  const out = gate({ ...base, access: { loading: false, reason: '' } }, false);
  assert.match(out, /Acesso restrito/);
  assert.match(out, /Entre com Google para continuar/);
});
