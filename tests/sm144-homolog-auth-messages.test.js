'use strict';
// SM144 — mensagens de erro de login por e-mail da homologação: português, sem código técnico. Usa o index.html real.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { applyHomologSubstitutions } = require('../scripts/homolog/build-homolog');

const HOMOLOG = 'carteira-homolog-sm118';
const SDK = {
  apiKey: 'AIzaTESTFAKEKEYFORGUARD000000000000', authDomain: `${HOMOLOG}.firebaseapp.com`, projectId: HOMOLOG,
  storageBucket: `${HOMOLOG}.firebasestorage.app`, messagingSenderId: '735653105367', appId: '1:735653105367:web:testfake',
};
const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const out = applyHomologSubstitutions(src, { sdk: SDK, uid: 'SyntheticUid0000000000001', email: 'homolog-owner@example.com', shortSha: 'abc123' });

function loadMapper() {
  const start = out.indexOf('function homologAuthErrorMessage(e){');
  assert.ok(start >= 0, 'função de mensagens ausente na distribuição de homologação');
  const end = out.indexOf('\n}', start) + 2;
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(out.slice(start, end), ctx);
  return ctx.homologAuthErrorMessage;
}

test('erros de credencial mostram mensagem em português sem código técnico', () => {
  const map = loadMapper();
  assert.equal(map({ code: 'auth/invalid-credential' }), 'E-mail ou senha incorretos.');
  assert.equal(map({ code: 'auth/wrong-password' }), 'E-mail ou senha incorretos.');
  assert.equal(map({ code: 'auth/user-not-found' }), 'E-mail ou senha incorretos.');
});

test('demais falhas têm mensagem própria e nunca expõem auth/ ou detalhe interno', () => {
  const map = loadMapper();
  assert.match(map({ code: 'auth/too-many-requests' }), /Muitas tentativas/);
  assert.match(map({ code: 'auth/network-request-failed' }), /Sem conexão/);
  assert.match(map({ code: 'auth/user-disabled' }), /desabilitada/);
  const generic = map({ code: 'auth/internal-error', message: 'segredo interno' });
  assert.equal(generic, 'Não foi possível entrar agora. Tente novamente em instantes.');
  for (const e of [{ code: 'auth/x' }, {}, undefined]) assert.equal(/auth\/|segredo|undefined/.test(map(e)), false);
});

test('o alerta antigo com código técnico saiu da distribuição de homologação', () => {
  assert.equal(out.includes("'Não foi possível entrar: '"), false);
  assert.match(out, /alert\(homologAuthErrorMessage\(e\)\);/);
});
