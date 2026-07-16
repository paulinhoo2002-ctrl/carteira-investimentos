export const FIXED_INCOME_READONLY_CONTRACT_VERSION = 1;
export const FIXED_INCOME_READONLY_MATURITY_STATUSES = [
  'Vencido',
  'Próximo',
  'A vencer',
  'Sem informação',
];

export const FIXED_INCOME_READONLY_FALLBACK_SNAPSHOT = deepFreeze({
  version: FIXED_INCOME_READONLY_CONTRACT_VERSION,
  generatedAt: '1970-01-01T00:00:00.000Z',
  notice: 'Snapshot readonly de renda fixa indisponivel. React nao escreve na fonte.',
  summary: {
    totalApplied: null,
    totalGross: null,
    totalLiquid: null,
    totalProfit: null,
    totalIrValue: null,
    totalIofValue: null,
    totalCombinedTaxValue: null,
    totalUnavailableValue: null,
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

function isNullableNumber(value) {
  return value === null || isFiniteNumber(value);
}

function isNullableString(value) {
  return value === null || typeof value === 'string';
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isReadonlyFixedIncomeMaturityStatus(value) {
  return typeof value === 'string' && FIXED_INCOME_READONLY_MATURITY_STATUSES.includes(value);
}

function isReadonlyFixedIncomeSummary(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    isNullableNumber(value.totalApplied) &&
    isNullableNumber(value.totalGross) &&
    isNullableNumber(value.totalLiquid) &&
    isNullableNumber(value.totalProfit) &&
    isNullableNumber(value.totalIrValue) &&
    isNullableNumber(value.totalIofValue) &&
    isNullableNumber(value.totalCombinedTaxValue) &&
    isNullableNumber(value.totalUnavailableValue) &&
    isFiniteNumber(value.itemCount) &&
    Number.isInteger(value.itemCount) &&
    value.itemCount >= 0
  );
}

function hasFixedIncomeIdentity(value) {
  return isNonEmptyString(value.id) || isNonEmptyString(value.ticker) || isNonEmptyString(value.name);
}

function isReadonlyFixedIncomeItem(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    hasFixedIncomeIdentity(value) &&
    isNullableString(value.id) &&
    isNullableString(value.ticker) &&
    isNullableString(value.name) &&
    isNullableString(value.subtype) &&
    isNullableString(value.issuer) &&
    isNullableString(value.applicationDate) &&
    isNullableString(value.maturityDate) &&
    isNullableString(value.contractedRate) &&
    isNullableString(value.indexer) &&
    isNullableNumber(value.appliedValue) &&
    isNullableNumber(value.grossValue) &&
    isNullableNumber(value.liquidValue) &&
    isNullableNumber(value.profitValue) &&
    isNullableNumber(value.irValue) &&
    isNullableNumber(value.iofValue) &&
    isNullableNumber(value.combinedTaxValue) &&
    isNullableString(value.liquidity) &&
    isNullableNumber(value.unavailableValue) &&
    isReadonlyFixedIncomeMaturityStatus(value.maturityStatus) &&
    isNullableString(value.note)
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
    id: item.id,
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
    irValue: item.irValue,
    iofValue: item.iofValue,
    combinedTaxValue: item.combinedTaxValue,
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
      totalIrValue: snapshot.summary.totalIrValue,
      totalIofValue: snapshot.summary.totalIofValue,
      totalCombinedTaxValue: snapshot.summary.totalCombinedTaxValue,
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
