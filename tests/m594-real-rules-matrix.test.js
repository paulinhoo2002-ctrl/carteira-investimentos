'use strict';

/**
 * M594 — REAL-RULES security matrix (canonical firestore.rules, emulator-only).
 * Runs inside `firebase emulators:exec` via `npm run test:m594-real-rules-emulator`
 * (firebase.m594-real-rules.emulator.json loads ./firestore.rules — the CANONICAL
 * production rules file — into the emulator; project demo-m594-real-rules; ZERO
 * cost, localhost-only, synthetic identities, no production contact).
 *
 * Matrix (canonical semantics: owner-only by uid; admin = paulinhoo2002@gmail.com
 * verified for /meta/access):
 *   R01 unauthenticated read/write portfolio      => DENIED
 *   R02 verified owner reads own portfolio        => ALLOWED
 *   R03 verified owner writes own portfolio       => ALLOWED
 *   R04 cross-user read/write both directions     => DENIED
 *   R05 unverified owner reads own portfolio      => ALLOWED at rules level
 *       (CANONICAL RULES DO NOT require email_verified on owner paths —
 *        documented M597 revision target; the app layer enforces the
 *        verified gate client-side, rules rely on uid isolation only)
 *   R06 unverified owner writes own portfolio     => ALLOWED at rules level (same finding)
 *   R07 verified non-owner email reads own sandbox=> ALLOWED (per-uid isolation holds)
 *   R08 admin (owner email, verified) reads meta/access  => ALLOWED
 *   R09 admin (owner email, verified) writes meta/access => ALLOWED
 *   R10 non-admin verified user meta/access       => DENIED
 *   R11 UNVERIFIED owner-email account meta/access=> DENIED (rules DO enforce
 *        email_verified on the admin surface — the "unverified denied" case)
 *   R12 anonymous (no token) meta/access          => DENIED
 */

const assert = require('node:assert/strict');
const { test } = require('node:test');

const PROJECT = 'demo-m594-real-rules';
const AUTH = 'http://127.0.0.1:9101';
const FS = `http://127.0.0.1:8086/v1/projects/${PROJECT}/databases/(default)/documents`;
const KEY = 'demo-api-key';
const OWNER_EMAIL = 'paulinhoo2002@gmail.com'; // hardcoded in canonical firestore.rules (isAdmin)

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
  if (msg.includes('EMAIL_EXISTS')) {
    const signin = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    assert.equal(signin.ok, true, `signIn failed for ${email}: HTTP ${signin.status}`);
    return signin.json();
  }
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

test('R02+R03: verified owner reads and writes own portfolio (allowed)', async () => {
  const owner = await freshVerifiedAccount('m594.owner@example.invalid');
  const write = await fsWrite(owner.idToken, `portfolios/${owner.localId}`, { probe: { stringValue: 'owner-write-ok' } });
  allowed(write.status, 'R03 verified owner write own');
  const read = await fsGet(owner.idToken, `portfolios/${owner.localId}`);
  allowed(read.status, 'R02 verified owner read own');
});

test('R04: cross-user read and write are denied in both directions', async () => {
  const a = await freshVerifiedAccount('m594.cross.a@example.invalid');
  const b = await freshVerifiedAccount('m594.cross.b@example.invalid');
  await fsWrite(a.idToken, `portfolios/${a.localId}`, { probe: { stringValue: 'a-doc' } });
  const aReadsB = await fsGet(a.idToken, `portfolios/${b.localId}`);
  denied(aReadsB.status, 'R04 A reads B');
  const bWritesA = await fsWrite(b.idToken, `portfolios/${a.localId}`, { probe: { stringValue: 'hijack' } });
  denied(bWritesA.status, 'R04 B writes A');
  const bReadsA = await fsGet(b.idToken, `portfolios/${a.localId}`);
  denied(bReadsA.status, 'R04 B reads A');
});

test('R05+R06: unverified owner reads and writes own portfolio (rules allow — documented M597 target)', async () => {
  const unverified = await signUpOrIn('m594.unverified@example.invalid', 'M594-Pass-123'); // NO oob verification
  // Write first (creates the doc), then read — a GET on a nonexistent doc returns
  // 404 even when the rules ALLOW the read, which would mask the real verdict.
  const write = await fsWrite(unverified.idToken, `portfolios/${unverified.localId}`, { probe: { stringValue: 'unverified-write' } });
  allowed(write.status, 'R06 unverified owner write own (rules-level reality)');
  const read = await fsGet(unverified.idToken, `portfolios/${unverified.localId}`);
  // Canonical firestore.rules: isOwner() checks ONLY uid — email_verified is NOT
  // required on owner paths. This documents the CURRENT contract; the verified gate
  // is enforced by the app layer (auth/boot fail-closed for unverified users).
  // M597 revision candidate: require email_verified in isOwner().
  allowed(read.status, 'R05 unverified owner read own (rules-level reality)');
});

test('R07: verified non-owner email gets its own uid sandbox (isolation holds)', async () => {
  const other = await freshVerifiedAccount('m594.other.user@example.invalid');
  const write = await fsWrite(other.idToken, `portfolios/${other.localId}`, { probe: { stringValue: 'sandbox' } });
  allowed(write.status, 'R07 non-owner writes own sandbox');
  const cross = await fsGet(other.idToken, `portfolios/someone-else-uid`);
  denied(cross.status, 'R07 non-owner cannot read foreign uid');
});

test('R11→R08/R09 admin surface lifecycle: unverified owner-email DENIED, then verified ALLOWED', async () => {
  // R11 first: fresh UNVERIFIED account bearing the admin email must be denied —
  // canonical rules enforce email_verified on the admin surface ("unverified denied").
  const unverifiedAdmin = await signUpOrIn(OWNER_EMAIL, 'M594-Pass-123');
  const deniedRead = await fsGet(unverifiedAdmin.idToken, 'meta/access');
  denied(deniedRead.status, 'R11 unverified owner-email read meta/access');
  const deniedWrite = await fsWrite(unverifiedAdmin.idToken, 'meta/access', { policy: { stringValue: 'hijack' } });
  denied(deniedWrite.status, 'R11 unverified owner-email write meta/access');
  // Then verify and re-sign-in: admin operations become allowed (R08/R09).
  await markEmailVerified(unverifiedAdmin.idToken);
  const admin = await signIn(OWNER_EMAIL, 'M594-Pass-123');
  const write = await fsWrite(admin.idToken, 'meta/access', { policy: { stringValue: 'm594-admin-seed' } });
  allowed(write.status, 'R09 admin write meta/access');
  const read = await fsGet(admin.idToken, 'meta/access');
  allowed(read.status, 'R08 admin read meta/access');
});

test('R10: non-admin verified user cannot read or write meta/access', async () => {
  const other = await freshVerifiedAccount('m594.notadmin@example.invalid');
  const read = await fsGet(other.idToken, 'meta/access');
  denied(read.status, 'R10 non-admin read meta/access');
  const write = await fsWrite(other.idToken, 'meta/access', { policy: { stringValue: 'hijack' } });
  denied(write.status, 'R10 non-admin write meta/access');
});

test('R12: anonymous (no token) meta/access is denied', async () => {
  const read = await request(`${FS}/meta/access`);
  denied(read.status, 'R12 anonymous meta/access');
});
