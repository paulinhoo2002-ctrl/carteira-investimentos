'use strict';
// ============================================================================
// IR2026 — P8: fee allocation engine. Brokerage/B3/emoluments/settlement.
// When a note itemizes per-trade fees they attach directly; when the note
// gives ONE total across trades, the documented deterministic rule is
// pro-rata by gross value (recorded in allocation_method). Missing coverage
// is never silently zero.
// ============================================================================

const ALLOCATION_METHODS = Object.freeze({
  ITEMIZED: 'ITEMIZED_PER_TRADE',
  PRO_RATA_GROSS: 'PRO_RATA_BY_GROSS_VALUE',
});

/** Attach per-trade fees from itemized rows (trade_ref -> cents). */
function allocateItemized(trades, feeRows) {
  const map = new Map(trades.map((t) => [t.trade_id, { ...t, FEES_CENTS: null, FEES_STATUS: 'MISSING_FEES', FEES_ALLOCATION_METHOD: null, FEES_SOURCE: null }]));
  for (const row of feeRows || []) {
    const t = map.get(row.trade_ref);
    if (!t || row.fees_cents === null || row.fees_cents === undefined) continue;
    t.FEES_CENTS = row.fees_cents;
    t.FEES_STATUS = 'CERTIFIED';
    t.FEES_ALLOCATION_METHOD = ALLOCATION_METHODS.ITEMIZED;
    t.FEES_SOURCE = row.source || null;
  }
  return [...map.values()];
}

/** Allocate a document-level total fee across trades, pro-rata by gross. */
function allocateTotalFee(trades, totalFeesCents, source) {
  if (totalFeesCents === null || totalFeesCents === undefined) {
    return trades.map((t) => ({ ...t, FEES_CENTS: null, FEES_STATUS: 'MISSING_FEES', FEES_ALLOCATION_METHOD: null, FEES_SOURCE: null }));
  }
  const grossSum = trades.reduce((s, t) => s + (t.gross_cents || 0), 0);
  const out = [];
  let allocated = 0;
  const eligible = trades.filter((t) => (t.gross_cents || 0) > 0);
  for (const t of trades) {
    if ((t.gross_cents || 0) <= 0) {
      out.push({ ...t, FEES_CENTS: null, FEES_STATUS: 'NOT_APPLICABLE', FEES_ALLOCATION_METHOD: ALLOCATION_METHODS.PRO_RATA_GROSS, FEES_SOURCE: source || null });
      continue;
    }
    const share = Math.floor((t.gross_cents / grossSum) * totalFeesCents);
    out.push({ ...t, FEES_CENTS: share, FEES_STATUS: 'DERIVED_ALLOCATION', FEES_ALLOCATION_METHOD: ALLOCATION_METHODS.PRO_RATA_GROSS, FEES_SOURCE: source || null });
    allocated += share;
  }
  // deterministic remainder: first eligible trade by stable order (date+id)
  const remainder = totalFeesCents - allocated;
  if (remainder !== 0 && eligible.length) {
    const first = out.find((t) => t.FEES_STATUS === 'DERIVED_ALLOCATION');
    if (first) first.FEES_CENTS += remainder;
  }
  return out;
}

function feesCoverage(trades) {
  const withFees = trades.filter((t) => t.FEES_CENTS !== null && t.FEES_CENTS !== undefined);
  const value = withFees.reduce((s, t) => s + (t.gross_cents || 0), 0);
  const totalValue = trades.reduce((s, t) => s + (t.gross_cents || 0), 0);
  return {
    FEES_COVERAGE_COUNT_PERCENT: trades.length ? Number((withFees.length / trades.length * 100).toFixed(2)) : null,
    FEES_COVERAGE_VALUE_PERCENT: totalValue ? Number((value / totalValue * 100).toFixed(2)) : null,
    FEES_STATUS: withFees.length === 0 ? 'MISSING_FEES' : (withFees.length === trades.length ? 'COVERED' : 'PARTIAL'),
  };
}

module.exports = { ALLOCATION_METHODS, allocateItemized, allocateTotalFee, feesCoverage };
