import {
  FIXED_INCOME_READONLY_FALLBACK_SNAPSHOT,
  normalizeReadonlyFixedIncomeSnapshot,
} from './fixedIncomeReadonlyContract.mjs';

export function createFixedIncomeReadonlyBridge(source) {
  return {
    readSnapshot() {
      try {
        const snapshot = source?.getSnapshot?.();
        return normalizeReadonlyFixedIncomeSnapshot(snapshot);
      } catch {
        return FIXED_INCOME_READONLY_FALLBACK_SNAPSHOT;
      }
    },
  };
}

export const FIXED_INCOME_READONLY_BRIDGE = createFixedIncomeReadonlyBridge();
export {
  FIXED_INCOME_READONLY_FALLBACK_SNAPSHOT,
  normalizeReadonlyFixedIncomeSnapshot,
};
