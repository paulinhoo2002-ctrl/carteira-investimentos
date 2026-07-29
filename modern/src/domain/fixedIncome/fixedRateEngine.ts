export type FixedRateCalculationInput = Readonly<{
  principal: number;
  annualRate: number;
  elapsedBusinessDays: number;
  businessDaysPerYear?: 252;
}>;

export type FixedRateCalculationSuccess = Readonly<{
  status: 'ok';
  principal: number;
  annualRate: number;
  elapsedBusinessDays: number;
  businessDaysPerYear: 252;
  periodFactor: number;
  grossProfit: number;
  grossValue: number;
}>;

export type FixedRateCalculationErrorCode =
  | 'INVALID_PRINCIPAL'
  | 'INVALID_ANNUAL_RATE'
  | 'INVALID_ELAPSED_BUSINESS_DAYS'
  | 'INVALID_BUSINESS_DAYS_PER_YEAR'
  | 'NON_FINITE_RESULT';

export type FixedRateCalculationError = Readonly<{
  status: 'error';
  code: FixedRateCalculationErrorCode;
}>;

export type FixedRateCalculationResult =
  | FixedRateCalculationSuccess
  | FixedRateCalculationError;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isInteger(value: number): boolean {
  return Number.isInteger(value);
}

export function calculateFixedRateGrossValue(
  input: FixedRateCalculationInput,
): FixedRateCalculationResult {
  const { principal, annualRate, elapsedBusinessDays, businessDaysPerYear = 252 } = input;

  if (!isFiniteNumber(principal) || principal < 0) {
    return { status: 'error', code: 'INVALID_PRINCIPAL' };
  }

  if (!isFiniteNumber(annualRate) || annualRate < 0) {
    return { status: 'error', code: 'INVALID_ANNUAL_RATE' };
  }

  if (!isFiniteNumber(elapsedBusinessDays) || elapsedBusinessDays < 0 || !isInteger(elapsedBusinessDays)) {
    return { status: 'error', code: 'INVALID_ELAPSED_BUSINESS_DAYS' };
  }

  if (!isFiniteNumber(businessDaysPerYear) || businessDaysPerYear !== 252) {
    return { status: 'error', code: 'INVALID_BUSINESS_DAYS_PER_YEAR' };
  }

  const periodFactor = Math.pow(1 + annualRate, elapsedBusinessDays / businessDaysPerYear);
  const grossValue = principal * periodFactor;
  const grossProfit = grossValue - principal;

  if (!isFiniteNumber(periodFactor) || !isFiniteNumber(grossValue) || !isFiniteNumber(grossProfit)) {
    return { status: 'error', code: 'NON_FINITE_RESULT' };
  }

  return Object.freeze<FixedRateCalculationSuccess>({
    status: 'ok',
    principal,
    annualRate,
    elapsedBusinessDays,
    businessDaysPerYear: 252,
    periodFactor,
    grossProfit,
    grossValue,
  });
}
