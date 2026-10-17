'use strict';
// ============================================================================
// IR2026 — OPENING_FISCAL_2026_V1 evidence reconciliation (P3/P4/P5/P6/P7/P8/
// P9/P11/P12/P15).
//
// Two views, one engine:
//   DERIVED view   — full-window replay over the configured source window with engine
//                    statuses per asset. Values are DERIVED, never CERTIFIED:
//                    no official 31/12/2025 position/cost document exists.
//   SIMULATION     — 2026 ledger replayed on the derived opening. Realized
//                    values are SIMULATED_DERIVED only (tax rules are not
//                    legal-certified); TAX_DUE stays NOT_CALCULATED.
// The conservative product view (dry-run) is untouched and remains the
// authoritative product contract.
//
// Invariants: UNKNOWN != ZERO; PRE_COVERAGE_NEGATIVE => MISSING_OPENING_EVIDENCE
// (never a synthetic opening purchase, never negative holdings); transfers
// never realize results; IRRF never inferred from absence.
// ============================================================================

const { buildOpeningFiscal } = require('./opening-fiscal');
const { buildTaxLedger } = require('./ledger');
const { detectDayTrade, buildDayTradeMatchGroups } = require('./day-trade');
const { buildFiscalCoverage } = require('./coverage');
const { checklistFromBlockers } = require('./blockers');
const { sha256Json } = require('./hash');

const COST_BLOCKER_FLAGS = ['COST_UNKNOWN_TRANSFER', 'HAD_UNKNOWN_EVENT', 'HAD_CORPORATE_PARTIAL'];

function evidenceInventory(rawEvents, fiscalYear) {
  const fy = `${fiscalYear}-01-01`;
  const year = rawEvents.filter((e) => e.DATE >= fy && e.DATE < `${fiscalYear + 1}-01-01`);
  const raws = year.map((e) => String(e.MOVEMENT_RAW || ''));
  const irrfMentions = raws.filter((r) => /IRRF|IMPOSTO DE RENDA RETIDO|RETENCAO/i.test(r)).length;
  const feeEvents = year.filter((e) => e.TYPE === 'FEE').length;
  const feeMentions = raws.filter((r) => /TAXA B3|EMOLUMENTO|CORRETAGEM/i.test(r)).length;
  return {
    FEES: {
      STATUS: feeMentions ? 'PARTIAL' : 'MISSING_ITEMIZED',
      FEE_TYPED_EVENTS: feeEvents,
      FEE_MENTIONS_IN_RAW: feeMentions,
      NOTE: 'Export amounts are settlement values ("Transferência - Liquidação"); per-operation brokerage/B3 fees are not itemized (typed FEE rows are custody withdrawals, not brokerage). Engine fee-inclusion rule stays NEEDS_CURRENT_LEGAL_SOURCE; no fiscal result assumes zero fees silently.',
    },
    IRRF: {
      STATUS: irrfMentions ? 'PARTIAL' : 'UNKNOWN',
      RAW_MENTIONS: irrfMentions,
      NOTE: 'No withholding lines in the movement export. Absence of lines is not zero IRRF; withholding stays UNKNOWN until broker tax reports are provided.',
    },
    PRIOR_LOSSES: {
      STATUS: 'UNKNOWN',
      BUCKETS: ['RV_STOCK_SWING', 'RV_STOCK_DAY_TRADE', 'RV_FII', 'RV_ETF_BDR'],
      NOTE: 'Historical source coverage is incomplete and no prior-year IR declaration evidence exists; carry-forward balances cannot be derived. Tax payable stays provisional/blocked.',
    },
  };
}

function corporateActionBlockers(rawEvents, sellRecords) {
  const soldAssets = new Set(sellRecords.map((r) => r.ASSET));
  const pre = rawEvents.filter((e) => e.DATE < '2026-01-01' && soldAssets.has(e.TICKER));
  const affecting = pre.filter((e) => ['CORPORATE_ACTION', 'MARKET_EVENT', 'AMORTIZATION'].includes(e.TYPE)
    || /SPLIT|GRUPO|BONIFICACA|SUBSCRICAO|CISAO|INCORPORA|AMORTIZA/i.test(String(e.MOVEMENT_RAW || '')));
  const out = [];
  for (const asset of [...soldAssets].sort()) {
    const events = affecting.filter((e) => e.TICKER === asset);
    if (events.length) {
      out.push({
        ASSET: asset,
        PRE_2026_EVENT_IDS: events.map((e) => e.CANONICAL_ID),
        TYPES: [...new Set(events.map((e) => e.TYPE))],
        FISCAL_RESULT: 'BLOCKED',
        REASON: 'PRE_2026_CORPORATE_ACTION_EVIDENCE',
      });
    }
  }
  return out;
}

function salesMatrix(rawEvents, simulationLedger, sellClassification, dayTradeGroups) {
  const byId = new Map(rawEvents.filter((e) => e.DATE >= '2026-01-01').map((e) => [e.CANONICAL_ID, e]));
  const sells = simulationLedger.PROCESSING_RECORDS.filter((r) => r.TYPE === 'SELL');
  // P7: unpriced sells paired with same-day same-asset lending/transfer rows of
  // equal qty are custody/lending movements, not evidenced economic sales.
  const custodySignature = new Map();
  for (const s of sells) {
    const raw = byId.get(s.EVENT_ID);
    if (!raw || raw.AMOUNT !== null && raw.AMOUNT !== undefined) continue;
    const paired = rawEvents.some((e) => e.DATE === s.DATE && e.TICKER === s.ASSET
      && e.CANONICAL_ID !== s.EVENT_ID && (e.QUANTITY || 0) === (raw.QUANTITY || 0)
      && ['STOCK_LOAN', 'TRANSFER_CANDIDATE'].includes(e.TYPE));
    if (paired) custodySignature.set(s.EVENT_ID, true);
  }
  const BLOCKER_MAP = {
    FISCAL_COST_UNKNOWN: 'MISSING_OPENING_COST',
    OPENING_STATE_UNKNOWN: 'MISSING_OPENING_QTY',
    SELL_MISSING_QTY_OR_AMOUNT: 'MISSING_SALE_AMOUNT',
    TRANSFER_MISSING_QTY: 'TRANSFER_COST_UNKNOWN',
  };
  const rows = sells.map((r) => {
    const raw = byId.get(r.EVENT_ID) || {};
    const before = r.BEFORE_STATE || {};
    const applied = r.PROCESSING && r.PROCESSING.startsWith('APPLIED');
    const derivedCost = applied && before.TOTAL_COST_CENTS !== null;
    const blockerCodes = [];
    if (r.BLOCK_REASON && BLOCKER_MAP[r.BLOCK_REASON]) blockerCodes.push(BLOCKER_MAP[r.BLOCK_REASON]);
    if (custodySignature.get(r.EVENT_ID)) blockerCodes.push('LENDING_CUSTODY_UNPRICED');
    if (raw.AMOUNT === null || raw.AMOUNT === undefined) blockerCodes.push('MISSING_SALE_AMOUNT');
    const dtMatch = (dayTradeGroups || []).flatMap((g) => g.MATCHES.filter((m) => m.SELL_EVENT_ID === r.EVENT_ID));
    const dtMatchedQty = dtMatch.reduce((s, m) => s + (m.MATCHED_QTY || 0), 0);
    const dtUnmatchedQty = dtMatch.reduce((s, m) => s + (m.UNMATCHED_INTRADAY_QTY || 0), 0);
    return {
      SALE_ID: r.EVENT_ID,
      EVENT_ID: r.EVENT_ID,
      DATE: r.DATE,
      ASSET: r.ASSET,
      ASSET_CLASS: before.ASSET_CLASS || null,
      QTY_SOLD: raw.QUANTITY ?? null,
      GROSS_AMOUNT_CENTS: r.GROSS_CENTS,
      NET_AMOUNT_CENTS: null, // no itemized fees evidence; net never invented (P7/P8)
      FEES_CENTS: null,
      FEES_STATUS: 'MISSING_FEES',
      IRRF_IF_KNOWN_CENTS: null,
      IRRF_STATUS: 'UNKNOWN',
      DAY_TRADE: dtMatchedQty > 0 ? {
        CLASSIFICATION: 'DAY_TRADE_CANDIDATE',
        MATCHED_QTY: dtMatchedQty,
        UNMATCHED_INTRADAY_QTY: dtUnmatchedQty,
      } : { CLASSIFICATION: 'SWING_TRADE', MATCHED_QTY: 0, UNMATCHED_INTRADAY_QTY: 0 },
      QTY_BEFORE: before.QTY ?? null,
      FISCAL_COST_BEFORE_CENTS: before.TOTAL_COST_CENTS ?? null,
      AVG_FISCAL_COST_BEFORE_CENTS: before.AVG_COST_CENTS ?? null,
      OPENING_COST_STATUS: before.COST_STATUS || 'UNKNOWN',
      COST_OF_SOLD_QTY_CENTS: r.COST_REMOVED_CENTS ?? null,
      REALIZED_RESULT_CENTS: null, // authoritative result never populated from non-certified cost (P6)
      SIMULATED_DERIVED_REALIZED_CENTS: derivedCost ? r.REALIZED : null,
      TRADE_CLASSIFICATION: sellClassification.get(r.EVENT_ID) || 'SWING_TRADE',
      CERTIFICATION_STATUS: derivedCost ? 'DERIVED_SIMULATION' : 'BLOCKED',
      BLOCKER_CODES: [...new Set(blockerCodes)],
      BLOCKER: r.BLOCK_REASON || (derivedCost ? null : 'FISCAL_COST_UNKNOWN'),
      SOURCE_REFS: (r.PROVENANCE && [r.PROVENANCE.SOURCE]) || [],
      SOURCE_PROVENANCE: r.PROVENANCE || null,
    };
  });
  return {
    SALES_2026_TOTAL: rows.length,
    SALES_WITH_DERIVED_SIMULATED_COST: rows.filter((x) => x.CERTIFICATION_STATUS === 'DERIVED_SIMULATION').length,
    SALES_BLOCKED: rows.filter((x) => x.CERTIFICATION_STATUS === 'BLOCKED').length,
    SALES_WITH_CERTIFIED_COST: 0, // remains 0 until official cost evidence exists
    SALES_CUSTODY_SIGNATURE: rows.filter((x) => x.BLOCKER_CODES.includes('LENDING_CUSTODY_UNPRICED')).length,
    ROWS: rows,
  };
}

function buildOpeningV1({ rawEvents, anchors, registry, fiscalYear = 2026, historyStart = null }) {
  if (!Array.isArray(rawEvents)) throw new TypeError('canonical events required');
  // Derived view: engine replay, statuses as computed (CERTIFIED/PARTIAL/UNKNOWN
  // reflect flag cleanliness of the replay, NOT official evidence).
  const derived = buildOpeningFiscal({ rawEvents, anchors, fiscalYear, registry, historyStart });
  const rows = derived.ROWS.map((row) => {
    // Mission P3/P4 classification: replay statuses are engine semantics
    // (clean-flag replay), never official evidence. Map to evidence classes:
    // DERIVED (clean full-window replay), PARTIAL (flagged replay),
    // UNKNOWN (pre-coverage/blocked), NOT_APPLICABLE (closed pre-year).
    const flags = row.FLAGS || {};
    let openingStatus;
    if (flags.PRE_COVERAGE_NEGATIVE || row.OPENING_QTY === null) openingStatus = 'UNKNOWN';
    else if (row.OPENING_QTY === 0 && row.QTY_STATUS === 'CERTIFIED') openingStatus = 'NOT_APPLICABLE';
    else if (row.QTY_STATUS === 'CERTIFIED' && ['CERTIFIED', 'NOT_APPLICABLE'].includes(row.COST_STATUS)) openingStatus = 'DERIVED';
    else if (row.QTY_STATUS === 'PARTIAL' || ['PARTIAL', 'UNKNOWN'].includes(row.COST_STATUS)) openingStatus = 'PARTIAL';
    else openingStatus = 'UNKNOWN';
    return {
      ASSET: row.ASSET,
      ASSET_CLASS: row.ASSET_CLASS,
      OPENING_QTY: row.OPENING_QTY,
      OPENING_STATUS: openingStatus,
      QTY_REPLAY_STATUS: row.QTY_STATUS,
      OPENING_TOTAL_COST_CENTS: row.OPENING_TOTAL_COST_CENTS,
      OPENING_AVG_COST_CENTS: row.OPENING_AVG_COST_CENTS,
      COST_REPLAY_STATUS: row.COST_STATUS,
      OPENING_RF_PRINCIPAL_CENTS: row.OPENING_RF_PRINCIPAL_CENTS,
      SOURCE: row.SOURCE,
      SOURCE_DATE: row.SOURCE_DATE,
      AUTHORITY_LEVEL: 'DERIVED', // never OFFICIAL: no 31/12/2025 official cost document exists
      SOURCE_REFS: ['SRC-CANON-MOVEMENTS'],
      SOURCE_HASH: null, // filled by the runner from the verified source manifest
      FLAGS: flags,
      BLOCKERS: [...new Set([
        ...(row.BLOCKERS || []),
        ...(flags.PRE_COVERAGE_NEGATIVE ? ['MISSING_OPENING_EVIDENCE'] : []),
        ...(COST_BLOCKER_FLAGS.some((f) => flags[f]) ? ['NO_CERTIFIED_2025_YEAR_END_OPENING'] : []),
      ])],
      COVERAGE_NOTES: flags.PRE_COVERAGE_NEGATIVE
        ? 'Held before available export coverage: opening evidence missing; never zero, never synthetic.'
        : (row.OPENING_QTY > 0 ? 'Full-window replay from zero; derived, not official evidence.' : null),
      ANCHOR_CHECK: row.ANCHOR_CHECK,
    };
  });

  const heldCandidates = rows.filter((r) => (r.OPENING_QTY ?? 0) > 0 || r.OPENING_STATUS === 'UNKNOWN');
  const costKnown = heldCandidates.filter((r) => r.OPENING_TOTAL_COST_CENTS !== null);
  const coverage = {
    OPENING_ASSET_COUNT: rows.length,
    OPENING_HELD_CANDIDATES: heldCandidates.length,
    OPENING_POTENTIALLY_HELD: rows.filter((r) => (r.OPENING_QTY ?? 0) > 0).length,
    OPENING_CERTIFIED: 0,
    OPENING_DERIVED: heldCandidates.filter((r) => r.OPENING_STATUS === 'DERIVED').length,
    OPENING_PARTIAL: heldCandidates.filter((r) => r.OPENING_STATUS === 'PARTIAL').length,
    OPENING_UNKNOWN: heldCandidates.filter((r) => r.OPENING_STATUS === 'UNKNOWN').length,
    OPENING_NOT_APPLICABLE: rows.filter((r) => r.OPENING_STATUS === 'NOT_APPLICABLE').length,
    OPENING_QTY_DERIVED: rows.filter((r) => r.QTY_REPLAY_STATUS === 'CERTIFIED').length,
    OPENING_QTY_PARTIAL: rows.filter((r) => r.QTY_REPLAY_STATUS === 'PARTIAL').length,
    OPENING_QTY_UNKNOWN: rows.filter((r) => r.QTY_REPLAY_STATUS === 'UNKNOWN').length,
    OPENING_COST_DERIVED: costKnown.filter((r) => r.OPENING_STATUS === 'DERIVED').length,
    OPENING_COST_PARTIAL: costKnown.filter((r) => r.OPENING_STATUS === 'PARTIAL').length,
    OPENING_COST_UNKNOWN: heldCandidates.length - costKnown.length,
    OPENING_COST_COVERAGE_PERCENT: heldCandidates.length ? Number((costKnown.length / heldCandidates.length * 100).toFixed(2)) : null,
    OPENING_COST_CLEAN_DERIVED_PERCENT: heldCandidates.length
      ? Number((heldCandidates.filter((r) => r.OPENING_STATUS === 'DERIVED').length / heldCandidates.length * 100).toFixed(2)) : null,
    OPENING_DERIVED_COST_TOTAL_CENTS: costKnown.reduce((s, r) => s + (r.OPENING_TOTAL_COST_CENTS || 0), 0),
  };

  // Simulation ledger on derived opening (values are non-authoritative).
  const yearEvents = rawEvents.filter((e) => e.DATE >= `${fiscalYear}-01-01` && e.DATE < `${fiscalYear + 1}-01-01`);
  const simulation = buildTaxLedger({ opening: derived, events: yearEvents, registry, fiscalYear });
  const dt = detectDayTrade(rawEvents, fiscalYear);
  const dtGroups = buildDayTradeMatchGroups(rawEvents, fiscalYear);
  const matrix = salesMatrix(rawEvents, simulation, dt.sellClassification, dtGroups.DAY_TRADE_MATCH_GROUPS);

  // P17: multi-dimensional coverage; P20: document checklist from blocker codes.
  const fiscalCoverage = buildFiscalCoverage({ opening: { OPENING_COVERAGE: coverage }, matrix, monthlyCloses: simulation.MONTHLY_CLOSES });
  const blockerCounts = {};
  const bump = (code, n = 1) => { blockerCounts[code] = (blockerCounts[code] || 0) + n; };
  for (const r of matrix.ROWS) for (const c of r.BLOCKER_CODES) bump(c);
  for (const r of rows) {
    for (const b of r.BLOCKERS) bump(b === 'MISSING_OPENING_EVIDENCE' ? 'PRE_COVERAGE_HOLDING' : b, 0); // presence without inflation
    if (r.BLOCKERS.includes('MISSING_OPENING_EVIDENCE') && r.OPENING_STATUS === 'UNKNOWN') bump('PRE_COVERAGE_HOLDING');
    if (r.BLOCKERS.includes('NO_CERTIFIED_2025_YEAR_END_OPENING') && (r.OPENING_TOTAL_COST_CENTS ?? null) === null) bump('MISSING_OPENING_COST');
  }
  bump('MISSING_FEES', 1);
  bump('MISSING_IRRF', 1);
  bump('MISSING_PRIOR_LOSS', 1);
  const documentChecklist = checklistFromBlockers(blockerCounts);

  const v1 = {
    ARTIFACT: 'OPENING_FISCAL_2026_V1',
    FISCAL_YEAR: fiscalYear,
    EVIDENCE_AUTHORITY: 'DERIVED_FROM_OFFICIAL_MOVEMENT_EXPORT',
    OFFICIAL_2025_YEAR_END_EVIDENCE: 'NOT_FOUND',
    CERTIFIED_RESULT_POLICY: 'Realized results are SIMULATED_DERIVED only; no authoritative tax output until official 2025 position/cost, prior losses and IRRF are evidenced and rules are legal-certified.',
    TAX_PAYABLE_STATUS: 'NOT_CALCULATED',
    OPENING_FISCAL_2026_V1: rows,
    OPENING_COVERAGE: coverage,
    SALES_FORENSIC_MATRIX: matrix,
    DAY_TRADE: {
      DAY_TRADE_DETECTED_DAYS: dt.DAY_TRADE_DAYS.length,
      DAY_TRADE_SELL_EVENTS: matrix.ROWS.filter((x) => x.TRADE_CLASSIFICATION === 'DAY_TRADE_CANDIDATE').length,
      SWING_TRADE_SELL_EVENTS: matrix.ROWS.filter((x) => x.TRADE_CLASSIFICATION === 'SWING_TRADE').length,
      DAYS: dt.DAY_TRADE_DAYS,
      MATCH_GROUPS: dtGroups.DAY_TRADE_MATCH_GROUPS,
    },
    FISCAL_COVERAGE: fiscalCoverage,
    DOCUMENT_CHECKLIST: documentChecklist,
    EVIDENCE_INVENTORY: evidenceInventory(rawEvents, fiscalYear),
    CORPORATE_ACTION_BLOCKERS: corporateActionBlockers(rawEvents, matrix.ROWS),
    TRANSFER_POLICY: 'Transfers never realize results; cost chain unknown remains FISCAL_COST_UNKNOWN (no synthesis).',
  };
  v1.SHA256 = sha256Json(v1);
  return v1;
}

module.exports = { buildOpeningV1 };
