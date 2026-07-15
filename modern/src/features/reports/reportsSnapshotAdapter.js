'use strict';

const {
  READ_ONLY_REPORTS_BRIDGE,
  createReadOnlyReportsBridge,
} = require('./reportsReadonlyBridge.js');

function createReadOnlyReportsAdapter(sourceOrBridge) {
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

const READ_ONLY_REPORTS_ADAPTER = createReadOnlyReportsAdapter(READ_ONLY_REPORTS_BRIDGE);

module.exports = {
  READ_ONLY_REPORTS_ADAPTER,
  createReadOnlyReportsAdapter,
};
