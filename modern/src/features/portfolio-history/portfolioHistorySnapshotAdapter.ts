import {
  READ_ONLY_PORTFOLIO_HISTORY_BRIDGE,
  createReadOnlyPortfolioHistoryBridge,
} from './portfolioHistoryReadonlyBridge.ts';

export function createReadOnlyPortfolioHistoryAdapter(sourceOrBridge: unknown) {
  const bridge =
    sourceOrBridge && typeof sourceOrBridge.readSnapshot === 'function'
      ? sourceOrBridge
      : createReadOnlyPortfolioHistoryBridge(sourceOrBridge);

  return {
    getSnapshot() {
      return bridge.readSnapshot();
    },
  };
}

export const READ_ONLY_PORTFOLIO_HISTORY_ADAPTER = createReadOnlyPortfolioHistoryAdapter(
  READ_ONLY_PORTFOLIO_HISTORY_BRIDGE
);