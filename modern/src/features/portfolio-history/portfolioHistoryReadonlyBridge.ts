import {
  PORTFOLIO_HISTORY_READONLY_CONTRACT_VERSION,
  PORTFOLIO_HISTORY_READONLY_FALLBACK_SNAPSHOT,
  normalizeReadonlyPortfolioHistorySnapshot,
  isReadonlyPortfolioHistorySnapshot,
} from './portfolioHistoryReadonlyContract.ts';

export function createReadOnlyPortfolioHistoryBridge(
  source?: { getSnapshot?: () => unknown } | null,
) {
  const fallbackSnapshot = PORTFOLIO_HISTORY_READONLY_FALLBACK_SNAPSHOT;

  let currentSnapshot = fallbackSnapshot;
  let sourceAvailable = false;

  function readSnapshot() {
    if (!sourceAvailable) {
      return currentSnapshot;
    }

    try {
      const raw = source?.getSnapshot?.();
      if (isReadonlyPortfolioHistorySnapshot(raw)) {
        currentSnapshot = normalizeReadonlyPortfolioHistorySnapshot(raw);
        return currentSnapshot;
      }
    } catch {
      // Ignore and return current snapshot
    }

    return currentSnapshot;
  }

  function setSource(newSource: { getSnapshot?: () => unknown } | null) {
    sourceAvailable = Boolean(newSource);
    if (sourceAvailable) {
      const raw = newSource?.getSnapshot?.();
      if (isReadonlyPortfolioHistorySnapshot(raw)) {
        currentSnapshot = normalizeReadonlyPortfolioHistorySnapshot(raw);
      }
    }
  }

  function getVersion() {
    return PORTFOLIO_HISTORY_READONLY_CONTRACT_VERSION;
  }

  return {
    readSnapshot,
    setSource,
    getVersion,
  };
}

export const READ_ONLY_PORTFOLIO_HISTORY_BRIDGE = createReadOnlyPortfolioHistoryBridge();