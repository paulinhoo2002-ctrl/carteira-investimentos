export const FIXED_INCOME_READONLY_CONTRACT_VERSION = 1;
export const FIXED_INCOME_READONLY_MATURITY_STATUSES = [
  'Vencido',
  'Proximos 30 dias',
  'Proximos 90 dias',
  'Proximos 12 meses',
  'Acima de 12 meses',
  'Sem vencimento',
];

export const FIXED_INCOME_READONLY_FALLBACK_SNAPSHOT = deepFreeze({
  version: FIXED_INCOME_READONLY_CONTRACT_VERSION,
  generatedAt: '1970-01-01T00:00:00.000Z',
  notice: 'Snapshot readonly de renda fixa indisponivel. React nao escreve na fonte.',
  summary: {
    totalApplied: 0,
    totalGross: 0,
    totalLiquid: 0,
    totalProfit: 0,
    totalTaxValue: 0,
    totalUnavailableValue: 0,
    itemCount: 0,
  },
  items: [],
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isString(value) {
  return typeof value === 'string';
}

function isReadonlyFixedIncomeMaturityStatus(value) {
  return typeof value === 'string' && FIXED_INCOME_READONLY_MATURITY_STATUSES.includes(value);
}

function isReadonlyFixedIncomeSummary(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    isFiniteNumber(value.totalApplied) &&
    isFiniteNumber(value.totalGross) &&
    isFiniteNumber(value.totalLiquid) &&
    isFiniteNumber(value.totalProfit) &&
    isFiniteNumber(value.totalTaxValue) &&
    isFiniteNumber(value.totalUnavailableValue) &&
    isFiniteNumber(value.itemCount) &&
    Number.isInteger(value.itemCount) &&
    value.itemCount >= 0
  );
}

function isReadonlyFixedIncomeItem(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.ticker) &&
    isNonEmptyString(value.name) &&
    isString(value.subtype) &&
    isString(value.issuer) &&
    isString(value.applicationDate) &&
    isString(value.maturityDate) &&
    isString(value.contractedRate) &&
    isString(value.indexer) &&
    isFiniteNumber(value.appliedValue) &&
    isFiniteNumber(value.grossValue) &&
    isFiniteNumber(value.liquidValue) &&
    isFiniteNumber(value.profitValue) &&
    isFiniteNumber(value.taxValue) &&
    isString(value.liquidity) &&
    isFiniteNumber(value.unavailableValue) &&
    isReadonlyFixedIncomeMaturityStatus(value.maturityStatus) &&
    isString(value.note)
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

function cloneReadonlyFixedIncomeItem(item) {
  return {
    ticker: item.ticker,
    name: item.name,
    subtype: item.subtype,
    issuer: item.issuer,
    applicationDate: item.applicationDate,
    maturityDate: item.maturityDate,
    contractedRate: item.contractedRate,
    indexer: item.indexer,
    appliedValue: item.appliedValue,
    grossValue: item.grossValue,
    liquidValue: item.liquidValue,
    profitValue: item.profitValue,
    taxValue: item.taxValue,
    liquidity: item.liquidity,
    unavailableValue: item.unavailableValue,
    maturityStatus: item.maturityStatus,
    note: item.note,
  };
}

function cloneReadonlyFixedIncomeSnapshot(snapshot) {
  return deepFreeze({
    version: FIXED_INCOME_READONLY_CONTRACT_VERSION,
    generatedAt: snapshot.generatedAt,
    notice: snapshot.notice,
    summary: {
      totalApplied: snapshot.summary.totalApplied,
      totalGross: snapshot.summary.totalGross,
      totalLiquid: snapshot.summary.totalLiquid,
      totalProfit: snapshot.summary.totalProfit,
      totalTaxValue: snapshot.summary.totalTaxValue,
      totalUnavailableValue: snapshot.summary.totalUnavailableValue,
      itemCount: snapshot.summary.itemCount,
    },
    items: snapshot.items.map((item) => cloneReadonlyFixedIncomeItem(item)),
  });
}

function hasSupportedVersion(value) {
  return Object.prototype.hasOwnProperty.call(value, 'version')
    ? value.version === FIXED_INCOME_READONLY_CONTRACT_VERSION
    : true;
}

export function isReadonlyFixedIncomeSnapshot(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  if (!hasSupportedVersion(value)) {
    return false;
  }

  if (!isNonEmptyString(value.generatedAt) || !isNonEmptyString(value.notice)) {
    return false;
  }

  if (!isReadonlyFixedIncomeSummary(value.summary) || !Array.isArray(value.items)) {
    return false;
  }

  if (value.summary.itemCount !== value.items.length) {
    return false;
  }

  return value.items.every((item) => isReadonlyFixedIncomeItem(item));
}

export function normalizeReadonlyFixedIncomeSnapshot(candidate) {
  if (!isReadonlyFixedIncomeSnapshot(candidate)) {
    return FIXED_INCOME_READONLY_FALLBACK_SNAPSHOT;
  }

  return cloneReadonlyFixedIncomeSnapshot(candidate);
}
