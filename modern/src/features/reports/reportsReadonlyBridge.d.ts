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
} from './reportsReadonlyContract.mjs';

import type {
  ReadOnlyReportsBridge,
  ReadOnlyReportsSource,
} from './reportsReadonlyContract.mjs';

export declare function createReadOnlyReportsBridge(source?: ReadOnlyReportsSource): ReadOnlyReportsBridge;
export declare const READ_ONLY_REPORTS_BRIDGE: ReadOnlyReportsBridge;
