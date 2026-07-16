import type {
  ReadOnlyFixedIncomeSnapshot,
  ReadOnlyFixedIncomeSource,
} from './fixedIncomeReadonlyContract.mjs';

export interface ReadOnlyFixedIncomeBridge {
  readonly readSnapshot: () => ReadOnlyFixedIncomeSnapshot;
}

export declare function createFixedIncomeReadonlyBridge(
  source: ReadOnlyFixedIncomeSource | null | undefined,
): ReadOnlyFixedIncomeBridge;
export declare const FIXED_INCOME_READONLY_BRIDGE: ReadOnlyFixedIncomeBridge;
export {
  FIXED_INCOME_READONLY_FALLBACK_SNAPSHOT,
  normalizeReadonlyFixedIncomeSnapshot,
} from './fixedIncomeReadonlyContract.mjs';
