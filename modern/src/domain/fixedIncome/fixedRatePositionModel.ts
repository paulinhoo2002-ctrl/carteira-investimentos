import {
  type FixedIncomeMovementResult,
  type FixedIncomeMovementErrorCode,
  type FixedIncomeMovementSummary,
  type FixedIncomeMovementSuccess,
} from './movementModel.ts';
import {
  type FixedRateCalculationErrorCode,
  type FixedRateCalculationResult,
  calculateFixedRateGrossValue,
} from './fixedRateEngine.ts';

export type FixedRatePositionInput = Readonly<{
  movementResult: FixedIncomeMovementResult;
  annualRate: number;
  elapsedBusinessDays: number;
}>;

export type FixedRatePositionErrorStage =
  | 'MOVEMENTS'
  | 'VALUATION';

export type FixedRatePositionSuccess = Readonly<{
  status: 'ok';
  principalBalance: number;
  annualRate: number;
  elapsedBusinessDays: number;
  businessDaysPerYear: 252;
  periodFactor: number;
  grossProfit: number;
  grossValue: number;
  movementSummary: FixedIncomeMovementSummary;
}>;

export type FixedRatePositionError = Readonly<{
  status: 'error';
  stage: FixedRatePositionErrorStage;
  code: FixedIncomeMovementErrorCode | FixedRateCalculationErrorCode;
  movementIndex?: number;
  movementId?: string;
}>;

export type FixedRatePositionResult =
  | FixedRatePositionSuccess
  | FixedRatePositionError;

export function calculateFixedRatePosition(
  input: FixedRatePositionInput,
): FixedRatePositionResult {
  const { movementResult, annualRate, elapsedBusinessDays } = input;

  if (movementResult.status === 'error') {
    return Object.freeze<FixedRatePositionError>({
      status: 'error',
      stage: 'MOVEMENTS',
      code: movementResult.code,
      ...(movementResult.movementIndex !== undefined ? { movementIndex: movementResult.movementIndex } : {}),
      ...(movementResult.movementId !== undefined ? { movementId: movementResult.movementId } : {}),
    });
  }

  const principalBalance = movementResult.summary.principalBalance;

  const engineResult: FixedRateCalculationResult = calculateFixedRateGrossValue({
    principal: principalBalance,
    annualRate,
    elapsedBusinessDays,
  });

  if (engineResult.status === 'error') {
    return Object.freeze<FixedRatePositionError>({
      status: 'error',
      stage: 'VALUATION',
      code: engineResult.code,
    });
  }

  return Object.freeze<FixedRatePositionSuccess>({
    status: 'ok',
    principalBalance,
    annualRate: engineResult.annualRate,
    elapsedBusinessDays: engineResult.elapsedBusinessDays,
    businessDaysPerYear: engineResult.businessDaysPerYear,
    periodFactor: engineResult.periodFactor,
    grossProfit: engineResult.grossProfit,
    grossValue: engineResult.grossValue,
    movementSummary: movementResult.summary,
  });
}
