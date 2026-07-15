'use strict';

const {
  READ_ONLY_REPORTS_FALLBACK_SNAPSHOT,
  normalizeReadOnlyReportsSnapshot,
} = require('./reportsReadonlyContract.js');

function createReadOnlyReportsBridge(source) {
  return {
    readSnapshot() {
      try {
        const snapshot = source?.getSnapshot?.();
        return normalizeReadOnlyReportsSnapshot(snapshot);
      } catch {
        return READ_ONLY_REPORTS_FALLBACK_SNAPSHOT;
      }
    },
  };
}

const READ_ONLY_REPORTS_BRIDGE = createReadOnlyReportsBridge();

module.exports = {
  READ_ONLY_REPORTS_BRIDGE,
  READ_ONLY_REPORTS_FALLBACK_SNAPSHOT,
  createReadOnlyReportsBridge,
  normalizeReadOnlyReportsSnapshot,
};
