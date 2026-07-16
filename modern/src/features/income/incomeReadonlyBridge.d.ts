import type { ReadOnlyIncomeSnapshot } from './incomeReadonlyContract.mjs';

export interface ReadOnlyIncomeSource {
  readonly getSnapshot: () => ReadOnlyIncomeSnapshot | null | undefined;
}

export interface ReadOnlyIncomeBridge {
  readonly readSnapshot: () => ReadOnlyIncomeSnapshot;
}

export declare function createIncomeReadonlyBridge(
  source?: ReadOnlyIncomeSource | null,
): ReadOnlyIncomeBridge;

export declare const INCOME_READONLY_BRIDGE: ReadOnlyIncomeBridge;
export { INCOME_READONLY_FALLBACK_SNAPSHOT, normalizeReadonlyIncomeSnapshot } from './incomeReadonlyContract.mjs';
