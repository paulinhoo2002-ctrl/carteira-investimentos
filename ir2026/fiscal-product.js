'use strict';
// ============================================================================
// IR2026 — fiscal product layer: monthly assessment (P6), sale universe
// classification (P8/P9), monthly/annual state machines (P20/P21), DARF
// safety (P22), audit trail (P27) and certification package (P28).
//
// Every rate/threshold comes from the RULE_REGISTRY (rules-2026.json) — no
// hardcoded tax law. Results are PROVISIONAL/SIMULATED only while fiscal
// data (opening cost, IRRF, prior losses) remains uncertified: the data gate
// is independent of the rule gate (P22).
// ============================================================================

const { loadRegistry, resolveRule, officialRule, getTaxRate, getExemption, taxDueCalculationAllowed, VERIFIED_STATUSES } = require('./rules');
const { sha256Json } = require('./hash');

// ---------------------------------------------------------------------------
// P6 — monthly exemption/taxability assessment (registry-driven, PROVISIONAL)
// ---------------------------------------------------------------------------
function assessMonth({ registry, bucket, asOf, monthGrossCents, monthNetCents, dataStatus }) {
  const reg = registry || loadRegistry();
  // Data gate (P22): opening cost, IRRF and prior losses must be certified
  // for an authoritative assessment; without them everything stays PROVISIONAL.
  const dataCertified = dataStatus === 'CERTIFIED';
  let exemptionStatus = 'NOT_ASSESSED_DATA_UNCERTIFIED';
  let taxableBaseCents = null;
  let provisionalTaxCents = null;
  let taxDue = 'NOT_CALCULATED';
  const blockers = [];
  let rules = [];
  if (!dataCertified) blockers.push('MISSING_OPENING_COST', 'MISSING_IRRF', 'MISSING_PRIOR_LOSS');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf || '')) blockers.push('RULE_DATE_MISSING');
  if (monthNetCents !== null && (!Number.isSafeInteger(monthNetCents) || monthNetCents < 0)) blockers.push('INVALID_TAXABLE_BASE');
  if (monthGrossCents !== null && (!Number.isSafeInteger(monthGrossCents) || monthGrossCents < 0)) blockers.push('INVALID_GROSS_AMOUNT');

  if (bucket === 'RV_STOCK_SWING') {
    const ex = getExemption(reg, 'RULE_RV_SWING_EXEMPTION_THRESHOLD', asOf);
    const rate = getTaxRate(reg, 'RULE_RV_SWING_RATE', asOf);
    const agg = officialRule(reg, 'RULE_RV_SWING_MONTHLY_AGGREGATION', asOf);
    if (ex && rate && agg && blockers.every((b) => !b.startsWith('INVALID_') && b !== 'RULE_DATE_MISSING')) {
      rules = [ex.RULE, rate.RULE, agg];
      if (monthGrossCents !== null && monthGrossCents <= ex.EXEMPTION_LIMIT_CENTS) {
        exemptionStatus = 'EXEMPT_UNDER_MONTHLY_LIMIT';
        taxableBaseCents = 0;
        provisionalTaxCents = 0;
      } else if (monthGrossCents !== null) {
        exemptionStatus = 'NOT_EXEMPT_GROSS_ABOVE_LIMIT';
        taxableBaseCents = monthNetCents;
        provisionalTaxCents = monthNetCents === null ? null : Math.round(monthNetCents * rate.RATE_BPS / 10000);
      }
    } else {
      blockers.push('SWING_RULES_UNVERIFIED');
    }
  } else if (bucket === 'RV_STOCK_DAY_TRADE') {
    const rate = getTaxRate(reg, 'RULE_DAY_TRADE_RATE', asOf);
    if (rate && blockers.every((b) => !b.startsWith('INVALID_') && b !== 'RULE_DATE_MISSING')) {
      rules = [rate.RULE];
      exemptionStatus = 'NO_EXEMPTION_DAY_TRADE';
      taxableBaseCents = monthNetCents;
      provisionalTaxCents = monthNetCents === null ? null : Math.round(monthNetCents * rate.RATE_BPS / 10000);
    } else {
      blockers.push('DAY_TRADE_RULE_UNVERIFIED');
    }
  } else if (bucket === 'RV_FII') {
    const rate = getTaxRate(reg, 'RULE_FII_ALIENATION_EXEMPT_PF', asOf);
    if (rate && blockers.every((b) => !b.startsWith('INVALID_') && b !== 'RULE_DATE_MISSING')) {
      rules = [rate.RULE];
      exemptionStatus = 'NO_EXEMPTION_FII_20PCT';
      taxableBaseCents = monthNetCents;
      provisionalTaxCents = monthNetCents === null ? null : Math.round(monthNetCents * rate.RATE_BPS / 10000);
    } else {
      blockers.push('FII_RULE_UNVERIFIED');
    }
  } else if (bucket === 'RV_ETF_BDR') {
    blockers.push('MIXED_ETF_BDR_REGIME_UNVERIFIED');
  } else {
    blockers.push('BUCKET_UNKNOWN');
  }
  if (rules.length && provisionalTaxCents !== null && dataCertified && blockers.length === 0) taxDue = provisionalTaxCents;
  else if (rules.length && !dataCertified) taxDue = 'NOT_CALCULATED_DATA_UNCERTIFIED';
  else taxDue = 'NOT_CALCULATED_RULES_UNVERIFIED';
  return {
    BUCKET: bucket,
    EXEMPTION_STATUS: exemptionStatus,
    TAXABLE_BASE_CENTS: taxableBaseCents,
    PROVISIONAL_TAX_CENTS: provisionalTaxCents,
    TAX_DUE: taxDue,
    TAX_AUTHORITY: typeof taxDue === 'number' ? 'PROVISIONAL' : 'NONE',
    RULESET_VERSION: rules.length ? reg.REGISTRY_VERSION : null,
    RULESET_HASH: rules.length ? sha256Json(rules) : null,
    RULES: rules.map((r) => ({ RULE_ID: r.RULE_ID, RULE_VERSION: r.RULE_VERSION, SOURCE_AUTHORITY: r.SOURCE_AUTHORITY, EFFECTIVE_FROM: r.EFFECTIVE_FROM })),
    BLOCKERS: blockers,
  };
}

// ---------------------------------------------------------------------------
// P20 — monthly close state machine
// ---------------------------------------------------------------------------
function monthlyCloseState({ close, dataStatus }) {
  // BLOCKED: every sell unknown; PARTIAL: some missing; PROVISIONAL: all
  // computed but data not certified; CERTIFIED: computed + data certified.
  const events = close.EVENTS || 0;
  const unknown = close.UNKNOWN_BLOCKERS || 0;
  if (events > 0 && unknown === events) return 'BLOCKED';
  if (unknown > 0) return 'PARTIAL';
  if (events === 0) return 'EMPTY';
  return dataStatus === 'CERTIFIED' ? 'CERTIFIED' : 'PROVISIONAL';
}

// ---------------------------------------------------------------------------
// P21 — annual close state machine
// ---------------------------------------------------------------------------
function annualCloseState({ monthlyStates, openingCostStatus }) {
  const states = new Set(monthlyStates);
  if (states.has('BLOCKED')) return 'BLOCKED';
  if (states.has('PARTIAL')) return 'PARTIAL';
  if (openingCostStatus !== 'CERTIFIED') return 'BLOCKED'; // annual needs certified opening
  if (states.has('PROVISIONAL')) return 'PROVISIONAL';
  if (states.size === 1 && states.has('CERTIFIED')) return 'CERTIFIED';
  if (states.has('EMPTY') && states.size === 1) return 'EMPTY';
  return 'PROVISIONAL';
}

// ---------------------------------------------------------------------------
// P22 — DARF safety layer
// ---------------------------------------------------------------------------
function darfSafety({ registry, ruleIds, asOf, dataCertified, monthlyState, assessment }) {
  const reg = registry || loadRegistry();
  const rulesVerified = taxDueCalculationAllowed(reg, ruleIds, asOf);
  const assessmentReady = !!assessment && typeof assessment.TAX_DUE === 'number' &&
    Array.isArray(assessment.RULES) && assessment.RULES.length === ruleIds?.length &&
    assessment.RULES.every((r, i) => r.RULE_ID === ruleIds[i]) &&
    assessment.RULESET_HASH === sha256Json(ruleIds.map((id) => resolveRule(reg, id, asOf))) &&
    assessment.BLOCKERS?.length === 0;
  const canCalculateTax = rulesVerified && dataCertified && assessmentReady && ['PROVISIONAL', 'CERTIFIED'].includes(monthlyState);
  return {
    CAN_CALCULATE_TAX: canCalculateTax,
    CAN_DISPLAY_PROVISIONAL_TAX: rulesVerified, // simulation allowed, labeled PROVISIONAL
    CAN_RECOMMEND_PAYMENT: canCalculateTax && monthlyState === 'CERTIFIED',
    CAN_GENERATE_DARF: canCalculateTax && monthlyState === 'CERTIFIED',
    DEFAULT: 'CONSERVATIVE: no authoritative payment recommendation while data is uncertified.',
  };
}

// ---------------------------------------------------------------------------
// P8/P9 — sale universe classification from the forensic matrix
// ---------------------------------------------------------------------------
function classifySaleUniverse(matrixRows) {
  const out = { TRUE_TAXABLE_SALE: [], LIKELY_TAXABLE_SALE: [], NON_TAXABLE_CUSTODY_CANDIDATE: [], UNKNOWN: [] };
  for (const r of matrixRows || []) {
    const priced = r.GROSS_AMOUNT_CENTS !== null && r.GROSS_AMOUNT_CENTS !== undefined;
    const custody = (r.BLOCKER_CODES || []).includes('LENDING_CUSTODY_UNPRICED');
    if (priced && r.CERTIFICATION_STATUS === 'DERIVED_SIMULATION') out.TRUE_TAXABLE_SALE.push(r.SALE_ID);
    else if (priced) out.LIKELY_TAXABLE_SALE.push(r.SALE_ID);
    else if (custody) out.NON_TAXABLE_CUSTODY_CANDIDATE.push(r.SALE_ID);
    else out.UNKNOWN.push(r.SALE_ID);
  }
  return {
    RAW_SALE_LIKE_EVENTS: (matrixRows || []).length,
    TRUE_TAXABLE_SALES: out.TRUE_TAXABLE_SALE.length,
    LIKELY_TAXABLE_SALES: out.LIKELY_TAXABLE_SALE.length,
    NON_TAXABLE_CUSTODY_MOVEMENTS: out.NON_TAXABLE_CUSTODY_CANDIDATE.length,
    UNKNOWN_SALE_EVENTS: out.UNKNOWN.length,
    DETAIL: out,
    NOTE: 'Custody candidates: same-day equal-qty STOCK_LOAN/TRANSFER pairing with zero cash rows (export semantics). Confirmacao da corretora pendente; proceeds never invented.',
  };
}

// ---------------------------------------------------------------------------
// P27 — audit trail: explain a derived fiscal value end-to-end
// ---------------------------------------------------------------------------
function explainFiscalValue({ matrix, openingRows, registry, saleId }) {
  const row = (matrix.ROWS || []).find((r) => r.SALE_ID === saleId || r.EVENT_ID === saleId);
  if (!row) return null;
  const opening = (openingRows || []).find((o) => o.ASSET === row.ASSET);
  const ruleIds = ['RULE_COST_BASIS_WEIGHTED_AVERAGE', 'RULE_SALE_COST_REMOVAL_AVERAGE'];
  const rules = ruleIds.map((id) => {
    const r = resolveRule(registry, id, row.DATE);
    return { RULE_ID: id, RULE_VERSION: r?.RULE_VERSION ?? null, STATUS: r?.STATUS ?? null,
      SOURCE_AUTHORITY: r?.SOURCE_AUTHORITY ?? null, EFFECTIVE_FROM: r?.EFFECTIVE_FROM ?? null,
      SEMANTICS_VERIFIED: !!officialRule(registry, id, row.DATE) };
  });
  return {
    VALUE_ID: `SALE_REALIZED:${saleId}`,
    ASSET: row.ASSET,
    DATE: row.DATE,
    SOURCES: row.SOURCE_REFS || [],
    SOURCE_PROVENANCE: row.SOURCE_PROVENANCE,
    EVENTS: [row.SALE_ID],
    OPENING_STATUS: opening ? opening.OPENING_STATUS : null,
    OPENING_SOURCE: opening ? opening.SOURCE : null,
    RULES: rules,
    ENGINE_BEHAVIOR: row.CERTIFICATION_STATUS === 'DERIVED_SIMULATION'
      ? 'SIMULATED_DERIVED (non-authoritative)' : 'BLOCKED',
    BLOCKERS: row.BLOCKER_CODES,
    WHEN_COMPUTABLE: rules.every((r) => r.SEMANTICS_VERIFIED) && opening?.COST_STATUS === 'CERTIFIED' && row.CERTIFICATION_STATUS === 'CERTIFIED',
  };
}

// ---------------------------------------------------------------------------
// P28 — reproducibility / certification package (metadata only, no values)
// ---------------------------------------------------------------------------
function certificationPackage({ registry, hashes, testMatrixVersion, engineVersion }) {
  const reg = registry || loadRegistry();
  return {
    ENGINE_VERSION: engineVersion || 'ir2026-local',
    RULE_REGISTRY_VERSION: reg.REGISTRY_VERSION,
    RULE_REGISTRY_SHA256: reg.REGISTRY_SHA256,
    VERIFIED_RULES: reg.RULES.filter((r) => VERIFIED_STATUSES.includes(r.STATUS)).length,
    PENDING_RULES: reg.RULES.filter((r) => !VERIFIED_STATUSES.includes(r.STATUS)).length,
    INPUT_HASHES: hashes || null,
    OPENING_HASH: hashes?.OPENING || null,
    LEDGER_HASH: hashes?.LEDGER || null,
    MONTHLY_HASH: hashes?.MONTHLY_CLOSE || null,
    ANNUAL_HASH: hashes?.ANNUAL_CLOSE || null,
    TEST_MATRIX_VERSION: testMatrixVersion || null,
    NOTE: 'Public certification metadata only: no financial values.',
  };
}

module.exports = {
  assessMonth,
  monthlyCloseState,
  annualCloseState,
  darfSafety,
  classifySaleUniverse,
  explainFiscalValue,
  certificationPackage,
  VERIFIED_STATUSES,
};
