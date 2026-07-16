import {
  INCOME_READONLY_FALLBACK_SNAPSHOT,
  normalizeReadonlyIncomeSnapshot,
} from '../features/income/incomeReadonlyContract.mjs';
import type { ReadOnlyIncomeSource } from '../features/income/incomeReadonlyContract.mjs';

export interface HostIncomeReadonlySourceOptions {
  readonly getIncomeSnapshot?: () => unknown;
}

export function createHostIncomeReadonlySource(
  options: HostIncomeReadonlySourceOptions = {},
): ReadOnlyIncomeSource {
  return {
    getSnapshot() {
      try {
        return normalizeReadonlyIncomeSnapshot(options.getIncomeSnapshot?.());
      } catch {
        return INCOME_READONLY_FALLBACK_SNAPSHOT;
      }
    },
  };
}
