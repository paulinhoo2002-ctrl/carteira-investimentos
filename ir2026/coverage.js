'use strict';
// ============================================================================
// IR2026 — P17: fiscal coverage metrics. One percentage is never enough:
// asset-count coverage and value/cost coverage are reported side by side,
// plus sales count/value, IRRF, fees, loss-carry and monthly-close coverage.
// All metrics derive from real artifacts — no invented denominators.
// ============================================================================

function percent(n, d) {
  if (d === null || d === undefined || d === 0) return null;
  return Number(((n / d) * 100).toFixed(2));
}

/**
 * opening: v1 opening artifact (rows + coverage).
 * matrix: sales forensic matrix (rows).
 * irrf: buildIrrfLedger output (optional).
 * feesTrades: fees-engine trades output (optional).
 * monthlyCloses: ledger monthly closes (optional).
 */
function buildFiscalCoverage({ opening, matrix, irrf, feesTrades, monthlyCloses }) {
  const out = {};
  if (opening) {
    const c = opening.OPENING_COVERAGE || opening;
    const held = c.OPENING_HELD_CANDIDATES ?? null;
    out.OPENING_ASSET_COVERAGE = {
      HELD_CANDIDATES: held,
      CERTIFIED: c.OPENING_CERTIFIED ?? 0,
      DERIVED: c.OPENING_DERIVED ?? 0,
      PARTIAL: c.OPENING_PARTIAL ?? 0,
      UNKNOWN: c.OPENING_UNKNOWN ?? 0,
      COUNT_PERCENT: held ? percent((c.OPENING_CERTIFIED || 0) + (c.OPENING_DERIVED || 0) + (c.OPENING_PARTIAL || 0), held) : null,
    };
    out.OPENING_COST_COVERAGE = {
      WITH_DERIVED_VALUE: c.OPENING_COST_DERIVED ?? null,
      VALUE_COVERAGE_PERCENT: c.OPENING_COST_COVERAGE_PERCENT ?? null,
      CLEAN_DERIVED_PERCENT: c.OPENING_COST_CLEAN_DERIVED_PERCENT ?? null,
      COST_CERTIFIED_PERCENT: 0,
    };
  }
  if (matrix) {
    const rows = matrix.ROWS || matrix.rows || [];
    const total = rows.length;
    const ok = rows.filter((r) => (r.CERTIFICATION_STATUS || '').startsWith('DERIVED'));
    const gross = rows.reduce((s, r) => s + (r.SELL_VALUE_CENTS || 0), 0);
    const grossOk = ok.reduce((s, r) => s + (r.SELL_VALUE_CENTS || 0), 0);
    out.SALES_COUNT_COVERAGE = { TOTAL: total, DERIVED_SIMULATION: ok.length, COUNT_PERCENT: percent(ok.length, total) };
    out.SALES_VALUE_COVERAGE = {
      TOTAL_GROSS_CENTS: gross,
      DERIVED_GROSS_CENTS: grossOk,
      VALUE_PERCENT: percent(grossOk, gross),
      NOTE: 'Blocked sale rows without source value count 0 in the covered numerator (missing amount is never priced)',
    };
  }
  if (irrf) {
    const s = irrf.SUMMARY || {};
    out.IRRF_COVERAGE = { ...s, STATUS: s.STATUS || 'UNKNOWN' };
  }
  if (feesTrades) {
    const { feesCoverage } = require('./fees');
    out.FEES_COVERAGE = feesCoverage(feesTrades);
  }
  if (monthlyCloses) {
    const list = Array.isArray(monthlyCloses) ? monthlyCloses : Object.values(monthlyCloses);
    const complete = list.filter((m) => m.SOURCE_COVERAGE === 1 && m.UNKNOWN_BLOCKERS === 0);
    out.MONTHLY_CLOSE_COVERAGE = {
      BUCKET_MONTHS: list.length,
      COMPLETE: complete.length,
      PERCENT: percent(complete.length, list.length),
      NOTE: 'Tax due stays NOT_CALCULATED in every month regardless of coverage (rules uncertified).',
    };
  }
  out.LOSS_CARRY_COVERAGE = { STATUS: 'UNKNOWN', REASON: 'No prior-year declaration evidence; carry-in balances uncertified' };
  return out;
}

module.exports = { buildFiscalCoverage };
