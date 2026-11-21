'use strict';

const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { before, test } = require('node:test');

const PROJECT = 'demo-sm18937-qa-preview';
const AUTH = 'http://127.0.0.1:19100';
const FIRESTORE = `http://127.0.0.1:19101/v1/projects/${PROJECT}/databases/(default)/documents`;
const API_KEY = 'demo-api-key';
const QA_C = { uid: 'n7tXL6RHXpNqxwkJexTK1gYN6ey1', email: 'qa-c-sm189-37@exemplo-invalido.test' };
const QA_D = { uid: 'jjouXVMgibeQl0gXY0IHU8JQnFL2', email: 'qa-d-sm189-37@exemplo-invalido.test' };

async function request(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(8000) });
}

async function createQaIdentity(account) {
  const password = randomBytes(32).toString('base64url');
  const create = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts`, {
    method: 'POST',
    headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({ localId: account.uid, email: account.email, password, emailVerified: false })
  });
  assert.equal(create.ok, true, `Auth emulator user creation returned HTTP ${create.status}`);
  const login = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: account.email, password, returnSecureToken: true })
  });
  assert.equal(login.ok, true, `Auth emulator login returned HTTP ${login.status}`);
  return (await login.json()).idToken;
}

async function deleteQaIdentity(idToken) {
  return request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken })
  });
}

async function firestore(path, token, method = 'GET') {
  return request(`${FIRESTORE}/${path}${method === 'PATCH' ? '?updateMask.fieldPaths=syntheticFixture' : ''}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'content-type': 'application/json'
    },
    ...(method === 'PATCH' ? {
      body: JSON.stringify({ fields: { syntheticFixture: { stringValue: 'sm18937-qa-rules-emulator' } } })
    } : {})
  });
}

let tokenC;
let tokenD;

before(async () => {
  tokenC = await createQaIdentity({ uid: QA_C.uid, email: 'qa-c-mismatch-sm189-37@exemplo-invalido.test' });
  tokenD = await createQaIdentity(QA_D);
});

test('an allowlisted UID with a different email is denied', async () => {
  assert.equal((await firestore(`portfolios/${QA_C.uid}`, tokenC)).status, 403);
  assert.equal((await firestore(`users/${QA_C.uid}`, tokenC, 'PATCH')).status, 403);
  const removed = await deleteQaIdentity(tokenC);
  assert.equal(removed.ok, true, `Auth emulator synthetic-user deletion returned HTTP ${removed.status}`);
  tokenC = await createQaIdentity(QA_C);
});

test('qa-c and qa-d can read and write only their own portfolio and user documents', async () => {
  for (const [account, token] of [[QA_C, tokenC], [QA_D, tokenD]]) {
    for (const collection of ['portfolios', 'users']) {
      const ownWrite = await firestore(`${collection}/${account.uid}`, token, 'PATCH');
      assert.equal(ownWrite.status, 200, `${account.email} own ${collection} write`);
      const ownRead = await firestore(`${collection}/${account.uid}`, token);
      assert.equal(ownRead.status, 200, `${account.email} own ${collection} read`);
    }
  }
});

test('qa-c and qa-d cannot read or write one another’s documents', async () => {
  for (const [collection, token, foreignUid] of [
    ['portfolios', tokenC, QA_D.uid], ['users', tokenC, QA_D.uid],
    ['portfolios', tokenD, QA_C.uid], ['users', tokenD, QA_C.uid]
  ]) {
    assert.equal((await firestore(`${collection}/${foreignUid}`, token)).status, 403);
    assert.equal((await firestore(`${collection}/${foreignUid}`, token, 'PATCH')).status, 403);
  }
});

test('qa-c and qa-d cannot read or alter admin metadata; anonymous access is denied', async () => {
  for (const token of [tokenC, tokenD]) {
    assert.equal((await firestore('meta/access', token)).status, 403);
    assert.equal((await firestore('meta/access', token, 'PATCH')).status, 403);
  }
  assert.equal((await firestore(`portfolios/${QA_C.uid}`, null)).status, 403);
  assert.equal((await firestore('meta/access', null)).status, 403);
});

test('non-allowlisted authenticated users cannot access even their own financial documents', async () => {
  const outsiderEmail = 'qa-outsider-sm189-37@exemplo-invalido.test';
  const password = randomBytes(32).toString('base64url');
  const signup = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: outsiderEmail, password, returnSecureToken: true })
  });
  assert.equal(signup.ok, true, `Auth emulator outsider signup returned HTTP ${signup.status}`);
  const outsider = await signup.json();
  assert.equal((await firestore(`portfolios/${outsider.localId}`, outsider.idToken, 'PATCH')).status, 403);
  assert.equal((await firestore(`portfolios/${QA_C.uid}`, outsider.idToken)).status, 403);
});
