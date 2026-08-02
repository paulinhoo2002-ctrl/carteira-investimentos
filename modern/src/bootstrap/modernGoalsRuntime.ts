import { createConnectedGoalsAdapter, createConnectedGoalsDemoSource } from '../features/goals/legacyGoalsReadonlyIntegration.ts';
import { createGoalsRefreshController } from '../features/goals/goalsRefreshController.ts';
import type { ReadOnlyGoalsAdapter } from '../features/goals/goalsSnapshotAdapter.mjs';
import type { ReadOnlyGoalsSource } from '../features/goals/goalsReadonlyContract.d.ts';
import type { GoalsRefreshController } from '../features/goals/goalsRefreshController';

export interface ModernGoalsRuntimeOptions {
  readonly goalsSource?: ReadOnlyGoalsSource | null;
}

export interface ModernGoalsRuntime {
  readonly goalsAdapter: ReadOnlyGoalsAdapter;
  readonly goalsRefreshController: GoalsRefreshController | null;
}

export function createModernGoalsRuntime(
  options: ModernGoalsRuntimeOptions = {},
): ModernGoalsRuntime {
  const goalsSource = options.goalsSource ?? createConnectedGoalsDemoSource();

  if (!options.goalsSource) {
    return {
      goalsAdapter: createConnectedGoalsAdapter(goalsSource),
      goalsRefreshController: null,
    };
  }

  const goalsRefreshController = createGoalsRefreshController({
    source: goalsSource,
  });

  return {
    goalsAdapter: createConnectedGoalsAdapter(goalsRefreshController),
    goalsRefreshController,
  };
}
