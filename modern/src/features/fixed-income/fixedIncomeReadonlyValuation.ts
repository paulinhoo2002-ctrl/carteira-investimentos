import type { ReadOnlyFixedIncomeItem, ReadOnlyFixedIncomeSnapshot } from './fixedIncomeReadonlyContract.mjs';
import {
  projectFixedRateReadonlyItem,
  isEligibleForProjection,
  isValidValuationSupplement,
} from '../../domain/fixedIncome/fixedRateReadonlyProjection.ts';

export interface FixedIncomeValuationSupplement {
  readonly annualRate: number;
  readonly elapsedBusinessDays: number;
  readonly rfEvents: readonly unknown[];
}

export type FixedIncomeValuationSupplementMap = Record<string, FixedIncomeValuationSupplement>;

import type { ReadOnlyFixedIncomeSummary } from './fixedIncomeReadonlyContract.mjs';

function sumItemField(
  items: readonly ReadOnlyFixedIncomeItem[],
  accessor: (item: ReadOnlyFixedIncomeItem) => unknown,
): number | null {
  let sum = 0;
  let found = false;
  for (let i = 0; i < items.length; i++) {
    const value = accessor(items[i]);
    if (typeof value === 'number' && Number.isFinite(value)) {
      sum += value;
      found = true;
    }
  }
  return found ? sum : null;
}

function enrichItem(
  item: ReadOnlyFixedIncomeItem,
  supplement: FixedIncomeValuationSupplement,
): ReadOnlyFixedIncomeItem {
  try {
    const projection = projectFixedRateReadonlyItem({
      rfEvents: supplement.rfEvents,
      assetId: item.id ?? '',
      annualRate: supplement.annualRate,
      elapsedBusinessDays: supplement.elapsedBusinessDays,
    });

    if (!projection) {
      return { ...item };
    }

    return {
      ...item,
      appliedValue: projection.appliedValue,
      grossValue: projection.grossValue,
      profitValue: projection.profitValue,
    };
  } catch {
    return { ...item };
  }
}

function cloneItem(item: ReadOnlyFixedIncomeItem): ReadOnlyFixedIncomeItem {
  return { ...item };
}

export function enrichFixedIncomeReadonlySnapshot(
  snapshot: ReadOnlyFixedIncomeSnapshot,
  supplementMap: FixedIncomeValuationSupplementMap,
): ReadOnlyFixedIncomeSnapshot {
  const enrichedItems = snapshot.items.map((item) => {
    if (!isEligibleForProjection(item.indexer)) {
      return cloneItem(item);
    }

    const assetId = item.id;
    if (!assetId || typeof assetId !== 'string' || !assetId.trim()) {
      return cloneItem(item);
    }

    const supplement = supplementMap[assetId];
    if (!supplement) {
      return cloneItem(item);
    }

    if (!isValidValuationSupplement(supplement.annualRate, supplement.elapsedBusinessDays, supplement.rfEvents)) {
      return cloneItem(item);
    }

    return enrichItem(item, supplement);
  });

  const enrichedSummary: ReadOnlyFixedIncomeSummary = {
    totalApplied: sumItemField(enrichedItems, (item) => item.appliedValue),
    totalGross: sumItemField(enrichedItems, (item) => item.grossValue),
    totalLiquid: sumItemField(enrichedItems, (item) => item.liquidValue),
    totalProfit: sumItemField(enrichedItems, (item) => item.profitValue),
    totalIrValue: sumItemField(enrichedItems, (item) => item.irValue),
    totalIofValue: sumItemField(enrichedItems, (item) => item.iofValue),
    totalCombinedTaxValue: sumItemField(enrichedItems, (item) => item.combinedTaxValue),
    totalUnavailableValue: sumItemField(enrichedItems, (item) => item.unavailableValue),
    itemCount: enrichedItems.length,
  };

  return {
    version: snapshot.version,
    generatedAt: snapshot.generatedAt,
    notice: snapshot.notice,
    summary: enrichedSummary,
    items: enrichedItems,
  };
}
