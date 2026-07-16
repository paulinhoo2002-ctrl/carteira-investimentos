import { App } from './App';
import { createHostFixedIncomeReadonlySource } from './bootstrap/hostFixedIncomeReadonlySource';
import {
  createHostLegacyReportsReadonlySource,
  hostAssetAppliedValue,
  hostAssetCurrentValue,
  hostMetaTicker,
  hostNormalizeType,
} from './bootstrap/hostLegacyReportsReadonlySource';
import { createModernFixedIncomeRuntime } from './bootstrap/modernFixedIncomeRuntime';
import { createModernReportsRuntime } from './bootstrap/modernReportsRuntime';
import { mountModernApp } from './bootstrap/mountModernApp';
import { createConnectedReportsDemoSource } from './features/reports/legacyReportsReadonlyIntegration.ts';
import type { HostFixedIncomeAsset } from './bootstrap/hostFixedIncomeReadonlySource';
import {
  buildReadonlyReportSessionSearch,
  readReadonlyReportSessionContext,
} from './features/reports/readonlyReportSessionContext.ts';
import {
  createReportsRefreshController,
  type ReportsReadonlyDiagnostics,
  type ReportsRefreshControllerDiagnosticsFactory,
  type ReportsReadonlyOriginMode,
} from './features/reports/reportsRefreshController.ts';
import type { HostLegacyReportAsset } from './bootstrap/hostLegacyReportsReadonlySource';
import type { ModernPageId } from './types/navigation.mjs';
import './styles.css';

const rootElement = typeof document !== 'undefined' ? document.getElementById('root') : null;

export interface HostBootstrapOptions {
  readonly rootElement?: HTMLElement | null;
  readonly getAssets?: () => readonly HostLegacyReportAsset[];
  readonly getFixedIncomeAssets?: () => readonly HostFixedIncomeAsset[];
  readonly legacyModule?: Record<string, unknown> | null;
  readonly buildReportAssetRowModule?: Record<string, unknown> | null;
  readonly getGeneratedAt?: () => string;
  readonly notice?: string;
  readonly strictSourceWiring?: boolean;
}

function createNullReportsSource() {
  return {
    getSnapshot() {
      return null;
    },
  };
}

function createHostExperimentalAssets(revision: number) {
  const offset = revision;

  return [
    {
      ticker: 'PETR4',
      name: 'Petrobras',
      type: 'AÃ§Ã£o',
      sector: 'Energia',
      qty: 10,
      avg_price: 20,
      current_price: 25 + offset,
      applied: 200,
      current: 250 + offset * 10,
      source: 'host-experimental',
      updated_at: '2026-07-14T10:30:00.000Z',
    },
    {
      ticker: 'MXRF11',
      name: 'Maxi Renda',
      type: 'FII',
      sector: 'Imobiliario',
      qty: 5,
      avg_price: 100,
      current_price: 90 + offset,
      applied: 500,
      current: 450 + offset * 5,
      source: 'host-experimental',
      updated_at: '2026-07-14T10:30:00.000Z',
    },
    {
      ticker: 'BOVA11',
      name: 'BOVA',
      type: 'ETF',
      sector: 'Ibovespa',
      qty: 2,
      avg_price: 100,
      current_price: 100 + offset,
      applied: 200,
      current: 200 + offset * 2,
      source: 'host-experimental',
      updated_at: '2026-07-14T10:30:00.000Z',
    },
  ] as const;
}

function resolveHostOriginMode({
  hasInjectedAssets,
  isFallbackSnapshot,
  itemCount,
}: {
  readonly hasInjectedAssets: boolean;
  readonly isFallbackSnapshot: boolean;
  readonly itemCount: number;
}): ReportsReadonlyOriginMode {
  if (isFallbackSnapshot) {
    return 'fallback-readonly';
  }

  if (!hasInjectedAssets) {
    return 'demo-source';
  }

  return itemCount > 0 ? 'real-wallet' : 'empty-wallet';
}

function buildHostOriginLabel(originMode: ReportsReadonlyOriginMode) {
  switch (originMode) {
    case 'real-wallet':
      return 'Carteira ativa real';
    case 'empty-wallet':
      return 'Carteira ativa vazia';
    case 'fallback-readonly':
      return 'Fallback readonly';
    case 'demo-source':
    default:
      return 'Fonte demonstrativa';
  }
}

function createHostDiagnosticsFactory({
  hasInjectedAssets,
}: {
  readonly hasInjectedAssets: boolean;
}): ReportsRefreshControllerDiagnosticsFactory {
  return ({ snapshot, isFallbackSnapshot, refreshStatus, previousDiagnostics }) => {
    const originMode = resolveHostOriginMode({
      hasInjectedAssets,
      isFallbackSnapshot,
      itemCount: snapshot.items.length,
    });

    const diagnostics: ReportsReadonlyDiagnostics = {
      originMode,
      originLabel: buildHostOriginLabel(originMode),
      itemCount: snapshot.items.length,
      generatedAt: snapshot.generatedAt,
      hasNotice: Boolean(String(snapshot.notice || '').trim()),
      refreshStatus: refreshStatus === 'error' && previousDiagnostics ? 'error' : refreshStatus,
    };

    return diagnostics;
  };
}

export async function bootstrapHost(options: HostBootstrapOptions = {}) {
  const targetRoot = options.rootElement ?? rootElement;

  if (!targetRoot) {
    throw new Error('Elemento root nao encontrado.');
  }

  const hasInjectedAssets = typeof options.getAssets === 'function';
  const hasInjectedFixedIncomeAssets = typeof options.getFixedIncomeAssets === 'function';
  const sessionContextEnabled =
    typeof location !== 'undefined' &&
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1') &&
    new URLSearchParams(location.search).get('activeWalletHost') === '1' &&
    new URLSearchParams(location.search).get('testMode') === '1';
  const initialSessionContext = sessionContextEnabled
    ? readReadonlyReportSessionContext(location.search, 'reports')
    : null;
  let experimentalRevision = 0;
  let experimentalAssets = createHostExperimentalAssets(experimentalRevision);

  const injectedLegacyModule = options.legacyModule ?? null;
  const injectedBuildReportAssetRow =
    options.buildReportAssetRowModule?.buildReportAssetRow ??
    options.buildReportAssetRowModule?.default?.buildReportAssetRow ??
    options.buildReportAssetRowModule?.default;
  const strictSourceWiring = options.strictSourceWiring === true;

  const directLegacyProvider =
    injectedLegacyModule &&
    (injectedLegacyModule.createLegacyAssetsReadonlyProvider ??
      injectedLegacyModule.createLegacyReportsReadonlySource ??
      injectedLegacyModule.default?.createLegacyAssetsReadonlyProvider ??
      injectedLegacyModule.default?.createLegacyReportsReadonlySource);

  const directReportsSource = (() => {
    if (typeof directLegacyProvider === 'function' && typeof injectedBuildReportAssetRow === 'function') {
      return directLegacyProvider({
        getAssets: options.getAssets ?? (() => experimentalAssets),
        buildReportAssetRow: injectedBuildReportAssetRow,
        assetAppliedValue: hostAssetAppliedValue,
        assetCurrentValue: hostAssetCurrentValue,
        metaTicker: hostMetaTicker,
        normalizeType: hostNormalizeType,
        getGeneratedAt:
          options.getGeneratedAt ??
          (() =>
            hasInjectedAssets
              ? new Date().toISOString()
              : new Date(Date.parse('2026-07-14T10:30:00.000Z') + experimentalRevision * 60000).toISOString()),
        notice: options.notice ?? 'Snapshot legado somente leitura. React nao escreve na fonte.',
      });
    }

    return null;
  })();

  const fixedIncomeSource = hasInjectedFixedIncomeAssets
    ? createHostFixedIncomeReadonlySource({
        getAssets: options.getFixedIncomeAssets,
        getGeneratedAt: options.getGeneratedAt ?? (() => new Date().toISOString()),
        notice: options.notice ?? 'Snapshot legado somente leitura de renda fixa. React nao escreve na fonte.',
      })
      : null;

  const fallbackHostReportsSource = await createHostLegacyReportsReadonlySource({
      legacyModule: injectedLegacyModule ?? undefined,
      getAssets: options.getAssets ?? (() => experimentalAssets),
      buildReportAssetRowModule: options.buildReportAssetRowModule ?? null,
      getGeneratedAt:
        options.getGeneratedAt ??
        (() =>
          hasInjectedAssets
            ? new Date().toISOString()
            : new Date(Date.parse('2026-07-14T10:30:00.000Z') + experimentalRevision * 60000).toISOString()),
      notice: options.notice ?? 'Snapshot legado somente leitura. React nao escreve na fonte.',
    });

  const resolvedReportsSource = directReportsSource ?? fallbackHostReportsSource;

  if (strictSourceWiring && !resolvedReportsSource) {
    throw new Error('Fonte readonly experimental indisponivel.');
  }

  const baseReportsSource =
    resolvedReportsSource ?? (hasInjectedAssets ? createNullReportsSource() : createConnectedReportsDemoSource());

  const reportsRefreshController = createReportsRefreshController({
    source: baseReportsSource,
    buildDiagnostics: createHostDiagnosticsFactory({ hasInjectedAssets }),
    onRefresh: hasInjectedAssets
      ? undefined
      : () => {
          experimentalRevision += 1;
          experimentalAssets = createHostExperimentalAssets(experimentalRevision);
      },
  });

  const modernReportsRuntime = createModernReportsRuntime({ reportsSource: reportsRefreshController });
  const modernFixedIncomeRuntime = createModernFixedIncomeRuntime({
    fixedIncomeSource: fixedIncomeSource ?? undefined,
  });

  mountModernApp({
    rootElement: targetRoot,
    reportsAdapter: modernReportsRuntime.reportsAdapter,
    fixedIncomeAdapter: modernFixedIncomeRuntime.fixedIncomeAdapter,
    AppComponent: App,
    reportsRefreshController,
      initialPageId: initialSessionContext?.pageId ?? 'overview',
      onActivePageIdChange(pageId: ModernPageId) {
      if (!sessionContextEnabled) {
        return;
      }

      try {
        const nextUrl = new URL(location.href);
        nextUrl.search = buildReadonlyReportSessionSearch(pageId, location.search);
        nextUrl.hash = '';
        history.replaceState(history.state, '', nextUrl.toString());
      } catch (error) {
        debugWarn('readonly report session context failed:', error);
      }
    },
  });

  return {
    reportsRefreshController,
    reportsAdapter: modernReportsRuntime.reportsAdapter,
    fixedIncomeAdapter: modernFixedIncomeRuntime.fixedIncomeAdapter,
  };
}

export const isHostPage =
  typeof location !== 'undefined' && /\/host\.html(?:[?#]|$)/.test(location.pathname);
