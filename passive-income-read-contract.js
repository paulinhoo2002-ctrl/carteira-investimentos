'use strict';

const COVERAGE = new Set(['COMPLETE', 'PARTIAL', 'UNKNOWN']);
const MONTH_COVERAGE = new Set([...COVERAGE, 'FUTURE']);

function finiteNonNegative(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function projectionNumber(value) {
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) return 'MISSING';
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 0) return 'INVALID';
  return 'VALID';
}

function validateProjectionAssets(assets) {
  if (!Array.isArray(assets)) return 'INCOMPLETE';
  for (const asset of assets) {
    if (!asset || typeof asset !== 'object' || Array.isArray(asset)) return 'INVALID';
    const quantityState = projectionNumber(asset.qty);
    if (quantityState === 'INVALID') return 'INVALID';
    if (quantityState === 'MISSING') return 'INCOMPLETE';
    if (Number(asset.qty) === 0) continue;

    const priceState = projectionNumber(asset.current_price);
    const yieldState = projectionNumber(asset.dy);
    if (priceState === 'INVALID' || yieldState === 'INVALID') return 'INVALID';
    if (priceState === 'MISSING' || yieldState === 'MISSING' || Number(asset.current_price) === 0) return 'INCOMPLETE';
  }
  return 'VALID';
}

function metric(state, value = null, extra = {}) {
  return { state, value, ...extra };
}

function numberFromGoal(value) {
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) return { state: 'MISSING' };
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 0) return { state: 'INVALID' };
  return { state: 'VALID', value: parsed };
}

function resolveMonthlyGoal(configuredMonthly, legacyMonthly) {
  const current = numberFromGoal(configuredMonthly);
  if (current.state === 'INVALID') return metric('INVALID');
  if (current.state === 'VALID' && current.value > 0) {
    return metric('CONFIGURED', current.value, { source: 'S.goals.proventos.monthly' });
  }

  const legacy = numberFromGoal(legacyMonthly);
  if (legacy.state === 'INVALID') return metric('INVALID', null, { source: 'S.divGoal' });
  if (legacy.state === 'VALID' && legacy.value > 0) {
    return metric('CONFIGURED', legacy.value, { source: 'S.divGoal' });
  }
  return metric('MISSING');
}

function readPassiveIncomeContract({
  incomeSnapshot,
  projectedMonthlyIncome,
  projectionAssets,
  configuredMonthlyGoal,
  legacyMonthlyGoal,
} = {}) {
  const summary = incomeSnapshot?.summary;
  const totalReceived = summary?.totalReceived;
  const paymentCount = summary?.paymentCount;
  const historyCoverage = summary?.historyCoverage ?? 'UNKNOWN';

  let realized;
  if (!summary) {
    realized = metric('MISSING', null, { observedState: 'MISSING', coverage: 'UNKNOWN' });
  } else if (
    !COVERAGE.has(historyCoverage) ||
    (totalReceived !== null && totalReceived !== undefined && !finiteNonNegative(totalReceived))
  ) {
    realized = metric('INVALID', null, { observedState: 'UNKNOWN', coverage: 'UNKNOWN' });
  } else if (paymentCount === undefined || paymentCount === null) {
    realized = metric('INCOMPLETE', null, { observedState: 'UNKNOWN', coverage: historyCoverage });
  } else if (
    !Number.isInteger(paymentCount) || paymentCount < 0 ||
    (paymentCount > 0 && (totalReceived === null || totalReceived === undefined)) ||
    (paymentCount === 0 && totalReceived !== null && totalReceived !== undefined && !(historyCoverage === 'COMPLETE' && totalReceived === 0)) ||
    (paymentCount === 0 && historyCoverage === 'COMPLETE' && totalReceived !== 0)
  ) {
    realized = metric('INVALID', null, { observedState: 'UNKNOWN', coverage: 'UNKNOWN' });
  } else if (paymentCount > 0) {
    realized = metric(historyCoverage === 'COMPLETE' ? 'PAID' : 'INCOMPLETE', totalReceived, {
      observedState: 'PAID',
      coverage: historyCoverage,
      paymentCount,
      source: 'incomeSnapshot.summary.totalReceived',
    });
  } else if (historyCoverage === 'COMPLETE') {
    realized = metric('PAID', 0, {
      observedState: 'PAID',
      coverage: historyCoverage,
      paymentCount,
      source: 'incomeSnapshot.summary.totalReceived',
    });
  } else if (historyCoverage === 'PARTIAL') {
    realized = metric('INCOMPLETE', null, { observedState: 'MISSING', coverage: historyCoverage, paymentCount });
  } else {
    realized = metric('MISSING', null, { observedState: 'MISSING', coverage: historyCoverage, paymentCount });
  }

  const projectionInputState = validateProjectionAssets(projectionAssets);
  let forecast;
  if (projectionInputState === 'INVALID') {
    forecast = metric('INVALID', null, { source: 'projection.finalMonthlyIncome', inputState: projectionInputState });
  } else if (projectedMonthlyIncome !== undefined && projectedMonthlyIncome !== null && !finiteNonNegative(projectedMonthlyIncome)) {
    forecast = metric('INVALID', null, { source: 'projection.finalMonthlyIncome', inputState: projectionInputState });
  } else if (projectionInputState === 'INCOMPLETE') {
    forecast = metric('INCOMPLETE', null, { source: 'projection.finalMonthlyIncome', inputState: projectionInputState });
  } else if (projectedMonthlyIncome === undefined || projectedMonthlyIncome === null) {
    forecast = metric('MISSING', null, { source: 'projection.finalMonthlyIncome' });
  } else {
    forecast = metric('ESTIMATE', projectedMonthlyIncome, { source: 'projection.finalMonthlyIncome', inputState: projectionInputState });
  }

  const monthCoverage = summary?.monthCoverage ?? 'UNKNOWN';
  const monthValue = summary?.monthTotal;
  let realizedMonth;
  if (!summary) {
    realizedMonth = metric('MISSING', null, { observedState: 'MISSING', coverage: monthCoverage });
  } else if (!MONTH_COVERAGE.has(monthCoverage)) {
    realizedMonth = metric('INVALID', null, { observedState: 'UNKNOWN', coverage: 'UNKNOWN' });
  } else if (
    (monthValue !== null && monthValue !== undefined && !finiteNonNegative(monthValue)) ||
    (monthCoverage === 'COMPLETE' && !finiteNonNegative(monthValue))
  ) {
    realizedMonth = metric('INVALID', null, { observedState: 'UNKNOWN', coverage: monthCoverage });
  } else if (monthCoverage === 'UNKNOWN' || monthCoverage === 'FUTURE') {
    realizedMonth = metric('MISSING', null, { observedState: 'MISSING', coverage: monthCoverage });
  } else if (monthCoverage === 'PARTIAL') {
    realizedMonth = metric('INCOMPLETE', monthValue ?? null, {
      observedState: monthValue === null || monthValue === undefined ? 'MISSING' : 'PAID',
      coverage: monthCoverage,
    });
  } else {
    realizedMonth = metric('PAID', monthValue, { observedState: 'PAID', coverage: monthCoverage });
  }

  // The current legacy snapshot calls passiveIncomeGoalStats() without coverage
  // evidence, so its average remains UNKNOWN. Only pass through an explicitly
  // COMPLETE, finite average; do not calculate or infer one here.
  const averageCoverage = summary?.averageCoverage ?? 'UNKNOWN';
  const averageValue = summary?.averageMonthly;
  let monthlyAverage;
  if (!summary) {
    monthlyAverage = metric('MISSING', null, { coverage: 'UNKNOWN' });
  } else if (averageValue !== null && averageValue !== undefined && !finiteNonNegative(averageValue)) {
    monthlyAverage = metric('INVALID', null, { coverage: averageCoverage });
  } else if (averageCoverage === 'UNKNOWN') {
    monthlyAverage = metric('MISSING', null, { coverage: averageCoverage });
  } else if (averageCoverage === 'PARTIAL') {
    monthlyAverage = metric('INCOMPLETE', null, { coverage: averageCoverage });
  } else if (averageCoverage !== 'COMPLETE' || !finiteNonNegative(averageValue)) {
    monthlyAverage = metric('INVALID', null, { coverage: averageCoverage === 'COMPLETE' ? 'COMPLETE' : 'UNKNOWN' });
  } else {
    monthlyAverage = metric('PAID', averageValue, { coverage: averageCoverage, source: 'incomeSnapshot.summary.averageMonthly' });
  }

  return {
    version: 1,
    realized,
    realizedMonth,
    monthlyAverage,
    forecast,
    goal: resolveMonthlyGoal(configuredMonthlyGoal, legacyMonthlyGoal),
  };
}

module.exports = { readPassiveIncomeContract, resolveMonthlyGoal, validateProjectionAssets };
