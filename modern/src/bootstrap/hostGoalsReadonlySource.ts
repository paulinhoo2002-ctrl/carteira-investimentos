import {
  GOALS_READONLY_FALLBACK_SNAPSHOT,
  normalizeReadonlyGoalsSnapshot,
} from '../features/goals/goalsReadonlyContract.mjs';
import type { ReadOnlyGoalsSource } from '../features/goals/goalsReadonlyContract.d.ts';

export interface HostGoalsReadonlySourceOptions {
  readonly getGoalsSnapshot?: () => unknown;
}

export function createHostGoalsReadonlySource(
  options: HostGoalsReadonlySourceOptions = {},
): ReadOnlyGoalsSource {
  return {
    getSnapshot() {
      try {
        return normalizeReadonlyGoalsSnapshot(options.getGoalsSnapshot?.());
      } catch {
        return GOALS_READONLY_FALLBACK_SNAPSHOT;
      }
    },
  };
}
