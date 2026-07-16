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

const HOST_FIXED_INCOME_GENERATED_AT = '2026-07-14T10:30:00.000Z';
const HOST_FIXED_INCOME_NOTICE = 'Snapshot legado somente leitura de renda fixa. React nao escreve na fonte.';
const HOST_FIXED_INCOME_MATURITY_STATUSES = [
  'Vencido',
  'Proximos 30 dias',
  'Proximos 90 dias',
  'Proximos 12 meses',
  'Acima de 12 meses',
  'Sem vencimento',
] as const;

function isText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

function toText(value: unknown, fallback = '') {
  return isText(value) ? value.trim() : fallback;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function isFixedIncomeCandidate(asset: HostFixedIncomeAsset) {
  const haystack = [
    asset?.type,
    asset?.sector,
    asset?.ticker,
    asset?.name,
    asset?.product,
    asset?.title,
    asset?.rf_subtype,
    asset?.fixed_subtype,
    asset?.rf_yield_type,
    asset?.bondType,
    asset?.fixed_issuer,
    asset?.issuer,
    asset?.institution,
    asset?.emitter,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const hasFixedIncomeFields = [
    'rf_applied_value',
    'rf_gross_value',
    'rf_liquid_value',
    'rf_contract_rate',
    'rf_maturity_date',
    'rf_ir_iof',
    'fixed_initial_value',
    'fixed_current_value',
    'fixed_gross_value',
  ].some((key) => asset?.[key] !== undefined && asset?.[key] !== null);

  return hasFixedIncomeFields || /renda fixa|tesouro|cdb|lci|lca|cri|cra|deb[eê]ntur|letra financeira|\blc\b|\blf\b/.test(haystack);
}

function normalizeMaturityStatus(maturityDate: string, generatedAt: string) {
  if (!maturityDate) {
    return 'Sem vencimento';
  }

  const dueTime = Date.parse(maturityDate);
  if (!Number.isFinite(dueTime)) {
    return 'Sem vencimento';
  }

  const referenceTime = Date.parse(generatedAt);
  const baseTime = Number.isFinite(referenceTime) ? referenceTime : Date.parse(HOST_FIXED_INCOME_GENERATED_AT);
  const remainingDays = Math.floor((dueTime - baseTime) / 86400000);

  if (remainingDays < 0) {
    return 'Vencido';
  }

  if (remainingDays <= 30) {
    return 'Proximos 30 dias';
  }

  if (remainingDays <= 90) {
    return 'Proximos 90 dias';
  }

  if (remainingDays <= 365) {
    return 'Proximos 12 meses';
  }

  return 'Acima de 12 meses';
}

function mapFixedIncomeAsset(asset: HostFixedIncomeAsset, generatedAt: string) {
  const ticker = toText(asset?.ticker, '');

  if (!ticker) {
    return null;
  }

  const maturityDate = toText(asset?.rf_maturity_date ?? asset?.fixed_maturity_date ?? asset?.maturityDate ?? asset?.vencimento, '');

  return {
    ticker,
    name: toText(asset?.rf_name ?? asset?.name ?? asset?.product ?? asset?.title, ticker),
    subtype: toText(asset?.rf_subtype ?? asset?.fixed_subtype ?? asset?.bondType ?? asset?.sector ?? asset?.rf_yield_type, 'Renda Fixa'),
    issuer: toText(asset?.fixed_issuer ?? asset?.rf_issuer ?? asset?.issuer ?? asset?.institution ?? asset?.emitter, ''),
    applicationDate: toText(asset?.rf_application_date ?? asset?.rf_aporte_date ?? asset?.fixed_application_date ?? asset?.applicationDate ?? asset?.date, ''),
    maturityDate,
    contractedRate: toText(asset?.rf_contract_rate ?? asset?.fixed_rate ?? asset?.rate, ''),
    indexer: toText(asset?.fixed_indexer ?? asset?.rf_yield_type ?? asset?.indexer, ''),
    appliedValue: toNumber(asset?.rf_applied_value ?? asset?.fixed_initial_value ?? asset?.appliedValue ?? asset?.initialValue ?? asset?.price),
    grossValue: toNumber(asset?.rf_gross_value ?? asset?.fixed_gross_value ?? asset?.marketValue ?? asset?.currentValue ?? asset?.current_price),
    liquidValue: toNumber(asset?.rf_liquid_value ?? asset?.fixed_current_value ?? asset?.liquidValue ?? asset?.current_value ?? asset?.current),
    profitValue: toNumber(asset?.rf_profit_value ?? asset?.fixed_profit_value ?? asset?.profitValue),
    taxValue: toNumber(asset?.rf_ir_iof ?? asset?.ir_iof ?? asset?.iriof ?? asset?.taxValue),
    liquidity: toText(asset?.rf_liquidity ?? asset?.fixed_liquidity ?? asset?.liquidity ?? asset?.dailyLiquidity, ''),
    unavailableValue: toNumber(asset?.rf_unavailable_value ?? asset?.unavailableValue),
    maturityStatus: normalizeMaturityStatus(maturityDate, generatedAt),
    note: toText(asset?.rf_note ?? asset?.note ?? asset?.observation ?? asset?.decision, ''),
  };
}

function roundToCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function buildSummary(items: readonly ReturnType<typeof mapFixedIncomeAsset>[]) {
  return {
    totalApplied: roundToCents(items.reduce((total, item) => total + item.appliedValue, 0)),
    totalGross: roundToCents(items.reduce((total, item) => total + item.grossValue, 0)),
    totalLiquid: roundToCents(items.reduce((total, item) => total + item.liquidValue, 0)),
    totalProfit: roundToCents(items.reduce((total, item) => total + item.profitValue, 0)),
    totalTaxValue: roundToCents(items.reduce((total, item) => total + item.taxValue, 0)),
    totalUnavailableValue: roundToCents(items.reduce((total, item) => total + item.unavailableValue, 0)),
    itemCount: items.length,
  };
}

export function createHostFixedIncomeReadonlySource(
  options: HostFixedIncomeReadonlySourceOptions = {},
): ReadOnlyFixedIncomeSource {
  return {
    getSnapshot() {
      try {
        const generatedAt = toText(options.getGeneratedAt?.(), HOST_FIXED_INCOME_GENERATED_AT);
        const rawAssets = options.getAssets?.();
        const items = Array.isArray(rawAssets)
          ? rawAssets.filter(isFixedIncomeCandidate).map((asset) => mapFixedIncomeAsset(asset, generatedAt)).filter(Boolean)
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
  HOST_FIXED_INCOME_GENERATED_AT,
  HOST_FIXED_INCOME_MATURITY_STATUSES,
  HOST_FIXED_INCOME_NOTICE,
};
