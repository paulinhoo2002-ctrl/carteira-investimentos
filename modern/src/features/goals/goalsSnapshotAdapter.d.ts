import type { ReadOnlyGoalsBridge } from './goalsReadonlyBridge.mjs';
import type { ReadOnlyGoalsSource, ReadonlyGoalsSnapshot } from './goalsReadonlyContract.d.ts';

export interface ReadOnlyGoalsAdapter {
  readonly getSnapshot: () => ReadonlyGoalsSnapshot;
}

export declare function createGoalsReadonlyAdapter(
  sourceOrBridge?: ReadOnlyGoalsSource | ReadOnlyGoalsBridge | null,
): ReadOnlyGoalsAdapter;

export declare const GOALS_READONLY_ADAPTER: ReadOnlyGoalsAdapter;
