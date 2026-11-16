'use strict';
// SM173.3 — matriz owner-only contra a regra candidata EXATA, no emulador (identidades sintéticas).
// Fora da cadeia npm test. Executa somente com SM173_RULES_FILE e SM173_OWNER_UID definidos.
const assert = require('node:assert/strict');
const { test, before } = require('node:test');

const RUN = Boolean(process.env.SM173_RULES_FILE && process.env.SM173_OWNER_UID);
const SKIP = RUN ? false : 'defina SM173_RULES_FILE e SM173_OWNER_UID (execução via emulators:exec)';
const PROJECT = 'demo-sm173-candidate';
const AUTH = 'http://127.0.0.1:19099';
const DOCS = `http://127.0.0.1:19080/v1/projects/${PROJECT}/databases/(default)/documents`;
const ADMIN = { Authorization: 'Bearer owner' };

const OWNER = process.env.SM173_OWNER_UID || 'synthetic-owner';
const A = 'sm173-synthetic-A';
const B = 'sm173-synthetic-B';
const OWNER_UNVERIFIED = 'sm173-synthetic-owner-unverified';

const b64 = v => Buffer.from(JSON.stringify(v)).toString('base64url');
function customToken(uid) {
  const now = Math.floor(Date.now() / 1000);
  const sa = 'firebase-auth-emulator@example.com';
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ iss: sa, sub: sa, aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit', iat: now, exp: now + 3600, uid })}.`;
}
// Sessão sintética: define e-mail/verificação no emulador e devolve token com claims reais.
async function session(uid, verified) {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-api-key`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: customToken(uid), returnSecureToken: true }) });
  const s = await r.json();
  assert.ok(s.idToken, 'sessão sintética inicial');
  const upd = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-api-key`, { method: 'POST', headers: { 'content-type': 'application/json', ...ADMIN }, body: JSON.stringify({ idToken: s.idToken, localId: uid, email: `${uid}@synthetic.test`, emailVerified: verified, returnSecureToken: true }) });
  assert.equal(upd.status, 200, 'emulador aceitou a verificação sintética');
  const r2 = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-api-key`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: customToken(uid), returnSecureToken: true }) });
  const tok = (await r2.json()).idToken || s.idToken;
  const claims = JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString('utf8'));
  assert.equal(claims.email_verified, verified, 'claim email_verified corresponde à verificação sintética');
  return tok;
}
async function call(method, path, token, body) {
  const headers = { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const r = await fetch(`${DOCS}/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(8000) });
  return r.status;
}
const f = v => ({ fields: { v: { stringValue: v } } });
const ALLOW = s => s === 200;
const DENY = s => s === 403 || s === 401;

let owner, ownerUnverified, a, b;
before(async () => {
  if (!RUN) return;
  await call('PATCH', `portfolios/${OWNER}`, 'owner', f('seed-owner'));
  await call('PATCH', `portfolios/${A}`, 'owner', f('seed-A'));
  await call('PATCH', `portfolios/${B}`, 'owner', f('seed-B'));
  await call('PATCH', 'meta/access', 'owner', f('seed-registro'));
  owner = await session(OWNER, true);
  ownerUnverified = await session(OWNER_UNVERIFIED, false);
  a = await session(A, true);
  b = await session(B, true);
});

// ---- Proprietário verificado: caminhos legítimos ----
test('P01 proprietário verificado lê própria carteira', { skip: SKIP }, async () => { assert.ok(ALLOW(await call('GET', `portfolios/${OWNER}`, owner))); });
test('P02 proprietário verificado grava própria carteira', { skip: SKIP }, async () => { assert.ok(ALLOW(await call('PATCH', `portfolios/${OWNER}`, owner, f('owner-write')))); });
test('P03 proprietário verificado exclui própria carteira', { skip: SKIP }, async () => { assert.ok(ALLOW(await call('DELETE', `portfolios/${OWNER}`, owner))); await call('PATCH', `portfolios/${OWNER}`, 'owner', f('seed-owner')); });
test('P04 proprietário verificado grava users próprio', { skip: SKIP }, async () => { assert.ok(ALLOW(await call('PATCH', `users/${OWNER}`, owner, f('owner-profile')))); });
test('P05 proprietário verificado lê meta/access', { skip: SKIP }, async () => { assert.ok(ALLOW(await call('GET', 'meta/access', owner))); });
// ---- Proprietário sem verificação ----
test('N01 proprietário não verificado negado em portfolios', { skip: SKIP }, async () => { assert.ok(DENY(await call('GET', `portfolios/${OWNER}`, ownerUnverified))); });
test('N02 proprietário não verificado negado em meta/access', { skip: SKIP }, async () => { assert.ok(DENY(await call('GET', 'meta/access', ownerUnverified))); });
// ---- Contas não autorizadas ----
test('N03 conta A lê própria carteira => negado', { skip: SKIP }, async () => { assert.ok(DENY(await call('GET', `portfolios/${A}`, a))); });
test('N04 conta A grava própria carteira => negado', { skip: SKIP }, async () => { assert.ok(DENY(await call('PATCH', `portfolios/${A}`, a, f('A-own')))); });
test('N05 conta A lê carteira do proprietário => negado', { skip: SKIP }, async () => { assert.ok(DENY(await call('GET', `portfolios/${OWNER}`, a))); });
test('N06 conta A grava carteira do proprietário => negado', { skip: SKIP }, async () => { assert.ok(DENY(await call('PATCH', `portfolios/${OWNER}`, a, f('A-hacks-owner')))); });
test('N07 conta A exclui carteira do proprietário => negado', { skip: SKIP }, async () => { assert.ok(DENY(await call('DELETE', `portfolios/${OWNER}`, a))); });
test('N08 conta A lê carteira de B => negado', { skip: SKIP }, async () => { assert.ok(DENY(await call('GET', `portfolios/${B}`, a))); });
test('N09 conta A lê users próprio => negado', { skip: SKIP }, async () => { assert.ok(DENY(await call('GET', `users/${A}`, a))); });
test('N10 conta B lê carteira do proprietário => negado', { skip: SKIP }, async () => { assert.ok(DENY(await call('GET', `portfolios/${OWNER}`, b))); });
// ---- Anônimo ----
test('N11 anônimo lê carteira do proprietário => negado', { skip: SKIP }, async () => { assert.ok(DENY(await call('GET', `portfolios/${OWNER}`, null))); });
test('N12 anônimo grava carteira do proprietário => negado', { skip: SKIP }, async () => { assert.ok(DENY(await call('PATCH', `portfolios/${OWNER}`, null, f('anon')))); });
test('N13 anônimo lê meta/access => negado', { skip: SKIP }, async () => { assert.ok(DENY(await call('GET', 'meta/access', null))); });
// ---- meta/access: sem leitura nem autoautorização ----
test('N14 conta A lê meta/access => negado', { skip: SKIP }, async () => { assert.ok(DENY(await call('GET', 'meta/access', a))); });
test('N15 conta A autoconcede acesso em meta/access => negado', { skip: SKIP }, async () => { assert.ok(DENY(await call('PATCH', 'meta/access', a, f('A-self-grant')))); });
test('N16 conta B escreve meta/access => negado', { skip: SKIP }, async () => { assert.ok(DENY(await call('PATCH', 'meta/access', b, f('B-self-grant')))); });
test('N17 proprietário não verificado escreve meta/access => negado', { skip: SKIP }, async () => { assert.ok(DENY(await call('PATCH', 'meta/access', ownerUnverified, f('x')))); });
// ---- Subcoleções e caminhos sem regra: negados por padrão ----
test('N18 subcoleção sob portfolios sem regra => negada (proprietário)', { skip: SKIP }, async () => { assert.ok(DENY(await call('GET', `portfolios/${OWNER}/lancamentos/x`, owner))); });
test('N19 subcoleção sob portfolios sem regra => negada (conta A)', { skip: SKIP }, async () => { assert.ok(DENY(await call('PATCH', `portfolios/${A}/lancamentos/x`, a, f('x')))); });
test('N20 caminho fora de todas as regras => negado (proprietário)', { skip: SKIP }, async () => { assert.ok(DENY(await call('GET', 'outra-colecao/x', owner))); });
