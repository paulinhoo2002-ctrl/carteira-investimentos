export type CdiContract =
  | {
      readonly kind: 'CDI_PERCENTAGE';
      readonly cdiPercentage: number;
    }
  | {
      readonly kind: 'CDI_PLUS_SPREAD';
      readonly annualSpreadRate: number;
    };

export type CdiContractParseResult = CdiContract | null;

const PCT_CDI = /^(\d+(?:[.,]\d+)?)\s*%\s*CDI$/i;
const CDI_PLUS = /^CDI\s*\+\s*(\d+(?:[.,]\d+)?)\s*%\s*(?:aa|a\.a\.)?$/i;

function toDecimal(raw: string): number {
  return Number(raw.replace(',', '.'));
}

export function parseCdiContract(value: unknown): CdiContractParseResult {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const pctMatch = PCT_CDI.exec(trimmed);
  if (pctMatch) {
    const raw = toDecimal(pctMatch[1]);
    if (!Number.isFinite(raw) || raw <= 0 || raw > 500) {
      return null;
    }
    const cdiPercentage = raw / 100;
    if (cdiPercentage <= 0 || cdiPercentage > 5) {
      return null;
    }
    return Object.freeze({ kind: 'CDI_PERCENTAGE', cdiPercentage });
  }

  const plusMatch = CDI_PLUS.exec(trimmed);
  if (plusMatch) {
    const raw = toDecimal(plusMatch[1]);
    if (!Number.isFinite(raw) || raw < 0 || raw > 100) {
      return null;
    }
    const annualSpreadRate = raw / 100;
    if (annualSpreadRate < 0 || annualSpreadRate > 1) {
      return null;
    }
    return Object.freeze({ kind: 'CDI_PLUS_SPREAD', annualSpreadRate });
  }

  return null;
}
