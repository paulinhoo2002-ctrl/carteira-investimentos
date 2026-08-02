import { createGoalsReadonlyBridge } from './goalsReadonlyBridge.mjs';

export function createGoalsReadonlyAdapter(sourceOrBridge) {
  const bridge =
    sourceOrBridge && typeof sourceOrBridge.readSnapshot === 'function'
      ? sourceOrBridge
      : createGoalsReadonlyBridge(sourceOrBridge);

  return {
    getSnapshot() {
      return bridge.readSnapshot();
    },
  };
}

export const GOALS_READONLY_ADAPTER = createGoalsReadonlyAdapter();
