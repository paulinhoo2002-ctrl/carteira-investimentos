'use strict';

/**
 * AUTH-DEMO Phase 2 — Security attack matrix (mission P4) + Auth emulator
 * synthetic users (mission P5). Runs inside `firebase emulators:exec` via
 * `npm run test:auth-demo-emulator` (firebase.auth-demo-emulator.json loads
 * firestore.auth-demo.rules; project demo-auth-demo-phase2; ZERO cost,
 * localhost-only, synthetic emails only, no production contact).
 *
 * Matrix (all must PASS => SECURITY_ATTACK_MATRIX=100%):
 *   T01 unauthenticated read real path        => DENIED
 *   T02 unauthenticated write                 => DENIED
 *   T03 DEMO user reads real data             => DENIED
 *   T04 DEMO user writes real data            => DENIED
 *   T05 REAL A reads B                        => DENIED
 *   T06 REAL A writes B                       => DENIED
 *   T07 REAL A reads own                      => ALLOWED
 *   T08 REAL A writes own scope               => ALLOWED
 *   T09 BLOCKED reads                         => DENIED
 *   T10 BLOCKED writes                        => DENIED
 *   T11 any client mutates registry           => DENIED (no self-escalation)
 *   T12 client-side ACCOUNT_MODE spoof        => DENIED (server registry wins)
 *   T13 cross-user registry read              => DENIED
 *   T14 verified, registry missing            => DENIED (fail-closed)
 *   T15 own registry read + resolver contract => ALLOWED/consistent
 *   T16 invalid role                          => DENIED (resolver => DEMO)
 */

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { before, test } = require('node:test');

const { resolveAccountMode, MODES } = require('../auth/account-mode');

const PROJECT = 'demo-auth-demo-phase2';
const AUTH = 'http://127.0.0.1:9099';
const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;

async function request(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(12000) });
}

async function signIn(email, password) {
  const res = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  assert.equal(res.ok, true, `signIn failed for ${email}: HTTP ${res.status}`);
  return res.json();
}

async function signUpOrIn(email, password) {
  const res = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  if (res.ok) return res.json();
  const body = await res.json().catch(() => ({}));
  const msg = body && body.error && body.error.message ? body.error.message : '';
  if (msg.includes('EMAIL_EXISTS')) return signIn(email, password);
  assert.fail(`signUp failed for ${email}: HTTP ${res.status} ${msg}`);
}

// Emulator-documented email verification flow: accounts:update with a bare
// {emailVerified:true} is a silent NO-OP on the Auth emulator — the account
// stays unverified. The working path: sendOobCode(VERIFY_EMAIL) → read the
// code from the emulator's oobCodes listing → accounts:update {oobCode} →
// account verified; a fresh sign-in then mints email_verified=true in claims.
async function markEmailVerified(email, password, idToken) {
  void password;
  const send = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=demo-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken }),
  });
  const sendText = await send.text();
  assert.equal(send.ok, true, `sendOobCode failed: HTTP ${send.status} ${sendText}`);
  const listRes = await request(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`);
  assert.equal(listRes.ok, true, `oobCodes listing failed: HTTP ${listRes.status}`);
  const list = await listRes.json();
  const entry = (list.oobCodes || []).find((c) => c.email === email);
  assert.ok(entry, `no VERIFY_EMAIL oobCode for ${email}: ${JSON.stringify(list).slice(0, 300)}`);
  const upd = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ oobCode: entry.oobCode }),
  });
  const updText = await upd.text();
  assert.equal(upd.ok, true, `accounts:update (oobCode) failed: HTTP ${upd.status} ${updText}`);
}

// Admin seed — Firestore emulator treats 'Bearer owner' as a privileged
// credential (trusted/admin path; the ONLY way registry docs get created).
async function adminPatch(path, fields) {
  const res = await request(`${FS}/${path}`, {
    method: 'PATCH',
    headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  const text = await res.text(); // read the body exactly once
  assert.equal(res.ok, true, `admin seed failed at ${path}: HTTP ${res.status} ${text}`);
}

async function userCall(idToken, method, path, fields) {
  return request(`${FS}/${path}`, {
    method,
    headers: { authorization: `Bearer ${idToken}`, 'content-type': 'application/json' },
    body: fields ? JSON.stringify({ fields }) : undefined,
  });
}

function toPlain(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields || {})) out[k] = Object.values(v)[0];
  return out;
}

const ctx = {};

async function createUser(name, { verified, registry }) {
  const email = `${name.toLowerCase().replace(/_/g, '-')}@auth-demo.test`;
  const password = `synthetic-${randomUUID()}`; // synthetic-only, per-run, never logged
  const auth = await signUpOrIn(email, password);
  let idToken = auth.idToken;
  if (verified) {
    await markEmailVerified(email, password, idToken);
    idToken = (await signIn(email, password)).idToken; // fresh mint from current account state
  }
  const uid = auth.localId;
  if (registry) {
    await adminPatch(`authorizedUsers/${uid}`, {
      uid: { stringValue: uid },
      normalizedEmail: { stringValue: email },
      enabled: { booleanValue: registry.enabled },
      blocked: { booleanValue: registry.blocked },
      role: { stringValue: registry.role },
    });
  }
  return { name, email, uid, idToken, verified, registry };
}

before(async () => {
  // P5 synthetic users — no real emails, no real identities.
  ctx.OWNER_REAL = await createUser('OWNER_REAL', { verified: true, registry: { enabled: true, blocked: false, role: 'owner' } });
  ctx.USER_REAL = await createUser('USER_REAL', { verified: true, registry: { enabled: true, blocked: false, role: 'user' } });
  ctx.USER_DEMO = await createUser('USER_DEMO', { verified: true, registry: { enabled: false, blocked: false, role: 'user' } });
  ctx.USER_BLOCKED = await createUser('USER_BLOCKED', { verified: true, registry: { enabled: true, blocked: true, role: 'user' } });
  ctx.USER_UNVERIFIED = await createUser('USER_UNVERIFIED', { verified: false, registry: { enabled: true, blocked: false, role: 'owner' } });
  ctx.USER_NOREGISTRY = await createUser('USER_NOREGISTRY', { verified: true, registry: null });
  ctx.USER_BADROLE = await createUser('USER_BADROLE', { verified: true, registry: { enabled: true, blocked: false, role: 'superadmin-invalid' } });

  // UID-scoped real portfolio seeds (synthetic markers only).
  await adminPatch(`portfolios/${ctx.OWNER_REAL.uid}`, { seededFor: { stringValue: 'OWNER_REAL' } });
  await adminPatch(`portfolios/${ctx.USER_REAL.uid}`, { seededFor: { stringValue: 'USER_REAL' } });
});

const DENIED = (status) => status === 403 || status === 401;

// ===== Invariant 1: unauthenticated =====

test('T01: unauthenticated read of real portfolio path => DENIED', async () => {
  const res = await request(`${FS}/portfolios/${ctx.OWNER_REAL.uid}`);
  assert.ok(DENIED(res.status), `expected DENIED, got HTTP ${res.status}`);
});

test('T02: unauthenticated write to real portfolio path => DENIED', async () => {
  const res = await request(`${FS}/portfolios/${ctx.USER_REAL.uid}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { hack: { booleanValue: true } } }),
  });
  assert.ok(DENIED(res.status), `expected DENIED, got HTTP ${res.status}`);
});

// ===== Invariant 2: DEMO cannot touch real data =====

test('T03: DEMO user (enabled=false) reads real data => DENIED (own path and others)', async () => {
  const own = await userCall(ctx.USER_DEMO.idToken, 'GET', `portfolios/${ctx.USER_DEMO.uid}`);
  assert.equal(own.status, 403, `DEMO read own real path: got HTTP ${own.status}`);
  const other = await userCall(ctx.USER_DEMO.idToken, 'GET', `portfolios/${ctx.USER_REAL.uid}`);
  assert.equal(other.status, 403, `DEMO read other real path: got HTTP ${other.status}`);
});

test('T04: DEMO user writes real data => DENIED', async () => {
  const own = await userCall(ctx.USER_DEMO.idToken, 'PATCH', `portfolios/${ctx.USER_DEMO.uid}`, { hack: { booleanValue: true } });
  assert.equal(own.status, 403, `DEMO write own real path: got HTTP ${own.status}`);
  const other = await userCall(ctx.USER_DEMO.idToken, 'PATCH', `portfolios/${ctx.USER_REAL.uid}`, { hack: { booleanValue: true } });
  assert.equal(other.status, 403, `DEMO write other real path: got HTTP ${other.status}`);
});

// ===== Invariants 3+4: own scope only =====

test('T05: REAL user A reads user B portfolio => DENIED', async () => {
  const res = await userCall(ctx.USER_REAL.idToken, 'GET', `portfolios/${ctx.OWNER_REAL.uid}`);
  assert.equal(res.status, 403, `got HTTP ${res.status}`);
});

test('T06: REAL user A writes user B portfolio => DENIED', async () => {
  const res = await userCall(ctx.USER_REAL.idToken, 'PATCH', `portfolios/${ctx.OWNER_REAL.uid}`, { hack: { booleanValue: true } });
  assert.equal(res.status, 403, `got HTTP ${res.status}`);
});

test('T07: REAL user reads own portfolio => ALLOWED (P5: verified+authorized)', async () => {
  // decisive probe: the token claim the rules actually evaluate
  const claims = JSON.parse(Buffer.from(ctx.USER_REAL.idToken.split('.')[1], 'base64url').toString('utf8'));
  const lookupRes = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:lookup?key=demo-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken: ctx.USER_REAL.idToken }),
  });
  const lookup = await lookupRes.json();
  assert.equal(
    claims.email_verified, true,
    `token claim email_verified=${claims.email_verified}; account emailVerified=${lookup.users && lookup.users[0] && lookup.users[0].emailVerified}`
  );
  const res = await userCall(ctx.USER_REAL.idToken, 'GET', `portfolios/${ctx.USER_REAL.uid}`);
  assert.equal(res.status, 200, `got HTTP ${res.status} (claim ok => investigate rules)`);
  const doc = await res.json();
  assert.equal(toPlain(doc.fields).seededFor, 'USER_REAL');
});

test('T08: REAL user writes own allowed scope => ALLOWED', async () => {
  const res = await userCall(ctx.USER_REAL.idToken, 'PATCH', `portfolios/${ctx.USER_REAL.uid}`, {
    syntheticWrite: { booleanValue: true },
  });
  assert.equal(res.status, 200, `got HTTP ${res.status}`);
});

// ===== Invariant 5: BLOCKED no access =====

test('T09: BLOCKED user reads own portfolio => DENIED', async () => {
  const res = await userCall(ctx.USER_BLOCKED.idToken, 'GET', `portfolios/${ctx.USER_BLOCKED.uid}`);
  assert.equal(res.status, 403, `got HTTP ${res.status}`);
});

test('T10: BLOCKED user writes own portfolio => DENIED', async () => {
  const res = await userCall(ctx.USER_BLOCKED.idToken, 'PATCH', `portfolios/${ctx.USER_BLOCKED.uid}`, { hack: { booleanValue: true } });
  assert.equal(res.status, 403, `got HTTP ${res.status}`);
});

// ===== Invariant 6 + P3: registry immutable for clients =====

test('T11: any client mutation of authorization registry => DENIED (no self-escalation)', async () => {
  const attempts = [
    ['self-escalate own role', ctx.USER_REAL, ctx.USER_REAL.uid, { role: { stringValue: 'admin' } }],
    ['unblock self', ctx.USER_BLOCKED, ctx.USER_BLOCKED.uid, { blocked: { booleanValue: false } }],
    ['admin cannot edit via client', ctx.OWNER_REAL, ctx.OWNER_REAL.uid, { role: { stringValue: 'user' } }],
    ['edit another user registry', ctx.USER_REAL, ctx.USER_BLOCKED.uid, { blocked: { booleanValue: false } }],
    ['self-authorize missing record', ctx.USER_NOREGISTRY, ctx.USER_NOREGISTRY.uid, { enabled: { booleanValue: true }, role: { stringValue: 'owner' } }],
  ];
  for (const [label, user, targetUid, fields] of attempts) {
    const res = await userCall(user.idToken, 'PATCH', `authorizedUsers/${targetUid}`, fields);
    assert.equal(res.status, 403, `${label}: expected 403, got HTTP ${res.status}`);
  }
  const del = await userCall(ctx.USER_REAL.idToken, 'DELETE', `authorizedUsers/${ctx.USER_REAL.uid}`);
  assert.equal(del.status, 403, `registry delete: expected 403, got HTTP ${del.status}`);
});

// ===== Invariant 7 + P5: spoof / unverified =====

test('T12: client-side ACCOUNT_MODE spoof cannot bypass — DEMO+unverified users denied on real data', async () => {
  // DEMO user "claiming" REAL client-side: server registry still says enabled=false
  const spoofRead = await userCall(ctx.USER_DEMO.idToken, 'GET', `portfolios/${ctx.USER_DEMO.uid}`);
  assert.equal(spoofRead.status, 403, `spoofed DEMO read: got HTTP ${spoofRead.status}`);
  const spoofWrite = await userCall(ctx.USER_DEMO.idToken, 'PATCH', `portfolios/${ctx.USER_DEMO.uid}`, { spoofed: { booleanValue: true } });
  assert.equal(spoofWrite.status, 403, `spoofed DEMO write: got HTTP ${spoofWrite.status}`);
  // Authorized registry + UNVERIFIED email: resolver => DEMO, rules => DENY
  const unverifiedRead = await userCall(ctx.USER_UNVERIFIED.idToken, 'GET', `portfolios/${ctx.USER_UNVERIFIED.uid}`);
  assert.equal(unverifiedRead.status, 403, `unverified read: got HTTP ${unverifiedRead.status}`);
  const unverifiedWrite = await userCall(ctx.USER_UNVERIFIED.idToken, 'PATCH', `portfolios/${ctx.USER_UNVERIFIED.uid}`, { spoofed: { booleanValue: true } });
  assert.equal(unverifiedWrite.status, 403, `unverified write: got HTTP ${unverifiedWrite.status}`);
});

// ===== P3: registry privacy =====

test('T13: cross-user registry read => DENIED (registry is private)', async () => {
  const res = await userCall(ctx.USER_REAL.idToken, 'GET', `authorizedUsers/${ctx.OWNER_REAL.uid}`);
  assert.equal(res.status, 403, `got HTTP ${res.status}`);
});

// ===== Fail-closed: missing registry =====

test('T14: verified user with NO registry record => DENIED (no record = no access)', async () => {
  const res = await userCall(ctx.USER_NOREGISTRY.idToken, 'GET', `portfolios/${ctx.USER_NOREGISTRY.uid}`);
  assert.equal(res.status, 403, `got HTTP ${res.status}`);
});

// ===== P5: registry + resolver contract integration =====

test('T15: own registry read allowed; server registry data resolves expected account modes', async () => {
  const expectations = [
    [ctx.OWNER_REAL, MODES.REAL],
    [ctx.USER_REAL, MODES.REAL],
    [ctx.USER_DEMO, MODES.DEMO],
    [ctx.USER_BLOCKED, MODES.BLOCKED],
    [ctx.USER_UNVERIFIED, MODES.DEMO],
  ];
  for (const [user, expectedMode] of expectations) {
    const res = await userCall(user.idToken, 'GET', `authorizedUsers/${user.uid}`);
    assert.equal(res.status, 200, `${user.name} own registry read: got HTTP ${res.status}`);
    const authorization = toPlain((await res.json()).fields);
    const mode = resolveAccountMode({ authUser: { uid: user.uid }, emailVerified: user.verified, authorization });
    assert.equal(mode, expectedMode, `${user.name}: expected ${expectedMode}, got ${mode}`);
  }
  // No registry record at all => DEMO (Phase 1 contract)
  const mode = resolveAccountMode({ authUser: { uid: ctx.USER_NOREGISTRY.uid }, emailVerified: true, authorization: null });
  assert.equal(mode, MODES.DEMO);
});

test('T16: invalid role in registry => DENIED on real data; resolver => DEMO', async () => {
  const res = await userCall(ctx.USER_BADROLE.idToken, 'GET', `portfolios/${ctx.USER_BADROLE.uid}`);
  assert.equal(res.status, 403, `got HTTP ${res.status}`);
  const regRead = await userCall(ctx.USER_BADROLE.idToken, 'GET', `authorizedUsers/${ctx.USER_BADROLE.uid}`);
  assert.equal(regRead.status, 200);
  const authorization = toPlain((await regRead.json()).fields);
  assert.equal(
    resolveAccountMode({ authUser: { uid: ctx.USER_BADROLE.uid }, emailVerified: true, authorization }),
    MODES.DEMO
  );
});
