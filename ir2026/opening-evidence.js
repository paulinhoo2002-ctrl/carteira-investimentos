'use strict';

// Private evidence triage. This does not certify a position, cost, gain or tax.
const { normalizeEventType } = require('./contracts');
const { sha256Json } = require('./hash');

const CORPORATE = new Set(['BONUS', 'CORPORATE_SPLIT', 'CORPORATE_REVERSE_SPLIT',
  'SUBSCRIPTION', 'TICKER_CHANGE', 'MERGER', 'SPINOFF', 'AMORTIZATION', 'CAPITAL_RETURN']);

function analyzeOpeningEvidence(report, rawEvents) {
  if (!report?.OPENING?.ROWS || !report?.LEDGER?.PROCESSING_RECORDS || !Array.isArray(rawEvents)) {
    throw new TypeError('fiscal dry-run and canonical events required');
  }
  const byAsset = new Map();
  for (const event of rawEvents) {
    if (!event.TICKER || !event.DATE) continue;
    if (!byAsset.has(event.TICKER)) byAsset.set(event.TICKER, []);
    byAsset.get(event.TICKER).push(event);
  }
  const openingByAsset = new Map(report.OPENING.ROWS.map(row => [row.ASSET, row]));
  const preYear = [...byAsset].filter(([, rows]) => rows.some(row => row.DATE < '2026-01-01'));
  const openingRows = report.OPENING.ROWS.map(row => ({
    ASSET: row.ASSET,
    ASSET_CLASS: row.ASSET_CLASS,
    POSITION_31_12_2025: row.OPENING_QTY,
    POSITION_SOURCE: row.SOURCE,
    OPENING_QTY_STATUS: row.QTY_STATUS,
    OPENING_COST_CENTS: null,
    OPENING_COST_STATUS: 'UNKNOWN',
    OPENING_AVG_COST_CENTS: null,
    OPENING_AVG_COST_STATUS: 'UNKNOWN',
    PREVIOUS_LOSS_IMPACT: 'UNKNOWN',
    SOURCE_PROVENANCE: row.AUTHORITY_LEVEL,
    UNKNOWN_BLOCKERS: [...new Set([...row.BLOCKERS, 'NO_DIRECT_2025_FISCAL_OPENING'])],
    OPENING_ASSET_CLASSIFICATION: row.OPENING_QTY > 0 ? 'POTENTIALLY_HELD'
      : row.OPENING_QTY === 0 ? 'POTENTIALLY_CLOSED' : 'UNKNOWN',
  }));
  const records = new Map(report.LEDGER.PROCESSING_RECORDS.map(row => [row.EVENT_ID, row]));
  const sales = rawEvents.filter(row => row.TYPE === 'SELL' && row.DATE >= '2026-01-01' && row.DATE < '2027-01-01')
    .map(row => {
      const opening = openingByAsset.get(row.TICKER);
      const previous = (byAsset.get(row.TICKER) || []).filter(e => e.DATE < row.DATE);
      const preCorporate = previous.filter(e => e.DATE < '2026-01-01'
        && CORPORATE.has(normalizeEventType(e.TYPE, e.MOVEMENT_RAW)));
      const preTransfers = previous.filter(e => e.DATE < '2026-01-01' && /TRANSFER/.test(e.TYPE));
      const blockers = ['2025_POSITION_AND_FISCAL_COST', 'BROKERAGE_FEES_EVIDENCE'];
      if (preCorporate.length) blockers.push('PRE_2026_CORPORATE_ACTION_EVIDENCE');
      if (preTransfers.length) blockers.push('PRE_2026_TRANSFER_COST_CHAIN');
      if (!opening || opening.QTY_STATUS === 'UNKNOWN') blockers.push('OPENING_QUANTITY_UNKNOWN');
      return {
        SELL_EVENT: row.CANONICAL_ID,
        ASSET: row.TICKER,
        DATE: row.DATE,
        REQUIRED_OPENING_EVIDENCE: ['OFFICIAL_2025_POSITION', 'FISCAL_COST_2025'],
        REQUIRED_PRIOR_EVENTS: previous.map(e => e.CANONICAL_ID),
        BLOCKER: records.get(row.CANONICAL_ID)?.BLOCK_REASON || 'UNVERIFIED',
        EVIDENCE_GAPS: blockers,
      };
    });
  const priority = ['2025_POSITION_AND_FISCAL_COST', 'BROKERAGE_FEES_EVIDENCE',
    'PRE_2026_CORPORATE_ACTION_EVIDENCE', 'PRE_2026_TRANSFER_COST_CHAIN', 'OPENING_QUANTITY_UNKNOWN']
    .map(item => {
      const affected = sales.filter(s => s.EVIDENCE_GAPS.includes(item));
      return { EVIDENCE_ITEM: item, SALES_DEPENDENT: affected.length,
        ASSETS_DEPENDENT: new Set(affected.map(s => s.ASSET)).size,
        SALES_PROVEN_UNBLOCKED_BY_THIS_ITEM_ALONE: affected.filter(s => s.EVIDENCE_GAPS.length === 1).length };
    });
  const aggregate = {
    OPENING_REAL_ASSET_COUNT: null,
    OPENING_POTENTIALLY_HELD: openingRows.filter(r => r.OPENING_ASSET_CLASSIFICATION === 'POTENTIALLY_HELD').length,
    HISTORICAL_ONLY_IDENTIFIERS: preYear.filter(([asset]) => !openingByAsset.has(asset)).length,
    RIGHTS_TEMPORARY_IN_SCOPE: openingRows.filter(r => r.ASSET_CLASS === 'RIGHTS_SUBSCRIPTION').length,
    FIXED_INCOME_IN_SCOPE: openingRows.filter(r => r.ASSET_CLASS?.startsWith('FIXED_INCOME_')).length,
    OPENING_QTY_CERTIFIED: openingRows.filter(r => r.OPENING_QTY_STATUS === 'CERTIFIED').length,
    OPENING_QTY_PARTIAL: openingRows.filter(r => r.OPENING_QTY_STATUS === 'PARTIAL').length,
    OPENING_QTY_UNKNOWN: openingRows.filter(r => r.OPENING_QTY_STATUS === 'UNKNOWN').length,
    OPENING_COST_CERTIFIED: 0,
    OPENING_COST_PARTIAL: 0,
    OPENING_COST_UNKNOWN: openingRows.length,
    SELL_EVENTS_2026: sales.length,
    SELLS_PROVEN_UNBLOCKED: 0,
    TAX_DUE: 'NOT_CALCULATED',
  };
  const privateReport = { OPENING_FISCAL_2026_V2: openingRows, SELL_DEPENDENCIES: sales, EVIDENCE_PRIORITY: priority, AGGREGATE: aggregate };
  return { ...privateReport, SHA256: sha256Json(privateReport) };
}

module.exports = { analyzeOpeningEvidence };
