export type IpcaMonthlyIndex = Readonly<{
  date: string;
  indexValue: number;
}>;

export type IpcaIndexDiagnostics = Readonly<{
  coverageStatus: 'FULL' | 'PARTIAL' | 'UNAVAILABLE';
  coveragePercent: number | null;
  expectedStartMonth: string | null;
  expectedEndMonth: string | null;
  expectedMonthCount: number;
  availableMonthCount: number;
  missingMonths: readonly string[];
  duplicateMonths: readonly string[];
  invalidMonths: readonly string[];
  excludedFutureOrIncompleteMonthCount: number;
  freshness: 'FRESH' | 'STALE' | 'UNKNOWN';
  sourceAsOf: string | null;
}>;

const YEAR_MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const CALENDAR_DATE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function shiftMonth(value: string, amount: number): string {
  const [year, month] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function validMonth(value: unknown): value is string {
  return typeof value === 'string' && YEAR_MONTH.test(value);
}

function validCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !CALENDAR_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function unavailable(): IpcaIndexDiagnostics {
  return Object.freeze({
    coverageStatus: 'UNAVAILABLE', coveragePercent: null,
    expectedStartMonth: null, expectedEndMonth: null,
    expectedMonthCount: 0, availableMonthCount: 0,
    missingMonths: Object.freeze([]), duplicateMonths: Object.freeze([]),
    invalidMonths: Object.freeze([]), excludedFutureOrIncompleteMonthCount: 0,
    freshness: 'UNKNOWN', sourceAsOf: null,
  });
}

/** Diagnoses the monthly index series only; it does not value an instrument. */
export function analyzeIpcaIndexDiagnostics(
  rows: readonly IpcaMonthlyIndex[],
  options: Readonly<{ applicationDate: string | null | undefined; asOf: string }>,
): IpcaIndexDiagnostics {
  const applicationMonth = validCalendarDate(options.applicationDate)
    ? options.applicationDate.slice(0, 7)
    : '';
  const asOfMonth = validCalendarDate(options.asOf) ? options.asOf.slice(0, 7) : '';
  if (!validMonth(applicationMonth) || !validMonth(asOfMonth)) return unavailable();

  const expectedStartMonth = shiftMonth(applicationMonth, 1);
  // Monthly IPCA for the as-of month is incomplete/unpublished by definition.
  const expectedEndMonth = shiftMonth(asOfMonth, -1);
  if (expectedStartMonth > expectedEndMonth) return unavailable();

  const expectedMonths: string[] = [];
  for (let month = expectedStartMonth; month <= expectedEndMonth; month = shiftMonth(month, 1)) {
    expectedMonths.push(month);
  }
  const expectedSet = new Set(expectedMonths);
  const counts = new Map<string, number>();
  const invalid = new Set<string>();
  let excludedFutureOrIncompleteMonthCount = 0;

  for (const row of rows) {
    if (!validMonth(row.date) || !Number.isFinite(row.indexValue) || row.indexValue <= -100) {
      invalid.add(row.date);
      continue;
    }
    if (!expectedSet.has(row.date)) {
      if (row.date > expectedEndMonth) excludedFutureOrIncompleteMonthCount += 1;
      continue;
    }
    counts.set(row.date, (counts.get(row.date) ?? 0) + 1);
  }

  const availableMonths = [...counts.keys()].sort();
  const missingMonths = expectedMonths.filter((month) => !counts.has(month));
  const duplicateMonths = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([month]) => month)
    .sort();
  const sourceAsOf = availableMonths.at(-1) ?? null;
  const availableMonthCount = availableMonths.length;
  const coveragePercent = Math.floor((availableMonthCount / expectedMonths.length) * 100);
  const coverageStatus = missingMonths.length === 0 && duplicateMonths.length === 0
    ? 'FULL'
    : 'PARTIAL';
  const asOfMonthNumber = Number(asOfMonth.slice(0, 4)) * 12 + Number(asOfMonth.slice(5, 7));
  const sourceMonthNumber = sourceAsOf
    ? Number(sourceAsOf.slice(0, 4)) * 12 + Number(sourceAsOf.slice(5, 7))
    : null;
  const freshness = sourceMonthNumber === null
    ? 'UNKNOWN'
    : asOfMonthNumber - sourceMonthNumber <= 2 ? 'FRESH' : 'STALE';

  return Object.freeze({
    coverageStatus,
    coveragePercent,
    expectedStartMonth,
    expectedEndMonth,
    expectedMonthCount: expectedMonths.length,
    availableMonthCount,
    missingMonths: Object.freeze(missingMonths),
    duplicateMonths: Object.freeze(duplicateMonths),
    invalidMonths: Object.freeze([...invalid].sort()),
    excludedFutureOrIncompleteMonthCount,
    freshness,
    sourceAsOf,
  });
}
