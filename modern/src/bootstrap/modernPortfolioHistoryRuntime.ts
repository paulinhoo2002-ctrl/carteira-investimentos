import { createReadOnlyPortfolioHistoryAdapter } from '../features/portfolio-history/portfolioHistorySnapshotAdapter.ts';
import type { ReadOnlyPortfolioHistorySource } from '../features/portfolio-history/portfolioHistoryReadonlyContract.ts';

export interface ModernPortfolioHistoryRuntime {
  readonly portfolioHistoryAdapter: ReadOnlyPortfolioHistoryAdapter;
}

export function createModernPortfolioHistoryRuntime({
  portfolioHistorySource,
}: {
  readonly portfolioHistorySource: ReadOnlyPortfolioHistorySource | null | undefined;
}): ModernPortfolioHistoryRuntime {
  const portfolioHistoryAdapter = portfolioHistorySource
    ? createReadOnlyPortfolioHistoryAdapter(portfolioHistorySource)
    : null;

  return {
    portfolioHistoryAdapter,
  };
}