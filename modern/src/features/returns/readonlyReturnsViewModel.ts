import type { ReadOnlyReportsSnapshot } from '../reports/reportsReadonlyContract.mjs';
import {
  calculateReadonlyAssetInvestedValue,
  calculateReadonlyAssetResult,
  createCategoryDistribution,
} from '../reports/readonlyReportsViewModel.ts';

export interface ReturnsSummary {
  readonly totalValue: number;
  readonly totalResult: number;
  readonly rentabilityPct: number;
  readonly positiveCount: number;
  readonly negativeCount: number;
  readonly neutralCount: number;
}

export interface CategoryPerformance {
  readonly category: string;
  readonly totalValue: number;
  readonly totalResult: number;
  readonly rentabilityPct: number;
  readonly allocationPct: number;
}

export interface ReturnsViewModel {
  readonly summary: ReturnsSummary;
  readonly categoryPerformance: readonly CategoryPerformance[];
  readonly topGainers: readonly { ticker: string; name: string; variationPct: number }[];
  readonly topLosers: readonly { ticker: string; name: string; variationPct: number }[];
  readonly hasData: boolean;
}

export function createReturnsViewModel(snapshot: ReadOnlyReportsSnapshot): ReturnsViewModel {
  const items = snapshot.items;

  if (items.length === 0) {
    return {
      summary: {
        totalValue: 0,
        totalResult: 0,
        rentabilityPct: 0,
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 0,
      },
      categoryPerformance: [],
      topGainers: [],
      topLosers: [],
      hasData: false,
    };
  }

  const totalValue = items.reduce((sum, item) => sum + item.currentValue, 0);
  const totalResult = items.reduce((sum, item) => sum + calculateReadonlyAssetResult(item), 0);
  const investedValue = items.reduce((sum, item) => sum + calculateReadonlyAssetInvestedValue(item), 0);
  const rentabilityPct = investedValue > 0 ? (totalResult / investedValue) * 100 : 0;

  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;
  for (const item of items) {
    if (item.variationPct > 0) positiveCount += 1;
    else if (item.variationPct < 0) negativeCount += 1;
    else neutralCount += 1;
  }

  const distribution = createCategoryDistribution(items);
  const categoryPerformance = distribution.map((entry) => {
    const categoryItems = items.filter((item) => item.category === entry.category);
    const categoryResult = categoryItems.reduce((sum, item) => sum + calculateReadonlyAssetResult(item), 0);
    const categoryInvested = categoryItems.reduce((sum, item) => sum + calculateReadonlyAssetInvestedValue(item), 0);

    return {
      category: entry.category,
      totalValue: entry.currentValue,
      totalResult: categoryResult,
      rentabilityPct: categoryInvested > 0 ? (categoryResult / categoryInvested) * 100 : 0,
      allocationPct: entry.allocationPct,
    };
  });

  const topGainers = [...items]
    .filter((item) => item.variationPct > 0)
    .sort((a, b) => b.variationPct - a.variationPct)
    .slice(0, 3)
    .map((item) => ({ ticker: item.ticker, name: item.name, variationPct: item.variationPct }));

  const topLosers = [...items]
    .filter((item) => item.variationPct < 0)
    .sort((a, b) => a.variationPct - b.variationPct)
    .slice(0, 3)
    .map((item) => ({ ticker: item.ticker, name: item.name, variationPct: item.variationPct }));

  return {
    summary: {
      totalValue,
      totalResult,
      rentabilityPct,
      positiveCount,
      negativeCount,
      neutralCount,
    },
    categoryPerformance,
    topGainers,
    topLosers,
    hasData: true,
  };
}
