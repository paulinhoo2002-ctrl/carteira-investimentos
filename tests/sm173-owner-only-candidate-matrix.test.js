'use strict';
// SM173.3 — matriz owner-only contra a regra candidata EXATA, no emulador (identidades sintéticas).
// Fora da cadeia npm test. Executa somente com SM173_RULES_FILE e SM173_OWNER_UID definidos,
// dentro de `firebase emulators:exec` com um config apontando para o mesmo arquivo de regras.
const assert = require('node:assert/strict');
const { test } = require('node:test');

const RUN = Boolean(process.env.SM173_RULES_FILE && process.env.SM173_OWNER_UID);
const SKIP = RUN ? false : 'defina SM173_RULES_FILE e SM173_OWNER_UID (execução via emulators:exec)';
const PROJECT = 'demo-sm173-candidate';
const AUTH = 'http://127.0.0.1:19099';
const DOCS = `http://127.0.0.1:19080/v1/projects/${PROJECT}/databases/(default)/documents`;
const ADMIN = { Authorization: 'Bearer owner' };

const OWNER = process.env.SM173_OWNER_UID || 'synthetic-owner';
const A = 'sm173-synthetic-A';
const B = 'sm173-synthetic-B';
const ANON = null;

const b64 = v => Buffer.from(JSON.stringify(v)).toString('base64url');
function customToken(uid) {
  const now = Math.floor(Date.now() / 1000);
  const sa = 'firebase-auth-emulator@example.com';
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ iss: sa, sub: sa, aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit', iat: now, exp: now + 3600, uid })}.`;
}
// Cria sessão sintética; define e-mail e verificação no emulador (nunca conta real).
async function session(uid, verified) {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-api-key`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: customToken(uid), returnSecureToken: true }) });
  const s = await r.json();
  assert.ok(s.idToken, 'sessão sintética');
  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-api-key`, { method: 'POST', headers: { 'content-type': 'application/json', ...ADMIN }, body: JSON.stringify({ idToken: s.idToken, email: `${uid}@synthetic.test`, emailVerified: verified, returnSecureToken: true }) });
  const r2 = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-api-key`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: customToken(uid), returnSecureToken: true }) });
  return (await r2.json()).idToken || s.idToken;
}
async function call(method, path, token, body) {
  const headers = { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const r = await fetch(`${DOCS}/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(8000) });
  return r.status;
}
const f = v => ({ fields: { v: { stringValue: v } } });
const ALLOW = s => s === 200;
const DENY = s => s === 403 || s === 401;

test('SM173.3 matriz owner-only (regra candidata)', { skip: SKIP }, async () => {
  await call('PATCH', `portfolios/${OWNER}`, 'owner', f('seed-owner'));
  await call('PATCH', `portfolios/${A}`, 'owner', f('seed-A'));
  await call('PATCH', `portfolios/${B}`, 'owner', f('seed-B'));
  await call('PATCH', 'meta/access', 'owner', f('seed-registro'));
  const owner = await session(OWNER, true);
  const ownerUnverified = await session(OWNER, false);
  const a = await session(A, true);
  const b = await session(B, true);

  // Proprietário verificado: legítimo
  assert.ok(ALLOW(await call('GET', `portfolios/${OWNER}`, owner)), 'proprietário lê própria carteira');
  assert.ok(ALLOW(await call('PATCH', `portfolios/${OWNER}`, owner, f('owner-write'))), 'proprietário grava própria carteira');
  assert.ok(ALLOW(await call('DELETE', `portfolios/${OWNER}`, owner)), 'proprietário exclui própria carteira');
  await call('PATCH', `portfolios/${OWNER}`, 'owner', f('seed-owner'));
  assert.ok(ALLOW(await call('GET', 'meta/access', owner)), 'proprietário lê registro de autorização');
  assert.ok(ALLOW(await call('PATCH', `users/${OWNER}`, owner, f('owner-profile'))), 'proprietário grava próprio users');
  // Proprietário sem e-mail verificado: negado
  assert.ok(DENY(await call('GET', `portfolios/${OWNER}`, ownerUnverified)), 'proprietário não verificado negado');
  // Contas não autorizadas: negadas em tudo, inclusive próprios documentos
  assert.ok(DENY(await call('GET', `portfolios/${A}`, a)), 'A lê própria carteira => negado');
  assert.ok(DENY(await call('PATCH', `portfolios/${A}`, a, f('A-own'))), 'A grava própria carteira => negado');
  assert.ok(DENY(await call('GET', `portfolios/${OWNER}`, a)), 'A lê carteira do proprietário => negado');
  assert.ok(DENY(await call('PATCH', `portfolios/${OWNER}`, a, f('A-hacks-owner'))), 'A grava carteira do proprietário => negado');
  assert.ok(DENY(await call('DELETE', `portfolios/${OWNER}`, a)), 'A exclui carteira do proprietário => negado');
  assert.ok(DENY(await call('GET', `portfolios/${B}`, a)), 'A lê B => negado');
  assert.ok(DENY(await call('GET', `users/${A}`, a)), 'A lê users próprio => negado');
  assert.ok(DENY(await call('GET', `portfolios/${OWNER}`, b)), 'B lê carteira do proprietário => negado');
  // Anônimo
  assert.ok(DENY(await call('GET', `portfolios/${OWNER}`, ANON)), 'anônimo lê carteira => negado');
  assert.ok(DENY(await call('GET', 'meta/access', ANON)), 'anônimo lê meta/access => negado');
  // meta/access: sem autoautorização nem leitura por terceiros
  assert.ok(DENY(await call('GET', 'meta/access', a)), 'A lê meta/access => negado');
  assert.ok(DENY(await call('PATCH', 'meta/access', a, f('A-self-grant'))), 'A autoconcede acesso em meta/access => negado');
  assert.ok(DENY(await call('PATCH', 'meta/access', b, f('B-self-grant'))), 'B escreve meta/access => negado');
  // Caminhos não cobertos: negados por padrão
  assert.ok(DENY(await call('GET', `portfolios/${OWNER}/lancamentos/x`, owner)), 'subcoleção sem regra => negada por padrão');
});
