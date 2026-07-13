const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const PersistenceCore = require('../persistence-core.js');

const stateKey = 'civ5';
const configKey = 'civ5_cfg';

// Fields intentionally ignored in semantic comparison:
// - assetsInnerTab: derived from d.tab === 'renda-fixa' during load() (index.html:4377)
// - autoProvDirty: derived at the end of load() (index.html:4437)
// - brapiToken: stored separately in civ5_cfg by saveConfig() (index.html:4131)
// - _rmpTrace: runtime-only flag, not persisted by buildStoredState()
const ignoredSemanticFields = [
  { field: 'assetsInnerTab', reason: 'derived from persisted tab', evidence: 'index.html:4377' },
  { field: 'autoProvDirty', reason: 'derived during post-load cleanup', evidence: 'index.html:4437' },
  { field: 'brapiToken', reason: 'persisted outside the main state key', evidence: 'index.html:4131' },
  { field: '_rmpTrace', reason: 'runtime-only flag', evidence: 'index.html:4121' }
];

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

function extractRoundtripBundle() {
  return [
    extractSnippet('function normalizeWalletEntry(w, fallbackName=\'Carteira\'){', 'function walletLabel('),
    extractSnippet('function save(){', 'const EDIT_LOCK_KEY ='),
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

function makeRoundtripState(overrides = {}) {
  const wallet = {
    id: 'wallet-main',
    name: 'Carteira Principal',
    assets: [],
    aportes: [],
    proventos: [],
    rfEvents: [],
    divGoal: 0,
    goals: {},
    learnMeta: {}
  };

  return {
    wallets: [wallet],
    activeWalletId: 'wallet-main',
    assets: [
      {
        ticker: 'PETR4',
        type: 'Acao',
        qty: 10,
        avgPrice: 31.45,
        name: 'Petrobras PN "Especial"',
        sector: 'Energia & Oleo'
      },
      {
        ticker: 'MXRF11',
        type: 'FII',
        qty: 0,
        avgPrice: 0,
        name: 'FII com zero',
        sector: ''
      }
    ],
    aportes: [
      {
        id: 'ap-1',
        ticker: 'PETR4',
        type: 'Acao',
        value: 314.5,
        date: '2026-07-13',
        note: 'Aporte com acento: Jo\u00e3o "buy"\nLote 1'
      },
      {
        id: 'ap-2',
        ticker: 'MXRF11',
        type: 'FII',
        value: 0,
        date: '2026-07-01',
        note: ''
      }
    ],
    proventos: [
      {
        id: 'pv-1',
        ticker: 'PETR4',
        type: 'Dividendo',
        value: 12.34,
        date: '2026-06-30',
        source: 'Manual'
      }
    ],
    rfEvents: [
      {
        id: 'rf-1',
        ticker: 'CDBXP',
        assetId: 'rf-asset-1',
        date: '2026-06-15',
        type: 'juros',
        grossValue: 45.67,
        ir: 6.85,
        iof: 0,
        netValue: 38.82,
        principalDelta: 0
      }
    ],
    tab: 'ativos',
    divGoal: 1234.56,
    hideValues: false,
    apHistoryOpen: true,
    apSearch: 'Busca com acento: a\u00e7\u00e3o "especial"\nlinha 2',
    dashPeriod: 24,
    dashType: 'all',
    rentPeriod: '12m',
    rentType: 'all',
    rentBench: 'IPCA',
    irpfYear: 2026,
    irpfStep: 4,
    goals: {
      patrimonio: { target: 1000000, aporte: 2500, annualVar: 12 },
      ativos: { type: 'Acao', ticker: 'PETR4', aporte: 500, annualVar: 10, finalValue: 50000 },
      proventos: { types: ['Acao', 'FII'], monthly: 800 },
      allocation: { items: [{ type: 'Acao', pct: 60 }, { type: 'FII', pct: 40 }] }
    },
    learnMeta: {
      PETR4: { type: 'Acao', sector: 'Energia & Oleo' },
      MXRF11: { type: 'FII', sector: 'Papel "High Yield"' }
    },
    brapiToken: 'token-\u00e1\u00e9\u00ed-"linha"\n2',
    autoProvDirty: false,
    _rmpTrace: false,
    ...overrides
  };
}

function emptyRuntimeState() {
  return {
    wallets: [],
    activeWalletId: '',
    assets: [],
    aportes: [],
    proventos: [],
    rfEvents: [],
    tab: 'dashboard',
    assetsInnerTab: 'resumo',
    divGoal: 0,
    hideValues: false,
    apHistoryOpen: false,
    apSearch: '',
    dashPeriod: 12,
    dashType: 'all',
    rentPeriod: 'all',
    rentType: 'all',
    rentBench: 'CDI',
    irpfYear: 2026,
    irpfStep: 1,
    goals: {},
    learnMeta: {},
    brapiToken: 'runtime-token',
    autoProvDirty: false,
    _rmpTrace: false
  };
}

function makeHarness({
  state = makeRoundtripState(),
  storageData = {},
  failures = []
} = {}) {
  const storage = makeStorage(storageData, failures);
  const debugErrors = [];
  const toasts = [];
  const cloudSaves = [];
  const warnings = [];
  let walletCounter = 0;

  const context = {
    PersistenceCore,
    STOR: stateKey,
    DEFAULT_BRAPI: '',
    S: clone(state),
    localStorage: storage,
    console: {
      log() {},
      warn(...args) {
        warnings.push(args);
      }
    },
    canEditFromThisTab() {
      return true;
    },
    isLocalTestMode() {
      return false;
    },
    emptyWallet(fallbackName = 'Carteira') {
      walletCounter += 1;
      return {
        id: `wallet-${walletCounter}`,
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
      return undefined;
    },
    cleanupB3PositionSummaryAssets() {
      return 0;
    },
    cleanupB3PositionAportes() {
      return 0;
    },
    queueCloudSave() {
      cloudSaves.push('queued');
    },
    debugError(...args) {
      debugErrors.push(args);
    },
    toast(message, color) {
      toasts.push({ message: String(message), color });
    }
  };

  const exported = vm.runInNewContext(`${extractRoundtripBundle()}\n({ save, saveConfig, load });`, context);
  return {
    context,
    storage,
    debugErrors,
    toasts,
    cloudSaves,
    warnings,
    save: exported.save,
    saveConfig: exported.saveConfig,
    load: exported.load
  };
}

function semanticStateSnapshot(state) {
  return {
    wallets: plain(state.wallets),
    activeWalletId: String(state.activeWalletId || ''),
    assets: plain(state.assets),
    aportes: plain(state.aportes),
    proventos: plain(state.proventos),
    rfEvents: plain(state.rfEvents),
    tab: String(state.tab || 'dashboard'),
    divGoal: Number(state.divGoal) || 0,
    hideValues: !!state.hideValues,
    apHistoryOpen: !!state.apHistoryOpen,
    apSearch: String(state.apSearch || ''),
    dashPeriod: Number(state.dashPeriod) || 12,
    dashType: String(state.dashType || 'all'),
    rentPeriod: String(state.rentPeriod || 'all'),
    rentType: String(state.rentType || 'all'),
    rentBench: String(state.rentBench || 'CDI'),
    irpfYear: Number(state.irpfYear) || new Date().getFullYear(),
    irpfStep: Number(state.irpfStep) || 1,
    goals: plain(state.goals),
    learnMeta: plain(state.learnMeta),
    brapiToken: String(state.brapiToken || '')
  };
}

function loadExpectedSnapshot(savedState, savedConfig) {
  return {
    wallets: plain(savedState.wallets),
    activeWalletId: String(savedState.activeWalletId || ''),
    assets: plain(savedState.assets),
    aportes: plain(savedState.aportes),
    proventos: plain(savedState.proventos),
    rfEvents: plain(savedState.rfEvents),
    tab: savedState.tab === 'ranking' ? 'ativos' : savedState.tab === 'renda-fixa' ? 'ativos' : String(savedState.tab || 'dashboard'),
    divGoal: savedConfig.divGoal !== undefined ? (Number(savedConfig.divGoal) || Number(savedState.divGoal) || 0) : (Number(savedState.divGoal) || 0),
    hideValues: !!savedState.hideValues,
    apHistoryOpen: !!savedState.apHistoryOpen,
    apSearch: String(savedState.apSearch || ''),
    dashPeriod: Number(savedState.dashPeriod) || 12,
    dashType: String(savedState.dashType || 'all'),
    rentPeriod: String(savedState.rentPeriod || 'all'),
    rentType: String(savedState.rentType || 'all'),
    rentBench: String(savedState.rentBench || 'CDI'),
    irpfYear: Number(savedState.irpfYear) || new Date().getFullYear(),
    irpfStep: Number(savedState.irpfStep) || 1,
    goals: plain(savedState.goals),
    learnMeta: plain(savedState.learnMeta),
    brapiToken: String(savedConfig.brapiToken || '')
  };
}

function assertRoundtrip(harness) {
  const snapshot = harness.storage.snapshot();
  const savedState = JSON.parse(snapshot[stateKey]);
  const savedConfig = JSON.parse(snapshot[configKey]);
  harness.context.S = emptyRuntimeState();
  harness.load();
  assert.deepEqual(semanticStateSnapshot(harness.context.S), loadExpectedSnapshot(savedState, savedConfig));
}

test('roundtrip principal preserva estado financeiro valido entre save() e load()', () => {
  const harness = makeHarness();

  harness.save();
  harness.saveConfig();

  assert.equal(typeof harness.storage.snapshot()[stateKey], 'string');
  assert.equal(typeof harness.storage.snapshot()[configKey], 'string');
  assert.equal(harness.cloudSaves.length, 2);

  assertRoundtrip(harness);
});

test('roundtrip preserva tipos, zeros, arrays vazios e campos opcionais validos', () => {
  const state = makeRoundtripState({
    assets: [],
    aportes: [],
    proventos: [],
    rfEvents: [],
    hideValues: true,
    apHistoryOpen: false,
    goals: {},
    learnMeta: {},
    divGoal: 0
  });
  const harness = makeHarness({ state });

  harness.save();
  harness.saveConfig();
  assertRoundtrip(harness);
});

test('roundtrip preserva acentos, simbolos, aspas e quebra de linha nos textos suportados', () => {
  const state = makeRoundtripState({
    aportes: [
      {
        id: 'ap-special',
        ticker: 'ITUB4',
        type: 'Acao',
        value: 0,
        date: '2026-07-13',
        note: '\u00e1\u00e9\u00ed\u00f3\u00fa \u00e7 \u00e3 \u00f5 "aspas"\nsegunda linha'
      }
    ],
    apSearch: 's\u00edmbolos % R$ "ok"\nlinha',
    brapiToken: 'token-com-\u00e7edilha-\u00e7\nlinha 2',
    learnMeta: { ITUB4: { type: 'Acao', sector: 'Bancos & Servicos' } }
  });
  const harness = makeHarness({ state });

  harness.save();
  harness.saveConfig();
  assertRoundtrip(harness);
});

test('segunda gravacao prevalece sem mistura indevida com estado anterior', () => {
  const harness = makeHarness({ state: makeRoundtripState({ apSearch: 'estado A', brapiToken: 'token-A', divGoal: 100 }) });

  harness.save();
  harness.saveConfig();
  const firstSnapshot = harness.storage.snapshot();

  harness.context.S = makeRoundtripState({
    assets: [{ ticker: 'VALE3', type: 'Acao', qty: 20, avgPrice: 55.5, name: 'Vale', sector: 'Mineracao' }],
    aportes: [{ id: 'ap-b', ticker: 'VALE3', type: 'Acao', value: 1110, date: '2026-07-14', note: 'estado B' }],
    proventos: [],
    rfEvents: [],
    apSearch: 'estado B',
    brapiToken: 'token-B',
    divGoal: 200
  });

  harness.save();
  harness.saveConfig();

  const secondSnapshot = harness.storage.snapshot();
  assert.notEqual(secondSnapshot[stateKey], firstSnapshot[stateKey]);
  assert.notEqual(secondSnapshot[configKey], firstSnapshot[configKey]);

  assertRoundtrip(harness);
  assert.equal(harness.context.S.apSearch, 'estado B');
  assert.equal(harness.context.S.brapiToken, 'token-B');
  assert.equal(harness.context.S.assets[0].ticker, 'VALE3');
});

test('falha de gravacao em save() e tratada sem propagar excecao e preserva estado anterior', () => {
  const writeError = new Error('state write failed');
  const previousState = JSON.stringify({ assets: [{ ticker: 'OLD1' }], aportes: [], proventos: [], rfEvents: [], wallets: [], activeWalletId: '' });
  const harness = makeHarness({
    storageData: {
      [stateKey]: previousState,
      [configKey]: JSON.stringify({ brapiToken: 'cfg-old', divGoal: 77 })
    },
    failures: [{ op: 'setItem', key: stateKey, error: writeError }]
  });

  assert.doesNotThrow(() => harness.save());
  const snapshot = harness.storage.snapshot();
  assert.equal(snapshot[stateKey], previousState);
  assert.equal(snapshot[configKey], JSON.stringify({ brapiToken: 'cfg-old', divGoal: 77 }));
  assert.equal(harness.cloudSaves.length, 0);
  assert.equal(harness.debugErrors.length, 1);
  assert.equal(harness.debugErrors[0][1], writeError);
  assert.equal(harness.toasts.some(item => item.message.includes('Erro ao salvar dados localmente')), true);
});

test('save() e saveConfig() mantem isolamento entre estado principal e preferencias', () => {
  const preservedConfig = JSON.stringify({ brapiToken: 'token-preservado', divGoal: 91 });
  const harness = makeHarness({
    state: makeRoundtripState({ divGoal: 12, brapiToken: 'token-inicial' }),
    storageData: {
      [configKey]: preservedConfig
    }
  });

  harness.save();
  const afterSaveOnly = harness.storage.snapshot();
  assert.equal(afterSaveOnly[configKey], preservedConfig);

  const stateRawBeforeConfig = afterSaveOnly[stateKey];
  harness.context.S.brapiToken = 'token-final';
  harness.context.S.divGoal = 444;
  harness.saveConfig();

  const afterConfig = harness.storage.snapshot();
  assert.equal(afterConfig[stateKey], stateRawBeforeConfig);
  assert.deepEqual(JSON.parse(afterConfig[configKey]), { brapiToken: 'token-final', divGoal: 444 });

  harness.context.S = emptyRuntimeState();
  harness.load();
  assert.equal(harness.context.S.brapiToken, 'token-final');
  assert.equal(harness.context.S.divGoal, 444);
  assert.equal(harness.context.S.assets[0].ticker, 'PETR4');
});

test('ignored semantic fields list stays explicit and evidence-backed', () => {
  assert.deepEqual(
    ignoredSemanticFields.map(item => item.field),
    ['assetsInnerTab', 'autoProvDirty', 'brapiToken', '_rmpTrace']
  );
  assert.equal(ignoredSemanticFields.every(item => item.reason && item.evidence), true);
});
