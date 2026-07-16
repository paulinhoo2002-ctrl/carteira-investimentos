import { createFixedIncomeReadonlyBridge } from './fixedIncomeReadonlyBridge.mjs';

export function createFixedIncomeReadonlyAdapter(sourceOrBridge) {
  const bridge =
    sourceOrBridge && typeof sourceOrBridge.readSnapshot === 'function'
      ? sourceOrBridge
      : createFixedIncomeReadonlyBridge(sourceOrBridge);

  return {
    getSnapshot() {
      return bridge.readSnapshot();
    },
  };
}

export const FIXED_INCOME_READONLY_ADAPTER = createFixedIncomeReadonlyAdapter();
