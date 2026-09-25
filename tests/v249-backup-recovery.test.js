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
  assert.equal(a.manifest.backupVersion, '1.1');
  assert.equal(a.manifest.checksums.payload, b.manifest.checksums.payload);
  assert.equal(JSON.stringify(a.payload), JSON.stringify(b.payload));
  assert.equal(JSON.stringify(a).includes('must-not-leak'), false);
  assert.equal(a.manifest.contentInventory.includes('auth'), false);
  assert.equal(a.manifest.recordCounts.assets, 1);
  // Enhanced V267 manifest fields
  assert.ok(a.manifest.operationId);
  assert.ok(a.manifest.exportedBy);
  assert.ok(a.manifest.schemaIdentifiers.stateSchema === 'backup-portability-v1.1');
  assert.ok(a.manifest.compatibility);
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
  // Current state has different qty for asset a1 -> this is an UPDATE
  const current = { ...fixtureState(), assets: [{ ...fixtureState().assets[0], qty: 8 }] };
  const preview = await Backup.previewRestore(backup, current);
  assert.equal(preview.integrity.status, 'SUPPORTED');
  // With qty difference, it's an UPDATE, so writeCount = 1
  assert.equal(preview.writeCount, 1);
  assert.equal(preview.diff.some(item => item.kind === 'CONFLICT'), false);
  assert.equal(preview.diff.some(item => item.kind === 'UPDATE'), true);
  // Restore allowed when no conflicts
  assert.equal(preview.restoreAllowed, true);
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

test('V249 accepts known Brazilian legacy contribution dates and normalizes the financial day', async () => {
  const created = await Backup.createBackup({ state: { ...fixtureState(), aportes: [
    { id: 'legacy', date: '02/01/2026', value: 1000 },
    { id: 'canonical', date: '2026-01-03', value: 500 }
  ] }, config: {} });
  const backup = JSON.parse(JSON.stringify(created));
  backup.payload.state.aportes.find(row => row.id === 'legacy').date = '02/01/2026';
  backup.manifest.checksums.payload = (await import('node:crypto')).createHash('sha256').update(Backup.canonical(backup.payload), 'utf8').digest('hex');
  const parsed = await Backup.verifyBackup(backup);
  assert.equal(parsed.status, 'SUPPORTED');
  assert.equal(parsed.backup.payload.state.aportes.find(row => row.id === 'legacy').date, '2026-01-02');
  assert.equal(parsed.backup.payload.state.aportes.find(row => row.id === 'canonical').date, '2026-01-03');
});

test('V249 rejects impossible legacy dates without timezone coercion', async () => {
  const backup = await Backup.createBackup({ state: { ...fixtureState(), aportes: [{ id: 'bad', date: '31/02/2025', value: 1000 }] }, config: {} });
  const result = await Backup.verifyBackup(backup);
  assert.equal(result.error, 'INVALID_DATE:aportes:date');
  const canonical = await Backup.createBackup({ state: { ...fixtureState(), aportes: [{ id: 'day', date: '2025-01-01', value: 1000 }] }, config: {} });
  const checked = await Backup.verifyBackup(canonical);
  assert.equal(checked.backup.payload.state.aportes[0].date, '2025-01-01');
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
