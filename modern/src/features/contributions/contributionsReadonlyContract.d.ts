export declare const CONTRIBUTIONS_READONLY_CONTRACT_VERSION: 1;
export declare const CONTRIBUTIONS_READONLY_SUGGESTION_STATUSES: readonly ['available', 'unavailable', 'insufficient-data', 'conflicting'];
export declare const CONTRIBUTIONS_READONLY_ORIGIN_MODES: readonly ['real-wallet', 'empty-wallet', 'fallback-readonly', 'demo-source'];

export interface ReadOnlyContributionReason {
  readonly code: string;
  readonly label: string;
  readonly detail: string;
  readonly sourceField: string | null;
  readonly value: string | null;
  readonly unit: string | null;
}

export interface ReadOnlyContributionItem {
  readonly id: string | null;
  readonly sourceEventId: string | null;
  readonly assetId: string | null;
  readonly sourceEventKind: string | null;
  readonly date: string | null;
  readonly ticker: string | null;
  readonly assetName: string | null;
  readonly assetClass: string | null;
  readonly amount: number | null;
  readonly quantity: number | null;
  readonly unitPrice: number | null;
  readonly operation: string | null;
  readonly source: string | null;
  readonly note: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

export interface ReadOnlyContributionClassDistributionItem {
  readonly label: string;
  readonly itemCount: number;
  readonly latestContributionDate: string | null;
}

export interface ReadOnlyContributionMonthDistributionItem {
  readonly monthKey: string;
  readonly label: string;
  readonly itemCount: number;
}

export interface ReadOnlyContributionSuggestionCandidate {
  readonly assetId: string | null;
  readonly ticker: string | null;
  readonly assetName: string | null;
  readonly assetClass: string | null;
  readonly sector: string | null;
  readonly score: number | null;
  readonly share: number | null;
  readonly pct: number | null;
  readonly dy: number | null;
  readonly idealWeightPct: number | null;
  readonly typeGapPct: number | null;
  readonly signalLabel: string;
  readonly signalTone: 'positive' | 'neutral' | 'negative' | 'muted';
  readonly reasons: readonly ReadOnlyContributionReason[];
  readonly warnings: readonly string[];
}

export interface ReadOnlyContributionsSuggestion {
  readonly status: 'available' | 'unavailable' | 'insufficient-data' | 'conflicting';
  readonly generatedAt: string;
  readonly strategyName: string | null;
  readonly candidates: readonly ReadOnlyContributionSuggestionCandidate[];
  readonly warnings: readonly string[];
  readonly inputs: readonly string[];
  readonly limitations: readonly string[];
}

export interface ReadOnlyContributionsSummary {
  readonly itemCount: number;
  readonly classCount: number;
  readonly monthCount: number;
  readonly candidateCount: number;
  readonly insufficientCount: number;
  readonly avoidedCount: number;
  readonly latestContributionDate: string | null;
}

export interface ReadOnlyContributionsSnapshot {
  readonly version: 1;
  readonly originMode: 'real-wallet' | 'empty-wallet' | 'fallback-readonly' | 'demo-source';
  readonly originLabel: string;
  readonly generatedAt: string;
  readonly notice: string;
  readonly summary: ReadOnlyContributionsSummary;
  readonly items: readonly ReadOnlyContributionItem[];
  readonly classDistribution: readonly ReadOnlyContributionClassDistributionItem[];
  readonly monthDistribution: readonly ReadOnlyContributionMonthDistributionItem[];
  readonly suggestion: ReadOnlyContributionsSuggestion;
}

export interface ReadOnlyContributionsSource {
  readonly getSnapshot: () => ReadOnlyContributionsSnapshot | null;
}

export declare const CONTRIBUTIONS_READONLY_FALLBACK_SNAPSHOT: ReadOnlyContributionsSnapshot;
export declare function isReadonlyContributionsSnapshot(value: unknown): value is ReadOnlyContributionsSnapshot;
export declare function normalizeReadonlyContributionsSnapshot(
  candidate: unknown,
): ReadOnlyContributionsSnapshot;
