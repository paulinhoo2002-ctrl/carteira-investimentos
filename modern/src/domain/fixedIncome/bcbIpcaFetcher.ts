// BCB SGS IPCA Fetcher - uses public BCB API (series 433 = IPCA monthly variation)
// No sign-in required, free public endpoint
import type { IpcaMonthlyIndex } from './ipcaIndexDiagnostics.ts';

export type BcbIpcaFetchResult =
  | Readonly<{
      readonly ok: true;
      readonly indices: readonly IpcaMonthlyIndex[];
      readonly sourceAsOf: string;
      readonly retrievedAt: string;
      readonly official: true;
      readonly free: true;
      readonly seriesId: 433;
    }>
  | Readonly<{
      readonly ok: false;
      readonly error:
        | 'INVALID_REQUEST_DATE'
        | 'PROVIDER_HTTP_ERROR'
        | 'FETCH_FAILED'
        | 'EMPTY_RESPONSE'
        | 'MALFORMED_DATA'
        | 'INVALID_SERIES';
      readonly httpStatus?: number;
    }>;

const BCB_SGS_IPCA_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados';

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leapYear ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function parseYearMonth(value: unknown): { year: number; month: number } | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 1 || month < 1 || month > 12) return null;
  return { year, month };
}

function formatSgsDate(year: number, month: number, day: number): string {
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${String(year).padStart(4, '0')}`;
}

/** Converts inclusive YYYY-MM civil-month bounds to the SGS DD/MM/YYYY contract. */
export function normalizeSgsMonthRange(
  fromYearMonth: unknown,
  toYearMonth: unknown,
): { readonly dataInicial: string; readonly dataFinal: string } | null {
  const from = parseYearMonth(fromYearMonth);
  const to = parseYearMonth(toYearMonth);
  if (!from || !to || String(fromYearMonth) > String(toYearMonth)) return null;
  return {
    dataInicial: formatSgsDate(from.year, from.month, 1),
    dataFinal: formatSgsDate(to.year, to.month, daysInMonth(to.year, to.month)),
  };
}

function parseBcbDate(bcbDate: string): string | null {
  // SGS 433 observations are monthly and the API returns the first day of the
  // reference month as DD/MM/YYYY. Keep MM/YYYY for backward compatibility.
  const fullDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(bcbDate);
  if (fullDate) {
    const day = Number(fullDate[1]);
    const month = Number(fullDate[2]);
    const year = Number(fullDate[3]);
    if (year < 1 || month < 1 || month > 12 || day !== 1) return null;
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
  }

  const legacyMonth = /^(\d{2})\/(\d{4})$/.exec(bcbDate);
  if (!legacyMonth) return null;
  const month = Number(legacyMonth[1]);
  const year = Number(legacyMonth[2]);
  if (year < 1 || month < 1 || month > 12) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchIpcaMonthlyFromBcb(
  fromYearMonth: string,
  toYearMonth: string,
): Promise<BcbIpcaFetchResult> {
  const dateRange = normalizeSgsMonthRange(fromYearMonth, toYearMonth);
  if (!dateRange) return { ok: false, error: 'INVALID_REQUEST_DATE' };

  const params = new URLSearchParams({
    formato: 'json',
    dataInicial: dateRange.dataInicial,
    dataFinal: dateRange.dataFinal,
  });

  const url = `${BCB_SGS_IPCA_URL}?${params.toString()}`;

  try {
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      if (response.status === 404) {
        try {
          const providerError: unknown = await response.json();
          const detail = (providerError as { erro?: { detail?: unknown } } | null)?.erro?.detail;
          if (typeof detail === 'string' && detail.includes('Value(s) not found')) {
            return { ok: false, error: 'EMPTY_RESPONSE', httpStatus: response.status };
          }
        } catch {
          // Keep an unparseable error body classified as an HTTP error below.
        }
      }
      return { ok: false, error: 'PROVIDER_HTTP_ERROR', httpStatus: response.status };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { ok: false, error: 'MALFORMED_DATA' };
    }

    if (!Array.isArray(data)) {
      return { ok: false, error: 'MALFORMED_DATA' };
    }

    if (data.length === 0) {
      return { ok: false, error: 'EMPTY_RESPONSE' };
    }

    const indices: IpcaMonthlyIndex[] = [];
    for (const item of data) {
      if (typeof item !== 'object' || item === null) continue;
      const rawDate = String(item.data ?? '');
      const rawValue = String(item.valor ?? '');

      const date = parseBcbDate(rawDate);
      if (!date) continue;

      const value = Number(rawValue.replace(',', '.'));
      if (!Number.isFinite(value) || value <= -100) continue;

      indices.push({ date, indexValue: value });
    }

    if (indices.length === 0) {
      return { ok: false, error: 'MALFORMED_DATA' };
    }

    // Sort by date ascending
    indices.sort((a, b) => a.date.localeCompare(b.date));

    // Find latest date as sourceAsOf
    const sourceAsOf = indices[indices.length - 1]?.date ?? fromYearMonth;
    const retrievedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    return {
      ok: true,
      indices: Object.freeze(indices.map((idx) => Object.freeze(idx))),
      sourceAsOf,
      retrievedAt,
      official: true,
      free: true,
      seriesId: 433,
    };
  } catch (error) {
    return { ok: false, error: 'FETCH_FAILED' };
  }
}

// Convenience: fetch last N months
export async function fetchIpcaLastNMonths(
  n: number,
): Promise<BcbIpcaFetchResult> {
  const now = new Date();
  const toYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Go back N months + buffer
  const fromDate = new Date(now);
  fromDate.setMonth(fromDate.getMonth() - n - 2);
  const fromYearMonth = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}`;

  return fetchIpcaMonthlyFromBcb(fromYearMonth, toYearMonth);
}
