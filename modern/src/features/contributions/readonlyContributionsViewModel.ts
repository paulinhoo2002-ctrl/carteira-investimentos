import type {
  ReadOnlyContributionClassDistributionItem,
  ReadOnlyContributionItem,
  ReadOnlyContributionMonthDistributionItem,
  ReadOnlyContributionsSnapshot,
} from './contributionsReadonlyContract.mjs';

export type ReadonlyContributionsSortKey = 'date' | 'ticker' | 'assetClass' | 'amount' | 'quantity' | 'source';

export interface ReadonlyContributionsPageFilters {
  readonly query: string;
  readonly year: string;
  readonly month: string;
  readonly assetClass: string;
  readonly source: string;
  readonly sortBy: ReadonlyContributionsSortKey;
}

export interface ReadonlyMonthOption {
  readonly key: string;
  readonly label: string;
}

export interface ReadonlyContributionsViewModel {
  readonly query: string;
  readonly selectedYear: string;
  readonly selectedMonth: string;
  readonly selectedAssetClass: string;
  readonly selectedSource: string;
  readonly sortBy: ReadonlyContributionsSortKey;
  readonly classes: readonly string[];
  readonly months: readonly ReadonlyMonthOption[];
  readonly sources: readonly string[];
  readonly filteredItems: readonly ReadOnlyContributionItem[];
  readonly classDistribution: readonly ReadOnlyContributionClassDistributionItem[];
  readonly monthDistribution: readonly ReadOnlyContributionMonthDistributionItem[];
  readonly latestItem: ReadOnlyContributionItem | null;
  readonly itemCount: number;
  readonly hasResults: boolean;
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, 'pt-BR');
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').trim();
}

function normalizeSearchText(value: string | null | undefined) {
  return normalizeText(value).toLowerCase();
}

function toDateMillis(value: string | null | undefined) {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const millis = new Date(value).getTime();
  return Number.isNaN(millis) ? Number.NEGATIVE_INFINITY : millis;
}

function parseMonthKey(value: string | null | undefined) {
  const millis = toDateMillis(value);

  if (!Number.isFinite(millis)) {
    return null;
  }

  const date = new Date(millis);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthKey: string) {
  const [yearText, monthText] = monthKey.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const date = new Date(Date.UTC(year, Number.isFinite(month) ? month - 1 : 0, 1));

  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function formatDateKey(value: string | null | undefined) {
  const millis = toDateMillis(value);

  if (!Number.isFinite(millis)) {
    return '';
  }

  return new Date(millis).toISOString().slice(0, 10);
}

function compareNullableNumber(a: number | null | undefined, b: number | null | undefined) {
  const left = Number.isFinite(a as number) ? Number(a) : null;
  const right = Number.isFinite(b as number) ? Number(b) : null;

  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return right - left;
}

function compareNullableDate(a: string | null | undefined, b: string | null | undefined) {
  const left = toDateMillis(a);
  const right = toDateMillis(b);

  if (!Number.isFinite(left) && !Number.isFinite(right)) {
    return 0;
  }

  if (!Number.isFinite(left)) {
    return 1;
  }

  if (!Number.isFinite(right)) {
    return -1;
  }

  return right - left;
}

function compareContribution(a: ReadOnlyContributionItem, b: ReadOnlyContributionItem, sortBy: ReadonlyContributionsSortKey) {
  switch (sortBy) {
    case 'ticker':
      return compareText(normalizeText(a.ticker), normalizeText(b.ticker)) || compareNullableDate(a.date, b.date);
    case 'assetClass':
      return compareText(normalizeText(a.assetClass), normalizeText(b.assetClass)) || compareNullableDate(a.date, b.date);
    case 'amount':
      return compareNullableNumber(a.amount, b.amount) || compareText(normalizeText(a.ticker), normalizeText(b.ticker));
    case 'quantity':
      return compareNullableNumber(a.quantity, b.quantity) || compareText(normalizeText(a.ticker), normalizeText(b.ticker));
    case 'source':
      return compareText(normalizeText(a.source), normalizeText(b.source)) || compareNullableDate(a.date, b.date);
    case 'date':
    default:
      return compareNullableDate(a.date, b.date) || compareText(normalizeText(a.ticker), normalizeText(b.ticker));
  }
}

function uniqueNonEmpty(values: readonly (string | null | undefined)[]) {
  return [...new Set(values.map((value) => normalizeText(value)).filter(Boolean))].sort(compareText);
}

function buildClassDistribution(items: readonly ReadOnlyContributionItem[]) {
  const distribution = new Map<string, { label: string; itemCount: number; latestContributionDate: string | null }>();

  for (const item of items) {
    const label = normalizeText(item.assetClass) || 'Sem classe';
    const current = distribution.get(label);
    const nextDate = formatDateKey(item.date);

    if (!current) {
      distribution.set(label, {
        label,
        itemCount: 1,
        latestContributionDate: nextDate || null,
      });
      continue;
    }

    const currentDate = current.latestContributionDate;
    const latestContributionDate =
      nextDate && (!currentDate || nextDate > currentDate) ? nextDate : currentDate;

    distribution.set(label, {
      label,
      itemCount: current.itemCount + 1,
      latestContributionDate,
    });
  }

  return [...distribution.values()].sort((a, b) => b.itemCount - a.itemCount || compareText(a.label, b.label));
}

function buildMonthDistribution(items: readonly ReadOnlyContributionItem[]) {
  const distribution = new Map<string, { monthKey: string; label: string; itemCount: number }>();

  for (const item of items) {
    const monthKey = parseMonthKey(item.date);

    if (!monthKey) {
      continue;
    }

    const current = distribution.get(monthKey);

    if (!current) {
      distribution.set(monthKey, {
        monthKey,
        label: formatMonthLabel(monthKey),
        itemCount: 1,
      });
      continue;
    }

    distribution.set(monthKey, {
      monthKey,
      label: current.label,
      itemCount: current.itemCount + 1,
    });
  }

  return [...distribution.values()].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

export function formatReadonlyCurrencyOrMissing(value: number | null | undefined) {
  if (!Number.isFinite(value as number)) {
    return 'Nao informado';
  }

  return new Intl.NumberFormat('pt-BR', {
    currency: 'BRL',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(Number(value));
}

export function formatReadonlyDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Nao informado';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Nao informado';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date);
}

export function formatReadonlyDate(value: string | null | undefined) {
  if (!value) {
    return 'Nao informado';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Nao informado';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(date);
}

export function formatReadonlyQuantity(value: number | null | undefined) {
  if (!Number.isFinite(value as number)) {
    return 'Nao informado';
  }

  return Number(value).toLocaleString('pt-BR', {
    maximumFractionDigits: 4,
  });
}

export function formatReadonlyTextOrMissing(value: string | null | undefined) {
  const normalized = normalizeText(value);
  return normalized || 'Nao informado';
}

export function displayContributionIdentity(item: ReadOnlyContributionItem) {
  return normalizeText(item.ticker) || normalizeText(item.assetName) || normalizeText(item.assetId) || 'Sem identificacao';
}

export function createReadonlyContributionsViewModel(
  snapshot: ReadOnlyContributionsSnapshot,
  filters: ReadonlyContributionsPageFilters,
): ReadonlyContributionsViewModel {
  const query = filters.query.trim().toLowerCase();
  const selectedYear = filters.year;
  const selectedMonth = filters.month;
  const selectedAssetClass = filters.assetClass;
  const selectedSource = filters.source;
  const classes = uniqueNonEmpty(snapshot.items.map((item) => item.assetClass));
  const sources = uniqueNonEmpty(snapshot.items.map((item) => item.source));
  const monthDistribution = buildMonthDistribution(snapshot.items);
  const months = monthDistribution.map((item) => ({
    key: item.monthKey,
    label: item.label,
  }));

  const filteredItems = snapshot.items.filter((item) => {
    const itemYear = item.date ? String(new Date(item.date).getUTCFullYear()) : '';
    const itemMonth = parseMonthKey(item.date) ?? '';

    if (selectedYear !== 'all' && itemYear !== selectedYear) {
      return false;
    }

    if (selectedMonth !== 'all' && itemMonth !== selectedMonth) {
      return false;
    }

    if (selectedAssetClass !== 'all' && normalizeText(item.assetClass) !== selectedAssetClass) {
      return false;
    }

    if (selectedSource !== 'all' && normalizeText(item.source) !== selectedSource) {
      return false;
    }

    if (!query) {
      return true;
    }

    const searchText = [
      item.id,
      item.sourceEventId,
      item.assetId,
      item.sourceEventKind,
      item.date,
      item.ticker,
      item.assetName,
      item.assetClass,
      item.operation,
      item.source,
      item.note,
      item.createdAt,
      item.updatedAt,
      item.amount,
      item.quantity,
      item.unitPrice,
    ]
      .map((part) => normalizeSearchText(part == null ? '' : String(part)))
      .filter(Boolean)
      .join(' ');

    return searchText.includes(query);
  });

  const sortedFilteredItems = [...filteredItems].sort((a, b) => compareContribution(a, b, filters.sortBy));
  const classDistribution = buildClassDistribution(snapshot.items);
  const latestItem = [...snapshot.items].sort((a, b) => compareContribution(a, b, 'date'))[0] ?? null;

  return {
    query,
    selectedYear,
    selectedMonth,
    selectedAssetClass,
    selectedSource,
    sortBy: filters.sortBy,
    classes,
    months,
    sources,
    filteredItems: sortedFilteredItems,
    classDistribution,
    monthDistribution,
    latestItem,
    itemCount: snapshot.summary.itemCount,
    hasResults: sortedFilteredItems.length > 0,
  };
}
