'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { before, test } = require('node:test');

const PROJECT = 'demo-owner-only-rules';
const AUTH = 'http://127.0.0.1:19099';
const DOCS = `http://127.0.0.1:19080/v1/projects/${PROJECT}/databases/(default)/documents`;
const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
const rulesSha256 = createHash('sha256').update(rules).digest('hex');
const EXPECTED_RULES_SHA256 = '731a0ed7a1442b0211c91b46ebf18bb270753c5928b1a5a4967ad5974f6d0929';
const emulatorConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'firebase.m592-owner-only-emulator.json'), 'utf8'));
const ownerUid = rules.match(/request\.auth\.uid == "([^"]+)"/)?.[1];
const ownerEmail = rules.match(/request\.auth\.token\.email == "([^"]+)"/)?.[1];
let owner;
let ownerUnverified;
let ownerWrongEmail;
let sameEmailOtherUid;
let ordinaryUser;
let otherUid;

async function request(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(8000) });
}

function b64url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function syntheticCustomToken(uid, email, emailVerified) {
  const now = Math.floor(Date.now() / 1000);
  const serviceAccount = 'firebase-auth-emulator@example.com';
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({
    iss: serviceAccount,
    sub: serviceAccount,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat: now,
    exp: now + 3600,
    uid,
    claims: { email, email_verified: emailVerified },
  })}.`;
}

async function signInSynthetic(uid, email, emailVerified) {
  const response = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: syntheticCustomToken(uid, email, emailVerified), returnSecureToken: true }),
  });
  assert.equal(response.ok, true, `Auth Emulator custom-token sign-in failed: HTTP ${response.status}`);
  const session = await response.json();
  const authErrorCode = String(session.error?.message || session.error?.status || '').match(/[A-Z0-9_]+/)?.[0] || 'none';
  assert.ok(session.idToken, `Auth Emulator response lacks an ID token (fields=${Object.keys(session).sort().join(',')}; error=${authErrorCode})`);
  const updateResponse = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken: session.idToken, email, emailVerified, returnSecureToken: true }),
  });
  assert.equal(updateResponse.ok, true, 'Auth Emulator must apply synthetic email verification state');
  const updatedSession = await updateResponse.json();
  assert.ok(updatedSession.idToken, 'Auth Emulator account update must return a refreshed ID token');
  const lookupResponse = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:lookup?key=demo-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken: updatedSession.idToken }),
  });
  assert.equal(lookupResponse.ok, true, 'Auth Emulator must resolve the synthetic ID token');
  const lookup = await lookupResponse.json();
  assert.ok(lookup.users?.[0]?.localId, 'Auth Emulator lookup must return the synthetic user identity');
  assert.equal(lookup.users[0].email, email, 'Auth Emulator must retain the synthetic email');
  assert.equal(lookup.users[0].emailVerified, emailVerified, 'Auth Emulator must retain synthetic email verification');
  return { ...updatedSession, localId: lookup.users[0].localId };
}

async function documentRequest(method, document, idToken) {
  const headers = { 'content-type': 'application/json' };
  if (idToken) headers.authorization = `Bearer ${idToken}`;
  const options = { method, headers };
  if (method === 'PATCH') options.body = JSON.stringify({ fields: { synthetic: { booleanValue: true } } });
  return request(`${DOCS}/${document}`, options);
}

async function expectAccess(identity, method, document, allowed, label) {
  const response = await documentRequest(method, document, identity?.idToken);
  assert.equal(response.status, allowed ? 200 : 403, `${label}: ${method} ${document.split('/')[0]} must be ${allowed ? 'allowed' : 'denied'}`);
}

before(async () => {
  assert.equal(emulatorConfig.firestore.rules, 'firestore.rules', 'the emulator must load the exact production rules file');
  assert.ok(ownerUid && ownerEmail, 'the test reads the fixed owner identity from production rules without logging it');
  const configResponse = await request(`${AUTH}/emulator/v1/projects/${PROJECT}/config`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ signIn: { allowDuplicateEmails: true } }),
  });
  assert.equal(configResponse.ok, true, 'Auth Emulator must allow the duplicate-email negative identity fixture');
  otherUid = `synthetic-${randomUUID()}`;
  owner = await signInSynthetic(ownerUid, ownerEmail, true);
  assert.ok(owner.localId === ownerUid, 'the Auth Emulator fixture must match the configured owner identity');
  ownerUnverified = await signInSynthetic(ownerUid, ownerEmail, false);
  ownerWrongEmail = await signInSynthetic(ownerUid, 'not-owner@example.invalid', true);
  sameEmailOtherUid = await signInSynthetic(otherUid, ownerEmail, true);
  ordinaryUser = await signInSynthetic(`synthetic-${randomUUID()}`, `m604-${randomUUID()}@example.invalid`, true);
  for (const document of [`portfolios/${ownerUid}`, `users/${ownerUid}`, 'meta/access']) {
    await expectAccess(owner, 'PATCH', document, true, 'synthetic owner seed');
  }
});

test('the owner-only emulator reads the exact production rules file', () => {
  assert.equal(emulatorConfig.firestore.rules, 'firestore.rules');
  assert.equal(rulesSha256, EXPECTED_RULES_SHA256, 'the emulator candidate rules must match the reviewed SHA-256');
});

test('anonymous reads and writes are denied on financial, user, admin, and unknown paths', async () => {
  for (const document of [`portfolios/${ownerUid}`, `users/${ownerUid}`, 'meta/access', 'unlisted/private']) {
    await expectAccess(null, 'GET', document, false, 'anonymous');
    await expectAccess(null, 'PATCH', document, false, 'anonymous');
  }
});

test('verified fixed owner can read and write only the authorized UID paths and admin metadata', async () => {
  for (const document of [`portfolios/${ownerUid}`, `users/${ownerUid}`, 'meta/access']) {
    await expectAccess(owner, 'GET', document, true, 'verified owner');
    await expectAccess(owner, 'PATCH', document, true, 'verified owner');
  }
});

test('owner UID with unverified email or a different email is denied', async () => {
  for (const identity of [ownerUnverified, ownerWrongEmail]) {
    for (const document of [`portfolios/${ownerUid}`, `users/${ownerUid}`, 'meta/access']) {
      await expectAccess(identity, 'GET', document, false, 'owner identity mismatch');
      await expectAccess(identity, 'PATCH', document, false, 'owner identity mismatch');
    }
  }
});

test('same authorized email with a different UID is denied, including the user own UID', async () => {
  for (const document of [`portfolios/${otherUid}`, `users/${otherUid}`, `portfolios/${ownerUid}`, `users/${ownerUid}`, 'meta/access']) {
    await expectAccess(sameEmailOtherUid, 'GET', document, false, 'different UID');
    await expectAccess(sameEmailOtherUid, 'PATCH', document, false, 'different UID');
  }
});

test('ordinary authenticated users cannot access own, cross-UID, admin, or unknown paths', async () => {
  for (const document of [`portfolios/${ordinaryUser.localId}`, `users/${ordinaryUser.localId}`, `portfolios/${ownerUid}`, `users/${ownerUid}`, 'meta/access', 'unlisted/private']) {
    await expectAccess(ordinaryUser, 'GET', document, false, 'ordinary authenticated user');
    await expectAccess(ordinaryUser, 'PATCH', document, false, 'ordinary authenticated user');
  }
});

test('even the verified owner is denied on another UID and unlisted paths', async () => {
  for (const document of [`portfolios/${otherUid}`, `users/${otherUid}`, 'unlisted/private']) {
    await expectAccess(owner, 'GET', document, false, 'cross-UID/default-deny');
    await expectAccess(owner, 'PATCH', document, false, 'cross-UID/default-deny');
  }
});
