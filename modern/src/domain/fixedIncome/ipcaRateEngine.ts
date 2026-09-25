import type { IpcAContract } from './ipcaContractParser.ts';

export type IpcaMonthlyIndex = Readonly<{
  date: string;
  indexValue: number;
}>;

export type CalculateIpcaValueInput = Readonly<{
  principal: number;
  contract: IpcAContract;
  monthlyIndices: readonly IpcaMonthlyIndex[];
}>;

export type IpcaValueSuccess = Readonly<{
  ok: true;
  principal: number;
  accumulatedFactor: number;
  grossValue: number;
  grossProfit: number;
  appliedMonths: number;
}>;

export type IpcaValueErrorCode =
  | 'UNSUPPORTED_METHODOLOGY'
  | 'INVALID_INPUT'
  | 'INVALID_PRINCIPAL'
  | 'INVALID_CONTRACT'
  | 'INVALID_INDICES'
  | 'INVALID_INDEX_DATE'
  | 'INVALID_INDEX_VALUE'
  | 'DUPLICATE_INDEX_DATE'
  | 'UNSORTED_INDEX_DATES'
  | 'NON_FINITE_RESULT'
  | 'MISSING_INDEX_DATA';

export type IpcaValueError = Readonly<{
  ok: false;
  error: IpcaValueErrorCode;
  indexIndex?: number;
}>;

export type IpcaValueResult = IpcaValueSuccess | IpcaValueError;

const STRICT_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function createError(error: IpcaValueErrorCode, indexIndex?: number): IpcaValueError {
  if (indexIndex !== undefined) {
    return Object.freeze({ ok: false, error, indexIndex });
  }
  return Object.freeze({ ok: false, error });
}

function validateYearMonth(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const y = Number(dateStr.slice(0, 4));
  const m = Number(dateStr.slice(5, 7));
  return m >= 1 && m <= 12 && y >= 1980 && y <= 2100;
}

function validateContract(contract: unknown): boolean {
  if (typeof contract !== 'object' || contract === null || Array.isArray(contract)) {
    return false;
  }
  const c = contract as Record<string, unknown>;
  if (c.kind === 'IPCA_PLUS_SPREAD') {
    return isFiniteNumber(c.annualSpreadRate) && (c.annualSpreadRate as number) >= 0 && (c.annualSpreadRate as number) <= 1;
  }
  if (c.kind === 'IPCA_PURE') {
    return true;
  }
  return false;
}

export function calculateIpcaValue(
  input: CalculateIpcaValueInput,
): IpcaValueResult {
  // Deliberately disabled: a generic monthly IPCA + annual spread formula is
  // not sufficient to value an instrument (VNA, cash flows and contract
  // conventions are instrument-specific). Keep the legacy API fail-closed.
  void input;
  return createError('UNSUPPORTED_METHODOLOGY');

  /* Legacy generic calculation retained temporarily for source compatibility;
   * unreachable until an instrument-specific methodology is independently
   * specified and reviewed.
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return createError('INVALID_INPUT');
  }

  const { principal, contract, monthlyIndices } = input as Record<string, unknown>;

  if (!isFiniteNumber(principal) || principal < 0) {
    return createError('INVALID_PRINCIPAL');
  }

  if (!validateContract(contract)) {
    return createError('INVALID_CONTRACT');
  }

  if (!Array.isArray(monthlyIndices)) {
    return createError('INVALID_INDICES');
  }

  const indices = monthlyIndices as readonly IpcaMonthlyIndex[];
  const n = indices.length;

  for (let i = 0; i < n; i++) {
    const idx = indices[i];
    if (typeof idx !== 'object' || idx === null || Array.isArray(idx)) {
      return createError('INVALID_INDICES', i);
    }
    if (typeof idx.date !== 'string') {
      return createError('INVALID_INDEX_DATE', i);
    }
    if (!validateYearMonth(idx.date)) {
      return createError('INVALID_INDEX_DATE', i);
    }
    if (!isFiniteNumber(idx.indexValue)) {
      return createError('INVALID_INDEX_VALUE', i);
    }
  }

  const dates = indices.map((idx) => idx.date);
  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    if (seen.has(dates[i])) {
      return createError('DUPLICATE_INDEX_DATE', i);
    }
    seen.add(dates[i]);
  }
  // Note: Not validating sorted order as calculation is commutative and
  // latest date is determined separately for metadata purposes

  const c = contract as IpcAContract;

  let accumulatedFactor = 1;
  for (let i = 0; i < n; i++) {
    const monthlyVariation = (indices[i] as IpcaMonthlyIndex).indexValue / 100;
    let monthlySpread = 0;
    if (c.kind === 'IPCA_PLUS_SPREAD') {
      monthlySpread = c.annualSpreadRate / 12;
    }
    const contractMonthlyFactor = 1 + monthlyVariation + monthlySpread;

    accumulatedFactor *= contractMonthlyFactor;

    if (!isFiniteNumber(accumulatedFactor)) {
      return createError('NON_FINITE_RESULT', i);
    }
  }

  const grossValue = principal * accumulatedFactor;
  const grossProfit = grossValue - principal;

  if (!isFiniteNumber(grossValue) || !isFiniteNumber(grossProfit)) {
    return createError('NON_FINITE_RESULT');
  }

  return Object.freeze<IpcaValueSuccess>({
    ok: true,
    principal,
    accumulatedFactor,
    grossValue,
    grossProfit,
    appliedMonths: n,
  });
  */
}
