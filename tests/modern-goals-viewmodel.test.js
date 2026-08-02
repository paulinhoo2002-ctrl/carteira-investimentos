const assert = require('node:assert/strict');
const test = require('node:test');

const { createReadonlyGoalsViewModel } = require('../modern/src/features/goals/readonlyGoalsViewModel.ts');
const { GOALS_READONLY_FALLBACK_SNAPSHOT } = require('../modern/src/features/goals/goalsReadonlyContract.mjs');

test('viewModel com fallback snapshot', () => {
  const viewModel = createReadonlyGoalsViewModel(GOALS_READONLY_FALLBACK_SNAPSHOT);
  assert.deepEqual(viewModel.hasAnyGoal, false);
  assert.deepEqual(viewModel.patrimonyCard, null);
  assert.deepEqual(viewModel.incomeCard, null);
  assert.deepEqual(viewModel.assetGoalCard, null);
  assert.deepEqual(viewModel.allocationSection, null);
  assert.deepEqual(viewModel.historySection, null);
  assert.deepEqual(viewModel.originLabel, 'Fallback readonly');
});

test('viewModel com meta patrimonial real', () => {
  const snapshot = {
    version: 1,
    originMode: 'real-wallet',
    originLabel: 'Carteira ativa',
    generatedAt: '2026-01-01T00:00:00.000Z',
    notice: 'Snapshot readonly',
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
      monthlyContribution: 2000,
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

  const viewModel = createReadonlyGoalsViewModel(snapshot);
  assert.deepEqual(viewModel.hasAnyGoal, true);
  assert.ok(viewModel.patrimonyCard !== null);
  assert.deepEqual(viewModel.patrimonyCard.title, 'Meta patrimonial');
  assert.ok(viewModel.patrimonyCard.currentValue.includes('500.000'));
  assert.ok(viewModel.patrimonyCard.targetValue.includes('1.000.000'));
  assert.deepEqual(viewModel.patrimonyCard.tone, 'warn');
  assert.deepEqual(viewModel.patrimonyCard.barPercent, 50);
  assert.ok(viewModel.patrimonyCard.hasData);
  assert.deepEqual(viewModel.incomeCard, null);
  assert.deepEqual(viewModel.assetGoalCard, null);
  assert.deepEqual(viewModel.allocationSection, null);
  assert.deepEqual(viewModel.historySection, null);
});

test('viewModel com meta de renda real', () => {
  const snapshot = {
    version: 1,
    originMode: 'real-wallet',
    originLabel: 'Carteira ativa',
    generatedAt: '2026-01-01T00:00:00.000Z',
    notice: 'Snapshot readonly',
    flags: {
      hasPatrimonyGoal: false,
      hasIncomeGoal: true,
      hasAssetGoal: false,
      hasAllocationGoal: false,
      hasPortfolioData: true,
    },
    patrimony: {
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
      monthlyContribution: 0,
      annualVariation: 0,
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
      tone: 'info',
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

  const viewModel = createReadonlyGoalsViewModel(snapshot);
  assert.deepEqual(viewModel.hasAnyGoal, true);
  assert.deepEqual(viewModel.patrimonyCard, null);
  assert.ok(viewModel.incomeCard !== null);
  assert.deepEqual(viewModel.incomeCard.title, 'Meta de renda passiva');
  assert.ok(viewModel.incomeCard.currentValue.includes('3.000'));
  assert.ok(viewModel.incomeCard.targetValue.includes('4.000'));
  assert.deepEqual(viewModel.incomeCard.tone, 'info');
  assert.deepEqual(viewModel.incomeCard.barPercent, 75);
  assert.ok(viewModel.incomeCard.hasData);
});

test('viewModel com ativo-alvo configurado', () => {
  const snapshot = {
    version: 1,
    originMode: 'real-wallet',
    originLabel: 'Carteira ativa',
    generatedAt: '2026-01-01T00:00:00.000Z',
    notice: 'Snapshot readonly',
    flags: {
      hasPatrimonyGoal: false,
      hasIncomeGoal: false,
      hasAssetGoal: true,
      hasAllocationGoal: false,
      hasPortfolioData: false,
    },
    patrimony: {
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
    assetGoal: {
      type: 'Acao',
      ticker: 'PETR4',
      monthlyContribution: 1000,
      annualVariation: 12,
      finalValue: 200000,
    },
    allocation: { items: [] },
    allowedTypes: [],
    history: { groups: [], summary: { total: 0, monthCount: 0, avg: null } },
  };

  const viewModel = createReadonlyGoalsViewModel(snapshot);
  assert.deepEqual(viewModel.hasAnyGoal, true);
  assert.ok(viewModel.assetGoalCard !== null);
  assert.deepEqual(viewModel.assetGoalCard.typeValue, 'Acao');
  assert.deepEqual(viewModel.assetGoalCard.tickerValue, 'PETR4');
  assert.ok(viewModel.assetGoalCard.monthlyContributionValue.includes('1.000'));
  assert.ok(viewModel.assetGoalCard.finalValueValue.includes('200.000'));
});

test('viewModel com allocation configurada', () => {
  const snapshot = {
    version: 1,
    originMode: 'real-wallet',
    originLabel: 'Carteira ativa',
    generatedAt: '2026-01-01T00:00:00.000Z',
    notice: 'Snapshot readonly',
    flags: {
      hasPatrimonyGoal: false,
      hasIncomeGoal: false,
      hasAssetGoal: false,
      hasAllocationGoal: true,
      hasPortfolioData: false,
    },
    patrimony: {
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
    allocation: {
      items: [
        { type: 'FII', pct: 50 },
        { type: 'Acao', pct: 30 },
        { type: 'ETF', pct: 20 },
      ],
    },
    allowedTypes: [],
    history: { groups: [], summary: { total: 0, monthCount: 0, avg: null } },
  };

  const viewModel = createReadonlyGoalsViewModel(snapshot);
  assert.deepEqual(viewModel.hasAnyGoal, true);
  assert.ok(viewModel.allocationSection !== null);
  assert.deepEqual(viewModel.allocationSection.items.length, 3);
  assert.deepEqual(viewModel.allocationSection.items[0].type, 'FII');
  assert.deepEqual(viewModel.allocationSection.items[0].targetPct, 50);
  assert.deepEqual(viewModel.allocationSection.items[0].targetValue, '50,0%');
});

test('viewModel com historico', () => {
  const snapshot = {
    version: 1,
    originMode: 'real-wallet',
    originLabel: 'Carteira ativa',
    generatedAt: '2026-01-01T00:00:00.000Z',
    notice: 'Snapshot readonly',
    flags: {
      hasPatrimonyGoal: false,
      hasIncomeGoal: false,
      hasAssetGoal: false,
      hasAllocationGoal: false,
      hasPortfolioData: false,
    },
    patrimony: {
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
    history: {
      groups: [
        {
          key: '2026-01',
          label: 'Janeiro 2026',
          total: 2000,
          count: 5,
          diff: 500,
          diffPct: 33.3,
          isCurrent: true,
        },
        {
          key: '2025-12',
          label: 'Dezembro 2025',
          total: 1500,
          count: 4,
          diff: null,
          diffPct: null,
          isCurrent: false,
        },
      ],
      summary: { total: 3500, monthCount: 2, avg: 1750 },
    },
  };

  const viewModel = createReadonlyGoalsViewModel(snapshot);
  assert.ok(viewModel.historySection !== null);
  assert.deepEqual(viewModel.historySection.groups.length, 2);
  assert.ok(viewModel.historySection.groups[0].monthLabel.includes('Janeiro'));
  assert.ok(viewModel.historySection.groups[0].totalValue.includes('2.000'));
  assert.ok(viewModel.historySection.summary.totalValue.includes('3.500'));
  assert.ok(viewModel.historySection.summary.monthCountValue === '2');
});

test('viewModel sem metas e sem portfolio', () => {
  const snapshot = {
    version: 1,
    originMode: 'empty-wallet',
    originLabel: 'Carteira vazia',
    generatedAt: '2026-01-01T00:00:00.000Z',
    notice: 'Nenhuma carteira ativa',
    flags: {
      hasPatrimonyGoal: false,
      hasIncomeGoal: false,
      hasAssetGoal: false,
      hasAllocationGoal: false,
      hasPortfolioData: false,
    },
    patrimony: {
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

  const viewModel = createReadonlyGoalsViewModel(snapshot);
  assert.deepEqual(viewModel.hasAnyGoal, false);
  assert.deepEqual(viewModel.patrimonyCard, null);
  assert.deepEqual(viewModel.incomeCard, null);
  assert.deepEqual(viewModel.assetGoalCard, null);
  assert.deepEqual(viewModel.allocationSection, null);
  assert.deepEqual(viewModel.historySection, null);
});

test('viewModel progressbar so aparece com current + target', () => {
  const snapshotWithData = {
    version: 1,
    originMode: 'real-wallet',
    originLabel: 'Teste',
    generatedAt: '2026-01-01T00:00:00.000Z',
    notice: 'Teste',
    flags: { hasPatrimonyGoal: true, hasIncomeGoal: false, hasAssetGoal: false, hasAllocationGoal: false, hasPortfolioData: true },
    patrimony: { hasCurrent: true, hasTarget: true, current: 500, target: 1000, percent: 50, barPercent: 50, missing: 500, excess: null, reached: false, tone: 'warn', monthlyContribution: 0, annualVariation: 0 },
    income: { hasCurrent: false, hasTarget: false, current: null, target: null, percent: null, barPercent: 0, missing: null, excess: null, reached: false, tone: 'muted', currentMonthKey: '', currentMonthLabel: '', currentMonthCount: 0, monthlyAverage: 0, total12: 0, hasData: false },
    assetGoal: { type: '', ticker: '', monthlyContribution: 0, annualVariation: 0, finalValue: 0 },
    allocation: { items: [] },
    allowedTypes: [],
    history: { groups: [], summary: { total: 0, monthCount: 0, avg: null } },
  };
  const viewModelWithData = createReadonlyGoalsViewModel(snapshotWithData);
  assert.ok(viewModelWithData.patrimonyCard !== null);
  assert.ok(viewModelWithData.patrimonyCard.hasData);
  assert.deepEqual(viewModelWithData.patrimonyCard.barPercent, 50);
});

test('viewModel sem current ou target nao tem progressbar', () => {
  const snapshotNoData = {
    version: 1,
    originMode: 'real-wallet',
    originLabel: 'Teste',
    generatedAt: '2026-01-01T00:00:00.000Z',
    notice: 'Teste',
    flags: { hasPatrimonyGoal: false, hasIncomeGoal: false, hasAssetGoal: false, hasAllocationGoal: false, hasPortfolioData: false },
    patrimony: { hasCurrent: false, hasTarget: false, current: null, target: null, percent: null, barPercent: 0, missing: null, excess: null, reached: false, tone: 'muted', monthlyContribution: 0, annualVariation: 0 },
    income: { hasCurrent: false, hasTarget: false, current: null, target: null, percent: null, barPercent: 0, missing: null, excess: null, reached: false, tone: 'muted', currentMonthKey: '', currentMonthLabel: '', currentMonthCount: 0, monthlyAverage: 0, total12: 0, hasData: false },
    assetGoal: { type: '', ticker: '', monthlyContribution: 0, annualVariation: 0, finalValue: 0 },
    allocation: { items: [] },
    allowedTypes: [],
    history: { groups: [], summary: { total: 0, monthCount: 0, avg: null } },
  };
  const viewModelNoData = createReadonlyGoalsViewModel(snapshotNoData);
  assert.deepEqual(viewModelNoData.patrimonyCard, null);
});

test('viewModel allocation default nao exibe quando hasAllocationGoal=false', () => {
  const snapshot = {
    version: 1,
    originMode: 'real-wallet',
    originLabel: 'Teste',
    generatedAt: '2026-01-01T00:00:00.000Z',
    notice: 'Teste',
    flags: { hasPatrimonyGoal: false, hasIncomeGoal: false, hasAssetGoal: false, hasAllocationGoal: false, hasPortfolioData: true },
    patrimony: { hasCurrent: true, hasTarget: false, current: 100, target: null, percent: null, barPercent: 0, missing: null, excess: null, reached: false, tone: 'muted', monthlyContribution: 0, annualVariation: 0 },
    income: { hasCurrent: false, hasTarget: false, current: null, target: null, percent: null, barPercent: 0, missing: null, excess: null, reached: false, tone: 'muted', currentMonthKey: '', currentMonthLabel: '', currentMonthCount: 0, monthlyAverage: 0, total12: 0, hasData: false },
    assetGoal: { type: 'Acao', ticker: '', monthlyContribution: 0, annualVariation: 10, finalValue: 0 },
    allocation: { items: [{ type: 'FII', pct: 40 }, { type: 'Acao', pct: 25 }, { type: 'ETF', pct: 20 }, { type: 'BDR', pct: 5 }, { type: 'Renda Fixa', pct: 10 }] },
    allowedTypes: [],
    history: { groups: [], summary: { total: 0, monthCount: 0, avg: null } },
  };
  const viewModel = createReadonlyGoalsViewModel(snapshot);
  assert.deepEqual(viewModel.allocationSection, null);
});

test('viewModel ativo-alvo padrao nao exibe quando type=Acao e ticker=vazio e aporte=0 e finalValue=0', () => {
  const snapshot = {
    version: 1,
    originMode: 'real-wallet',
    originLabel: 'Teste',
    generatedAt: '2026-01-01T00:00:00.000Z',
    notice: 'Teste',
    flags: { hasPatrimonyGoal: false, hasIncomeGoal: false, hasAssetGoal: false, hasAllocationGoal: false, hasPortfolioData: true },
    patrimony: { hasCurrent: true, hasTarget: false, current: 100, target: null, percent: null, barPercent: 0, missing: null, excess: null, reached: false, tone: 'muted', monthlyContribution: 0, annualVariation: 0 },
    income: { hasCurrent: false, hasTarget: false, current: null, target: null, percent: null, barPercent: 0, missing: null, excess: null, reached: false, tone: 'muted', currentMonthKey: '', currentMonthLabel: '', currentMonthCount: 0, monthlyAverage: 0, total12: 0, hasData: false },
    assetGoal: { type: 'Acao', ticker: '', monthlyContribution: 0, annualVariation: 10, finalValue: 0 },
    allocation: { items: [] },
    allowedTypes: [],
    history: { groups: [], summary: { total: 0, monthCount: 0, avg: null } },
  };
  const viewModel = createReadonlyGoalsViewModel(snapshot);
  assert.deepEqual(viewModel.assetGoalCard, null);
});
