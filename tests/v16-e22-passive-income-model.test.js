const test = require('node:test');
const assert = require('node:assert/strict');

const Projection = require('../analytics-passive-income-projection.js');
const { buildPassiveIncomeReadModel } = require('../passive-income-unified-read-model.js');

function monthWindow(referenceMonth = '2026-11') {
  const [year, month] = referenceMonth.split('-').map(Number);
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (11 - index), 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

function incomeSnapshot(overrides = {}) {
  return {
    summary: {
      historyCoverage: 'COMPLETE',
      referenceMonth: '2026-11',
      totalReceived: 300,
      paymentCount: 2,
      monthCoverage: 'COMPLETE',
      monthTotal: 100,
      averageCoverage: 'COMPLETE',
      averageMonthly: 25,
      ...overrides,
    },
    items: [
      { paymentState: 'PAID', receivedValue: 300, plannedValue: null },
      { paymentState: 'ESTIMATED', receivedValue: null, plannedValue: 90 },
    ],
  };
}

function completeGoalStats(overrides = {}) {
  return {
    target: 100,
    monthlyAvg: 25,
    monthlyAverageStatus: 'COMPLETE',
    completeMonthCount: 12,
    percent: 25,
    missing: 75,
    currentMonthKey: '2026-11',
    monthKeys: monthWindow(),
    ...overrides,
  };
}

function build(overrides = {}) {
  return buildPassiveIncomeReadModel({
    incomeSnapshot: incomeSnapshot(),
    projectedMonthlyIncome: 40,
    projectionAssets: [],
    configuredMonthlyGoal: 100,
    legacyMonthlyGoal: 50,
    goalStats: completeGoalStats(),
    ...overrides,
  });
}

function assertFiniteNumericLeaves(value) {
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value), `model emitted non-finite number: ${value}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(assertFiniteNumericLeaves);
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach(assertFiniteNumericLeaves);
  }
}

test('unified model keeps PAID, ESTIMATE, goal, and progress separate with provenance', () => {
  const result = build();

  assert.equal(result.realized.state, 'PAID');
  assert.equal(result.realized.value, 300);
  assert.equal(result.realized.source, 'incomeSnapshot.summary.totalReceived');
  assert.equal(result.forecast.state, 'ESTIMATE');
  assert.equal(result.forecast.value, 40);
  assert.equal(result.forecast.source, 'projection.finalMonthlyIncome');
  assert.equal(result.goal.value, 100);
  assert.equal(result.goal.source, 'S.goals.proventos.monthly');
  assert.equal(result.progress.state, 'AVAILABLE');
  assert.equal(result.progress.percent, 25);
  assert.equal(result.period.referenceMonth, '2026-11');
  assert.deepEqual(result.period.monthKeys, monthWindow());
  assert.equal(Object.hasOwn(result, 'total'), false);
  assert.equal(Object.hasOwn(result, 'combinedIncome'), false);
  assert.equal(Object.hasOwn(result, 'items'), false);
  assertFiniteNumericLeaves(result);
});

test('empty portfolio uses existing projection output and keeps known zero distinct from missing history', () => {
  const projection = Projection.projectWithDRIP({
    currentPortfolioValue: 0,
    currentMonthlyIncome: 0,
    monthlyContribution: 1000,
    years: 1,
  });
  const result = build({
    incomeSnapshot: incomeSnapshot({
      historyCoverage: 'UNKNOWN', totalReceived: null, paymentCount: 0,
      monthCoverage: 'UNKNOWN', monthTotal: null,
      averageCoverage: 'UNKNOWN', averageMonthly: null,
    }),
    projectedMonthlyIncome: projection.finalMonthlyIncome,
    projectionAssets: [],
    goalStats: completeGoalStats({ monthlyAverageStatus: 'UNKNOWN', completeMonthCount: 0, monthlyAvg: null, percent: null, missing: null }),
  });

  assert.equal(projection.totalInvested, 12000);
  assert.equal(projection.finalPortfolioValue, 11000);
  assert.equal(projection.finalMonthlyIncome, 0);
  assert.equal(result.forecast.state, 'ESTIMATE');
  assert.equal(result.forecast.value, 0);
  assert.equal(result.realized.state, 'MISSING');
  assert.equal(result.realized.value, null);
  assert.equal(result.progress.state, 'MISSING');
});

test('complete coverage can confirm zero received income for an asset wallet without dividends', () => {
  const projection = Projection.calculatePortfolioYield([
    { qty: 1, current_price: 100, dy: 0 },
  ]);
  const result = build({
    incomeSnapshot: incomeSnapshot({ totalReceived: 0, paymentCount: 0, monthTotal: 0, averageMonthly: 0 }),
    projectedMonthlyIncome: projection.monthlyIncome,
    projectionAssets: [{ qty: 1, current_price: 100, dy: 0 }],
    goalStats: completeGoalStats({ monthlyAvg: 0, percent: 0, missing: 100 }),
  });

  assert.equal(result.realized.state, 'PAID');
  assert.equal(result.realized.value, 0);
  assert.equal(result.realizedMonth.state, 'PAID');
  assert.equal(result.monthlyAverage.value, 0);
  assert.equal(result.forecast.state, 'ESTIMATE');
  assert.equal(result.forecast.value, 0);
  assert.equal(result.progress.percent, 0);
});

test('partial month and partial average retain incomplete states and suppress goal progress', () => {
  const result = build({
    incomeSnapshot: incomeSnapshot({
      historyCoverage: 'PARTIAL',
      monthCoverage: 'PARTIAL', monthTotal: 75,
      averageCoverage: 'PARTIAL', averageMonthly: null,
    }),
    goalStats: completeGoalStats({ monthlyAverageStatus: 'PARTIAL', completeMonthCount: 6, monthlyAvg: 25, percent: null, missing: null }),
  });

  assert.equal(result.realized.state, 'INCOMPLETE');
  assert.equal(result.realized.value, 300);
  assert.equal(result.realizedMonth.state, 'INCOMPLETE');
  assert.equal(result.realizedMonth.value, 75);
  assert.equal(result.monthlyAverage.state, 'INCOMPLETE');
  assert.equal(result.progress.state, 'INCOMPLETE');
  assert.equal(result.progress.percent, null);
});

test('missing goal and insufficient period metadata never produce progress', () => {
  const noGoal = build({
    configuredMonthlyGoal: 0,
    legacyMonthlyGoal: 0,
    goalStats: completeGoalStats({ target: 0 }),
  });
  assert.equal(noGoal.goal.state, 'MISSING');
  assert.equal(noGoal.progress.state, 'MISSING');

  const noPeriod = build({ goalStats: completeGoalStats({ monthKeys: ['2026-11'] }) });
  assert.equal(noPeriod.period.windowStatus, 'INCOMPLETE');
  assert.equal(noPeriod.period.monthKeys, null);
  assert.equal(noPeriod.progress.state, 'INCOMPLETE');

  const noSnapshotReference = build({
    incomeSnapshot: incomeSnapshot({ referenceMonth: undefined }),
  });
  assert.equal(noSnapshotReference.period.referenceStatus, 'MISSING');
  assert.equal(noSnapshotReference.progress.state, 'MISSING');
});

test('legacy monthly goal fallback remains the configured goal source', () => {
  const result = build({
    configuredMonthlyGoal: 0,
    legacyMonthlyGoal: 50,
    goalStats: completeGoalStats({ target: 50, percent: 50, missing: 25 }),
  });

  assert.equal(result.goal.state, 'CONFIGURED');
  assert.equal(result.goal.value, 50);
  assert.equal(result.goal.source, 'S.divGoal');
  assert.equal(result.progress.percent, 50);
});

test('period and goal-stat contradictions are INVALID instead of silently normalized', () => {
  const wrongWindow = build({ goalStats: completeGoalStats({ monthKeys: monthWindow().slice(1) }) });
  assert.equal(wrongWindow.period.windowStatus, 'INCOMPLETE');

  const wrongTarget = build({ goalStats: completeGoalStats({ target: 99 }) });
  assert.equal(wrongTarget.progress.state, 'INVALID');

  const wrongAverage = build({ goalStats: completeGoalStats({ monthlyAvg: 24 }) });
  assert.equal(wrongAverage.progress.state, 'INVALID');

  const contradictoryPercent = build({ goalStats: completeGoalStats({ percent: 999, missing: 999 }) });
  assert.equal(contradictoryPercent.progress.state, 'INVALID');

  const invalidIncome = build({
    incomeSnapshot: incomeSnapshot({ totalReceived: Number.NaN }),
  });
  assert.equal(invalidIncome.realized.state, 'INVALID');
  assert.equal(invalidIncome.realized.value, null);

  const nonFiniteProgress = build({ goalStats: completeGoalStats({ percent: Infinity }) });
  assert.equal(nonFiniteProgress.progress.state, 'INVALID');
  assert.equal(nonFiniteProgress.progress.percent, null);

  const conflictingReference = build({
    incomeSnapshot: incomeSnapshot({ referenceMonth: '2026-10' }),
  });
  assert.equal(conflictingReference.period.referenceStatus, 'INVALID');
  assert.equal(conflictingReference.period.referenceMonth, null);
});

test('legacy snapshot ties income coverage to the same current-month reference', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const start = html.indexOf('getIncomeSnapshot(){');
  const end = html.indexOf('\n    getContributionsSnapshot(){', start);
  assert.ok(start >= 0 && end > start, 'existing income snapshot is present');
  assert.match(html.slice(start, end), /referenceMonth: incomeStats\.currentMonthKey/);
});

test('invalid or incomplete projection inputs do not become a finite estimate', () => {
  const invalid = build({
    projectedMonthlyIncome: 0,
    projectionAssets: [{ qty: 1, current_price: Infinity, dy: 5 }],
  });
  assert.equal(invalid.forecast.state, 'INVALID');
  assert.equal(invalid.forecast.value, null);

  const incomplete = build({
    projectedMonthlyIncome: 0,
    projectionAssets: [{ qty: 1, current_price: null, dy: 5 }],
  });
  assert.equal(incomplete.forecast.state, 'INCOMPLETE');
  assert.equal(incomplete.forecast.value, null);

  const invalidResult = build({
    projectedMonthlyIncome: Number.POSITIVE_INFINITY,
    projectionAssets: [],
  });
  assert.equal(invalidResult.forecast.state, 'INVALID');
  assert.equal(invalidResult.forecast.value, null);
  assertFiniteNumericLeaves(invalidResult);
});

test('E1.1 contribution timing remains unchanged and finite', () => {
  const projection = Projection.projectWithDRIP({
    currentPortfolioValue: 0,
    currentMonthlyIncome: 0,
    monthlyContribution: 1000,
    years: 1,
  });

  assert.equal(projection.totalInvested, 12000);
  assert.equal(projection.finalPortfolioValue, 11000);
  assert.equal(projection.finalMonthlyIncome, 0);
  assert.ok(Object.values(projection).flatMap(value => Array.isArray(value) ? value : [value])
    .filter(value => typeof value === 'number')
    .every(Number.isFinite));
});
