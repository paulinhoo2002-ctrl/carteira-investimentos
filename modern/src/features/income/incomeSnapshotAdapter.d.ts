import type { ReadOnlyIncomeBridge, ReadOnlyIncomeSource } from './incomeReadonlyBridge.mjs';
import type { ReadOnlyIncomeSnapshot } from './incomeReadonlyContract.mjs';

export interface ReadOnlyIncomeAdapter {
  readonly getSnapshot: () => ReadOnlyIncomeSnapshot;
}

export declare function createIncomeReadonlyAdapter(
  sourceOrBridge?: ReadOnlyIncomeSource | ReadOnlyIncomeBridge | null,
): ReadOnlyIncomeAdapter;

export declare const INCOME_READONLY_ADAPTER: ReadOnlyIncomeAdapter;
