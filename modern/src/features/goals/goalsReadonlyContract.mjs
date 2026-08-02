export const GOALS_READONLY_CONTRACT_VERSION = 1;

export const GOALS_READONLY_ORIGIN_MODES = [
  'real-wallet',
  'empty-wallet',
  'fallback-readonly',
  'demo-source',
];

export const GOALS_READONLY_FALLBACK_SNAPSHOT = deepFreeze({
  version: GOALS_READONLY_CONTRACT_VERSION,
  originMode: 'fallback-readonly',
  originLabel: 'Fallback readonly',
  generatedAt: '1970-01-01T00:00:00.000Z',
  notice: 'Snapshot readonly de metas indisponivel. React nao escreve na fonte.',
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
    currentMonthKey: '1970-01',
    currentMonthLabel: 'Janeiro 1970',
    currentMonthCount: 0,
    monthlyAverage: 0,
    total12: 0,
    hasData: false,
  },
  assetGoal: {
    type: '',
    ticker: '',
    monthlyContribution: 0,
    annualVariation: 0,
    finalValue: 0,
  },
  allocation: {
    items: [],
  },
  allowedTypes: [],
  history: {
    groups: [],
    summary: { total: 0, monthCount: 0, avg: null },
  },
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNullableNumber(value) {
  return value === null || isFiniteNumber(value);
}

function isNullableString(value) {
  return value === null || typeof value === 'string';
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isGoalsOriginMode(value) {
  return typeof value === 'string' && GOALS_READONLY_ORIGIN_MODES.includes(value);
}

function isGoalsTone(value) {
  return ['muted', 'ok', 'info', 'warn', 'danger'].includes(value);
}

function isGoalsMetrics(value) {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.hasCurrent === 'boolean' &&
    typeof value.hasTarget === 'boolean' &&
    isNullableNumber(value.current) &&
    isNullableNumber(value.target) &&
    isNullableNumber(value.percent) &&
    isFiniteNumber(value.barPercent) &&
    value.barPercent >= 0 &&
    value.barPercent <= 100 &&
    isNullableNumber(value.missing) &&
    isNullableNumber(value.excess) &&
    typeof value.reached === 'boolean' &&
    isGoalsTone(value.tone) &&
    isFiniteNumber(value.monthlyContribution) &&
    Number.isInteger(value.monthlyContribution) &&
    value.monthlyContribution >= 0 &&
    isFiniteNumber(value.annualVariation) &&
    Number.isFinite(value.annualVariation)
  );
}

function isIncomeMetrics(value) {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.hasCurrent === 'boolean' &&
    typeof value.hasTarget === 'boolean' &&
    isNullableNumber(value.current) &&
    isNullableNumber(value.target) &&
    isNullableNumber(value.percent) &&
    isFiniteNumber(value.barPercent) &&
    value.barPercent >= 0 &&
    value.barPercent <= 100 &&
    isNullableNumber(value.missing) &&
    isNullableNumber(value.excess) &&
    typeof value.reached === 'boolean' &&
    isGoalsTone(value.tone) &&
    isNonEmptyString(value.currentMonthKey) &&
    isNonEmptyString(value.currentMonthLabel) &&
    isFiniteNumber(value.currentMonthCount) &&
    Number.isInteger(value.currentMonthCount) &&
    value.currentMonthCount >= 0 &&
    isFiniteNumber(value.monthlyAverage) &&
    Number.isFinite(value.monthlyAverage) &&
    isFiniteNumber(value.total12) &&
    Number.isFinite(value.total12) &&
    typeof value.hasData === 'boolean'
  );
}

function isAssetGoalConfig(value) {
  if (!isPlainObject(value)) return false;
  return (
    (isNonEmptyString(value.type) || value.type === '') &&
    (isNonEmptyString(value.ticker) || value.ticker === '') &&
    isFiniteNumber(value.monthlyContribution) &&
    Number.isInteger(value.monthlyContribution) &&
    value.monthlyContribution >= 0 &&
    isFiniteNumber(value.annualVariation) &&
    Number.isFinite(value.annualVariation) &&
    isFiniteNumber(value.finalValue) &&
    Number.isFinite(value.finalValue)
  );
}

function isAllocationItem(value) {
  if (!isPlainObject(value)) return false;
  return (
    isNonEmptyString(value.type) &&
    isFiniteNumber(value.pct) &&
    Number.isFinite(value.pct) &&
    value.pct >= 0
  );
}

function isHistoryGroup(value) {
  if (!isPlainObject(value)) return false;
  return (
    isNonEmptyString(value.key) &&
    isNonEmptyString(value.label) &&
    isFiniteNumber(value.total) &&
    Number.isFinite(value.total) &&
    isFiniteNumber(value.count) &&
    Number.isInteger(value.count) &&
    value.count >= 0 &&
    isNullableNumber(value.diff) &&
    isNullableNumber(value.diffPct) &&
    typeof value.isCurrent === 'boolean'
  );
}

function isHistorySummary(value) {
  if (!isPlainObject(value)) return false;
  return (
    isFiniteNumber(value.total) &&
    Number.isFinite(value.total) &&
    isFiniteNumber(value.monthCount) &&
    Number.isInteger(value.monthCount) &&
    value.monthCount >= 0 &&
    (value.avg === null || (isFiniteNumber(value.avg) && Number.isFinite(value.avg)))
  );
}

function isFlags(value) {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.hasPatrimonyGoal === 'boolean' &&
    typeof value.hasIncomeGoal === 'boolean' &&
    typeof value.hasAssetGoal === 'boolean' &&
    typeof value.hasAllocationGoal === 'boolean' &&
    typeof value.hasPortfolioData === 'boolean'
  );
}

function hasSupportedVersion(value) {
  return Object.prototype.hasOwnProperty.call(value, 'version')
    ? value.version === GOALS_READONLY_CONTRACT_VERSION
    : true;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const key of Object.keys(value)) {
    deepFreeze(value[key]);
  }
  return value;
}

function cloneFlags(flags) {
  return {
    hasPatrimonyGoal: flags.hasPatrimonyGoal,
    hasIncomeGoal: flags.hasIncomeGoal,
    hasAssetGoal: flags.hasAssetGoal,
    hasAllocationGoal: flags.hasAllocationGoal,
    hasPortfolioData: flags.hasPortfolioData,
  };
}

function clonePatrimonyMetrics(metrics) {
  return {
    hasCurrent: metrics.hasCurrent,
    hasTarget: metrics.hasTarget,
    current: metrics.current,
    target: metrics.target,
    percent: metrics.percent,
    barPercent: metrics.barPercent,
    missing: metrics.missing,
    excess: metrics.excess,
    reached: metrics.reached,
    tone: metrics.tone,
    monthlyContribution: metrics.monthlyContribution,
    annualVariation: metrics.annualVariation,
  };
}

function cloneIncomeMetrics(metrics) {
  return {
    hasCurrent: metrics.hasCurrent,
    hasTarget: metrics.hasTarget,
    current: metrics.current,
    target: metrics.target,
    percent: metrics.percent,
    barPercent: metrics.barPercent,
    missing: metrics.missing,
    excess: metrics.excess,
    reached: metrics.reached,
    tone: metrics.tone,
    currentMonthKey: metrics.currentMonthKey,
    currentMonthLabel: metrics.currentMonthLabel,
    currentMonthCount: metrics.currentMonthCount,
    monthlyAverage: metrics.monthlyAverage,
    total12: metrics.total12,
    hasData: metrics.hasData,
  };
}

function cloneAssetGoalConfig(config) {
  return {
    type: config.type,
    ticker: config.ticker,
    monthlyContribution: config.monthlyContribution,
    annualVariation: config.annualVariation,
    finalValue: config.finalValue,
  };
}

function cloneAllocationItem(item) {
  return {
    type: item.type,
    pct: item.pct,
  };
}

function cloneHistoryGroup(group) {
  return {
    key: group.key,
    label: group.label,
    total: group.total,
    count: group.count,
    diff: group.diff,
    diffPct: group.diffPct,
    isCurrent: group.isCurrent,
  };
}

function cloneHistory(history) {
  return {
    groups: history.groups.map((g) => cloneHistoryGroup(g)),
    summary: {
      total: history.summary.total,
      monthCount: history.summary.monthCount,
      avg: history.summary.avg,
    },
  };
}

function cloneReadonlyGoalsSnapshot(snapshot) {
  return deepFreeze({
    version: GOALS_READONLY_CONTRACT_VERSION,
    originMode: snapshot.originMode,
    originLabel: snapshot.originLabel,
    generatedAt: snapshot.generatedAt,
    notice: snapshot.notice,
    flags: cloneFlags(snapshot.flags),
    patrimony: clonePatrimonyMetrics(snapshot.patrimony),
    income: cloneIncomeMetrics(snapshot.income),
    assetGoal: cloneAssetGoalConfig(snapshot.assetGoal),
    allocation: {
      items: snapshot.allocation.items.map((item) => cloneAllocationItem(item)),
    },
    allowedTypes: [...snapshot.allowedTypes],
    history: cloneHistory(snapshot.history),
  });
}

export function isReadonlyGoalsSnapshot(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  if (!hasSupportedVersion(value)) {
    return false;
  }

  if (!isGoalsOriginMode(value.originMode) || !isNonEmptyString(value.originLabel)) {
    return false;
  }

  if (!isNonEmptyString(value.generatedAt) || !isNonEmptyString(value.notice)) {
    return false;
  }

  if (!isFlags(value.flags)) {
    return false;
  }

  if (!isGoalsMetrics(value.patrimony)) {
    return false;
  }

  if (!isIncomeMetrics(value.income)) {
    return false;
  }

  if (!isAssetGoalConfig(value.assetGoal)) {
    return false;
  }

  if (!Array.isArray(value.allocation?.items)) {
    return false;
  }
  if (!value.allocation.items.every((item) => isAllocationItem(item))) {
    return false;
  }

  if (!Array.isArray(value.allowedTypes) || !value.allowedTypes.every((t) => isNonEmptyString(t))) {
    return false;
  }

  if (!isPlainObject(value.history) || !Array.isArray(value.history.groups)) {
    return false;
  }
  if (!value.history.groups.every((g) => isHistoryGroup(g))) {
    return false;
  }
  if (!isHistorySummary(value.history.summary)) {
    return false;
  }

  return true;
}

export function normalizeReadonlyGoalsSnapshot(candidate) {
  if (!isReadonlyGoalsSnapshot(candidate)) {
    return GOALS_READONLY_FALLBACK_SNAPSHOT;
  }

  return cloneReadonlyGoalsSnapshot(candidate);
}
