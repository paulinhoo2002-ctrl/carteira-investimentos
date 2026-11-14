'use strict';
// SM165 — regressão do gate de proprietário da homologação. Extrai do próprio artefato gerado as constantes e a função
// isAccessAdmin (sem copiar a lógica), e verifica: proprietário autorizado passa; desconhecido, UID diferente, e-mail
// não verificado, outra conta (ex.: variante "+") e usuário nulo são negados. Nenhuma credencial real.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { applyHomologSubstitutions } = require('../scripts/homolog/build-homolog');
const { validateIdentity, readOwnerIdentifiers } = require('../scripts/homolog/guard');

const repo = path.join(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
const SDK = {
  apiKey: 'AIzaTESTFAKEKEYFORGUARD000000000000', authDomain: 'carteira-homolog-sm118.firebaseapp.com', projectId: 'carteira-homolog-sm118',
  storageBucket: 'carteira-homolog-sm118.firebasestorage.app', messagingSenderId: '735653105367', appId: '1:735653105367:web:testfake',
};
const UID = 'SyntheticOwnerUid000000001';
const OWNER_EMAIL = 'owner.sintetico@example.com';

function gateFrom(html) {
  const uid = /const OWNER_FIREBASE_UID = '([^']*)';/.exec(html)[1];
  const email = /const OWNER_FIREBASE_EMAIL = '([^']*)';/.exec(html)[1];
  const normStart = html.indexOf('function normalizeEmail(v){');
  const adminStart = html.indexOf('function isAccessAdmin(user){');
  assert.ok(normStart >= 0 && adminStart >= 0, 'funções do gate presentes no artefato');
  const body = html.slice(normStart, html.indexOf('\n}', normStart) + 2) + '\n' + html.slice(adminStart, html.indexOf('\n}', adminStart) + 2);
  const ctx = { OWNER_FIREBASE_UID: uid, OWNER_FIREBASE_EMAIL: email };
  vm.createContext(ctx);
  vm.runInContext(body, ctx);
  return { ctx, uid, email };
}

test('identidade é normalizada: e-mail com maiúsculas vira minúsculas no build', () => {
  assert.equal(validateIdentity(UID, 'Owner.Sintetico@Example.com').email, 'owner.sintetico@example.com');
});

test('constante gravada no artefato está normalizada e o proprietário autorizado passa no gate', () => {
  const html = applyHomologSubstitutions(SOURCE, { sdk: SDK, uid: UID, email: 'Owner.Sintetico@Example.com', shortSha: '0123456789ab' });
  const { ctx, email } = gateFrom(html);
  assert.equal(email, 'owner.sintetico@example.com', 'constante do artefato em minúsculas');
  assert.equal(ctx.isAccessAdmin({ uid: UID, email: 'owner.sintetico@example.com', emailVerified: true }), true, 'proprietário autorizado: acesso permitido');
  assert.equal(ctx.isAccessAdmin({ uid: UID, email: 'Owner.Sintetico@Example.com', emailVerified: true }), true, 'mesma conta com maiúsculas no provedor: acesso permitido');
});

test('usuário desconhecido e conta de outro UID são negados', () => {
  const html = applyHomologSubstitutions(SOURCE, { sdk: SDK, uid: UID, email: OWNER_EMAIL, shortSha: '0123456789ab' });
  const { ctx } = gateFrom(html);
  assert.equal(ctx.isAccessAdmin({ uid: 'OutroUidDesconhecido0001', email: OWNER_EMAIL, emailVerified: true }), false, 'UID diferente nunca concede');
  assert.equal(ctx.isAccessAdmin({ uid: UID, email: 'outro@example.com', emailVerified: true }), false, 'e-mail diferente nunca concede');
});

test('mesmo e-mail sem verificação ou com variante "+" não concede acesso', () => {
  const html = applyHomologSubstitutions(SOURCE, { sdk: SDK, uid: UID, email: OWNER_EMAIL, shortSha: '0123456789ab' });
  const { ctx } = gateFrom(html);
  assert.equal(ctx.isAccessAdmin({ uid: UID, email: OWNER_EMAIL, emailVerified: false }), false, 'e-mail não verificado nega');
  assert.equal(ctx.isAccessAdmin({ uid: UID, email: 'owner.sintetico+qa@example.com', emailVerified: true }), false, 'variante não é o proprietário');
});

test('sem usuário autenticado: negado (fail-closed)', () => {
  const html = applyHomologSubstitutions(SOURCE, { sdk: SDK, uid: UID, email: OWNER_EMAIL, shortSha: '0123456789ab' });
  const { ctx } = gateFrom(html);
  assert.equal(ctx.isAccessAdmin(null), false);
  assert.equal(ctx.isAccessAdmin(undefined), false);
});

test('identidade de produção continua recusada em qualquer capitalização', () => {
  const prod = readOwnerIdentifiers().email;
  assert.throws(() => validateIdentity('SyntheticOwnerUid000000002', prod.toUpperCase()), /produção/);
  assert.throws(() => validateIdentity('SyntheticOwnerUid000000002', prod), /produção/);
});
