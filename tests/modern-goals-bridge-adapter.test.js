const assert = require('node:assert/strict');
const test = require('node:test');

const { createGoalsReadonlyBridge } = require('../modern/src/features/goals/goalsReadonlyBridge.mjs');
const { GOALS_READONLY_FALLBACK_SNAPSHOT } = require('../modern/src/features/goals/goalsReadonlyContract.mjs');

test('bridge lida com fonte ausente', () => {
  const bridge = createGoalsReadonlyBridge(null);
  const result = bridge.readSnapshot();
  assert.deepEqual(result, GOALS_READONLY_FALLBACK_SNAPSHOT);
});

test('bridge lida com fonte que retorna null', () => {
  const source = { getSnapshot: () => null };
  const bridge = createGoalsReadonlyBridge(source);
  const result = bridge.readSnapshot();
  assert.deepEqual(result, GOALS_READONLY_FALLBACK_SNAPSHOT);
});

test('bridge lida com fonte que lancar erro', () => {
  const source = { getSnapshot: () => { throw new Error('teste'); } };
  const bridge = createGoalsReadonlyBridge(source);
  const result = bridge.readSnapshot();
  assert.deepEqual(result, GOALS_READONLY_FALLBACK_SNAPSHOT);
});

test('bridge lida com snapshot invalido', () => {
  const source = { getSnapshot: () => ({}) };
  const bridge = createGoalsReadonlyBridge(source);
  const result = bridge.readSnapshot();
  assert.deepEqual(result, GOALS_READONLY_FALLBACK_SNAPSHOT);
});

test('bridge lida com snapshot valido', () => {
  const validSnapshot = {
    version: 1,
    originMode: 'real-wallet',
    originLabel: 'Teste',
    generatedAt: '2026-01-01T00:00:00.000Z',
    notice: 'Teste',
    flags: {
      hasPatrimonyGoal: true,
      hasIncomeGoal: false,
      hasAssetGoal: false,
      hasAllocationGoal: false,
      hasPortfolioData: true,
    },
    patrimony: {
      hasCurrent: true,
      hasTarget: true,
      current: 500000,
      target: 1000000,
      percent: 50,
      barPercent: 50,
      missing: 500000,
      excess: null,
      reached: false,
      tone: 'warn',
      monthlyContribution: 1000,
      annualVariation: 10,
    },
    income: {
      hasCurrent: false,
      hasTarget: false,
      current: null,
      target: null,
      percent: null,
      barPercent: 0,
      missing: null,
      excess: null,
      reached: false,
      tone: 'muted',
      currentMonthKey: '2026-01',
      currentMonthLabel: 'Janeiro 2026',
      currentMonthCount: 0,
      monthlyAverage: 0,
      total12: 0,
      hasData: false,
    },
    assetGoal: { type: 'Acao', ticker: 'TEST4', monthlyContribution: 500, annualVariation: 12, finalValue: 100000 },
    allocation: { items: [] },
    allowedTypes: ['Acao'],
    history: { groups: [], summary: { total: 0, monthCount: 0, avg: null } },
  };
  const source = { getSnapshot: () => validSnapshot };
  const bridge = createGoalsReadonlyBridge(source);
  const result = bridge.readSnapshot();
  assert.deepEqual(result.version, 1);
  assert.deepEqual(result.flags.hasPatrimonyGoal, true);
  assert.deepEqual(result.patrimony.current, 500000);
});

test('bridge nao muta snapshot original', () => {
  const validSnapshot = {
    version: 1,
    originMode: 'real-wallet',
    originLabel: 'Teste',
    generatedAt: '2026-01-01T00:00:00.000Z',
    notice: 'Teste',
    flags: {
      hasPatrimonyGoal: true,
      hasIncomeGoal: false,
      hasAssetGoal: false,
      hasAllocationGoal: false,
      hasPortfolioData: true,
    },
    patrimony: {
      hasCurrent: true,
      hasTarget: true,
      current: 100,
      target: 100,
      percent: 100,
      barPercent: 100,
      missing: null,
      excess: 0,
      reached: true,
      tone: 'ok',
      monthlyContribution: 0,
      annualVariation: 0,
    },
    income: {
      hasCurrent: false,
      hasTarget: false,
      current: null,
      target: null,
      percent: null,
      barPercent: 0,
      missing: null,
      excess: null,
      reached: false,
      tone: 'muted',
      currentMonthKey: '1970-01',
      currentMonthLabel: 'Janeiro 1970',
      currentMonthCount: 0,
      monthlyAverage: 0,
      total12: 0,
      hasData: false,
    },
    assetGoal: { type: '', ticker: '', monthlyContribution: 0, annualVariation: 0, finalValue: 0 },
    allocation: { items: [] },
    allowedTypes: [],
    history: { groups: [], summary: { total: 0, monthCount: 0, avg: null } },
  };
  const originalCurrent = validSnapshot.patrimony.current;
  const source = { getSnapshot: () => validSnapshot };
  const bridge = createGoalsReadonlyBridge(source);
  bridge.readSnapshot();
  assert.deepEqual(validSnapshot.patrimony.current, originalCurrent);
});

test('adapter com source valido', () => {
  const { createGoalsReadonlyAdapter } = require('../modern/src/features/goals/goalsSnapshotAdapter.mjs');
  const validSnapshot = {
    version: 1,
    originMode: 'real-wallet',
    originLabel: 'Teste',
    generatedAt: '2026-01-01T00:00:00.000Z',
    notice: 'Teste',
    flags: { hasPatrimonyGoal: true, hasIncomeGoal: false, hasAssetGoal: false, hasAllocationGoal: false, hasPortfolioData: true },
    patrimony: { hasCurrent: true, hasTarget: true, current: 100, target: 100, percent: 100, barPercent: 100, missing: null, excess: 0, reached: true, tone: 'ok', monthlyContribution: 0, annualVariation: 0 },
    income: { hasCurrent: false, hasTarget: false, current: null, target: null, percent: null, barPercent: 0, missing: null, excess: null, reached: false, tone: 'muted', currentMonthKey: '1970-01', currentMonthLabel: 'Janeiro 1970', currentMonthCount: 0, monthlyAverage: 0, total12: 0, hasData: false },
    assetGoal: { type: '', ticker: '', monthlyContribution: 0, annualVariation: 0, finalValue: 0 },
    allocation: { items: [] },
    allowedTypes: [],
    history: { groups: [], summary: { total: 0, monthCount: 0, avg: null } },
  };
  const source = { getSnapshot: () => validSnapshot };
  const adapter = createGoalsReadonlyAdapter(source);
  const result = adapter.getSnapshot();
  assert.deepEqual(result.patrimony.current, 100);
});

test('adapter com bridge', () => {
  const { createGoalsReadonlyAdapter } = require('../modern/src/features/goals/goalsSnapshotAdapter.mjs');
  const validSnapshot = {
    version: 1,
    originMode: 'real-wallet',
    originLabel: 'Teste',
    generatedAt: '2026-01-01T00:00:00.000Z',
    notice: 'Teste',
    flags: { hasPatrimonyGoal: true, hasIncomeGoal: false, hasAssetGoal: false, hasAllocationGoal: false, hasPortfolioData: true },
    patrimony: { hasCurrent: true, hasTarget: true, current: 200, target: 100, percent: 200, barPercent: 100, missing: null, excess: 100, reached: true, tone: 'ok', monthlyContribution: 0, annualVariation: 0 },
    income: { hasCurrent: false, hasTarget: false, current: null, target: null, percent: null, barPercent: 0, missing: null, excess: null, reached: false, tone: 'muted', currentMonthKey: '1970-01', currentMonthLabel: 'Janeiro 1970', currentMonthCount: 0, monthlyAverage: 0, total12: 0, hasData: false },
    assetGoal: { type: '', ticker: '', monthlyContribution: 0, annualVariation: 0, finalValue: 0 },
    allocation: { items: [] },
    allowedTypes: [],
    history: { groups: [], summary: { total: 0, monthCount: 0, avg: null } },
  };
  const bridge = createGoalsReadonlyBridge({ getSnapshot: () => validSnapshot });
  const adapter = createGoalsReadonlyAdapter(bridge);
  const result = adapter.getSnapshot();
  assert.deepEqual(result.patrimony.current, 200);
  assert.deepEqual(result.patrimony.barPercent, 100);
});

test('adapter com fonte invalida usa fallback', () => {
  const { createGoalsReadonlyAdapter } = require('../modern/src/features/goals/goalsSnapshotAdapter.mjs');
  const adapter = createGoalsReadonlyAdapter(null);
  const result = adapter.getSnapshot();
  assert.deepEqual(result, GOALS_READONLY_FALLBACK_SNAPSHOT);
});
