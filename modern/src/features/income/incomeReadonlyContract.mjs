export const INCOME_READONLY_CONTRACT_VERSION = 1;

export const INCOME_READONLY_FALLBACK_SNAPSHOT = deepFreeze({
  version: INCOME_READONLY_CONTRACT_VERSION,
  generatedAt: '1970-01-01T00:00:00.000Z',
  notice: 'Snapshot readonly de proventos indisponivel. React nao escreve na fonte.',
  summary: {
    totalReceived: null,
    monthTotal: null,
    yearTotal: null,
    averageMonthly: null,
    paymentCount: 0,
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

function hasSupportedVersion(value) {
  return Object.prototype.hasOwnProperty.call(value, 'version')
    ? value.version === INCOME_READONLY_CONTRACT_VERSION
    : true;
}

function hasReadonlyIncomePayload(value) {
  return (
    isNullableString(value.id) ||
    isNullableString(value.ticker) ||
    isNullableString(value.name) ||
    isNullableString(value.type) ||
    isNullableString(value.paymentDate) ||
    isNullableString(value.competenceDate) ||
    isNullableNumber(value.grossValue) ||
    isNullableNumber(value.netValue) ||
    isNullableNumber(value.taxValue) ||
    isNullableNumber(value.quantity) ||
    isNullableString(value.note) ||
    isNullableString(value.source) ||
    isNullableString(value.sourceEventKind) ||
    isNullableString(value.sourceEventId)
  );
}

function isReadonlyIncomeSummary(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    isNullableNumber(value.totalReceived) &&
    isNullableNumber(value.monthTotal) &&
    isNullableNumber(value.yearTotal) &&
    isNullableNumber(value.averageMonthly) &&
    isFiniteNumber(value.paymentCount) &&
    Number.isInteger(value.paymentCount) &&
    value.paymentCount >= 0
  );
}

function isReadonlyIncomeItem(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    hasReadonlyIncomePayload(value) &&
    isNullableString(value.id) &&
    isNullableString(value.ticker) &&
    isNullableString(value.name) &&
    isNullableString(value.type) &&
    isNullableString(value.paymentDate) &&
    isNullableString(value.competenceDate) &&
    isNullableNumber(value.grossValue) &&
    isNullableNumber(value.netValue) &&
    isNullableNumber(value.taxValue) &&
    isNullableNumber(value.quantity) &&
    isNullableString(value.note) &&
    isNullableString(value.source) &&
    isNullableString(value.sourceEventKind) &&
    isNullableString(value.sourceEventId)
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

function cloneReadonlyIncomeItem(item) {
  return {
    id: item.id,
    ticker: item.ticker,
    name: item.name,
    type: item.type,
    paymentDate: item.paymentDate,
    competenceDate: item.competenceDate,
    grossValue: item.grossValue,
    netValue: item.netValue,
    taxValue: item.taxValue,
    quantity: item.quantity,
    note: item.note,
    source: item.source,
    sourceEventKind: item.sourceEventKind,
    sourceEventId: item.sourceEventId,
  };
}

function cloneReadonlyIncomeSnapshot(snapshot) {
  return deepFreeze({
    version: INCOME_READONLY_CONTRACT_VERSION,
    generatedAt: snapshot.generatedAt,
    notice: snapshot.notice,
    summary: {
      totalReceived: snapshot.summary.totalReceived,
      monthTotal: snapshot.summary.monthTotal,
      yearTotal: snapshot.summary.yearTotal,
      averageMonthly: snapshot.summary.averageMonthly,
      paymentCount: snapshot.summary.paymentCount,
    },
    items: snapshot.items.map((item) => cloneReadonlyIncomeItem(item)),
  });
}

export function isReadonlyIncomeSnapshot(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  if (!hasSupportedVersion(value)) {
    return false;
  }

  if (!isNonEmptyString(value.generatedAt) || !isNonEmptyString(value.notice)) {
    return false;
  }

  if (!isReadonlyIncomeSummary(value.summary) || !Array.isArray(value.items)) {
    return false;
  }

  if (value.summary.paymentCount !== value.items.length) {
    return false;
  }

  return value.items.every((item) => isReadonlyIncomeItem(item));
}

export function normalizeReadonlyIncomeSnapshot(candidate) {
  if (!isReadonlyIncomeSnapshot(candidate)) {
    return INCOME_READONLY_FALLBACK_SNAPSHOT;
  }

  return cloneReadonlyIncomeSnapshot(candidate);
}
