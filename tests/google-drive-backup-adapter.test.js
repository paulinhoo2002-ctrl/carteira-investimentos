'use strict';

const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const test = require('node:test');
const Backup = require('../backup-portability.js');
const { GOOGLE_DRIVE_FILE_SCOPE, createGoogleDriveBackupAdapter, createGoogleDriveTokenProvider, createFirestoreBackupOperationCoordinator } = require('../google-drive-backup.js');

const ownerScope = 'a'.repeat(64);
const otherOwnerScope = 'b'.repeat(64);
const envelope = {
  format: 'carteira-investimentos-backup-encrypted', version: 1,
  kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 310000, salt: 'AAAAAAAAAAAAAAAAAAAAAA==' },
  cipher: { name: 'AES-GCM', iv: 'AAAAAAAAAAAAAAAA' }, ciphertext: 'AAAAAAAAAAAAAAAAAAAAAA=='
};

function response(status, data, headers = {}) {
  return {
    ok: status >= 200 && status < 300, status,
    headers: { get: name => headers[name.toLowerCase()] || null },
    async json() { return data; },
    async text() { return typeof data === 'string' ? data : JSON.stringify(data); }
  };
}

function driveHarness() {
  const files = new Map();
  const sessions = new Map();
  const calls = [];
  let sequence = 0;
  const fetchImpl = async (url, options = {}) => {
    const parsed = new URL(url);
    calls.push({ url: parsed, options });
    const id = parsed.pathname.match(/\/files\/([^/]+)$/)?.[1];
    if (options.method === 'GET' && parsed.pathname.endsWith('/drive/v3/files/generateIds')) {
      return response(200, { ids: [`synthetic-drive-file-${++sequence}`] });
    }
    if (options.method === 'POST' && parsed.pathname.endsWith('/upload/drive/v3/files') && parsed.searchParams.get('uploadType') === 'resumable') {
      const metadata = JSON.parse(options.body);
      if (files.has(metadata.id)) return response(409, {});
      const sessionId = `synthetic-session-${sessions.size + 1}`;
      sessions.set(sessionId, { metadata });
      return response(200, {}, { location: `https://www.googleapis.com/upload/drive/v3/files?upload_id=${sessionId}` });
    }
    if (options.method === 'PUT' && parsed.searchParams.has('upload_id')) {
      const session = sessions.get(parsed.searchParams.get('upload_id'));
      if (!session) return response(404, {});
      if (!options.body) return response(308, {}, session.received ? { range: `bytes=0-${session.received - 1}` } : {});
      const contentText = await options.body.text();
      const range = options.headers['Content-Range'];
      const start = Number(range.match(/^bytes (\d+)-/)[1]);
      session.content = `${session.content || ''}${contentText}`;
      session.received = start + contentText.length;
      if (session.received < Number(range.match(/\/(\d+)$/)[1])) return response(308, {}, { range: `bytes=0-${session.received - 1}` });
      const fileId = session.metadata.id || `synthetic-drive-file-${++sequence}`;
      if (files.has(fileId)) return response(409, {});
      const file = { id: fileId, createdTime: new Date(1000 + sequence).toISOString(), size: String(session.content.length), ...session.metadata };
      delete file.mimeType;
      files.set(fileId, { metadata: file, content: session.content });
      sessions.delete(parsed.searchParams.get('upload_id'));
      return response(200, file);
    }
    if (parsed.pathname.endsWith('/drive/v3/files') && options.method !== 'POST') {
      const values = [...files.values()].filter(file => {
        const props = file.metadata.appProperties;
        const query = parsed.searchParams.get('q');
        return query.includes(`'${props.appId}'`) && query.includes(`'${props.ownerScope}'`) &&
          query.includes(`'${props.backupKey}'`) &&
          (!query.includes("key='idempotency'") || query.includes(`'${props.idempotency}'`));
      });
      return response(200, { files: values.map(file => file.metadata) });
    }
    if (id && parsed.searchParams.get('alt') === 'media') {
      const file = files.get(id);
      return file ? response(200, file.content) : response(404, { error: { errors: [{ reason: 'notFound' }] } });
    }
    if (id) {
      const file = files.get(id);
      return file ? response(200, file.metadata) : response(404, { error: { errors: [{ reason: 'notFound' }] } });
    }
    return response(404, { error: { errors: [{ reason: 'notFound' }] } });
  };
  return { files, sessions, calls, fetchImpl };
}

function operationStore() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); }
  };
}

function tokenProvider(scope = GOOGLE_DRIVE_FILE_SCOPE) {
  return async () => ({ accessToken: 'synthetic-access-token', scope, expiresAt: Date.now() + 60_000 });
}

async function rejected(promise) {
  try { await promise; } catch (error) { return error; }
  assert.fail('Expected promise to reject');
}

test('Google Drive OAuth helper requests only drive.file and returns a short-lived token', async () => {
  let configuration;
  const google = { accounts: { oauth2: { initTokenClient(config) {
    configuration = config;
    return { requestAccessToken() { queueMicrotask(() => config.callback({ access_token: 'synthetic-oauth-token', scope: GOOGLE_DRIVE_FILE_SCOPE, expires_in: 120 })); } };
  } } } };
  const provider = createGoogleDriveTokenProvider({ clientId: 'synthetic-client-id.apps.googleusercontent.com', google });
  const token = await provider();
  assert.equal(configuration.scope, GOOGLE_DRIVE_FILE_SCOPE);
  assert.equal(token.accessToken, 'synthetic-oauth-token');
  assert.equal(token.scope, GOOGLE_DRIVE_FILE_SCOPE);
  assert.ok(token.expiresAt > Date.now());
  assert.equal(Object.hasOwn(provider, 'token'), false);
});

test('Google Drive OAuth helper caches tokens only in memory and can invalidate them', async () => {
  let grants = 0;
  const google = { accounts: { oauth2: { initTokenClient(config) {
    return { requestAccessToken() { queueMicrotask(() => config.callback({ access_token: `synthetic-token-${++grants}`, scope: GOOGLE_DRIVE_FILE_SCOPE, expires_in: 120 })); } };
  } } } };
  const provider = createGoogleDriveTokenProvider({ clientId: 'synthetic-client-id.apps.googleusercontent.com', google });
  const first = await provider();
  const cached = await provider();
  assert.equal(cached.accessToken, first.accessToken);
  assert.equal(grants, 1);
  provider.invalidate();
  assert.equal((await provider()).accessToken, 'synthetic-token-2');
  assert.equal(grants, 2);
});

test('Drive adapter invalidates an unauthorized token without silently retrying', async () => {
  let tokenReads = 0;
  let requests = 0;
  const provider = Object.assign(async () => ({
    accessToken: `synthetic-token-${++tokenReads}`, scope: GOOGLE_DRIVE_FILE_SCOPE, expiresAt: Date.now() + 60_000
  }), { invalidate() {} });
  const adapter = createGoogleDriveBackupAdapter({
    getAccessToken: provider, ownerScope, appId: 'carteira-investimentos-v1',
    fetchImpl: async () => ++requests === 1 ? response(401, {}) : response(200, { files: [] })
  });
  await assert.rejects(() => adapter.listVersions({ backupKey: 'synthetic-wallet' }), { code: 'AUTH_REQUIRED' });
  assert.equal(requests, 1);
  assert.deepEqual(await adapter.listVersions({ backupKey: 'synthetic-wallet' }), []);
  assert.equal(tokenReads, 2);
});

test('Drive adapter uploads immutable encrypted files, lists versions, and repeats by idempotency key', async () => {
  const drive = driveHarness();
  const adapter = createGoogleDriveBackupAdapter({
    getAccessToken: tokenProvider(), fetchImpl: drive.fetchImpl,
    ownerScope, appId: 'carteira-investimentos-v1'
  });
  const first = await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'synthetic-run-1', envelope });
  const replay = await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'synthetic-run-1', envelope });
  const sameContent = await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'new-operation-key', envelope });
  const versions = await adapter.listVersions({ backupKey: 'synthetic-wallet' });
  const restored = await adapter.download(first.fileId, { backupKey: 'synthetic-wallet' });
  assert.equal(first.fileId, replay.fileId);
  assert.equal(replay.replayed, true);
  assert.equal(sameContent.fileId, first.fileId);
  assert.equal(sameContent.replayed, true);
  assert.equal(versions.length, 1);
  assert.equal(versions[0].integrity, 'VALID');
  assert.deepEqual(restored.envelope, envelope);
  assert.equal(drive.files.size, 1);
  assert.equal([...drive.files.values()][0].content.includes('synthetic-wallet'), false);
  assert.ok(drive.calls.filter(call => call.url.origin === 'https://www.googleapis.com' && !call.url.searchParams.has('upload_id')).every(call => call.options.headers.Authorization === 'Bearer synthetic-access-token'));
  assert.ok(drive.calls.filter(call => call.url.searchParams.has('upload_id')).every(call => !call.options.headers.Authorization));
  assert.equal(drive.calls.some(call => call.options.method === 'DELETE'), false);
});

test('Drive adapter detects idempotency conflicts and enforces application owner metadata', async () => {
  const drive = driveHarness();
  const adapter = createGoogleDriveBackupAdapter({ getAccessToken: tokenProvider(), fetchImpl: drive.fetchImpl, ownerScope, appId: 'carteira-investimentos-v1' });
  const uploaded = await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'same-key', envelope });
  const different = { ...envelope, ciphertext: 'BBBBBBBBBBBBBBBBBBBBBB==' };
  await assert.rejects(() => adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'same-key', envelope: different }), { code: 'IDEMPOTENCY_CONFLICT' });
  const other = createGoogleDriveBackupAdapter({ getAccessToken: tokenProvider(), fetchImpl: drive.fetchImpl, ownerScope: otherOwnerScope, appId: 'carteira-investimentos-v1' });
  await assert.rejects(() => other.download(uploaded.fileId, { backupKey: 'synthetic-wallet' }), { code: 'NOT_FOUND' });
  assert.deepEqual(await other.listVersions({ backupKey: 'synthetic-wallet' }), []);
});

test('Drive adapter serializes same-page retries for an idempotency key', async () => {
  const drive = driveHarness();
  const options = { getAccessToken: tokenProvider(), fetchImpl: drive.fetchImpl, ownerScope, appId: 'carteira-investimentos-v1' };
  const first = createGoogleDriveBackupAdapter(options);
  const second = createGoogleDriveBackupAdapter(options);
  const results = await Promise.allSettled([
    first.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'racing-key', envelope }),
    second.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'racing-key', envelope: { ...envelope, ciphertext: 'BBBBBBBBBBBBBBBBBBBBBB==' } })
  ]);
  assert.equal(results.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal(results.find(item => item.status === 'rejected').reason.code, 'IDEMPOTENCY_CONFLICT');
  assert.equal(drive.files.size, 1);
});

test('Firestore coordinator atomically reserves one owner-scoped Drive ID and rejects payload conflicts', async () => {
  const rows = new Map();
  let transactionQueue = Promise.resolve();
  const firestore = {
    collection: name => ({ doc: uid => ({ collection: sub => ({ doc: id => `${name}/${uid}/${sub}/${id}` }) }) }),
    async runTransaction(callback) {
      const current = transactionQueue.then(() => callback({
          async get(ref) { const data = rows.get(ref); return { exists: rows.has(ref), data: () => rows.get(ref) }; },
          set(ref, value) { rows.set(ref, value); }
        }));
      transactionQueue = current.catch(() => {});
      return current;
    }
  };
  const coordinatorA = createFirestoreBackupOperationCoordinator({ firestore, getOwnerUid: () => 'synthetic-owner-a' });
  const coordinatorB = createFirestoreBackupOperationCoordinator({ firestore, getOwnerUid: () => 'synthetic-owner-a' });
  const idempotencyHash = 'c'.repeat(64);
  const contentSha256 = 'd'.repeat(64);
  const coordinatorOwnerScope = await Backup.sha256('carteira-investimentos-backup-owner-v1:synthetic-owner-a');
  const [first, replay] = await Promise.all([
    coordinatorA.reserve({ idempotencyHash, contentSha256, proposedFileId: 'synthetic-drive-id-a', ownerScope: coordinatorOwnerScope }),
    coordinatorB.reserve({ idempotencyHash, contentSha256, proposedFileId: 'synthetic-drive-id-b', ownerScope: coordinatorOwnerScope })
  ]);
  assert.equal(first.fileId, replay.fileId);
  assert.equal(rows.size, 1);
  await assert.rejects(() => coordinatorA.reserve({ idempotencyHash, contentSha256: 'e'.repeat(64), proposedFileId: 'synthetic-drive-id-c', ownerScope: coordinatorOwnerScope }), { code: 'IDEMPOTENCY_CONFLICT' });
  await assert.rejects(() => coordinatorA.reserve({ idempotencyHash, contentSha256, proposedFileId: 'synthetic-drive-id-c', ownerScope: 'f'.repeat(64) }), { code: 'COORDINATOR_OWNER_MISMATCH' });
  await assert.rejects(() => createFirestoreBackupOperationCoordinator({ firestore, getOwnerUid: () => 'owner/escape' }).reserve({ idempotencyHash, contentSha256, proposedFileId: 'synthetic-id', ownerScope: coordinatorOwnerScope }), { code: 'COORDINATOR_AUTH_REQUIRED' });
  const denied = createFirestoreBackupOperationCoordinator({ firestore: { ...firestore, runTransaction: async () => { throw Object.assign(new Error('synthetic private backend detail'), { code: 'permission-denied' }); } }, getOwnerUid: () => 'synthetic-owner-a' });
  await assert.rejects(() => denied.reserve({ idempotencyHash, contentSha256, proposedFileId: 'synthetic-drive-file-d', ownerScope: coordinatorOwnerScope }), error => error.code === 'COORDINATOR_FORBIDDEN' && error.message === 'COORDINATOR_FORBIDDEN');
  const unavailable = createFirestoreBackupOperationCoordinator({ firestore: { ...firestore, runTransaction: async () => { throw new Error('synthetic private backend detail'); } }, getOwnerUid: () => 'synthetic-owner-a' });
  await assert.rejects(() => unavailable.reserve({ idempotencyHash, contentSha256, proposedFileId: 'synthetic-drive-file-e', ownerScope: coordinatorOwnerScope }), error => error.code === 'COORDINATOR_UNAVAILABLE' && error.retryable === true && error.message === 'COORDINATOR_UNAVAILABLE');
});

test('Drive adapter shares operation identity across independent local journals and reports one file', async () => {
  const drive = driveHarness();
  const rows = new Map();
  let reserveQueue = Promise.resolve();
  const coordinator = {
    reserve(args) {
      const next = reserveQueue.then(() => {
        const current = rows.get(args.idempotencyHash);
        if (current && current.contentSha256 !== args.contentSha256) throw Object.assign(new Error('IDEMPOTENCY_CONFLICT'), { code: 'IDEMPOTENCY_CONFLICT' });
        const record = current || { fileId: args.proposedFileId, contentSha256: args.contentSha256 };
        rows.set(args.idempotencyHash, record);
        return record;
      });
      reserveQueue = next.catch(() => {});
      return next;
    }
  };
  const options = { getAccessToken: tokenProvider(), fetchImpl: drive.fetchImpl, ownerScope, appId: 'carteira-investimentos-v1', operationCoordinator: coordinator };
  const first = createGoogleDriveBackupAdapter({ ...options, operationStore: operationStore() });
  const second = createGoogleDriveBackupAdapter({ ...options, operationStore: operationStore() });
  const results = await Promise.all([
    first.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'cross-device', envelope }),
    second.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'cross-device', envelope })
  ]);
  assert.equal(results[0].fileId, results[1].fileId);
  assert.equal(drive.files.size, 1);
  assert.equal(rows.size, 1);
});

test('Drive adapter reuses a journaled Drive ID after restart when search is temporarily stale', async () => {
  const drive = driveHarness();
  const journal = operationStore();
  const base = { getAccessToken: tokenProvider(), fetchImpl: drive.fetchImpl, ownerScope, appId: 'carteira-investimentos-v1', operationStore: journal };
  const first = createGoogleDriveBackupAdapter(base);
  const uploaded = await first.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'restart-replay', envelope });
  const hiddenList = async (url, options) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith('/drive/v3/files') && options.method !== 'POST') return response(200, { files: [] });
    return drive.fetchImpl(url, options);
  };
  const restarted = createGoogleDriveBackupAdapter({ ...base, fetchImpl: hiddenList });
  const replay = await restarted.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'restart-replay', envelope });
  assert.equal(replay.fileId, uploaded.fileId);
  assert.equal(replay.replayed, true);
  assert.equal(drive.files.size, 1);
  assert.equal(drive.calls.filter(call => call.url.pathname.endsWith('/drive/v3/files/generateIds')).length, 1);
});

test('Drive adapter default journal persists only remote identity metadata in the browser profile', async () => {
  const drive = driveHarness();
  const values = new Map();
  const previousWindow = globalThis.window;
  const previousNavigator = globalThis.navigator;
  globalThis.window = { localStorage: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  } };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request: (_name, callback) => callback() } } });
  try {
    const options = {
      getAccessToken: tokenProvider(), fetchImpl: drive.fetchImpl, ownerScope, appId: 'carteira-investimentos-v1',
      operationCoordinator: { reserve: async operation => ({ fileId: operation.proposedFileId, contentSha256: operation.contentSha256 }) }
    };
    const first = await createGoogleDriveBackupAdapter(options).upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'browser-default-journal', envelope });
    const replay = await createGoogleDriveBackupAdapter(options).upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'browser-default-journal', envelope });
    const journalText = [...values.values()].join(' ');
    assert.equal(replay.fileId, first.fileId);
    assert.equal(replay.replayed, true);
    assert.equal(drive.files.size, 1);
    assert.equal(journalText.includes(envelope), false);
    assert.equal(journalText.includes('synthetic-access-token'), false);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousNavigator === undefined) delete globalThis.navigator;
    else Object.defineProperty(globalThis, 'navigator', { configurable: true, value: previousNavigator });
  }
});

test('Drive adapter blocks browser uploads without shared cross-device coordination before network access', async () => {
  const drive = driveHarness();
  const previousWindow = globalThis.window;
  const previousNavigator = globalThis.navigator;
  globalThis.window = { localStorage: operationStore() };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request: (_name, callback) => callback() } } });
  try {
    const adapter = createGoogleDriveBackupAdapter({ getAccessToken: tokenProvider(), fetchImpl: drive.fetchImpl, ownerScope, appId: 'carteira-investimentos-v1' });
    await assert.rejects(() => adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'browser-without-coordinator', envelope }), { code: 'SHARED_COORDINATOR_REQUIRED' });
    assert.equal(drive.calls.length, 0);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousNavigator === undefined) delete globalThis.navigator;
    else Object.defineProperty(globalThis, 'navigator', { configurable: true, value: previousNavigator });
  }
});

test('Drive adapter blocks worker uploads without shared cross-device coordination before network access', async () => {
  const drive = driveHarness();
  const names = ['window', 'navigator', 'self'];
  const previous = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  for (const name of names) delete globalThis[name];
  globalThis.navigator = {};
  globalThis.self = { importScripts() {} };
  try {
    const adapter = createGoogleDriveBackupAdapter({ getAccessToken: tokenProvider(), fetchImpl: drive.fetchImpl, ownerScope, appId: 'carteira-investimentos-v1' });
    await assert.rejects(() => adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'worker-without-coordinator', envelope }), { code: 'CROSS_TAB_COORDINATION_UNAVAILABLE' });
    globalThis.navigator = { locks: { request: (_name, callback) => callback() } };
    await assert.rejects(() => adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'worker-with-lock-without-coordinator', envelope }), { code: 'SHARED_COORDINATOR_REQUIRED' });
    assert.equal(drive.calls.length, 0);
  } finally {
    for (const name of names) {
      if (previous[name]) Object.defineProperty(globalThis, name, previous[name]);
      else delete globalThis[name];
    }
  }
});

test('Drive adapter reconciles a lost upload response by the journaled ID after restart', async () => {
  const drive = driveHarness();
  const journal = operationStore();
  const base = { getAccessToken: tokenProvider(), ownerScope, appId: 'carteira-investimentos-v1', operationStore: journal };
  const interrupted = createGoogleDriveBackupAdapter({
    ...base,
    fetchImpl: async (url, options) => {
      const parsed = new URL(url);
      if (options.method === 'PUT' && parsed.searchParams.has('upload_id') && options.body) {
        const result = await drive.fetchImpl(url, options);
        if (result.ok) throw new Error('synthetic response lost after commit');
        return result;
      }
      return drive.fetchImpl(url, options);
    }
  });
  await assert.rejects(() => interrupted.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'lost-response', envelope }), { code: 'UPLOAD_SESSION_EXPIRED' });
  assert.equal(drive.files.size, 1);
  const restarted = createGoogleDriveBackupAdapter({ ...base, fetchImpl: drive.fetchImpl });
  const replay = await restarted.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'lost-response', envelope });
  assert.equal(replay.replayed, true);
  assert.equal(drive.files.size, 1);
});

test('Drive adapter fails closed when it cannot persist the operation identity', async () => {
  const drive = driveHarness();
  const adapter = createGoogleDriveBackupAdapter({
    getAccessToken: tokenProvider(), fetchImpl: drive.fetchImpl, ownerScope, appId: 'carteira-investimentos-v1',
    operationStore: { getItem: () => null, setItem() { throw new Error('synthetic journal unavailable'); } }
  });
  await assert.rejects(() => adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'journal-failure', envelope }), { code: 'OPERATION_JOURNAL_UNAVAILABLE' });
  assert.equal(drive.files.size, 0);
  assert.equal(drive.calls.some(call => call.options.method === 'POST'), false);
});

test('Drive adapter rejects invalid, expired, or overbroad OAuth grants before network access', async () => {
  const drive = driveHarness();
  const invalidAdapter = createGoogleDriveBackupAdapter({ getAccessToken: tokenProvider('https://www.googleapis.com/auth/drive'), fetchImpl: drive.fetchImpl, ownerScope, appId: 'carteira-investimentos-v1' });
  await assert.rejects(() => invalidAdapter.listVersions({ backupKey: 'synthetic-wallet' }), { code: 'OAUTH_SCOPE_REQUIRED' });
  const extraScopeAdapter = createGoogleDriveBackupAdapter({ getAccessToken: tokenProvider(`${GOOGLE_DRIVE_FILE_SCOPE} profile`), fetchImpl: drive.fetchImpl, ownerScope, appId: 'carteira-investimentos-v1' });
  await assert.rejects(() => extraScopeAdapter.listVersions({ backupKey: 'synthetic-wallet' }), { code: 'OAUTH_SCOPE_REQUIRED' });
  const expiredAdapter = createGoogleDriveBackupAdapter({ getAccessToken: async () => ({ accessToken: 'expired-token', scope: GOOGLE_DRIVE_FILE_SCOPE, expiresAt: Date.now() - 1000 }), fetchImpl: drive.fetchImpl, ownerScope, appId: 'carteira-investimentos-v1' });
  await assert.rejects(() => expiredAdapter.listVersions({ backupKey: 'synthetic-wallet' }), { code: 'AUTH_EXPIRED' });
  assert.equal(drive.calls.length, 0);
});

test('Drive adapter sanitizes auth, quota, and network errors and exposes no secret details', async () => {
  const responses = [
    () => response(401, { message: 'token must not leak' }),
    ...Array.from({ length: 3 }, () => () => response(403, { error: { errors: [{ reason: 'userRateLimitExceeded', message: 'secret detail' }] } })),
    ...Array.from({ length: 3 }, () => () => { throw new Error('synthetic transport detail'); })
  ];
  const adapter = createGoogleDriveBackupAdapter({
    getAccessToken: tokenProvider(), ownerScope, appId: 'carteira-investimentos-v1',
    fetchImpl: async () => responses.shift()()
  });
  const first = await rejected(adapter.listVersions({ backupKey: 'synthetic-wallet' }));
  assert.equal(first.code, 'AUTH_REQUIRED');
  const quota = await rejected(adapter.listVersions({ backupKey: 'synthetic-wallet' }));
  assert.equal(quota.code, 'QUOTA_EXCEEDED');
  const network = await rejected(adapter.listVersions({ backupKey: 'synthetic-wallet' }));
  assert.equal(network.code, 'NETWORK_ERROR');
  assert.doesNotMatch(`${first.message} ${quota.message} ${network.message}`, /secret|token must not leak|transport detail/);
});

test('Drive adapter retries only bounded idempotent reads and classifies conflict permissions', async () => {
  let attempts = 0;
  const adapter = createGoogleDriveBackupAdapter({
    getAccessToken: tokenProvider(), ownerScope, appId: 'carteira-investimentos-v1',
    fetchImpl: async () => ++attempts < 3 ? response(503, {}) : response(200, { files: [] })
  });
  assert.deepEqual(await adapter.listVersions({ backupKey: 'synthetic-wallet' }), []);
  assert.equal(attempts, 3);

  const conflict = createGoogleDriveBackupAdapter({
    getAccessToken: tokenProvider(), ownerScope, appId: 'carteira-investimentos-v1',
    fetchImpl: async () => response(409, { message: 'private conflict detail' })
  });
  await assert.rejects(() => conflict.listVersions({ backupKey: 'synthetic-wallet' }), { code: 'DRIVE_CONFLICT' });

  const forbidden = createGoogleDriveBackupAdapter({
    getAccessToken: tokenProvider(), ownerScope, appId: 'carteira-investimentos-v1',
    fetchImpl: async () => response(403, { message: 'private permission detail' })
  });
  await assert.rejects(() => forbidden.listVersions({ backupKey: 'synthetic-wallet' }), { code: 'PERMISSION_DENIED' });
});

test('Drive adapter never blindly retries an upload whose result is unknown', async () => {
  const drive = driveHarness();
  let uploadAttempts = 0;
  const adapter = createGoogleDriveBackupAdapter({
    getAccessToken: tokenProvider(), ownerScope, appId: 'carteira-investimentos-v1',
    fetchImpl: async (url, options) => {
      if (options.method === 'POST') { uploadAttempts += 1; return response(503, { message: 'private server detail' }); }
      return drive.fetchImpl(url, options);
    }
  });
  await assert.rejects(() => adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'unknown-outcome', envelope }), { code: 'UPLOAD_OUTCOME_UNKNOWN' });
  assert.equal(uploadAttempts, 1);
});

test('Drive adapter resumes an interrupted resumable upload after querying server state', async () => {
  const drive = driveHarness();
  let interruptions = 0;
  const attemptedRanges = [];
  const adapter = createGoogleDriveBackupAdapter({
    getAccessToken: tokenProvider(), ownerScope, appId: 'carteira-investimentos-v1',
    fetchImpl: async (url, options) => {
      const parsed = new URL(url);
      const session = parsed.searchParams.has('upload_id') && drive.sessions.get(parsed.searchParams.get('upload_id'));
      if (session && options.method === 'PUT') attemptedRanges.push(options.headers['Content-Range']);
      if (session && options.method === 'PUT' && options.body && interruptions < 2) {
        if (interruptions === 0) {
          const content = await options.body.text();
          session.content = content.slice(0, 12);
          session.received = 12;
        }
        interruptions += 1;
        throw new Error('synthetic connection interruption');
      }
      return drive.fetchImpl(url, options);
    }
  });
  const uploaded = await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'resume-1', envelope });
  assert.equal(interruptions, 2);
  assert.equal(drive.files.size, 1);
  assert.ok(uploaded.fileId);
  const restored = await adapter.download(uploaded.fileId, { backupKey: 'synthetic-wallet' });
  assert.deepEqual(restored.envelope, envelope);
  assert.deepEqual(attemptedRanges, [
    `bytes 0-${JSON.stringify(envelope).length - 1}/${JSON.stringify(envelope).length}`,
    `bytes */${JSON.stringify(envelope).length}`,
    `bytes 12-${JSON.stringify(envelope).length - 1}/${JSON.stringify(envelope).length}`,
    `bytes */${JSON.stringify(envelope).length}`,
    `bytes 12-${JSON.stringify(envelope).length - 1}/${JSON.stringify(envelope).length}`
  ]);
});

test('Drive adapter queries resumable upload state after a 5xx response', async () => {
  const drive = driveHarness();
  let failedTransfer = false;
  let statusChecks = 0;
  const adapter = createGoogleDriveBackupAdapter({
    getAccessToken: tokenProvider(), ownerScope, appId: 'carteira-investimentos-v1',
    fetchImpl: async (url, options) => {
      const parsed = new URL(url);
      if (parsed.searchParams.has('upload_id') && options.method === 'PUT') {
        if (options.body && !failedTransfer) { failedTransfer = true; return response(503, {}); }
        if (!options.body) statusChecks += 1;
      }
      return drive.fetchImpl(url, options);
    }
  });
  const result = await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'resume-5xx', envelope });
  assert.ok(result.fileId);
  assert.equal(statusChecks, 1);
  assert.equal(drive.files.size, 1);
});

test('Drive adapter bounds partial acknowledgements that do not complete an upload', async () => {
  const drive = driveHarness();
  let partialResponses = 0;
  const adapter = createGoogleDriveBackupAdapter({
    getAccessToken: tokenProvider(), ownerScope, appId: 'carteira-investimentos-v1',
    fetchImpl: async (url, options) => {
      const parsed = new URL(url);
      if (parsed.searchParams.has('upload_id') && options.method === 'PUT' && options.body) {
        const acceptedThrough = Number(options.headers['Content-Range'].match(/^bytes (\d+)-/)[1]) + partialResponses++;
        return response(308, {}, { range: `bytes=0-${acceptedThrough}` });
      }
      return drive.fetchImpl(url, options);
    }
  });
  await assert.rejects(() => adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'stalled-resume', envelope }), { code: 'UPLOAD_OUTCOME_UNKNOWN' });
  assert.equal(partialResponses, 3);
  assert.equal(drive.files.size, 0);
});

test('Drive adapter rejects a forward resumable Range that produces a truncated remote file', async () => {
  const drive = driveHarness();
  const total = new TextEncoder().encode(JSON.stringify(envelope)).byteLength;
  let claimedPartial = false;
  const adapter = createGoogleDriveBackupAdapter({
    getAccessToken: tokenProvider(), ownerScope, appId: 'carteira-investimentos-v1',
    fetchImpl: async (url, options) => {
      const parsed = new URL(url);
      if (parsed.searchParams.has('upload_id') && options.method === 'PUT' && options.body && !claimedPartial) {
        claimedPartial = true;
        return response(308, {}, { range: `bytes=0-${total - 2}` });
      }
      return drive.fetchImpl(url, options);
    }
  });
  await assert.rejects(() => adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'forged-range', envelope }), { code: 'UPLOAD_VERIFICATION_FAILED' });
  assert.equal(drive.files.size, 1);
  assert.equal([...drive.files.values()][0].content.length, 1);
});

test('Drive adapter reads back and hashes stored bytes before reporting upload success', async () => {
  const drive = driveHarness();
  const adapter = createGoogleDriveBackupAdapter({
    getAccessToken: tokenProvider(), ownerScope, appId: 'carteira-investimentos-v1',
    fetchImpl: async (url, options) => {
      const result = await drive.fetchImpl(url, options);
      if (new URL(url).searchParams.has('upload_id') && options.method === 'PUT' && result.ok) {
        const file = await result.json();
        const stored = drive.files.get(file.id);
        stored.content = 'x'.repeat(stored.content.length);
        return response(200, file);
      }
      return result;
    }
  });
  await assert.rejects(() => adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'readback-corruption', envelope }), { code: 'FILE_CORRUPT' });
});

test('Drive adapter rejects an untrusted resumable session URL without sending credentials', async () => {
  const calls = [];
  const adapter = createGoogleDriveBackupAdapter({
    getAccessToken: tokenProvider(), ownerScope, appId: 'carteira-investimentos-v1',
    fetchImpl: async (url, options) => {
      const parsed = new URL(url);
      calls.push({ parsed, options });
      if (parsed.searchParams.has('q')) return response(200, { files: [] });
      if (parsed.pathname.endsWith('/drive/v3/files/generateIds')) return response(200, { ids: ['synthetic-drive-id'] });
      return response(200, {}, { location: 'https://attacker.invalid/upload/drive/v3/files?upload_id=secret' });
    }
  });
  await assert.rejects(() => adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'unsafe-session', envelope }), { code: 'UPLOAD_SESSION_INVALID' });
  assert.equal(calls.length, 4);
  assert.ok(calls.every(call => call.parsed.hostname === 'www.googleapis.com'));
});

test('Drive adapter rejects oversized remote metadata before downloading backup content', async () => {
  const drive = driveHarness();
  const adapter = createGoogleDriveBackupAdapter({ getAccessToken: tokenProvider(), fetchImpl: drive.fetchImpl, ownerScope, appId: 'carteira-investimentos-v1' });
  const uploaded = await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'oversized-file', envelope });
  drive.files.get(uploaded.fileId).metadata.size = String(36 * 1024 * 1024 + 1);
  const callsBeforeDownload = drive.calls.length;
  await assert.rejects(() => adapter.download(uploaded.fileId, { backupKey: 'synthetic-wallet' }), { code: 'BACKUP_TOO_LARGE' });
  assert.equal(drive.calls.slice(callsBeforeDownload).some(call => call.url.searchParams.get('alt') === 'media'), false);
});

test('Drive adapter sanitizes failures while reading remote backup content', async () => {
  const drive = driveHarness();
  const stored = createGoogleDriveBackupAdapter({ getAccessToken: tokenProvider(), fetchImpl: drive.fetchImpl, ownerScope, appId: 'carteira-investimentos-v1' });
  const uploaded = await stored.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'read-failure', envelope });
  const failing = createGoogleDriveBackupAdapter({
    getAccessToken: tokenProvider(), ownerScope, appId: 'carteira-investimentos-v1',
    fetchImpl: async (url, options) => new URL(url).searchParams.get('alt') === 'media'
      ? { ...response(200, ''), async text() { throw new Error('synthetic secret transport detail'); } }
      : drive.fetchImpl(url, options)
  });
  const error = await rejected(failing.download(uploaded.fileId, { backupKey: 'synthetic-wallet' }));
  assert.equal(error.code, 'NETWORK_ERROR');
  assert.doesNotMatch(error.message, /secret transport detail/);
});

test('Drive adapter streams remote content and cancels when the bounded size is exceeded', async () => {
  const drive = driveHarness();
  const stored = createGoogleDriveBackupAdapter({ getAccessToken: tokenProvider(), fetchImpl: drive.fetchImpl, ownerScope, appId: 'carteira-investimentos-v1' });
  const uploaded = await stored.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'stream-limit', envelope });
  const chunk = new Uint8Array(1024 * 1024);
  let pulls = 0;
  let cancelled = false;
  const oversized = createGoogleDriveBackupAdapter({
    getAccessToken: tokenProvider(), ownerScope, appId: 'carteira-investimentos-v1',
    fetchImpl: async (url, options) => new URL(url).searchParams.get('alt') === 'media'
      ? {
          ok: true, status: 200, headers: { get: () => null },
          body: new ReadableStream({
            pull(controller) { if (++pulls <= 40) controller.enqueue(chunk); else controller.close(); },
            cancel() { cancelled = true; }
          }),
          async text() { throw new Error('stream must be used'); }
        }
      : drive.fetchImpl(url, options)
  });
  await assert.rejects(() => oversized.download(uploaded.fileId, { backupKey: 'synthetic-wallet' }), { code: 'BACKUP_TOO_LARGE' });
  assert.equal(cancelled, true);
  assert.ok(pulls >= 37 && pulls <= 38, `expected bounded reads after cancellation, got ${pulls}`);
});

test('Drive adapter bounds concurrent integrity reads while listing versions', async () => {
  const drive = driveHarness();
  const stored = createGoogleDriveBackupAdapter({ getAccessToken: tokenProvider(), fetchImpl: drive.fetchImpl, ownerScope, appId: 'carteira-investimentos-v1' });
  for (let index = 0; index < 5; index += 1) {
    await stored.upload({ backupKey: 'synthetic-wallet', idempotencyKey: `bounded-${index}`, envelope: { ...envelope, ciphertext: `${String.fromCharCode(65 + index)}AAAAAAAAAAAAAAAAAAAAA==` } });
  }
  let active = 0;
  let maximumActive = 0;
  const monitored = createGoogleDriveBackupAdapter({
    getAccessToken: tokenProvider(), ownerScope, appId: 'carteira-investimentos-v1',
    fetchImpl: async (url, options) => {
      if (new URL(url).searchParams.get('alt') !== 'media') return drive.fetchImpl(url, options);
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise(resolve => setTimeout(resolve, 5));
      try { return await drive.fetchImpl(url, options); } finally { active -= 1; }
    }
  });
  assert.equal((await monitored.listVersions({ backupKey: 'synthetic-wallet' })).length, 5);
  assert.equal(maximumActive, 2);
});

test('Drive adapter retention is a non-destructive plan and rejects incomplete remote listings', async () => {
  const drive = driveHarness();
  const adapter = createGoogleDriveBackupAdapter({ getAccessToken: tokenProvider(), fetchImpl: drive.fetchImpl, ownerScope, appId: 'carteira-investimentos-v1' });
  await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'version-1', envelope });
  const next = { ...envelope, ciphertext: 'BBBBBBBBBBBBBBBBBBBBBB==' };
  await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'version-2', envelope: next });
  const plan = await adapter.planRetention({ backupKey: 'synthetic-wallet', keepLatest: 1 });
  assert.equal(plan.deleteFileIds.length, 1);
  assert.equal(drive.files.size, 2);
  assert.equal(Object.hasOwn(adapter, 'delete'), false);
});

test('Drive adapter fails closed when Drive reports an incomplete listing', async () => {
  const adapter = createGoogleDriveBackupAdapter({
    getAccessToken: tokenProvider(), ownerScope, appId: 'carteira-investimentos-v1',
    fetchImpl: async () => response(200, { incompleteSearch: true, files: [] })
  });
  await assert.rejects(() => adapter.listVersions({ backupKey: 'synthetic-wallet' }), { code: 'INCOMPLETE_REMOTE_LIST' });
});

test('Drive adapter follows every safe version-list page', async () => {
  const drive = driveHarness();
  const adapter = createGoogleDriveBackupAdapter({ getAccessToken: tokenProvider(), fetchImpl: drive.fetchImpl, ownerScope, appId: 'carteira-investimentos-v1' });
  const first = await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'page-1', envelope });
  const secondEnvelope = { ...envelope, ciphertext: 'BBBBBBBBBBBBBBBBBBBBBB==' };
  const second = await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'page-2', envelope: secondEnvelope });
  const fetchPaged = async (url, options) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith('/drive/v3/files') && parsed.searchParams.get('q')) {
      const selected = parsed.searchParams.has('pageToken') ? first.fileId : second.fileId;
      const file = drive.files.get(selected);
      return response(200, { files: [file.metadata], ...(parsed.searchParams.has('pageToken') ? {} : { nextPageToken: 'synthetic-next-page' }) });
    }
    return drive.fetchImpl(url, options);
  };
  const paged = createGoogleDriveBackupAdapter({ getAccessToken: tokenProvider(), fetchImpl: fetchPaged, ownerScope, appId: 'carteira-investimentos-v1' });
  assert.deepEqual((await paged.listVersions({ backupKey: 'synthetic-wallet' })).map(row => row.fileId), [second.fileId, first.fileId]);
});

test('Drive version integrity propagates quota and network failures instead of reporting corruption', async () => {
  const stored = driveHarness();
  const adapter = createGoogleDriveBackupAdapter({ getAccessToken: tokenProvider(), fetchImpl: stored.fetchImpl, ownerScope, appId: 'carteira-investimentos-v1' });
  await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'known-good', envelope });
  const failing = createGoogleDriveBackupAdapter({
    getAccessToken: tokenProvider(), ownerScope, appId: 'carteira-investimentos-v1',
    fetchImpl: async url => new URL(url).pathname.endsWith('/drive/v3/files')
      ? response(200, { files: [...stored.files.values()].map(file => file.metadata) })
      : response(503, { message: 'remote failure details are private' })
  });
  await assert.rejects(() => failing.listVersions({ backupKey: 'synthetic-wallet' }), { code: 'NETWORK_ERROR' });
});

test('Drive adapter rejects malformed encryption metadata before network access', async () => {
  const drive = driveHarness();
  const adapter = createGoogleDriveBackupAdapter({ getAccessToken: tokenProvider(), fetchImpl: drive.fetchImpl, ownerScope, appId: 'carteira-investimentos-v1' });
  await assert.rejects(() => adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'bad-envelope', envelope: { ...envelope, cipher: { ...envelope.cipher, iv: 'bad' } } }), { code: 'INVALID_ENCRYPTED_BACKUP' });
  assert.equal(drive.calls.length, 0);
});

test('Google Drive adapter completes an encrypted synthetic recovery in an isolated store', async () => {
  const ownerId = 'synthetic-drive-recovery-owner';
  const scope = await Backup.sha256(`carteira-investimentos-backup-owner-v1:${ownerId}`);
  const state = {
    wallets: [{ id: 'synthetic-wallet-1', name: 'Synthetic wallet', balance: 481.25 }],
    activeWalletId: 'synthetic-wallet-1',
    assets: [{ id: 'synthetic-asset-1', ticker: 'SYNTH3', qty: 3, current_price: 100 }],
    aportes: [
      { id: 'synthetic-buy-1', side: 'BUY', date: '2026-01-10', quantity: 5, unitPrice: 90, value: 450 },
      { id: 'synthetic-sell-1', side: 'SELL', date: '2026-02-10', quantity: 2, unitPrice: 100, value: 200 }
    ],
    proventos: [{ id: 'synthetic-income-1', date: '2026-03-10', value: 1.25, status: 'PAID' }],
    rfEvents: [{ id: 'synthetic-rf-1', type: 'SYNTHETIC', value: 30 }],
    goals: { synthetic: { target: 1000 } },
    performance: { schemaVersion: 1, valuationSnapshots: { snapshots: [] }, externalCashFlows: { flows: [] } }
  };
  const backup = await Backup.createBackup({ state, config: {}, ownerId, createdAt: '2026-06-01T12:00:00.000Z' });
  const encrypted = await Backup.encryptBackup(backup, 'synthetic-only recovery passphrase', { cryptoProvider: webcrypto });
  const drive = driveHarness();
  const adapter = createGoogleDriveBackupAdapter({ getAccessToken: tokenProvider(), fetchImpl: drive.fetchImpl, ownerScope: scope, appId: 'carteira-investimentos-v1' });
  const uploaded = await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'synthetic-recovery-1', envelope: encrypted });
  const downloaded = await adapter.download(uploaded.fileId, { backupKey: 'synthetic-wallet' });
  const decrypted = await Backup.decryptBackup(downloaded.envelope, 'synthetic-only recovery passphrase', { cryptoProvider: webcrypto });
  const integrity = await Backup.verifyBackup(decrypted, { ownerId });
  assert.equal(integrity.status, 'SUPPORTED');
  const cleanState = structuredClone(integrity.backup.payload.state);
  for (const key of ['wallets', 'assets', 'aportes', 'proventos', 'rfEvents']) cleanState[key] = [];
  const preview = await Backup.previewRestore(decrypted, cleanState, { ownerId });
  assert.equal(preview.restoreAllowed, true);
  const applied = Backup.applyToIsolatedStore({ state: {}, config: {} }, integrity.backup);
  assert.equal(applied.ok, true);
  assert.equal(await Backup.sha256(Backup.canonical(applied.store.state)), await Backup.sha256(Backup.canonical(integrity.backup.payload.state)));
  assert.equal(applied.store.state.assets[0].qty, 3);
  assert.deepEqual(applied.store.state.aportes.map(row => row.side), ['BUY', 'SELL']);
  assert.equal(applied.store.state.proventos[0].status, 'PAID');
  assert.equal(drive.files.size, 1);
  assert.ok(drive.calls.every(call => call.url.origin === 'https://www.googleapis.com' && call.options.redirect === 'error'));
});
