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
      readonly error: 'FETCH_FAILED' | 'EMPTY_RESPONSE' | 'MALFORMED_DATA' | 'INVALID_SERIES';
    }>;

const BCB_SGS_IPCA_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados';

function parseBcbDate(bcbDate: string): string | null {
  // BCB returns DD/MM/YYYY for daily, MM/YYYY for monthly
  // Series 433 is monthly, so format is MM/YYYY
  const match = /^(\d{2})\/(\d{4})$/.exec(bcbDate);
  if (!match) return null;
  return `${match[2]}-${match[1]}`;
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
  const params = new URLSearchParams({
    formato: 'json',
    dataInicial: `${fromYearMonth.slice(5)}/${fromYearMonth.slice(0, 4)}`, // MM/YYYY
    dataFinal: `${toYearMonth.slice(5)}/${toYearMonth.slice(0, 4)}`,
  });

  const url = `${BCB_SGS_IPCA_URL}?${params.toString()}`;

  try {
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      return { ok: false, error: 'FETCH_FAILED' };
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
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
