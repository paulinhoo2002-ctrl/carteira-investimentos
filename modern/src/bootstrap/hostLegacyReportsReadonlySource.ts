import type { ReadOnlyReportsSource } from '../features/reports/reportsReadonlyBridge.ts';

export interface HostLegacyReportAsset {
  readonly ticker: string;
  readonly name: string;
  readonly type: 'Ação' | 'FII' | 'ETF';
  readonly sector: string;
  readonly qty: number;
  readonly avg_price: number;
  readonly current_price: number;
  readonly applied: number;
  readonly current: number;
  readonly source: string;
  readonly updated_at: string;
}

export interface HostLegacyReportsReadonlySourceOptions {
  readonly legacyModule?: Record<string, unknown> | null;
  readonly buildReportAssetRowModule?: Record<string, unknown> | null;
  readonly getAssets?: () => readonly HostLegacyReportAsset[];
  readonly getGeneratedAt?: () => string;
  readonly notice?: string;
}

const HOST_LEGACY_REPORTS_GENERATED_AT = '2026-07-14T10:30:00.000Z';
const HOST_LEGACY_REPORTS_NOTICE = 'Snapshot legado somente leitura. React nao escreve na fonte.';

const HOST_LEGACY_REPORTS_ASSETS = deepFreeze([
  {
    ticker: 'PETR4',
    name: 'Petrobras',
    type: 'Ação',
    sector: 'Energia',
    qty: 10,
    avg_price: 20,
    current_price: 25,
    applied: 200,
    current: 250,
    source: 'host-experimental',
    updated_at: HOST_LEGACY_REPORTS_GENERATED_AT,
  },
  {
    ticker: 'MXRF11',
    name: 'Maxi Renda',
    type: 'FII',
    sector: 'Imobiliario',
    qty: 5,
    avg_price: 100,
    current_price: 90,
    applied: 500,
    current: 450,
    source: 'host-experimental',
    updated_at: HOST_LEGACY_REPORTS_GENERATED_AT,
  },
  {
    ticker: 'BOVA11',
    name: 'BOVA',
    type: 'ETF',
    sector: 'Ibovespa',
    qty: 2,
    avg_price: 100,
    current_price: 100,
    applied: 200,
    current: 200,
    source: 'host-experimental',
    updated_at: HOST_LEGACY_REPORTS_GENERATED_AT,
  },
] as const) as readonly HostLegacyReportAsset[];

const HOST_LEGACY_REPORTS_META: Record<string, Pick<HostLegacyReportAsset, 'sector' | 'type'>> = {
  PETR4: { type: 'Ação', sector: 'Energia' },
  MXRF11: { type: 'FII', sector: 'Imobiliario' },
  BOVA11: { type: 'ETF', sector: 'Ibovespa' },
};

function isModuleFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

function resolveModuleFunction(module: Record<string, unknown> | null | undefined, key: string): unknown {
  if (!module) {
    return null;
  }

  if (key in module) {
    return module[key];
  }

  const defaultExport = module.default;
  if (defaultExport && typeof defaultExport === 'object' && key in defaultExport) {
    return (defaultExport as Record<string, unknown>)[key];
  }

  return null;
}

function hostAssetAppliedValue(asset: HostLegacyReportAsset): number {
  return asset.applied;
}

function hostAssetCurrentValue(asset: HostLegacyReportAsset): number {
  return asset.current;
}

function hostMetaTicker(ticker: string) {
  return HOST_LEGACY_REPORTS_META[String(ticker || '').trim()] ?? {
    type: 'Ação',
    sector: '',
  };
}

function hostNormalizeType(value: unknown, fallback = 'Ação'): 'Ação' | 'FII' | 'ETF' {
  const normalized = String(value ?? '').trim();

  if (normalized === 'Ação' || normalized === 'FII' || normalized === 'ETF') {
    return normalized;
  }

  return fallback as 'Ação' | 'FII' | 'ETF';
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);

  for (const key of Object.keys(value as Record<string, unknown>)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }

  return value;
}

async function loadBuildReportAssetRowModule(): Promise<Record<string, unknown> | null> {
  const hadOwnProperty = Object.prototype.hasOwnProperty.call(globalThis, 'buildReportAssetRow');
  const previousValue = (globalThis as Record<string, unknown>).buildReportAssetRow;

  try {
    return await import('../../../report-asset-row.js');
  } finally {
    if (hadOwnProperty) {
      (globalThis as Record<string, unknown>).buildReportAssetRow = previousValue;
    } else {
      Reflect.deleteProperty(globalThis, 'buildReportAssetRow');
    }
  }
}

export async function createHostLegacyReportsReadonlySource(
  options: HostLegacyReportsReadonlySourceOptions = {},
): Promise<ReadOnlyReportsSource | null> {
  try {
    const legacyModule =
      options.legacyModule === undefined ? await import('../../../legacy/reports-readonly-source.js') : options.legacyModule;
    const buildReportAssetRowModule =
      options.buildReportAssetRowModule === undefined ? await loadBuildReportAssetRowModule() : options.buildReportAssetRowModule;

    if (!legacyModule || !buildReportAssetRowModule) {
      return null;
    }

    const createLegacyReportsReadonlySource = resolveModuleFunction(
      legacyModule,
      'createLegacyReportsReadonlySource',
    );
    const buildReportAssetRow = resolveModuleFunction(buildReportAssetRowModule, 'buildReportAssetRow');

    if (!isModuleFunction(createLegacyReportsReadonlySource) || !isModuleFunction(buildReportAssetRow)) {
      return null;
    }

    return createLegacyReportsReadonlySource({
      getAssets: options.getAssets ?? (() => HOST_LEGACY_REPORTS_ASSETS),
      buildReportAssetRow,
      assetAppliedValue: hostAssetAppliedValue,
      assetCurrentValue: hostAssetCurrentValue,
      metaTicker: hostMetaTicker,
      normalizeType: hostNormalizeType,
      getGeneratedAt: options.getGeneratedAt ?? (() => HOST_LEGACY_REPORTS_GENERATED_AT),
      notice: options.notice ?? HOST_LEGACY_REPORTS_NOTICE,
    });
  } catch {
    return null;
  }
}

export {
  HOST_LEGACY_REPORTS_ASSETS,
  HOST_LEGACY_REPORTS_GENERATED_AT,
  HOST_LEGACY_REPORTS_NOTICE,
  hostAssetAppliedValue,
  hostAssetCurrentValue,
  hostMetaTicker,
  hostNormalizeType,
};
