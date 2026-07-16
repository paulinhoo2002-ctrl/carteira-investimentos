export declare const FIXED_INCOME_READONLY_CONTRACT_VERSION: 1;
export declare const FIXED_INCOME_READONLY_MATURITY_STATUSES: readonly [
  'Vencido',
  'Proximos 30 dias',
  'Proximos 90 dias',
  'Proximos 12 meses',
  'Acima de 12 meses',
  'Sem vencimento',
];

export type FixedIncomeReadonlyContractVersion = typeof FIXED_INCOME_READONLY_CONTRACT_VERSION;
export type FixedIncomeReadonlyMaturityStatus = (typeof FIXED_INCOME_READONLY_MATURITY_STATUSES)[number];

export interface ReadOnlyFixedIncomeItem {
  readonly ticker: string;
  readonly name: string;
  readonly subtype: string;
  readonly issuer: string;
  readonly applicationDate: string;
  readonly maturityDate: string;
  readonly contractedRate: string;
  readonly indexer: string;
  readonly appliedValue: number;
  readonly grossValue: number;
  readonly liquidValue: number;
  readonly profitValue: number;
  readonly taxValue: number;
  readonly liquidity: string;
  readonly unavailableValue: number;
  readonly maturityStatus: FixedIncomeReadonlyMaturityStatus;
  readonly note: string;
}

export interface ReadOnlyFixedIncomeSummary {
  readonly totalApplied: number;
  readonly totalGross: number;
  readonly totalLiquid: number;
  readonly totalProfit: number;
  readonly totalTaxValue: number;
  readonly totalUnavailableValue: number;
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
