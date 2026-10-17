'use strict';
// ============================================================================
// IR2026 — Opening fiscal checkpoint builder (P4/P5)
//
// For every asset relevant entering FISCAL_START_YEAR: replay pre-year
// events from the canonical historical stream (2019-11 → boundary), then
// classify QTY_STATUS / COST_STATUS with explicit evidence precedence.
// Never forces UNKNOWN into zero; never invents a synthetic opening purchase.
// ============================================================================

const { applyEvent, normalizeEvent, avgCost } = require('./tax-ledger');
const { sortEvents } = require('./ledger');
const { sha256Json } = require('./hash');
const { isRfAssetClass } = require('./contracts');

const QTY_FLAGS = ['HAD_TRANSFER', 'HAD_UNKNOWN_EVENT', 'HAD_CORPORATE_PARTIAL', 'COST_UNKNOWN_TRANSFER'];

function buildOpeningFiscal({ rawEvents, anchors, fiscalYear, registry }) {
  const fy = fiscalYear || 2026;
  const boundary = `${fy}-01-01`;
  const anchorsByAsset = anchors || {};
  const events = rawEvents.map(normalizeEvent);
  const pre = sortEvents(events.filter((e) => e.DATE < boundary));
  const yearEvents = sortEvents(events.filter((e) => e.DATE >= boundary));

  // scope: assets with fiscal-year events OR anchored current positions
  const scope = new Set();
  for (const e of yearEvents) scope.add(e.ASSET);
  for (const a of Object.keys(anchorsByAsset)) scope.add(a);

  const states = {};
  const ctx = { registry, fiscalYear: fy };
  for (const ev of pre) applyEvent(states, ev, ctx);

  // classification from ANY event (pre or fiscal year) — never default OTHER
  const classByAsset = {};
  for (const e of events) classByAsset[e.ASSET] = { ASSET_CLASS: e.ASSET_CLASS, BASIS: e.CLASSIFICATION_BASIS };

  const rows = [];
  for (const asset of [...scope].sort()) {
    const st = states[asset];
    const anchor = anchorsByAsset[asset] || null;
    const flags = st ? st.FLAGS : {};
    const blockers = [];
    const isRf = st ? isRfAssetClass(st.ASSET_CLASS) : isRfAssetClass((classByAsset[asset] || {}).ASSET_CLASS);

    let qty = st ? st.QTY : 0;
    let totalCost = st ? st.TOTAL_COST_CENTS : null;
    let qtyStatus; let costStatus; let level; let source; let sourceDate; let authority;

    const flagsClean = Object.values(flags).every((f) => !f);
    if (!st || (qty === 0 && flagsClean)) {
      // no pre-year activity (or fully closed clean): a REAL derived zero —
      // total cost 0 is legitimate data here, not UNKNOWN-as-zero
      qty = 0; totalCost = 0;
      qtyStatus = 'CERTIFIED';
      costStatus = 'NOT_APPLICABLE';
      level = 3; source = 'FROM_ZERO_REPLAY'; sourceDate = boundary; authority = 'DERIVED';
    } else if (flags.PRE_COVERAGE_NEGATIVE) {
      // held before data coverage (2019) — qty/cost cannot be certified
      blockers.push('PRE_COVERAGE_HOLDING');
      if (anchor && anchor.QTY !== null) {
        qty = anchor.QTY; qtyStatus = 'PARTIAL';
        blockers.push('QTY_DERIVED_FROM_OFFICIAL_ANCHOR');
      } else { qty = null; qtyStatus = 'UNKNOWN'; }
      totalCost = null;
      costStatus = 'UNKNOWN';
      level = anchor ? 4 : 6; source = anchor ? 'OFFICIAL_ANCHOR' : 'UNAVAILABLE'; sourceDate = anchor ? anchor.AS_OF : null;
      authority = anchor ? 'OFFICIAL_HOSTED_SNAPSHOT' : 'UNKNOWN_LINEAGE';
    } else {
      const flagged = QTY_FLAGS.some((f) => flags[f]);
      qtyStatus = flagged ? 'PARTIAL' : 'CERTIFIED';
      costStatus = flags.COST_UNKNOWN_TRANSFER
        ? 'UNKNOWN'
        : (qty > 0 ? (flagged ? 'PARTIAL' : 'CERTIFIED') : 'NOT_APPLICABLE');
      if (flags.COST_UNKNOWN_TRANSFER) blockers.push('TRANSFER_WITHOUT_CARRIED_COST');
      if (flags.HAD_UNKNOWN_EVENT) blockers.push('UNKNOWN_PRE_YEAR_EVENTS');
      if (flags.HAD_TRANSFER) blockers.push('TRANSFER_PRE_YEAR');
      if (flags.HAD_CORPORATE_PARTIAL) blockers.push('CORPORATE_PARTIAL_PRE_YEAR');
      level = 3; source = 'SRC-CANON-MOVEMENTS'; sourceDate = boundary; authority = 'DERIVED';
    }

    if (isRf && st && st.RF_PRINCIPAL_CENTS !== undefined && st.RF_PRINCIPAL_CENTS > 0) {
      costStatus = 'NOT_APPLICABLE'; // RF: fiscal model is per-instrument cash flow, not avg cost (P16)
      blockers.push('RF_PRINCIPAL_TRACKED_PER_INSTRUMENT');
    }

    // anchor cross-check: official qty at AS_OF vs opening + net year qty deltas
    let anchorCheck = null;
    if (anchor && anchor.QTY !== null && qty !== null) {
      let net = 0;
      for (const ev of yearEvents) {
        if (ev.ASSET !== asset || ev.DATE > anchor.AS_OF) continue;
        // only applied qty-affecting events move the position
        if (!['BUY', 'SELL', 'TRANSFER_IN', 'TRANSFER_OUT'].includes(ev.TYPE)) continue;
        if (ev.QTY === null) continue;
        if (ev.TYPE === 'BUY' || ev.TYPE === 'TRANSFER_IN') net += ev.QTY; else net -= ev.QTY;
      }
      const expected = qty + net;
      const delta = anchor.QTY - expected;
      anchorCheck = { AS_OF: anchor.AS_OF, ANCHOR_QTY: anchor.QTY, EXPECTED_QTY: expected, DELTA: Number(delta.toFixed(8)), MATCH: Math.abs(delta) < 1e-6 };
      if (!anchorCheck.MATCH) { qtyStatus = 'PARTIAL'; blockers.push('ANCHOR_QTY_MISMATCH'); }
    }

    // P19: subscription-rights positions are pending dedicated fiscal
    // treatment (RULE_SUBSCRIPTION_COST_MODEL needs interpretation). A rights
    // row can never carry a CERTIFIED zero cost inherited from empty
    // statement fields — cost stays UNKNOWN until per-event evidence.
    const assetClass = st ? st.ASSET_CLASS : ((classByAsset[asset] || {}).ASSET_CLASS || null);
    const yearTypes = new Set(yearEvents.filter((e) => e.ASSET === asset).map((e) => e.TYPE));
    const isRightsPosition = assetClass === 'RIGHTS_SUBSCRIPTION'
      && (qty > 0 || yearTypes.has('SUBSCRIPTION') || yearTypes.has('RIGHTS_TRANSFER'));

    rows.push({
      ASSET: asset,
      ASSET_CLASS: st ? st.ASSET_CLASS : ((classByAsset[asset] ? classByAsset[asset].ASSET_CLASS : (anchor ? anchor.ASSET_CLASS : 'OTHER'))),
      CLASSIFICATION_BASIS: st ? st.CLASSIFICATION_BASIS : ((classByAsset[asset] ? classByAsset[asset].BASIS : 'ANCHOR_OR_FALLBACK')),
      OPENING_QTY: qty,
      OPENING_TOTAL_COST_CENTS: totalCost,
      OPENING_AVG_COST_CENTS: qty && totalCost !== null ? Math.round(totalCost / qty) : null,
      OPENING_RF_PRINCIPAL_CENTS: st && st.RF_PRINCIPAL_CENTS !== undefined ? st.RF_PRINCIPAL_CENTS : null,
      QTY_STATUS: qtyStatus,
      COST_STATUS: isRightsPosition && costStatus === 'CERTIFIED' ? 'UNKNOWN' : costStatus,
      PENDING_FISCAL_TREATMENT: isRightsPosition ? 'RIGHTS_POSITION_PENDING_FISCAL_TREATMENT' : null,
      SOURCE: source,
      SOURCE_DATE: sourceDate,
      AUTHORITY_LEVEL: authority,
      EVIDENCE_PRECEDENCE_LEVEL: level,
      FLAGS: flags,
      BLOCKERS: isRightsPosition ? [...blockers, 'RIGHTS_FISCAL_TREATMENT_PENDING'] : blockers,
      ANCHOR_CHECK: anchorCheck,
      OPEN_LOAN_QTY: st ? st.OPEN_LOAN_QTY : 0,
    });
    if (isRightsPosition && rows[rows.length - 1].COST_STATUS === 'UNKNOWN') {
      rows[rows.length - 1].OPENING_TOTAL_COST_CENTS = null;
      rows[rows.length - 1].OPENING_AVG_COST_CENTS = null;
    }
  }

  return {
    FISCAL_YEAR: fy,
    BOUNDARY: boundary,
    HISTORICAL_ANALYTICAL_PERIOD: { START: '2019-11-01', END: `${fy - 1}-12-31` },
    ROWS: rows,
    SHA256: sha256Json(rows),
    COUNTS: {
      ASSETS: rows.length,
      QTY_CERTIFIED: rows.filter((r) => r.QTY_STATUS === 'CERTIFIED').length,
      QTY_PARTIAL: rows.filter((r) => r.QTY_STATUS === 'PARTIAL').length,
      QTY_UNKNOWN: rows.filter((r) => r.QTY_STATUS === 'UNKNOWN').length,
      QTY_NOT_APPLICABLE: rows.filter((r) => r.QTY_STATUS === 'NOT_APPLICABLE').length,
      COST_CERTIFIED: rows.filter((r) => r.COST_STATUS === 'CERTIFIED').length,
      COST_PARTIAL: rows.filter((r) => r.COST_STATUS === 'PARTIAL').length,
      COST_UNKNOWN: rows.filter((r) => r.COST_STATUS === 'UNKNOWN').length,
      COST_NOT_APPLICABLE: rows.filter((r) => r.COST_STATUS === 'NOT_APPLICABLE').length,
    },
  };
}

module.exports = { buildOpeningFiscal };
