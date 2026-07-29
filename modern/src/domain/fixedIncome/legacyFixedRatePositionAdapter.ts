import { legacyRfEventsToMovements } from './legacyRfEventsAdapter.ts';
import {
  type FixedRatePositionResult,
  calculateFixedRatePosition,
} from './fixedRatePositionModel.ts';

export type LegacyFixedRatePositionInput = Readonly<{
  rfEvents: readonly unknown[];
  assetId: string;
  annualRate: number;
  elapsedBusinessDays: number;
}>;

export function calculateLegacyFixedRatePosition(
  input: LegacyFixedRatePositionInput,
): FixedRatePositionResult {
  const movementResult = legacyRfEventsToMovements(input.rfEvents, input.assetId);

  return calculateFixedRatePosition({
    movementResult,
    annualRate: input.annualRate,
    elapsedBusinessDays: input.elapsedBusinessDays,
  });
}
