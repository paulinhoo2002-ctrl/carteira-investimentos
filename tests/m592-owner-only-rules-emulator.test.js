'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { before, test } = require('node:test');

const PROJECT = 'demo-owner-only-rules';
const AUTH = 'http://127.0.0.1:19099';
const DOCUMENTS_RESOURCE = `projects/${PROJECT}/databases/(default)/documents`;
const DOCS = `http://127.0.0.1:19080/v1/${DOCUMENTS_RESOURCE}`;
const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8').replace(/\r\n/g, '\n');
const rulesSha256 = createHash('sha256').update(rules).digest('hex');
const EXPECTED_RULES_SHA256 = 'e12421433d543344c843434862a21293f79cd71e1245d33bfc9b29374a93602b';
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

function syntheticCustomToken(uid) {
  const now = Math.floor(Date.now() / 1000);
  const serviceAccount = 'firebase-auth-emulator@example.com';
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({
    iss: serviceAccount,
    sub: serviceAccount,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat: now,
    exp: now + 3600,
    uid,
  })}.`;
}

async function exchangeCustomToken(uid) {
  const response = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: syntheticCustomToken(uid), returnSecureToken: true }),
  });
  assert.equal(response.ok, true, `Auth Emulator custom-token sign-in failed: HTTP ${response.status}`);
  const session = await response.json();
  const authErrorCode = String(session.error?.message || session.error?.status || '').match(/[A-Z0-9_]+/)?.[0] || 'none';
  assert.ok(session.idToken, `Auth Emulator response lacks an ID token (fields=${Object.keys(session).sort().join(',')}; error=${authErrorCode})`);
  return session;
}

async function lookupSyntheticUser(session) {
  const lookupResponse = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:lookup?key=demo-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken: session.idToken }),
  });
  assert.equal(lookupResponse.ok, true, 'Auth Emulator must resolve the synthetic ID token');
  const lookup = await lookupResponse.json();
  assert.ok(lookup.users?.[0]?.localId, 'Auth Emulator lookup must return the synthetic user identity');
  return lookup.users[0];
}

async function setSyntheticEmail(uid, email) {
  const session = await exchangeCustomToken(uid);
  const updateResponse = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken: session.idToken, email, returnSecureToken: true }),
  });
  assert.equal(updateResponse.ok, true, 'Auth Emulator must set the synthetic email');
  return exchangeCustomToken(uid);
}

async function verifySyntheticEmail(session, email) {
  const sendCodeResponse = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=demo-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken: session.idToken }),
  });
  assert.equal(sendCodeResponse.ok, true, 'Auth Emulator must issue a synthetic email verification code');
  const codesResponse = await request(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`);
  assert.equal(codesResponse.ok, true, 'Auth Emulator must expose its synthetic verification code');
  const { oobCodes = [] } = await codesResponse.json();
  const verificationCode = oobCodes.filter(code => code.email === email && code.requestType === 'VERIFY_EMAIL').at(-1)?.oobCode;
  assert.ok(verificationCode, 'Auth Emulator must retain the synthetic email verification code');
  const verifyResponse = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ oobCode: verificationCode, returnSecureToken: true }),
  });
  assert.equal(verifyResponse.ok, true, 'Auth Emulator must verify the synthetic email');
  return exchangeCustomToken((await lookupSyntheticUser(session)).localId);
}

async function signInSynthetic(uid, email, emailVerified) {
  let session = await exchangeCustomToken(uid);
  let user = await lookupSyntheticUser(session);
  if (user.email && user.email !== email) {
    session = await setSyntheticEmail(uid, `synthetic-${randomUUID()}@example.invalid`);
    user = await lookupSyntheticUser(session);
  }
  if (user.email === email && user.emailVerified && !emailVerified) {
    session = await setSyntheticEmail(uid, `synthetic-${randomUUID()}@example.invalid`);
    user = await lookupSyntheticUser(session);
  }
  if (user.email !== email) {
    session = await setSyntheticEmail(uid, email);
    user = await lookupSyntheticUser(session);
  }
  if (emailVerified && !user.emailVerified) session = await verifySyntheticEmail(session, email);
  user = await lookupSyntheticUser(session);
  assert.equal(user.email, email, 'Auth Emulator must retain the synthetic email');
  assert.equal(user.emailVerified, emailVerified, 'Auth Emulator must retain synthetic email verification');
  return { ...session, localId: user.localId };
}

async function documentRequest(method, document, idToken) {
  const headers = { 'content-type': 'application/json' };
  if (idToken) headers.authorization = `Bearer ${idToken}`;
  const options = { method, headers };
  if (method === 'PATCH') options.body = JSON.stringify({ fields: { synthetic: { booleanValue: true } } });
  return request(`${DOCS}/${document}`, options);
}

async function collectionRequest(collection, idToken) {
  const headers = idToken ? { authorization: `Bearer ${idToken}` } : {};
  return request(`${DOCS}/${collection}?pageSize=1`, { headers });
}

async function queryRequest(collection, documentId, idToken) {
  const headers = { 'content-type': 'application/json' };
  if (idToken) headers.authorization = `Bearer ${idToken}`;
  const structuredQuery = { from: [{ collectionId: collection }] };
  if (documentId) structuredQuery.where = { fieldFilter: {
    field: { fieldPath: '__name__' },
    op: 'EQUAL',
    value: { referenceValue: `${DOCUMENTS_RESOURCE}/${collection}/${documentId}` },
  } };
  return request(`${DOCS}:runQuery`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ structuredQuery }),
  });
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

test('delete is limited to the verified owner on authorized documents', async () => {
  for (const document of [`portfolios/${ownerUid}`, `users/${ownerUid}`, 'meta/access']) {
    for (const identity of [null, ownerUnverified, ownerWrongEmail, sameEmailOtherUid, ordinaryUser]) {
      await expectAccess(identity, 'DELETE', document, false, 'unauthorized delete');
    }
    try {
      await expectAccess(owner, 'DELETE', document, true, 'verified owner delete');
    } finally {
      await expectAccess(owner, 'PATCH', document, true, 'restore synthetic seed');
    }
  }
  for (const document of [`portfolios/${otherUid}`, `users/${otherUid}`, 'unlisted/private']) {
    await expectAccess(owner, 'DELETE', document, false, 'cross-UID/default-deny delete');
  }
  for (const document of [`portfolios/${otherUid}`, `users/${otherUid}`]) {
    await expectAccess(sameEmailOtherUid, 'DELETE', document, false, 'different UID own-path delete');
  }
  for (const document of [`portfolios/${ordinaryUser.localId}`, `users/${ordinaryUser.localId}`]) {
    await expectAccess(ordinaryUser, 'DELETE', document, false, 'ordinary user own-path delete');
  }
});

test('unbounded collection lists are denied even when only owner documents exist', async () => {
  for (const identity of [null, owner, ownerUnverified, sameEmailOtherUid, ordinaryUser]) {
    for (const collection of ['portfolios', 'users', 'meta', 'unlisted']) {
      const response = await collectionRequest(collection, identity?.idToken);
      assert.equal(response.status, 403, `${collection} list must be denied for every identity`);
    }
  }
});

test('queries must restrict every possible document to the verified owner UID', async () => {
  for (const collection of ['portfolios', 'users']) {
    const allowed = await queryRequest(collection, ownerUid, owner.idToken);
    assert.equal(allowed.status, 200, `${collection} owner-UID query must be allowed`);
    const body = await allowed.text();
    assert.ok(body.includes(`/${collection}/${ownerUid}`), `${collection} query must return the seeded owner document`);
    assert.ok(!body.includes(`/${collection}/${otherUid}`), `${collection} query must not return a cross-UID document`);
    const unbounded = await queryRequest(collection, null, owner.idToken);
    assert.equal(unbounded.status, 403, `${collection} unbounded query must be denied`);
    for (const identity of [null, ownerUnverified, ownerWrongEmail, sameEmailOtherUid, ordinaryUser]) {
      const response = await queryRequest(collection, ownerUid, identity?.idToken);
      assert.equal(response.status, 403, `${collection} owner-UID query must deny unauthorized identity`);
    }
    const crossUid = await queryRequest(collection, otherUid, owner.idToken);
    assert.equal(crossUid.status, 403, `${collection} cross-UID query must be denied`);
  }
  const unknown = await queryRequest('unlisted', 'private', owner.idToken);
  assert.equal(unknown.status, 403, 'unknown collection query must be denied');
});
