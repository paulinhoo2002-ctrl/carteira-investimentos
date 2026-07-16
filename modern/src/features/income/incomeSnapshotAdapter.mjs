import { createIncomeReadonlyBridge } from './incomeReadonlyBridge.mjs';

export function createIncomeReadonlyAdapter(sourceOrBridge) {
  const bridge =
    sourceOrBridge && typeof sourceOrBridge.readSnapshot === 'function'
      ? sourceOrBridge
      : createIncomeReadonlyBridge(sourceOrBridge);

  return {
    getSnapshot() {
      return bridge.readSnapshot();
    },
  };
}

export const INCOME_READONLY_ADAPTER = createIncomeReadonlyAdapter();
