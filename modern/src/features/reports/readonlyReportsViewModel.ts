import type { ReadOnlyReportItem, ReadOnlyReportsSnapshot } from './reportsReadonlyContract.mjs';

export type ReadonlyAssetsSortKey =
  | 'currentValueDesc'
  | 'currentValueAsc'
  | 'rentabilityPctDesc'
  | 'rentabilityPctAsc'
  | 'resultDesc'
  | 'resultAsc'
  | 'ticker'
  | 'name';

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

export interface ReadonlyAssetsSummary {
  readonly totalValue: number;
  readonly itemCount: number;
  readonly totalResult: number;
  readonly rentabilityPct: number;
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
  readonly summary: ReadonlyAssetsSummary;
  readonly averageVariationPct: number;
  readonly hasResults: boolean;
}

export function calculateReadonlyAssetInvestedValue(item: ReadOnlyReportItem) {
  return item.quantity * item.averagePrice;
}

export function calculateReadonlyAssetResult(item: ReadOnlyReportItem) {
  return item.currentValue - calculateReadonlyAssetInvestedValue(item);
}

export function calculateReadonlyAssetRentabilityPct(item: ReadOnlyReportItem) {
  const investedValue = calculateReadonlyAssetInvestedValue(item);

  if (investedValue <= 0) {
    return 0;
  }

  return (calculateReadonlyAssetResult(item) / investedValue) * 100;
}

export function createReadonlyAssetsSummary(items: readonly ReadOnlyReportItem[]): ReadonlyAssetsSummary {
  const totalValue = items.reduce((sum, item) => sum + item.currentValue, 0);
  const itemCount = items.length;
  const totalResult = items.reduce((sum, item) => sum + calculateReadonlyAssetResult(item), 0);
  const investedValue = items.reduce((sum, item) => sum + calculateReadonlyAssetInvestedValue(item), 0);

  return {
    totalValue,
    itemCount,
    totalResult,
    rentabilityPct: investedValue > 0 ? (totalResult / investedValue) * 100 : 0,
  };
}

function compareTicker(a: ReadOnlyReportItem, b: ReadOnlyReportItem) {
  return a.ticker.localeCompare(b.ticker, 'pt-BR');
}

function sortItems(items: readonly ReadOnlyReportItem[], sortBy: ReadonlyAssetsSortKey) {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'currentValueAsc':
        return a.currentValue - b.currentValue || compareTicker(a, b);
      case 'rentabilityPctDesc':
        return calculateReadonlyAssetRentabilityPct(b) - calculateReadonlyAssetRentabilityPct(a) || compareTicker(a, b);
      case 'rentabilityPctAsc':
        return calculateReadonlyAssetRentabilityPct(a) - calculateReadonlyAssetRentabilityPct(b) || compareTicker(a, b);
      case 'resultDesc':
        return calculateReadonlyAssetResult(b) - calculateReadonlyAssetResult(a) || compareTicker(a, b);
      case 'resultAsc':
        return calculateReadonlyAssetResult(a) - calculateReadonlyAssetResult(b) || compareTicker(a, b);
      case 'ticker':
        return compareTicker(a, b);
      case 'name':
        return a.name.localeCompare(b.name, 'pt-BR') || compareTicker(a, b);
      case 'currentValueDesc':
      default:
        return b.currentValue - a.currentValue || compareTicker(a, b);
    }
  });

  return sorted;
}

function sortPositiveItems(items: readonly ReadOnlyReportItem[]) {
  return [...items]
    .filter((item) => item.variationPct > 0)
    .sort((a, b) => b.variationPct - a.variationPct || compareTicker(a, b));
}

function sortNegativeItems(items: readonly ReadOnlyReportItem[]) {
  return [...items]
    .filter((item) => item.variationPct < 0)
    .sort((a, b) => a.variationPct - b.variationPct || compareTicker(a, b));
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
  const topGainers = sortPositiveItems(snapshot.items).slice(0, 3);
  const topLosers = sortNegativeItems(snapshot.items).slice(0, 3);
  const topPositions = sortItems(snapshot.items, 'currentValueDesc').slice(0, 3);
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
    summary: createReadonlyAssetsSummary(sortedFilteredItems),
    averageVariationPct: snapshot.summary.averageVariationPct,
    hasResults: sortedFilteredItems.length > 0,
  };
}
