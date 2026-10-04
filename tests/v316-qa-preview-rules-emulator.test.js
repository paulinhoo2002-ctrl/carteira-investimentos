'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');

const project = 'demo-carteira-qa-emulator';
const auth = 'http://127.0.0.1:9099';
const db = `http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents`;
const approvedEmail = 'qa.preview@example.invalid';

async function post(url, body, token) {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body), signal: AbortSignal.timeout(8000),
  });
}

async function identity(email) {
  const key = 'demo-api-key';
  const password = 'synthetic-qa-password';
  const created = await post(`${auth}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${key}`,
    { email, password, returnSecureToken: true });
  assert.equal(created.ok, true, `Auth emulator signup HTTP ${created.status}`);
  const account = await created.json();
  const sent = await post(`${auth}/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${key}`,
    { requestType: 'VERIFY_EMAIL', idToken: account.idToken });
  assert.equal(sent.ok, true, `Auth emulator verification HTTP ${sent.status}`);
  const codes = await (await fetch(`${auth}/emulator/v1/projects/${project}/oobCodes`)).json();
  const code = codes.oobCodes.find(item => item.email === email && item.requestType === 'VERIFY_EMAIL');
  assert.ok(code?.oobCode, 'Synthetic verification code is available only in emulator');
  const verified = await post(`${auth}/identitytoolkit.googleapis.com/v1/accounts:update?key=${key}`,
    { oobCode: code.oobCode });
  assert.equal(verified.ok, true, `Auth emulator verify HTTP ${verified.status}`);
  const signed = await post(`${auth}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`,
    { email, password, returnSecureToken: true });
  assert.equal(signed.ok, true, `Auth emulator signin HTTP ${signed.status}`);
  return signed.json();
}

test('V316 QA rules allow only verified listed identity to read access and own empty portfolio', async () => {
  const seed = await post(`${db.split('/documents')[0]}/documents:commit`, { writes: [{ update: {
    name: `projects/${project}/databases/(default)/documents/meta/access`,
    fields: {
      enabled: { booleanValue: true },
      allowedEmails: { arrayValue: { values: [{ stringValue: approvedEmail }] } },
    },
  } }] }, 'owner');
  assert.equal(seed.ok, true, `Firestore emulator seed HTTP ${seed.status}`);

  const approved = await identity(approvedEmail);
  const denied = await identity('qa.denied@example.invalid');
  const read = (path, token) => fetch(`${db}/${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(8000),
  });
  assert.equal((await read('meta/access', approved.idToken)).status, 200);
  assert.equal((await read('meta/access', denied.idToken)).status, 403);
  assert.equal((await read('meta/access')).status, 403);
  assert.equal((await read(`portfolios/${approved.localId}`, approved.idToken)).status, 404);
  assert.equal((await read(`portfolios/${approved.localId}`, denied.idToken)).status, 403);

  for (const path of ['meta/access', `portfolios/${approved.localId}`, `users/${approved.localId}`]) {
    const write = await fetch(`${db}/${path}`, {
      method: 'PATCH', headers: { authorization: `Bearer ${approved.idToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ fields: { synthetic: { booleanValue: true } } }),
      signal: AbortSignal.timeout(8000),
    });
    assert.equal(write.status, 403, `QA writes denied for ${path}`);
  }
});
