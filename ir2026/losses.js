'use strict';
// ============================================================================
// IR2026 — P10: prior loss carry-forward engine. Buckets are explicit and
// incompatible: losses never cross buckets. Initial states CERTIFIED /
// PARTIAL / UNKNOWN; UNKNOWN keeps tax due BLOCKED/PARTIAL (never zero).
// ============================================================================

const BUCKETS = Object.freeze(['RV_STOCK_SWING', 'RV_STOCK_DAY_TRADE', 'RV_FII', 'RV_ETF_BDR']);

function bucketOf(saleBucketOrAssetClass, isDayTrade) {
  if (isDayTrade) return 'RV_STOCK_DAY_TRADE';
  switch (saleBucketOrAssetClass) {
    case 'BRAZIL_STOCK': return 'RV_STOCK_SWING';
    case 'FII': return 'RV_FII';
    case 'ETF_BR': case 'BDR': return 'RV_ETF_BDR';
    default: return null; // unknown class never falls into a stock bucket
  }
}

/**
 * Advance the loss ledger with one month of realized results.
 * entries: [{BUCKET, YEAR_MONTH, NET_CENTS}] (month net per bucket).
 * Losses compensate SAME-bucket gains first; nothing crosses buckets.
 */
function advanceLossLedger({ initialStates, monthlyEntries, compensate = true }) {
  const ledger = {};
  for (const bucket of BUCKETS) {
    const init = (initialStates || {})[bucket] || { BALANCE_CENTS: null, STATUS: 'UNKNOWN' };
    ledger[bucket] = {
      BUCKET: bucket,
      OPENING_BALANCE_CENTS: init.BALANCE_CENTS,
      OPENING_STATUS: init.STATUS || 'UNKNOWN',
      CLOSING_BALANCE_CENTS: init.STATUS === 'CERTIFIED' || init.STATUS === 'PARTIAL' ? init.BALANCE_CENTS : null,
      CLOSING_STATUS: init.STATUS || 'UNKNOWN',
      LOSS_COMPENSATED_CENTS: 0,
      MONTHLY: [],
    };
  }
  const months = [...new Set((monthlyEntries || []).map((e) => e.YEAR_MONTH))].sort();
  for (const ym of months) {
    for (const entry of (monthlyEntries || []).filter((e) => e.YEAR_MONTH === ym)) {
      const bucket = entry.BUCKET;
      const ll = ledger[bucket];
      if (!ll) continue; // unknown buckets never leak into known ones
      const net = entry.NET_CENTS || 0;
      let lossUsed = 0;
      if (compensate && net > 0 && ll.CLOSING_BALANCE_CENTS !== null) {
        lossUsed = Math.min(net, ll.CLOSING_BALANCE_CENTS);
      }
      const monthLoss = net < 0 ? -net : 0;
      const closing = ll.CLOSING_BALANCE_CENTS === null ? null : ll.CLOSING_BALANCE_CENTS - lossUsed + monthLoss;
      ll.LOSS_COMPENSATED_CENTS += lossUsed;
      if (closing !== null) {
        ll.CLOSING_BALANCE_CENTS = closing;
        ll.CLOSING_STATUS = closing > 0 ? 'PARTIAL' : 'CERTIFIED';
      } else if (monthLoss > 0) {
        // losses accrue even when the initial balance is unknown, but stay
        // non-authoritative: CLOSING stays UNKNOWN-anchored
        ll.CLOSING_STATUS = ll.OPENING_STATUS === 'UNKNOWN' ? 'UNKNOWN' : ll.CLOSING_STATUS;
        ll.UNKNOWN_ACCRUED_LOSS_CENTS = (ll.UNKNOWN_ACCRUED_LOSS_CENTS || 0) + monthLoss;
      }
      ll.MONTHLY.push({
        YEAR_MONTH: ym,
        CURRENT_MONTH_LOSS_CENTS: monthLoss,
        LOSS_COMPENSATED_CENTS: lossUsed,
        CARRY_FORWARD_CENTS: closing,
        STATUS: closing === null ? (ll.OPENING_STATUS === 'UNKNOWN' ? 'UNKNOWN' : 'PARTIAL') : (closing > 0 ? 'PARTIAL' : 'CERTIFIED'),
      });
    }
  }
  return { BUCKETS, LEDGER: Object.values(ledger) };
}

/** Promotion of initial balances from a LOSS_CARRYFORWARD_REPORT document. */
function promoteInitialLosses({ ingested }) {
  const proposals = [];
  if (!ingested || !ingested.ACCEPTED || ingested.DOCUMENT_TYPE !== 'LOSS_CARRYFORWARD_REPORT') {
    return { PROMOTIONS: [], REASON: 'DOCUMENT_TYPE_NOT_LOSS_REPORT' };
  }
  for (const rec of ingested.RECORDS) {
    const rawBucket = rec.RAW && BUCKETS.includes(rec.RAW.bucket) ? rec.RAW.bucket : null;
    const bucket = rawBucket || (BUCKETS.includes(rec.ASSET_INPUT) ? rec.ASSET_INPUT : null);
    if (!bucket || rec.LOSS_BALANCE === null) continue;
    proposals.push({
      BUCKET: bucket,
      PROPOSED_BALANCE_CENTS: Math.round(rec.LOSS_BALANCE * 100),
      PROPOSED_STATUS: 'CERTIFIED',
      EVIDENCE_ROWS: [rec.EVIDENCE_ROW_ID],
      DOCUMENT_SHA256: ingested.CONTENT_SHA256,
      NOTE: rec.LOSS_BALANCE < 0 ? 'NEGATIVE_BALANCE_IS_DATA: losses are stored positive; sign convention violation goes to human review' : null,
    });
  }
  return { PROMOTIONS: proposals };
}

module.exports = { BUCKETS, bucketOf, advanceLossLedger, promoteInitialLosses };
