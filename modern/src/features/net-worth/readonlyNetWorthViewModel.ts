import type { ReadOnlyReportsSnapshot } from '../reports/reportsReadonlyContract.mjs';
import { createCategoryDistribution } from '../reports/readonlyReportsViewModel.ts';

export interface NetWorthSummary {
  readonly totalValue: number;
  readonly itemCount: number;
}

export interface NetWorthCategory {
  readonly category: string;
  readonly currentValue: number;
  readonly allocationPct: number;
  readonly itemCount: number;
}

export interface NetWorthConcentration {
  readonly maxAllocationPct: number;
  readonly highConcentrationCount: number;
}

export interface NetWorthViewModel {
  readonly summary: NetWorthSummary;
  readonly distribution: readonly NetWorthCategory[];
  readonly topPositions: readonly { ticker: string; name: string; category: string; currentValue: number; allocationPct: number }[];
  readonly concentration: NetWorthConcentration;
  readonly hasData: boolean;
}

export function createNetWorthViewModel(snapshot: ReadOnlyReportsSnapshot): NetWorthViewModel {
  const items = snapshot.items;

  if (items.length === 0) {
    return {
      summary: { totalValue: 0, itemCount: 0 },
      distribution: [],
      topPositions: [],
      concentration: { maxAllocationPct: 0, highConcentrationCount: 0 },
      hasData: false,
    };
  }

  const totalValue = items.reduce((sum, item) => sum + item.currentValue, 0);
  const itemCount = items.length;

  const distribution = createCategoryDistribution(items).map((entry) => ({
    category: entry.category,
    currentValue: entry.currentValue,
    allocationPct: entry.allocationPct,
    itemCount: entry.itemCount,
  }));

  const topPositions = [...items]
    .sort((a, b) => b.currentValue - a.currentValue || a.ticker.localeCompare(b.ticker, 'pt-BR'))
    .slice(0, 5)
    .map((item) => ({
      ticker: item.ticker,
      name: item.name,
      category: item.category,
      currentValue: item.currentValue,
      allocationPct: item.allocationPct,
    }));

  const maxAllocationPct = items.reduce((max, item) => Math.max(max, item.allocationPct), 0);
  const highConcentrationCount = items.filter((item) => item.allocationPct > 10).length;

  return {
    summary: { totalValue, itemCount },
    distribution,
    topPositions,
    concentration: { maxAllocationPct, highConcentrationCount },
    hasData: true,
  };
}
