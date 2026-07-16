export declare const FIXED_INCOME_READONLY_CONTRACT_VERSION: 1;
export declare const FIXED_INCOME_READONLY_MATURITY_STATUSES: readonly [
  'Vencido',
  'Próximo',
  'A vencer',
  'Sem informação',
];

export type FixedIncomeReadonlyContractVersion = typeof FIXED_INCOME_READONLY_CONTRACT_VERSION;
export type FixedIncomeReadonlyMaturityStatus = (typeof FIXED_INCOME_READONLY_MATURITY_STATUSES)[number];

export interface ReadOnlyFixedIncomeItem {
  readonly id: string | null;
  readonly ticker: string | null;
  readonly name: string | null;
  readonly subtype: string | null;
  readonly issuer: string | null;
  readonly applicationDate: string | null;
  readonly maturityDate: string | null;
  readonly contractedRate: string | null;
  readonly indexer: string | null;
  readonly appliedValue: number | null;
  readonly grossValue: number | null;
  readonly liquidValue: number | null;
  readonly profitValue: number | null;
  readonly irValue: number | null;
  readonly iofValue: number | null;
  readonly combinedTaxValue: number | null;
  readonly liquidity: string | null;
  readonly unavailableValue: number | null;
  readonly maturityStatus: FixedIncomeReadonlyMaturityStatus;
  readonly note: string | null;
}

export interface ReadOnlyFixedIncomeSummary {
  readonly totalApplied: number | null;
  readonly totalGross: number | null;
  readonly totalLiquid: number | null;
  readonly totalProfit: number | null;
  readonly totalIrValue: number | null;
  readonly totalIofValue: number | null;
  readonly totalCombinedTaxValue: number | null;
  readonly totalUnavailableValue: number | null;
  readonly itemCount: number;
}

export interface ReadOnlyFixedIncomeSnapshot {
  readonly version: FixedIncomeReadonlyContractVersion;
  readonly generatedAt: string;
  readonly notice: string;
  readonly summary: ReadOnlyFixedIncomeSummary;
  readonly items: readonly ReadOnlyFixedIncomeItem[];
}

export interface ReadOnlyFixedIncomeSource {
  readonly getSnapshot?: () => unknown;
}

export interface ReadOnlyFixedIncomeBridge {
  readonly readSnapshot: () => ReadOnlyFixedIncomeSnapshot;
}

export declare const FIXED_INCOME_READONLY_FALLBACK_SNAPSHOT: ReadOnlyFixedIncomeSnapshot;
export declare function isReadonlyFixedIncomeSnapshot(value: unknown): value is ReadOnlyFixedIncomeSnapshot;
export declare function normalizeReadonlyFixedIncomeSnapshot(candidate: unknown): ReadOnlyFixedIncomeSnapshot;
