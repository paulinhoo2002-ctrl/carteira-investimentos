'use strict';

/**
 * AUTH-DEMO Phase 2 — emulator certifications for realtime sync, cross-user
 * isolation, concurrent field-level writes and registry transitions
 * (mission P19/P20/P21/P26/P27 server-side). Runs inside
 * `npm run test:auth-access-emulator` alongside the security attack matrix.
 * Synthetic identities only; zero cost; localhost only.
 */

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { before, test } = require('node:test');

const PROJECT = 'demo-auth-demo-phase2';
const AUTH = 'http://127.0.0.1:9100';
const FS = `http://127.0.0.1:8085/v1/projects/${PROJECT}/databases/(default)/documents`;
async function request(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(12000) });
}

async function signUp(email, password) {
  const res = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  assert.equal(res.ok, true, `signUp failed for ${email}: HTTP ${res.status}`);
  return res.json();
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

// Emulator-documented verification flow (accounts:update {emailVerified} is a no-op):
// sendOobCode(VERIFY_EMAIL) → read code from /emulator/v1/.../oobCodes → update {oobCode}.
async function markEmailVerified(email, idToken) {
  const send = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=demo-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken }),
  });
  assert.equal(send.ok, true, `sendOobCode failed: HTTP ${send.status}`);
  const listRes = await request(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`);
  assert.equal(listRes.ok, true, `oobCodes listing failed: HTTP ${listRes.status}`);
  const list = await listRes.json();
  const entry = (list.oobCodes || []).find((c) => c.email === email);
  assert.ok(entry, `no oobCode for ${email}`);
  const upd = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ oobCode: entry.oobCode }),
  });
  assert.equal(upd.ok, true, `accounts:update (oobCode) failed: HTTP ${upd.status}`);
}

async function adminPatch(path, fields) {
  const res = await request(`${FS}/${path}`, {
    method: 'PATCH',
    headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  assert.equal(res.ok, true, `admin seed failed at ${path}: HTTP ${res.status}`);
}

async function userCall(idToken, method, path, fields) {
  return request(`${FS}/${path}`, {
    method,
    headers: { authorization: `Bearer ${idToken}`, 'content-type': 'application/json' },
    body: fields ? JSON.stringify({ fields }) : undefined,
  });
}

// REST Listen (`documents:listen`) is NOT implemented by the Firestore
// emulator (HTTP 404 even with valid tokens) and no Firebase SDK exists in
// this worktree's node_modules (no new deps allowed) — true onSnapshot PUSH
// semantics stay pending an SDK-based test. The tests below certify the
// data-parity and isolation guarantees reachable over REST, which is what
// the rules actually enforce.

const ctx = {};

async function createRealUser(name) {
  const email = `${name}@auth-demo.test`; // distinct namespace from the security matrix file
  const password = `synthetic-${randomUUID()}`;
  const auth = await signUp(email, password);
  await markEmailVerified(email, auth.idToken);
  // fresh sign-in AFTER verification: the signup token still claims
  // email_verified=false and rules would deny everything with it
  const fresh = await signIn(email, password);
  const uid = auth.localId;
  await adminPatch(`authorizedUsers/${uid}`, {
    uid: { stringValue: uid },
    normalizedEmail: { stringValue: email },
    enabled: { booleanValue: true },
    blocked: { booleanValue: false },
    role: { stringValue: 'user' },
  });
  return { email, password, uid, tokenA: fresh.idToken };
}

before(async () => {
  ctx.userA = await createRealUser('rt-user-a');
  ctx.userB = await createRealUser('rt-user-b');
  await adminPatch(`portfolios/${ctx.userA.uid}`, { owner: { stringValue: 'A' }, shared: { stringValue: 'seed' } });
  await adminPatch(`portfolios/${ctx.userB.uid}`, { owner: { stringValue: 'B' } });
  ctx.tokenA2 = (await signIn(ctx.userA.email, ctx.userA.password)).idToken; // device B, same REAL uid
});

test('P19: SAME_UID two-device data parity — each session observes the other\'s writes (push/onSnapshot pending SDK)', async () => {
  const path = `portfolios/${ctx.userA.uid}`;
  // device A (session 1) writes
  const wA = await userCall(ctx.userA.tokenA, 'PATCH', `${path}?updateMask.fieldPaths=rt_devA`, { rt_devA: { stringValue: 'from-A' } });
  assert.equal(wA.status, 200, `A write: HTTP ${wA.status}`);
  // device B (session 2, same REAL uid) observes A's write
  const readB = await userCall(ctx.tokenA2, 'GET', path);
  assert.equal(readB.status, 200, `B read: HTTP ${readB.status}`);
  const fB = (await readB.json()).fields;
  assert.ok(fB.rt_devA && fB.rt_devA.stringValue === 'from-A', 'device B did not observe A write');
  // device B writes
  const wB = await userCall(ctx.tokenA2, 'PATCH', `${path}?updateMask.fieldPaths=rt_devB`, { rt_devB: { stringValue: 'from-B' } });
  assert.equal(wB.status, 200, `B write: HTTP ${wB.status}`);
  // device A observes B's write
  const readA = await userCall(ctx.userA.tokenA, 'GET', path);
  assert.equal(readA.status, 200, `A read: HTTP ${readA.status}`);
  const fA = (await readA.json()).fields;
  assert.ok(fA.rt_devB && fA.rt_devB.stringValue === 'from-B', 'device A did not observe B write');
});

test('P20: CROSS_USER_ISOLATION — B read/subscribe on A denied (same rule); A payload never observable by B', async () => {
  const pathA = `portfolios/${ctx.userA.uid}`;
  await userCall(ctx.userA.tokenA, 'PATCH', `${pathA}?updateMask.fieldPaths=iso_marker`, { iso_marker: { stringValue: 'A-secret' } });
  // listen/subscribe is authorized by the same `allow read` rule — denial is rule-identical
  const readB = await userCall(ctx.userB.tokenA, 'GET', pathA);
  assert.equal(readB.status, 403, `cross-user read must be denied, got ${readB.status}`);
  const writeB = await userCall(ctx.userB.tokenA, 'PATCH', `${pathA}?updateMask.fieldPaths=iso_marker`, { iso_marker: { stringValue: 'B-tamper' } });
  assert.equal(writeB.status, 403, `cross-user write must be denied, got ${writeB.status}`);
  // A's data intact after B's attempts
  const readA = await userCall(ctx.userA.tokenA, 'GET', pathA);
  assert.equal(readA.status, 200);
  const fA = (await readA.json()).fields;
  assert.ok(fA.iso_marker && fA.iso_marker.stringValue === 'A-secret', 'A data tampered by B attempts');
});

test('P21: CONCURRENT_WRITE — field-level updates from two devices both survive (no whole-doc overwrite)', async () => {
  const path = `portfolios/${ctx.userA.uid}`;
  const wA = await userCall(ctx.userA.tokenA, 'PATCH', `${path}?updateMask.fieldPaths=conc_field_A`, { conc_field_A: { stringValue: 'kept-A' } });
  const wB = await userCall(ctx.tokenA2, 'PATCH', `${path}?updateMask.fieldPaths=conc_field_B`, { conc_field_B: { stringValue: 'kept-B' } });
  assert.equal(wA.status, 200, `A masked write: HTTP ${wA.status}`);
  assert.equal(wB.status, 200, `B masked write: HTTP ${wB.status}`);
  const read = await userCall(ctx.userA.tokenA, 'GET', path);
  assert.equal(read.status, 200);
  const fields = (await read.json()).fields;
  assert.ok(fields.conc_field_A && fields.conc_field_A.stringValue === 'kept-A', 'field X lost');
  assert.ok(fields.conc_field_B && fields.conc_field_B.stringValue === 'kept-B', 'field Y lost');
  assert.ok(fields.owner && fields.owner.stringValue === 'A', 'pre-existing field destroyed by masked writes');
  assert.ok(fields.shared && fields.shared.stringValue === 'seed', 'seeded field destroyed by masked writes');
});

test('P26/P27: registry transitions — BLOCKED→REAL authorizes; REAL revoked denies next request (no cached access)', async () => {
  const email = 'rt-transition@auth-demo.test';
  const password = `synthetic-${randomUUID()}`;
  const auth = await signUp(email, password);
  await markEmailVerified(email, auth.idToken);
  const token = (await signIn(email, password)).idToken; // fresh mint with verified claim
  const uid = auth.localId;
  const reg = (enabled) => adminPatch(`authorizedUsers/${uid}`, {
    uid: { stringValue: uid },
    normalizedEmail: { stringValue: email },
    enabled: { booleanValue: enabled },
    blocked: { booleanValue: false },
    role: { stringValue: 'user' },
  });
  await adminPatch(`portfolios/${uid}`, { seededFor: { stringValue: 'RT-TRANSITION' } });

  await reg(false); // registry says blocked
  const denied = await userCall(token, 'GET', `portfolios/${uid}`);
  assert.equal(denied.status, 403, `unauthorized-registry read must be denied, got ${denied.status}`);

  await reg(true); // authorized → REAL on next resolution
  const allowed = await userCall(token, 'GET', `portfolios/${uid}`);
  assert.equal(allowed.status, 200, `authorized read must pass, got ${allowed.status}`);

  await reg(false); // revoked → denied again, same token (rules re-read registry)
  const revoked = await userCall(token, 'GET', `portfolios/${uid}`);
  assert.equal(revoked.status, 403, `revoked read must be denied, got ${revoked.status}`);
});
