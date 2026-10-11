'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { webcrypto } = require('node:crypto');
const { test } = require('node:test');
const Backup = require('../backup-portability.js');

const passphrase = 'synthetic-only passphrase 2026';
const payload = {
  marker: 'SYNTHETIC_BACKUP_SENTINEL',
  wallets: [{ id: 'synthetic-wallet-1', balance: 12345 }],
};

test('encrypted backup roundtrips without exposing plaintext', async () => {
  const encrypted = await Backup.encryptBackup(payload, passphrase, { cryptoProvider: webcrypto });

  assert.equal(encrypted.format, 'carteira-investimentos-backup-encrypted');
  assert.equal(encrypted.version, 1);
  assert.equal(JSON.stringify(encrypted).includes(payload.marker), false);
  assert.deepEqual(await Backup.decryptBackup(encrypted, passphrase, { cryptoProvider: webcrypto }), payload);
});

test('encrypted backup uses a fresh salt and IV for each export', async () => {
  const [first, second] = await Promise.all([
    Backup.encryptBackup(payload, passphrase, { cryptoProvider: webcrypto }),
    Backup.encryptBackup(payload, passphrase, { cryptoProvider: webcrypto }),
  ]);

  assert.notEqual(first.kdf.salt, second.kdf.salt);
  assert.notEqual(first.cipher.iv, second.cipher.iv);
});

test('encrypted backup rejects wrong passphrase and tampering', async () => {
  const encrypted = await Backup.encryptBackup(payload, passphrase, { cryptoProvider: webcrypto });

  await assert.rejects(
    Backup.decryptBackup(encrypted, 'different synthetic passphrase', { cryptoProvider: webcrypto }),
    /DECRYPTION_FAILED/,
  );

  const tampered = structuredClone(encrypted);
  tampered.ciphertext = tampered.ciphertext.slice(0, -4) + 'AAAA';
  await assert.rejects(
    Backup.decryptBackup(tampered, passphrase, { cryptoProvider: webcrypto }),
    /DECRYPTION_FAILED/,
  );
});

test('encrypted backup rejects weak passwords and unsupported envelopes', async () => {
  await assert.rejects(
    Backup.encryptBackup(payload, 'short', { cryptoProvider: webcrypto }),
    /PASSPHRASE_TOO_SHORT/,
  );
  await assert.rejects(
    Backup.decryptBackup({ format: 'unknown' }, passphrase, { cryptoProvider: webcrypto }),
    /UNSUPPORTED_ENCRYPTED_BACKUP/,
  );
});

test('encrypted external file restores synthetic wallet in a fresh process without browser storage', async () => {
  const sourceState = {
    wallets: [{ id: 'synthetic-wallet-1', name: 'Fixture wallet' }],
    activeWalletId: 'synthetic-wallet-1',
    assets: [{ id: 'synthetic-asset-1', ticker: 'SYNTH3', type: 'Ação', qty: 7, current_price: 12.5 }],
    aportes: [{ id: 'synthetic-movement-1', date: '2026-01-15', value: 87.5 }],
    proventos: [{ id: 'synthetic-income-1', date: '2026-02-10', value: 2.5, status: 'PAID' }],
    rfEvents: [],
    goals: { synthetic: { target: 1000 } },
    performance: { schemaVersion: 1, valuationSnapshots: { snapshots: [] }, externalCashFlows: { flows: [] } },
  };
  const ownerId = 'synthetic-owner-a';
  const backup = await Backup.createBackup({ state: sourceState, config: {}, ownerId, createdAt: '2026-03-01T00:00:00.000Z' });
  const encrypted = await Backup.encryptBackup(backup, passphrase, { cryptoProvider: webcrypto });
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'v1006-synthetic-recovery-'));
  const artifactPath = path.join(tempRoot, 'carteira-backup-protegido-v1-2026-03.json');
  fs.writeFileSync(artifactPath, JSON.stringify(encrypted), 'utf8');

  const childScript = String.raw`
    const fs = require('node:fs');
    const { webcrypto } = require('node:crypto');
    const Backup = require(process.argv[1]);
    Object.defineProperty(globalThis, 'indexedDB', { value: undefined, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true });
    (async () => {
      const envelope = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
      const backup = await Backup.decryptBackup(envelope, process.argv[3], { cryptoProvider: webcrypto });
      const ownerId = process.argv[4];
      const integrity = await Backup.verifyBackup(backup, { ownerId, supportedAssetTypes: ['Ação'] });
      if (integrity.status !== 'SUPPORTED') throw new Error('INTEGRITY_REJECTED:' + integrity.status);
      const empty = { wallets: [], activeWalletId: 'synthetic-wallet-1', assets: [], aportes: [], proventos: [], rfEvents: [], goals: { synthetic: { target: 1000 } }, performance: { schemaVersion: 1, valuationSnapshots: { snapshots: [] }, externalCashFlows: { flows: [] } } };
      const beforeSha = await Backup.sha256(Backup.canonical(empty));
      const sourceSha = await Backup.sha256(Backup.canonical(integrity.backup.payload.state));
      const preview = await Backup.previewRestore(backup, empty, { ownerId, supportedAssetTypes: ['Ação'] });
      if (!preview.restoreAllowed) throw new Error('CLEAN_RESTORE_BLOCKED:' + preview.integrity.status);
      const applied = Backup.applyToIsolatedStore({ state: empty, config: {} }, integrity.backup);
      if (!applied.ok || applied.rollback) throw new Error('ISOLATED_APPLY_FAILED');
      const restoredSha = await Backup.sha256(Backup.canonical(applied.store.state));
      process.stdout.write(JSON.stringify({
        integrity: integrity.status,
        ownerBound: Boolean(integrity.backup.payload.metadata.ownerScope),
        indexedDbAvailable: typeof indexedDB !== 'undefined',
        localStorageAvailable: typeof localStorage !== 'undefined',
        sourceManifestSha: integrity.backup.manifest.checksums.payload,
        sourceStateSha: sourceSha,
        restoredStateSha: restoredSha,
        beforeStateSha: beforeSha,
        restoredCounts: Object.fromEntries(['wallets', 'assets', 'aportes', 'proventos', 'rfEvents'].map(key => [key, applied.store.state[key].length])),
        requiredDomains: integrity.backup.manifest.domains.filter(domain => domain.required).map(domain => domain.name),
        previewWriteCount: preview.writeCount,
        storeRollback: applied.rollback
      }));
    })().catch(error => { process.stderr.write(error.stack || String(error)); process.exitCode = 1; });
  `;

  try {
    const child = spawnSync(process.execPath, ['-e', childScript, path.resolve(__dirname, '../backup-portability.js'), artifactPath, passphrase, ownerId], { encoding: 'utf8', windowsHide: true });
    assert.equal(child.status, 0, child.stderr);
    const report = JSON.parse(child.stdout);
    assert.equal(report.integrity, 'SUPPORTED');
    assert.equal(report.ownerBound, true);
    assert.equal(report.indexedDbAvailable, false);
    assert.equal(report.localStorageAvailable, false);
    assert.notEqual(report.beforeStateSha, report.sourceStateSha);
    assert.equal(report.restoredStateSha, report.sourceStateSha);
    assert.deepEqual(report.restoredCounts, { wallets: 1, assets: 1, aportes: 1, proventos: 1, rfEvents: 0 });
    assert.deepEqual(report.requiredDomains, ['portfolio', 'assets', 'transactions', 'income', 'fixedIncome', 'goals', 'settings', 'performance']);
    assert.equal(report.previewWriteCount, 4);
    assert.equal(report.storeRollback, false);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('recovery preview rejects a different owner and existing identity conflict without applying data', async () => {
  const state = {
    wallets: [{ id: 'synthetic-wallet-1', name: 'Fixture wallet' }],
    activeWalletId: 'synthetic-wallet-1',
    assets: [{ id: 'synthetic-asset-1', ticker: 'SYNTH3', type: 'Ação', qty: 7 }],
    aportes: [], proventos: [], rfEvents: [], goals: {},
    performance: { schemaVersion: 1, valuationSnapshots: { snapshots: [] }, externalCashFlows: { flows: [] } },
  };
  const backup = await Backup.createBackup({ state, config: {}, ownerId: 'synthetic-owner-a' });
  const wrongOwner = await Backup.previewRestore(backup, {}, { ownerId: 'synthetic-owner-b' });
  assert.equal(wrongOwner.integrity.status, 'OWNER_MISMATCH');
  assert.equal(wrongOwner.restoreAllowed, false);

  const existing = { ...state, assets: [{ ...state.assets[0], ticker: 'OTHER3' }] };
  const before = Backup.canonical(existing);
  const conflict = await Backup.previewRestore(backup, existing, { ownerId: 'synthetic-owner-a' });
  assert.equal(conflict.restoreAllowed, false);
  assert.ok(conflict.conflicts.some(item => item.reason === 'IDENTITY_FIELD_CHANGED'));
  assert.equal(Backup.canonical(existing), before);
});

test('backup UI encrypts downloads and decrypts before existing validation', () => {
  const fs = require('node:fs');
  const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  const exportStart = html.indexOf('async function exportBackup(){');
  const exportEnd = html.indexOf('function v324PeriodicBackupEligible(){', exportStart);
  const exportSource = html.slice(exportStart, exportEnd);
  const importStart = html.indexOf("document.getElementById('imp-file').addEventListener('change'");
  const importSource = html.slice(importStart, importStart + 2600);

  assert.notEqual(exportStart, -1);
  assert.match(exportSource, /BackupPortability\.encryptBackup\(payload,passphrase\)/);
  assert.match(exportSource, /backup-encryption-passphrase/);
  assert.match(exportSource, /backup-encryption-confirm/);
  assert.match(importSource, /await BackupPortability\.decryptBackup\(d,passphrase\)/);
  assert.ok(importSource.indexOf('decryptBackup') < importSource.indexOf('verifyBackup'));
  assert.match(html, /\.backup-encryption-fields\{grid-template-columns:1fr!important\}/);
  assert.match(html, /Histórico local neste navegador não recebe esta criptografia/);
});
