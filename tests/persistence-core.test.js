const test = require('node:test');
const assert = require('node:assert/strict');
const PersistenceCore = require('../persistence-core.js');

const normalizeType = (value, fallback = 'Acao') => {
  const raw = String(value || '').trim();
  if (!raw) return fallback || 'Acao';
  const key = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  const aliases = {
    ACAO: 'Acao',
    ACOES: 'Acao',
    FII: 'FII',
    ETF: 'ETF',
    'RENDA FIXA': 'Renda Fixa',
    'TESOURO DIRETO': 'Tesouro Direto'
  };
  return aliases[key] || fallback || raw || 'Acao';
};

const normalizeGoals = goals => {
  const base = {
    patrimonio: { target: 0, aporte: 0, annualVar: 0 },
    ativos: { type: 'Acao', ticker: '', aporte: 0, annualVar: 10, finalValue: 0 },
    proventos: { types: ['Acao', 'FII', 'ETF', 'BDR', 'Stock'], monthly: 0 },
    allocation: { items: [{ type: 'FII', pct: 40 }, { type: 'ETF', pct: 20 }, { type: 'Acao', pct: 25 }, { type: 'BDR', pct: 5 }, { type: 'Renda Fixa', pct: 10 }] }
  };
  const g = goals && typeof goals === 'object' ? jsonClone(goals) : {};
  g.patrimonio = { ...base.patrimonio, ...(g.patrimonio || {}) };
  g.ativos = { ...base.ativos, ...(g.ativos || {}), type: normalizeType((g.ativos || {}).type || 'Acao', 'Acao') };
  const rawTypes = Array.isArray(g.proventos?.types) ? g.proventos.types : base.proventos.types;
  g.proventos = { ...base.proventos, ...(g.proventos || {}), types: [...new Set(rawTypes.map(t => normalizeType(t, '')).filter(Boolean))] };
  if (!g.proventos.types.length) g.proventos.types = [...base.proventos.types];
  const allocSrc = Array.isArray(g.allocation?.items)
    ? g.allocation.items
    : (g.allocation && typeof g.allocation === 'object' ? Object.entries(g.allocation).map(([type, pct]) => ({ type, pct })) : base.allocation.items);
  const seen = new Set();
  g.allocation = {
    items: allocSrc.map(it => ({
      type: normalizeType(it?.type || it?.label || '', ''),
      pct: Math.max(0, Number(it?.pct ?? it?.value ?? it?.percent ?? it?.weight) || 0)
    })).filter(it => {
      if (!it.type || seen.has(it.type)) return false;
      seen.add(it.type);
      return true;
    })
  };
  if (!g.allocation.items.length) g.allocation.items = [...base.allocation.items];
  return g;
};

function jsonClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function legacyBackupSnapshot(state) {
  return {
    wallets: jsonClone(state.wallets || []),
    activeWalletId: String(state.activeWalletId || ''),
    assets: jsonClone(state.assets || []),
    aportes: jsonClone(state.aportes || []),
    proventos: jsonClone(state.proventos || []),
    rfEvents: jsonClone(state.rfEvents || []),
    divGoal: Number(state.divGoal) || 0,
    goals: normalizeGoals(state.goals),
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
    learnMeta: jsonClone(state.learnMeta || {}),
    tab: String(state.tab || 'dashboard')
  };
}

function legacyBackupStats(data, isFixedAsset) {
  const wallets = Array.isArray(data?.wallets) ? data.wallets : [];
  const assets = Array.isArray(data?.assets) ? data.assets : [];
  const aportes = Array.isArray(data?.aportes) ? data.aportes : [];
  const proventos = Array.isArray(data?.proventos) ? data.proventos : [];
  const goals = data?.goals && typeof data.goals === 'object' ? data.goals : {};
  const defaultGoals = normalizeGoals();
  const goalsChanged = Object.keys(goals).filter(k => JSON.stringify(goals[k] ?? null) !== JSON.stringify(defaultGoals[k] ?? null)).length;
  return {
    wallets: wallets.length,
    assets: assets.length,
    aportes: aportes.length,
    proventos: proventos.length,
    fixed: assets.filter(isFixedAsset).length,
    goals: goalsChanged,
    hasToken: !!String(data?.brapiToken || '').trim()
  };
}

function makeState() {
  return {
    wallets: [{ id: 'w1', name: 'Principal', nested: { order: [1, { two: true }] } }],
    activeWalletId: 'w1',
    assets: [{ id: 1, ticker: 'PETR4', type: 'Acao', nested: { tags: ['core'] } }],
    aportes: [{ id: 2, ticker: 'PETR4', lots: [{ qty: 10, note: 'first' }] }],
    proventos: [{ id: 3, ticker: 'PETR4', payments: [{ value: 12.34 }] }],
    rfEvents: [{ id: 4, ticker: 'CDB1', steps: [{ gross: 100 }] }],
    tab: 'ativos',
    divGoal: 123,
    goals: { algumCampo: { nested: { value: 7 } }, ativos: { type: 'ETF' }, allocation: { items: [{ type: 'ETF', pct: 20 }] } },
    hideValues: true,
    apHistoryOpen: true,
    apSearch: 'abc',
    dashPeriod: 24,
    dashType: 'all',
    rentPeriod: 'year',
    rentType: 'FII',
    rentBench: 'CDI',
    irpfYear: 2025,
    irpfStep: 3,
    learnMeta: { PETR4: { type: 'Acao', nested: { seen: ['x'] } } }
  };
}

test('buildStoredState preserves persisted fields without cloning save data', () => {
  const state = makeState();
  const result = PersistenceCore.buildStoredState(state, normalizeGoals);
  assert.equal(result.wallets, state.wallets);
  assert.equal(result.assets, state.assets);
  assert.equal(result.aportes, state.aportes);
  assert.equal(result.proventos, state.proventos);
  assert.equal(result.rfEvents, state.rfEvents);
  assert.equal(result.learnMeta, state.learnMeta);
  assert.deepEqual(result, { ...legacyBackupSnapshot(state), wallets: state.wallets, assets: state.assets, aportes: state.aportes, proventos: state.proventos, rfEvents: state.rfEvents, learnMeta: state.learnMeta });
});

test('buildStoredState keeps missing arrays empty and scalar defaults stable', () => {
  const result = PersistenceCore.buildStoredState({ goals: {} }, normalizeGoals);
  assert.deepEqual(result.wallets, []);
  assert.deepEqual(result.assets, []);
  assert.deepEqual(result.aportes, []);
  assert.deepEqual(result.proventos, []);
  assert.deepEqual(result.rfEvents, []);
  assert.equal(result.activeWalletId, '');
  assert.equal(result.tab, 'dashboard');
  assert.equal(result.divGoal, 0);
  assert.equal(result.rentBench, 'CDI');
});

test('serializeStoredState produces the persisted JSON and propagates circular errors', () => {
  const state = makeState();
  assert.equal(PersistenceCore.serializeStoredState(state, normalizeGoals), JSON.stringify(PersistenceCore.buildStoredState(state, normalizeGoals)));
  const cyclic = { goals: {}, learnMeta: {} };
  cyclic.learnMeta.self = cyclic;
  assert.throws(() => PersistenceCore.serializeStoredState(cyclic, normalizeGoals));
});

test('parseStoredState parses valid JSON, defaults empty input, and rejects invalid JSON', () => {
  assert.deepEqual(PersistenceCore.parseStoredState('{"a":1}'), { a: 1 });
  assert.deepEqual(PersistenceCore.parseStoredState(''), {});
  assert.throws(() => PersistenceCore.parseStoredState('{'));
});

test('serializeStoredState roundtrips special characters without normalization', () => {
  const state = makeState();
  state.wallets[0].name = 'Carteira Joao & Acao "Especial"\nLinha 2\t📈💰';
  state.assets[0].ticker = 'PETR4 "Preferencial"';
  state.assets[0].description = 'Linha 1\nLinha 2\tC:\\Investimentos\\Backup';
  state.aportes[0].note = '';
  state.learnMeta.PETR4.description = 'cedilha ç, aspas "sim", barra \\ e emoji 📈💰';
  const stored = PersistenceCore.buildStoredState(state, normalizeGoals);
  const parsed = PersistenceCore.parseStoredState(PersistenceCore.serializeStoredState(state, normalizeGoals));
  assert.deepEqual(parsed, stored);
  assert.equal(parsed.wallets[0].name, state.wallets[0].name);
  assert.equal(parsed.assets[0].ticker, state.assets[0].ticker);
  assert.equal(parsed.assets[0].description, state.assets[0].description);
  assert.equal(parsed.aportes[0].note, '');
  assert.equal(parsed.learnMeta.PETR4.description, state.learnMeta.PETR4.description);
});

test('buildBackupState matches the legacy JSON-cloned backup snapshot', () => {
  const state = makeState();
  assert.deepEqual(PersistenceCore.buildBackupState(state, normalizeGoals), legacyBackupSnapshot(state));
});

test('buildBackupState is deeply detached from later snapshot mutations', () => {
  const state = makeState();
  const original = jsonClone(state);
  const snapshot = PersistenceCore.buildBackupState(state, normalizeGoals);
  snapshot.assets[0].ticker = 'ALTERADO';
  snapshot.assets[0].nested.tags[0] = 'changed';
  snapshot.wallets[0].name = 'ALTERADA';
  snapshot.wallets[0].nested.order[1].two = false;
  snapshot.aportes[0].lots[0].qty = 999;
  snapshot.proventos[0].payments[0].value = 999;
  snapshot.rfEvents[0].steps[0].gross = 999;
  snapshot.goals.algumCampo.nested.value = 999;
  snapshot.learnMeta.PETR4.nested.seen[0] = 'changed';
  assert.deepEqual(state, original);
});

test('buildBackupState is deeply detached from later source mutations', () => {
  const state = makeState();
  const snapshot = PersistenceCore.buildBackupState(state, normalizeGoals);
  const expected = jsonClone(snapshot);
  state.assets[0].ticker = 'ALTERADO';
  state.wallets[0].name = 'ALTERADA';
  state.aportes[0].lots[0].qty = 999;
  state.proventos[0].payments[0].value = 999;
  state.rfEvents[0].steps[0].gross = 999;
  state.goals.algumCampo.nested.value = 999;
  state.learnMeta.PETR4.nested.seen[0] = 'changed';
  assert.deepEqual(snapshot, expected);
});

test('createBackupPayload clones data and storage.civ5 away from the original state', () => {
  const state = legacyBackupSnapshot(makeState());
  const payload = PersistenceCore.createBackupPayload(state, { divGoal: 123 }, {
    appName: 'Carteira de Investimentos',
    backupVersion: 1,
    exportedAt: '2026-07-12T12:00:00.000Z',
    origin: 'localStorage',
    storageKeys: ['civ5', 'civ5_cfg']
  });
  payload.data.assets[0].ticker = 'ALTERADO';
  payload.storage.civ5.wallets[0].name = 'ALTERADA';
  payload.storage.civ5.learnMeta.PETR4.nested.seen[0] = 'changed';
  assert.equal(state.assets[0].ticker, 'PETR4');
  assert.equal(state.wallets[0].name, 'Principal');
  assert.equal(state.learnMeta.PETR4.nested.seen[0], 'x');
  state.assets[0].nested.tags[0] = 'source changed';
  state.wallets[0].nested.order[1].two = false;
  assert.equal(payload.data.assets[0].nested.tags[0], 'core');
  assert.equal(payload.storage.civ5.wallets[0].nested.order[1].two, true);
  assert.deepEqual(payload.storage.civ5_cfg, { divGoal: 123 });
});

test('createBackupPayload keeps data and storage.civ5 directly independent', () => {
  const state = legacyBackupSnapshot(makeState());
  const fromData = PersistenceCore.createBackupPayload(state, { divGoal: 123 }, { storageKeys: ['civ5', 'civ5_cfg'] });
  fromData.data.assets[0].ticker = 'ALTERADO_DATA';
  fromData.data.wallets[0].nested.order[1].two = false;
  fromData.data.goals.algumCampo.nested.value = 999;
  fromData.data.learnMeta.PETR4.nested.seen[0] = 'data changed';
  assert.equal(fromData.storage.civ5.assets[0].ticker, 'PETR4');
  assert.equal(fromData.storage.civ5.wallets[0].nested.order[1].two, true);
  assert.equal(fromData.storage.civ5.goals.algumCampo.nested.value, 7);
  assert.equal(fromData.storage.civ5.learnMeta.PETR4.nested.seen[0], 'x');
  assert.equal(state.assets[0].ticker, 'PETR4');
  assert.equal(state.wallets[0].nested.order[1].two, true);

  const fromStorage = PersistenceCore.createBackupPayload(state, { divGoal: 123 }, { storageKeys: ['civ5', 'civ5_cfg'] });
  fromStorage.storage.civ5.assets[0].ticker = 'ALTERADO_STORAGE';
  fromStorage.storage.civ5.wallets[0].nested.order[1].two = false;
  fromStorage.storage.civ5.goals.algumCampo.nested.value = 999;
  fromStorage.storage.civ5.learnMeta.PETR4.nested.seen[0] = 'storage changed';
  assert.equal(fromStorage.data.assets[0].ticker, 'PETR4');
  assert.equal(fromStorage.data.wallets[0].nested.order[1].two, true);
  assert.equal(fromStorage.data.goals.algumCampo.nested.value, 7);
  assert.equal(fromStorage.data.learnMeta.PETR4.nested.seen[0], 'x');
  assert.equal(state.assets[0].ticker, 'PETR4');
  assert.equal(state.learnMeta.PETR4.nested.seen[0], 'x');
});

test('createBackupPayload keeps meta/storage shape and ignores config extras', () => {
  const state = legacyBackupSnapshot(makeState());
  const payload = PersistenceCore.createBackupPayload(state, { divGoal: 7, brapiToken: 'secret' }, {
    appName: 'Carteira de Investimentos',
    backupVersion: 1,
    exportedAt: '2026-07-12T12:00:00.000Z',
    origin: 'localStorage',
    storageKeys: ['civ5', 'civ5_cfg']
  });
  assert.deepEqual(payload.meta, {
    app: 'Carteira de Investimentos',
    backupVersion: 1,
    exportedAt: '2026-07-12T12:00:00.000Z',
    origin: 'localStorage',
    storageKeys: ['civ5', 'civ5_cfg']
  });
  assert.deepEqual(payload.data, state);
  assert.deepEqual(payload.storage.civ5, state);
  assert.deepEqual(payload.storage.civ5_cfg, { divGoal: 7 });
  assert.equal(payload.storage.civ5_cfg.brapiToken, undefined);
});

test('public backup APIs follow the old JSON clone semantics', () => {
  const state = makeState();
  state.assets[0].unknown = undefined;
  state.assets[0].nested.tags.push(undefined);
  state.learnMeta.PETR4.nil = null;
  state.learnMeta.PETR4.text = 'abc';
  state.learnMeta.PETR4.number = 123;
  state.learnMeta.PETR4.bool = false;
  const snapshot = PersistenceCore.buildBackupState(state, normalizeGoals);
  assert.deepEqual(snapshot, legacyBackupSnapshot(state));
  assert.equal('unknown' in snapshot.assets[0], false);
  assert.equal(snapshot.assets[0].nested.tags[1], null);

  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => PersistenceCore.createBackupPayload(cyclic, {}, { storageKeys: ['civ5', 'civ5_cfg'] }));
});

test('parseBackupRaw preserves legacy acceptance and rejection rules', () => {
  const modern = { meta: { app: 'Carteira de Investimentos', backupVersion: 1 }, data: { wallets: [], goals: {}, divGoal: 0 }, storage: { civ5: { wallets: [] }, civ5_cfg: { divGoal: 0 } } };
  assert.deepEqual(PersistenceCore.parseBackupRaw(modern), modern);
  assert.equal(PersistenceCore.parseBackupRaw(null), null);
  assert.equal(PersistenceCore.parseBackupRaw([]), null);
  assert.equal(PersistenceCore.parseBackupRaw({ foo: 1 }), null);
  assert.equal(PersistenceCore.parseBackupRaw({ meta: { app: 'Outra coisa' }, data: {} }), null);
  assert.ok(PersistenceCore.parseBackupRaw({ meta: { app: 'Carteira antiga' }, data: {} }));
  assert.equal(PersistenceCore.parseBackupRaw({ data: { wallets: [], mystery: true } }).data.mystery, true);
  assert.equal(PersistenceCore.parseBackupRaw({ divGoal: 9, brapiToken: 'abc' }).data.brapiToken, 'abc');
});

test('backupStats matches the legacy helper-based fixed-income rule', () => {
  const isFixedAsset = asset => normalizeType(asset?.type || asset?.metaType || 'Acao', 'Acao') === 'Renda Fixa';
  const data = {
    wallets: [{}, {}],
    assets: [
      { type: 'Acao' },
      { type: 'FII' },
      { type: 'ETF' },
      { type: 'Renda Fixa' },
      { type: '  renda   fixa  ' },
      { metaType: 'Renda Fixa' },
      { type: 'Desconhecido' }
    ],
    aportes: [{}, {}, {}],
    proventos: [{}],
    goals: normalizeGoals({ patrimonio: { target: 10 } }),
    brapiToken: 'abc'
  };
  assert.deepEqual(PersistenceCore.backupStats(data, normalizeGoals, isFixedAsset), legacyBackupStats(data, isFixedAsset));
});

test('backupStats handles absent arrays, wrong types, empty backup, and tokens like legacy code', () => {
  const isFixedAsset = asset => normalizeType(asset?.type || '', 'Acao') === 'Renda Fixa';
  for (const data of [
    {},
    { wallets: 'bad', assets: 'bad', aportes: 'bad', proventos: 'bad', goals: 'bad', brapiToken: '   ' },
    { wallets: null, assets: [{ type: 'Renda Fixa' }], aportes: null, proventos: null, goals: null, brapiToken: 'x' }
  ]) {
    assert.deepEqual(PersistenceCore.backupStats(data, normalizeGoals, isFixedAsset), legacyBackupStats(data, isFixedAsset));
  }
});

test('backupStats falls back to the core exact normalized rule only without injected classifier', () => {
  const stats = PersistenceCore.backupStats({ assets: [{ type: 'Renda Fixa' }, { type: 'FII' }] }, normalizeGoals);
  assert.equal(stats.fixed, 1);
});
