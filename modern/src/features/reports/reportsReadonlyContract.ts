export const READ_ONLY_REPORTS_CONTRACT_VERSION = 1 as const;

export const READ_ONLY_REPORT_CATEGORIES = ['Acao demo', 'FII demo', 'ETF demo'] as const;

export const READ_ONLY_REPORT_TRENDS = ['positive', 'neutral', 'negative'] as const;

export type ReadOnlyReportsContractVersion = typeof READ_ONLY_REPORTS_CONTRACT_VERSION;

export type ReadOnlyReportCategory = (typeof READ_ONLY_REPORT_CATEGORIES)[number];

export type ReadOnlyReportTrend = (typeof READ_ONLY_REPORT_TRENDS)[number];

export interface ReadOnlyReportItem {
  readonly ticker: string;
  readonly name: string;
  readonly category: ReadOnlyReportCategory;
  readonly quantity: number;
  readonly averagePrice: number;
  readonly currentValue: number;
  readonly variationPct: number;
  readonly allocationPct: number;
  readonly trend: ReadOnlyReportTrend;
}

export interface ReadOnlyReportsSummary {
  readonly totalValue: number;
  readonly itemCount: number;
  readonly averageVariationPct: number;
}

export interface ReadOnlyReportsSnapshot {
  readonly version: ReadOnlyReportsContractVersion;
  readonly generatedAt: string;
  readonly notice: string;
  readonly summary: ReadOnlyReportsSummary;
  readonly items: readonly ReadOnlyReportItem[];
}

export interface ReadOnlyReportsSource {
  readonly getSnapshot?: () => unknown;
}

export interface ReadOnlyReportsBridge {
  readonly readSnapshot: () => ReadOnlyReportsSnapshot;
}

export const READ_ONLY_REPORTS_FALLBACK_SNAPSHOT: ReadOnlyReportsSnapshot = deepFreeze({
  version: READ_ONLY_REPORTS_CONTRACT_VERSION,
  generatedAt: '1970-01-01T00:00:00.000Z',
  notice: 'Snapshot controlado por adaptador somente leitura. React nao escreve na fonte.',
  summary: {
    totalValue: 0,
    itemCount: 0,
    averageVariationPct: 0,
  },
  items: [],
} as const as ReadOnlyReportsSnapshot);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isReadOnlyReportCategory(value: unknown): value is ReadOnlyReportCategory {
  return typeof value === 'string' && READ_ONLY_REPORT_CATEGORIES.includes(value as ReadOnlyReportCategory);
}

function isReadOnlyReportTrend(value: unknown): value is ReadOnlyReportTrend {
  return typeof value === 'string' && READ_ONLY_REPORT_TRENDS.includes(value as ReadOnlyReportTrend);
}

function isReadOnlyReportItem(value: unknown): value is ReadOnlyReportItem {
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

function isReadOnlyReportsSummary(value: unknown): value is ReadOnlyReportsSummary {
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

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);

  for (const key of Object.keys(value as Record<string, unknown>)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }

  return value;
}

function cloneReadOnlyReportItem(item: ReadOnlyReportItem): ReadOnlyReportItem {
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

function cloneReadOnlyReportsSnapshot(snapshot: ReadOnlyReportsSnapshot | Omit<ReadOnlyReportsSnapshot, 'version'>): ReadOnlyReportsSnapshot {
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

function hasSupportedVersion(value: Record<string, unknown>): boolean {
  if (!Object.prototype.hasOwnProperty.call(value, 'version')) {
    return true;
  }

  return value.version === READ_ONLY_REPORTS_CONTRACT_VERSION;
}

export function isReadOnlyReportsSnapshot(value: unknown): value is ReadOnlyReportsSnapshot {
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

export function normalizeReadOnlyReportsSnapshot(candidate: unknown): ReadOnlyReportsSnapshot {
  if (!isReadOnlyReportsSnapshot(candidate)) {
    return READ_ONLY_REPORTS_FALLBACK_SNAPSHOT;
  }

  return cloneReadOnlyReportsSnapshot(candidate);
}
