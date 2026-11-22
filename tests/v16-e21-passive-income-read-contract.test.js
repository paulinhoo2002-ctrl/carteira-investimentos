const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const {
  readPassiveIncomeContract,
  resolveMonthlyGoal,
  validateProjectionAssets,
} = require('../passive-income-read-contract.js');
const Projection = require('../analytics-passive-income-projection.js');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const snapshot = overrides => ({
  summary: {
    historyCoverage: 'PARTIAL',
    totalReceived: 150,
    paymentCount: 1,
    monthCoverage: 'PARTIAL',
    monthTotal: 150,
    averageCoverage: 'UNKNOWN',
    averageMonthly: null,
    ...overrides,
  },
  items: [
    { paymentState: 'PAID', receivedValue: 150, plannedValue: null },
    { paymentState: 'ANNOUNCED', receivedValue: null, plannedValue: 80 },
  ],
});

function currentGoalTarget(state) {
  const start = source.indexOf('function passiveIncomeGoalTarget(){');
  const end = source.indexOf('\n}', start) + 2;
  assert.ok(start >= 0 && end > start, 'existing passiveIncomeGoalTarget is present');
  const context = { S: state };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  return context.passiveIncomeGoalTarget();
}

test('realized receipts and projection remain separate without a combined total', () => {
  const result = readPassiveIncomeContract({
    incomeSnapshot: snapshot(),
    projectedMonthlyIncome: 35,
    projectionAssets: [],
  });

  assert.equal(result.realized.state, 'INCOMPLETE');
  assert.equal(result.realized.observedState, 'PAID');
  assert.equal(result.realized.value, 150);
  assert.equal(result.realized.paymentCount, 1);
  assert.equal(result.forecast.state, 'ESTIMATE');
  assert.equal(result.forecast.value, 35);
  assert.equal(result.monthlyAverage.state, 'MISSING');
  assert.equal(Object.hasOwn(result, 'total'), false);
  assert.equal(Object.hasOwn(result, 'combinedIncome'), false);
});

test('COMPLETE coverage alone confirms zero; unknown or partial coverage never implies zero', () => {
  const complete = readPassiveIncomeContract({
    incomeSnapshot: snapshot({
      historyCoverage: 'COMPLETE', totalReceived: 0, paymentCount: 0,
      monthCoverage: 'COMPLETE', monthTotal: 0,
    }),
  });
  assert.equal(complete.realized.state, 'PAID');
  assert.equal(complete.realized.value, 0);
  assert.equal(complete.realizedMonth.state, 'PAID');
  assert.equal(complete.realizedMonth.value, 0);

  const unknown = readPassiveIncomeContract({
    incomeSnapshot: snapshot({
      historyCoverage: 'UNKNOWN', totalReceived: null, paymentCount: 0,
      monthCoverage: 'UNKNOWN', monthTotal: null,
    }),
  });
  assert.equal(unknown.realized.state, 'MISSING');
  assert.equal(unknown.realized.value, null);
  assert.equal(unknown.realizedMonth.state, 'MISSING');

  const partial = readPassiveIncomeContract({
    incomeSnapshot: snapshot({ historyCoverage: 'PARTIAL', totalReceived: null, paymentCount: 0 }),
  });
  assert.equal(partial.realized.state, 'INCOMPLETE');
  assert.equal(partial.realized.value, null);
  assert.equal(readPassiveIncomeContract({ incomeSnapshot: snapshot({ paymentCount: null, totalReceived: Infinity }) }).realized.state, 'INVALID');
});

test('partial month preserves an observed subtotal as INCOMPLETE', () => {
  const result = readPassiveIncomeContract({ incomeSnapshot: snapshot() });
  assert.equal(result.realizedMonth.state, 'INCOMPLETE');
  assert.equal(result.realizedMonth.observedState, 'PAID');
  assert.equal(result.realizedMonth.value, 150);
});

test('monthly average requires explicit complete coverage and a finite value', () => {
  const currentLegacySnapshot = readPassiveIncomeContract({
    incomeSnapshot: snapshot({ averageCoverage: 'UNKNOWN', averageMonthly: null }),
  });
  assert.equal(currentLegacySnapshot.monthlyAverage.state, 'MISSING');

  const partial = readPassiveIncomeContract({
    incomeSnapshot: snapshot({ averageCoverage: 'PARTIAL', averageMonthly: null }),
  });
  assert.equal(partial.monthlyAverage.state, 'INCOMPLETE');
  assert.equal(partial.monthlyAverage.value, null);

  const complete = readPassiveIncomeContract({
    incomeSnapshot: snapshot({ averageCoverage: 'COMPLETE', averageMonthly: 25 }),
  });
  assert.equal(complete.monthlyAverage.state, 'PAID');
  assert.equal(complete.monthlyAverage.value, 25);

  const unsupportedComplete = readPassiveIncomeContract({
    incomeSnapshot: snapshot({ averageCoverage: 'COMPLETE', averageMonthly: null }),
  });
  assert.equal(unsupportedComplete.monthlyAverage.state, 'INVALID');
  assert.equal(readPassiveIncomeContract({ incomeSnapshot: snapshot({ averageCoverage: 'UNKNOWN', averageMonthly: Infinity }) }).monthlyAverage.state, 'INVALID');
});

test('official subtotal uses eligible PAID rows while snapshot count matches visible PAID items', () => {
  const start = source.indexOf('function proventoStats(){');
  const end = source.indexOf('\n}', start) + 2;
  assert.ok(start >= 0 && end > start, 'proventoStats is present');
  const context = {
    proventoHistoricoOficial: () => ({
      rows: [{ paymentDt: null, date: null }, { paymentDt: null, date: null }],
      summary: { total: 150 },
    }),
    parseAnyDate: () => null,
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  assert.equal(context.proventoStats().paymentCount, 2);
  assert.equal(context.proventoStats().total, 150);
  assert.match(source, /totalReceived: stats\.paymentCount > 0 \? stats\.total : null/);

  const snapshotStart = source.indexOf('getIncomeSnapshot(){');
  const snapshotEnd = source.indexOf('\n    getContributionsSnapshot(){', snapshotStart);
  assert.ok(snapshotStart >= 0 && snapshotEnd > snapshotStart, 'legacy income snapshot is present');
  const snapshotSource = source.slice(snapshotStart, snapshotEnd);
  assert.match(snapshotSource, /const incomeStats = passiveIncomeGoalStats\(\);/);
  assert.match(snapshotSource, /historyCoverage: 'UNKNOWN'/);
  assert.match(snapshotSource, /averageCoverage,/);
  assert.match(snapshotSource, /averageMonthly: incomeStats\.monthlyAverageStatus === 'COMPLETE'/);
  assert.match(snapshotSource, /const paymentCount = items\.filter\(item => item\.paymentState === 'PAID'\)\.length/);
  assert.match(snapshotSource, /totalReceived: stats\.paymentCount > 0 \? stats\.total : null/);
});

test('snapshot count matches visible PAID items when official history excludes an item', async () => {
  const snapshotStart = source.indexOf('getIncomeSnapshot(){');
  const snapshotEnd = source.indexOf('\n    getContributionsSnapshot(){', snapshotStart);
  assert.ok(snapshotStart >= 0 && snapshotEnd > snapshotStart, 'legacy income snapshot is present');
  const context = {
    S: { proventos: [{ id: 'paid-without-official-history', state: 'PAID', value: 25 }] },
    proventoStats: () => ({ paymentCount: 0, total: 0, mes: 0, ano: 0 }),
    passiveIncomeGoalStats: () => ({
      currentMonthCoverage: 'UNKNOWN', currentMonthCount: 0, currentMonthTotal: null,
      currentMonthKey: '2026-11', monthlyAverageStatus: 'UNKNOWN', monthlyAvg: null,
    }),
    globalThis: { DividendIntelligence: { classifyIncomeState: item => item.state } },
    proventoDividendPaymentDate: () => null,
    proventoTipoCanonical: () => 'Dividendo',
    toISODate: () => null,
  };
  vm.createContext(context);
  const getIncomeSnapshot = vm.runInContext(`({ ${source.slice(snapshotStart, snapshotEnd)} }).getIncomeSnapshot`, context);
  const incomeSnapshot = getIncomeSnapshot();
  assert.equal(incomeSnapshot.summary.paymentCount, 1);
  assert.equal(incomeSnapshot.summary.totalReceived, null);

  const { INCOME_READONLY_FALLBACK_SNAPSHOT, normalizeReadonlyIncomeSnapshot } =
    await import('../modern/src/features/income/incomeReadonlyContract.mjs');
  assert.notEqual(normalizeReadonlyIncomeSnapshot(incomeSnapshot), INCOME_READONLY_FALLBACK_SNAPSHOT);
});

test('PAID items with unavailable official subtotal remain INCOMPLETE, not INVALID or zero', () => {
  const result = readPassiveIncomeContract({
    incomeSnapshot: snapshot({ historyCoverage: 'UNKNOWN', totalReceived: null, paymentCount: 1 }),
  });
  assert.equal(result.realized.state, 'INCOMPLETE');
  assert.equal(result.realized.observedState, 'PAID');
  assert.equal(result.realized.value, null);
  assert.equal(result.realized.paymentCount, 1);
});

test('goal prioritizes S.goals.proventos.monthly and preserves numeric-string plus legacy fallback semantics', () => {
  assert.equal(currentGoalTarget({ divGoal: 90, goals: { proventos: { monthly: 120 } } }), 120);
  assert.equal(currentGoalTarget({ divGoal: 90, goals: { proventos: { monthly: 0 } } }), 90);
  assert.deepEqual(resolveMonthlyGoal('120', 90), { state: 'CONFIGURED', value: 120, source: 'S.goals.proventos.monthly' });
  assert.deepEqual(resolveMonthlyGoal(0, '90'), { state: 'CONFIGURED', value: 90, source: 'S.divGoal' });
  assert.deepEqual(resolveMonthlyGoal(0, 0), { state: 'MISSING', value: null });
  assert.deepEqual(resolveMonthlyGoal(undefined, undefined), { state: 'MISSING', value: null });
  assert.equal(resolveMonthlyGoal(Number.NaN, 90).state, 'INVALID');
  assert.equal(resolveMonthlyGoal(-1, 90).state, 'INVALID');
});

test('invalid totals, counts, and contradictory summary values stay INVALID', () => {
  for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY, -1, '150']) {
    const result = readPassiveIncomeContract({ incomeSnapshot: snapshot({ totalReceived: invalid }) });
    assert.equal(result.realized.state, 'INVALID');
    assert.equal(result.realized.value, null);
  }

  for (const invalidCount of [-1, 1.5, Number.NaN]) {
    assert.equal(readPassiveIncomeContract({ incomeSnapshot: snapshot({ paymentCount: invalidCount }) }).realized.state, 'INVALID');
  }

  assert.equal(readPassiveIncomeContract({ incomeSnapshot: snapshot({ historyCoverage: 'COMPLETE', paymentCount: 1, totalReceived: null }) }).realized.state, 'INVALID');
  assert.equal(readPassiveIncomeContract({ incomeSnapshot: snapshot({ paymentCount: 0, totalReceived: 0 }) }).realized.state, 'INVALID');
  assert.equal(readPassiveIncomeContract({ incomeSnapshot: snapshot({ historyCoverage: 'BROKEN' }) }).realized.state, 'INVALID');
  assert.equal(readPassiveIncomeContract({ incomeSnapshot: snapshot({ monthCoverage: 'UNKNOWN', monthTotal: Infinity }) }).realizedMonth.state, 'INVALID');
});

test('announced and estimated items are never re-summed into received or forecast values', () => {
  const input = snapshot();
  input.items.push({ paymentState: 'ESTIMATED', receivedValue: null, plannedValue: 500 });
  const result = readPassiveIncomeContract({ incomeSnapshot: input, projectedMonthlyIncome: 35, projectionAssets: [] });
  assert.equal(result.realized.value, 150);
  assert.equal(result.forecast.value, 35);
  assert.equal(Object.hasOwn(result, 'items'), false);
});

test('invalid projection inputs are blocked before a finite zero can appear as an estimate', () => {
  assert.equal(validateProjectionAssets([]), 'VALID');
  assert.equal(validateProjectionAssets([{ qty: 1, current_price: 10, dy: 0 }]), 'VALID');
  assert.equal(validateProjectionAssets([{ qty: 1, current_price: Infinity, dy: 5 }]), 'INVALID');
  assert.equal(validateProjectionAssets([{ qty: 1, current_price: 10, dy: 'x' }]), 'INVALID');
  assert.equal(validateProjectionAssets([{ qty: 1, current_price: 10, dy: -1 }]), 'INVALID');
  assert.equal(validateProjectionAssets([{ qty: 1, current_price: null, dy: 5 }]), 'INCOMPLETE');

  const maskedEngineOutput = readPassiveIncomeContract({
    projectedMonthlyIncome: 0,
    projectionAssets: [{ qty: 'invalid', current_price: 10, dy: 5 }],
  });
  assert.equal(maskedEngineOutput.forecast.state, 'INVALID');
  assert.equal(maskedEngineOutput.forecast.value, null);
  assert.equal(readPassiveIncomeContract({ projectedMonthlyIncome: Infinity }).forecast.state, 'INVALID');
  for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY, -1, '35']) {
    assert.equal(readPassiveIncomeContract({ projectedMonthlyIncome: invalid, projectionAssets: [] }).forecast.state, 'INVALID');
  }
});

test('E1.1 aporte temporal convention is verified by executing the existing projection engine', () => {
  const projection = Projection.projectWithDRIP({
    currentPortfolioValue: 0,
    currentMonthlyIncome: 0,
    monthlyContribution: 1000,
    years: 1,
  });
  assert.equal(projection.totalInvested, 12000);
  assert.equal(projection.finalPortfolioValue, 11000);
  assert.equal(projection.finalMonthlyIncome, 0);
  assert.ok(Number.isFinite(projection.finalPortfolioValue));
});
