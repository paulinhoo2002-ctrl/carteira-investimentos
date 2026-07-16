import type { ReadOnlyIncomeItem, ReadOnlyIncomeSnapshot } from './incomeReadonlyContract.mjs';
import { formatReadonlyCurrency, formatReadonlyDateTime } from '../reports/readonlyReportsViewModel.ts';

export type ReadonlyIncomeSortKey = 'paymentDate' | 'netValue' | 'ticker' | 'type';

export interface ReadonlyIncomePageFilters {
  readonly query: string;
  readonly year: string;
  readonly month: string;
  readonly type: string;
  readonly sortBy: ReadonlyIncomeSortKey;
}

export interface ReadonlyIncomeMonthBucket {
  readonly monthKey: string;
  readonly label: string;
  readonly totalValue: number | null;
  readonly paymentCount: number;
}

export interface ReadonlyIncomePayerBucket {
  readonly label: string;
  readonly totalValue: number | null;
  readonly paymentCount: number;
}

export interface ReadonlyIncomeViewModel {
  readonly query: string;
  readonly selectedYear: string;
  readonly selectedMonth: string;
  readonly selectedType: string;
  readonly sortBy: ReadonlyIncomeSortKey;
  readonly years: readonly string[];
  readonly months: readonly { readonly key: string; readonly label: string }[];
  readonly types: readonly string[];
  readonly filteredItems: readonly ReadOnlyIncomeItem[];
  readonly monthlyBuckets: readonly ReadonlyIncomeMonthBucket[];
  readonly topPayments: readonly ReadOnlyIncomeItem[];
  readonly topPayers: readonly ReadonlyIncomePayerBucket[];
  readonly totalReceived: number | null;
  readonly monthTotal: number | null;
  readonly yearTotal: number | null;
  readonly averageMonthly: number | null;
  readonly paymentCount: number;
  readonly hasResults: boolean;
}

function formatText(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : 'Nao informado';
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, 'pt-BR');
}

function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    timeZone: 'UTC',
  })
    .format(date)
    .replace('.', '');
}

function getDisplayedValue(item: ReadOnlyIncomeItem) {
  return item.netValue ?? item.grossValue;
}

function sortItems(items: readonly ReadOnlyIncomeItem[], sortBy: ReadonlyIncomeSortKey) {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'paymentDate': {
        const aDate = parseDate(a.paymentDate)?.getTime() ?? Number.NEGATIVE_INFINITY;
        const bDate = parseDate(b.paymentDate)?.getTime() ?? Number.NEGATIVE_INFINITY;

        return bDate - aDate || compareText(formatText(a.ticker), formatText(b.ticker));
      }
      case 'netValue':
        return (getDisplayedValue(b) ?? Number.NEGATIVE_INFINITY) - (getDisplayedValue(a) ?? Number.NEGATIVE_INFINITY) ||
          compareText(formatText(a.ticker), formatText(b.ticker));
      case 'ticker':
        return compareText(formatText(a.ticker), formatText(b.ticker)) || compareText(formatText(a.name), formatText(b.name));
      case 'type':
      default:
        return compareText(formatText(a.type), formatText(b.type)) || compareText(formatText(a.ticker), formatText(b.ticker));
    }
  });

  return sorted;
}

function uniqueYears(items: readonly ReadOnlyIncomeItem[]) {
  return [...new Set(items.map((item) => parseDate(item.paymentDate)?.getFullYear()).filter((value): value is number => typeof value === 'number'))]
    .sort((a, b) => b - a)
    .map((year) => String(year));
}

function uniqueTypes(items: readonly ReadOnlyIncomeItem[]) {
  return [...new Set(items.map((item) => formatText(item.type)).filter((value) => value !== 'Nao informado'))].sort(compareText);
}

function uniqueMonths(items: readonly ReadOnlyIncomeItem[]) {
  const map = new Map<string, { key: string; label: string }>();

  for (const item of items) {
    const date = parseDate(item.paymentDate);
    if (!date) {
      continue;
    }

    const key = String(date.getMonth() + 1).padStart(2, '0');
    if (!map.has(key)) {
      map.set(key, { key, label: formatMonthLabel(date) });
    }
  }

  return [...map.values()].sort((a, b) => Number(a.key) - Number(b.key));
}

function buildMonthlyBuckets(items: readonly ReadOnlyIncomeItem[]) {
  const buckets = new Map<string, { label: string; totalValue: number | null; paymentCount: number }>();

  for (const item of items) {
    const date = parseDate(item.paymentDate);
    if (!date) {
      continue;
    }

    const monthKey = formatMonthKey(date);
    const current = buckets.get(monthKey);
    const amount = getDisplayedValue(item);

    if (current) {
      buckets.set(monthKey, {
        label: current.label,
        totalValue:
          typeof current.totalValue === 'number' && typeof amount === 'number'
            ? current.totalValue + amount
            : current.totalValue ?? amount ?? null,
        paymentCount: current.paymentCount + 1,
      });
      continue;
    }

    buckets.set(monthKey, {
      label: formatMonthLabel(date),
      totalValue: amount ?? null,
      paymentCount: 1,
    });
  }

  return [...buckets.entries()]
    .map(([monthKey, bucket]) => ({
      monthKey,
      label: bucket.label,
      totalValue: bucket.totalValue,
      paymentCount: bucket.paymentCount,
    }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

function buildTopPayers(items: readonly ReadOnlyIncomeItem[]) {
  const totals = new Map<string, { label: string; totalValue: number | null; paymentCount: number }>();

  for (const item of items) {
    const label = formatText(item.name) !== 'Nao informado' ? formatText(item.name) : formatText(item.ticker);
    const key = `${label}::${formatText(item.type)}`;
    const current = totals.get(key);
    const amount = getDisplayedValue(item);

    if (current) {
      totals.set(key, {
        label,
        totalValue:
          typeof current.totalValue === 'number' && typeof amount === 'number'
            ? current.totalValue + amount
            : current.totalValue ?? amount ?? null,
        paymentCount: current.paymentCount + 1,
      });
      continue;
    }

    totals.set(key, {
      label,
      totalValue: amount ?? null,
      paymentCount: 1,
    });
  }

  return [...totals.values()].sort((a, b) => {
    const aValue = typeof a.totalValue === 'number' ? a.totalValue : Number.NEGATIVE_INFINITY;
    const bValue = typeof b.totalValue === 'number' ? b.totalValue : Number.NEGATIVE_INFINITY;

    return bValue - aValue || compareText(a.label, b.label);
  });
}

function formatReadonlyDate(value: string | null | undefined) {
  if (!value) {
    return 'Nao informado';
  }

  const date = parseDate(value);
  if (!date) {
    return 'Nao informado';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(date);
}

export function formatReadonlyMoneyOrMissing(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? formatReadonlyCurrency(value) : 'Nao informado';
}

export function createReadonlyIncomeViewModel(
  snapshot: ReadOnlyIncomeSnapshot,
  filters: ReadonlyIncomePageFilters,
): ReadonlyIncomeViewModel {
  const query = filters.query.trim().toLowerCase();
  const selectedYear = filters.year;
  const selectedMonth = filters.month;
  const selectedType = filters.type;

  const years = uniqueYears(snapshot.items);
  const months = uniqueMonths(snapshot.items);
  const types = uniqueTypes(snapshot.items);

  const filteredItems = snapshot.items.filter((item) => {
    const paymentDate = parseDate(item.paymentDate);
    const matchesYear = selectedYear === 'all' || String(paymentDate?.getFullYear() ?? '') === selectedYear;
    const matchesMonth = selectedMonth === 'all' || String(paymentDate?.getMonth() + 1).padStart(2, '0') === selectedMonth;
    const matchesType = selectedType === 'all' || formatText(item.type) === selectedType;

    if (!matchesYear || !matchesMonth || !matchesType) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [
      item.id,
      item.ticker,
      item.name,
      item.type,
      item.paymentDate,
      item.competenceDate,
      item.note,
      item.source,
      item.sourceEventId,
    ]
      .map((value) => formatText(value))
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  const sortedFilteredItems = sortItems(filteredItems, filters.sortBy);
  const monthlyBuckets = buildMonthlyBuckets(filteredItems);
  const topPayments = sortItems(
    filteredItems.filter((item) => typeof getDisplayedValue(item) === 'number'),
    'netValue',
  ).slice(0, 3);
  const topPayers = buildTopPayers(filteredItems).slice(0, 3);

  return {
    query,
    selectedYear,
    selectedMonth,
    selectedType,
    sortBy: filters.sortBy,
    years,
    months,
    types,
    filteredItems: sortedFilteredItems,
    monthlyBuckets,
    topPayments,
    topPayers,
    totalReceived: snapshot.summary.totalReceived,
    monthTotal: snapshot.summary.monthTotal,
    yearTotal: snapshot.summary.yearTotal,
    averageMonthly: snapshot.summary.averageMonthly,
    paymentCount: snapshot.summary.paymentCount,
    hasResults: sortedFilteredItems.length > 0,
  };
}

export { formatReadonlyCurrency, formatReadonlyDateTime };
