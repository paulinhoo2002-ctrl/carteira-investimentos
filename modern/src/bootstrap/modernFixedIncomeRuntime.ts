import { createConnectedFixedIncomeAdapter, createConnectedFixedIncomeDemoSource } from '../features/fixed-income/legacyFixedIncomeReadonlyIntegration.ts';
import type { ReadOnlyFixedIncomeAdapter } from '../features/fixed-income/fixedIncomeSnapshotAdapter.mjs';
import type { ReadOnlyFixedIncomeSource } from '../features/fixed-income/fixedIncomeReadonlyContract.mjs';

export interface ModernFixedIncomeRuntimeOptions {
  readonly fixedIncomeSource?: ReadOnlyFixedIncomeSource | null;
}

export interface ModernFixedIncomeRuntime {
  readonly fixedIncomeAdapter: ReadOnlyFixedIncomeAdapter;
}

export function createModernFixedIncomeRuntime(
  options: ModernFixedIncomeRuntimeOptions = {},
): ModernFixedIncomeRuntime {
  const fixedIncomeSource = options.fixedIncomeSource ?? createConnectedFixedIncomeDemoSource();

  return {
    fixedIncomeAdapter: createConnectedFixedIncomeAdapter(fixedIncomeSource),
  };
}
