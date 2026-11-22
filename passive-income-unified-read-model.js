(function () {
'use strict';

const passiveIncomeReadContract = typeof module !== 'undefined' && module.exports
  ? require('./passive-income-read-contract.js')
  : globalThis.PassiveIncomeReadContract;
if (typeof passiveIncomeReadContract?.readPassiveIncomeContract !== 'function') {
  throw new Error('Passive income read contract is unavailable.');
}
const { readPassiveIncomeContract } = passiveIncomeReadContract;

const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

function finiteNonNegative(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function monthOrdinal(value) {
  const match = MONTH_KEY.exec(value);
  return match ? Number(match[1]) * 12 + Number(match[2]) : null;
}

function readPeriod(goalStats, incomeSummary) {
  const referenceMonth = goalStats?.currentMonthKey;
  const referenceOrdinal = typeof referenceMonth === 'string' ? monthOrdinal(referenceMonth) : null;
  const reportedMonth = incomeSummary?.referenceMonth ?? incomeSummary?.monthKey;
  const referenceStatus = !reportedMonth
    ? 'MISSING'
    : typeof reportedMonth !== 'string' || reportedMonth !== referenceMonth || referenceOrdinal === null
      ? 'INVALID'
      : 'AVAILABLE';

  let windowStatus = 'MISSING';
  let monthKeys = null;
  if (Array.isArray(goalStats?.monthKeys)) {
    if (goalStats.monthKeys.length !== 12) {
      windowStatus = 'INCOMPLETE';
    } else {
      const ordinals = goalStats.monthKeys.map(monthOrdinal);
      const valid = ordinals.every(value => value !== null)
        && ordinals.every((value, index) => index === 0 || value === ordinals[index - 1] + 1)
        && referenceOrdinal !== null
        && ordinals[11] === referenceOrdinal;
      if (!valid || referenceStatus === 'INVALID') {
        windowStatus = 'INVALID';
      } else if (referenceStatus === 'MISSING') {
        windowStatus = 'MISSING';
      } else if (referenceStatus === 'AVAILABLE') {
        windowStatus = 'AVAILABLE';
        monthKeys = [...goalStats.monthKeys];
      }
    }
  }

  return {
    referenceMonth: referenceStatus === 'AVAILABLE' ? referenceMonth : null,
    referenceStatus,
    windowStatus,
    monthKeys,
  };
}

function readGoalProgress(goal, monthlyAverage, goalStats, period) {
  if (goal.state === 'INVALID' || monthlyAverage.state === 'INVALID') {
    return { state: 'INVALID', percent: null, remainingAmount: null };
  }
  if (goal.state === 'MISSING' || monthlyAverage.state === 'MISSING') {
    return { state: 'MISSING', percent: null, remainingAmount: null };
  }
  if (monthlyAverage.state === 'INCOMPLETE') {
    return { state: 'INCOMPLETE', percent: null, remainingAmount: null };
  }
  if (period.referenceStatus === 'INVALID' || period.windowStatus === 'INVALID') {
    return { state: 'INVALID', percent: null, remainingAmount: null };
  }
  if (period.referenceStatus === 'MISSING' || period.windowStatus === 'MISSING') {
    return { state: 'MISSING', percent: null, remainingAmount: null };
  }
  if (period.windowStatus === 'INCOMPLETE') {
    return { state: 'INCOMPLETE', percent: null, remainingAmount: null };
  }
  if (goal.state !== 'CONFIGURED' || monthlyAverage.state !== 'PAID' || !goalStats) {
    return { state: 'MISSING', percent: null, remainingAmount: null };
  }

  if (goalStats.monthlyAverageStatus === 'UNKNOWN') {
    return { state: 'MISSING', percent: null, remainingAmount: null };
  }
  if (goalStats.monthlyAverageStatus === 'PARTIAL') {
    return { state: 'INCOMPLETE', percent: null, remainingAmount: null };
  }

  const consistent = goalStats.monthlyAverageStatus === 'COMPLETE'
    && goalStats.completeMonthCount === 12
    && goalStats.target === goal.value
    && goalStats.monthlyAvg === monthlyAverage.value
    && finiteNonNegative(goalStats.percent)
    && finiteNonNegative(goalStats.missing)
    // Validate the existing passiveIncomeGoalStats() result; returned values
    // still come from that source, so this guard does not become a calculator.
    && goalStats.percent === (monthlyAverage.value / goal.value) * 100
    && goalStats.missing === Math.max(0, goal.value - monthlyAverage.value);
  if (!consistent) return { state: 'INVALID', percent: null, remainingAmount: null };

  return {
    state: 'AVAILABLE',
    percent: goalStats.percent,
    remainingAmount: goalStats.missing,
    source: 'passiveIncomeGoalStats',
  };
}

function quality(metric, source) {
  return {
    state: metric.state,
    coverage: metric.coverage ?? 'UNKNOWN',
    source: metric.source ?? source,
  };
}

function buildPassiveIncomeReadModel({
  incomeSnapshot,
  projectedMonthlyIncome,
  projectionAssets,
  configuredMonthlyGoal,
  legacyMonthlyGoal,
  goalStats,
} = {}) {
  const contract = readPassiveIncomeContract({
    incomeSnapshot,
    projectedMonthlyIncome,
    projectionAssets,
    configuredMonthlyGoal,
    legacyMonthlyGoal,
  });
  const period = readPeriod(goalStats, incomeSnapshot?.summary);
  const progress = readGoalProgress(contract.goal, contract.monthlyAverage, goalStats, period);

  return {
    version: 1,
    period,
    realized: contract.realized,
    realizedMonth: contract.realizedMonth,
    monthlyAverage: contract.monthlyAverage,
    forecast: contract.forecast,
    goal: contract.goal,
    progress,
    quality: {
      realized: quality(contract.realized, 'incomeSnapshot.summary.totalReceived'),
      realizedMonth: quality(contract.realizedMonth, 'incomeSnapshot.summary.monthTotal'),
      monthlyAverage: quality(contract.monthlyAverage, 'incomeSnapshot.summary.averageMonthly'),
      forecast: quality(contract.forecast, 'projection.finalMonthlyIncome'),
    },
  };
}

const passiveIncomeUnifiedReadModel = { buildPassiveIncomeReadModel };

if (typeof module !== 'undefined' && module.exports) module.exports = passiveIncomeUnifiedReadModel;
if (typeof globalThis !== 'undefined') globalThis.PassiveIncomeUnifiedReadModel = passiveIncomeUnifiedReadModel;
})();
