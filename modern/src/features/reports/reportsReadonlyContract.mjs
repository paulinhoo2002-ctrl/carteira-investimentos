export const READ_ONLY_REPORTS_CONTRACT_VERSION = 1;
export const READ_ONLY_REPORT_CATEGORIES = ['Acao demo', 'FII demo', 'ETF demo'];
export const READ_ONLY_REPORT_TRENDS = ['positive', 'neutral', 'negative'];

export const READ_ONLY_REPORTS_FALLBACK_SNAPSHOT = deepFreeze({
  version: READ_ONLY_REPORTS_CONTRACT_VERSION,
  generatedAt: '1970-01-01T00:00:00.000Z',
  notice: 'Snapshot controlado por adaptador somente leitura. React nao escreve na fonte.',
  summary: {
    totalValue: 0,
    itemCount: 0,
    averageVariationPct: 0,
  },
  items: [],
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isReadOnlyReportCategory(value) {
  return typeof value === 'string' && READ_ONLY_REPORT_CATEGORIES.includes(value);
}

function isReadOnlyReportTrend(value) {
  return typeof value === 'string' && READ_ONLY_REPORT_TRENDS.includes(value);
}

function isReadOnlyReportItem(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    isString(value.ticker) &&
    isString(value.name) &&
    isReadOnlyReportCategory(value.category) &&
    isFiniteNumber(value.quantity) &&
    Number.isInteger(value.quantity) &&
    value.quantity >= 0 &&
    isFiniteNumber(value.averagePrice) &&
    isFiniteNumber(value.currentValue) &&
    isFiniteNumber(value.variationPct) &&
    isFiniteNumber(value.allocationPct) &&
    isReadOnlyReportTrend(value.trend)
  );
}

function isReadOnlyReportsSummary(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    isFiniteNumber(value.totalValue) &&
    isFiniteNumber(value.itemCount) &&
    Number.isInteger(value.itemCount) &&
    value.itemCount >= 0 &&
    isFiniteNumber(value.averageVariationPct)
  );
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

function cloneReadOnlyReportItem(item) {
  return {
    ticker: item.ticker,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    averagePrice: item.averagePrice,
    currentValue: item.currentValue,
    variationPct: item.variationPct,
    allocationPct: item.allocationPct,
    trend: item.trend,
  };
}

function cloneReadOnlyReportsSnapshot(snapshot) {
  return deepFreeze({
    version: READ_ONLY_REPORTS_CONTRACT_VERSION,
    generatedAt: snapshot.generatedAt,
    notice: snapshot.notice,
    summary: {
      totalValue: snapshot.summary.totalValue,
      itemCount: snapshot.summary.itemCount,
      averageVariationPct: snapshot.summary.averageVariationPct,
    },
    items: snapshot.items.map((item) => cloneReadOnlyReportItem(item)),
  });
}

function hasSupportedVersion(value) {
  if (!Object.prototype.hasOwnProperty.call(value, 'version')) {
    return true;
  }

  return value.version === READ_ONLY_REPORTS_CONTRACT_VERSION;
}

export function isReadOnlyReportsSnapshot(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  if (!hasSupportedVersion(value)) {
    return false;
  }

  if (!isString(value.generatedAt) || !isString(value.notice)) {
    return false;
  }

  if (!isReadOnlyReportsSummary(value.summary) || !Array.isArray(value.items)) {
    return false;
  }

  if (value.summary.itemCount !== value.items.length) {
    return false;
  }

  return value.items.every((item) => isReadOnlyReportItem(item));
}

export function normalizeReadOnlyReportsSnapshot(candidate) {
  if (!isReadOnlyReportsSnapshot(candidate)) {
    return READ_ONLY_REPORTS_FALLBACK_SNAPSHOT;
  }

  return cloneReadOnlyReportsSnapshot(candidate);
}
