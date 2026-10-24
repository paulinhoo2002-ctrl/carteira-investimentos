'use strict';

/**
 * M594/M595 — REAL-RULES security matrix (canonical firestore.rules, emulator-only).
 * Runs inside `firebase emulators:exec` via `npm run test:m594-real-rules-emulator`
 * (firebase.m594-real-rules.emulator.json loads ./firestore.rules — the CANONICAL
 * production rules file — into the emulator; project demo-m594-real-rules; ZERO
 * cost, localhost-only, synthetic identities, no production contact).
 *
 * M595 contract (owner decision, implemented in isOwnerAccount()):
 * the ONLY account that may touch financial/admin documents is the OWNER —
 * verified email paulinhoo2002@gmail.com — AND only on paths matching its own uid.
 *
 * Matrix:
 *   R01 unauthenticated read/write portfolio        => DENIED
 *   R05 unverified OWNER-EMAIL on own uid           => DENIED (verified gate)
 *   R11 unverified OWNER-EMAIL on meta/access        => DENIED
 *   R02 verified OWNER reads own portfolio          => ALLOWED
 *   R03 verified OWNER writes own portfolio         => ALLOWED
 *   R03b verified OWNER writes own /users doc       => ALLOWED
 *   R08 verified OWNER (admin) reads meta/access    => ALLOWED
 *   R09 verified OWNER (admin) writes meta/access   => ALLOWED
 *   R13 verified OWNER on a FOREIGN uid path        => DENIED (uid scoping)
 *   R04 cross-user (any two non-owners)             => DENIED both directions
 *   R06 unverified NON-OWNER on own uid             => DENIED (no sandbox)
 *   R07 verified NON-OWNER on own uid               => DENIED (owner-only; no sandbox)
 *   R10 non-owner verified user on meta/access      => DENIED
 *   R12 anonymous (no token) meta/access            => DENIED
 *   R14 unauthorized collection (default-deny)      => DENIED even for the owner
 *
 * Test order matters: the owner lifecycle test OWNS the OWNER_EMAIL account
 * (creates it UNVERIFIED, denies, verifies, then allows). Every other test
 * uses synthetic non-owner identities.
 */

const assert = require('node:assert/strict');
const { test } = require('node:test');

const PROJECT = 'demo-m594-real-rules';
const AUTH = 'http://127.0.0.1:9101';
const FS = `http://127.0.0.1:8086/v1/projects/${PROJECT}/databases/(default)/documents`;
const KEY = 'demo-api-key';
const OWNER_EMAIL = 'paulinhoo2002@gmail.com'; // hardcoded in canonical firestore.rules (isOwnerAccount)
const OWNER_PASS = 'M594-Pass-123';

async function request(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(12000) });
}

async function signIn(email, password) {
  const res = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  assert.equal(res.ok, true, `signIn failed for ${email}: HTTP ${res.status}`);
  return res.json();
}

async function signUpOrIn(email, password) {
  const res = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${KEY}`, {
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

// Emulator-documented verification: sendOobCode(VERIFY_EMAIL) → emulator oobCodes
// listing → accounts:update {oobCode} → fresh sign-in mints email_verified=true.
async function markEmailVerified(idToken) {
  const send = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken }),
  });
  assert.equal(send.ok, true, `sendOobCode failed: HTTP ${send.status}`);
  const listRes = await request(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`);
  assert.equal(listRes.ok, true, `oobCodes list failed: HTTP ${listRes.status}`);
  const list = await listRes.json();
  const code = (list.oobCodes || []).find(item => item.requestType === 'VERIFY_EMAIL');
  assert.ok(code, 'no VERIFY_EMAIL oob code found');
  const update = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=${KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ oobCode: code.oobCode }),
  });
  assert.equal(update.ok, true, `accounts:update (verify) failed: HTTP ${update.status}`);
}

async function freshVerifiedAccount(email) {
  const first = await signUpOrIn(email, 'M594-Pass-123');
  await markEmailVerified(first.idToken);
  const fresh = await signUpOrIn(email, 'M594-Pass-123'); // re-sign-in mints verified claim
  return fresh;
}

async function fsGet(token, path) {
  return request(`${FS}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
}

// Plain PATCH (no updateMask): creating new synthetic fields WITH a mask returns
// 400 on the emulator; without the mask the field is created fine.
async function fsWrite(token, path, fields) {
  return request(`${FS}/${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fields }),
  });
}

const denied = (status, label) => assert.ok(status === 401 || status === 403, `${label}: expected DENIED (401/403), got ${status}`);
const allowed = (status, label) => assert.equal(status, 200, `${label}: expected ALLOWED (200), got ${status}`);

test('R01: unauthenticated read and write of portfolio are denied', async () => {
  const read = await request(`${FS}/portfolios/uid-anon`);
  denied(read.status, 'R01 unauthenticated read');
  const write = await request(`${FS}/portfolios/uid-anon`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { m: { stringValue: 'x' } } }),
  });
  denied(write.status, 'R01 unauthenticated write');
});

test('OWNER LIFECYCLE: unverified owner-email DENIED everywhere, verified owner ALLOWED (R05,R11 → R02,R03,R03b,R08,R09)', async () => {
  // Phase 1 — fresh UNVERIFIED account bearing the owner email: denied on the
  // admin registry AND on its own financial documents (M595 verified gate).
  const unverifiedOwner = await signUpOrIn(OWNER_EMAIL, OWNER_PASS);
  const unvPortfolioRead = await fsGet(unverifiedOwner.idToken, `portfolios/${unverifiedOwner.localId}`);
  denied(unvPortfolioRead.status, 'R05 unverified owner-email read own portfolio');
  const unvPortfolioWrite = await fsWrite(unverifiedOwner.idToken, `portfolios/${unverifiedOwner.localId}`, { probe: { stringValue: 'nope' } });
  denied(unvPortfolioWrite.status, 'R05 unverified owner-email write own portfolio');
  const unvMetaRead = await fsGet(unverifiedOwner.idToken, 'meta/access');
  denied(unvMetaRead.status, 'R11 unverified owner-email read meta/access');
  const unvMetaWrite = await fsWrite(unverifiedOwner.idToken, 'meta/access', { policy: { stringValue: 'hijack' } });
  denied(unvMetaWrite.status, 'R11 unverified owner-email write meta/access');

  // Phase 2 — verify via the emulator oob flow, re-sign-in (fresh token mints
  // email_verified=true): the positive authorization of the verified owner.
  await markEmailVerified(unverifiedOwner.idToken);
  const owner = await signIn(OWNER_EMAIL, OWNER_PASS);
  const write = await fsWrite(owner.idToken, `portfolios/${owner.localId}`, { probe: { stringValue: 'owner-write-ok' } });
  allowed(write.status, 'R03 verified owner write own portfolio');
  const read = await fsGet(owner.idToken, `portfolios/${owner.localId}`);
  allowed(read.status, 'R02 verified owner read own portfolio');
  const usersWrite = await fsWrite(owner.idToken, `users/${owner.localId}`, { probe: { stringValue: 'users-write-ok' } });
  allowed(usersWrite.status, 'R03b verified owner write own /users doc');
  const metaWrite = await fsWrite(owner.idToken, 'meta/access', { policy: { stringValue: 'm594-admin-seed' } });
  allowed(metaWrite.status, 'R09 admin write meta/access');
  const metaRead = await fsGet(owner.idToken, 'meta/access');
  allowed(metaRead.status, 'R08 admin read meta/access');
});

test('R13: verified owner on a FOREIGN uid path is denied (uid scoping still required)', async () => {
  const owner = await signIn(OWNER_EMAIL, OWNER_PASS); // verified by the lifecycle test
  const foreignRead = await fsGet(owner.idToken, 'portfolios/someone-else-uid');
  denied(foreignRead.status, 'R13 owner reads foreign uid');
  const foreignWrite = await fsWrite(owner.idToken, 'portfolios/someone-else-uid', { probe: { stringValue: 'hijack' } });
  denied(foreignWrite.status, 'R13 owner writes foreign uid');
});

test('R06: unverified NON-OWNER account is denied even on its own uid', async () => {
  const unverified = await signUpOrIn('m595.unverified.other@example.invalid', 'M594-Pass-123'); // NO oob verification
  const write = await fsWrite(unverified.idToken, `portfolios/${unverified.localId}`, { probe: { stringValue: 'x' } });
  denied(write.status, 'R06 unverified non-owner write own uid');
  const read = await fsGet(unverified.idToken, `portfolios/${unverified.localId}`);
  denied(read.status, 'R06 unverified non-owner read own uid');
});

test('R07: verified NON-OWNER account is denied even on its own uid (owner-only model)', async () => {
  const other = await freshVerifiedAccount('m595.verified.other@example.invalid');
  const write = await fsWrite(other.idToken, `portfolios/${other.localId}`, { probe: { stringValue: 'sandbox' } });
  denied(write.status, 'R07 verified non-owner write own uid (no sandbox)');
  const read = await fsGet(other.idToken, `portfolios/${other.localId}`);
  denied(read.status, 'R07 verified non-owner read own uid (no sandbox)');
});

test('R04: cross-user access between non-owners is denied in both directions', async () => {
  const a = await freshVerifiedAccount('m595.cross.a@example.invalid');
  const b = await freshVerifiedAccount('m595.cross.b@example.invalid');
  const aReadsB = await fsGet(a.idToken, `portfolios/${b.localId}`);
  denied(aReadsB.status, 'R04 A reads B');
  const bWritesA = await fsWrite(b.idToken, `portfolios/${a.localId}`, { probe: { stringValue: 'hijack' } });
  denied(bWritesA.status, 'R04 B writes A');
  const bReadsA = await fsGet(b.idToken, `portfolios/${a.localId}`);
  denied(bReadsA.status, 'R04 B reads A');
});

test('R10: non-owner verified user cannot read or write meta/access', async () => {
  const other = await freshVerifiedAccount('m595.notadmin@example.invalid');
  const read = await fsGet(other.idToken, 'meta/access');
  denied(read.status, 'R10 non-admin read meta/access');
  const write = await fsWrite(other.idToken, 'meta/access', { policy: { stringValue: 'hijack' } });
  denied(write.status, 'R10 non-admin write meta/access');
});

test('R12: anonymous (no token) meta/access is denied', async () => {
  const read = await request(`${FS}/meta/access`);
  denied(read.status, 'R12 anonymous meta/access');
});

test('R14: unauthorized collection is denied for everyone (default-deny)', async () => {
  // No match block exists for /unauthorized/* — Firestore default-denies it,
  // including for the verified owner.
  const owner = await signIn(OWNER_EMAIL, OWNER_PASS);
  const ownerWrite = await fsWrite(owner.idToken, 'unauthorized/doc', { probe: { stringValue: 'x' } });
  denied(ownerWrite.status, 'R14 owner write unauthorized collection');
  const anonWrite = await request(`${FS}/unauthorized/doc`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { m: { stringValue: 'x' } } }),
  });
  denied(anonWrite.status, 'R14 anonymous write unauthorized collection');
});
