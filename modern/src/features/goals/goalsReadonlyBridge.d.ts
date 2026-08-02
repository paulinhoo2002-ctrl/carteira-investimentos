import type { ReadonlyGoalsSnapshot, ReadOnlyGoalsSource } from './goalsReadonlyContract.d.ts';

export interface ReadOnlyGoalsBridge {
  readonly readSnapshot: () => ReadonlyGoalsSnapshot;
}

export declare function createGoalsReadonlyBridge(
  source?: ReadOnlyGoalsSource | null,
): ReadOnlyGoalsBridge;

export declare const GOALS_READONLY_BRIDGE: ReadOnlyGoalsBridge;

export {
  GOALS_READONLY_FALLBACK_SNAPSHOT,
  normalizeReadonlyGoalsSnapshot,
} from './goalsReadonlyContract.d.ts';
export type { ReadOnlyGoalsSource } from './goalsReadonlyContract.d.ts';
