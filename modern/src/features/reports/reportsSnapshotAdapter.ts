import {
  READ_ONLY_REPORTS_BRIDGE,
  type ReadOnlyReportsBridge,
  type ReadOnlyReportsSource,
  createReadOnlyReportsBridge,
} from './reportsReadonlyBridge.ts';
import type { ReadOnlyReportsSnapshot } from './reportsReadonlyContract.ts';

export type { ReadOnlyReportCategory, ReadOnlyReportItem, ReadOnlyReportTrend, ReadOnlyReportsSnapshot } from './reportsReadonlyBridge.ts';

export interface ReadOnlyReportsAdapter {
  readonly getSnapshot: () => ReadOnlyReportsSnapshot;
}

export function createReadOnlyReportsAdapter(sourceOrBridge?: ReadOnlyReportsSource | ReadOnlyReportsBridge): ReadOnlyReportsAdapter {
  const bridge =
    sourceOrBridge && 'readSnapshot' in sourceOrBridge
      ? sourceOrBridge
      : createReadOnlyReportsBridge(sourceOrBridge);

  return {
    getSnapshot() {
      return bridge.readSnapshot();
    },
  };
}

export const READ_ONLY_REPORTS_ADAPTER = createReadOnlyReportsAdapter(READ_ONLY_REPORTS_BRIDGE);
