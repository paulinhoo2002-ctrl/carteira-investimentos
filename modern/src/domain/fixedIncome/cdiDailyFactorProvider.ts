import type { CdiDailyFactor } from './cdiRateEngine.ts';

export type CdiDailyFactorQuery = Readonly<{
  readonly fromDate: string;
  readonly toDate: string;
}>;

export type CdiDailyFactorProviderError =
  | 'INVALID_QUERY'
  | 'EMPTY_RANGE'
  | 'NO_FACTORS_AVAILABLE';

export type CdiDailyFactorProviderResult =
  | Readonly<{
      readonly ok: true;
      readonly factors: readonly CdiDailyFactor[];
    }>
  | Readonly<{
      readonly ok: false;
      readonly error: CdiDailyFactorProviderError;
    }>;

export interface CdiDailyFactorProvider {
  readonly getFactors: (
    query: CdiDailyFactorQuery,
  ) => CdiDailyFactorProviderResult;
}

const STRICT_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isStrictDateString(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  if (!STRICT_DATE.test(value)) {
    return false;
  }
  const y = Number(value.slice(0, 4));
  const m = Number(value.slice(5, 7));
  const d = Number(value.slice(8, 10));
  if (m < 1 || m > 12 || d < 1) {
    return false;
  }
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d <= lastDay;
}

function isValidQuery(query: unknown): query is CdiDailyFactorQuery {
  if (typeof query !== 'object' || query === null || Array.isArray(query)) {
    return false;
  }
  const q = query as Record<string, unknown>;
  return typeof q.fromDate === 'string' && typeof q.toDate === 'string';
}

export function createStaticCdiDailyFactorProvider(
  factors: readonly CdiDailyFactor[],
): CdiDailyFactorProvider {
  const storedFactors: readonly CdiDailyFactor[] = Object.freeze(
    factors.map((f) => Object.freeze({ date: String(f.date), factor: f.factor })),
  );

  const provider: CdiDailyFactorProvider = Object.freeze({
    getFactors(query: CdiDailyFactorQuery): CdiDailyFactorProviderResult {
      if (!isValidQuery(query)) {
        return Object.freeze({ ok: false, error: 'INVALID_QUERY' });
      }

      if (!isStrictDateString(query.fromDate) || !isStrictDateString(query.toDate)) {
        return Object.freeze({ ok: false, error: 'INVALID_QUERY' });
      }

      if (query.fromDate >= query.toDate) {
        return Object.freeze({ ok: false, error: 'EMPTY_RANGE' });
      }

      const filtered: CdiDailyFactor[] = [];
      for (let i = 0; i < storedFactors.length; i++) {
        const f = storedFactors[i];
        const fDate = f.date;
        if (fDate > query.fromDate && fDate <= query.toDate) {
          filtered.push(f);
        }
      }

      if (filtered.length === 0) {
        return Object.freeze({ ok: false, error: 'NO_FACTORS_AVAILABLE' });
      }

      const result: readonly CdiDailyFactor[] = Object.freeze(
        filtered.map((f) => Object.freeze({ date: f.date, factor: f.factor })),
      );

      return Object.freeze({ ok: true, factors: result });
    },
  });

  return provider;
}
