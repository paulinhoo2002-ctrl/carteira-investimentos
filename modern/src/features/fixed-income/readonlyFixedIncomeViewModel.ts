import type { ReadOnlyFixedIncomeItem, ReadOnlyFixedIncomeSnapshot } from './fixedIncomeReadonlyContract.mjs';
import { formatReadonlyCurrency, formatReadonlyPercent } from '../reports/readonlyReportsViewModel.ts';

export type ReadonlyFixedIncomeSortKey = 'liquidValue' | 'profitValue' | 'maturityDate' | 'ticker';

export interface ReadonlyFixedIncomePageFilters {
  readonly query: string;
  readonly subtype: string;
  readonly sortBy: ReadonlyFixedIncomeSortKey;
}

export interface ReadonlyFixedIncomeSubtypeDistribution {
  readonly subtype: string;
  readonly liquidValue: number | null;
  readonly itemCount: number;
  readonly allocationPct: number | null;
}

export interface ReadonlyFixedIncomeViewModel {
  readonly query: string;
  readonly selectedSubtype: string;
  readonly sortBy: ReadonlyFixedIncomeSortKey;
  readonly categories: readonly string[];
  readonly filteredItems: readonly ReadOnlyFixedIncomeItem[];
  readonly topLiquidItems: readonly ReadOnlyFixedIncomeItem[];
  readonly topProfitItems: readonly ReadOnlyFixedIncomeItem[];
  readonly topLossItems: readonly ReadOnlyFixedIncomeItem[];
  readonly topMaturityItems: readonly ReadOnlyFixedIncomeItem[];
  readonly distribution: readonly ReadonlyFixedIncomeSubtypeDistribution[];
  readonly totalApplied: number | null;
  readonly totalGross: number | null;
  readonly totalLiquid: number | null;
  readonly totalProfit: number | null;
  readonly totalIrValue: number | null;
  readonly totalIofValue: number | null;
  readonly totalCombinedTaxValue: number | null;
  readonly totalUnavailableValue: number | null;
  readonly itemCount: number;
  readonly hasResults: boolean;
}

function safeLabel(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : 'Não informado';
}

function displayIdentity(item: ReadOnlyFixedIncomeItem) {
  return item.ticker ?? item.name ?? item.id ?? 'Sem identificação';
}

function compareIdentity(a: ReadOnlyFixedIncomeItem, b: ReadOnlyFixedIncomeItem) {
  return displayIdentity(a).localeCompare(displayIdentity(b), 'pt-BR');
}

function compareMaturityDate(a: ReadOnlyFixedIncomeItem, b: ReadOnlyFixedIncomeItem) {
  const aTime = a.maturityDate ? Date.parse(a.maturityDate) : Number.NaN;
  const bTime = b.maturityDate ? Date.parse(b.maturityDate) : Number.NaN;

  const aValue = Number.isFinite(aTime) ? aTime : Number.POSITIVE_INFINITY;
  const bValue = Number.isFinite(bTime) ? bTime : Number.POSITIVE_INFINITY;

  return aValue - bValue || compareIdentity(a, b);
}

function compareNumericOrMissing(
  a: number | null | undefined,
  b: number | null | undefined,
  direction: 'asc' | 'desc',
) {
  const aValue = typeof a === 'number' && Number.isFinite(a) ? a : direction === 'desc' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  const bValue = typeof b === 'number' && Number.isFinite(b) ? b : direction === 'desc' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;

  return direction === 'desc' ? bValue - aValue : aValue - bValue;
}

function sortItems(items: readonly ReadOnlyFixedIncomeItem[], sortBy: ReadonlyFixedIncomeSortKey) {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'profitValue':
        return compareNumericOrMissing(a.profitValue, b.profitValue, 'desc') || compareIdentity(a, b);
      case 'maturityDate':
        return compareMaturityDate(a, b);
      case 'ticker':
        return compareIdentity(a, b);
      case 'liquidValue':
      default:
        return compareNumericOrMissing(a.liquidValue, b.liquidValue, 'desc') || compareIdentity(a, b);
    }
  });

  return sorted;
}

function uniqueSubtypes(items: readonly ReadOnlyFixedIncomeItem[]) {
  const subtypes = new Set<string>();

  for (const item of items) {
    subtypes.add(safeLabel(item.subtype));
  }

  return [...subtypes].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function createSubtypeDistribution(items: readonly ReadOnlyFixedIncomeItem[]) {
  const totals = new Map<string, { subtype: string; liquidValue: number | null; itemCount: number }>();
  let knownLiquidTotal = 0;

  for (const item of items) {
    if (typeof item.liquidValue === 'number' && Number.isFinite(item.liquidValue)) {
      knownLiquidTotal += item.liquidValue;
    }
  }

  for (const item of items) {
    const subtype = safeLabel(item.subtype);
    const current = totals.get(subtype);
    const nextLiquidValue =
      typeof item.liquidValue === 'number' && Number.isFinite(item.liquidValue)
        ? (current?.liquidValue ?? 0) + item.liquidValue
        : current?.liquidValue ?? null;

    totals.set(subtype, {
      subtype,
      liquidValue: nextLiquidValue,
      itemCount: (current?.itemCount ?? 0) + 1,
    });
  }

  return [...totals.values()]
    .map((entry) => ({
      subtype: entry.subtype,
      liquidValue: entry.liquidValue,
      itemCount: entry.itemCount,
      allocationPct:
        typeof entry.liquidValue === 'number' && Number.isFinite(entry.liquidValue) && knownLiquidTotal > 0
          ? (entry.liquidValue / knownLiquidTotal) * 100
          : null,
    }))
    .sort((a, b) => {
      const aValue = typeof a.liquidValue === 'number' ? a.liquidValue : Number.NEGATIVE_INFINITY;
      const bValue = typeof b.liquidValue === 'number' ? b.liquidValue : Number.NEGATIVE_INFINITY;

      return bValue - aValue || a.subtype.localeCompare(b.subtype, 'pt-BR');
    });
}

function matchesQuery(item: ReadOnlyFixedIncomeItem, query: string) {
  if (!query) {
    return true;
  }

  return [
    item.id,
    item.ticker,
    item.name,
    item.subtype,
    item.issuer,
    item.contractedRate,
    item.indexer,
    item.liquidity,
    item.note,
    item.applicationDate,
    item.maturityDate,
  ]
    .map((value) => safeLabel(value))
    .join(' ')
    .toLowerCase()
    .includes(query);
}

function formatCount(value: number) {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

function formatReadonlyMoney(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? formatReadonlyCurrency(value) : 'Não informado';
}

function formatReadonlyDate(value: string | null | undefined) {
  if (!value) {
    return 'Não informado';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Não informado';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(date);
}

function formatText(value: string | null | undefined) {
  return safeLabel(value);
}

function formatReadonlyPercentOrMissing(value: number | null | undefined, options: { readonly signed?: boolean } = {}) {
  return typeof value === 'number' && Number.isFinite(value)
    ? formatReadonlyPercent(value, options)
    : 'Não informado';
}

export function createReadonlyFixedIncomeViewModel(
  snapshot: ReadOnlyFixedIncomeSnapshot,
  filters: ReadonlyFixedIncomePageFilters,
): ReadonlyFixedIncomeViewModel {
  const query = filters.query.trim().toLowerCase();
  const selectedSubtype = filters.subtype;
  const categories = uniqueSubtypes(snapshot.items);
  const filteredItems = snapshot.items.filter((item) => {
    const matchesSubtype = selectedSubtype === 'all' || safeLabel(item.subtype) === selectedSubtype;

    return matchesSubtype && matchesQuery(item, query);
  });

  const sortedFilteredItems = sortItems(filteredItems, filters.sortBy);
  const topLiquidItems = sortItems(
    snapshot.items.filter((item) => typeof item.liquidValue === 'number' && Number.isFinite(item.liquidValue)),
    'liquidValue',
  ).slice(0, 3);
  const topProfitItems = sortItems(
    snapshot.items.filter((item) => typeof item.profitValue === 'number' && item.profitValue > 0),
    'profitValue',
  ).slice(0, 3);
  const topLossItems = sortItems(
    snapshot.items.filter((item) => typeof item.profitValue === 'number' && item.profitValue < 0),
    'profitValue',
  ).slice(0, 3);
  const topMaturityItems = sortItems(
    snapshot.items.filter((item) => {
      if (!item.maturityDate) {
        return false;
      }

      return Number.isFinite(Date.parse(item.maturityDate));
    }),
    'maturityDate',
  ).slice(0, 3);
  const distribution = createSubtypeDistribution(snapshot.items);

  return {
    query,
    selectedSubtype,
    sortBy: filters.sortBy,
    categories,
    filteredItems: sortedFilteredItems,
    topLiquidItems,
    topProfitItems,
    topLossItems,
    topMaturityItems,
    distribution,
    totalApplied: snapshot.summary.totalApplied,
    totalGross: snapshot.summary.totalGross,
    totalLiquid: snapshot.summary.totalLiquid,
    totalProfit: snapshot.summary.totalProfit,
    totalIrValue: snapshot.summary.totalIrValue,
    totalIofValue: snapshot.summary.totalIofValue,
    totalCombinedTaxValue: snapshot.summary.totalCombinedTaxValue,
    totalUnavailableValue: snapshot.summary.totalUnavailableValue,
    itemCount: snapshot.summary.itemCount,
    hasResults: sortedFilteredItems.length > 0,
  };
}

export {
  compareIdentity,
  compareMaturityDate,
  createSubtypeDistribution,
  displayIdentity,
  formatCount,
  formatReadonlyCurrency,
  formatReadonlyDate,
  formatReadonlyMoney,
  formatReadonlyPercent,
  formatReadonlyPercentOrMissing,
  formatText,
  matchesQuery,
  sortItems,
  uniqueSubtypes,
};
