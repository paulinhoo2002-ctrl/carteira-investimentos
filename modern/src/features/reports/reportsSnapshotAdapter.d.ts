import type {
  ReadOnlyReportCategory,
  ReadOnlyReportItem,
  ReadOnlyReportTrend,
  ReadOnlyReportsBridge,
  ReadOnlyReportsSnapshot,
  ReadOnlyReportsSource,
} from './reportsReadonlyBridge.mjs';

export type {
  ReadOnlyReportCategory,
  ReadOnlyReportItem,
  ReadOnlyReportTrend,
  ReadOnlyReportsSnapshot,
};

export interface ReadOnlyReportsAdapter {
  readonly getSnapshot: () => ReadOnlyReportsSnapshot;
}

export declare function createReadOnlyReportsAdapter(
  sourceOrBridge?: ReadOnlyReportsSource | ReadOnlyReportsBridge,
): ReadOnlyReportsAdapter;

export declare const READ_ONLY_REPORTS_ADAPTER: ReadOnlyReportsAdapter;
