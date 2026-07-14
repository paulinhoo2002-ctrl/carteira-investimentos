import { createReadOnlyReportsBridge, type ReadOnlyReportsBridge, type ReadOnlyReportsSource } from './reportsReadonlyBridge.ts';
import { createReadOnlyReportsAdapter, type ReadOnlyReportsAdapter } from './reportsSnapshotAdapter.ts';

const CONNECTED_REPORTS_DEMO_SNAPSHOT = {
  generatedAt: '2026-07-14T10:30:00.000Z',
  notice: 'Snapshot legado somente leitura. React nao escreve na fonte.',
  summary: {
    totalValue: 900,
    itemCount: 3,
    averageVariationPct: 0.14,
  },
  items: [
    {
      ticker: 'PETR4',
      name: 'Petrobras',
      category: 'Acao demo',
      quantity: 10,
      averagePrice: 20,
      currentValue: 250,
      variationPct: 25,
      allocationPct: 27.78,
      trend: 'positive',
    },
    {
      ticker: 'MXRF11',
      name: 'Maxi Renda',
      category: 'FII demo',
      quantity: 5,
      averagePrice: 100,
      currentValue: 450,
      variationPct: -10,
      allocationPct: 50,
      trend: 'negative',
    },
    {
      ticker: 'BOVA11',
      name: 'BOVA',
      category: 'ETF demo',
      quantity: 2,
      averagePrice: 100,
      currentValue: 200,
      variationPct: 0,
      allocationPct: 22.22,
      trend: 'neutral',
    },
  ],
} as const;

export function createConnectedReportsDemoSource(): ReadOnlyReportsSource {
  return {
    getSnapshot() {
      return CONNECTED_REPORTS_DEMO_SNAPSHOT;
    },
  };
}

export function createLegacyReportsReadonlyBoundary(
  source: ReadOnlyReportsSource | null | undefined,
): ReadOnlyReportsSource {
  return {
    getSnapshot() {
      if (!source) {
        return null;
      }

      try {
        return source.getSnapshot?.() ?? null;
      } catch {
        return null;
      }
    },
  };
}

export function createConnectedReportsBridge(
  source: ReadOnlyReportsSource | null | undefined,
): ReadOnlyReportsBridge {
  return createReadOnlyReportsBridge(createLegacyReportsReadonlyBoundary(source));
}

export function createConnectedReportsAdapter(
  source: ReadOnlyReportsSource | null | undefined,
): ReadOnlyReportsAdapter {
  return createReadOnlyReportsAdapter(createConnectedReportsBridge(source));
}
