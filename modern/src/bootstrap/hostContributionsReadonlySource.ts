import {
  CONTRIBUTIONS_READONLY_FALLBACK_SNAPSHOT,
  normalizeReadonlyContributionsSnapshot,
} from '../features/contributions/contributionsReadonlyContract.mjs';
import type { ReadOnlyContributionsSource } from '../features/contributions/contributionsReadonlyContract.mjs';

export interface HostContributionsReadonlySourceOptions {
  readonly getContributionsSnapshot?: () => unknown;
}

export function createHostContributionsReadonlySource(
  options: HostContributionsReadonlySourceOptions = {},
): ReadOnlyContributionsSource {
  return {
    getSnapshot() {
      try {
        return normalizeReadonlyContributionsSnapshot(options.getContributionsSnapshot?.());
      } catch {
        return CONTRIBUTIONS_READONLY_FALLBACK_SNAPSHOT;
      }
    },
  };
}
