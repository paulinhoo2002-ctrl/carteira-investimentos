const assert = require('node:assert/strict');
const test = require('node:test');

const { createModernGoalsRuntime } = require('../modern/src/bootstrap/modernGoalsRuntime.ts');
const { createConnectedGoalsDemoSource } = require('../modern/src/features/goals/legacyGoalsReadonlyIntegration.ts');
const { GOALS_READONLY_FALLBACK_SNAPSHOT } = require('../modern/src/features/goals/goalsReadonlyContract.mjs');

test('runtime sem goalsSource usa demo source', () => {
  const runtime = createModernGoalsRuntime({});
  const snapshot = runtime.goalsAdapter.getSnapshot();
  assert.deepEqual(snapshot.originMode, 'demo-source');
  assert.deepEqual(snapshot.originLabel, 'Fonte demonstrativa');
});

test('runtime com goalsSource valido', () => {
  const validSnapshot = {
    version: 1,
    originMode: 'real-wallet',
    originLabel: 'Carteira ativa',
    generatedAt: '2026-01-01T00:00:00.000Z',
    notice: 'Snapshot readonly de metas.',
    flags: {
      hasPatrimonyGoal: true,
      hasIncomeGoal: true,
      hasAssetGoal: false,
      hasAllocationGoal: false,
      hasPortfolioData: true,
    },
    patrimony: {
      hasCurrent: true,
      hasTarget: true,
      current: 800000,
      target: 1000000,
      percent: 80,
      barPercent: 80,
      missing: 200000,
      excess: null,
      reached: false,
      tone: 'info',
      monthlyContribution: 3000,
      annualVariation: 12,
    },
    income: {
      hasCurrent: true,
      hasTarget: true,
      current: 3000,
      target: 4000,
      percent: 75,
      barPercent: 75,
      missing: 1000,
      excess: null,
      reached: false,
      tone: 'warn',
      currentMonthKey: '2026-01',
      currentMonthLabel: 'Janeiro 2026',
      currentMonthCount: 8,
      monthlyAverage: 3000,
      total12: 36000,
      hasData: true,
    },
    assetGoal: { type: '', ticker: '', monthlyContribution: 0, annualVariation: 0, finalValue: 0 },
    allocation: { items: [] },
    allowedTypes: [],
    history: { groups: [], summary: { total: 0, monthCount: 0, avg: null } },
  };

  const source = { getSnapshot: () => validSnapshot };
  const runtime = createModernGoalsRuntime({ goalsSource: source });

  assert.ok(runtime.goalsRefreshController !== null);
  const snapshot = runtime.goalsAdapter.getSnapshot();
  assert.deepEqual(snapshot.patrimony.current, 800000);
  assert.deepEqual(snapshot.patrimony.tone, 'info');
  assert.deepEqual(snapshot.income.current, 3000);
  assert.deepEqual(snapshot.income.tone, 'warn');
  assert.deepEqual(snapshot.income.monthlyAverage, 3000);
  assert.deepEqual(snapshot.income.total12, 36000);
});

test('runtime com goalsSource invalido usa fallback', () => {
  const invalidSource = { getSnapshot: () => null };
  const runtime = createModernGoalsRuntime({ goalsSource: invalidSource });
  const snapshot = runtime.goalsAdapter.getSnapshot();
  assert.deepEqual(snapshot, GOALS_READONLY_FALLBACK_SNAPSHOT);
});

test('runtime com goalsSource que lancar erro usa fallback', () => {
  const errorSource = { getSnapshot: () => { throw new Error('teste'); } };
  const runtime = createModernGoalsRuntime({ goalsSource: errorSource });
  const snapshot = runtime.goalsAdapter.getSnapshot();
  assert.deepEqual(snapshot, GOALS_READONLY_FALLBACK_SNAPSHOT);
});

test('runtime demo source e imutavel', () => {
  const runtime = createModernGoalsRuntime({});
  const snapshot = runtime.goalsAdapter.getSnapshot();
  // Validacao de imutabilidade pelo estado final (modo sloppy nao lanca TypeError).
  const originalVersion = snapshot.version;
  const originalCurrent = snapshot.patrimony.current;
  snapshot.version = 2;
  snapshot.patrimony.current = 999;
  assert.equal(snapshot.version, originalVersion);
  assert.equal(snapshot.patrimony.current, originalCurrent);
});

test('runtime nao expoe funcoes de escrita', () => {
  const runtime = createModernGoalsRuntime({});
  const adapter = runtime.goalsAdapter;
  assert.ok(typeof adapter.getSnapshot === 'function');
  assert.ok(typeof adapter.readSnapshot === 'undefined' || typeof adapter.readSnapshot !== 'function');
  assert.ok(typeof adapter.writeSnapshot === 'undefined');
  assert.ok(typeof adapter.setSnapshot === 'undefined');
});
