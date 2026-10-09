const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Backup = require('../backup-portability.js');
const html = fs.readFileSync('index.html', 'utf8');

function state() {
  return {
    wallets: [], activeWalletId: '', assets: [], aportes: [], proventos: [],
    rfEvents: [], goals: {}, performance: { schemaVersion: 1, derived: true, valuationSnapshots: { snapshots: [] }, externalCashFlows: { flows: [] } }
  };
}

function fakeIndexedDB(seed = [], failures = {}) {
  const rows = new Map(seed.map(row => [row.id, structuredClone(row)]));
  let storeExists = seed.length > 0;
  const clone = value => value === undefined ? undefined : structuredClone(value);
  const db = {
    objectStoreNames: { contains: () => storeExists },
    createObjectStore() { storeExists = true; },
    close() {},
    transaction(_storeName, mode) {
      const tx = { objectStore() {
        return {
          put(value) { queueMicrotask(() => {
            if (mode === 'readwrite' && failures.quota) { tx.error = Object.assign(new Error('storage quota exceeded'), { name: 'QuotaExceededError' }); tx.onabort?.(); return; }
            if (mode === 'readwrite' && failures.abort) { tx.error = new Error('transaction aborted'); tx.onabort?.(); return; }
            rows.set(value.id, clone(value)); queueMicrotask(() => tx.oncomplete?.());
          }); },
          delete(id) { queueMicrotask(() => { rows.delete(id); queueMicrotask(() => tx.oncomplete?.()); }); },
          getAll() {
            const request = {};
            queueMicrotask(() => { request.result = [...rows.values()].map(clone); request.onsuccess?.(); queueMicrotask(() => tx.oncomplete?.()); });
            return request;
          }
        };
      } };
      return tx;
    },
    rows
  };
  return {
    open() {
      const request = { result: db };
      queueMicrotask(() => {
        if (failures.open) { request.error = new Error('IndexedDB open failed'); request.onerror?.(); return; }
        if (!storeExists) request.onupgradeneeded?.(); request.onsuccess?.();
      });
      return request;
    },
    rows
  };
}

test('V324 backup manifest declares complete required domains and counts', async () => {
  const backup = await Backup.createBackup({ state: state(), config: {} });
  assert.deepEqual(backup.manifest.domains.map(({ name, required }) => [name, required]), [
    ['portfolio', true], ['assets', true], ['transactions', true],
    ['income', true], ['fixedIncome', true], ['goals', true],
    ['settings', true], ['performance', true]
  ]);
  assert.equal((await Backup.verifyBackup(backup)).status, 'SUPPORTED');
});

test('V324 rejects a missing required domain and future format version', async () => {
  const backup = await Backup.createBackup({ state: state(), config: {} });
  const partial = structuredClone(backup);
  partial.manifest.domains = partial.manifest.domains.filter(domain => domain.name !== 'income');
  assert.equal((await Backup.verifyBackup(partial)).status, 'PARTIAL');

  const future = structuredClone(backup);
  future.manifest.backupVersion = '1.99';
  assert.equal((await Backup.verifyBackup(future)).status, 'TOO_NEW');
});

test('V324 rejects non-serializable backup input without throwing', async () => {
  const circular = {};
  circular.self = circular;
  const result = await Backup.verifyBackup(circular);
  assert.equal(result.status, 'CORRUPTED');
  assert.equal(result.error, 'NON_SERIALIZABLE_BACKUP');
});

test('V324 retention preserves annual, recovery-required, and latest valid backups', () => {
  const entries = Array.from({ length: 14 }, (_, index) => ({
    id: `m${index}`, cadence: 'monthly', createdAt: `${new Date(Date.UTC(2025, 10 + index, 1)).toISOString().slice(0, 7)}-01`, status: 'VALID'
  }));
  entries.push({ id: 'annual', cadence: 'annual', createdAt: '2025-01-01', status: 'VALID' });
  entries.push({ id: 'recovery', cadence: 'monthly', createdAt: '2024-01-01', status: 'RECOVERY_REQUIRED' });
  const plan = Backup.planRetention(entries, { monthlyLimit: 12 });
  assert.deepEqual(plan.deleteIds, ['m1', 'm0']);
  assert.ok(plan.keepIds.includes('m13'));
  assert.ok(plan.keepIds.includes('annual'));
  assert.ok(plan.keepIds.includes('recovery'));
});

test('V324 monthly and annual snapshots are opportunistic and idempotent per period', () => {
  assert.deepEqual(Backup.periodicCadences('2026-12-15T12:00:00.000Z', []), {
    status: 'READY', cadences: [{ cadence: 'monthly', period: '2026-12' }, { cadence: 'annual', period: '2026' }]
  });
  assert.deepEqual(Backup.periodicCadences('2026-12-15T12:00:00.000Z', [
    { cadence: 'monthly', period: '2026-12', integrityValid: true }, { cadence: 'annual', period: '2026', integrityValid: true }
  ]), { status: 'READY', cadences: [] });
  assert.deepEqual(Backup.periodicCadences('2026-12-15T12:00:00.000Z', [
    { cadence: 'monthly', period: '2026-12', status: 'VALID' }, { cadence: 'annual', period: '2026', status: 'VALID' }
  ]).cadences, [{ cadence: 'monthly', period: '2026-12' }, { cadence: 'annual', period: '2026' }]);
  assert.deepEqual(Backup.periodicCadences('bad-date', []), { status: 'INVALID_DATE', cadences: [] });
});

test('V324 delayed cloud hydration does not capture pre-hydration local state', () => {
  const start = html.indexOf('function v324PeriodicBackupEligible(){');
  const end = html.indexOf("if(typeof window!=='undefined') window.addEventListener('load',runV324PeriodicBackups", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const calls = [];
  const context = {
    FB: { user: { uid: 'synthetic-user' }, access: { allowed: true }, cloudLoaded: false, pendingCloudSave: false, syncInFlight: false, applying: false },
    BackupPortability: { createPeriodicBackups: () => { calls.push('snapshot'); return Promise.resolve({ status: 'SAVED' }); } },
    backupPortabilityPayload: () => ({}),
    TYPE_CHOICES: [],
    isLocalTestMode: () => false,
    isActiveWalletHostMode: () => false,
    isAuthoritativeLocalRecoveryBoot: () => false,
    isProtectedReadOnlyQaBoot: () => false,
    debugWarn: () => {}
  };
  const run = vm.runInNewContext(`${html.slice(start, end)}\nrunV324PeriodicBackups;`, context);
  run();
  assert.deepEqual(calls, []);
  context.FB.cloudLoaded = true;
  run();
  assert.deepEqual(calls, ['snapshot']);
  const syncStart = html.indexOf('function startCloudSync(');
  const syncEnd = html.indexOf('function stopCloudSync(', syncStart);
  assert.match(html.slice(syncStart, syncEnd), /FB\.cloudLoaded=true;[\s\S]{0,500}runV324PeriodicBackups\(\)/);
});

test('V324 periodic backups report NOOP when a verified period already exists', async () => {
  const existing = await Backup.createBackup({ state: state(), config: {}, createdAt: '2026-10-01T12:00:00.000Z' });
  const indexedDB = fakeIndexedDB([{ id: 'monthly:2026-10', cadence: 'monthly', period: '2026-10', createdAt: '2026-10-01T12:00:00.000Z', status: 'CORRUPTED', backup: existing }]);
  const result = await Backup.createPeriodicBackups(existing, { now: new Date('2026-10-06T12:00:00.000Z'), indexedDB });
  assert.equal(result.status, 'NOOP');
  assert.deepEqual(result.results, []);
});

test('V324 rechecks sync eligibility after IndexedDB validation before reading app state', async () => {
  let eligible = true;
  let factoryCalls = 0;
  const indexedDB = fakeIndexedDB();
  const pending = Backup.createPeriodicBackups(() => { factoryCalls += 1; return null; }, {
    now: new Date('2026-10-06T12:00:00.000Z'), indexedDB, canCreateSnapshot: () => eligible
  });
  eligible = false;
  const result = await pending;
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'RUNTIME_NOT_STABLE');
  assert.equal(factoryCalls, 0);
});

test('V324 local archive surfaces open, abort and quota failures', async () => {
  const backup = await Backup.createBackup({ state: state(), config: {} });
  await assert.rejects(() => Backup.saveLocalBackup(backup, { cadence: 'manual', indexedDB: fakeIndexedDB([], { open: true }) }), /IndexedDB open failed/);
  await assert.rejects(() => Backup.saveLocalBackup(backup, { cadence: 'manual', indexedDB: fakeIndexedDB([], { abort: true }) }), /transaction aborted/);
  await assert.rejects(() => Backup.saveLocalBackup(backup, { cadence: 'manual', indexedDB: fakeIndexedDB([], { quota: true }) }), { name: 'QuotaExceededError' });
});

test('V324 validates archived payload hashes before cadence dedupe and retention', async () => {
  const valid = await Backup.createBackup({ state: state(), config: {}, createdAt: '2026-09-01T12:00:00.000Z' });
  const corrupt = structuredClone(valid);
  corrupt.payload.state.assets.push({ id: 'tampered', type: 'Ação' });
  for (const staleStatus of ['VALID', 'CORRUPTED']) {
    const indexedDB = fakeIndexedDB([
      { id: 'only-valid', cadence: 'monthly', period: '2026-09', createdAt: '2026-09-01T12:00:00.000Z', status: 'VALID', backup: valid },
      { id: 'monthly:2026-10', cadence: 'monthly', period: '2026-10', createdAt: '2026-10-02T12:00:00.000Z', status: staleStatus, backup: corrupt }
    ]);
    const result = await Backup.createPeriodicBackups(
      () => Backup.createBackup({ state: state(), config: {}, createdAt: '2026-10-06T12:00:00.000Z' }),
      { now: new Date('2026-10-06T12:00:00.000Z'), indexedDB }
    );
    assert.equal(result.status, 'SAVED');
    assert.equal(result.results.some(item => item.id === 'monthly:2026-10'), true);
    assert.equal((await Backup.verifyBackup(indexedDB.rows.get('monthly:2026-10').backup)).status, 'SUPPORTED');
    assert.equal((await Backup.verifyBackup(indexedDB.rows.get('only-valid').backup)).status, 'SUPPORTED');
    assert.equal(indexedDB.rows.has('only-valid'), true, 'the sole known-valid recovery point must survive');
  }
});

test('V324 rejects unsupported asset types and leaves external channels disabled', async () => {
  const backup = await Backup.createBackup({ state: { ...state(), assets: [{ id: 'x', type: 'Mystery' }] }, config: {} });
  assert.equal((await Backup.verifyBackup(backup, { supportedAssetTypes: ['Ação', 'FII'] })).status, 'UNSUPPORTED_TYPE');
  assert.deepEqual(Backup.externalBackupChannels(), {
    storage: { status: 'NOT_CONFIGURED', writesEnabled: false },
    notification: { status: 'NOT_CONFIGURED', sendsEnabled: false }
  });
});

test('V324 isolated restore returns a pre-apply safety snapshot', async () => {
  const original = { state: { assets: [{ id: 'old' }] }, config: { divGoal: 10 } };
  const backup = await Backup.createBackup({ state: state(), config: {} });
  const applied = Backup.applyToIsolatedStore(original, backup);
  assert.deepEqual(applied.preApplySnapshot, original);
  assert.deepEqual(original.state.assets, [{ id: 'old' }]);
});

test('V324 preview and isolated restore roundtrip all required domains without mutating input', async () => {
  const original = state();
  original.assets = [{ id: 'a1', ticker: 'SYN1', type: 'Ação', qty: 3 }];
  original.performance.valuationSnapshots.snapshots = [{ id: 'snap-1' }];
  original.performance.externalCashFlows.flows = [{ id: 'flow-1' }];
  const before = structuredClone(original);
  const backup = await Backup.createBackup({ state: original, config: { divGoal: 25 }, supportedAssetTypes: ['Ação'] });
  const preview = await Backup.previewRestore(backup, original, { supportedAssetTypes: ['Ação'] });
  assert.equal(preview.restoreAllowed, true);
  assert.equal(preview.diff.every(row => row.kind === 'UNCHANGED'), true);
  const applied = Backup.applyToIsolatedStore({ state: {}, config: {} }, preview.integrity.backup);
  assert.deepEqual(applied.store.state, before);
  assert.deepEqual(original, before);
});

test('V324 UI includes V76 data and limits periodic snapshots to an open, writable runtime', () => {
  assert.match(html, /state\.performance=window\.PortfolioRuntimeStores\.backupSupplement/);
  assert.match(html, /createPeriodicBackups\(\(\)=>backupPortabilityPayload\(\),\{supportedAssetTypes:TYPE_CHOICES,canCreateSnapshot:v324PeriodicBackupEligible\}\)/);
  assert.match(html, /!!FB\.user&&FB\.access\?\.allowed===true&&FB\.cloudLoaded===true&&!FB\.pendingCloudSave&&!FB\.syncInFlight&&!FB\.applying&&!FB\.lastCloudError/);
  assert.match(html, /S\.backupRestoreInProgress/);
  assert.match(html, /!isLocalTestMode\(\)&&!isActiveWalletHostMode\(\)&&!isAuthoritativeLocalRecoveryBoot\(\)&&!isProtectedReadOnlyQaBoot\(\)/);
  assert.match(html, /O navegador precisa estar aberto/);
});
