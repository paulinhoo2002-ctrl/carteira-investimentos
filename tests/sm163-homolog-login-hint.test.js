'use strict';
// SM163 — dica de e-mail no login SOMENTE na homologação. Não preenche senha, não é somente leitura e não pode
// ser o e-mail de produção. A dica chega por argumento de build; nenhum valor pessoal é versionado aqui.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { applyHomologSubstitutions } = require('../scripts/homolog/build-homolog');
const { validateLoginHint, readOwnerIdentifiers } = require('../scripts/homolog/guard');

const repo = path.join(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
const HOMOLOG = 'carteira-homolog-sm118';
const SDK = {
  apiKey: 'AIzaTESTFAKEKEYFORGUARD000000000000', authDomain: `${HOMOLOG}.firebaseapp.com`, projectId: HOMOLOG,
  storageBucket: `${HOMOLOG}.firebasestorage.app`, messagingSenderId: '735653105367', appId: '1:735653105367:web:testfake',
};
const UID = 'SyntheticUid0000000000001';
const EMAIL = 'homolog-owner@example.com';
const HINT = 'tester+homolog@example.com';

function build(loginHint) {
  return applyHomologSubstitutions(SOURCE, { sdk: SDK, uid: UID, email: EMAIL, shortSha: '0123456789ab', loginHint });
}
function tag(html, id) {
  const m = new RegExp(`<input id="${id}"[^>]*>`).exec(html);
  return m ? m[0] : null;
}

test('com dica: campo de e-mail vem preenchido e continua editável', () => {
  const html = build(HINT);
  const email = tag(html, 'homolog-email');
  assert.ok(email, 'campo homolog-email presente');
  assert.ok(email.includes(` value="${HINT}"`), 'valor da dica no campo de e-mail');
  assert.equal(/\b(readonly|disabled)\b/.test(email), false, 'campo não pode ser somente leitura');
});

test('com dica: campo de senha continua vazio (sem atributo value)', () => {
  const pass = tag(build(HINT), 'homolog-pass');
  assert.ok(pass, 'campo homolog-pass presente');
  assert.equal(/\svalue=/.test(pass), false, 'senha nunca é preenchida');
});

test('sem dica: campo de e-mail não recebe value', () => {
  const email = tag(build(null), 'homolog-email');
  assert.equal(/\svalue=/.test(email), false);
});

test('constantes do proprietário continuam substituídas como antes', () => {
  const html = build(HINT);
  assert.ok(html.includes(`const OWNER_FIREBASE_UID = '${UID}';`));
  assert.ok(html.includes(`const OWNER_FIREBASE_EMAIL = '${EMAIL}';`));
});

test('dica inválida é recusada (aspas, espaços, marcação, ausência de @)', () => {
  for (const bad of ['a"b@example.com', 'a b@example.com', '<a>@example.com', 'semarroba.example.com', '', 'x@y']) {
    assert.throws(() => validateLoginHint(bad), /dica de e-mail de login inválida/, 'deveria recusar: ' + JSON.stringify(bad));
  }
});

test('dica igual ao e-mail de produção é recusada (sem expor o valor no teste)', () => {
  const owner = readOwnerIdentifiers().email;
  assert.throws(() => validateLoginHint(owner), /não pode ser o e-mail de produção/);
  assert.throws(() => validateLoginHint(owner.toUpperCase()), /não pode ser o e-mail de produção/);
});

test('dica válida diferente da produção é aceita e devolvida sem alteração', () => {
  assert.equal(validateLoginHint(HINT), HINT);
});

test('o código-fonte versionado não contém a tela de dica nem o valor de dica', () => {
  assert.equal(SOURCE.includes('homolog-email'), false, 'index.html de origem não pode ter o formulário de homologação');
  assert.equal(SOURCE.includes(HINT), false);
});
