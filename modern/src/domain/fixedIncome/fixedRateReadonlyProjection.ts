import { calculateLegacyFixedRatePosition } from './legacyFixedRatePositionAdapter.ts';

export type FixedIncomeValuationInput = Readonly<{
  rfEvents: readonly unknown[];
  assetId: string;
  annualRate: number;
  elapsedBusinessDays: number;
}>;

export type FixedRateProjectionResult = Readonly<{
  appliedValue: number;
  grossValue: number;
  profitValue: number;
}>;

export function projectFixedRateReadonlyItem(
  input: FixedIncomeValuationInput,
): FixedRateProjectionResult | null {
  const positionResult = calculateLegacyFixedRatePosition(input);

  if (positionResult.status === 'error') {
    return null;
  }

  return Object.freeze({
    appliedValue: positionResult.principalBalance,
    grossValue: positionResult.grossValue,
    profitValue: positionResult.grossProfit,
  });
}

export function isEligibleForProjection(
  indexer: string | null | undefined,
): boolean {
  return typeof indexer === 'string' && indexer.toUpperCase() === 'PREFIXADO';
}

export function isValidValuationSupplement(
  annualRate: unknown,
  elapsedBusinessDays: unknown,
  rfEvents: unknown,
): boolean {
  if (typeof annualRate !== 'number' || !Number.isFinite(annualRate)) {
    return false;
  }

  if (
    typeof elapsedBusinessDays !== 'number' ||
    !Number.isFinite(elapsedBusinessDays) ||
    !Number.isInteger(elapsedBusinessDays) ||
    elapsedBusinessDays < 0
  ) {
    return false;
  }

  if (!Array.isArray(rfEvents)) {
    return false;
  }

  return true;
}
