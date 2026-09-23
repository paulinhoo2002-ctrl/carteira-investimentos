import type { IpcaMonthlyIndex } from './ipcaIndexDiagnostics.ts';

export type IpcaMonthlyIndexQuery = Readonly<{
  readonly fromYearMonth: string;
  readonly toYearMonth: string;
}>;

export type IpcaMonthlyIndexProviderError =
  | 'INVALID_QUERY'
  | 'EMPTY_RANGE'
  | 'NO_INDICES_AVAILABLE';

export type IpcaMonthlyIndexProviderResult =
  | Readonly<{
      readonly ok: true;
      readonly indices: readonly IpcaMonthlyIndex[];
    }>
  | Readonly<{
      readonly ok: false;
      readonly error: IpcaMonthlyIndexProviderError;
    }>;

export interface IpcaMonthlyIndexProvider {
  readonly getIndices: (
    query: IpcaMonthlyIndexQuery,
  ) => IpcaMonthlyIndexProviderResult;
}

const YEAR_MONTH_PATTERN = /^\d{4}-\d{2}$/;

function isValidYearMonth(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  if (!YEAR_MONTH_PATTERN.test(value)) {
    return false;
  }
  const y = Number(value.slice(0, 4));
  const m = Number(value.slice(5, 7));
  return m >= 1 && m <= 12 && y >= 1980 && y <= 2100;
}

function isValidQuery(query: unknown): query is IpcaMonthlyIndexQuery {
  if (typeof query !== 'object' || query === null || Array.isArray(query)) {
    return false;
  }
  const q = query as Record<string, unknown>;
  return typeof q.fromYearMonth === 'string' && typeof q.toYearMonth === 'string';
}

export function createStaticIpcaMonthlyIndexProvider(
  indices: readonly IpcaMonthlyIndex[],
): IpcaMonthlyIndexProvider {
  const storedIndices: readonly IpcaMonthlyIndex[] = Object.freeze(
    indices.map((idx) => Object.freeze({ date: String(idx.date), indexValue: idx.indexValue })),
  );

  const provider: IpcaMonthlyIndexProvider = Object.freeze({
    getIndices(query: IpcaMonthlyIndexQuery): IpcaMonthlyIndexProviderResult {
      if (!isValidQuery(query)) {
        return Object.freeze({ ok: false, error: 'INVALID_QUERY' });
      }

      if (!isValidYearMonth(query.fromYearMonth) || !isValidYearMonth(query.toYearMonth)) {
        return Object.freeze({ ok: false, error: 'INVALID_QUERY' });
      }

      if (query.fromYearMonth >= query.toYearMonth) {
        return Object.freeze({ ok: false, error: 'EMPTY_RANGE' });
      }

      const filtered: IpcaMonthlyIndex[] = [];
      for (let i = 0; i < storedIndices.length; i++) {
        const idx = storedIndices[i];
        const idxDate = idx.date;
        if (idxDate > query.fromYearMonth && idxDate <= query.toYearMonth) {
          filtered.push(idx);
        }
      }

      if (filtered.length === 0) {
        return Object.freeze({ ok: false, error: 'NO_INDICES_AVAILABLE' });
      }

      const result: readonly IpcaMonthlyIndex[] = Object.freeze(
        filtered.map((idx) => Object.freeze({ date: idx.date, indexValue: idx.indexValue })),
      );

      return Object.freeze({ ok: true, indices: result });
    },
  });

  return provider;
}
