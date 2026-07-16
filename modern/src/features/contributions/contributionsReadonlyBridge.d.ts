import type { ReadOnlyContributionsSnapshot, ReadOnlyContributionsSource } from './contributionsReadonlyContract.mjs';

export interface ReadOnlyContributionsBridge {
  readonly readSnapshot: () => ReadOnlyContributionsSnapshot;
}

export declare function createContributionsReadonlyBridge(
  source?: ReadOnlyContributionsSource | null,
): ReadOnlyContributionsBridge;

export declare const CONTRIBUTIONS_READONLY_BRIDGE: ReadOnlyContributionsBridge;
export { CONTRIBUTIONS_READONLY_FALLBACK_SNAPSHOT, normalizeReadonlyContributionsSnapshot } from './contributionsReadonlyContract.mjs';
