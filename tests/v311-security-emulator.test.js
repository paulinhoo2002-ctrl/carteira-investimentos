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

test('V311: demo Auth identity can read own synthetic data but cannot write access or financial data', async () => {
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

  const userWrite = await request(`${FIRESTORE_EMULATOR}/users/${identity.localId}`, {
    method: 'PATCH', headers, body: JSON.stringify({ fields: { synthetic: { booleanValue: true } } }),
  });
  assert.equal(userWrite.status, 403, 'QA rules reject writes to the user document that contains wallet state');

  const portfolioWrite = await request(`${FIRESTORE_EMULATOR}/portfolios/${identity.localId}`, {
    method: 'PATCH', headers, body: JSON.stringify({ fields: { synthetic: { booleanValue: true } } }),
  });
  assert.equal(portfolioWrite.status, 403, 'QA rules reject portfolio/financial writes');
});

test('V311: unauthenticated access policy read is denied by emulator rules', async () => {
  const response = await request(`${FIRESTORE_EMULATOR}/meta/access`);
  assert.equal(response.status, 403);
});

test('V1651: shared backup operation identity is immutable and isolated by authenticated UID', async () => {
  const owner = await createSyntheticIdentity();
  const other = await createSyntheticIdentity();
  const operationId = 'a'.repeat(64);
  const ownerHeaders = { authorization: `Bearer ${owner.idToken}`, 'content-type': 'application/json' };
  const otherHeaders = { authorization: `Bearer ${other.idToken}`, 'content-type': 'application/json' };
  const operationPath = uid => `${FIRESTORE_EMULATOR}/users/${uid}/driveBackupOperations/${operationId}`;
  const create = await request(`${FIRESTORE_EMULATOR}/users/${owner.localId}/driveBackupOperations?documentId=${operationId}`, {
    method: 'POST', headers: ownerHeaders,
    body: JSON.stringify({ fields: { fileId: { stringValue: 'synthetic-drive-file-a' }, contentSha256: { stringValue: 'b'.repeat(64) } } }),
  });
  assert.equal(create.ok, true, `Owner could not reserve synthetic backup identity: HTTP ${create.status}`);

  const ownerRead = await request(operationPath(owner.localId), { headers: ownerHeaders });
  assert.equal(ownerRead.ok, true, 'Owner can read its operation identity');
  const crossRead = await request(operationPath(owner.localId), { headers: otherHeaders });
  assert.equal(crossRead.status, 403, 'Another authenticated user cannot read the identity');
  const crossCreate = await request(`${FIRESTORE_EMULATOR}/users/${owner.localId}/driveBackupOperations?documentId=${'c'.repeat(64)}`, {
    method: 'POST', headers: otherHeaders,
    body: JSON.stringify({ fields: { fileId: { stringValue: 'synthetic-drive-file-b' }, contentSha256: { stringValue: 'd'.repeat(64) } } }),
  });
  assert.equal(crossCreate.status, 403, 'Another user cannot reserve under the owner path');
  const update = await request(`${operationPath(owner.localId)}?updateMask.fieldPaths=fileId`, {
    method: 'PATCH', headers: ownerHeaders,
    body: JSON.stringify({ fields: { fileId: { stringValue: 'synthetic-drive-file-replaced' }, contentSha256: { stringValue: 'b'.repeat(64) } } }),
  });
  assert.equal(update.status, 403, 'Owner cannot rewrite a reserved mapping');
  const list = await request(`${FIRESTORE_EMULATOR}/users/${owner.localId}/driveBackupOperations`, { headers: ownerHeaders });
  assert.equal(list.status, 403, 'Operation identities cannot be listed');
  const deletion = await request(operationPath(owner.localId), { method: 'DELETE', headers: ownerHeaders });
  assert.equal(deletion.status, 403, 'Owner cannot delete a reserved identity');
  const malformed = await request(`${FIRESTORE_EMULATOR}/users/${owner.localId}/driveBackupOperations?documentId=${'e'.repeat(64)}`, {
    method: 'POST', headers: ownerHeaders,
    body: JSON.stringify({ fields: { fileId: { stringValue: 'synthetic-id' }, contentSha256: { stringValue: 'short' }, token: { stringValue: 'must-not-be-stored' } } }),
  });
  assert.equal(malformed.status, 403, 'Unexpected fields and malformed content digest are rejected');
  const malformedId = await request(`${FIRESTORE_EMULATOR}/users/${owner.localId}/driveBackupOperations?documentId=not-a-hash`, {
    method: 'POST', headers: ownerHeaders,
    body: JSON.stringify({ fields: { fileId: { stringValue: 'synthetic-drive-file-c' }, contentSha256: { stringValue: 'f'.repeat(64) } } }),
  });
  assert.equal(malformedId.status, 403, 'Operation document IDs must be canonical SHA-256 hashes');
});
