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
  const start = html.indexOf('function applyBackupData(parsed){');
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

function makeHarness({ storage }) {
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
  const context = {
    PersistenceCore: core,
    STOR: stateKey,
    localStorage: storage,
    S: { backupImportDraft: { parsed: makePayload() }, backupOpen: true },
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
  return { applyBackupData, calls, toasts, debugErrors, transactionCalls, context };
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
    [stateKey]: 'old-state',
    [configKey]: 'old-config'
  });
}

test('applyBackupData writes civ5 and civ5_cfg through PersistenceCore and preserves success flow', () => {
  const storage = makeStorage({ [stateKey]: 'old-state', [configKey]: 'old-config' });
  const harness = makeHarness({ storage });
  const payload = makePayload();

  const result = harness.applyBackupData(payload);

  assert.equal(result, true);
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

test('applyBackupData restores previous values and stops success effects when writing civ5 fails', () => {
  const writeError = new Error('state write failed');
  const storage = makeStorage(
    { [stateKey]: 'old-state', [configKey]: 'old-config' },
    [{ op: 'setItem', key: stateKey, error: writeError, call: 1 }]
  );
  const harness = makeHarness({ storage });

  const result = harness.applyBackupData(makePayload());

  assert.equal(result, false);
  assertStorageUnchanged(storage);
  assertNoSuccessEffects(harness);
  assert.equal(harness.debugErrors[0][1], writeError);
  assert.equal(harness.toasts.at(-1).message.includes('Seus dados anteriores foram restaurados'), true);
  assert.equal(harness.toasts.at(-1).color, '#f87171');
});

test('applyBackupData restores previous values and avoids partial restore when writing civ5_cfg fails', () => {
  const writeError = new Error('config write failed');
  const storage = makeStorage(
    { [stateKey]: 'old-state', [configKey]: 'old-config' },
    [{ op: 'setItem', key: configKey, error: writeError, call: 1 }]
  );
  const harness = makeHarness({ storage });

  const result = harness.applyBackupData(makePayload());

  assert.equal(result, false);
  assertStorageUnchanged(storage);
  assertNoSuccessEffects(harness);
  assert.equal(storage.calls.filter(c => c.op === 'setItem' && c.key === stateKey).length, 2);
  assert.equal(storage.calls.filter(c => c.op === 'setItem' && c.key === configKey).length, 2);
  assert.equal(harness.debugErrors[0][1], writeError);
  assert.equal(harness.toasts.at(-1).message.includes('Seus dados anteriores foram restaurados'), true);
});

test('applyBackupData does not write or rollback when reading civ5 fails', () => {
  const readError = new Error('state read failed');
  const storage = makeStorage(
    { [stateKey]: 'old-state', [configKey]: 'old-config' },
    [{ op: 'getItem', key: stateKey, error: readError }]
  );
  const harness = makeHarness({ storage });

  const result = harness.applyBackupData(makePayload());

  assert.equal(result, false);
  assertStorageUnchanged(storage);
  assertNoSuccessEffects(harness);
  assert.equal(storage.calls.some(c => c.op === 'setItem'), false);
  assert.equal(storage.calls.some(c => c.op === 'removeItem'), false);
  assert.equal(harness.debugErrors[0][1], readError);
  assert.equal(harness.toasts.at(-1).message.includes('Seus dados anteriores foram restaurados'), true);
});

test('applyBackupData preserves previous civ5 and does not write or rollback when reading civ5_cfg fails', () => {
  const readError = new Error('config read failed');
  const storage = makeStorage(
    { [stateKey]: 'old-state', [configKey]: 'old-config' },
    [{ op: 'getItem', key: configKey, error: readError }]
  );
  const harness = makeHarness({ storage });

  const result = harness.applyBackupData(makePayload());

  assert.equal(result, false);
  assertStorageUnchanged(storage);
  assertNoSuccessEffects(harness);
  assert.equal(storage.calls.some(c => c.op === 'setItem'), false);
  assert.equal(storage.calls.some(c => c.op === 'removeItem'), false);
  assert.equal(harness.debugErrors[0][1], readError);
  assert.equal(harness.toasts.at(-1).message.includes('Seus dados anteriores foram restaurados'), true);
});

test('applyBackupData shows incomplete recovery toast when rollback fails', () => {
  const writeError = new Error('config write failed');
  const rollbackError = new Error('state rollback failed');
  const storage = makeStorage(
    { [stateKey]: 'old-state', [configKey]: 'old-config' },
    [
      { op: 'setItem', key: configKey, error: writeError, call: 1 },
      { op: 'setItem', key: stateKey, error: rollbackError, call: 2 }
    ]
  );
  const harness = makeHarness({ storage });

  const result = harness.applyBackupData(makePayload());

  assert.equal(result, false);
  assertNoSuccessEffects(harness);
  assert.equal(harness.debugErrors[0][1], writeError);
  assert.equal(harness.debugErrors[1][1], rollbackError);
  assert.equal(harness.toasts.at(-1).message.includes('Recuperacao automatica incompleta'), true);
  assert.equal(harness.toasts.at(-1).color, '#f87171');
});
