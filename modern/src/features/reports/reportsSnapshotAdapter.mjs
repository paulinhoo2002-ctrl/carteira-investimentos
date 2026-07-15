import {
  READ_ONLY_REPORTS_BRIDGE,
  createReadOnlyReportsBridge,
} from './reportsReadonlyBridge.mjs';

export function createReadOnlyReportsAdapter(sourceOrBridge) {
  const bridge =
    sourceOrBridge && typeof sourceOrBridge.readSnapshot === 'function'
      ? sourceOrBridge
      : createReadOnlyReportsBridge(sourceOrBridge);

  return {
    getSnapshot() {
      return bridge.readSnapshot();
    },
  };
}

export const READ_ONLY_REPORTS_ADAPTER = createReadOnlyReportsAdapter(READ_ONLY_REPORTS_BRIDGE);
