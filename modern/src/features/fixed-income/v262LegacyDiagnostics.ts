import { computeFixedIncomeValuationState } from '../../domain/fixedIncome/valuationState.ts';
import { createHostFixedIncomeReadonlySource } from '../../bootstrap/hostFixedIncomeReadonlySource.ts';

export type V262LegacyIpcaDiagnostic = Readonly<{
  id: string;
  ticker: string | null;
  name: string | null;
  valuationMethod: string | null;
  valuationStatus: string;
  shadowValue: null;
  coverageStatus: 'FULL' | 'PARTIAL' | 'UNAVAILABLE';
  coveragePercent: number | null;
  freshness: 'FRESH' | 'STALE' | 'UNKNOWN';
  sourceAsOf: string | null;
}>;

/** Projects only IPCA diagnostics; monetary values are intentionally omitted. */
export function buildV262LegacyIpcaDiagnostics(
  assets: readonly Record<string, unknown>[],
  asOf = new Date().toISOString().slice(0, 10),
): readonly V262LegacyIpcaDiagnostic[] {
  const source = createHostFixedIncomeReadonlySource({
    getAssets: () => assets,
    getGeneratedAt: () => `${asOf}T00:00:00.000Z`,
  });
  const snapshot = source.getSnapshot();

  return Object.freeze(snapshot.items.flatMap((item) => {
    if (!/IPCA/i.test(item.indexer ?? '') && !/IPCA/i.test(item.contractedRate ?? '')) return [];

    const valuation = computeFixedIncomeValuationState(item, [], [], asOf);
    const diagnostics = valuation.ipcaIndexDiagnostics;
    if (!diagnostics) return [];

    return [Object.freeze({
      id: item.id ?? item.ticker ?? item.name ?? 'unknown',
      ticker: item.ticker,
      name: item.name,
      valuationMethod: valuation.valuationMethod,
      valuationStatus: valuation.shadowStatus,
      shadowValue: null,
      coverageStatus: diagnostics.coverageStatus,
      coveragePercent: diagnostics.coveragePercent,
      freshness: diagnostics.freshness,
      sourceAsOf: diagnostics.sourceAsOf,
    })];
  }));
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'V262FixedIncomeDiagnostics', {
    configurable: false,
    enumerable: false,
    value: Object.freeze({ build: buildV262LegacyIpcaDiagnostics }),
  });
  window.dispatchEvent(new Event('v262:diagnostics-ready'));
}
