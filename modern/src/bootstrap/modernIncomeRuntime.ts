import { createConnectedIncomeAdapter, createConnectedIncomeDemoSource } from '../features/income/legacyIncomeReadonlyIntegration.ts';
import { createIncomeRefreshController } from '../features/income/incomeRefreshController.ts';
import type { ReadOnlyIncomeAdapter } from '../features/income/incomeSnapshotAdapter.mjs';
import type { ReadOnlyIncomeSource } from '../features/income/incomeReadonlyContract.mjs';
import type { IncomeRefreshController } from '../features/income/incomeRefreshController.ts';

export interface ModernIncomeRuntimeOptions {
  readonly incomeSource?: ReadOnlyIncomeSource | null;
}

export interface ModernIncomeRuntime {
  readonly incomeAdapter: ReadOnlyIncomeAdapter;
  readonly incomeRefreshController: IncomeRefreshController | null;
}

export function createModernIncomeRuntime(options: ModernIncomeRuntimeOptions = {}): ModernIncomeRuntime {
  const incomeSource = options.incomeSource ?? createConnectedIncomeDemoSource();

  if (!options.incomeSource) {
    return {
      incomeAdapter: createConnectedIncomeAdapter(incomeSource),
      incomeRefreshController: null,
    };
  }

  const incomeRefreshController = createIncomeRefreshController({
    source: incomeSource,
  });

  return {
    incomeAdapter: createConnectedIncomeAdapter(incomeRefreshController),
    incomeRefreshController,
  };
}
