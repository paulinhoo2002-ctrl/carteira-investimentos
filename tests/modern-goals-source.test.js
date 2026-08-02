const assert = require('node:assert/strict');
const test = require('node:test');

const { createHostGoalsReadonlySource } = require('../modern/src/bootstrap/hostGoalsReadonlySource.ts');
const { GOALS_READONLY_FALLBACK_SNAPSHOT } = require('../modern/src/features/goals/goalsReadonlyContract.mjs');

test('host source com getGoalsSnapshot valido', () => {
  const validSnapshot = {
    version: 1,
    originMode: 'real-wallet',
    originLabel: 'Carteira ativa (legado)',
    generatedAt: '2026-01-01T00:00:00.000Z',
    notice: 'Snapshot readonly de metas. React nao escreve na fonte.',
    flags: {
      hasPatrimonyGoal: true,
      hasIncomeGoal: true,
      hasAssetGoal: false,
      hasAllocationGoal: true,
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
      monthlyContribution: 2000,
      annualVariation: 10,
    },
    income: {
      hasCurrent: true,
      hasTarget: true,
      current: 2000,
      target: 4000,
      percent: 50,
      barPercent: 50,
      missing: 2000,
      excess: null,
      reached: false,
      tone: 'warn',
      currentMonthKey: '2026-01',
      currentMonthLabel: 'Janeiro 2026',
      currentMonthCount: 5,
      monthlyAverage: 2000,
      total12: 24000,
      hasData: true,
    },
    assetGoal: {
      type: 'Acao',
      ticker: '',
      monthlyContribution: 0,
      annualVariation: 10,
      finalValue: 0,
    },
    allocation: {
      items: [
        { type: 'FII', pct: 40 },
        { type: 'Acao', pct: 30 },
        { type: 'ETF', pct: 20 },
        { type: 'Renda Fixa', pct: 10 },
      ],
    },
    allowedTypes: ['Acao', 'FII', 'ETF', 'BDR', 'Stock'],
    history: {
      groups: [
        {
          key: '2026-01',
          label: 'Janeiro 2026',
          total: 2000,
          count: 5,
          diff: null,
          diffPct: null,
          isCurrent: true,
        },
      ],
      summary: { total: 2000, monthCount: 1, avg: 2000 },
    },
  };

  const source = createHostGoalsReadonlySource({
    getGoalsSnapshot: () => validSnapshot,
  });

  const result = source.getSnapshot();
  assert.deepEqual(result.flags.hasPatrimonyGoal, true);
  assert.deepEqual(result.flags.hasIncomeGoal, true);
  assert.deepEqual(result.flags.hasAllocationGoal, true);
  assert.deepEqual(result.patrimony.current, 500000);
  assert.deepEqual(result.patrimony.monthlyContribution, 2000);
  assert.deepEqual(result.income.monthlyAverage, 2000);
  assert.deepEqual(result.income.total12, 24000);
  assert.deepEqual(result.income.hasData, true);
  assert.deepEqual(result.allocation.items.length, 4);
  assert.deepEqual(result.allocation.items[0].type, 'FII');
  assert.deepEqual(result.allocation.items[0].pct, 40);
  assert.deepEqual(result.allowedTypes, ['Acao', 'FII', 'ETF', 'BDR', 'Stock']);
  assert.deepEqual(result.history.groups.length, 1);
  assert.deepEqual(result.history.summary.total, 2000);
});

test('host source sem getGoalsSnapshot usa fallback', () => {
  const source = createHostGoalsReadonlySource({});
  const result = source.getSnapshot();
  assert.deepEqual(result, GOALS_READONLY_FALLBACK_SNAPSHOT);
});

test('host source com getGoalsSnapshot que retorna null usa fallback', () => {
  const source = createHostGoalsReadonlySource({
    getGoalsSnapshot: () => null,
  });
  const result = source.getSnapshot();
  assert.deepEqual(result, GOALS_READONLY_FALLBACK_SNAPSHOT);
});

test('host source com getGoalsSnapshot que lancar erro usa fallback', () => {
  const source = createHostGoalsReadonlySource({
    getGoalsSnapshot: () => {
      throw new Error('teste');
    },
  });
  const result = source.getSnapshot();
  assert.deepEqual(result, GOALS_READONLY_FALLBACK_SNAPSHOT);
});

test('host source com snapshot invalido usa fallback', () => {
  const source = createHostGoalsReadonlySource({
    getGoalsSnapshot: () => ({}),
  });
  const result = source.getSnapshot();
  assert.deepEqual(result, GOALS_READONLY_FALLBACK_SNAPSHOT);
});

test('host source nao muta snapshot original', () => {
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
      currentMonthKey: '',
      currentMonthLabel: '',
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
  const source = createHostGoalsReadonlySource({
    getGoalsSnapshot: () => validSnapshot,
  });
  source.getSnapshot();
  assert.deepEqual(validSnapshot.patrimony.current, originalCurrent);
});
