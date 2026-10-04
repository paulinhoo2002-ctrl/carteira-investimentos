'use strict';

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { before, test } = require('node:test');

const PROJECT = 'demo-carteira-qa-emulator';
const AUTH_EMULATOR = 'http://127.0.0.1:9099';
const FIRESTORE_EMULATOR = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;

async function request(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(8000) });
}

before(async () => {
  const response = await request(`${FIRESTORE_EMULATOR.split('/documents')[0]}/documents:commit`, {
    method: 'POST',
    headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({ writes: [{ update: {
      name: `projects/${PROJECT}/databases/(default)/documents/meta/access`,
      fields: {
        enabled: { booleanValue: true },
        allowedEmails: { arrayValue: { values: [{ stringValue: 'qa.synthetic@example.invalid' }] } },
        blockedEmails: { arrayValue: { values: [] } },
        allowedDomains: { arrayValue: { values: [] } },
      },
    } }] }),
  });
  assert.equal(response.ok, true, `Firestore emulator seed failed with HTTP ${response.status}`);
});

async function createSyntheticIdentity() {
  const email = `qa-${randomUUID()}@example.invalid`;
  const response = await request(`${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: `ephemeral-${randomUUID()}`, returnSecureToken: true }),
  });
  assert.equal(response.ok, true, `Auth emulator signup returned HTTP ${response.status}`);
  const identity = await response.json();
  assert.equal(identity.email, email);
  assert.ok(identity.localId);
  assert.ok(identity.idToken);
  return { ...identity, email };
}

test('V311: demo Auth identity can read synthetic access policy but cannot write it or portfolio data', async () => {
  const identity = await createSyntheticIdentity();
  const headers = { authorization: `Bearer ${identity.idToken}`, 'content-type': 'application/json' };

  const accessRead = await request(`${FIRESTORE_EMULATOR}/meta/access`, { headers });
  assert.equal(accessRead.ok, true, `Synthetic identity cannot read QA access policy: HTTP ${accessRead.status}`);
  const accessDoc = await accessRead.json();
  assert.deepEqual(accessDoc.fields.allowedEmails.arrayValue.values.map(value => value.stringValue), ['qa.synthetic@example.invalid']);

  const accessWrite = await request(`${FIRESTORE_EMULATOR}/meta/access?updateMask.fieldPaths=enabled`, {
    method: 'PATCH', headers, body: JSON.stringify({ fields: { enabled: { booleanValue: false } } }),
  });
  assert.equal(accessWrite.status, 403, 'Synthetic identity cannot alter access authority');

  const portfolioWrite = await request(`${FIRESTORE_EMULATOR}/portfolios/${identity.localId}`, {
    method: 'PATCH', headers, body: JSON.stringify({ fields: { synthetic: { booleanValue: true } } }),
  });
  assert.equal(portfolioWrite.status, 403, 'QA rules reject portfolio/financial writes');
});

test('V311: unauthenticated access policy read is denied by emulator rules', async () => {
  const response = await request(`${FIRESTORE_EMULATOR}/meta/access`);
  assert.equal(response.status, 403);
});
