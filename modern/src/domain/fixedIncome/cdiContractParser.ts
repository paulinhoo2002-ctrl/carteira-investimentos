export type CdiContract =
  | {
      readonly kind: 'CDI_PERCENTAGE';
      readonly cdiPercentage: number;
    }
  | {
      readonly kind: 'CDI_PLUS_SPREAD';
      readonly annualSpreadRate: number;
    };

export type CdiContractParseError =
  | 'INVALID_TYPE'
  | 'EMPTY_VALUE'
  | 'UNSUPPORTED_FORMAT'
  | 'INVALID_NUMBER'
  | 'OUT_OF_RANGE';

export type CdiContractParseResult =
  | Readonly<{
      ok: true;
      contract: CdiContract;
    }>
  | Readonly<{
      ok: false;
      error: CdiContractParseError;
    }>;

const PCT_CDI = /^(\d+(?:[.,]\d+)?)\s*%\s*CDI$/i;
const CDI_PLUS = /^CDI\s*\+\s*(\d+(?:[.,]\d+)?)\s*%\s*(?:aa|a\.a\.)?$/i;

function toDecimal(raw: string): number {
  return Number(raw.replace(',', '.'));
}

export function parseCdiContract(value: unknown): CdiContractParseResult {
  if (typeof value !== 'string') {
    return Object.freeze({ ok: false, error: 'INVALID_TYPE' });
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return Object.freeze({ ok: false, error: 'EMPTY_VALUE' });
  }

  const pctMatch = PCT_CDI.exec(trimmed);
  if (pctMatch) {
    const raw = toDecimal(pctMatch[1]);
    if (!Number.isFinite(raw)) {
      return Object.freeze({ ok: false, error: 'INVALID_NUMBER' });
    }
    const cdiPercentage = raw / 100;
    if (cdiPercentage <= 0 || cdiPercentage > 5) {
      return Object.freeze({ ok: false, error: 'OUT_OF_RANGE' });
    }
    return Object.freeze({ ok: true, contract: Object.freeze({ kind: 'CDI_PERCENTAGE', cdiPercentage }) });
  }

  const plusMatch = CDI_PLUS.exec(trimmed);
  if (plusMatch) {
    const raw = toDecimal(plusMatch[1]);
    if (!Number.isFinite(raw)) {
      return Object.freeze({ ok: false, error: 'INVALID_NUMBER' });
    }
    const annualSpreadRate = raw / 100;
    if (annualSpreadRate < 0 || annualSpreadRate > 1) {
      return Object.freeze({ ok: false, error: 'OUT_OF_RANGE' });
    }
    return Object.freeze({ ok: true, contract: Object.freeze({ kind: 'CDI_PLUS_SPREAD', annualSpreadRate }) });
  }

  return Object.freeze({ ok: false, error: 'UNSUPPORTED_FORMAT' });
}
