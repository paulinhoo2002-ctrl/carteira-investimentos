import {
  type FixedIncomeMovement,
  type FixedIncomeMovementError,
  type FixedIncomeMovementResult,
  calculateFixedIncomeMovementSummary,
} from './movementModel.ts';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPrincipalDelta(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function getEventAssetId(raw: Record<string, unknown>): string {
  return String(raw.assetId ?? raw.asset_id ?? '').trim();
}

function getEventDate(raw: Record<string, unknown>): string {
  const val = raw.date ?? raw.paymentDate;
  return typeof val === 'string' ? val : '';
}

function getEventNote(raw: Record<string, unknown>): string {
  return String(raw.note ?? raw.observation ?? '').trim();
}

function getEventId(raw: Record<string, unknown>): string {
  return String(raw.id ?? '').trim();
}

function getPrincipalDelta(raw: Record<string, unknown>): unknown {
  return raw.principalDelta;
}

export function legacyRfEventsToMovements(
  rfEvents: readonly unknown[],
  assetId: string,
): FixedIncomeMovementResult {
  if (!Array.isArray(rfEvents)) {
    return calculateFixedIncomeMovementSummary([]);
  }

  const normalizedAssetId = assetId.trim();
  if (!normalizedAssetId) {
    return Object.freeze<FixedIncomeMovementError>({
      status: 'error',
      code: 'INVALID_ASSET_ID',
    });
  }

  const movements: FixedIncomeMovement[] = [];

  for (let i = 0; i < rfEvents.length; i++) {
    const event = rfEvents[i];
    if (!event || typeof event !== 'object') continue;

    const raw = event as Record<string, unknown>;

    const eventAssetId = getEventAssetId(raw);
    if (eventAssetId !== normalizedAssetId) continue;

    const rawDelta = getPrincipalDelta(raw);

    if (!isPrincipalDelta(rawDelta)) {
      return Object.freeze<FixedIncomeMovementError>({
        status: 'error',
        code: 'INVALID_PRINCIPAL_AMOUNT',
        movementIndex: i,
        movementId: getEventId(raw) || undefined,
      });
    }

    if (rawDelta === 0) continue;

    const eventId = getEventId(raw);
    const eventDate = getEventDate(raw);
    const type = rawDelta > 0 ? 'CONTRIBUTION' : 'REDEMPTION';
    const principalAmount = Math.abs(rawDelta);
    const eventNote = getEventNote(raw);

    const movement: FixedIncomeMovement = Object.freeze({
      id: eventId,
      assetId: normalizedAssetId,
      type,
      occurredOn: eventDate,
      principalAmount,
      ...(eventNote ? { note: eventNote } : {}),
    });

    movements.push(movement);
  }

  return calculateFixedIncomeMovementSummary(movements);
}
