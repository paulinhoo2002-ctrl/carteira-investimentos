import type { ReadOnlyPortfolioHistorySource } from '../features/portfolio-history/portfolioHistoryReadonlyContract.ts';
import { normalizeReadonlyPortfolioHistorySnapshot } from '../features/portfolio-history/portfolioHistoryReadonlyContract.ts';

export interface HostPortfolioHistoryReadonlySourceOptions {
  readonly getHistoryState?: () => {
    readonly snapshots?: readonly unknown[];
    readonly config?: unknown;
  };
  readonly getGeneratedAt?: () => string;
  readonly notice?: string;
}

const HOST_PORTFOLIO_HISTORY_NOTICE = 'Snapshot somente leitura de histórico de portfólio. React não escreve na fonte.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toText(value: unknown, fallback: string | null = null): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function toNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSnapshot(raw: unknown): ReturnType<typeof import('./portfolioHistoryReadonlyContract.ts').normalizeSnapshot> | null {
  if (!isRecord(raw)) return null;
  
  const format = toText(raw.format);
  const version = toText(raw.version);
  const id = toText(raw.id);
  const capturedAt = toText(raw.capturedAt);
  const source = toText(raw.source);
  const priceCoverage = toText(raw.priceCoverage);
  const contentHash = toText(raw.contentHash);
  const schemaVersion = toText(raw.schemaVersion);
  
  if (!format || !version || !id || !capturedAt || !source || !priceCoverage || !contentHash || !schemaVersion) {
    return null;
  }
  
  const provenance = isRecord(raw.provenance) ? {
    userId: toText(raw.provenance.userId, 'unknown'),
    walletId: toText(raw.provenance.walletId, 'unknown'),
    captureReason: toText(raw.provenance.captureReason, 'manual'),
    extra: isRecord(raw.provenance.extra) ? raw.provenance.extra : {},
  } : {
    userId: 'unknown',
    walletId: 'unknown',
    captureReason: 'manual',
    extra: {},
  };
  
  const valuations = isRecord(raw.valuations) ? {
    totalValue: toNumber(raw.valuations.totalValue) ?? 0,
    byAsset: Array.isArray(raw.valuations.byAsset) ? raw.valuations.byAsset.map((asset: unknown) => {
      if (!isRecord(asset)) return null;
      return {
        id: toText(asset.id, ''),
        ticker: toText(asset.ticker, ''),
        quantity: toNumber(asset.quantity) ?? 0,
        currentPrice: toNumber(asset.currentPrice),
        value: toNumber(asset.value),
      };
    }).filter(Boolean) : [],
  } : {
    totalValue: 0,
    byAsset: [],
  };
  
  return {
    format,
    version,
    id,
    capturedAt,
    source,
    provenance,
    valuations,
    priceCoverage,
    contentHash,
    schemaVersion,
  };
}

function normalizeConfig(raw: unknown) {
  if (!isRecord(raw)) return {
    autoCaptureEnabled: true,
    captureIntervalDays: 1,
    maxSnapshots: 3650,
    maxAgeDays: 3650,
    dedupEnabled: true,
  };
  
  return {
    autoCaptureEnabled: typeof raw.autoCaptureEnabled === 'boolean' ? raw.autoCaptureEnabled : true,
    captureIntervalDays: typeof raw.captureIntervalDays === 'number' && Number.isInteger(raw.captureIntervalDays) && raw.captureIntervalDays >= 1 ? raw.captureIntervalDays : 1,
    maxSnapshots: typeof raw.maxSnapshots === 'number' && Number.isInteger(raw.maxSnapshots) && raw.maxSnapshots >= 1 ? raw.maxSnapshots : 3650,
    maxAgeDays: typeof raw.maxAgeDays === 'number' && Number.isInteger(raw.maxAgeDays) && raw.maxAgeDays >= 1 ? raw.maxAgeDays : 3650,
    dedupEnabled: typeof raw.dedupEnabled === 'boolean' ? raw.dedupEnabled : true,
  };
}

function resolveGeneratedAt(getGeneratedAt?: () => string): string {
  const candidate = getGeneratedAt?.();
  return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate.trim() : new Date().toISOString();
}

export function createHostPortfolioHistoryReadonlySource(
  options: HostPortfolioHistoryReadonlySourceOptions = {},
): ReadOnlyPortfolioHistorySource {
  return {
    getSnapshot() {
      try {
        const generatedAt = resolveGeneratedAt(options.getGeneratedAt);
        const historyState = options.getHistoryState?.();
        
        const snapshots = Array.isArray(historyState?.snapshots)
          ? historyState.snapshots.map(normalizeSnapshot).filter(Boolean)
          : [];
        
        const config = normalizeConfig(historyState?.config);
        
        return normalizeReadonlyPortfolioHistorySnapshot({
          version: 1,
          generatedAt,
          notice: options.notice ?? HOST_PORTFOLIO_HISTORY_NOTICE,
          snapshots,
          config,
        });
      } catch {
        return normalizeReadonlyPortfolioHistorySnapshot({
          version: 1,
          generatedAt: new Date().toISOString(),
          notice: 'Erro ao ler snapshot de histórico de portfólio.',
          snapshots: [],
          config: {
            autoCaptureEnabled: true,
            captureIntervalDays: 1,
            maxSnapshots: 3650,
            maxAgeDays: 3650,
            dedupEnabled: true,
          },
        });
      }
    },
  };
}