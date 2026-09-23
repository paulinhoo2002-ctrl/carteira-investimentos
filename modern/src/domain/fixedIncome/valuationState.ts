export type ValuationStatus =
  | 'MANUAL_AUTHORITATIVE'
  | 'SHADOW_AVAILABLE'
  | 'SHADOW_PARTIAL'
  | 'SHADOW_STALE'
  | 'UNAVAILABLE'
  | 'NEEDS_REVIEW'
  | 'UNSUPPORTED';

export type FreshnessStatus = 'FRESH' | 'STALE' | 'UNKNOWN';

export type ComparabilityStatus = 'COMPARABLE' | 'NOT_COMPARABLE';

export type ValuationState = {
  // Authoritative (manual) value
  authoritativeValue: number | null;
  authoritativeValueAsOf: string | null;
  authoritativeSource: string | null;
  authoritativeSourceAsOf: string | null;
  authoritativeFreshness: FreshnessStatus;
  authoritativeStatus: ValuationStatus;

  // Shadow (derived) value - for CDI positions
  shadowValue: number | null;
  shadowValueAsOf: string | null;
  shadowSource: string | null;
  shadowSourceAsOf: string | null;
  shadowFreshness: FreshnessStatus;
  shadowStatus: ValuationStatus;
  valuationMethod: string | null;
  shadowCoverage: number | null;
  limitations: readonly string[];

  // Comparison
  differenceAmount: number | null;
  differencePercent: number | null;
  comparisonStatus: ComparabilityStatus;
  comparisonReason: string | null;

  // Overall
  positionId: string;
  positionName: string;
  positionType: string | null;
  lastUpdatedAt: string | null;
};

export function computeFixedIncomeValuationState(asset: ReadonlyFixedIncomeItem | null, cdiRows: readonly CdiRow[]): ValuationState {
  const now = new Date().toISOString().slice(0, 10);

  const emptyState: ValuationState = {
    authoritativeValue: null,
    authoritativeValueAsOf: null,
    authoritativeSource: null,
    authoritativeSourceAsOf: null,
    authoritativeFreshness: 'UNKNOWN',
    authoritativeStatus: 'UNAVAILABLE',
    shadowValue: null,
    shadowValueAsOf: null,
    shadowSource: null,
    shadowSourceAsOf: null,
    shadowFreshness: 'UNKNOWN',
    shadowStatus: 'UNAVAILABLE',
    valuationMethod: null,
    shadowCoverage: null,
    limitations: ['asset is null or undefined'],
    differenceAmount: null,
    differencePercent: null,
    comparisonStatus: 'NOT_COMPARABLE',
    comparisonReason: 'No asset provided',
    positionId: '',
    positionName: '',
    positionType: null,
    lastUpdatedAt: null,
  };

  if (!asset) {
    return emptyState;
  }

  const positionId = asset.id ?? asset.ticker ?? asset.name ?? 'unknown';
  const positionName = asset.name ?? asset.ticker ?? asset.id ?? 'Sem identificação';
  const positionType = asset.subtype;

  // Determine authoritative value from existing fields (liquid > gross > applied fallback)
  const authoritativeValue = asset.liquidValue ?? asset.grossValue ?? asset.appliedValue ?? null;
  const hasAuthoritativeValue = authoritativeValue !== null;

  // Authoritative as-of: use snapshot generatedAt as fallback for manual values
  // In real implementation, would look for explicit valuationAsOf on the position
  const authoritativeValueAsOf = null; // No explicit financial as-of in current data model
  const authoritativeSource = 'manual-rf'; // Legacy manual entry
  const authoritativeSourceAsOf = null;

  // Freshness for manual: UNKNOWN since we don't have explicit financial as-of
  const authoritativeFreshness: FreshnessStatus = 'UNKNOWN';
  const authoritativeStatus: ValuationStatus = hasAuthoritativeValue ? 'MANUAL_AUTHORITATIVE' : 'UNAVAILABLE';

  // CDI Shadow calculation
  const contractedRate = asset.contractedRate ?? '';
  const indexer = asset.indexer ?? '';
  const appliedValue = asset.appliedValue;
  const applicationDate = asset.applicationDate;

  let shadowValue: number | null = null;
  let shadowValueAsOf: string | null = null;
  let shadowSource: string | null = null;
  let shadowSourceAsOf: string | null = null;
  let shadowFreshness: FreshnessStatus = 'UNKNOWN';
  let shadowStatus: ValuationStatus = 'UNAVAILABLE';
  let valuationMethod: string | null = null;
  let shadowCoverage: number | null = null;
  const limitations: string[] = [];

  // Initialize comparison variables early
  let differenceAmount: number | null = null;
  let differencePercent: number | null = null;
  let comparisonStatus: ComparabilityStatus = 'NOT_COMPARABLE';
  let comparisonReason: string | null = 'Insufficient data for comparison';

  // Parse CDI contract
  const cdiContract = parseCdiContractForShadow(contractedRate, indexer);
  const isCdiPosition = cdiContract !== null;

  if (isCdiPosition && appliedValue !== null && appliedValue > 0 && applicationDate) {
    // We have the required inputs for CDI shadow
    const valuationAsOf = now; // Use current date as valuation as-of
    shadowValueAsOf = valuationAsOf;

    // Find latest CDI data date
    const latestCdiDate = cdiRows.length > 0 ? cdiRows[cdiRows.length - 1].date : null;
    shadowSourceAsOf = latestCdiDate;

    if (latestCdiDate && latestCdiDate >= valuationAsOf) {
      // CDI data is fresh enough
      shadowSource = 'BCB_SGS_CDI';
      valuationMethod = `CDI_CONTRACTUAL_${cdiContract.kind}`;
      const factor = computeCdiFactor(cdiRows, applicationDate, valuationAsOf, cdiContract);
      if (factor !== null) {
        shadowValue = Math.round(appliedValue * factor * 100) / 100; // Round to cents
        shadowCoverage = 100;

        // Check freshness: CDI data is FRESH if latest date is within 3 days of today
        const ageDays = Math.round((Date.parse(`${now}T00:00:00Z`) - Date.parse(`${latestCdiDate}T00:00:00Z`)) / 86400000);
        shadowFreshness = ageDays <= 3 ? 'FRESH' : 'STALE';
        shadowStatus = 'SHADOW_AVAILABLE';
      } else {
        limitations.push('CDI data incomplete for the period');
        shadowStatus = 'SHADOW_PARTIAL';
      }
    } else {
      limitations.push(latestCdiDate ? 'CDI source data stale or missing' : 'CDI source data unavailable');
      shadowSource = 'BCB_SGS_CDI';
      shadowStatus = 'SHADOW_STALE';
      shadowFreshness = 'STALE';
    }
  } else if (isCdiPosition) {
    // CDI position but missing required inputs
    if (appliedValue === null || appliedValue <= 0) {
      limitations.push('Missing or invalid principal (applied value)');
    }
    if (!applicationDate) {
      limitations.push('Missing application/start date');
    }
    shadowStatus = 'SHADOW_PARTIAL';
    shadowFreshness = 'UNKNOWN';
    valuationMethod = `CDI_CONTRACTUAL_${cdiContract.kind}`;
    // Skip CDI data freshness check when inputs are missing
    // comparison variables already initialized above
  } else if (/IPCA/i.test(indexer) || /IPCA/i.test(contractedRate)) {
    // IPCA+ position - no automatic valuation
    shadowStatus = 'UNSUPPORTED';
    limitations.push('IPCA+ automatic market valuation not supported');
    valuationMethod = 'UNSUPPORTED_IPCA';
  } else if (/PREFIX|PRE-FIX|PRÉ/i.test(indexer) || /PREFIX|PRE-FIX|PRÉ/i.test(contractedRate)) {
    // Prefixado position
    shadowStatus = 'UNSUPPORTED';
    limitations.push('Prefixado automatic market valuation not supported');
    valuationMethod = 'UNSUPPORTED_PREFIXADO';
  } else {
    // Unknown/unsupported type
    shadowStatus = 'UNSUPPORTED';
    limitations.push('Contract type not recognized for automatic valuation');
    valuationMethod = 'UNKNOWN';
  }

  // Comparison logic
  // Variables already initialized above

  if (hasAuthoritativeValue && shadowValue !== null && authoritativeValueAsOf && shadowValueAsOf) {
    // For comparison, we need comparable as-of dates
    // Since manual authoritative typically doesn't have explicit as-of,
    // comparison is NOT_COMPARABLE by default
    if (authoritativeValueAsOf === shadowValueAsOf) {
      differenceAmount = shadowValue - authoritativeValue;
      if (authoritativeValue !== 0) {
        differencePercent = (differenceAmount / authoritativeValue) * 100;
      }
      comparisonStatus = 'COMPARABLE';
      comparisonReason = 'Values have aligned as-of dates';
    } else {
      comparisonReason = 'Manual and shadow values have different as-of dates';
    }
  } else if (!hasAuthoritativeValue && shadowValue !== null) {
    comparisonReason = 'No authoritative manual value to compare';
  } else if (hasAuthoritativeValue && shadowValue === null) {
    comparisonReason = 'No shadow value available for comparison';
  } else {
    comparisonReason = 'Insufficient data for comparison';
  }

  // If shadow is UNSUPPORTED or UNAVAILABLE, comparison is not applicable
  if (shadowStatus === 'UNSUPPORTED' || shadowStatus === 'UNAVAILABLE') {
    comparisonReason = `Shadow valuation ${shadowStatus.toLowerCase().replace('_', ' ')}`;
  }

  return {
    authoritativeValue,
    authoritativeValueAsOf,
    authoritativeSource,
    authoritativeSourceAsOf,
    authoritativeFreshness,
    authoritativeStatus,
    shadowValue,
    shadowValueAsOf,
    shadowSource,
    shadowSourceAsOf,
    shadowFreshness,
    shadowStatus,
    valuationMethod,
    shadowCoverage,
    limitations,
    differenceAmount,
    differencePercent,
    comparisonStatus,
    comparisonReason,
    positionId,
    positionName,
    positionType,
    lastUpdatedAt: now,
  };
}

function parseCdiContractForShadow(contractedRate: string, indexer: string): { kind: 'CDI_PERCENTAGE'; cdiPercentage: number } | { kind: 'CDI_PLUS_SPREAD'; annualSpreadRate: number } | null {
  const text = (contractedRate ?? '').trim().toUpperCase().replace(',', '.');
  const indexerText = (indexer ?? '').trim().toUpperCase();

  // CDI percentage pattern: "95% CDI", "100% CDI", etc.
  const pctMatch = /^(\d+(?:\.\d+)?)\s*%\s*CDI$/.exec(text);
  if (pctMatch) {
    const pct = Number(pctMatch[1]) / 100;
    if (Number.isFinite(pct) && pct > 0 && pct <= 5) {
      return { kind: 'CDI_PERCENTAGE', cdiPercentage: pct };
    }
  }

  // CDI + spread pattern: "CDI + 0.95% aa", "CDI+1%", etc.
  const plusMatch = /^CDI\s*\+\s*(\d+(?:\.\d+)?)\s*%\s*(?:AA|A\.A\.)?$/.exec(text);
  if (plusMatch) {
    const spread = Number(plusMatch[1]) / 100;
    if (Number.isFinite(spread) && spread >= 0 && spread <= 1) {
      return { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: spread };
    }
  }

  // Also check indexer field
  if (/CDI/i.test(indexerText)) {
    // Try to parse from indexer if contractedRate didn't match
    const pctMatch2 = /^(\d+(?:\.\d+)?)\s*%\s*CDI$/.exec(indexerText);
    if (pctMatch2) {
      const pct = Number(pctMatch2[1]) / 100;
      if (Number.isFinite(pct) && pct > 0 && pct <= 5) {
        return { kind: 'CDI_PERCENTAGE', cdiPercentage: pct };
      }
    }
  }

  return null;
}

function computeCdiFactor(
  cdiRows: readonly CdiRow[],
  applicationDate: string,
  valuationAsOf: string,
  contract: { kind: 'CDI_PERCENTAGE'; cdiPercentage: number } | { kind: 'CDI_PLUS_SPREAD'; annualSpreadRate: number }
): number | null {
  if (!cdiRows.length) return null;

  const from = applicationDate;
  const to = valuationAsOf;
  if (from > to) return null;

  const selected = cdiRows.filter(row => row.date > from && row.date <= to);
  if (!selected.length && from !== to) return null;

  if (contract.kind === 'CDI_PERCENTAGE') {
    const pct = contract.cdiPercentage;
    return selected.reduce((factor, row) => factor * (1 + (row.valuePercentPerDay / 100) * pct), 1);
  } else {
    // CDI + spread: daily spread = annualSpreadRate / 252 (business days)
    const dailySpread = contract.annualSpreadRate / 252;
    return selected.reduce((factor, row) => factor * (1 + (row.valuePercentPerDay / 100) + dailySpread), 1);
  }
}

export type ReadOnlyFixedIncomeItem = {
  readonly id: string | null;
  readonly ticker: string | null;
  readonly name: string | null;
  readonly subtype: string | null;
  readonly issuer: string | null;
  readonly applicationDate: string | null;
  readonly maturityDate: string | null;
  readonly contractedRate: string | null;
  readonly indexer: string | null;
  readonly appliedValue: number | null;
  readonly grossValue: number | null;
  readonly liquidValue: number | null;
  readonly profitValue: number | null;
  readonly irValue: number | null;
  readonly iofValue: number | null;
  readonly combinedTaxValue: number | null;
  readonly liquidity: string | null;
  readonly unavailableValue: number | null;
  readonly maturityStatus: string;
  readonly note: string | null;
};

export type CdiRow = {
  readonly date: string;
  readonly valuePercentPerDay: number;
  readonly factor: number;
};