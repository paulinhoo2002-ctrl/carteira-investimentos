import type {
  ReadOnlyFixedIncomeBridge,
  ReadOnlyFixedIncomeSnapshot,
  ReadOnlyFixedIncomeSource,
} from './fixedIncomeReadonlyContract.mjs';

export interface ReadOnlyFixedIncomeAdapter {
  readonly getSnapshot: () => ReadOnlyFixedIncomeSnapshot;
}

export declare function createFixedIncomeReadonlyAdapter(
  sourceOrBridge: ReadOnlyFixedIncomeSource | ReadOnlyFixedIncomeBridge | null | undefined,
): ReadOnlyFixedIncomeAdapter;
export declare const FIXED_INCOME_READONLY_ADAPTER: ReadOnlyFixedIncomeAdapter;
