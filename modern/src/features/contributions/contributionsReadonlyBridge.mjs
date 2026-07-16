import {
  CONTRIBUTIONS_READONLY_FALLBACK_SNAPSHOT,
  normalizeReadonlyContributionsSnapshot,
} from './contributionsReadonlyContract.mjs';

export function createContributionsReadonlyBridge(source) {
  return {
    readSnapshot() {
      try {
        const snapshot = source?.getSnapshot?.();
        return normalizeReadonlyContributionsSnapshot(snapshot);
      } catch {
        return CONTRIBUTIONS_READONLY_FALLBACK_SNAPSHOT;
      }
    },
  };
}

export const CONTRIBUTIONS_READONLY_BRIDGE = createContributionsReadonlyBridge();
export { CONTRIBUTIONS_READONLY_FALLBACK_SNAPSHOT, normalizeReadonlyContributionsSnapshot };
