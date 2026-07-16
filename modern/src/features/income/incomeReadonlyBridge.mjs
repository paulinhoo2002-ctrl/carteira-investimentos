import {
  INCOME_READONLY_FALLBACK_SNAPSHOT,
  normalizeReadonlyIncomeSnapshot,
} from './incomeReadonlyContract.mjs';

export function createIncomeReadonlyBridge(source) {
  return {
    readSnapshot() {
      try {
        const snapshot = source?.getSnapshot?.();
        return normalizeReadonlyIncomeSnapshot(snapshot);
      } catch {
        return INCOME_READONLY_FALLBACK_SNAPSHOT;
      }
    },
  };
}

export const INCOME_READONLY_BRIDGE = createIncomeReadonlyBridge();
export { INCOME_READONLY_FALLBACK_SNAPSHOT, normalizeReadonlyIncomeSnapshot };
