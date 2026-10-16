'use strict';
// IR2026 — Fiscal certification layers (P25). Eight INDEPENDENT layers;
// no global IR_READY boolean. Each layer: READY | PARTIAL | BLOCKED.

function computeCertification({ opening, ledger, invariantReport }) {
  const layers = {};
  const rows = opening.ROWS || [];
  const records = ledger.PROCESSING_RECORDS;

  // assets with fiscal-year sales need a usable opening
  const sellAssets = new Set(records.filter((r) => r.TYPE === 'SELL').map((r) => r.ASSET));
  const blockedOpeningForSells = rows.filter(
    (r) => sellAssets.has(r.ASSET) && (r.QTY_STATUS === 'UNKNOWN' || r.COST_STATUS === 'UNKNOWN')
  );
  const partialOpening = rows.filter(
    (r) => (r.QTY_STATUS === 'PARTIAL' || r.COST_STATUS === 'PARTIAL' || r.QTY_STATUS === 'UNKNOWN' || r.COST_STATUS === 'UNKNOWN')
      && !sellAssets.has(r.ASSET)
  );
  layers.OPENING_2026_READY = blockedOpeningForSells.length === 0 && partialOpening.length === 0
    ? { STATUS: 'READY', DETAIL: { assets: rows.length } }
    : {
        STATUS: blockedOpeningForSells.length > 0 ? 'BLOCKED' : 'PARTIAL',
        DETAIL: {
          blocked_for_sells: blockedOpeningForSells.map((r) => r.ASSET),
          partial_or_unknown: partialOpening.length,
          assets: rows.length,
        },
      };

  const blockedRealizedImpact = records.filter(
    (r) => r.PROCESSING === 'BLOCKED_UNKNOWN' && r.IMPACT_FLAGS.includes('AFFECTS_REALIZED_GAIN')
  );
  const anyBlocked = records.filter((r) => r.PROCESSING === 'BLOCKED_UNKNOWN');
  layers.EVENT_LEDGER_2026_READY = blockedRealizedImpact.length === 0 && anyBlocked.length === 0
    ? { STATUS: 'READY', DETAIL: { events: records.length } }
    : {
        STATUS: blockedRealizedImpact.length > 0 ? 'BLOCKED' : 'PARTIAL',
        DETAIL: { blocked_realized_impact: blockedRealizedImpact.length, blocked_total: anyBlocked.length, events: records.length },
      };

  const taxDueBlocked = ledger.MONTHLY_CLOSES.some((c) => c.TAX_DUE === 'NOT_CALCULATED');
  layers.MONTHLY_CLOSE_READY = taxDueBlocked
    ? { STATUS: 'PARTIAL', DETAIL: { reason: 'TAX_RULES_UNCERTIFIED', closes: ledger.MONTHLY_CLOSES.length } }
    : { STATUS: 'READY', DETAIL: { closes: ledger.MONTHLY_CLOSES.length } };

  const unknownItems = ledger.ANNUAL_CLOSE.UNKNOWN_ITEMS.length;
  layers.ANNUAL_CLOSE_READY = unknownItems > 0 || taxDueBlocked
    ? { STATUS: 'PARTIAL', DETAIL: { unknown_items: unknownItems, tax_due: 'NOT_CALCULATED' } }
    : { STATUS: 'READY', DETAIL: {} };

  const lossOpeningUnknown = ledger.LOSS_LEDGER.some((l) => l.OPENING_STATUS === 'UNKNOWN');
  layers.LOSS_LEDGER_READY = lossOpeningUnknown
    ? { STATUS: 'PARTIAL', DETAIL: { reason: 'PRE_2026_CARRYFORWARD_REQUIRES_PRIOR_DECLARATIONS' } }
    : { STATUS: 'READY', DETAIL: {} };

  const evidenced = ledger.WITHHOLDING_REGISTRY_SUMMARY.EVIDENCED;
  layers.WITHHOLDING_READY = evidenced > 0
    ? { STATUS: evidenced === ledger.WITHHOLDING_REGISTRY_SUMMARY.ENTRIES ? 'READY' : 'PARTIAL', DETAIL: { evidenced, entries: ledger.WITHHOLDING_REGISTRY_SUMMARY.ENTRIES } }
    : { STATUS: 'BLOCKED', DETAIL: { reason: 'NO_IRRF_SOURCE_EVIDENCE', entries: ledger.WITHHOLDING_REGISTRY_SUMMARY.ENTRIES } };

  const feesUnknown = records.some((r) => r.TYPE === 'BUY' && r.AFTER_STATE && r.AFTER_STATE.FEES_STATUS === 'UNKNOWN');
  const costBlockedAssets = rows.filter((r) => sellAssets.has(r.ASSET) && r.COST_STATUS !== 'CERTIFIED' && r.COST_STATUS !== 'NOT_APPLICABLE');
  layers.FISCAL_COST_READY = costBlockedAssets.length === 0 && !feesUnknown
    ? { STATUS: 'READY', DETAIL: {} }
    : {
        STATUS: costBlockedAssets.length > 0 ? 'BLOCKED' : 'PARTIAL',
        DETAIL: { sells_with_noncertified_cost: costBlockedAssets.map((r) => r.ASSET), note: 'fees UNKNOWN in canonical export (no per-trade fee evidence)' },
      };

  const others = ['OPENING_2026_READY', 'EVENT_LEDGER_2026_READY', 'MONTHLY_CLOSE_READY', 'ANNUAL_CLOSE_READY', 'LOSS_LEDGER_READY', 'WITHHOLDING_READY', 'FISCAL_COST_READY'];
  const allReady = others.every((k) => layers[k].STATUS === 'READY');
  const invariantsPass = !invariantReport || invariantReport.ALL_PASS === true;
  layers.IR_CALCULATION_READY = allReady && invariantsPass
    ? { STATUS: 'READY', DETAIL: {} }
    : {
        STATUS: 'BLOCKED',
        DETAIL: {
          reason: allReady ? 'INVARIANT_FAILURES' : 'DEPENDENT_LAYERS_NOT_READY',
          layers_not_ready: others.filter((k) => layers[k].STATUS !== 'READY'),
          invariants_all_pass: invariantsPass,
        },
      };

  return {
    LAYERS: layers,
    INVARIANTS_ALL_PASS: invariantsPass,
    NOTE: 'IR_CALCULATION_READY is derived, never asserted. TAX rules remain NEEDS_CURRENT_LEGAL_SOURCE — no definitive tax is computed.',
  };
}

module.exports = { computeCertification };
