'use strict';
// ============================================================================
// IR2026 — P4: opening promotion pipeline.
// ingest evidence -> match asset -> compare qty/cost -> classify conflict ->
// promote opening status. Conflicts are never auto-resolved. Promotion only
// from evidence levels 1-4 (see precedence.js); the result is a PROPOSAL —
// the caller (dry-run) decides to persist. Never downgrades.
// ============================================================================

const { evaluatePromotion, classifyOpeningCompare } = require('./precedence');
const { PRECEDENCE_LEVELS } = require('./precedence');

// Map document type -> evidence precedence level (mission P2 contract).
const TYPE_LEVEL = Object.freeze({
  YEAR_END_POSITION: 'OFFICIAL_YEAR_END_STATEMENT',
  ANNUAL_BROKER_REPORT: 'OFFICIAL_ANNUAL_TAX_REPORT',
  WITHHOLDING_REPORT: 'BROKER_IR_EXPORT',
  COST_BASIS_REPORT: 'BROKER_IR_EXPORT',
  B3_CUSTODY_STATEMENT: 'B3_CUSTODY_STATEMENT',
  LOSS_CARRYFORWARD_REPORT: 'OFFICIAL_ANNUAL_TAX_REPORT',
  BROKERAGE_NOTE: 'BROKER_IR_EXPORT',
  FEES_STATEMENT: 'BROKER_IR_EXPORT',
});

function evidenceLevelFor(documentType) {
  return TYPE_LEVEL[documentType] || null;
}

/**
 * Build promotion proposals from an ingested document against the current
 * opening rows (shape: ir2026 opening-v1 rows or engine opening rows).
 * Returns per-asset proposals + conflicts. NO mutation, NO writes.
 */
function proposeOpeningPromotions({ ingested, openingRows }) {
  if (!ingested || !ingested.ACCEPTED) throw new TypeError('ingested document required');
  const level = evidenceLevelFor(ingested.DOCUMENT_TYPE);
  if (!level) return { PROMOTIONS: [], CONFLICTS: [], REASON: 'DOCUMENT_TYPE_HAS_NO_PRECEDENCE' };
  const byAsset = new Map();
  const unmatchedAssets = [];
  for (const rec of ingested.RECORDS) {
    if (!rec.ASSET) {
      unmatchedAssets.push({ ASSET: rec.ASSET_INPUT, REASON: rec.ASSET_MATCH === 'AMBIGUOUS' ? 'ASSET_MATCH_AMBIGUOUS' : 'ASSET_NOT_IN_OPENING_UNIVERSE', EVIDENCE_ROWS: [rec.EVIDENCE_ROW_ID] });
      continue;
    }
    const cur = byAsset.get(rec.ASSET) || { ASSET: rec.ASSET, EVIDENCE_QTY: null, EVIDENCE_COST_CENTS: null, ROWS: [] };
    cur.ROWS.push(rec.EVIDENCE_ROW_ID);
    if (rec.QTY !== null) cur.EVIDENCE_QTY = (cur.EVIDENCE_QTY || 0) + rec.QTY;
    if (rec.COST !== null) cur.EVIDENCE_COST_CENTS = (cur.EVIDENCE_COST_CENTS || 0) + Math.round(rec.COST * 100);
    byAsset.set(rec.ASSET, cur);
  }
  const promotions = [];
  const conflicts = [];
  for (const [asset, ev] of byAsset) {
    const row = (openingRows || []).find((r) => r.ASSET === asset);
    if (!row) { conflicts.push({ ASSET: asset, REASON: 'ASSET_NOT_IN_OPENING_UNIVERSE', EVIDENCE_ROWS: ev.ROWS }); continue; }
    const compare = classifyOpeningCompare({
      derivedQty: row.OPENING_QTY ?? null,
      derivedCostCents: row.OPENING_TOTAL_COST_CENTS ?? null,
      evidenceQty: ev.EVIDENCE_QTY,
      evidenceCostCents: ev.EVIDENCE_COST_CENTS,
    });
    const currentStatus = row.OPENING_STATUS || row.QTY_STATUS || 'UNKNOWN';
    if (compare === 'CONFLICT') {
      conflicts.push({
        ASSET: asset,
        REASON: 'QTY_OR_COST_MISMATCH',
        DERIVED_QTY: row.OPENING_QTY ?? null,
        EVIDENCE_QTY: ev.EVIDENCE_QTY,
        DERIVED_COST_CENTS: row.OPENING_TOTAL_COST_CENTS ?? null,
        EVIDENCE_COST_CENTS: ev.EVIDENCE_COST_CENTS,
        EVIDENCE_ROWS: ev.ROWS,
        RESOLUTION: 'HUMAN_REVIEW_REQUIRED',
      });
      continue;
    }
    const promo = evaluatePromotion({
      currentStatus,
      evidenceLevel: level,
      evidencePresent: true,
      consistent: true,
    });
    promotions.push({
      ASSET: asset,
      CURRENT_STATUS: currentStatus,
      PROPOSED_STATUS: promo.NEW_STATUS,
      PROMOTED: promo.PROMOTED,
      REASON: promo.REASON,
      COMPARE_CLASS: compare,
      EVIDENCE_LEVEL: PRECEDENCE_LEVELS[level].LEVEL,
      EVIDENCE_ROWS: ev.ROWS,
      DOCUMENT_SHA256: ingested.CONTENT_SHA256,
      ADJUSTMENT: compare === 'CERTIFIED_EXACT' ? null
        : { QTY: { DERIVED: row.OPENING_QTY ?? null, EVIDENCE: ev.EVIDENCE_QTY },
            COST_CENTS: { DERIVED: row.OPENING_TOTAL_COST_CENTS ?? null, EVIDENCE: ev.EVIDENCE_COST_CENTS } },
    });
  }
  return {
    DOCUMENT_TYPE: ingested.DOCUMENT_TYPE,
    EVIDENCE_LEVEL: PRECEDENCE_LEVELS[level].LEVEL,
    PROMOTIONS: promotions,
    CONFLICTS: [...conflicts, ...unmatchedAssets],
  };
}

module.exports = { proposeOpeningPromotions, evidenceLevelFor };
