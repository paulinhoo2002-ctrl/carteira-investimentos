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
  readonly liquidValue: number;
  readonly itemCount: number;
  readonly allocationPct: number;
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
  readonly totalApplied: number;
  readonly totalGross: number;
  readonly totalLiquid: number;
  readonly totalProfit: number;
  readonly totalTaxValue: number;
  readonly itemCount: number;
  readonly hasResults: boolean;
}

function compareTicker(a: ReadOnlyFixedIncomeItem, b: ReadOnlyFixedIncomeItem) {
  return a.ticker.localeCompare(b.ticker, 'pt-BR');
}

function compareMaturityDate(a: ReadOnlyFixedIncomeItem, b: ReadOnlyFixedIncomeItem) {
  const aTime = Date.parse(a.maturityDate);
  const bTime = Date.parse(b.maturityDate);

  const aValue = Number.isFinite(aTime) ? aTime : Number.POSITIVE_INFINITY;
  const bValue = Number.isFinite(bTime) ? bTime : Number.POSITIVE_INFINITY;

  return aValue - bValue || compareTicker(a, b);
}

function sortItems(items: readonly ReadOnlyFixedIncomeItem[], sortBy: ReadonlyFixedIncomeSortKey) {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'profitValue':
        return b.profitValue - a.profitValue || compareTicker(a, b);
      case 'maturityDate':
        return compareMaturityDate(a, b);
      case 'ticker':
        return compareTicker(a, b);
      case 'liquidValue':
      default:
        return b.liquidValue - a.liquidValue || compareTicker(a, b);
    }
  });

  return sorted;
}

function uniqueSubtypes(items: readonly ReadOnlyFixedIncomeItem[]) {
  return [...new Set(items.map((item) => item.subtype).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function createSubtypeDistribution(items: readonly ReadOnlyFixedIncomeItem[]) {
  const totals = new Map<string, ReadonlyFixedIncomeSubtypeDistribution>();
  const totalLiquid = items.reduce((sum, item) => sum + item.liquidValue, 0);

  for (const item of items) {
    const current = totals.get(item.subtype);

    if (current) {
      totals.set(item.subtype, {
        subtype: current.subtype,
        liquidValue: current.liquidValue + item.liquidValue,
        itemCount: current.itemCount + 1,
        allocationPct: totalLiquid > 0 ? ((current.liquidValue + item.liquidValue) / totalLiquid) * 100 : 0,
      });
      continue;
    }

    totals.set(item.subtype, {
      subtype: item.subtype,
      liquidValue: item.liquidValue,
      itemCount: 1,
      allocationPct: totalLiquid > 0 ? (item.liquidValue / totalLiquid) * 100 : 0,
    });
  }

  return [...totals.values()].sort((a, b) => b.liquidValue - a.liquidValue || a.subtype.localeCompare(b.subtype, 'pt-BR'));
}

function matchesQuery(item: ReadOnlyFixedIncomeItem, query: string) {
  if (!query) {
    return true;
  }

  return [
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
    .join(' ')
    .toLowerCase()
    .includes(query);
}

function formatCount(value: number) {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

export function formatReadonlyDate(value: string) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(date);
}

function formatText(value: string) {
  return value.trim() || '—';
}

export function createReadonlyFixedIncomeViewModel(
  snapshot: ReadOnlyFixedIncomeSnapshot,
  filters: ReadonlyFixedIncomePageFilters,
): ReadonlyFixedIncomeViewModel {
  const query = filters.query.trim().toLowerCase();
  const selectedSubtype = filters.subtype;
  const categories = uniqueSubtypes(snapshot.items);
  const filteredItems = snapshot.items.filter((item) => {
    const matchesSubtype = selectedSubtype === 'all' || item.subtype === selectedSubtype;

    return matchesSubtype && matchesQuery(item, query);
  });

  const sortedFilteredItems = sortItems(filteredItems, filters.sortBy);
  const topLiquidItems = sortItems(snapshot.items, 'liquidValue').slice(0, 3);
  const topProfitItems = [...snapshot.items.filter((item) => item.profitValue > 0)]
    .sort((a, b) => b.profitValue - a.profitValue || compareTicker(a, b))
    .slice(0, 3);
  const topLossItems = [...snapshot.items.filter((item) => item.profitValue < 0)]
    .sort((a, b) => a.profitValue - b.profitValue || compareTicker(a, b))
    .slice(0, 3);
  const topMaturityItems = sortItems(snapshot.items, 'maturityDate').slice(0, 3);
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
    totalTaxValue: snapshot.summary.totalTaxValue,
    itemCount: snapshot.summary.itemCount,
    hasResults: sortedFilteredItems.length > 0,
  };
}

export {
  compareMaturityDate,
  compareTicker,
  createSubtypeDistribution,
  formatCount,
  formatReadonlyCurrency,
  formatReadonlyPercent,
  formatText,
  matchesQuery,
  sortItems,
  uniqueSubtypes,
};
