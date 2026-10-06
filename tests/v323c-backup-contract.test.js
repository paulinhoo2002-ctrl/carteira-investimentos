const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Backup = require('../backup-portability.js');
const Persistence = require('../persistence-core.js');
const PublicEvents = require('../public-events-store.js');
const RuntimeStores = require('../portfolio-runtime-stores.js');

function fixtureState(overrides = {}) {
  return Persistence.buildBackupState({
    wallets: [{ id: 'wallet-1', name: 'Synthetic' }],
    activeWalletId: 'wallet-1',
    assets: [
      { id: 'asset-1', ticker: 'SYN1', type: 'Ação', qty: 2, avg_price: 10, current_price: 11 },
      { id: 'rf-asset-1', ticker: 'SYN-RF', type: 'Renda Fixa', qty: 1, rf_applied_value: 1000 }
    ],
    aportes: [{ id: 'movement-1', date: '2026-01-02', ticker: 'SYN1', qty: 2, price: 10, operation: 'compra' }],
    proventos: [{ id: 'income-1', date: '2026-02-03', ticker: 'SYN1', type: 'Dividendo', value: 3.5, source: 'synthetic' }],
    rfEvents: [{ id: 'rf-event-1', assetId: 'rf-asset-1', date: '2026-02-04', type: 'APPLICATION', amountCents: 100000, authority: 'MANUAL' }],
    goals: { patrimonio: { target: 10000 } },
    ...overrides
  });
}

async function makeBackup(state = fixtureState(), config = { divGoal: 0 }) {
  const clock = () => Date.parse('2026-10-05T12:00:00.000Z');
  return Backup.createBackup({
    state,
    config,
    runtime: RuntimeStores.backupSupplement({ snapshots: RuntimeStores.emptySnapshotStore(clock), flows: RuntimeStores.emptyFlowStore(clock) }),
    metadata: { source: 'synthetic-v323c' },
    createdAt: '2026-10-05T12:00:00.000Z',
    appVersion: 'v323c-test'
  });
}

async function resealManifest(backup) {
  const { checksums = {}, ...manifest } = backup.manifest;
  backup.manifest.checksums.manifest = await Backup.sha256(Backup.canonical({
    ...manifest,
    checksums: { algorithm: checksums.algorithm, payload: checksums.payload }
  }));
}

test('V323C manifest declares canonical domains and separates empty from missing', async () => {
  const state = fixtureState({ assets: [] });
  const backup = await makeBackup(state);
  assert.equal(backup.manifest.format, Backup.FORMAT);
  assert.equal(backup.manifest.schemaVersion, 2);
  assert.ok(backup.manifest.createdAt);
  assert.ok(backup.manifest.appVersion);
  for (const name of ['portfolio', 'assets', 'transactions', 'income', 'fixedIncome', 'goals', 'settings']) {
    const domain = backup.manifest.domains.find(item => item.name === name);
    assert.ok(domain);
    assert.equal(domain.required, true);
    assert.ok(domain.version);
    assert.equal(typeof domain.count, 'number');
  }
  const performance = backup.manifest.domains.find(item => item.name === 'performance');
  assert.equal(performance.required, false);
  assert.equal(performance.count, 0);
  assert.deepEqual(backup.manifest.domains.find(item => item.name === 'assets'), {
    name: 'assets', version: '1', count: 0, required: true, present: true
  });
  assert.equal((await Backup.verifyBackup(backup)).status, 'VALID');

  const partial = await makeBackup({ ...fixtureState(), assets: undefined });
  assert.equal(partial.manifest.domains.find(item => item.name === 'assets').present, false);
  assert.equal(partial.manifest.domains.find(item => item.name === 'assets').count, null);
  assert.equal((await Backup.verifyBackup(partial)).status, 'PARTIAL');
  assert.equal((await Backup.previewRestore(partial, {})).restoreAllowed, false);
});

test('V323C rejects future schema and migrates complete supported v1 backups explicitly', async () => {
  const future = await makeBackup();
  future.manifest.schemaVersion = 3;
  assert.equal((await Backup.verifyBackup(future)).status, 'UNSUPPORTED_FUTURE_SCHEMA');
  assert.equal((await Backup.previewRestore(future, {})).restoreAllowed, false);

  const old = await makeBackup();
  old.manifest.schemaVersion = 1;
  old.manifest.backupVersion = '1.1';
  old.manifest.schemaIdentifiers.stateSchema = 'backup-portability-v1.1';
  old.manifest.recordCounts = {
    wallets: old.payload.state.wallets.length,
    assets: old.payload.state.assets.length,
    transactions: old.payload.state.aportes.length,
    income: old.payload.state.proventos.length,
    fixedIncome: old.payload.state.rfEvents.length,
    goals: Object.keys(old.payload.state.goals).length
  };
  delete old.manifest.domains;
  delete old.manifest.checksums.manifest;
  const migrated = await Backup.verifyBackup(old);
  assert.equal(migrated.status, 'VALID');
  assert.equal(migrated.migratedFrom, 1);
  assert.equal((await Backup.previewRestore(old, {}).then(result => result.restoreAllowed)), true);
});

test('V323C rejects unsupported asset types without normalizing stored values', async () => {
  const state = fixtureState();
  state.assets[0].type = 'Mystery Asset';
  const backup = await makeBackup(state);
  const result = await Backup.verifyBackup(backup);
  assert.equal(result.status, 'UNSUPPORTED_TYPE');
  assert.match(result.error, /assets/);
  assert.equal(backup.payload.state.assets[0].type, 'Mystery Asset');
  assert.equal((await Backup.previewRestore(backup, {}).then(value => value.restoreAllowed)), false);

  const fallbackType = fixtureState();
  fallbackType.assets[0] = { id: 'asset-1', ticker: 'SYN1', asset_type: 'Mystery Asset', qty: 2 };
  assert.equal((await Backup.verifyBackup(await makeBackup(fallbackType))).status, 'UNSUPPORTED_TYPE');
});

test('V323C does not invent the settings domain from an empty config object', async () => {
  const backup = await Backup.createBackup({ state: fixtureState(), config: {}, createdAt: '2026-10-05T12:00:00.000Z', appVersion: 'v323c-test' });
  assert.equal((await Backup.verifyBackup(backup)).status, 'PARTIAL');
  assert.equal((await Backup.previewRestore(backup, {}).then(result => result.restoreAllowed)), false);
});

test('V323C rejects invalid dividend goal instead of coercing it to zero', async () => {
  for (const divGoal of ['abc', -1, NaN, Infinity, null]) {
    const backup = await makeBackup(fixtureState(), { divGoal });
    const result = await Backup.verifyBackup(backup);
    assert.equal(result.status, 'CORRUPT', `divGoal=${String(divGoal)}`);
    assert.equal((await Backup.previewRestore(backup, {}).then(value => value.restoreAllowed)), false);
  }
});

test('V323C refuses to export corrupt persisted performance stores as empty', async () => {
  const snapshots = RuntimeStores.emptySnapshotStore(() => Date.parse('2026-10-05T12:00:00.000Z'));
  const flows = RuntimeStores.emptyFlowStore(() => Date.parse('2026-10-05T12:00:00.000Z'));
  const valid = RuntimeStores.backupSupplementFromRaw(JSON.stringify(snapshots), JSON.stringify(flows));
  assert.equal(valid.ok, true);
  assert.deepEqual(valid.value.valuationSnapshots.snapshots, []);
  const clock = () => Date.parse('2026-10-05T12:00:00.000Z');
  const populatedSnapshots = { ...snapshots, snapshots: [RuntimeStores.normalizeSnapshot({ localDate: '2026-10-04', listedAssetsValue: 10000, fixedIncomeValue: 0, otherAssetsValue: 0, totalPortfolioValue: 10000 }, clock)] };
  const populatedFlows = { ...flows, flows: [RuntimeStores.normalizeFlow({ date: '2026-10-04', type: 'CONTRIBUTION', amountCents: 1000 }, clock)] };
  assert.equal(RuntimeStores.backupSupplementFromRaw(JSON.stringify(populatedSnapshots), JSON.stringify(populatedFlows)).ok, true);
  assert.equal(RuntimeStores.backupSupplementFromRaw(JSON.stringify(snapshots), null).diagnostic, 'PARTIAL_DERIVED_STORE');
  assert.equal(RuntimeStores.backupSupplementFromRaw('', JSON.stringify(flows)).diagnostic, 'CORRUPT_DERIVED_STORE');
  assert.equal(RuntimeStores.backupSupplementFromRaw('{broken', JSON.stringify(flows)).ok, false);
  assert.equal(RuntimeStores.backupSupplementFromRaw(JSON.stringify(snapshots), JSON.stringify({ schemaVersion: 99, flows: [] })).ok, false);
  assert.equal(RuntimeStores.backupSupplementFromRaw(JSON.stringify({ ...snapshots, snapshots: [{}] }), JSON.stringify(flows)).ok, false);
  assert.equal(RuntimeStores.backupSupplementFromRaw(JSON.stringify(snapshots), JSON.stringify({ ...flows, flows: [{}] })).ok, false);
  assert.equal(RuntimeStores.validateBackupSupplement({ schemaVersion: 1, derived: true, valuationSnapshots: { ...snapshots, lastUpdatedAt: undefined }, externalCashFlows: flows }).ok, false);
  assert.equal(RuntimeStores.restoreSupplement({ schemaVersion: 1, derived: true, valuationSnapshots: { ...snapshots, snapshots: [{}] }, externalCashFlows: flows }).ok, false);
  const malformedRecord = await makeBackup(fixtureState(), { divGoal: 0 });
  malformedRecord.payload.runtime.valuationSnapshots.snapshots = [{}];
  assert.equal((await Backup.verifyBackup(malformedRecord)).status, 'CORRUPT');
});

test('V323C rejects corruption, duplicate records and record-count tampering', async () => {
  const payloadCorrupt = await makeBackup();
  payloadCorrupt.payload.state.assets[0].qty = 99;
  assert.equal((await Backup.verifyBackup(payloadCorrupt)).status, 'CORRUPT');

  const manifestCorrupt = await makeBackup();
  manifestCorrupt.manifest.createdAt = 'not-a-date';
  assert.equal((await Backup.verifyBackup(manifestCorrupt)).status, 'CORRUPT');

  const duplicateState = fixtureState();
  duplicateState.assets.push({ ...duplicateState.assets[0] });
  assert.equal((await Backup.verifyBackup(await makeBackup(duplicateState))).status, 'CORRUPT');

  const countTampered = await makeBackup();
  countTampered.manifest.domains.find(item => item.name === 'assets').count++;
  await resealManifest(countTampered);
  assert.equal((await Backup.verifyBackup(countTampered)).status, 'CORRUPT');
});

test('V323C distinguishes a missing state from an empty state and rejects malformed optional performance data', async () => {
  const noState = await makeBackup();
  delete noState.payload.state;
  assert.equal((await Backup.verifyBackup(noState)).status, 'PARTIAL');
  assert.equal((await Backup.previewRestore(noState, {}).then(result => result.restoreAllowed)), false);

  const malformedRuntime = await Backup.createBackup({
    state: fixtureState(), config: { divGoal: 0 },
    runtime: { schemaVersion: 1, derived: true, valuationSnapshots: { schemaVersion: 1, snapshots: [] }, externalCashFlows: { schemaVersion: 1, flows: null } },
    createdAt: '2026-10-05T12:00:00.000Z', appVersion: 'v323c-test'
  });
  assert.equal((await Backup.verifyBackup(malformedRuntime)).status, 'CORRUPT');
});

test('V323C round-trips corporate events, fixed income, income and transaction provenance in isolation', async () => {
  const corporateEvent = {
    eventKey: 'SYN1|DIVIDEND|2026-03-01|2026-03-15|350|DOC-SYN',
    symbol: 'SYN1', assetId: 'asset-1', eventType: 'DIVIDEND', type: 'DIVIDEND',
    baseDate: '2026-03-01', paymentDate: '2026-03-15', valuePerUnitGross: 3.5,
    status: 'RECEIVED', sourceProvider: 'synthetic-provider', sourceDocumentId: 'DOC-SYN',
    sources: [{ provider: 'synthetic-provider', documentId: 'DOC-SYN' }]
  };
  const state = fixtureState();
  state.corporateEvents = [corporateEvent];
  const backup = await makeBackup(state);
  const verification = await Backup.verifyBackup(backup);
  assert.equal(verification.status, 'VALID');
  const corporateDomain = backup.manifest.domains.find(item => item.name === 'corporateEvents');
  assert.equal(corporateDomain.required, false);
  assert.equal(corporateDomain.count, 1);
  assert.deepEqual(backup.payload.corporateEvents, [corporateEvent]);
  assert.equal(Object.hasOwn(backup.payload.state, 'corporateEvents'), false);
  assert.equal(backup.manifest.domains.find(item => item.name === 'performance').count, 0);

  const preview = await Backup.previewRestore(backup, {});
  assert.equal(preview.restoreAllowed, true);
  const result = await Backup.applyToIsolatedStore({ state: {}, config: {} }, backup);
  assert.equal(result.ok, true);
  assert.deepEqual(result.store.corporateEvents, [corporateEvent]);
  assert.equal(Object.hasOwn(result.store.state, 'corporateEvents'), false);
  assert.deepEqual(result.store.state.rfEvents, state.rfEvents);
  assert.deepEqual(result.store.state.assets, state.assets);
  assert.deepEqual(result.store.state.proventos, state.proventos);
  assert.deepEqual(result.store.state.aportes, state.aportes);
  assert.equal(result.store.config.divGoal, 0);
  assert.deepEqual(result.store.runtime, backup.payload.runtime);
});

test('V323C isolated apply refuses invalid backups and leaves store unchanged', async () => {
  const initial = { state: { sentinel: 'unchanged' }, config: { divGoal: 7 } };
  const partial = await makeBackup({ ...fixtureState(), proventos: undefined });
  const result = await Backup.applyToIsolatedStore(initial, partial);
  assert.equal(result.ok, false);
  assert.equal(result.rollback, true);
  assert.deepEqual(result.store, initial);
});

test('V323C exports the public corporate event cache only when its stored envelope is valid', () => {
  const storage = PublicEvents.createMemoryStorage();
  assert.equal(PublicEvents.readForBackup(storage).present, false);
  const snapshot = {
    version: PublicEvents.VERSION,
    updatedAt: '2026-10-05T12:00:00.000Z',
    events: [{ eventKey: 'synthetic-event', sourceProvider: 'synthetic' }],
    quotes: {}
  };
  PublicEvents.write(storage, snapshot);
  const exported = PublicEvents.readForBackup(storage);
  assert.equal(exported.present, true);
  assert.deepEqual(exported.events, snapshot.events);
  storage.setItem(PublicEvents.KEY, '{invalid');
  assert.throws(() => PublicEvents.readForBackup(storage), /CORPORATE_EVENTS_CACHE_CORRUPT/);
});

test('V323D export reports safe pipeline stages without logging payload errors', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const start = html.indexOf('async function backupPortabilityPayload()');
  const end = html.indexOf('function backupFromRaw(', start);
  const generation = html.slice(start, end);
  const exportStart = html.indexOf('async function exportBackup()');
  const exportEnd = html.indexOf('function importBackup()', exportStart);
  const download = html.slice(exportStart, exportEnd);
  assert.match(generation, /SNAPSHOT_COLLECTION_FAILED/);
  assert.match(generation, /MANIFEST_CREATION_FAILED/);
  assert.match(generation, /VALIDATION_FAILED/);
  assert.match(download, /SERIALIZATION_FAILED/);
  assert.match(download, /BLOB_CREATION_FAILED/);
  assert.match(download, /DOWNLOAD_TRIGGER_FAILED/);
  assert.match(download, /__BACKUP_EXPORT_ERROR__/);
  assert.match(download, /safeCodes\.includes\(reportedCode\)\?reportedCode:'BACKUP_EXPORT_UNKNOWN'/);
  assert.match(download, /Nenhum dado foi alterado.*\$\{code\}/);
  assert.doesNotMatch(generation + download, /debugError\([^\n]*error\s*\)/);
});

test('V323D large synthetic portfolio exports and restores in isolated memory', async () => {
  const state = {
    ...Persistence.buildStoredState({
      wallets: [{ id: 'wallet-1', name: 'Synthetic 1' }, { id: 'wallet-2', name: 'Synthetic 2' }],
      activeWalletId: 'wallet-1',
      assets: Array.from({ length: 40 }, (_, index) => ({
        id: `asset-${index}`, ticker: `SYN${index}`, type: index < 5 ? 'Renda Fixa' : 'Ação', qty: 1, current_price: 10
      })),
      aportes: Array.from({ length: 72 }, (_, index) => ({ id: `movement-${index}`, date: '2026-01-01', value: 10 })),
      proventos: Array.from({ length: 441 }, (_, index) => ({ id: `income-${index}`, date: '2026-01-01', value: 1 })),
      goals: {}
    }),
    goals: { patrimoine: { target: 100 }, income: { target: 10 }, allocation: { target: 3 } }
  };
  const corporateEvents = [{ eventKey: 'synthetic-event-1', eventType: 'SPLIT', status: 'REVIEW_REQUIRED' }];
  const backup = await Backup.createBackup({ state, config: { divGoal: 0 }, corporateEvents });
  const validation = await Backup.verifyBackup(backup);
  assert.equal(validation.status, 'VALID', validation.error);
  assert.equal(backup.manifest.domains.find(domain => domain.name === 'assets').count, 40);
  assert.equal(backup.manifest.domains.find(domain => domain.name === 'transactions').count, 72);
  assert.equal(backup.manifest.domains.find(domain => domain.name === 'income').count, 441);
  assert.equal(backup.manifest.domains.find(domain => domain.name === 'fixedIncome').count, 5);
  assert.equal(backup.manifest.domains.find(domain => domain.name === 'goals').count, 3);
  assert.equal(backup.manifest.domains.find(domain => domain.name === 'corporateEvents').count, 1);
  const preview = await Backup.previewRestore(backup, state);
  assert.equal(preview.restoreAllowed, true);
  const restored = await Backup.applyToIsolatedStore({ state: {}, config: {} }, backup);
  assert.equal(restored.ok, true);
  assert.deepEqual(restored.store.state, validation.backup.payload.state);
  assert.deepEqual(restored.store.corporateEvents, corporateEvents);
});
