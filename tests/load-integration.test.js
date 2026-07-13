const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const PersistenceCore = require('../persistence-core.js');

const stateKey = 'civ5';
const configKey = 'civ5_cfg';

function readIndexHtml() {
  return fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
}

function extractSnippet(startMarker, endMarker) {
  const html = readIndexHtml();
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  assert.notEqual(start, -1, `Start marker not found: ${startMarker}`);
  assert.notEqual(end, -1, `End marker not found: ${endMarker}`);
  return html.slice(start, end);
}

function extractLoadBundle() {
  return [
    extractSnippet('function normalizeWalletEntry(w, fallbackName=\'Carteira\'){', 'function walletLabel('),
    extractSnippet('function backupCorruptedStorageValue(storageKey, rawValue, error){', 'function markProventosDirty(){'),
    extractSnippet('function load(){', 'function initFirebase(){')
  ].join('\n');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
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
      return run('getItem', key, () => (data.has(key) ? data.get(key) : null));
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

function makeInitialState(overrides = {}) {
  return {
    wallets: [
      {
        id: 'seed-wallet',
        name: 'Carteira seed',
        assets: [{ ticker: 'OLD3', qty: 1 }],
        aportes: [{ id: 'old-aporte', ticker: 'OLD3', valor: 100 }],
        proventos: [{ id: 'old-prov', ticker: 'OLD3', valor: 5 }],
        rfEvents: [{ id: 'old-rf', ticker: 'OLD3' }],
        divGoal: 7,
        goals: { seed: true },
        learnMeta: { OLD3: { type: 'Ação' } }
      }
    ],
    activeWalletId: 'seed-wallet',
    assets: [{ ticker: 'OLD3', qty: 1 }],
    aportes: [{ id: 'old-aporte', ticker: 'OLD3', valor: 100 }],
    proventos: [{ id: 'old-prov', ticker: 'OLD3', valor: 5 }],
    rfEvents: [{ id: 'old-rf', ticker: 'OLD3' }],
    tab: 'dashboard',
    assetsInnerTab: 'resumo',
    divGoal: 7,
    hideValues: true,
    apHistoryOpen: true,
    apSearch: 'busca antiga',
    dashPeriod: 9,
    dashType: 'setor',
    rentPeriod: '12m',
    rentType: 'acoes',
    rentBench: 'IPCA',
    irpfYear: 2024,
    irpfStep: 2,
    goals: { seed: true },
    learnMeta: { OLD3: { type: 'Ação' } },
    brapiToken: 'existing-token',
    autoProvDirty: false,
    ...overrides
  };
}

function makeHarness({
  storageData = {},
  failures = [],
  initialState = makeInitialState(),
  cleanupSummary = 0,
  cleanupAportes = 0,
  localTestMode = false
} = {}) {
  const storage = makeStorage(storageData, failures);
  const counters = {
    save: 0,
    rebuildLearnMeta: 0,
    cleanedSummary: 0,
    cleanedAportes: 0
  };
  const debugErrors = [];
  const warnings = [];
  let walletId = 0;

  const context = {
    PersistenceCore,
    STOR: stateKey,
    DEFAULT_BRAPI: '',
    S: clone(initialState),
    localStorage: storage,
    console: {
      warn(...args) {
        warnings.push(args);
      }
    },
    isLocalTestMode() {
      return localTestMode;
    },
    emptyWallet(fallbackName = 'Carteira') {
      walletId += 1;
      return {
        id: `wallet-${walletId}`,
        name: fallbackName,
        assets: [],
        aportes: [],
        proventos: [],
        rfEvents: [],
        divGoal: 0,
        goals: {},
        learnMeta: {}
      };
    },
    cloneData(value) {
      return clone(value);
    },
    normalizeRfEvents(list) {
      return Array.isArray(list) ? list.map(item => ({ ...item })) : [];
    },
    normalizeGoals(goals) {
      return goals && typeof goals === 'object' ? clone(goals) : { defaultsApplied: true };
    },
    rebuildLearnMeta() {
      counters.rebuildLearnMeta += 1;
    },
    cleanupB3PositionSummaryAssets() {
      counters.cleanedSummary += 1;
      return cleanupSummary;
    },
    cleanupB3PositionAportes() {
      counters.cleanedAportes += 1;
      return cleanupAportes;
    },
    save() {
      counters.save += 1;
    },
    debugError(...args) {
      debugErrors.push(args);
    }
  };

  const exported = vm.runInNewContext(`${extractLoadBundle()}\n({ load });`, context);
  return {
    load: exported.load,
    storage,
    context,
    counters,
    debugErrors,
    warnings
  };
}

function backupKeys(snapshot, prefix) {
  return Object.keys(snapshot).filter(key => key.startsWith(prefix));
}

test('load recupera estado válido, aplica config e sincroniza a carteira ativa', () => {
  const storedState = {
    wallets: [
      {
        id: 'w1',
        name: 'Principal',
        assets: [{ ticker: 'PETR4', qty: 10 }],
        aportes: [{ id: 'a1', ticker: 'PETR4', valor: 1000 }],
        proventos: [{ id: 'p1', ticker: 'PETR4', valor: 35 }],
        rfEvents: [{ id: 'rf1', ticker: 'PETR4' }],
        divGoal: 55,
        goals: { carteira: true },
        learnMeta: { PETR4: { type: 'Ação' } }
      }
    ],
    activeWalletId: 'w1',
    tab: 'renda-fixa',
    hideValues: false,
    apHistoryOpen: false,
    apSearch: 'PETR4',
    dashPeriod: 24,
    dashType: 'all',
    rentPeriod: '1y',
    rentType: 'rf',
    rentBench: 'CDI',
    irpfYear: 2025,
    irpfStep: 4,
    goals: { carteira: true },
    learnMeta: { PETR4: { type: 'Ação' } }
  };
  const storedConfig = { brapiToken: 'cfg-token', divGoal: 99 };
  const harness = makeHarness({
    initialState: makeInitialState({ assets: [], aportes: [], proventos: [], rfEvents: [], wallets: [], activeWalletId: '' }),
    storageData: {
      [stateKey]: JSON.stringify(storedState),
      [configKey]: JSON.stringify(storedConfig)
    }
  });

  harness.load();

  assert.equal(harness.context.S.tab, 'ativos');
  assert.equal(harness.context.S.assetsInnerTab, 'renda-fixa');
  assert.deepEqual(harness.context.S.assets, storedState.wallets[0].assets);
  assert.deepEqual(harness.context.S.aportes, storedState.wallets[0].aportes);
  assert.deepEqual(harness.context.S.proventos, storedState.wallets[0].proventos);
  assert.deepEqual(harness.context.S.rfEvents, storedState.wallets[0].rfEvents);
  assert.equal(harness.context.S.brapiToken, 'cfg-token');
  assert.equal(harness.context.S.divGoal, 99);
  assert.equal(harness.context.S.wallets[0].divGoal, 99);
  assert.equal(harness.context.S.autoProvDirty, true);
  assert.equal(harness.counters.save, 0);
  assert.equal(harness.counters.rebuildLearnMeta, 2);
  assert.equal(harness.counters.cleanedSummary, 1);
  assert.equal(harness.counters.cleanedAportes, 1);
  assert.equal(harness.debugErrors.length, 0);
  assert.equal(harness.warnings.length, 0);
});

test('load preserva estado atual quando o storage principal está ausente e a configuração existe', () => {
  const initialState = makeInitialState();
  const harness = makeHarness({
    initialState,
    storageData: {
      [configKey]: JSON.stringify({ brapiToken: 'cfg-token', divGoal: 33 })
    }
  });

  harness.load();

  assert.deepEqual(harness.context.S.assets, initialState.assets);
  assert.deepEqual(harness.context.S.aportes, initialState.aportes);
  assert.deepEqual(harness.context.S.proventos, initialState.proventos);
  assert.equal(harness.context.S.brapiToken, 'cfg-token');
  assert.equal(harness.context.S.divGoal, 33);
  assert.equal(harness.counters.save, 0);
  assert.equal(harness.debugErrors.length, 0);
});

test('load faz backup do JSON inválido do estado principal e mantém o app funcional', () => {
  const initialState = makeInitialState();
  const harness = makeHarness({
    initialState,
    storageData: {
      [stateKey]: '{estado-invalido',
      [configKey]: JSON.stringify({ brapiToken: 'cfg-ok', divGoal: 44 })
    }
  });

  harness.load();

  const snapshot = harness.storage.snapshot();
  const backups = backupKeys(snapshot, `${stateKey}_corrupted_backup_`);
  assert.equal(backups.length, 1);
  assert.equal(snapshot[backups[0]], '{estado-invalido');
  assert.deepEqual(harness.context.S.assets, initialState.assets);
  assert.deepEqual(harness.context.S.aportes, initialState.aportes);
  assert.equal(harness.context.S.brapiToken, 'cfg-ok');
  assert.equal(harness.context.S.divGoal, 44);
  assert.equal(harness.debugErrors.length, 1);
  assert.match(String(harness.debugErrors[0][0]), /load erro/i);
  assert.equal(harness.warnings.length >= 1, true);
  assert.equal(harness.counters.save, 0);
});

test('load preserva o estado financeiro quando a configuração está inválida e volta para o token padrão', () => {
  const storedState = {
    assets: [{ ticker: 'ITSA4', qty: 5 }],
    aportes: [{ id: 'a2', ticker: 'ITSA4', valor: 500 }],
    proventos: [{ id: 'p2', ticker: 'ITSA4', valor: 12 }],
    rfEvents: [{ id: 'rf2', ticker: 'ITSA4' }],
    divGoal: 21
  };
  const harness = makeHarness({
    initialState: makeInitialState({ assets: [], aportes: [], proventos: [], rfEvents: [], wallets: [], activeWalletId: '' }),
    storageData: {
      [stateKey]: JSON.stringify(storedState),
      [configKey]: '{cfg-invalida'
    }
  });

  harness.load();

  const snapshot = harness.storage.snapshot();
  const backups = backupKeys(snapshot, `${configKey}_corrupted_backup_`);
  assert.equal(backups.length, 1);
  assert.deepEqual(harness.context.S.assets, storedState.assets);
  assert.deepEqual(harness.context.S.aportes, storedState.aportes);
  assert.deepEqual(harness.context.S.proventos, storedState.proventos);
  assert.deepEqual(harness.context.S.rfEvents, storedState.rfEvents);
  assert.equal(harness.context.S.brapiToken, '');
  assert.equal(harness.debugErrors.length, 0);
  assert.equal(harness.counters.save, 0);
});

test('load expõe a falha real quando localStorage.getItem quebra na leitura do estado principal', () => {
  const readError = new Error('state read failed');
  const harness = makeHarness({
    storageData: {
      [stateKey]: JSON.stringify({ assets: [{ ticker: 'FAIL3' }] }),
      [configKey]: JSON.stringify({ brapiToken: 'cfg-token' })
    },
    failures: [{ op: 'getItem', key: stateKey, error: readError }]
  });

  assert.throws(() => harness.load(), /state read failed/);
  assert.equal(harness.storage.calls.some(call => call.op === 'setItem'), false);
  assert.equal(harness.storage.calls.some(call => call.key === configKey), false);
  assert.equal(harness.debugErrors.length, 0);
  assert.equal(harness.counters.save, 0);
});

test('load preserva campos anteriores quando recebe dados parcialmente corrompidos', () => {
  const initialState = makeInitialState();
  const harness = makeHarness({
    initialState,
    storageData: {
      [stateKey]: JSON.stringify({
        assets: 'invalido',
        aportes: [{ id: 'new-aporte', ticker: 'VALE3', valor: 200 }],
        proventos: null,
        rfEvents: 'quebrado',
        hideValues: false,
        apSearch: 'VALE3'
      })
    }
  });

  harness.load();

  assert.deepEqual(harness.context.S.assets, initialState.assets);
  assert.deepEqual(harness.context.S.aportes, [{ id: 'new-aporte', ticker: 'VALE3', valor: 200 }]);
  assert.deepEqual(harness.context.S.proventos, initialState.proventos);
  assert.deepEqual(harness.context.S.rfEvents, initialState.rfEvents);
  assert.equal(harness.context.S.hideValues, false);
  assert.equal(harness.context.S.apSearch, 'VALE3');
  assert.equal(harness.debugErrors.length, 0);
});

test('load recupera legado do civ4 e persiste uma vez o estado migrado', () => {
  const legacyState = {
    assets: [{ ticker: 'BBDC4', qty: 7 }],
    aportes: [{ id: 'legacy-aporte', ticker: 'BBDC4', valor: 700 }],
    proventos: [{ id: 'legacy-prov', ticker: 'BBDC4', valor: 9 }],
    rfEvents: [{ id: 'legacy-rf', ticker: 'BBDC4' }],
    divGoal: 12,
    dashPeriod: 18,
    goals: { legado: true }
  };
  const harness = makeHarness({
    initialState: makeInitialState({ assets: [], aportes: [], proventos: [], rfEvents: [], wallets: [], activeWalletId: '', goals: {} }),
    storageData: {
      civ4: JSON.stringify(legacyState)
    }
  });

  harness.load();

  assert.deepEqual(plain(harness.context.S.assets), legacyState.assets);
  assert.deepEqual(plain(harness.context.S.aportes), legacyState.aportes);
  assert.deepEqual(plain(harness.context.S.proventos), legacyState.proventos);
  assert.deepEqual(plain(harness.context.S.rfEvents), legacyState.rfEvents);
  assert.equal(harness.context.S.divGoal, 12);
  assert.equal(harness.context.S.dashPeriod, 18);
  assert.deepEqual(harness.context.S.goals, { legado: true });
  assert.equal(harness.context.S.autoProvDirty, true);
  assert.equal(harness.counters.save, 1);
  assert.equal(harness.debugErrors.length, 0);
});
