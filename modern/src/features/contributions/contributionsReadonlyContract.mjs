export const CONTRIBUTIONS_READONLY_CONTRACT_VERSION = 1;
export const CONTRIBUTIONS_READONLY_SUGGESTION_STATUSES = [
  'available',
  'unavailable',
  'insufficient-data',
  'conflicting',
];
export const CONTRIBUTIONS_READONLY_ORIGIN_MODES = [
  'real-wallet',
  'empty-wallet',
  'fallback-readonly',
  'demo-source',
];

export const CONTRIBUTIONS_READONLY_FALLBACK_SNAPSHOT = deepFreeze({
  version: CONTRIBUTIONS_READONLY_CONTRACT_VERSION,
  originMode: 'fallback-readonly',
  originLabel: 'Fallback readonly',
  generatedAt: '1970-01-01T00:00:00.000Z',
  notice: 'Snapshot readonly de aportes indisponivel. React nao escreve na fonte.',
  summary: {
    itemCount: 0,
    classCount: 0,
    monthCount: 0,
    candidateCount: 0,
    insufficientCount: 0,
    avoidedCount: 0,
    latestContributionDate: null,
  },
  items: [],
  classDistribution: [],
  monthDistribution: [],
  suggestion: {
    status: 'unavailable',
    generatedAt: '1970-01-01T00:00:00.000Z',
    strategyName: null,
    candidates: [],
    warnings: [],
    inputs: [],
    limitations: [],
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

function isReadonlyContributionsOriginMode(value) {
  return typeof value === 'string' && CONTRIBUTIONS_READONLY_ORIGIN_MODES.includes(value);
}

function isReadonlyContributionsSuggestionStatus(value) {
  return typeof value === 'string' && CONTRIBUTIONS_READONLY_SUGGESTION_STATUSES.includes(value);
}

function hasReadonlyContributionPayload(value) {
  return (
    isNonEmptyString(value.id) ||
    isNonEmptyString(value.sourceEventId) ||
    isNonEmptyString(value.assetId) ||
    isNonEmptyString(value.sourceEventKind) ||
    isNonEmptyString(value.ticker) ||
    isNonEmptyString(value.assetName) ||
    isNonEmptyString(value.assetClass) ||
    isNonEmptyString(value.date) ||
    isNonEmptyString(value.operation) ||
    isNonEmptyString(value.source) ||
    isNonEmptyString(value.note) ||
    isNonEmptyString(value.createdAt) ||
    isNonEmptyString(value.updatedAt) ||
    isFiniteNumber(value.amount) ||
    isFiniteNumber(value.quantity) ||
    isFiniteNumber(value.unitPrice)
  );
}

function isReadonlyContributionReason(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.code) &&
    isNonEmptyString(value.label) &&
    isNonEmptyString(value.detail) &&
    isNullableString(value.sourceField) &&
    isNullableString(value.value) &&
    isNullableString(value.unit)
  );
}

function isReadonlyContributionCandidate(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    isNullableString(value.assetId) &&
    isNullableString(value.ticker) &&
    isNullableString(value.assetName) &&
    isNullableString(value.assetClass) &&
    isNullableString(value.sector) &&
    isNullableNumber(value.score) &&
    isNullableNumber(value.share) &&
    isNullableNumber(value.pct) &&
    isNullableNumber(value.dy) &&
    isNullableNumber(value.idealWeightPct) &&
    isNullableNumber(value.typeGapPct) &&
    isNonEmptyString(value.signalLabel) &&
    isNonEmptyString(value.signalTone) &&
    Array.isArray(value.reasons) &&
    Array.isArray(value.warnings) &&
    value.reasons.every((reason) => isReadonlyContributionReason(reason)) &&
    value.warnings.every((warning) => isNonEmptyString(warning))
  );
}

function isReadonlyContributionItem(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    hasReadonlyContributionPayload(value) &&
    isNullableString(value.id) &&
    isNullableString(value.sourceEventId) &&
    isNullableString(value.assetId) &&
    isNullableString(value.sourceEventKind) &&
    isNullableString(value.date) &&
    isNullableString(value.ticker) &&
    isNullableString(value.assetName) &&
    isNullableString(value.assetClass) &&
    isNullableNumber(value.amount) &&
    isNullableNumber(value.quantity) &&
    isNullableNumber(value.unitPrice) &&
    isNullableString(value.operation) &&
    isNullableString(value.source) &&
    isNullableString(value.note) &&
    isNullableString(value.createdAt) &&
    isNullableString(value.updatedAt)
  );
}

function isReadonlyContributionDistributionItem(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.label) &&
    isFiniteNumber(value.itemCount) &&
    Number.isInteger(value.itemCount) &&
    value.itemCount >= 0 &&
    isNullableString(value.latestContributionDate)
  );
}

function isReadonlyContributionMonthDistributionItem(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.monthKey) &&
    isNonEmptyString(value.label) &&
    isFiniteNumber(value.itemCount) &&
    Number.isInteger(value.itemCount) &&
    value.itemCount >= 0
  );
}

function isReadonlyContributionsSummary(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    isFiniteNumber(value.itemCount) &&
    Number.isInteger(value.itemCount) &&
    value.itemCount >= 0 &&
    isFiniteNumber(value.classCount) &&
    Number.isInteger(value.classCount) &&
    value.classCount >= 0 &&
    isFiniteNumber(value.monthCount) &&
    Number.isInteger(value.monthCount) &&
    value.monthCount >= 0 &&
    isFiniteNumber(value.candidateCount) &&
    Number.isInteger(value.candidateCount) &&
    value.candidateCount >= 0 &&
    isFiniteNumber(value.insufficientCount) &&
    Number.isInteger(value.insufficientCount) &&
    value.insufficientCount >= 0 &&
    isFiniteNumber(value.avoidedCount) &&
    Number.isInteger(value.avoidedCount) &&
    value.avoidedCount >= 0 &&
    isNullableString(value.latestContributionDate)
  );
}

function isReadonlyContributionsSuggestion(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    isReadonlyContributionsSuggestionStatus(value.status) &&
    isNonEmptyString(value.generatedAt) &&
    isNullableString(value.strategyName) &&
    Array.isArray(value.candidates) &&
    Array.isArray(value.warnings) &&
    Array.isArray(value.inputs) &&
    Array.isArray(value.limitations) &&
    value.candidates.every((candidate) => isReadonlyContributionCandidate(candidate)) &&
    value.warnings.every((warning) => isNonEmptyString(warning)) &&
    value.inputs.every((input) => isNonEmptyString(input)) &&
    value.limitations.every((limitation) => isNonEmptyString(limitation))
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

function cloneContributionReason(reason) {
  return {
    code: reason.code,
    label: reason.label,
    detail: reason.detail,
    sourceField: reason.sourceField,
    value: reason.value,
    unit: reason.unit,
  };
}

function cloneReadonlyContributionItem(item) {
  return {
    id: item.id,
    sourceEventId: item.sourceEventId,
    assetId: item.assetId,
    sourceEventKind: item.sourceEventKind,
    date: item.date,
    ticker: item.ticker,
    assetName: item.assetName,
    assetClass: item.assetClass,
    amount: item.amount,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    operation: item.operation,
    source: item.source,
    note: item.note,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function cloneReadonlyContributionCandidate(candidate) {
  return {
    assetId: candidate.assetId,
    ticker: candidate.ticker,
    assetName: candidate.assetName,
    assetClass: candidate.assetClass,
    sector: candidate.sector,
    score: candidate.score,
    share: candidate.share,
    pct: candidate.pct,
    dy: candidate.dy,
    idealWeightPct: candidate.idealWeightPct,
    typeGapPct: candidate.typeGapPct,
    signalLabel: candidate.signalLabel,
    signalTone: candidate.signalTone,
    reasons: candidate.reasons.map((reason) => cloneContributionReason(reason)),
    warnings: [...candidate.warnings],
  };
}

function cloneReadonlyContributionDistributionItem(item) {
  return {
    label: item.label,
    itemCount: item.itemCount,
    latestContributionDate: item.latestContributionDate,
  };
}

function cloneReadonlyContributionMonthDistributionItem(item) {
  return {
    monthKey: item.monthKey,
    label: item.label,
    itemCount: item.itemCount,
  };
}

function cloneReadonlyContributionsSnapshot(snapshot) {
  return deepFreeze({
    version: CONTRIBUTIONS_READONLY_CONTRACT_VERSION,
    originMode: snapshot.originMode,
    originLabel: snapshot.originLabel,
    generatedAt: snapshot.generatedAt,
    notice: snapshot.notice,
    summary: {
      itemCount: snapshot.summary.itemCount,
      classCount: snapshot.summary.classCount,
      monthCount: snapshot.summary.monthCount,
      candidateCount: snapshot.summary.candidateCount,
      insufficientCount: snapshot.summary.insufficientCount,
      avoidedCount: snapshot.summary.avoidedCount,
      latestContributionDate: snapshot.summary.latestContributionDate,
    },
    items: snapshot.items.map((item) => cloneReadonlyContributionItem(item)),
    classDistribution: snapshot.classDistribution.map((item) => cloneReadonlyContributionDistributionItem(item)),
    monthDistribution: snapshot.monthDistribution.map((item) => cloneReadonlyContributionMonthDistributionItem(item)),
    suggestion: {
      status: snapshot.suggestion.status,
      generatedAt: snapshot.suggestion.generatedAt,
      strategyName: snapshot.suggestion.strategyName,
      candidates: snapshot.suggestion.candidates.map((candidate) => cloneReadonlyContributionCandidate(candidate)),
      warnings: [...snapshot.suggestion.warnings],
      inputs: [...snapshot.suggestion.inputs],
      limitations: [...snapshot.suggestion.limitations],
    },
  });
}

function hasSupportedVersion(value) {
  return Object.prototype.hasOwnProperty.call(value, 'version')
    ? value.version === CONTRIBUTIONS_READONLY_CONTRACT_VERSION
    : true;
}

export function isReadonlyContributionsSnapshot(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  if (!hasSupportedVersion(value)) {
    return false;
  }

  if (!isReadonlyContributionsOriginMode(value.originMode) || !isNonEmptyString(value.originLabel)) {
    return false;
  }

  if (!isNonEmptyString(value.generatedAt) || !isNonEmptyString(value.notice)) {
    return false;
  }

  if (!isReadonlyContributionsSummary(value.summary)) {
    return false;
  }

  if (!Array.isArray(value.items) || !Array.isArray(value.classDistribution) || !Array.isArray(value.monthDistribution)) {
    return false;
  }

  if (!isReadonlyContributionsSuggestion(value.suggestion)) {
    return false;
  }

  if (value.summary.itemCount !== value.items.length) {
    return false;
  }

  if (value.summary.classCount !== value.classDistribution.length) {
    return false;
  }

  if (value.summary.monthCount !== value.monthDistribution.length) {
    return false;
  }

  if (value.summary.candidateCount !== value.suggestion.candidates.length) {
    return false;
  }

  return (
    value.items.every((item) => isReadonlyContributionItem(item)) &&
    value.classDistribution.every((item) => isReadonlyContributionDistributionItem(item)) &&
    value.monthDistribution.every((item) => isReadonlyContributionMonthDistributionItem(item))
  );
}

export function normalizeReadonlyContributionsSnapshot(candidate) {
  if (!isReadonlyContributionsSnapshot(candidate)) {
    return CONTRIBUTIONS_READONLY_FALLBACK_SNAPSHOT;
  }

  return cloneReadonlyContributionsSnapshot(candidate);
}
