'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomUUID, webcrypto } = require('node:crypto');
const test = require('node:test');
const Backup = require('../backup-portability.js');
const { MockDriveBackupAdapter } = require('./support/mock-drive-backup-adapter.js');

const passphrase = 'synthetic-only drive recovery passphrase';
const ownerA = 'synthetic-drive-owner-a';
const ownerB = 'synthetic-drive-owner-b';
const ownerScope = owner => Backup.sha256(`carteira-investimentos-backup-owner-v1:${owner}`);

async function temporaryRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'v1051-mock-drive-'));
}

async function encryptedBackup(ownerId = ownerA, createdAt = '2026-06-01T12:00:00.000Z') {
  const state = {
    wallets: [{ id: 'synthetic-wallet-1', name: 'Fixture wallet', balance: 481.25 }],
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
  const backup = await Backup.createBackup({ state, config: {}, ownerId, createdAt });
  return { state: backup.payload.state, backup, envelope: await Backup.encryptBackup(backup, passphrase, { cryptoProvider: webcrypto }) };
}

test('V1051 mock Drive stores encrypted immutable versions and retries idempotently', async t => {
  const root = await temporaryRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const scope = await ownerScope(ownerA);
  const adapter = new MockDriveBackupAdapter(root);
  const first = await encryptedBackup();
  const uploaded = await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'run-1', ownerScope: scope, envelope: first.envelope });
  const replay = await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'run-1', ownerScope: scope, envelope: first.envelope });
  const duplicate = await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'retry-with-new-operation-key', ownerScope: scope, envelope: first.envelope });
  const download = await adapter.download(uploaded.fileId, { ownerScope: scope });
  const second = await encryptedBackup(ownerA, '2026-07-01T12:00:00.000Z');
  const next = await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'run-2', ownerScope: scope, envelope: second.envelope });
  const versions = await adapter.listVersions({ backupKey: 'synthetic-wallet', ownerScope: scope });
  const storedObject = await fs.readFile(await adapter.objectPathForTest(uploaded.fileId), 'utf8');

  assert.equal(uploaded.version, 1);
  assert.equal(replay.fileId, uploaded.fileId);
  assert.equal(replay.replayed, true);
  assert.equal(duplicate.fileId, uploaded.fileId);
  assert.equal(duplicate.replayed, true);
  assert.deepEqual(download.envelope, first.envelope);
  assert.equal(next.version, 2);
  assert.deepEqual(versions.versions.map(row => row.version), [2, 1]);
  assert.equal(storedObject.includes('SYNTH3'), false);
  const concurrent = await Promise.all([1, 2].map(() => adapter.upload({ backupKey: 'concurrent-wallet', idempotencyKey: 'same-concurrent-run', ownerScope: scope, envelope: first.envelope })));
  assert.equal(concurrent[0].fileId, concurrent[1].fileId);
  assert.equal((await adapter.listVersions({ backupKey: 'concurrent-wallet', ownerScope: scope })).versions.length, 1);
});

test('V1051 mock Drive isolates owners and rejects an idempotency-key content conflict', async t => {
  const root = await temporaryRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const adapter = new MockDriveBackupAdapter(root);
  const a = await encryptedBackup(ownerA);
  const b = await encryptedBackup(ownerB);
  const scopeA = await ownerScope(ownerA);
  const scopeB = await ownerScope(ownerB);
  const uploaded = await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'same-run', ownerScope: scopeA, envelope: a.envelope });

  assert.deepEqual((await adapter.listVersions({ backupKey: 'synthetic-wallet', ownerScope: scopeB })).versions, []);
  adapter.failNext('download', 'NETWORK_ERROR');
  await assert.rejects(() => adapter.download(uploaded.fileId, { ownerScope: scopeA }), { code: 'NETWORK_ERROR' });
  await assert.rejects(() => adapter.download(uploaded.fileId, { ownerScope: scopeB }), { code: 'NOT_FOUND' });
  await assert.rejects(() => adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'same-run', ownerScope: scopeA, envelope: b.envelope }), { code: 'IDEMPOTENCY_CONFLICT' });
  const isolated = await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'same-run', ownerScope: scopeB, envelope: b.envelope });
  assert.notEqual(isolated.fileId, uploaded.fileId);
  assert.equal((await adapter.listVersions({ backupKey: 'synthetic-wallet', ownerScope: scopeB })).versions.length, 1);
});

test('V1051 mock Drive fails closed on auth/network/interrupted uploads and leaves no partial object', async t => {
  const root = await temporaryRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const adapter = new MockDriveBackupAdapter(root);
  const { envelope } = await encryptedBackup();
  const scope = await ownerScope(ownerA);
  await assert.rejects(() => adapter.listVersions({ backupKey: 'synthetic-wallet', ownerScope: scope, authenticated: false }), { code: 'AUTH_REQUIRED' });
  adapter.failNext('upload', 'NETWORK_ERROR');
  await assert.rejects(() => adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'retry', ownerScope: scope, envelope }), { code: 'NETWORK_ERROR' });
  adapter.failNext('upload', 'UPLOAD_INTERRUPTED');
  await assert.rejects(() => adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'retry', ownerScope: scope, envelope }), { code: 'UPLOAD_INTERRUPTED' });
  assert.deepEqual(await fs.readdir(path.join(root, 'objects')), []);

  const retry = await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'retry', ownerScope: scope, envelope });
  assert.equal(retry.version, 1);
  assert.equal((await adapter.listVersions({ backupKey: 'synthetic-wallet', ownerScope: scope })).versions.length, 1);
});

test('V1051 mock Drive detects corrupt and incompatible encrypted files', async t => {
  const root = await temporaryRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const adapter = new MockDriveBackupAdapter(root);
  const scope = await ownerScope(ownerA);
  const { envelope } = await encryptedBackup();
  await assert.rejects(() => adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'plain', ownerScope: scope, envelope: { format: 'plain-json' } }), { code: 'UNSUPPORTED_ENCRYPTED_BACKUP' });
  const uploaded = await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'corrupt', ownerScope: scope, envelope });
  const later = await encryptedBackup(ownerA, '2026-07-01T12:00:00.000Z');
  const corruptVersion = await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'corrupt-later', ownerScope: scope, envelope: later.envelope });
  const objectPath = await adapter.objectPathForTest(corruptVersion.fileId);
  const stored = JSON.parse(await fs.readFile(objectPath, 'utf8'));
  stored.envelope.ciphertext = stored.envelope.ciphertext.slice(0, -4) + 'AAAA';
  await fs.writeFile(objectPath, JSON.stringify(stored));

  assert.equal((await adapter.listVersions({ backupKey: 'synthetic-wallet', ownerScope: scope })).versions[0].integrity, 'CORRUPT');
  await assert.rejects(() => adapter.download(corruptVersion.fileId, { ownerScope: scope }), { code: 'FILE_CORRUPT' });
  const retention = await adapter.planRetention({ backupKey: 'synthetic-wallet', ownerScope: scope, keepLatest: 1 });
  assert.deepEqual(retention.keepFileIds, [corruptVersion.fileId, uploaded.fileId]);
  assert.deepEqual(retention.deleteFileIds, []);
  const malformedEnvelope = await encryptedBackup(ownerA, '2026-08-01T12:00:00.000Z');
  const malformed = await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'malformed-metadata', ownerScope: scope, envelope: malformedEnvelope.envelope });
  await fs.writeFile(await adapter.objectPathForTest(malformed.fileId), '{broken-json');
  const listing = await adapter.listVersions({ backupKey: 'synthetic-wallet', ownerScope: scope });
  assert.deepEqual(listing.versions.map(row => row.fileId), [corruptVersion.fileId, uploaded.fileId]);
  assert.deepEqual(listing.warnings, ['UNSCOPED_CORRUPT_METADATA']);
  const safeRetention = await adapter.planRetention({ backupKey: 'synthetic-wallet', ownerScope: scope, keepLatest: 1 });
  assert.deepEqual(safeRetention.deleteFileIds, []);
  assert.deepEqual(safeRetention.warnings, ['UNSCOPED_CORRUPT_METADATA']);
});

test('V1051 mock Drive rejects linked roots and object directories', async t => {
  const realRoot = await temporaryRoot();
  const linkedRoot = path.join(os.tmpdir(), `v1051-mock-drive-${randomUUID()}`);
  const objectsRoot = await temporaryRoot();
  t.after(async () => {
    await fs.rm(linkedRoot, { recursive: true, force: true });
    await fs.rm(realRoot, { recursive: true, force: true });
    await fs.rm(objectsRoot, { recursive: true, force: true });
  });
  await fs.symlink(realRoot, linkedRoot, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => new MockDriveBackupAdapter(linkedRoot), { code: 'MOCK_STORAGE_MUST_USE_REAL_TEMP_DIRECTORY' });
  await fs.symlink(objectsRoot, path.join(realRoot, 'objects'), process.platform === 'win32' ? 'junction' : 'dir');
  const adapter = new MockDriveBackupAdapter(realRoot);
  const scope = await ownerScope(ownerA);
  await assert.rejects(() => adapter.listVersions({ backupKey: 'synthetic-wallet', ownerScope: scope }), { code: 'MOCK_STORAGE_MUST_USE_REAL_TEMP_DIRECTORY' });
});

test('V1051 mock Drive propagates storage read failures and distinguishes corrupt from missing files', async t => {
  const root = await temporaryRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const adapter = new MockDriveBackupAdapter(root);
  const scope = await ownerScope(ownerA);
  const { envelope } = await encryptedBackup();
  const uploaded = await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'read-failure', ownerScope: scope, envelope });
  const objectPath = await adapter.objectPathForTest(uploaded.fileId);
  const originalReadFile = fs.readFile;
  fs.readFile = async (file, ...args) => {
    if (path.resolve(file) === path.resolve(objectPath)) throw Object.assign(new Error('synthetic storage failure'), { code: 'EIO' });
    return originalReadFile.call(fs, file, ...args);
  };
  try {
    await assert.rejects(() => adapter.download(uploaded.fileId, { ownerScope: scope }), { code: 'EIO' });
    await assert.rejects(() => adapter.listVersions({ backupKey: 'synthetic-wallet', ownerScope: scope }), { code: 'EIO' });
  } finally { fs.readFile = originalReadFile; }

  await assert.rejects(() => adapter.download(randomUUID(), { ownerScope: scope }), { code: 'NOT_FOUND' });
  const malformed = await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'malformed-download', ownerScope: scope, envelope });
  await fs.writeFile(await adapter.objectPathForTest(malformed.fileId), '{broken-json');
  await assert.rejects(() => adapter.download(malformed.fileId, { ownerScope: scope }), { code: 'FILE_CORRUPT' });
});

test('V1051 mock retention plans first and deletes only after explicit confirmation', async t => {
  const root = await temporaryRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const adapter = new MockDriveBackupAdapter(root);
  const scope = await ownerScope(ownerA);
  for (let index = 1; index <= 3; index += 1) {
    const { envelope } = await encryptedBackup(ownerA, `2026-0${index}-01T12:00:00.000Z`);
    await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: `retention-${index}`, ownerScope: scope, envelope });
  }
  const plan = await adapter.planRetention({ backupKey: 'synthetic-wallet', ownerScope: scope, keepLatest: 2 });
  assert.equal(plan.deleteFileIds.length, 1);
  await assert.rejects(() => adapter.applyRetention(plan, { confirm: false, ownerScope: scope }), { code: 'CONFIRMATION_REQUIRED' });
  assert.equal((await adapter.listVersions({ backupKey: 'synthetic-wallet', ownerScope: scope })).versions.length, 3);
  assert.deepEqual(await adapter.applyRetention(plan, { confirm: true, ownerScope: scope }), plan.deleteFileIds);
  assert.deepEqual((await adapter.listVersions({ backupKey: 'synthetic-wallet', ownerScope: scope })).versions.map(row => row.version), [3, 2]);
});

test('V1051 synthetic recovery downloads from mock storage in a clean process without browser storage', async t => {
  const root = await temporaryRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let source = await encryptedBackup();
  const scope = await ownerScope(ownerA);
  const adapter = new MockDriveBackupAdapter(root);
  const uploaded = await adapter.upload({ backupKey: 'synthetic-wallet', idempotencyKey: 'recovery-run', ownerScope: scope, envelope: source.envelope });
  source = null;
  const childScript = String.raw`
    const { webcrypto } = require('node:crypto');
    const Backup = require(process.argv[1]);
    const { MockDriveBackupAdapter } = require(process.argv[2]);
    Object.defineProperty(globalThis, 'indexedDB', { value: undefined, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true });
    (async () => {
      const adapter = new MockDriveBackupAdapter(process.argv[3]);
      const { envelope } = await adapter.download(process.argv[4], { ownerScope: process.env.V1051_OWNER_SCOPE });
      const backup = await Backup.decryptBackup(envelope, process.env.V1051_PASSPHRASE, { cryptoProvider: webcrypto });
      const ownerId = process.env.V1051_OWNER_ID;
      const integrity = await Backup.verifyBackup(backup, { ownerId });
      if (integrity.status !== 'SUPPORTED') throw Object.assign(new Error('INTEGRITY_REJECTED'), { code: integrity.status });
      const empty = { wallets: [], activeWalletId: 'synthetic-wallet-1', assets: [], aportes: [], proventos: [], rfEvents: [], goals: { synthetic: { target: 1000 } }, performance: { schemaVersion: 1, valuationSnapshots: { snapshots: [] }, externalCashFlows: { flows: [] } } };
      const preview = await Backup.previewRestore(backup, empty, { ownerId });
      if (!preview.restoreAllowed) throw new Error('CLEAN_RESTORE_BLOCKED');
      const applied = Backup.applyToIsolatedStore({ state: empty, config: {} }, integrity.backup);
      if (!applied.ok || applied.rollback) throw new Error('ISOLATED_APPLY_FAILED');
      const beforeSha = await Backup.sha256(Backup.canonical(empty));
      const stateSha = await Backup.sha256(Backup.canonical(integrity.backup.payload.state));
      const restoredSha = await Backup.sha256(Backup.canonical(applied.store.state));
      const restored = applied.store.state;
      process.stdout.write(JSON.stringify({ integrity: integrity.status, stateSha, restoredSha, beforeSha, indexedDBAvailable: typeof indexedDB !== 'undefined', localStorageAvailable: typeof localStorage !== 'undefined', counts: Object.fromEntries(['wallets', 'assets', 'aportes', 'proventos', 'rfEvents'].map(key => [key, restored[key].length])), financialSummary: { assetQuantity: restored.assets.reduce((sum, row) => sum + row.qty, 0), buys: restored.aportes.filter(row => row.side === 'BUY').reduce((sum, row) => sum + row.value, 0), sells: restored.aportes.filter(row => row.side === 'SELL').reduce((sum, row) => sum + row.value, 0), received: restored.proventos.filter(row => row.status === 'PAID').reduce((sum, row) => sum + row.value, 0), balance: restored.wallets[0].balance }, writes: preview.writeCount }));
    })().catch(error => { process.stderr.write(error.code || error.message); process.exitCode = 1; });
  `;
  const child = spawnSync(process.execPath, ['-e', childScript, path.resolve(__dirname, '../backup-portability.js'), path.resolve(__dirname, 'support/mock-drive-backup-adapter.js'), root, uploaded.fileId], {
    encoding: 'utf8', windowsHide: true, env: { ...process.env, V1051_PASSPHRASE: passphrase, V1051_OWNER_ID: ownerA, V1051_OWNER_SCOPE: scope }
  });
  assert.equal(child.status, 0, child.stderr);
  const report = JSON.parse(child.stdout);
  assert.equal(report.integrity, 'SUPPORTED');
  assert.equal(report.stateSha, report.restoredSha);
  assert.notEqual(report.beforeSha, report.stateSha);
  assert.equal(report.indexedDBAvailable, false);
  assert.equal(report.localStorageAvailable, false);
  assert.deepEqual(report.counts, { wallets: 1, assets: 1, aportes: 2, proventos: 1, rfEvents: 1 });
  assert.deepEqual(report.financialSummary, { assetQuantity: 3, buys: 450, sells: 200, received: 1.25, balance: 481.25 });
  assert.ok(report.writes > 0);
});
