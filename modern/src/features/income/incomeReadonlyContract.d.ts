export declare const INCOME_READONLY_CONTRACT_VERSION: 1;
export declare const INCOME_READONLY_FALLBACK_SNAPSHOT: Readonly<{
  version: 1;
  generatedAt: string;
  notice: string;
  summary: Readonly<{
    totalReceived: number | null;
    monthTotal: number | null;
    yearTotal: number | null;
    averageMonthly: number | null;
    paymentCount: number;
  }>;
  items: readonly ReadonlyIncomeItem[];
}>;

export interface ReadOnlyIncomeItem {
  readonly id: string | null;
  readonly ticker: string | null;
  readonly name: string | null;
  readonly type: string | null;
  readonly paymentDate: string | null;
  readonly competenceDate: string | null;
  readonly grossValue: number | null;
  readonly netValue: number | null;
  readonly taxValue: number | null;
  readonly quantity: number | null;
  readonly note: string | null;
  readonly source: string | null;
  readonly sourceEventKind: string | null;
  readonly sourceEventId: string | null;
}

export interface ReadOnlyIncomeSummary {
  readonly totalReceived: number | null;
  readonly monthTotal: number | null;
  readonly yearTotal: number | null;
  readonly averageMonthly: number | null;
  readonly paymentCount: number;
}

export interface ReadOnlyIncomeSnapshot {
  readonly version: 1;
  readonly generatedAt: string;
  readonly notice: string;
  readonly summary: ReadOnlyIncomeSummary;
  readonly items: readonly ReadOnlyIncomeItem[];
}

export declare function isReadonlyIncomeSnapshot(value: unknown): value is ReadOnlyIncomeSnapshot;
export declare function normalizeReadonlyIncomeSnapshot(candidate: unknown): ReadOnlyIncomeSnapshot;
