import { createReadOnlyReportsBridge, type ReadOnlyReportsBridge, type ReadOnlyReportsSource } from './reportsReadonlyBridge.ts';
import { createReadOnlyReportsAdapter, type ReadOnlyReportsAdapter } from './reportsSnapshotAdapter.ts';

type LegacyReportsReadonlySource = {
  readonly getSnapshot: () => unknown;
};

type LegacyReportsReadonlySourceFactory = {
  readonly createLegacyReportsReadonlySource: (deps?: {
    readonly buildReportAssetRow?: (asset: LegacyReportFixtureAsset, deps: {
    }) => {
      readonly ticker: string;
      readonly name: string;
      readonly type: 'Ação' | 'FII' | 'ETF';
      readonly qty: number;
      readonly avgPrice: number;
      readonly current: number;
      readonly resultPct: number;
    };
    readonly getAssets?: () => readonly LegacyReportFixtureAsset[];
    readonly getGeneratedAt?: () => string;
    readonly normalizeType?: (value: unknown, fallback: string) => string;
  }) => LegacyReportsReadonlySource;
};

interface LegacyReportFixtureAsset {
  readonly ticker: string;
  readonly name: string;
  readonly type: 'Ação' | 'FII' | 'ETF';
  readonly qty: number;
  readonly avg_price: number;
  readonly current_price: number;
}

const LEGACY_REPORTS_READONLY_FIXTURE: readonly LegacyReportFixtureAsset[] = Object.freeze([
  Object.freeze({
    ticker: 'PETR4',
    name: 'Petrobras',
    type: 'Ação',
    qty: 10,
    avg_price: 20,
    current_price: 25,
  }),
  Object.freeze({
    ticker: 'MXRF11',
    name: 'Maxi Renda',
    type: 'FII',
    qty: 5,
    avg_price: 100,
    current_price: 90,
  }),
  Object.freeze({
    ticker: 'BOVA11',
    name: 'BOVA',
    type: 'ETF',
    qty: 2,
    avg_price: 100,
    current_price: 100,
  }),
]) as readonly LegacyReportFixtureAsset[];

async function loadLegacyReportsReadonlySourceModule() {
  const isNodeRuntime = typeof process !== 'undefined' && Boolean(process.versions?.node);

  if (isNodeRuntime) {
    return import('../../../../legacy/reports-readonly-source.js');
  }

  return import('@legacy-reports-readonly-source');
}

const legacyReportsReadonlySourceModule = (await loadLegacyReportsReadonlySourceModule()) as LegacyReportsReadonlySourceFactory & {
  readonly default?: LegacyReportsReadonlySourceFactory;
};
const legacyReportsReadonlySourceApi = legacyReportsReadonlySourceModule.default ?? legacyReportsReadonlySourceModule;
const { createLegacyReportsReadonlySource } = legacyReportsReadonlySourceApi;

function createLegacyReportsReadonlySourceFixture(): LegacyReportsReadonlySource {
  return createLegacyReportsReadonlySource({
    getAssets() {
      return LEGACY_REPORTS_READONLY_FIXTURE;
    },
    getGeneratedAt() {
      return '2026-07-14T10:30:00.000Z';
    },
    buildReportAssetRow(asset, deps) {
      const quantity = Number(asset.qty) || 0;
      const averagePrice = Number(asset.avg_price) || 0;
      const currentPrice = Number(asset.current_price) || 0;
      const applied = quantity * averagePrice;
      const current = quantity * currentPrice;
      const result = current - applied;
      const normalizedType = String(asset.type || 'Ação').trim() || 'Ação';

      return {
        ticker: String(asset.ticker || '').trim(),
        name: String(asset.name || asset.ticker || '').trim(),
        type: normalizedType,
        qty: quantity,
        avgPrice: averagePrice,
        current,
        resultPct: applied > 0 ? (result / applied) * 100 : 0,
      };
    },
  });
}

export function createLegacyReportsReadonlyBoundary(
  source: LegacyReportsReadonlySource | null | undefined = createLegacyReportsReadonlySourceFixture(),
): ReadOnlyReportsSource {
  return {
    getSnapshot() {
      if (!source) {
        return null;
      }

      return source.getSnapshot();
    },
  };
}

export function createConnectedReportsBridge(
  source: LegacyReportsReadonlySource | null | undefined = createLegacyReportsReadonlySourceFixture(),
): ReadOnlyReportsBridge {
  return createReadOnlyReportsBridge(createLegacyReportsReadonlyBoundary(source));
}

export function createConnectedReportsAdapter(
  source: LegacyReportsReadonlySource | null | undefined = createLegacyReportsReadonlySourceFixture(),
): ReadOnlyReportsAdapter {
  return createReadOnlyReportsAdapter(createConnectedReportsBridge(source));
}
export { LEGACY_REPORTS_READONLY_FIXTURE };
