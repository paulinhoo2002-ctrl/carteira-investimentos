import {
  GOALS_READONLY_FALLBACK_SNAPSHOT,
  normalizeReadonlyGoalsSnapshot,
} from './goalsReadonlyContract.mjs';

export function createGoalsReadonlyBridge(source) {
  return {
    readSnapshot() {
      try {
        const snapshot = source?.getSnapshot?.();
        return normalizeReadonlyGoalsSnapshot(snapshot);
      } catch {
        return GOALS_READONLY_FALLBACK_SNAPSHOT;
      }
    },
  };
}

export const GOALS_READONLY_BRIDGE = createGoalsReadonlyBridge();

export {
  GOALS_READONLY_FALLBACK_SNAPSHOT,
  normalizeReadonlyGoalsSnapshot,
};
