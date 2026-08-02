const assert = require('node:assert/strict');
const test = require('node:test');

const {
  GOALS_READONLY_CONTRACT_VERSION,
  GOALS_READONLY_FALLBACK_SNAPSHOT,
  isReadonlyGoalsSnapshot,
  normalizeReadonlyGoalsSnapshot,
} = require('../modern/src/features/goals/goalsReadonlyContract.mjs');

test('GOALS_READONLY_CONTRACT_VERSION e 1', () => {
  assert.equal(GOALS_READONLY_CONTRACT_VERSION, 1);
});

test('GOALS_READONLY_FALLBACK_SNAPSHOT e imutavel e valido', () => {
  const snapshot = GOALS_READONLY_FALLBACK_SNAPSHOT;
  assert.deepEqual(snapshot.version, 1);
  assert.deepEqual(snapshot.originMode, 'fallback-readonly');
  assert.deepEqual(snapshot.originLabel, 'Fallback readonly');
  assert.ok(typeof snapshot.generatedAt === 'string' && snapshot.generatedAt.length > 0);
  assert.ok(typeof snapshot.notice === 'string' && snapshot.notice.length > 0);
  assert.deepEqual(snapshot.flags, {
    hasPatrimonyGoal: false,
    hasIncomeGoal: false,
    hasAssetGoal: false,
    hasAllocationGoal: false,
    hasPortfolioData: false,
  });
  assert.deepEqual(snapshot.patrimony.hasCurrent, false);
  assert.deepEqual(snapshot.patrimony.hasTarget, false);
  assert.deepEqual(snapshot.patrimony.current, null);
  assert.deepEqual(snapshot.patrimony.target, null);
  assert.deepEqual(snapshot.patrimony.percent, null);
  assert.deepEqual(snapshot.patrimony.barPercent, 0);
  assert.deepEqual(snapshot.patrimony.missing, null);
  assert.deepEqual(snapshot.patrimony.excess, null);
  assert.deepEqual(snapshot.patrimony.reached, false);
  assert.deepEqual(snapshot.patrimony.tone, 'muted');
  assert.deepEqual(snapshot.patrimony.monthlyContribution, 0);
  assert.deepEqual(snapshot.patrimony.annualVariation, 0);
  assert.deepEqual(snapshot.income.monthlyAverage, 0);
  assert.deepEqual(snapshot.income.total12, 0);
  assert.deepEqual(snapshot.income.hasData, false);
  assert.deepEqual(snapshot.assetGoal.type, '');
  assert.deepEqual(snapshot.assetGoal.ticker, '');
  assert.deepEqual(snapshot.assetGoal.monthlyContribution, 0);
  assert.deepEqual(snapshot.assetGoal.annualVariation, 0);
  assert.deepEqual(snapshot.assetGoal.finalValue, 0);
  assert.deepEqual(snapshot.allocation.items, []);
  assert.deepEqual(snapshot.allowedTypes, []);
  assert.deepEqual(snapshot.history.groups, []);
  assert.deepEqual(snapshot.history.summary, { total: 0, monthCount: 0, avg: null });
  // Validacao de imutabilidade pelo estado final (modo sloppy nao lanca TypeError).
  const originalVersion = snapshot.version;
  const originalFlag = snapshot.flags.hasPatrimonyGoal;
  snapshot.version = 2;
  snapshot.flags.hasPatrimonyGoal = true;
  assert.equal(snapshot.version, originalVersion);
  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.flags.hasPatrimonyGoal, originalFlag);
  // Garantias de congelamento recursivo do fallback.
  assert.equal(
    Object.isFrozen(GOALS_READONLY_FALLBACK_SNAPSHOT),
    true,
  );
  assert.equal(
    Object.isFrozen(GOALS_READONLY_FALLBACK_SNAPSHOT.flags),
    true,
  );
  assert.equal(
    Object.isFrozen(GOALS_READONLY_FALLBACK_SNAPSHOT.patrimony),
    true,
  );
  assert.equal(
    Object.isFrozen(GOALS_READONLY_FALLBACK_SNAPSHOT.income),
    true,
  );
  assert.equal(
    Object.isFrozen(GOALS_READONLY_FALLBACK_SNAPSHOT.assetGoal),
    true,
  );
  assert.equal(
    Object.isFrozen(GOALS_READONLY_FALLBACK_SNAPSHOT.allocation),
    true,
  );
  assert.equal(
    Object.isFrozen(GOALS_READONLY_FALLBACK_SNAPSHOT.history),
    true,
  );
  assert.equal(
    Object.isFrozen(GOALS_READONLY_FALLBACK_SNAPSHOT.history.summary),
    true,
  );
  // Validadores publicos aceitam o fallback.
  // isIncomeMetrics e funcao interna do modulo; a checagem e feita
  // transitivamente por isReadonlyGoalsSnapshot, que valida o campo income.
  assert.equal(
    isReadonlyGoalsSnapshot(GOALS_READONLY_FALLBACK_SNAPSHOT),
    true,
  );
});

test('isReadonlyGoalsSnapshot aceita snapshot valido', () => {
  const snapshot = GOALS_READONLY_FALLBACK_SNAPSHOT;
  assert.ok(isReadonlyGoalsSnapshot(snapshot));
});

test('isReadonlyGoalsSnapshot rejeita null', () => {
  assert.ok(!isReadonlyGoalsSnapshot(null));
});

test('isReadonlyGoalsSnapshot rejeita undefined', () => {
  assert.ok(!isReadonlyGoalsSnapshot(undefined));
});

test('isReadonlyGoalsSnapshot rejeita objeto vazio', () => {
  assert.ok(!isReadonlyGoalsSnapshot({}));
});

test('isReadonlyGoalsSnapshot rejeita objeto com versao errada', () => {
  // A propriedade version invalida precisa vir apos o spread para nao
  // ser sobrescrita por GOALS_READONLY_FALLBACK_SNAPSHOT.version (1).
  const invalid = {
    ...GOALS_READONLY_FALLBACK_SNAPSHOT,
    version: 2,
  };
  assert.ok(!isReadonlyGoalsSnapshot(invalid));
});

test('normalizeReadonlyGoalsSnapshot retorna fallback para null', () => {
  const result = normalizeReadonlyGoalsSnapshot(null);
  assert.deepEqual(result, GOALS_READONLY_FALLBACK_SNAPSHOT);
});

test('normalizeReadonlyGoalsSnapshot retorna fallback para invalido', () => {
  const result = normalizeReadonlyGoalsSnapshot({});
  assert.deepEqual(result, GOALS_READONLY_FALLBACK_SNAPSHOT);
});

test('normalizeReadonlyGoalsSnapshot retorna snapshot valido inalterado e congelado', () => {
  const input = {
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
      currentMonthKey: '2026-01',
      currentMonthLabel: 'Janeiro 2026',
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
  const result = normalizeReadonlyGoalsSnapshot(input);
  assert.deepEqual(result.version, 1);
  assert.deepEqual(result.flags.hasPatrimonyGoal, true);
  assert.deepEqual(result.patrimony.current, 100);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.flags));
  assert.ok(Object.isFrozen(result.patrimony));
  assert.ok(Object.isFrozen(result.income));
  assert.ok(Object.isFrozen(result.assetGoal));
  assert.ok(Object.isFrozen(result.allocation));
  assert.ok(Object.isFrozen(result.allocation.items));
  assert.ok(Object.isFrozen(result.history));
  assert.ok(Object.isFrozen(result.history.groups));
  assert.ok(Object.isFrozen(result.history.summary));
});

test('snapshot valido preserva zero real', () => {
  const input = {
    version: 1,
    originMode: 'real-wallet',
    originLabel: 'Teste',
    generatedAt: '2026-01-01T00:00:00.000Z',
    notice: 'Teste',
    flags: {
      hasPatrimonyGoal: false,
      hasIncomeGoal: false,
      hasAssetGoal: false,
      hasAllocationGoal: false,
      hasPortfolioData: false,
    },
    patrimony: {
      hasCurrent: true,
      hasTarget: true,
      current: 0,
      target: 0,
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
      currentMonthKey: '2026-01',
      currentMonthLabel: 'Janeiro 2026',
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
  const result = normalizeReadonlyGoalsSnapshot(input);
  assert.deepEqual(result.patrimony.current, 0);
  assert.deepEqual(result.patrimony.target, 0);
  assert.deepEqual(result.patrimony.monthlyContribution, 0);
});

test('snapshot valido com percent > 100', () => {
  const input = {
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
      current: 1500000,
      target: 1000000,
      percent: 150,
      barPercent: 100,
      missing: null,
      excess: 500000,
      reached: true,
      tone: 'ok',
      monthlyContribution: 2000,
      annualVariation: 12,
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
    assetGoal: { type: '', ticker: '', monthlyContribution: 0, annualVariation: 0, finalValue: 0 },
    allocation: { items: [] },
    allowedTypes: [],
    history: { groups: [], summary: { total: 0, monthCount: 0, avg: null } },
  };
  const result = normalizeReadonlyGoalsSnapshot(input);
  assert.deepEqual(result.patrimony.percent, 150);
  assert.deepEqual(result.patrimony.barPercent, 100);
  assert.deepEqual(result.patrimony.reached, true);
});

test('snapshot valido com barPercent limitado a 100', () => {
  const input = {
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
      current: 2000000,
      target: 1000000,
      percent: 200,
      barPercent: 100,
      missing: null,
      excess: 1000000,
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
      currentMonthKey: '2026-01',
      currentMonthLabel: 'Janeiro 2026',
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
  const result = normalizeReadonlyGoalsSnapshot(input);
  assert.deepEqual(result.patrimony.barPercent, 100);
});

test('snapshot valido deep freeze', () => {
  const input = {
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
      currentMonthKey: '2026-01',
      currentMonthLabel: 'Janeiro 2026',
      currentMonthCount: 0,
      monthlyAverage: 0,
      total12: 0,
      hasData: false,
    },
    assetGoal: { type: '', ticker: '', monthlyContribution: 0, annualVariation: 0, finalValue: 0 },
    allocation: { items: [{ type: 'Acao', pct: 50 }] },
    allowedTypes: ['Acao'],
    history: { groups: [], summary: { total: 0, monthCount: 0, avg: null } },
  };
  const result = normalizeReadonlyGoalsSnapshot(input);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.flags));
  assert.ok(Object.isFrozen(result.patrimony));
  assert.ok(Object.isFrozen(result.income));
  assert.ok(Object.isFrozen(result.assetGoal));
  assert.ok(Object.isFrozen(result.allocation));
  assert.ok(Object.isFrozen(result.allocation.items));
  assert.ok(Object.isFrozen(result.allocation.items[0]));
  assert.ok(Object.isFrozen(result.history));
  assert.ok(Object.isFrozen(result.history.groups));
  assert.ok(Object.isFrozen(result.history.summary));
});

test('normalize nao muta snapshot original', () => {
  const input = {
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
      currentMonthKey: '2026-01',
      currentMonthLabel: 'Janeiro 2026',
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
  const originalCurrent = input.patrimony.current;
  normalizeReadonlyGoalsSnapshot(input);
  assert.deepEqual(input.patrimony.current, originalCurrent);
});
