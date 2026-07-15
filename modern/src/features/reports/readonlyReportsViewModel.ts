import type { ReadOnlyReportItem, ReadOnlyReportsSnapshot } from './reportsReadonlyContract.mjs';

export type ReadonlyAssetsSortKey = 'currentValue' | 'variationPct' | 'allocationPct' | 'ticker';

export interface ReadonlyAssetsPageFilters {
  readonly query: string;
  readonly category: string;
  readonly sortBy: ReadonlyAssetsSortKey;
}

export interface ReadonlyAssetCategoryDistribution {
  readonly category: string;
  readonly allocationPct: number;
  readonly currentValue: number;
  readonly itemCount: number;
}

export interface ReadonlyAssetsViewModel {
  readonly query: string;
  readonly selectedCategory: string;
  readonly sortBy: ReadonlyAssetsSortKey;
  readonly categories: readonly string[];
  readonly filteredItems: readonly ReadOnlyReportItem[];
  readonly topGainers: readonly ReadOnlyReportItem[];
  readonly topLosers: readonly ReadOnlyReportItem[];
  readonly topPositions: readonly ReadOnlyReportItem[];
  readonly distribution: readonly ReadonlyAssetCategoryDistribution[];
  readonly totalValue: number;
  readonly itemCount: number;
  readonly averageVariationPct: number;
  readonly hasResults: boolean;
}

function compareTicker(a: ReadOnlyReportItem, b: ReadOnlyReportItem) {
  return a.ticker.localeCompare(b.ticker, 'pt-BR');
}

function sortItems(items: readonly ReadOnlyReportItem[], sortBy: ReadonlyAssetsSortKey) {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'variationPct':
        return b.variationPct - a.variationPct || compareTicker(a, b);
      case 'allocationPct':
        return b.allocationPct - a.allocationPct || compareTicker(a, b);
      case 'ticker':
        return compareTicker(a, b);
      case 'currentValue':
      default:
        return b.currentValue - a.currentValue || compareTicker(a, b);
    }
  });

  return sorted;
}

function uniqueCategories(items: readonly ReadOnlyReportItem[]) {
  return [...new Set(items.map((item) => item.category))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function createCategoryDistribution(items: readonly ReadOnlyReportItem[]) {
  const distribution = new Map<
    string,
    ReadonlyAssetCategoryDistribution
  >();

  for (const item of items) {
    const current = distribution.get(item.category);

    if (current) {
      distribution.set(item.category, {
        category: current.category,
        allocationPct: current.allocationPct + item.allocationPct,
        currentValue: current.currentValue + item.currentValue,
        itemCount: current.itemCount + 1,
      });
      continue;
    }

    distribution.set(item.category, {
      category: item.category,
      allocationPct: item.allocationPct,
      currentValue: item.currentValue,
      itemCount: 1,
    });
  }

  return [...distribution.values()].sort((a, b) => b.allocationPct - a.allocationPct || a.category.localeCompare(b.category, 'pt-BR'));
}

export function formatReadonlyCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    currency: 'BRL',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(value);
}

export function formatReadonlyPercent(value: number, options: { readonly signed?: boolean } = {}) {
  const signed = options.signed ?? true;

  return `${signed && value > 0 ? '+' : ''}${value.toLocaleString('pt-BR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}%`;
}

export function formatReadonlyQuantity(value: number) {
  return value.toLocaleString('pt-BR', {
    maximumFractionDigits: 4,
  });
}

export function formatReadonlyDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value));
}

export function createReadonlyAssetsViewModel(
  snapshot: ReadOnlyReportsSnapshot,
  filters: ReadonlyAssetsPageFilters,
): ReadonlyAssetsViewModel {
  const query = filters.query.trim().toLowerCase();
  const selectedCategory = filters.category;
  const categories = uniqueCategories(snapshot.items);
  const filteredItems = snapshot.items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

    if (!matchesCategory) {
      return false;
    }

    if (!query) {
      return true;
    }

    return item.ticker.toLowerCase().includes(query) || item.name.toLowerCase().includes(query);
  });

  const sortedFilteredItems = sortItems(filteredItems, filters.sortBy);
  const topGainers = sortItems(snapshot.items, 'variationPct').slice(0, 3);
  const topLosers = [...snapshot.items]
    .sort((a, b) => a.variationPct - b.variationPct || compareTicker(a, b))
    .slice(0, 3);
  const topPositions = sortItems(snapshot.items, 'currentValue').slice(0, 3);
  const distribution = createCategoryDistribution(snapshot.items);

  return {
    query,
    selectedCategory,
    sortBy: filters.sortBy,
    categories,
    filteredItems: sortedFilteredItems,
    topGainers,
    topLosers,
    topPositions,
    distribution,
    totalValue: snapshot.summary.totalValue,
    itemCount: snapshot.summary.itemCount,
    averageVariationPct: snapshot.summary.averageVariationPct,
    hasResults: sortedFilteredItems.length > 0,
  };
}
