// Import types from the readonly contract
import type { ReadOnlyPortfolioHistorySnapshot } from '../features/portfolio-history/portfolioHistoryReadonlyContract.ts';
import * as PortfolioHistoryCore from 'portfolio-history-core';
import * as PersistenceCore from 'persistence-core';

export interface HostPortfolioHistoryCaptureActionOptions {
  readonly getFullState?: () => Record<string, unknown> | null;
  readonly getHistoryState?: () => { readonly snapshots?: readonly unknown[]; readonly config?: unknown } | null;
  readonly getGeneratedAt?: () => string;
  readonly applyStorageTransaction?: (state: Record<string, unknown>) => Promise<void> | void;
}

export interface CaptureHistorySnapshotResult {
  readonly status: 'CREATED' | 'DUPLICATE' | 'FAILED';
  readonly snapshot?: {
    readonly id: string;
    readonly capturedAt: string;
    readonly contentHash: string;
    readonly priceCoverage: string;
    readonly totalValue: number;
    readonly assetCount: number;
  };
  readonly reason?: string;
}

export function createHostPortfolioHistoryCaptureAction(
  options: HostPortfolioHistoryCaptureActionOptions = {},
): () => Promise<CaptureHistorySnapshotResult> {
  return async (): Promise<CaptureHistorySnapshotResult> => {
    try {
      const getFullState = options.getFullState;
      const getHistoryState = options.getHistoryState;
      const getGeneratedAt = options.getGeneratedAt ?? (() => new Date().toISOString());
      const applyStorageTransaction = options.applyStorageTransaction;

      if (!getFullState || !getHistoryState || !applyStorageTransaction) {
        return {
          status: 'FAILED',
          reason: 'PERSISTENCE_UNAVAILABLE',
        };
      }

      const fullState = getFullState();
      if (!fullState) {
        return {
          status: 'FAILED',
          reason: 'STATE_UNAVAILABLE',
        };
      }

      const currentPortfolio = fullState.portfolio;
      if (!currentPortfolio || !Array.isArray(currentPortfolio.assets)) {
        return {
          status: 'FAILED',
          reason: 'PORTFOLIO_UNAVAILABLE',
        };
      }

      const historyState = getHistoryState();
      if (!historyState) {
        return {
          status: 'FAILED',
          reason: 'HISTORY_STATE_UNAVAILABLE',
        };
      }

      const { captureSnapshot, addSnapshotToHistory } = PortfolioHistoryCore;

      const generatedAt = getGeneratedAt();
      const snapshot = captureSnapshot(currentPortfolio.assets, generatedAt);
      const newHistoryState = addSnapshotToHistory(historyState, snapshot);

      const newFullState = {
        ...fullState,
        portfolioHistory: newHistoryState,
      };

      await applyStorageTransaction(newFullState);

      if (newHistoryState === historyState) {
        return {
          status: 'DUPLICATE',
          reason: 'NO_CHANGES_DETECTED',
          snapshot: {
            id: snapshot.id,
            capturedAt: snapshot.capturedAt,
            contentHash: snapshot.contentHash,
            priceCoverage: snapshot.priceCoverage,
            totalValue: snapshot.valuations.totalValue,
            assetCount: snapshot.valuations.byAsset.length,
          },
        };
      }

      return {
        status: 'CREATED',
        snapshot: {
          id: snapshot.id,
          capturedAt: snapshot.capturedAt,
          contentHash: snapshot.contentHash,
          priceCoverage: snapshot.priceCoverage,
          totalValue: snapshot.valuations.totalValue,
          assetCount: snapshot.valuations.byAsset.length,
        },
      };
    } catch (error) {
      return {
        status: 'FAILED',
        reason: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      };
    }
  };
}