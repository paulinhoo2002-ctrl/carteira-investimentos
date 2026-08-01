import type { ReadOnlyReportsSnapshot } from '../reports/reportsReadonlyContract.mjs';
import { createCategoryDistribution } from '../reports/readonlyReportsViewModel.ts';

export interface RebalanceCategory {
  readonly category: string;
  readonly currentAllocationPct: number;
  readonly currentValue: number;
  readonly itemCount: number;
}

export interface RebalanceViewModel {
  readonly distribution: readonly RebalanceCategory[];
  readonly totalValue: number;
  readonly classCount: number;
  readonly hasTargetAllocation: false;
  readonly hasData: boolean;
}

export function createRebalanceViewModel(snapshot: ReadOnlyReportsSnapshot): RebalanceViewModel {
  const items = snapshot.items;

  if (items.length === 0) {
    return {
      distribution: [],
      totalValue: 0,
      classCount: 0,
      hasTargetAllocation: false,
      hasData: false,
    };
  }

  const totalValue = items.reduce((sum, item) => sum + item.currentValue, 0);
  const distribution = createCategoryDistribution(items).map((entry) => ({
    category: entry.category,
    currentAllocationPct: entry.allocationPct,
    currentValue: entry.currentValue,
    itemCount: entry.itemCount,
  }));

  return {
    distribution,
    totalValue,
    classCount: distribution.length,
    hasTargetAllocation: false,
    hasData: true,
  };
}
