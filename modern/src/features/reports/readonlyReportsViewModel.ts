import type { ReadOnlyReportItem, ReadOnlyReportsSnapshot } from './reportsReadonlyContract.mjs';

export type ReadonlyAssetsSortKey =
  | 'currentValueDesc'
  | 'currentValueAsc'
  | 'rentabilityPctDesc'
  | 'rentabilityPctAsc'
  | 'resultDesc'
  | 'resultAsc'
  | 'ticker'
  | 'name'
  | 'signalPriority';

export type ReadonlyAssetSignalKey =
  | 'all'
  | 'incomplete'
  | 'concentration'
  | 'wait'
  | 'attractive'
  | 'neutral';

export interface ReadonlyAssetSignalCounts {
  readonly incomplete: number;
  readonly concentration: number;
  readonly wait: number;
  readonly attractive: number;
  readonly neutral: number;
}

export const SIGNAL_PRIORITY_ORDER: readonly ReadonlyAssetSignalKey[] = [
  'incomplete',
  'concentration',
  'wait',
  'attractive',
  'neutral',
];

export interface ReadonlyAssetsPageFilters {
  readonly query: string;
  readonly category: string;
  readonly sortBy: ReadonlyAssetsSortKey;
  readonly signal: ReadonlyAssetSignalKey;
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

export interface ReadonlyAssetPrudentSignal {
  readonly label: string;
  readonly reason: string;
  readonly badgeVariant: 'neutral' | 'positive' | 'negative' | 'info' | 'warning';
}

export interface ReadonlyAssetsViewModel {
  readonly query: string;
  readonly selectedCategory: string;
  readonly sortBy: ReadonlyAssetsSortKey;
  readonly selectedSignal: ReadonlyAssetSignalKey;
  readonly categories: readonly string[];
  readonly filteredItems: readonly ReadOnlyReportItem[];
  readonly topGainers: readonly ReadOnlyReportItem[];
  readonly topLosers: readonly ReadOnlyReportItem[];
  readonly topPositions: readonly ReadOnlyReportItem[];
  readonly distribution: readonly ReadonlyAssetCategoryDistribution[];
  readonly signalCounts: ReadonlyAssetSignalCounts;
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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isReadonlyAssetDataComplete(item: ReadOnlyReportItem) {
  return (
    hasText(item.ticker) &&
    hasText(item.name) &&
    hasText(item.category) &&
    isFiniteNumber(item.quantity) &&
    isFiniteNumber(item.averagePrice) &&
    isFiniteNumber(item.currentValue) &&
    isFiniteNumber(item.variationPct) &&
    isFiniteNumber(item.allocationPct)
  );
}

export function createReadonlyAssetPrudentSignal(item: ReadOnlyReportItem): ReadonlyAssetPrudentSignal {
  if (!isReadonlyAssetDataComplete(item)) {
    return {
      badgeVariant: 'warning',
      label: 'Dados incompletos',
      reason: 'Faltam dados essenciais para avaliar o sinal.',
    };
  }

  const participationPct = item.allocationPct;
  const rentabilityPct = calculateReadonlyAssetRentabilityPct(item);

  if (participationPct >= 15) {
    return {
      badgeVariant: 'warning',
      label: 'Concentração alta',
      reason: `Participação de ${formatReadonlyPercent(participationPct, { signed: false })} na carteira.`,
    };
  }

  if (rentabilityPct <= -20 || rentabilityPct >= 25) {
    return {
      badgeVariant: 'warning',
      label: 'Aguardar',
      reason: `Rentabilidade em ${formatReadonlyPercent(rentabilityPct)} sai da faixa prudente.`,
    };
  }

  if (participationPct < 15 && rentabilityPct > -20 && rentabilityPct <= -5) {
    return {
      badgeVariant: 'info',
      label: 'Atrativo para aporte',
      reason: `Participação baixa e retorno em ${formatReadonlyPercent(rentabilityPct)}.`,
    };
  }

  return {
    badgeVariant: 'neutral',
    label: 'Neutro',
    reason: 'Caso completo sem sinal forte.',
  };
}

function getSignalKeyFromLabel(label: string): ReadonlyAssetSignalKey {
  if (label === 'Dados incompletos') return 'incomplete';
  if (label === 'Concentração alta') return 'concentration';
  if (label === 'Aguardar') return 'wait';
  if (label === 'Atrativo para aporte') return 'attractive';
  return 'neutral';
}

function createSignalCounts(items: readonly ReadOnlyReportItem[]): ReadonlyAssetSignalCounts {
  const counts: Record<ReadonlyAssetSignalKey, number> = {
    incomplete: 0,
    concentration: 0,
    wait: 0,
    attractive: 0,
    neutral: 0,
    all: 0,
  };

  for (const item of items) {
    const key = getSignalKeyFromLabel(createReadonlyAssetPrudentSignal(item).label);
    counts[key] += 1;
  }

  return {
    incomplete: counts.incomplete,
    concentration: counts.concentration,
    wait: counts.wait,
    attractive: counts.attractive,
    neutral: counts.neutral,
  };
}

const SIGNAL_PRIORITY_RANK: Record<ReadonlyAssetSignalKey, number> = {
  all: -1,
  incomplete: 0,
  concentration: 1,
  wait: 2,
  attractive: 3,
  neutral: 4,
};

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
      case 'signalPriority': {
        const aKey = getSignalKeyFromLabel(createReadonlyAssetPrudentSignal(a).label);
        const bKey = getSignalKeyFromLabel(createReadonlyAssetPrudentSignal(b).label);
        return SIGNAL_PRIORITY_RANK[aKey] - SIGNAL_PRIORITY_RANK[bKey] || compareTicker(a, b);
      }
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

export function createCategoryDistribution(items: readonly ReadOnlyReportItem[]) {
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
  const selectedSignal = filters.signal;
  const categories = uniqueCategories(snapshot.items);

  const itemsAfterSearchAndCategory = snapshot.items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

    if (!matchesCategory) {
      return false;
    }

    if (!query) {
      return true;
    }

    return item.ticker.toLowerCase().includes(query) || item.name.toLowerCase().includes(query);
  });

  const signalCounts = createSignalCounts(itemsAfterSearchAndCategory);

  const filteredItems =
    selectedSignal === 'all'
      ? itemsAfterSearchAndCategory
      : itemsAfterSearchAndCategory.filter(
          (item) => getSignalKeyFromLabel(createReadonlyAssetPrudentSignal(item).label) === selectedSignal,
        );

  const sortedFilteredItems = sortItems(filteredItems, filters.sortBy);
  const topGainers = sortPositiveItems(snapshot.items).slice(0, 3);
  const topLosers = sortNegativeItems(snapshot.items).slice(0, 3);
  const topPositions = sortItems(snapshot.items, 'currentValueDesc').slice(0, 3);
  const distribution = createCategoryDistribution(snapshot.items);

  return {
    query,
    selectedCategory,
    sortBy: filters.sortBy,
    selectedSignal,
    categories,
    filteredItems: sortedFilteredItems,
    topGainers,
    topLosers,
    topPositions,
    distribution,
    signalCounts,
    summary: createReadonlyAssetsSummary(sortedFilteredItems),
    averageVariationPct: snapshot.summary.averageVariationPct,
    hasResults: sortedFilteredItems.length > 0,
  };
}
