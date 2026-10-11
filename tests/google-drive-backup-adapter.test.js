'use strict';

const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const test = require('node:test');
const Backup = require('../backup-portability.js');
const { GOOGLE_DRIVE_FILE_SCOPE, createGoogleDriveBackupAdapter, createGoogleDriveTokenProvider } = require('../google-drive-backup.js');

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
  const calls = [];
  let sequence = 0;
  const fetchImpl = async (url, options = {}) => {
    const parsed = new URL(url);
    calls.push({ url: parsed, options });
    const id = parsed.pathname.match(/\/files\/([^/]+)$/)?.[1];
    if (options.method === 'POST' && parsed.pathname.endsWith('/upload/drive/v3/files')) {
      const boundary = options.headers['Content-Type'].match(/boundary=([^;]+)/)[1];
      const parts = (await options.body.text()).split(`--${boundary}`).filter(part => part.includes('\r\n\r\n'));
      const metadata = JSON.parse(parts[0].slice(parts[0].indexOf('\r\n\r\n') + 4).trim());
      const contentText = parts[1].slice(parts[1].indexOf('\r\n\r\n') + 4).replace(/\r\n$/, '').trim();
      const fileId = `synthetic-drive-file-${++sequence}`;
      const file = { id: fileId, createdTime: new Date(1000 + sequence).toISOString(), size: String(contentText.length), ...metadata };
      files.set(fileId, { metadata: file, content: contentText });
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
  return { files, calls, fetchImpl };
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
  assert.ok(drive.calls.every(call => call.options.headers.Authorization === 'Bearer synthetic-access-token'));
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
    () => response(403, { error: { errors: [{ reason: 'userRateLimitExceeded', message: 'secret detail' }] } }),
    () => { throw new Error('synthetic transport detail'); }
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
