import {
  FIXED_INCOME_READONLY_FALLBACK_SNAPSHOT,
  normalizeReadonlyFixedIncomeSnapshot,
} from '../features/fixed-income/fixedIncomeReadonlyContract.mjs';
import type { ReadOnlyFixedIncomeSource } from '../features/fixed-income/fixedIncomeReadonlyContract.mjs';

export interface HostFixedIncomeAsset {
  readonly [key: string]: unknown;
}

export interface HostFixedIncomeReadonlySourceOptions {
  readonly getAssets?: () => readonly HostFixedIncomeAsset[];
  readonly getGeneratedAt?: () => string;
  readonly notice?: string;
}

const HOST_FIXED_INCOME_NOTICE = 'Snapshot legado somente leitura de renda fixa. React nao escreve na fonte.';
const HOST_FIXED_INCOME_MATURITY_STATUSES = [
  'Vencido',
  'Próximo',
  'A vencer',
  'Sem informação',
] as const;

const FIXED_INCOME_TYPE_TOKENS = new Set([
  'renda fixa',
  'tesouro direto',
  'cdb',
  'lci',
  'lca',
  'cri',
  'cra',
  'debênture',
  'debenture',
  'letra financeira',
  'lc',
  'lf',
  'rdb',
]);

function isText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

function toText(value: unknown, fallback: string | null = null) {
  return isText(value) ? value.trim() : fallback;
}

function toNullableNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTypeToken(value: unknown) {
  return isText(value) ? value.trim().toLowerCase() : '';
}

function isFixedIncomeMappedItem<T>(value: T | null): value is T {
  return Boolean(value);
}

function isFixedIncomeCandidate(asset: HostFixedIncomeAsset) {
  const explicitTokens = [
    asset?.type,
    asset?.sector,
    asset?.asset_type,
    asset?.category,
    asset?.rf_subtype,
    asset?.fixed_subtype,
    asset?.rf_yield_type,
    asset?.bondType,
  ].map(normalizeTypeToken);

  const hasStructuralFields = [
    'rf_applied_value',
    'rf_gross_value',
    'rf_liquid_value',
    'rf_contract_rate',
    'rf_maturity_date',
    'rf_ir_iof',
    'fixed_initial_value',
    'fixed_current_value',
    'fixed_gross_value',
    'fixed_rate',
  ].some((key) => asset?.[key] !== undefined && asset?.[key] !== null);

  return hasStructuralFields || explicitTokens.some((token) => FIXED_INCOME_TYPE_TOKENS.has(token));
}

function normalizeMaturityStatus(maturityDate: string | null, generatedAt: string) {
  if (!maturityDate) {
    return 'Sem informação';
  }

  const dueTime = Date.parse(maturityDate);
  if (!Number.isFinite(dueTime)) {
    return 'Sem informação';
  }

  const referenceTime = Date.parse(generatedAt);
  if (!Number.isFinite(referenceTime)) {
    return 'Sem informação';
  }

  const remainingDays = Math.floor((dueTime - referenceTime) / 86400000);

  if (remainingDays < 0) {
    return 'Vencido';
  }

  if (remainingDays <= 30) {
    return 'Próximo';
  }

  return 'A vencer';
}

function mapFixedIncomeAsset(asset: HostFixedIncomeAsset, generatedAt: string) {
  const id = toText(asset?.id ?? asset?.rf_id ?? asset?.fixed_id ?? asset?.assetId ?? asset?.sourceEventId, null);
  const ticker = toText(asset?.ticker ?? asset?.symbol ?? asset?.code, null);
  const name = toText(asset?.rf_name ?? asset?.name ?? asset?.product ?? asset?.title ?? ticker ?? id, null);

  if (!id && !ticker && !name) {
    return null;
  }

  const maturityDate = toText(asset?.rf_maturity_date ?? asset?.fixed_maturity_date ?? asset?.maturityDate ?? asset?.vencimento, null);

  return {
    id,
    ticker,
    name,
    subtype: toText(asset?.rf_subtype ?? asset?.fixed_subtype ?? asset?.bondType ?? asset?.sector ?? asset?.rf_yield_type, null),
    issuer: toText(asset?.fixed_issuer ?? asset?.rf_issuer ?? asset?.issuer ?? asset?.institution ?? asset?.emitter, null),
    applicationDate: toText(asset?.rf_application_date ?? asset?.rf_aporte_date ?? asset?.fixed_application_date ?? asset?.applicationDate ?? asset?.date, null),
    maturityDate,
    contractedRate: toText(asset?.rf_contract_rate ?? asset?.fixed_rate ?? asset?.rate, null),
    indexer: toText(asset?.fixed_indexer ?? asset?.rf_yield_type ?? asset?.indexer, null),
    appliedValue: toNullableNumber(asset?.rf_applied_value ?? asset?.fixed_initial_value ?? asset?.appliedValue ?? asset?.initialValue ?? asset?.price),
    grossValue: toNullableNumber(asset?.rf_gross_value ?? asset?.fixed_gross_value ?? asset?.marketValue ?? asset?.currentValue ?? asset?.current_price),
    liquidValue: toNullableNumber(asset?.rf_liquid_value ?? asset?.fixed_current_value ?? asset?.liquidValue ?? asset?.current_value ?? asset?.current),
    profitValue: toNullableNumber(asset?.rf_profit_value ?? asset?.fixed_profit_value ?? asset?.profitValue),
    irValue: toNullableNumber(asset?.ir_value ?? asset?.irValue),
    iofValue: toNullableNumber(asset?.iof_value ?? asset?.iofValue),
    combinedTaxValue: toNullableNumber(asset?.rf_ir_iof ?? asset?.ir_iof ?? asset?.iriof),
    liquidity: toText(asset?.rf_liquidity ?? asset?.fixed_liquidity ?? asset?.liquidity ?? asset?.dailyLiquidity, null),
    unavailableValue: toNullableNumber(asset?.rf_unavailable_value ?? asset?.unavailableValue),
    maturityStatus: normalizeMaturityStatus(maturityDate, generatedAt),
    note: toText(asset?.rf_note ?? asset?.note ?? asset?.observation ?? asset?.decision, null),
  };
}

function buildSummary(items: readonly ReturnType<typeof mapFixedIncomeAsset>[]) {
  return {
    totalApplied: null,
    totalGross: null,
    totalLiquid: null,
    totalProfit: null,
    totalIrValue: null,
    totalIofValue: null,
    totalCombinedTaxValue: null,
    totalUnavailableValue: null,
    itemCount: items.length,
  };
}

function resolveGeneratedAt(getGeneratedAt?: () => string) {
  const candidate = getGeneratedAt?.();

  return isText(candidate) ? candidate.trim() : new Date().toISOString();
}

export function createHostFixedIncomeReadonlySource(
  options: HostFixedIncomeReadonlySourceOptions = {},
): ReadOnlyFixedIncomeSource {
  return {
    getSnapshot() {
      try {
        const generatedAt = resolveGeneratedAt(options.getGeneratedAt);
        const rawAssets = options.getAssets?.();
        const items = Array.isArray(rawAssets)
          ? rawAssets
              .filter(isFixedIncomeCandidate)
              .map((asset) => mapFixedIncomeAsset(asset, generatedAt))
              .filter(isFixedIncomeMappedItem)
          : [];

        return normalizeReadonlyFixedIncomeSnapshot({
          version: 1,
          generatedAt,
          notice: options.notice ?? HOST_FIXED_INCOME_NOTICE,
          summary: buildSummary(items),
          items,
        });
      } catch {
        return FIXED_INCOME_READONLY_FALLBACK_SNAPSHOT;
      }
    },
  };
}

export {
  HOST_FIXED_INCOME_MATURITY_STATUSES,
  HOST_FIXED_INCOME_NOTICE,
};
