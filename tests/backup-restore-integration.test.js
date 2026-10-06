const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const PersistenceCore = require('../persistence-core.js');

const stateKey = 'civ5';
const configKey = 'civ5_cfg';

function extractApplyBackupData() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const start = html.indexOf('async function applyBackupData(parsed){');
  const end = html.indexOf('function confirmBackupImport(){', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return html.slice(start, end);
}

function makeStorage(initial = {}, failures = []) {
  const data = new Map(Object.entries(initial).filter(([, value]) => value !== null));
  const calls = [];
  const counts = {};
  const shouldFail = (op, key) => {
    const countKey = `${op}:${key}`;
    counts[countKey] = (counts[countKey] || 0) + 1;
    const call = counts[countKey];
    return failures.find(f => f.op === op && f.key === key && (f.call === undefined || f.call === call));
  };
  const run = (op, key, fn) => {
    calls.push({ op, key });
    const failure = shouldFail(op, key);
    if (failure) throw failure.error;
    return fn();
  };
  return {
    calls,
    getItem(key) {
      return run('getItem', key, () => data.has(key) ? data.get(key) : null);
    },
    setItem(key, value) {
      return run('setItem', key, () => {
        data.set(key, String(value));
      });
    },
    removeItem(key) {
      return run('removeItem', key, () => {
        data.delete(key);
      });
    },
    snapshot() {
      return Object.fromEntries(data.entries());
    }
  };
}

function makePayload() {
  return {
    meta: { app: 'Carteira de Investimentos' },
    data: {
      wallets: [{ id: 'w1', name: 'Principal' }],
      activeWalletId: 'w1',
      assets: [{ ticker: 'ABC3', qty: 2 }],
      aportes: [{ id: 'a1', value: 100 }],
      proventos: [{ id: 'p1', value: 4 }],
      rfEvents: [{ id: 'rf1', value: 10 }],
      divGoal: 42,
      brapiToken: 'token-data'
    },
    storage: {
      [stateKey]: {
        wallets: [{ id: 'stored', name: 'Stored' }],
        assets: [{ ticker: 'XYZ4', qty: 3 }],
        divGoal: 99
      },
      [configKey]: {
        brapiToken: 'token-config',
        divGoal: 77
      }
    }
  };
}

function makeCurrentStorage(failures = []) {
  return makeStorage({
    [stateKey]: JSON.stringify({ wallets: [], activeWalletId: '', assets: [], aportes: [], proventos: [], rfEvents: [], goals: {} }),
    [configKey]: JSON.stringify({ divGoal: 0 })
  }, failures);
}

function makeHarness({ storage, backupOverrides = {}, runtimeDiagnostics = ['EMPTY_DEFAULT', 'EMPTY_DEFAULT'] }) {
  const calls = [];
  const toasts = [];
  const debugErrors = [];
  const transactionCalls = [];
  const core = {
    ...PersistenceCore,
    applyStorageTransaction(...args) {
      transactionCalls.push(args);
      return PersistenceCore.applyStorageTransaction(...args);
    }
  };
  const backupCalls = [];
  const safetyBackup = { manifest: { backupVersion: '1.2' }, payload: { state: {} } };
  const backupPortability = {
    async createBackup(options) { backupCalls.push(['create', options]); return safetyBackup; },
    async verifyBackup(backup) { backupCalls.push(['verify', backup]); return { status: 'SUPPORTED', backup }; },
    async saveLocalBackup(backup, options) { backupCalls.push(['archive', backup, options]); return { ok: true }; },
    ...backupOverrides
  };
  const restoreButton = { disabled: false };
  const context = {
    PersistenceCore: core,
    BackupPortability: backupPortability,
    PortfolioRuntimeStores: {
      backupSupplement: () => ({ schemaVersion: 1, derived: true, valuationSnapshots: { snapshots: [] }, externalCashFlows: { flows: [] } }),
      restoreSupplement: () => null
    },
    __V76_RUNTIME__: { snapshots: { snapshots: [] }, flows: { flows: [] }, diagnostics: runtimeDiagnostics },
    v76Clock: () => Date.now(),
    TYPE_CHOICES: ['Ação'],
    document: { getElementById: id => id === 'backup-import-confirm' ? restoreButton : null },
    STOR: stateKey,
    localStorage: storage,
    S: { backupImportDraft: { parsed: makePayload() }, backupOpen: true, backupRestoreInProgress: false },
    canEditFromThisTab() {
      calls.push('canEditFromThisTab');
      return true;
    },
    load() {
      calls.push('load');
    },
    save() {
      calls.push('save');
    },
    saveConfig() {
      calls.push('saveConfig');
    },
    render() {
      calls.push('render');
    },
    toast(message, color) {
      calls.push('toast');
      toasts.push({ message: String(message), color });
    },
    debugError(...args) {
      debugErrors.push(args);
    }
  };
  const applyBackupData = vm.runInNewContext(`${extractApplyBackupData()}\napplyBackupData;`, context);
  return { applyBackupData, calls, toasts, debugErrors, transactionCalls, context, backupCalls, restoreButton };
}

function assertNoSuccessEffects(harness) {
  assert.equal(harness.calls.includes('load'), false);
  assert.equal(harness.calls.includes('save'), false);
  assert.equal(harness.calls.includes('saveConfig'), false);
  assert.equal(harness.calls.includes('render'), false);
  assert.equal(harness.context.S.backupImportDraft?.parsed !== undefined, true);
  assert.equal(harness.context.S.backupOpen, true);
  assert.equal(harness.toasts.some(t => t.message.includes('Backup importado com sucesso')), false);
}

function assertStorageUnchanged(storage) {
  assert.deepEqual(storage.snapshot(), {
    [stateKey]: JSON.stringify({ wallets: [], activeWalletId: '', assets: [], aportes: [], proventos: [], rfEvents: [], goals: {} }),
    [configKey]: JSON.stringify({ divGoal: 0 })
  });
}

test('applyBackupData stores a validated safety backup before writing through PersistenceCore', async () => {
  const storage = makeCurrentStorage();
  const harness = makeHarness({ storage });
  const payload = makePayload();

  const result = await harness.applyBackupData(payload);

  assert.equal(result, true);
  assert.deepEqual(harness.backupCalls.map(call => call[0]), ['create', 'verify', 'archive']);
  assert.equal(harness.backupCalls[0][1].state.performance.schemaVersion, 1);
  assert.equal(harness.transactionCalls.length, 1);
  assert.deepEqual(harness.transactionCalls[0].slice(0, 3), [storage, stateKey, configKey]);
  assert.deepEqual(JSON.parse(storage.snapshot()[stateKey]), payload.storage[stateKey]);
  assert.deepEqual(JSON.parse(storage.snapshot()[configKey]), payload.storage[configKey]);
  assert.deepEqual(harness.calls, [
    'canEditFromThisTab',
    'load',
    'save',
    'saveConfig',
    'render',
    'toast'
  ]);
  assert.equal(harness.context.S.backupImportDraft, null);
  assert.equal(harness.context.S.backupOpen, false);
  assert.equal(harness.toasts.at(-1).message.includes('Backup importado com sucesso'), true);
  assert.equal(harness.toasts.at(-1).color, '#6ee7b7');
});

test('applyBackupData serializes concurrent restore attempts and disables confirmation while pending', async () => {
  const storage = makeCurrentStorage();
  let releaseCreate;
  const createPending = new Promise(resolve => { releaseCreate = resolve; });
  const safetyBackup = { manifest: { backupVersion: '1.2' }, payload: { state: {} } };
  const harness = makeHarness({ storage, backupOverrides: { async createBackup() { return createPending; } } });

  const first = harness.applyBackupData(makePayload());
  assert.equal(harness.context.S.backupRestoreInProgress, true);
  assert.equal(harness.restoreButton.disabled, true);
  const second = await harness.applyBackupData(makePayload());
  assert.equal(second, false);
  assert.equal(harness.transactionCalls.length, 0);
  releaseCreate(safetyBackup);
  assert.equal(await first, true);
  assert.equal(harness.transactionCalls.length, 1);
  assert.equal(harness.context.S.backupRestoreInProgress, false);
});

test('applyBackupData restores previous values and stops success effects when writing civ5 fails', async () => {
  const writeError = new Error('state write failed');
  const storage = makeCurrentStorage(
    [{ op: 'setItem', key: stateKey, error: writeError, call: 1 }]
  );
  const harness = makeHarness({ storage });

  const result = await harness.applyBackupData(makePayload());

  assert.equal(result, false);
  assertStorageUnchanged(storage);
  assertNoSuccessEffects(harness);
  assert.equal(harness.debugErrors[0][1], writeError);
  assert.equal(harness.toasts.at(-1).message.includes('Seus dados anteriores foram restaurados'), true);
  assert.equal(harness.toasts.at(-1).color, '#f87171');
});

test('applyBackupData restores previous values and avoids partial restore when writing civ5_cfg fails', async () => {
  const writeError = new Error('config write failed');
  const storage = makeCurrentStorage(
    [{ op: 'setItem', key: configKey, error: writeError, call: 1 }]
  );
  const harness = makeHarness({ storage });

  const result = await harness.applyBackupData(makePayload());

  assert.equal(result, false);
  assertStorageUnchanged(storage);
  assertNoSuccessEffects(harness);
  assert.equal(storage.calls.filter(c => c.op === 'setItem' && c.key === stateKey).length, 2);
  assert.equal(storage.calls.filter(c => c.op === 'setItem' && c.key === configKey).length, 2);
  assert.equal(harness.debugErrors[0][1], writeError);
  assert.equal(harness.toasts.at(-1).message.includes('Seus dados anteriores foram restaurados'), true);
});

test('applyBackupData blocks before mutation when pre-restore state cannot be read', async () => {
  const readError = new Error('state read failed');
  const storage = makeCurrentStorage(
    [{ op: 'getItem', key: stateKey, error: readError }]
  );
  const harness = makeHarness({ storage });

  const result = await harness.applyBackupData(makePayload());

  assert.equal(result, false);
  assertStorageUnchanged(storage);
  assertNoSuccessEffects(harness);
  assert.equal(storage.calls.some(c => c.op === 'setItem'), false);
  assert.equal(storage.calls.some(c => c.op === 'removeItem'), false);
  assert.equal(harness.debugErrors[0][1], readError);
  assert.equal(harness.toasts.at(-1).message.includes('nenhum dado foi alterado'), true);
});

test('applyBackupData blocks before mutation if safety backup creation, validation, or archive fails', async () => {
  const cases = [
    { createBackup: async () => { throw new Error('safety backup unavailable'); } },
    { verifyBackup: async () => ({ status: 'CORRUPTED' }) },
    { saveLocalBackup: async () => ({ ok: false, status: 'LOCAL_ARCHIVE_UNAVAILABLE' }) }
  ];
  for (const backupOverrides of cases) {
    const storage = makeCurrentStorage();
    const harness = makeHarness({ storage, backupOverrides });

    const result = await harness.applyBackupData(makePayload());

    assert.equal(result, false);
    assert.equal(harness.transactionCalls.length, 0);
    assert.equal(storage.calls.some(call => call.op === 'setItem' || call.op === 'removeItem'), false);
    assertStorageUnchanged(storage);
    assertNoSuccessEffects(harness);
    assert.equal(harness.toasts.at(-1).message.includes('Restauração cancelada'), true);
  }
});

test('applyBackupData blocks before mutation when the current performance snapshot is invalid', async () => {
  const storage = makeCurrentStorage();
  const harness = makeHarness({ storage, runtimeDiagnostics: ['CORRUPT_JSON', 'EMPTY_DEFAULT'] });

  const result = await harness.applyBackupData(makePayload());

  assert.equal(result, false);
  assert.equal(harness.transactionCalls.length, 0);
  assert.equal(harness.backupCalls.length, 0);
  assert.equal(storage.calls.some(call => call.op === 'setItem' || call.op === 'removeItem'), false);
  assertStorageUnchanged(storage);
  assertNoSuccessEffects(harness);
});

test('applyBackupData blocks before mutation when pre-restore config cannot be read', async () => {
  const readError = new Error('config read failed');
  const storage = makeCurrentStorage(
    [{ op: 'getItem', key: configKey, error: readError }]
  );
  const harness = makeHarness({ storage });

  const result = await harness.applyBackupData(makePayload());

  assert.equal(result, false);
  assertStorageUnchanged(storage);
  assertNoSuccessEffects(harness);
  assert.equal(storage.calls.some(c => c.op === 'setItem'), false);
  assert.equal(storage.calls.some(c => c.op === 'removeItem'), false);
  assert.equal(harness.debugErrors[0][1], readError);
  assert.equal(harness.toasts.at(-1).message.includes('nenhum dado foi alterado'), true);
});

test('applyBackupData shows incomplete recovery toast when rollback fails', async () => {
  const writeError = new Error('config write failed');
  const rollbackError = new Error('state rollback failed');
  const storage = makeCurrentStorage(
    [
      { op: 'setItem', key: configKey, error: writeError, call: 1 },
      { op: 'setItem', key: stateKey, error: rollbackError, call: 2 }
    ]
  );
  const harness = makeHarness({ storage });

  const result = await harness.applyBackupData(makePayload());

  assert.equal(result, false);
  assertNoSuccessEffects(harness);
  assert.equal(harness.debugErrors[0][1], writeError);
  assert.equal(harness.debugErrors[1][1], rollbackError);
  assert.equal(harness.toasts.at(-1).message.includes('Recuperacao automatica incompleta'), true);
  assert.equal(harness.toasts.at(-1).color, '#f87171');
});
