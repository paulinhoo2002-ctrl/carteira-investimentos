'use strict';
// ============================================================================
// IR2026 — P9: IRRF engine. Buckets are never mixed: SWING_TRADE, DAY_TRADE,
// OTHER. Evidence statuses CERTIFIED/PARTIAL/UNKNOWN; monthly reconciliation
// detects statement-total != event-sum. Absence of lines is never zero.
// ============================================================================

const BUCKETS = Object.freeze(['SWING_TRADE', 'DAY_TRADE', 'OTHER']);

function emptyBucket() {
  return { IRRF_CENTS: null, STATUS: 'UNKNOWN', SOURCES: [] };
}

function buildIrrfLedger({ eventEntries, statementEntries }) {
  // eventEntries: [{YEAR_MONTH, BUCKET, AMOUNT_CENTS, SOURCE, CONFIDENCE}]
  const byMonthBucket = new Map();
  for (const e of eventEntries || []) {
    if (!BUCKETS.includes(e.BUCKET)) continue;
    const key = `${e.YEAR_MONTH}|${e.BUCKET}`;
    const cur = byMonthBucket.get(key) || { YEAR_MONTH: e.YEAR_MONTH, BUCKET: e.BUCKET, EVENT_SUM_CENTS: 0, EVENT_STATUS: 'UNKNOWN', SOURCES: [] };
    if (e.AMOUNT_CENTS !== null && e.AMOUNT_CENTS !== undefined) {
      cur.EVENT_SUM_CENTS += e.AMOUNT_CENTS;
      cur.EVENT_STATUS = e.CONFIDENCE === 'CERTIFIED' ? 'CERTIFIED' : (cur.EVENT_STATUS === 'CERTIFIED' ? 'CERTIFIED' : 'PARTIAL');
    }
    cur.SOURCES.push(e.SOURCE || null);
    byMonthBucket.set(key, cur);
  }
  for (const s of statementEntries || []) {
    const key = `${s.YEAR_MONTH}|${s.BUCKET}`;
    const cur = byMonthBucket.get(key) || { YEAR_MONTH: s.YEAR_MONTH, BUCKET: s.BUCKET, EVENT_SUM_CENTS: 0, EVENT_STATUS: 'UNKNOWN', SOURCES: [] };
    cur.STATEMENT_TOTAL_CENTS = (cur.STATEMENT_TOTAL_CENTS || 0) + (s.AMOUNT_CENTS || 0);
    cur.STATEMENT_STATUS = 'CERTIFIED';
    cur.STATEMENT_SOURCE = s.SOURCE || null;
    byMonthBucket.set(key, cur);
  }
  const rows = [...byMonthBucket.values()].sort((a, b) => (a.YEAR_MONTH + a.BUCKET) < (b.YEAR_MONTH + b.BUCKET) ? -1 : 1)
    .map((r) => {
      const hasStatement = r.STATEMENT_TOTAL_CENTS !== undefined;
      const mismatch = hasStatement && r.EVENT_SUM_CENTS !== r.STATEMENT_TOTAL_CENTS;
      let status;
      if (hasStatement && !mismatch) status = 'IRRF_CERTIFIED';
      else if (mismatch) status = 'IRRF_CONFLICT'; // statement != events: human reconciliation
      else if (r.EVENT_STATUS === 'CERTIFIED') status = 'IRRF_CERTIFIED';
      else if (r.EVENT_STATUS === 'PARTIAL') status = 'IRRF_PARTIAL';
      else status = 'IRRF_UNKNOWN';
      return {
        ...r,
        AMOUNT_CENTS: hasStatement ? r.STATEMENT_TOTAL_CENTS : (r.EVENT_STATUS === 'UNKNOWN' ? null : r.EVENT_SUM_CENTS),
        STATUS: status,
        MISMATCH_CENTS: mismatch ? r.STATEMENT_TOTAL_CENTS - r.EVENT_SUM_CENTS : 0,
        BLOCKER: status === 'IRRF_UNKNOWN' ? 'MISSING_IRRF' : (status === 'IRRF_CONFLICT' ? 'SOURCE_CONFLICT' : null),
      };
    });
  return {
    BUCKETS,
    ROWS: rows,
    SUMMARY: {
      CERTIFIED_MONTHS: rows.filter((r) => r.STATUS === 'IRRF_CERTIFIED').length,
      PARTIAL_MONTHS: rows.filter((r) => r.STATUS === 'IRRF_PARTIAL').length,
      UNKNOWN_MONTHS: rows.filter((r) => r.STATUS === 'IRRF_UNKNOWN').length,
      CONFLICTS: rows.filter((r) => r.STATUS === 'IRRF_CONFLICT').length,
      STATUS: rows.some((r) => r.STATUS === 'IRRF_CONFLICT') ? 'PARTIAL'
        : (rows.length && rows.every((r) => r.STATUS === 'IRRF_CERTIFIED') ? 'CERTIFIED' : 'UNKNOWN'),
    },
  };
}

module.exports = { BUCKETS, buildIrrfLedger };
