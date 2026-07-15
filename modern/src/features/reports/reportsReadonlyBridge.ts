export {
  READ_ONLY_REPORTS_CONTRACT_VERSION,
  READ_ONLY_REPORTS_FALLBACK_SNAPSHOT,
  READ_ONLY_REPORT_CATEGORIES,
  READ_ONLY_REPORT_TRENDS,
  type ReadOnlyReportCategory,
  type ReadOnlyReportItem,
  type ReadOnlyReportTrend,
  type ReadOnlyReportsBridge,
  type ReadOnlyReportsContractVersion,
  type ReadOnlyReportsSnapshot,
  type ReadOnlyReportsSource,
  isReadOnlyReportsSnapshot,
  normalizeReadOnlyReportsSnapshot,
} from './reportsReadonlyContract.ts';

import {
  READ_ONLY_REPORTS_FALLBACK_SNAPSHOT,
  normalizeReadOnlyReportsSnapshot,
  type ReadOnlyReportsBridge,
  type ReadOnlyReportsSnapshot,
  type ReadOnlyReportsSource,
} from './reportsReadonlyContract.ts';

export function createReadOnlyReportsBridge(source?: ReadOnlyReportsSource): ReadOnlyReportsBridge {
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

export const READ_ONLY_REPORTS_BRIDGE = createReadOnlyReportsBridge();
