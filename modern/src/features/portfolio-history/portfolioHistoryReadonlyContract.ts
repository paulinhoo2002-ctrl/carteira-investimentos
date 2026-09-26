export const PORTFOLIO_HISTORY_READONLY_CONTRACT_VERSION = 1;
export const PORTFOLIO_HISTORY_READONLY_PRICE_COVERAGE = [
  'FULL_COVERAGE',
  'PARTIAL_COVERAGE',
  'UNKNOWN',
] as const;

export const PORTFOLIO_HISTORY_READONLY_SOURCES = [
  'MANUAL',
  'AUTO',
  'IMPORT',
  'RECOVERY',
] as const;

export const PORTFOLIO_HISTORY_READONLY_FALLBACK_SNAPSHOT = deepFreeze({
  version: PORTFOLIO_HISTORY_READONLY_CONTRACT_VERSION,
  generatedAt: '1970-01-01T00:00:00.000Z',
  notice: 'Snapshot readonly de histórico de portfólio indisponível. React não escreve na fonte.',
  snapshots: [],
  config: {
    autoCaptureEnabled: true,
    captureIntervalDays: 1,
    maxSnapshots: 3650,
    maxAgeDays: 3650,
    dedupEnabled: true,
  },
});

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPriceCoverage(value: unknown): value is typeof PORTFOLIO_HISTORY_READONLY_PRICE_COVERAGE[number] {
  return typeof value === 'string' && PORTFOLIO_HISTORY_READONLY_PRICE_COVERAGE.includes(value as any);
}

function isSource(value: unknown): value is typeof PORTFOLIO_HISTORY_READONLY_SOURCES[number] {
  return typeof value === 'string' && PORTFOLIO_HISTORY_READONLY_SOURCES.includes(value as any);
}

function isProvenance(value: unknown): value is { userId: string; walletId: string; captureReason: string; extra: Record<string, unknown> } {
  if (!isPlainObject(value)) return false;
  return (
    isNonEmptyString(value.userId) &&
    isNonEmptyString(value.walletId) &&
    isNonEmptyString(value.captureReason) &&
    isPlainObject(value.extra)
  );
}

function isValuationsByAssetItem(value: unknown): value is { id: string; ticker: string; quantity: number; currentPrice: number | null; value: number | null } {
  if (!isPlainObject(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.ticker) &&
    isFiniteNumber(value.quantity) &&
    value.quantity >= 0 &&
    isNullableNumber(value.currentPrice) &&
    (value.currentPrice === null || value.currentPrice > 0) &&
    isNullableNumber(value.value)
  );
}

function isValuations(value: unknown): value is { totalValue: number; byAsset: ReadonlyArray<{ id: string; ticker: string; quantity: number; currentPrice: number | null; value: number | null }> } {
  if (!isPlainObject(value)) return false;
  return (
    isFiniteNumber(value.totalValue) &&
    value.totalValue >= 0 &&
    Array.isArray(value.byAsset) &&
    value.byAsset.every(isValuationsByAssetItem)
  );
}

function isReadonlyPortfolioHistoryItem(value: unknown): value is {
  format: string;
  version: string;
  id: string;
  capturedAt: string;
  source: typeof PORTFOLIO_HISTORY_READONLY_SOURCES[number];
  provenance: { userId: string; walletId: string; captureReason: string; extra: Record<string, unknown> };
  valuations: { totalValue: number; byAsset: ReadonlyArray<{ id: string; ticker: string; quantity: number; currentPrice: number | null; value: number | null }> };
  priceCoverage: typeof PORTFOLIO_HISTORY_READONLY_PRICE_COVERAGE[number];
  contentHash: string;
  schemaVersion: string;
} {
  if (!isPlainObject(value)) return false;
  return (
    isNonEmptyString(value.format) &&
    isNonEmptyString(value.version) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.capturedAt) &&
    isSource(value.source) &&
    isProvenance(value.provenance) &&
    isValuations(value.valuations) &&
    isPriceCoverage(value.priceCoverage) &&
    isNonEmptyString(value.contentHash) &&
    isNonEmptyString(value.schemaVersion)
  );
}

function isConfig(value: unknown): value is { autoCaptureEnabled: boolean; captureIntervalDays: number; maxSnapshots: number; maxAgeDays: number; dedupEnabled: boolean } {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.autoCaptureEnabled === 'boolean' &&
    isFiniteNumber(value.captureIntervalDays) &&
    value.captureIntervalDays >= 1 &&
    Number.isInteger(value.captureIntervalDays) &&
    isFiniteNumber(value.maxSnapshots) &&
    value.maxSnapshots >= 1 &&
    Number.isInteger(value.maxSnapshots) &&
    isFiniteNumber(value.maxAgeDays) &&
    value.maxAgeDays >= 1 &&
    Number.isInteger(value.maxAgeDays) &&
    typeof value.dedupEnabled === 'boolean'
  );
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const key of Object.keys(value)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

function cloneReadonlyPortfolioHistoryItem(item: {
  format: string;
  version: string;
  id: string;
  capturedAt: string;
  source: typeof PORTFOLIO_HISTORY_READONLY_SOURCES[number];
  provenance: { userId: string; walletId: string; captureReason: string; extra: Record<string, unknown> };
  valuations: { totalValue: number; byAsset: ReadonlyArray<{ id: string; ticker: string; quantity: number; currentPrice: number | null; value: number | null }> };
  priceCoverage: typeof PORTFOLIO_HISTORY_READONLY_PRICE_COVERAGE[number];
  contentHash: string;
  schemaVersion: string;
}) {
  return {
    format: item.format,
    version: item.version,
    id: item.id,
    capturedAt: item.capturedAt,
    source: item.source,
    provenance: { ...item.provenance, extra: { ...item.provenance.extra } },
    valuations: {
      totalValue: item.valuations.totalValue,
      byAsset: item.valuations.byAsset.map(asset => ({ ...asset })),
    },
    priceCoverage: item.priceCoverage,
    contentHash: item.contentHash,
    schemaVersion: item.schemaVersion,
  };
}

function cloneReadonlyPortfolioHistorySnapshot(snapshot: {
  version: number;
  generatedAt: string;
  notice: string;
  snapshots: ReadonlyArray<{
    format: string;
    version: string;
    id: string;
    capturedAt: string;
    source: typeof PORTFOLIO_HISTORY_READONLY_SOURCES[number];
    provenance: { userId: string; walletId: string; captureReason: string; extra: Record<string, unknown> };
    valuations: { totalValue: number; byAsset: ReadonlyArray<{ id: string; ticker: string; quantity: number; currentPrice: number | null; value: number | null }> };
    priceCoverage: typeof PORTFOLIO_HISTORY_READONLY_PRICE_COVERAGE[number];
    contentHash: string;
    schemaVersion: string;
  }>;
  config: { autoCaptureEnabled: boolean; captureIntervalDays: number; maxSnapshots: number; maxAgeDays: number; dedupEnabled: boolean };
}) {
  return deepFreeze({
    version: PORTFOLIO_HISTORY_READONLY_CONTRACT_VERSION,
    generatedAt: snapshot.generatedAt,
    notice: snapshot.notice,
    snapshots: snapshot.snapshots.map(cloneReadonlyPortfolioHistoryItem),
    config: { ...snapshot.config },
  });
}

function hasSupportedVersion(value: unknown): boolean {
  return Object.prototype.hasOwnProperty.call(value, 'version')
    ? value.version === PORTFOLIO_HISTORY_READONLY_CONTRACT_VERSION
    : true;
}

export function isReadonlyPortfolioHistorySnapshot(value: unknown): value is {
  version: number;
  generatedAt: string;
  notice: string;
  snapshots: ReadonlyArray<{
    format: string;
    version: string;
    id: string;
    capturedAt: string;
    source: typeof PORTFOLIO_HISTORY_READONLY_SOURCES[number];
    provenance: { userId: string; walletId: string; captureReason: string; extra: Record<string, unknown> };
    valuations: { totalValue: number; byAsset: ReadonlyArray<{ id: string; ticker: string; quantity: number; currentPrice: number | null; value: number | null }> };
    priceCoverage: typeof PORTFOLIO_HISTORY_READONLY_PRICE_COVERAGE[number];
    contentHash: string;
    schemaVersion: string;
  }>;
  config: { autoCaptureEnabled: boolean; captureIntervalDays: number; maxSnapshots: number; maxAgeDays: number; dedupEnabled: boolean };
} {
  if (!isPlainObject(value)) {
    return false;
  }

  if (!hasSupportedVersion(value)) {
    return false;
  }

  if (!isNonEmptyString(value.generatedAt) || !isNonEmptyString(value.notice)) {
    return false;
  }

  if (!Array.isArray(value.snapshots) || !isConfig(value.config)) {
    return false;
  }

  return value.snapshots.every(isReadonlyPortfolioHistoryItem);
}

export function normalizeReadonlyPortfolioHistorySnapshot(candidate: unknown) {
  if (!isReadonlyPortfolioHistorySnapshot(candidate)) {
    return PORTFOLIO_HISTORY_READONLY_FALLBACK_SNAPSHOT;
  }

  return cloneReadonlyPortfolioHistorySnapshot(candidate);
}

export type ReadOnlyPortfolioHistorySource = {
  getSnapshot(): {
    version: number;
    generatedAt: string;
    notice: string;
    snapshots: ReadonlyArray<{
      format: string;
      version: string;
      id: string;
      capturedAt: string;
      source: typeof PORTFOLIO_HISTORY_READONLY_SOURCES[number];
      provenance: { userId: string; walletId: string; captureReason: string; extra: Record<string, unknown> };
      valuations: { totalValue: number; byAsset: ReadonlyArray<{ id: string; ticker: string; quantity: number; currentPrice: number | null; value: number | null }> };
      priceCoverage: typeof PORTFOLIO_HISTORY_READONLY_PRICE_COVERAGE[number];
      contentHash: string;
      schemaVersion: string;
    }>;
    config: { autoCaptureEnabled: boolean; captureIntervalDays: number; maxSnapshots: number; maxAgeDays: number; dedupEnabled: boolean };
  };
};