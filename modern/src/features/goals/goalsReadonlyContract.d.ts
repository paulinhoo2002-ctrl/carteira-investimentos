export declare const GOALS_READONLY_CONTRACT_VERSION: 1;

export declare const GOALS_READONLY_ORIGIN_MODES: readonly ['real-wallet', 'empty-wallet', 'fallback-readonly', 'demo-source'];

export interface ReadonlyGoalsFlags {
  readonly hasPatrimonyGoal: boolean;
  readonly hasIncomeGoal: boolean;
  readonly hasAssetGoal: boolean;
  readonly hasAllocationGoal: boolean;
  readonly hasPortfolioData: boolean;
}

export interface ReadonlyGoalsMetrics {
  readonly hasCurrent: boolean;
  readonly hasTarget: boolean;
  readonly current: number | null;
  readonly target: number | null;
  readonly percent: number | null;
  readonly barPercent: number;
  readonly missing: number | null;
  readonly excess: number | null;
  readonly reached: boolean;
  readonly tone: 'muted' | 'ok' | 'info' | 'warn' | 'danger';
  readonly monthlyContribution: number;
  readonly annualVariation: number;
}

export interface ReadonlyGoalsIncomeMetrics extends ReadonlyGoalsMetrics {
  readonly currentMonthKey: string;
  readonly currentMonthLabel: string;
  readonly currentMonthCount: number;
  readonly monthlyAverage: number;
  readonly total12: number;
  readonly hasData: boolean;
}

export interface ReadonlyGoalsAssetConfig {
  readonly type: string;
  readonly ticker: string;
  readonly monthlyContribution: number;
  readonly annualVariation: number;
  readonly finalValue: number;
}

export interface ReadonlyGoalsAllocationItem {
  readonly type: string;
  readonly pct: number;
}

export interface ReadonlyGoalsHistoryGroup {
  readonly key: string;
  readonly label: string;
  readonly total: number;
  readonly count: number;
  readonly diff: number | null;
  readonly diffPct: number | null;
  readonly isCurrent: boolean;
}

export interface ReadonlyGoalsHistorySummary {
  readonly total: number;
  readonly monthCount: number;
  readonly avg: number | null;
}

export interface ReadonlyGoalsHistory {
  readonly groups: readonly ReadonlyGoalsHistoryGroup[];
  readonly summary: ReadonlyGoalsHistorySummary;
}

export interface ReadonlyGoalsSnapshot {
  readonly version: 1;
  readonly originMode: 'real-wallet' | 'empty-wallet' | 'fallback-readonly' | 'demo-source';
  readonly originLabel: string;
  readonly generatedAt: string;
  readonly notice: string;
  readonly flags: ReadonlyGoalsFlags;
  readonly patrimony: ReadonlyGoalsMetrics;
  readonly income: ReadonlyGoalsIncomeMetrics;
  readonly assetGoal: ReadonlyGoalsAssetConfig;
  readonly allocation: {
    readonly items: readonly ReadonlyGoalsAllocationItem[];
  };
  readonly allowedTypes: readonly string[];
  readonly history: ReadonlyGoalsHistory;
}

export interface ReadOnlyGoalsSource {
  readonly getSnapshot: () => ReadonlyGoalsSnapshot | null;
}

export declare const GOALS_READONLY_FALLBACK_SNAPSHOT: ReadonlyGoalsSnapshot;

export declare function isReadonlyGoalsSnapshot(value: unknown): value is ReadonlyGoalsSnapshot;

export declare function normalizeReadonlyGoalsSnapshot(candidate: unknown): ReadonlyGoalsSnapshot;
