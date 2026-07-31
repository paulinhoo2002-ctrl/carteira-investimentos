import type { CdiContract } from './cdiContractParser';

export type CdiDailyFactor = Readonly<{
  date: string;
  factor: number;
}>;

export type CalculateCdiValueInput = Readonly<{
  principal: number;
  contract: CdiContract;
  dailyFactors: readonly CdiDailyFactor[];
}>;

export type CdiValueSuccess = Readonly<{
  ok: true;
  principal: number;
  accumulatedFactor: number;
  grossValue: number;
  grossProfit: number;
  appliedDays: number;
}>;

export type CdiValueErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_PRINCIPAL'
  | 'INVALID_CONTRACT'
  | 'INVALID_FACTORS'
  | 'INVALID_FACTOR_DATE'
  | 'INVALID_FACTOR_VALUE'
  | 'DUPLICATE_FACTOR_DATE'
  | 'UNSORTED_FACTOR_DATES'
  | 'NON_FINITE_RESULT';

export type CdiValueError = Readonly<{
  ok: false;
  error: CdiValueErrorCode;
  factorIndex?: number;
}>;

export type CdiValueResult = CdiValueSuccess | CdiValueError;

const STRICT_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function createError(error: CdiValueErrorCode, factorIndex?: number): CdiValueError {
  if (factorIndex !== undefined) {
    return Object.freeze({ ok: false, error, factorIndex });
  }
  return Object.freeze({ ok: false, error });
}

function validateDate(dateStr: string): boolean {
  if (!STRICT_DATE.test(dateStr)) {
    return false;
  }
  const y = Number(dateStr.slice(0, 4));
  const m = Number(dateStr.slice(5, 7));
  const d = Number(dateStr.slice(8, 10));
  return m >= 1 && m <= 12 && d >= 1 && d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function validateContract(contract: unknown): boolean {
  if (typeof contract !== 'object' || contract === null || Array.isArray(contract)) {
    return false;
  }
  const c = contract as Record<string, unknown>;
  if (c.kind === 'CDI_PERCENTAGE') {
    return isFiniteNumber(c.cdiPercentage) && (c.cdiPercentage as number) > 0 && (c.cdiPercentage as number) <= 5;
  }
  if (c.kind === 'CDI_PLUS_SPREAD') {
    return isFiniteNumber(c.annualSpreadRate) && (c.annualSpreadRate as number) >= 0 && (c.annualSpreadRate as number) <= 1;
  }
  return false;
}

export function calculateCdiValue(
  input: CalculateCdiValueInput,
): CdiValueResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return createError('INVALID_INPUT');
  }

  const { principal, contract, dailyFactors } = input as Record<string, unknown>;

  if (!isFiniteNumber(principal) || principal < 0) {
    return createError('INVALID_PRINCIPAL');
  }

  if (!validateContract(contract)) {
    return createError('INVALID_CONTRACT');
  }

  if (!Array.isArray(dailyFactors)) {
    return createError('INVALID_FACTORS');
  }

  const factors = dailyFactors as readonly CdiDailyFactor[];
  const n = factors.length;

  for (let i = 0; i < n; i++) {
    const f = factors[i];
    if (typeof f !== 'object' || f === null || Array.isArray(f)) {
      return createError('INVALID_FACTORS', i);
    }
    if (typeof f.date !== 'string') {
      return createError('INVALID_FACTOR_DATE', i);
    }
    if (!validateDate(f.date)) {
      return createError('INVALID_FACTOR_DATE', i);
    }
    if (!isFiniteNumber(f.factor) || (f.factor as number) <= 0) {
      return createError('INVALID_FACTOR_VALUE', i);
    }
  }

  const dates = factors.map((f) => f.date);
  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    if (seen.has(dates[i])) {
      return createError('DUPLICATE_FACTOR_DATE', i);
    }
    seen.add(dates[i]);
  }

  for (let i = 1; i < n; i++) {
    if (dates[i] <= dates[i - 1]) {
      return createError('UNSORTED_FACTOR_DATES', i);
    }
  }

  const c = contract as CdiContract;

  let dailySpreadFactor: number | null = null;
  if (c.kind === 'CDI_PLUS_SPREAD') {
    dailySpreadFactor = Math.pow(1 + c.annualSpreadRate, 1 / 252);
  }

  let accumulatedFactor = 1;
  for (let i = 0; i < n; i++) {
    const factor = (factors[i] as CdiDailyFactor).factor;
    let contractDailyFactor: number;

    if (c.kind === 'CDI_PERCENTAGE') {
      const dailyCdiRate = factor - 1;
      contractDailyFactor = 1 + dailyCdiRate * c.cdiPercentage;
    } else {
      contractDailyFactor = factor * (dailySpreadFactor as number);
    }

    accumulatedFactor *= contractDailyFactor;

    if (!isFiniteNumber(accumulatedFactor)) {
      return createError('NON_FINITE_RESULT', i);
    }
  }

  const grossValue = principal * accumulatedFactor;
  const grossProfit = grossValue - principal;

  if (!isFiniteNumber(grossValue) || !isFiniteNumber(grossProfit)) {
    return createError('NON_FINITE_RESULT');
  }

  return Object.freeze<CdiValueSuccess>({
    ok: true,
    principal,
    accumulatedFactor,
    grossValue,
    grossProfit,
    appliedDays: n,
  });
}
