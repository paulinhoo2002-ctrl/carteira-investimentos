export interface ReadOnlyReportItem {
  readonly ticker: string;
  readonly name: string;
  readonly category: 'Acao demo' | 'FII demo' | 'ETF demo';
  readonly quantity: number;
  readonly averagePrice: number;
  readonly currentValue: number;
  readonly variationPct: number;
  readonly allocationPct: number;
  readonly trend: 'positive' | 'neutral' | 'negative';
}

export interface ReadOnlyReportsSnapshot {
  readonly generatedAt: string;
  readonly notice: string;
  readonly summary: Readonly<{
    readonly totalValue: number;
    readonly itemCount: number;
    readonly averageVariationPct: number;
  }>;
  readonly items: readonly ReadOnlyReportItem[];
}

export interface ReadOnlyReportsSource {
  readonly getSnapshot?: () => ReadOnlyReportsSnapshot | null | undefined;
}

export interface ReadOnlyReportsAdapter {
  getSnapshot: () => ReadOnlyReportsSnapshot;
}

const FALLBACK_SNAPSHOT: ReadOnlyReportsSnapshot = deepFreeze({
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
});

function cloneSnapshot(snapshot: ReadOnlyReportsSnapshot): ReadOnlyReportsSnapshot {
  return deepFreeze({
    generatedAt: snapshot.generatedAt,
    notice: snapshot.notice,
    summary: {
      totalValue: snapshot.summary.totalValue,
      itemCount: snapshot.summary.itemCount,
      averageVariationPct: snapshot.summary.averageVariationPct,
    },
    items: snapshot.items.map((item) => ({
      ticker: item.ticker,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      averagePrice: item.averagePrice,
      currentValue: item.currentValue,
      variationPct: item.variationPct,
      allocationPct: item.allocationPct,
      trend: item.trend,
    })),
  });
}

function isSnapshotLike(candidate: unknown): candidate is ReadOnlyReportsSnapshot {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }

  const snapshot = candidate as Record<string, unknown>;

  return (
    typeof snapshot.generatedAt === 'string' &&
    typeof snapshot.notice === 'string' &&
    typeof snapshot.summary === 'object' &&
    snapshot.summary !== null &&
    Array.isArray(snapshot.items)
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

export function createReadOnlyReportsAdapter(source?: ReadOnlyReportsSource): ReadOnlyReportsAdapter {
  return {
    getSnapshot() {
      const snapshot = source?.getSnapshot?.();
      return snapshot && isSnapshotLike(snapshot) ? cloneSnapshot(snapshot) : FALLBACK_SNAPSHOT;
    },
  };
}

export const READ_ONLY_REPORTS_ADAPTER = createReadOnlyReportsAdapter();
