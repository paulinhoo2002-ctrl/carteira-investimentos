import * as AutoCapture from 'portfolio-history-auto-capture';
import * as PortfolioHistoryCore from 'portfolio-history-core';

export interface PortfolioHistoryAutoCaptureCoordinatorOptions {
  readonly getFullState?: () => Record<string, unknown> | null;
  readonly getHistoryState?: () => { readonly snapshots?: readonly unknown[]; readonly config?: unknown } | null;
  readonly getGeneratedAt?: () => string;
  readonly applyStorageTransaction?: (state: Record<string, unknown>) => Promise<void> | void;
  readonly walletId?: string;
  readonly userId?: string;
  readonly timezoneOffsetMinutes?: number;
}

export interface AutoCaptureResult {
  readonly status: 'CREATED' | 'DUPLICATE' | 'SKIPPED' | 'FAILED';
  readonly reason: string;
  readonly walletId: string;
  readonly snapshot?: {
    readonly id: string;
    readonly capturedAt: string;
    readonly contentHash: string;
    readonly priceCoverage: string;
    readonly totalValue: number;
    readonly assetCount: number;
    readonly source: string;
  };
  readonly eligibility?: {
    readonly eligible: boolean;
    readonly reason: string;
    readonly daysSinceLast?: number | null;
  };
}

export function createPortfolioHistoryAutoCaptureCoordinator(
  options: PortfolioHistoryAutoCaptureCoordinatorOptions = {}
): () => Promise<AutoCaptureResult> {
  const {
    getFullState,
    getHistoryState,
    getGeneratedAt = () => new Date().toISOString(),
    applyStorageTransaction,
    walletId = 'default',
    userId = 'auto',
    timezoneOffsetMinutes = null,
  } = options;

  let hasRunThisSession = false;

  return async (): Promise<AutoCaptureResult> => {
    // Prevent double invocation in same session (React StrictMode, etc.)
    if (hasRunThisSession) {
      return {
        status: 'SKIPPED',
        reason: 'ALREADY_RUN_THIS_SESSION',
        walletId,
      };
    }

    // Validate required dependencies
    if (!getFullState || !getHistoryState || !applyStorageTransaction) {
      return {
        status: 'FAILED',
        reason: 'PERSISTENCE_UNAVAILABLE',
        walletId,
      };
    }

    hasRunThisSession = true;

    try {
      const fullState = getFullState();
      if (!fullState) {
        return {
          status: 'FAILED',
          reason: 'STATE_UNAVAILABLE',
          walletId,
        };
      }

      const historyState = getHistoryState();
      if (!historyState) {
        return {
          status: 'FAILED',
          reason: 'HISTORY_STATE_UNAVAILABLE',
          walletId,
        };
      }

      const config = historyState.config || PortfolioHistoryCore.getDefaultConfig();
      const now = Date.now();
      const generatedAt = getGeneratedAt();

      // Check eligibility using auto-capture coordinator logic
      const eligibility = AutoCapture.shouldAutoCapture(historyState, config, {
        now,
        walletId,
        timezoneOffsetMinutes,
      });

      if (!eligibility.eligible) {
        return {
          status: 'SKIPPED',
          reason: eligibility.reason,
          walletId,
          eligibility,
        };
      }

      // Validate we can create an honest snapshot
      if (!AutoCapture.canCreateHonestSnapshot(fullState)) {
        return {
          status: 'SKIPPED',
          reason: 'STATE_INSUFFICIENT_FOR_HONEST_SNAPSHOT',
          walletId,
          eligibility,
        };
      }

      // Create snapshot with AUTO source
      const snapshot = await PortfolioHistoryCore.captureSnapshot(fullState, {
        source: 'AUTO',
        captureReason: 'DAILY_BASELINE',
        capturedAt: generatedAt,
        walletId,
        userId,
        extra: { autoCapture: true },
      });

      // Add to history
      const newHistoryState = PortfolioHistoryCore.addSnapshotToHistory(historyState, snapshot, config);

      // Check if it was actually added (not deduped)
      const walletSnapshots = newHistoryState.snapshots.filter(s => s.provenance?.walletId === walletId);
      const wasAdded = walletSnapshots.length > (historyState.snapshots?.filter(s => s.provenance?.walletId === walletId).length || 0);

      if (!wasAdded) {
        return {
          status: 'DUPLICATE',
          reason: 'AUTO_CAPTURE_DUPLICATE',
          walletId,
          snapshot: {
            id: snapshot.id,
            capturedAt: snapshot.capturedAt,
            contentHash: snapshot.contentHash,
            priceCoverage: snapshot.priceCoverage,
            totalValue: snapshot.valuations.totalValue,
            assetCount: snapshot.valuations.byAsset.length,
            source: snapshot.source,
          },
          eligibility,
        };
      }

      // Persist through canonical V269 path
      const newFullState = {
        ...fullState,
        portfolioHistory: newHistoryState,
      };

      await applyStorageTransaction(newFullState);

      return {
        status: 'CREATED',
        reason: 'AUTO_CAPTURE_CREATED',
        walletId,
        snapshot: {
          id: snapshot.id,
          capturedAt: snapshot.capturedAt,
          contentHash: snapshot.contentHash,
          priceCoverage: snapshot.priceCoverage,
          totalValue: snapshot.valuations.totalValue,
          assetCount: snapshot.valuations.byAsset.length,
          source: snapshot.source,
        },
        eligibility,
      };
    } catch (error) {
      return {
        status: 'FAILED',
        reason: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
        walletId,
      };
    }
  };
}

// Convenience function to run auto-capture on app mount
export function runAutoCaptureOnMount(
  coordinator: () => Promise<AutoCaptureResult>
): Promise<AutoCaptureResult> {
  return coordinator();
}