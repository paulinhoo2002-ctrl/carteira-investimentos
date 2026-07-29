export type FixedIncomeMovementType =
  | 'APPLICATION'
  | 'CONTRIBUTION'
  | 'REDEMPTION';

export type FixedIncomeMovement = Readonly<{
  id: string;
  assetId: string;
  type: FixedIncomeMovementType;
  occurredOn: string;
  principalAmount: number;
  note?: string;
}>;

export type FixedIncomeMovementSummary = Readonly<{
  principalBalance: number;
  totalApplications: number;
  totalContributions: number;
  totalRedemptions: number;
  movementCount: number;
}>;

export type FixedIncomeMovementErrorCode =
  | 'INVALID_MOVEMENT_ID'
  | 'INVALID_ASSET_ID'
  | 'INVALID_MOVEMENT_TYPE'
  | 'INVALID_OCCURRED_ON'
  | 'INVALID_PRINCIPAL_AMOUNT'
  | 'DUPLICATE_MOVEMENT_ID'
  | 'MIXED_ASSET_IDS'
  | 'INSUFFICIENT_PRINCIPAL_BALANCE'
  | 'NON_FINITE_RESULT';

export type FixedIncomeMovementSuccess = Readonly<{
  status: 'ok';
  summary: FixedIncomeMovementSummary;
}>;

export type FixedIncomeMovementError = Readonly<{
  status: 'error';
  code: FixedIncomeMovementErrorCode;
  movementIndex?: number;
  movementId?: string;
}>;

export type FixedIncomeMovementResult =
  | FixedIncomeMovementSuccess
  | FixedIncomeMovementError;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStrictDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = parseInt(value.substring(0, 4), 10);
  const month = parseInt(value.substring(5, 7), 10);
  const day = parseInt(value.substring(8, 10), 10);
  if (month < 1 || month > 12) return false;
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const DAYS_IN_MONTH: readonly number[] = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maxDay = month === 2 && isLeap ? 29 : DAYS_IN_MONTH[month];
  return day >= 1 && day <= maxDay;
}

function isPrincipalAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function calculateFixedIncomeMovementSummary(
  movements: readonly FixedIncomeMovement[],
): FixedIncomeMovementResult {
  let expectedAssetId: string | undefined;
  const seenIds = new Set<string>();

  let principalBalance = 0;
  let totalApplications = 0;
  let totalContributions = 0;
  let totalRedemptions = 0;

  for (let i = 0; i < movements.length; i++) {
    const mov = movements[i];
    const movementId = typeof mov?.id === 'string' ? mov.id : undefined;

    if (!isNonEmptyString(mov?.id)) {
      return Object.freeze<FixedIncomeMovementError>({
        status: 'error',
        code: 'INVALID_MOVEMENT_ID',
        movementIndex: i,
        movementId: typeof mov?.id === 'string' ? mov.id : undefined,
      });
    }

    if (seenIds.has(mov.id)) {
      return Object.freeze<FixedIncomeMovementError>({
        status: 'error',
        code: 'DUPLICATE_MOVEMENT_ID',
        movementIndex: i,
        movementId: mov.id,
      });
    }

    if (!isNonEmptyString(mov.assetId)) {
      return Object.freeze<FixedIncomeMovementError>({
        status: 'error',
        code: 'INVALID_ASSET_ID',
        movementIndex: i,
        movementId: mov.id,
      });
    }

    if (expectedAssetId === undefined) {
      expectedAssetId = mov.assetId;
    } else if (mov.assetId !== expectedAssetId) {
      return Object.freeze<FixedIncomeMovementError>({
        status: 'error',
        code: 'MIXED_ASSET_IDS',
        movementIndex: i,
        movementId: mov.id,
      });
    }

    if (mov.type !== 'APPLICATION' && mov.type !== 'CONTRIBUTION' && mov.type !== 'REDEMPTION') {
      return Object.freeze<FixedIncomeMovementError>({
        status: 'error',
        code: 'INVALID_MOVEMENT_TYPE',
        movementIndex: i,
        movementId: mov.id,
      });
    }

    if (typeof mov.occurredOn !== 'string' || !isStrictDate(mov.occurredOn)) {
      return Object.freeze<FixedIncomeMovementError>({
        status: 'error',
        code: 'INVALID_OCCURRED_ON',
        movementIndex: i,
        movementId: mov.id,
      });
    }

    if (!isPrincipalAmount(mov.principalAmount)) {
      return Object.freeze<FixedIncomeMovementError>({
        status: 'error',
        code: 'INVALID_PRINCIPAL_AMOUNT',
        movementIndex: i,
        movementId: mov.id,
      });
    }

    seenIds.add(mov.id);

    if (mov.type === 'REDEMPTION') {
      if (mov.principalAmount > principalBalance) {
        return Object.freeze<FixedIncomeMovementError>({
          status: 'error',
          code: 'INSUFFICIENT_PRINCIPAL_BALANCE',
          movementIndex: i,
          movementId: mov.id,
        });
      }
      principalBalance -= mov.principalAmount;
      totalRedemptions += mov.principalAmount;
    } else if (mov.type === 'APPLICATION') {
      principalBalance += mov.principalAmount;
      totalApplications += mov.principalAmount;
    } else {
      principalBalance += mov.principalAmount;
      totalContributions += mov.principalAmount;
    }

    if (!Number.isFinite(principalBalance) ||
        !Number.isFinite(totalApplications) ||
        !Number.isFinite(totalContributions) ||
        !Number.isFinite(totalRedemptions)) {
      return Object.freeze<FixedIncomeMovementError>({
        status: 'error',
        code: 'NON_FINITE_RESULT',
        movementIndex: i,
        movementId: mov.id,
      });
    }
  }

  return Object.freeze<FixedIncomeMovementSuccess>({
    status: 'ok',
    summary: Object.freeze<FixedIncomeMovementSummary>({
      principalBalance,
      totalApplications,
      totalContributions,
      totalRedemptions,
      movementCount: movements.length,
    }),
  });
}
