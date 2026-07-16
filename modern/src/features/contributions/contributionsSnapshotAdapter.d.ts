import type { ReadOnlyContributionsBridge } from './contributionsReadonlyBridge.mjs';
import type { ReadOnlyContributionsSource, ReadOnlyContributionsSnapshot } from './contributionsReadonlyContract.mjs';

export interface ReadOnlyContributionsAdapter {
  readonly getSnapshot: () => ReadOnlyContributionsSnapshot;
}

export declare function createContributionsReadonlyAdapter(
  sourceOrBridge?: ReadOnlyContributionsSource | ReadOnlyContributionsBridge | null,
): ReadOnlyContributionsAdapter;

export declare const CONTRIBUTIONS_READONLY_ADAPTER: ReadOnlyContributionsAdapter;
