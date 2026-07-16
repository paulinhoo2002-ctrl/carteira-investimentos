import { createContributionsReadonlyBridge } from './contributionsReadonlyBridge.mjs';

export function createContributionsReadonlyAdapter(sourceOrBridge) {
  const bridge =
    sourceOrBridge && typeof sourceOrBridge.readSnapshot === 'function'
      ? sourceOrBridge
      : createContributionsReadonlyBridge(sourceOrBridge);

  return {
    getSnapshot() {
      return bridge.readSnapshot();
    },
  };
}

export const CONTRIBUTIONS_READONLY_ADAPTER = createContributionsReadonlyAdapter();
