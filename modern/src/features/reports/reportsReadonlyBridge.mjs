import {
  READ_ONLY_REPORTS_FALLBACK_SNAPSHOT,
  normalizeReadOnlyReportsSnapshot,
} from './reportsReadonlyContract.mjs';

export function createReadOnlyReportsBridge(source) {
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
export { READ_ONLY_REPORTS_FALLBACK_SNAPSHOT, normalizeReadOnlyReportsSnapshot };
