const test = require('node:test');
const assert = require('node:assert/strict');
const Backup = require('../backup-portability.js');

function fixtureState() {
  return {
    wallets: [{ id: 'w1', name: 'Principal' }],
    activeWalletId: 'w1',
    assets: [{ id: 'a1', ticker: 'ABCD3', qty: 10, current_price: 12.34 }],
    aportes: [{ id: 'm1', date: '2026-01-02', value: 1000 }],
    proventos: [{ id: 'i1', date: '2026-02-03', value: 12.5, type: 'DIVIDEND' }],
    rfEvents: [{ id: 'rf1', value: 5000, manual: true }],
    goals: { patrimonio: { target: 100000 } },
    brapiToken: 'must-not-leak'
  };
}

test('V249 creates versioned manifest with deterministic payload and no auth material', async () => {
  const a = await Backup.createBackup({ state: fixtureState(), config: { divGoal: 42 }, createdAt: '2026-09-20T12:00:00.000Z' });
  const b = await Backup.createBackup({ state: fixtureState(), config: { divGoal: 42 }, createdAt: '2026-09-20T13:00:00.000Z' });
  assert.equal(a.manifest.backupFormat, 'carteira-investimentos-backup');
  assert.equal(a.manifest.backupVersion, '1.0');
  assert.equal(a.manifest.checksums.payload, b.manifest.checksums.payload);
  assert.equal(JSON.stringify(a.payload), JSON.stringify(b.payload));
  assert.equal(JSON.stringify(a).includes('must-not-leak'), false);
  assert.equal(a.manifest.contentInventory.includes('auth'), false);
  assert.equal(a.manifest.recordCounts.assets, 1);
});

test('V249 verifies supported, too-new and corrupted backups', async () => {
  const backup = await Backup.createBackup({ state: fixtureState(), config: {} });
  assert.equal((await Backup.verifyBackup(backup)).status, 'SUPPORTED');
  assert.equal((await Backup.verifyBackup({ ...backup, manifest: { ...backup.manifest, backupVersion: '9.0' } })).status, 'TOO_NEW');
  const corrupted = { ...backup, payload: { ...backup.payload, state: { ...backup.payload.state, assets: [] } } };
  assert.equal((await Backup.verifyBackup(corrupted)).status, 'CORRUPTED');
});

test('V249 builds a no-write preview with safe adds, updates and conflicts', async () => {
  const backup = await Backup.createBackup({ state: fixtureState(), config: {} });
  const current = { ...fixtureState(), assets: [{ ...fixtureState().assets[0], qty: 8 }] };
  const preview = await Backup.previewRestore(backup, current);
  assert.equal(preview.integrity.status, 'SUPPORTED');
  assert.equal(preview.writeCount, 0);
  assert.equal(preview.diff.some(item => item.kind === 'CONFLICT'), true);
  assert.equal(preview.restoreAllowed, false);
});

test('V249 preserves unknown values and rejects dangerous or malformed input', async () => {
  const unknown = await Backup.createBackup({ state: { ...fixtureState(), assets: [{ id: 'a1', ticker: 'ABCD3', qty: null, current_price: null }] }, config: {} });
  assert.equal(unknown.payload.state.assets[0].qty, null);
  await assert.rejects(() => Backup.parseBackup('{"__proto__":{"polluted":true}}'));
  await assert.rejects(() => Backup.parseBackup('{"manifest":{},"payload":{}}'));
});

test('V249 blocks duplicate identities, invalid dates and count tampering', async () => {
  const backup = await Backup.createBackup({ state: fixtureState(), config: {} });
  const duplicate = JSON.parse(JSON.stringify(backup));
  duplicate.payload.state.assets.push({ ...duplicate.payload.state.assets[0] });
  duplicate.manifest.checksums.payload = await (async () => {
    const hash = await import('node:crypto');
    return hash.createHash('sha256').update(Backup.canonical(duplicate.payload), 'utf8').digest('hex');
  })();
  assert.equal((await Backup.verifyBackup(duplicate)).error.startsWith('DUPLICATE_ID'), true);
  const badDate = JSON.parse(JSON.stringify(backup));
  badDate.payload.state.aportes[0].date = 'not-a-date';
  badDate.manifest.checksums.payload = (await import('node:crypto')).createHash('sha256').update(Backup.canonical(badDate.payload), 'utf8').digest('hex');
  assert.equal((await Backup.verifyBackup(badDate)).error.startsWith('INVALID_DATE'), true);
  const badCount = JSON.parse(JSON.stringify(backup));
  badCount.manifest.recordCounts.assets = 99;
  assert.equal((await Backup.verifyBackup(badCount)).status, 'CORRUPTED');
});

test('V249 isolated apply is idempotent and rolls back after injected failure', async () => {
  const backup = await Backup.createBackup({ state: fixtureState(), config: {} });
  const store = { state: { wallets: [] }, config: {} };
  const applied = Backup.applyToIsolatedStore(store, backup);
  assert.equal(applied.ok, true);
  const again = Backup.previewRestore(backup, applied.store.state);
  assert.equal((await again).diff.every(item => item.kind === 'UNCHANGED'), true);
  const before = JSON.stringify(applied.store);
  const failed = Backup.applyToIsolatedStore(applied.store, backup, { failAfter: 1 });
  assert.equal(failed.ok, false);
  assert.equal(JSON.stringify(failed.store), before);
});

test('V249 handles a large sanitized history with bounded linear operations', async () => {
  const state = { ...fixtureState(), assets: Array.from({ length: 3000 }, (_, index) => ({ id: `asset-${index}`, ticker: `A${index}`, qty: index + 1 })) };
  const started = Date.now();
  const backup = await Backup.createBackup({ state, config: {} });
  const parsed = await Backup.verifyBackup(backup);
  const preview = await Backup.previewRestore(backup, state);
  const elapsed = Date.now() - started;
  assert.equal(parsed.status, 'SUPPORTED');
  assert.equal(preview.diff.every(item => item.kind === 'UNCHANGED'), true);
  assert.equal(backup.manifest.recordCounts.assets, 3000);
  assert.ok(elapsed < 5000, `large fixture took ${elapsed}ms`);
});
