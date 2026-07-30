import { createConnectedFixedIncomeAdapter, createConnectedFixedIncomeDemoSource } from '../features/fixed-income/legacyFixedIncomeReadonlyIntegration.ts';
import type { ReadOnlyFixedIncomeAdapter } from '../features/fixed-income/fixedIncomeSnapshotAdapter.mjs';
import type { ReadOnlyFixedIncomeSource } from '../features/fixed-income/fixedIncomeReadonlyContract.mjs';
import type { FixedIncomeValuationSupplementMap } from '../features/fixed-income/fixedIncomeReadonlyValuation.ts';

export interface ModernFixedIncomeRuntimeOptions {
  readonly fixedIncomeSource?: ReadOnlyFixedIncomeSource | null;
  readonly fixedIncomeValuationSupplementMap?: FixedIncomeValuationSupplementMap;
}

export interface ModernFixedIncomeRuntime {
  readonly fixedIncomeAdapter: ReadOnlyFixedIncomeAdapter;
}

export function createModernFixedIncomeRuntime(
  options: ModernFixedIncomeRuntimeOptions = {},
): ModernFixedIncomeRuntime {
  const fixedIncomeSource = options.fixedIncomeSource ?? createConnectedFixedIncomeDemoSource();
  const supplementMap = options.fixedIncomeValuationSupplementMap ?? {};

  return {
    fixedIncomeAdapter: createConnectedFixedIncomeAdapter(fixedIncomeSource, supplementMap),
  };
}
