'use strict';

const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { before, test } = require('node:test');

const PROJECT = 'demo-sm18937-qa-preview';
const AUTH = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:19100'}`;
const FIRESTORE = `http://${process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:19101'}/v1/projects/${PROJECT}/databases/(default)/documents`;
const API_KEY = 'demo-api-key';
const QA_C = { uid: 'n7tXL6RHXpNqxwkJexTK1gYN6ey1', email: 'qa-c-sm189-37@exemplo-invalido.test' };
const QA_D = { uid: 'jjouXVMgibeQl0gXY0IHU8JQnFL2', email: 'qa-d-sm189-37@exemplo-invalido.test' };
const GOOGLE_QA = { uid: 'dtl8Ufm8s0PB1Cbu51oYMhoUt752', email: 'psmarquesdossantos@gmail.com', emailVerified: true };
const QA_ADMIN = { uid: 'SEE358lc3MdU192l9qRuhBekFNa2', email: 'paulinhoo2002@gmail.com', emailVerified: true };
const QA_ADMIN_WRONG_UID = { uid: 'qa-admin-wrong-uid', email: QA_ADMIN.email, emailVerified: true };
const QA_ADMIN_WRONG_EMAIL = { ...QA_ADMIN, email: 'other-admin@example.invalid' };
const QA_ADMIN_UNVERIFIED = { ...QA_ADMIN, emailVerified: false };

async function request(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(8000) });
}

async function createQaIdentity(account) {
  const password = randomBytes(32).toString('base64url');
  const create = await request(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts`, {
    method: 'POST',
    headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({ localId: account.uid, email: account.email, password, emailVerified: account.emailVerified === true })
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

function portfolioFields() {
  return {
    wallets: { arrayValue: { values: [] } },
    activeWalletId: { stringValue: 'main' },
    assets: { arrayValue: { values: [] } },
    aportes: { arrayValue: { values: [] } },
    proventos: { arrayValue: { values: [] } },
    rfEvents: { arrayValue: { values: [] } },
    divGoal: { integerValue: '0' },
    goals: { mapValue: { fields: {} } },
    learnMeta: { mapValue: { fields: {} } },
    dashboard: { mapValue: { fields: { period: { integerValue: '12' }, type: { stringValue: 'all' } } } },
    rentabilidade: { mapValue: { fields: { period: { stringValue: 'all' }, type: { stringValue: 'all' }, bench: { stringValue: 'CDI' } } } },
    tab: { stringValue: 'dashboard' },
    updatedAtLocal: { stringValue: new Date().toISOString() },
    updatedAt: { timestampValue: new Date().toISOString() }
  };
}

function portfolioMergeMaskPaths(fields) {
  return Object.keys(fields).flatMap((field) => {
    if (field === 'dashboard') return ['dashboard.period', 'dashboard.type'];
    if (field === 'rentabilidade') return ['rentabilidade.period', 'rentabilidade.type', 'rentabilidade.bench'];
    return [field];
  });
}

function userFields(email = 'qa-sm18937@example.invalid') {
  return {
    email: { stringValue: email },
    displayName: { stringValue: 'QA Synthetic' },
    photoURL: { stringValue: '' },
    allowed: { booleanValue: true },
    lastSeen: { timestampValue: new Date().toISOString() },
    lastSeenLocal: { stringValue: new Date().toISOString() },
    loginCount: { integerValue: '1' },
    lastReason: { stringValue: 'qa-emulator' },
    updatedAt: { timestampValue: new Date().toISOString() }
  };
}

function qaUserFields(email = 'qa-sm18937@example.invalid') {
  return {
    email: { stringValue: email },
    displayName: { stringValue: 'QA Synthetic' },
    photoURL: { stringValue: '' }
  };
}

async function firestore(path, token, method = 'GET', fields = null, maskPaths = null) {
  const url = new URL(`${FIRESTORE}/${path}`);
  const payload = fields || (path.startsWith('portfolios/') ? portfolioFields() : qaUserFields());
  if (method === 'PATCH') {
    for (const field of maskPaths || Object.keys(payload)) url.searchParams.append('updateMask.fieldPaths', field);
  }
  return request(url, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'content-type': 'application/json'
    },
    ...(method === 'PATCH' ? {
      body: JSON.stringify({ fields: payload })
    } : {})
  });
}

async function firestoreServerTimestamp(path, token, fields) {
  const fieldPaths = Object.keys(fields);
  return request(`${FIRESTORE}:commit`, {
    method: 'POST',
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      writes: [{
        update: {
          name: `projects/${PROJECT}/databases/(default)/documents/${path}`,
          fields
        },
        updateMask: { fieldPaths },
        updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }]
      }]
    })
  });
}

async function adminPatch(path, fields) {
  return request(`${FIRESTORE}/${path}`, {
    method: 'PATCH',
    headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({ fields })
  });
}

let tokenC;
let tokenD;
let tokenGoogleQa;
let tokenAdmin;

before(async () => {
  tokenC = await createQaIdentity({ uid: QA_C.uid, email: 'qa-c-mismatch-sm189-37@exemplo-invalido.test' });
  tokenD = await createQaIdentity(QA_D);
  tokenGoogleQa = await createQaIdentity({ ...GOOGLE_QA, emailVerified: false });
});

test('an allowlisted UID with a different email is denied', async () => {
  assert.equal((await firestore(`portfolios/${QA_C.uid}`, tokenC)).status, 403);
  assert.equal((await firestore(`users/${QA_C.uid}`, tokenC, 'PATCH')).status, 403);
  const removed = await deleteQaIdentity(tokenC);
  assert.equal(removed.ok, true, `Auth emulator synthetic-user deletion returned HTTP ${removed.status}`);
  tokenC = await createQaIdentity(QA_C);
});

test('portfolio create and update reject malformed types, unknown fields, and non-finite values', async () => {
  const path = `portfolios/${QA_D.uid}`;
  const malformedCreate = { assets: { stringValue: 'not-an-array' } };
  assert.equal((await firestore(path, tokenD, 'PATCH', malformedCreate)).status, 403);

  const unknownCreate = { ...portfolioFields(), injected: { booleanValue: true } };
  assert.equal((await firestore(path, tokenD, 'PATCH', unknownCreate)).status, 403);
  const unknownNestedCreate = {
    ...portfolioFields(),
    dashboard: { mapValue: { fields: {
      period: { integerValue: '12' },
      type: { stringValue: 'all' },
      injected: { booleanValue: true }
    } } }
  };
  assert.equal((await firestore(path, tokenD, 'PATCH', unknownNestedCreate)).status, 403);
  assert.equal((await firestore(path, tokenD, 'PATCH', portfolioFields())).status, 200);
  const serverTimestampFields = portfolioFields();
  delete serverTimestampFields.updatedAt;
  assert.equal((await firestoreServerTimestamp(path, tokenD, serverTimestampFields)).status, 200);
  const savedPortfolio = await firestore(path, tokenD);
  assert.equal(savedPortfolio.status, 200);
  assert.ok((await savedPortfolio.json()).fields.updatedAt.timestampValue);

  assert.equal((await firestore(path, tokenD, 'PATCH', { assets: { stringValue: 'corrupt' } })).status, 403);
  assert.equal((await firestore(path, tokenD, 'PATCH', { injected: { booleanValue: true } })).status, 403);
  assert.equal((await firestore(path, tokenD, 'PATCH', { divGoal: { doubleValue: 'Infinity' } })).status, 403);
  assert.equal((await firestore(path, tokenD, 'PATCH', { divGoal: { doubleValue: 'NaN' } })).status, 403);
  assert.equal((await firestore(path, tokenD, 'PATCH', { updatedAt: { stringValue: 'not-a-timestamp' } })).status, 403);
  assert.equal((await firestore(path, tokenD, 'PATCH', { updatedAt: { timestampValue: new Date().toISOString() } })).status, 200);
  assert.equal((await firestore(path, tokenD, 'PATCH', {
    updatedAtLocal: { stringValue: 'x'.repeat(65) }
  })).status, 403);
  assert.equal((await firestore(path, tokenD, 'PATCH', {
    assets: { arrayValue: { values: Array.from({ length: 10001 }, () => ({ nullValue: 'NULL_VALUE' })) } }
  })).status, 403);
  assert.equal((await firestore(path, tokenD, 'PATCH', {
    dashboard: { mapValue: { fields: { period: { stringValue: '12' } } } }
  })).status, 403);
  assert.equal((await firestore(path, tokenD, 'PATCH', { activeWalletId: { stringValue: 'qa-wallet' } })).status, 200);
  assert.equal((await firestore(path, tokenD, 'PATCH', {}, ['dashboard'])).status, 200);
  assert.equal((await firestore(path, tokenD, 'PATCH', {
    rentabilidade: { mapValue: { fields: { period: { stringValue: 'all' }, type: { stringValue: 'all' }, bench: { stringValue: 'CDI' } } } }
  }, ['rentabilidade.period', 'rentabilidade.type', 'rentabilidade.bench'])).status, 200);
  assert.equal((await firestore(path, tokenD, 'PATCH', {}, ['rentabilidade'])).status, 200);
});

test('legacy portfolio fields survive valid updates and cannot be changed by clients', async () => {
  const path = `portfolios/${QA_C.uid}`;
  const seed = { ...portfolioFields(), legacyFinancialField: { stringValue: 'preserve-existing' } };
  seed.dashboard.mapValue.fields.legacySelection = { stringValue: 'preserve-dashboard' };
  seed.rentabilidade.mapValue.fields.legacyPresentation = { stringValue: 'preserve-rentabilidade' };
  assert.equal((await adminPatch(path, seed)).status, 200);

  assert.equal((await firestore(path, tokenC, 'PATCH', { activeWalletId: { stringValue: 'qa-wallet' } })).status, 200);
  assert.equal((await firestore(path, tokenC, 'PATCH', {
    dashboard: { mapValue: { fields: { period: { integerValue: '6' } } } }
  }, ['dashboard.period'])).status, 200);
  assert.equal((await firestore(path, tokenC, 'PATCH', {
    rentabilidade: { mapValue: { fields: { period: { stringValue: '12m' } } } }
  }, ['rentabilidade.period'])).status, 200);
  const read = await firestore(path, tokenC);
  assert.equal(read.status, 200);
  const document = await read.json();
  assert.equal(document.fields.legacyFinancialField.stringValue, 'preserve-existing');
  assert.equal(document.fields.activeWalletId.stringValue, 'qa-wallet');
  assert.equal(document.fields.dashboard.mapValue.fields.period.integerValue, '6');
  assert.equal(document.fields.dashboard.mapValue.fields.legacySelection.stringValue, 'preserve-dashboard');
  assert.equal(document.fields.rentabilidade.mapValue.fields.legacyPresentation.stringValue, 'preserve-rentabilidade');

  assert.equal((await firestore(path, tokenC, 'PATCH', {
    legacyFinancialField: { stringValue: 'overwritten' }
  })).status, 403);
  assert.equal((await firestore(path, tokenC, 'PATCH', {
    dashboard: { mapValue: { fields: { legacySelection: { stringValue: 'overwritten' } } } }
  }, ['dashboard.legacySelection'])).status, 403);
  assert.equal((await firestore(path, tokenC, 'PATCH', {}, ['dashboard'])).status, 403);
  assert.equal((await firestore(path, tokenC, 'PATCH', {}, ['rentabilidade'])).status, 403);
  const afterDeniedWrite = await firestore(path, tokenC);
  assert.equal(afterDeniedWrite.status, 200);
  assert.equal((await afterDeniedWrite.json()).fields.legacyFinancialField.stringValue, 'preserve-existing');
});

test('user profile create and update reject wrong field types and unknown fields', async () => {
  const path = `users/${QA_D.uid}`;
  assert.equal((await firestore(path, tokenD, 'PATCH', userFields(QA_D.email))).status, 403);
  assert.equal((await firestore(path, tokenD, 'PATCH', qaUserFields(QA_D.email))).status, 200);
  assert.equal((await firestore(path, tokenD, 'PATCH', qaUserFields(QA_C.email))).status, 403);
  assert.equal((await firestore(path, tokenD, 'PATCH', { allowed: { booleanValue: true } })).status, 403);
  assert.equal((await firestore(path, tokenD, 'PATCH', { loginCount: { integerValue: '2' } })).status, 403);
  assert.equal((await firestore(path, tokenD, 'PATCH', { displayName: { integerValue: '2' } })).status, 403);
  assert.equal((await firestore(path, tokenD, 'PATCH', { injected: { booleanValue: true } })).status, 403);
  assert.equal((await firestore(`users/${QA_C.uid}`, tokenC, 'PATCH', {
    displayName: { stringValue: 'Missing email profile' }
  }, ['displayName'])).status, 403);
  assert.equal((await firestore(path, tokenD, 'PATCH', {}, ['email'])).status, 403);
  assert.equal((await firestore(path, tokenD, 'PATCH', { displayName: { stringValue: 'QA Update' } })).status, 200);
});

test('only the exact verified QA admin can write admin metadata; QA profiles cannot delete audit records', async () => {
  tokenAdmin = await createQaIdentity(QA_ADMIN_WRONG_UID);
  assert.equal((await firestore('meta/access', tokenAdmin)).status, 403);
  assert.equal((await firestore(`users/${QA_ADMIN.uid}`, tokenAdmin, 'DELETE')).status, 403);
  assert.equal((await deleteQaIdentity(tokenAdmin)).status, 200);
  tokenAdmin = await createQaIdentity(QA_ADMIN_WRONG_EMAIL);
  assert.equal((await firestore('meta/access', tokenAdmin)).status, 403);
  assert.equal((await deleteQaIdentity(tokenAdmin)).status, 200);
  tokenAdmin = await createQaIdentity(QA_ADMIN_UNVERIFIED);
  assert.equal((await firestore('meta/access', tokenAdmin)).status, 403);
  assert.equal((await deleteQaIdentity(tokenAdmin)).status, 200);
  tokenAdmin = await createQaIdentity(QA_ADMIN);
  assert.equal((await firestore('meta/access', tokenAdmin, 'PATCH', {
    syntheticFixture: { stringValue: 'emulator-only' }
  })).status, 200);
  assert.equal((await firestore('meta/access', tokenAdmin)).status, 200);
  assert.equal((await firestore(`users/${QA_ADMIN.uid}`, tokenAdmin, 'PATCH', userFields(QA_ADMIN.email))).status, 200);
  assert.equal((await firestore(`users/${QA_ADMIN.uid}`, tokenAdmin, 'DELETE')).status, 200);
  assert.equal((await firestore(`users/${QA_D.uid}`, tokenD, 'DELETE')).status, 403);
  assert.equal((await firestore(`portfolios/${QA_D.uid}`, tokenD, 'DELETE')).status, 200);
});

test('qa-c and qa-d can read and write only their own portfolio and user documents', async () => {
  for (const [account, token] of [[QA_C, tokenC], [QA_D, tokenD]]) {
    for (const collection of ['portfolios', 'users']) {
      const fields = collection === 'users' ? qaUserFields(account.email) : portfolioFields();
      const masks = collection === 'users' ? Object.keys(fields) : portfolioMergeMaskPaths(fields);
      const ownWrite = await firestore(`${collection}/${account.uid}`, token, 'PATCH', fields, masks);
      assert.equal(ownWrite.status, 200, `${account.email} own ${collection} write`);
      const ownRead = await firestore(`${collection}/${account.uid}`, token);
      assert.equal(ownRead.status, 200, `${account.email} own ${collection} read`);
    }
  }
});

test('Google QA identity requires the exact verified UID/email and then accesses only its own documents', async () => {
  assert.equal((await firestore(`portfolios/${GOOGLE_QA.uid}`, tokenGoogleQa, 'PATCH')).status, 403);
  const removed = await deleteQaIdentity(tokenGoogleQa);
  assert.equal(removed.ok, true, `Firebase Emulator synthetic-user deletion returned HTTP ${removed.status}`);
  tokenGoogleQa = await createQaIdentity(GOOGLE_QA);
  for (const collection of ['portfolios', 'users']) {
    const fields = collection === 'users' ? qaUserFields(GOOGLE_QA.email) : portfolioFields();
    assert.equal((await firestore(`${collection}/${GOOGLE_QA.uid}`, tokenGoogleQa, 'PATCH', fields)).status, 200);
    assert.equal((await firestore(`${collection}/${GOOGLE_QA.uid}`, tokenGoogleQa)).status, 200);
  }
  assert.equal((await firestore(`portfolios/${QA_C.uid}`, tokenGoogleQa)).status, 403);
  assert.equal((await firestore('meta/access', tokenGoogleQa)).status, 403);
});

test('QA identities cannot read or write one another’s documents', async () => {
  const identities = [
    [QA_C, tokenC], [QA_D, tokenD], [GOOGLE_QA, tokenGoogleQa]
  ];
  for (const [account, token] of identities) {
    for (const [foreignAccount] of identities.filter(([candidate]) => candidate.uid !== account.uid)) {
      for (const collection of ['portfolios', 'users']) {
        const fields = collection === 'users' ? qaUserFields(account.email) : portfolioFields();
        const masks = collection === 'users' ? Object.keys(fields) : portfolioMergeMaskPaths(fields);
        assert.equal((await firestore(`${collection}/${foreignAccount.uid}`, token)).status, 403);
        assert.equal((await firestore(`${collection}/${foreignAccount.uid}`, token, 'PATCH', fields, masks)).status, 403);
        assert.equal((await firestore(`${collection}/${foreignAccount.uid}`, token, 'DELETE')).status, 403);
      }
    }
  }
});

test('QA identities cannot read or alter admin metadata; anonymous access is denied', async () => {
  for (const token of [tokenC, tokenD, tokenGoogleQa]) {
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
