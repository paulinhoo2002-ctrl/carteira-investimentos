export const READ_ONLY_REPORT_CATEGORIES = ['Acao demo', 'FII demo', 'ETF demo'] as const;

export const READ_ONLY_REPORT_TRENDS = ['positive', 'neutral', 'negative'] as const;

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
  generatedAt: '15/07/2026, 10:30',
  notice: 'Snapshot controlado por adaptador somente leitura. React nao escreve na fonte.',
  summary: {
    totalValue: 7000,
    itemCount: 4,
    averageVariationPct: 0.14,
  },
  items: [
    {
      ticker: 'DEMO-ALFA11',
      name: 'Empresa Demonstrativa Alfa',
      category: 'Acao demo',
      quantity: 120,
      averagePrice: 18.4,
      currentValue: 2520,
      variationPct: 14.13,
      allocationPct: 36,
      trend: 'positive',
    },
    {
      ticker: 'DEMO-BETA34',
      name: 'Fundo Demonstrativo Beta',
      category: 'FII demo',
      quantity: 80,
      averagePrice: 12.5,
      currentValue: 1000,
      variationPct: 0,
      allocationPct: 14.3,
      trend: 'neutral',
    },
    {
      ticker: 'DEMO-GAMA3',
      name: 'Carteira Demonstrativa Gama',
      category: 'ETF demo',
      quantity: 45,
      averagePrice: 55.2,
      currentValue: 2140,
      variationPct: -13.86,
      allocationPct: 30.57,
      trend: 'negative',
    },
    {
      ticker: 'DEMO-DELTA5',
      name: 'Ativo Demonstrativo Delta',
      category: 'Acao demo',
      quantity: 32,
      averagePrice: 41.75,
      currentValue: 1340,
      variationPct: 0.3,
      allocationPct: 19.13,
      trend: 'positive',
    },
  ],
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

function cloneReadOnlyReportsSnapshot(snapshot: ReadOnlyReportsSnapshot): ReadOnlyReportsSnapshot {
  return deepFreeze({
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

function isReadOnlyReportsSnapshot(value: unknown): value is ReadOnlyReportsSnapshot {
  if (!isPlainObject(value)) {
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

function normalizeSnapshot(candidate: unknown): ReadOnlyReportsSnapshot {
  if (!isReadOnlyReportsSnapshot(candidate)) {
    return READ_ONLY_REPORTS_FALLBACK_SNAPSHOT;
  }

  return cloneReadOnlyReportsSnapshot(candidate);
}

export function createReadOnlyReportsBridge(source?: ReadOnlyReportsSource): ReadOnlyReportsBridge {
  return {
    readSnapshot() {
      try {
        const snapshot = source?.getSnapshot?.();
        return normalizeSnapshot(snapshot);
      } catch {
        return READ_ONLY_REPORTS_FALLBACK_SNAPSHOT;
      }
    },
  };
}

export const READ_ONLY_REPORTS_BRIDGE = createReadOnlyReportsBridge();
