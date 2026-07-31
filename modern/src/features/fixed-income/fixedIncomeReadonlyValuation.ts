import type { ReadOnlyFixedIncomeItem, ReadOnlyFixedIncomeSnapshot } from './fixedIncomeReadonlyContract.mjs';
import {
  projectFixedRateReadonlyItem,
  isEligibleForProjection,
  isValidValuationSupplement,
} from '../../domain/fixedIncome/fixedRateReadonlyProjection.ts';
import type { CdiContract } from '../../domain/fixedIncome/cdiContractParser.ts';
import { calculateCdiValue } from '../../domain/fixedIncome/cdiRateEngine.ts';
import type { CdiDailyFactor } from '../../domain/fixedIncome/cdiRateEngine.ts';

export interface FixedRateValuationSupplement {
  readonly kind: 'FIXED_RATE';
  readonly annualRate: number;
  readonly elapsedBusinessDays: number;
  readonly rfEvents: readonly unknown[];
}

export interface CdiValuationSupplement {
  readonly kind: 'CDI';
  readonly contract: CdiContract;
  readonly dailyFactors: readonly CdiDailyFactor[];
}

export type FixedIncomeValuationSupplement = FixedRateValuationSupplement | CdiValuationSupplement;

export type FixedIncomeValuationSupplementMap = Readonly<Record<string, Readonly<FixedIncomeValuationSupplement>>>;

function sumItemFieldStrict(
  items: readonly ReadOnlyFixedIncomeItem[],
  accessor: (item: ReadOnlyFixedIncomeItem) => unknown,
): number | null {
  if (items.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    const value = accessor(items[i]);
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return null;
    }
    sum += value;
  }
  return sum;
}

function enrichFixedRateItem(
  item: ReadOnlyFixedIncomeItem,
  supplement: FixedRateValuationSupplement,
): ReadOnlyFixedIncomeItem {
  const projection = projectFixedRateReadonlyItem({
    rfEvents: supplement.rfEvents,
    assetId: item.id ?? '',
    annualRate: supplement.annualRate,
    elapsedBusinessDays: supplement.elapsedBusinessDays,
  });

  if (!projection) {
    return Object.freeze({ ...item });
  }

  return Object.freeze({
    ...item,
    appliedValue: projection.appliedValue,
    grossValue: projection.grossValue,
    profitValue: projection.profitValue,
  });
}

function enrichCdiItem(
  item: ReadOnlyFixedIncomeItem,
  supplement: CdiValuationSupplement,
): ReadOnlyFixedIncomeItem {
  const cdiResult = calculateCdiValue({
    contract: supplement.contract,
    dailyFactors: supplement.dailyFactors,
    principal: item.appliedValue ?? 0,
  });

  if (!cdiResult.ok) {
    return Object.freeze({ ...item });
  }

  return Object.freeze({
    ...item,
    appliedValue: cdiResult.principal,
    grossValue: cdiResult.grossValue,
    profitValue: cdiResult.grossProfit,
  });
}

function enrichItem(
  item: ReadOnlyFixedIncomeItem,
  supplement: FixedIncomeValuationSupplement,
): ReadOnlyFixedIncomeItem {
  if (supplement.kind === 'CDI') {
    return enrichCdiItem(item, supplement);
  }
  return enrichFixedRateItem(item, supplement);
}

function cloneItem(item: ReadOnlyFixedIncomeItem): ReadOnlyFixedIncomeItem {
  return Object.freeze({ ...item });
}

export function enrichFixedIncomeReadonlySnapshot(
  snapshot: ReadOnlyFixedIncomeSnapshot,
  supplementMap: FixedIncomeValuationSupplementMap,
): ReadOnlyFixedIncomeSnapshot {
  const enrichedItems = snapshot.items.map((item) => {
    const assetId = item.id;
    if (!assetId || typeof assetId !== 'string' || !assetId.trim()) {
      return cloneItem(item);
    }

    const supplement = supplementMap[assetId];
    if (!supplement) {
      return cloneItem(item);
    }

    if (supplement.kind === 'CDI') {
      return enrichCdiItem(item, supplement);
    }

    if (!isEligibleForProjection(item.indexer)) {
      return cloneItem(item);
    }

    if (!isValidValuationSupplement(supplement.annualRate, supplement.elapsedBusinessDays, supplement.rfEvents)) {
      return cloneItem(item);
    }

    return enrichFixedRateItem(item, supplement);
  });

  const enrichedSummary = Object.freeze({
    ...snapshot.summary,
    totalApplied: sumItemFieldStrict(enrichedItems, (item) => item.appliedValue),
    totalGross: sumItemFieldStrict(enrichedItems, (item) => item.grossValue),
    totalProfit: sumItemFieldStrict(enrichedItems, (item) => item.profitValue),
    itemCount: enrichedItems.length,
  });

  return Object.freeze({
    ...snapshot,
    summary: enrichedSummary,
    items: Object.freeze(enrichedItems),
  });
}
