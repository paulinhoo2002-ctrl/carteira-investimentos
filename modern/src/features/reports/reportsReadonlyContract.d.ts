export declare const READ_ONLY_REPORTS_CONTRACT_VERSION: 1;
export declare const READ_ONLY_REPORT_CATEGORIES: readonly ['Acao demo', 'FII demo', 'ETF demo'];
export declare const READ_ONLY_REPORT_TRENDS: readonly ['positive', 'neutral', 'negative'];

export type ReadOnlyReportsContractVersion = typeof READ_ONLY_REPORTS_CONTRACT_VERSION;
export type ReadOnlyReportCategory = (typeof READ_ONLY_REPORT_CATEGORIES)[number];
export type ReadOnlyReportTrend = (typeof READ_ONLY_REPORT_TRENDS)[number];

export interface ReadOnlyReportItem {
  readonly ticker: string;
  readonly name: string;
  readonly category: ReadOnlyReportCategory;
  readonly quantity: number;
  readonly averagePrice: number;
  readonly currentValue: number;
  readonly variationPct: number;
  readonly allocationPct: number;
  readonly trend: ReadOnlyReportTrend;
}

export interface ReadOnlyReportsSummary {
  readonly totalValue: number;
  readonly itemCount: number;
  readonly averageVariationPct: number;
}

export interface ReadOnlyReportsSnapshot {
  readonly version: ReadOnlyReportsContractVersion;
  readonly generatedAt: string;
  readonly notice: string;
  readonly summary: ReadOnlyReportsSummary;
  readonly items: readonly ReadOnlyReportItem[];
}

export interface ReadOnlyReportsSource {
  readonly getSnapshot?: () => unknown;
}

export interface ReadOnlyReportsBridge {
  readonly readSnapshot: () => ReadOnlyReportsSnapshot;
}

export declare const READ_ONLY_REPORTS_FALLBACK_SNAPSHOT: ReadOnlyReportsSnapshot;
export declare function isReadOnlyReportsSnapshot(value: unknown): value is ReadOnlyReportsSnapshot;
export declare function normalizeReadOnlyReportsSnapshot(candidate: unknown): ReadOnlyReportsSnapshot;
