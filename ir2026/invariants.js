'use strict';
// IR2026 — Tax ledger invariants (P28). Every check returns PASS/FAIL with
// evidence; a ledger with violations is never certifiable.

const { TAX_BUCKETS } = require('./contracts');

function checkInvariants({ opening, ledger, events }) {
  const checks = [];
  const add = (id, pass, detail) => checks.push({ INVARIANT: id, STATUS: pass ? 'PASS' : 'FAIL', DETAIL: detail });

  const records = ledger.PROCESSING_RECORDS;
  const states = ledger.STATES;

  // 1. opening qty + net fiscal movements = closing qty
  {
    let violations = 0; let checked = 0;
    for (const row of opening.ROWS) {
      const closing = states[row.ASSET];
      if (!closing || row.OPENING_QTY === null || closing.QTY === null) continue;
      let delta = 0;
      for (const r of records) {
        if (r.ASSET !== row.ASSET) continue;
        if (!r.AFTER_STATE || !r.BEFORE_STATE) continue;
        if (r.AFTER_STATE.QTY === null || r.BEFORE_STATE.QTY === null) continue;
        delta += r.AFTER_STATE.QTY - r.BEFORE_STATE.QTY;
      }
      checked += 1;
      if (Math.abs(row.OPENING_QTY + delta - closing.QTY) > 1e-6) violations += 1;
    }
    add('OPENING_PLUS_NET_MOVES_EQUALS_CLOSING', violations === 0, { checked, violations });
  }

  // 2. quantity never silently negative
  {
    const bad = records.filter((r) => r.AFTER_STATE && r.AFTER_STATE.QTY !== null && r.AFTER_STATE.QTY < -1e-9);
    add('QUANTITY_NEVER_NEGATIVE', bad.length === 0, { violations: bad.length, assets: [...new Set(bad.map((r) => r.ASSET))].slice(0, 5) });
  }

  // 3. unknown opening never becomes certified automatically
  {
    const bad = opening.ROWS.filter((r) => r.FLAGS && r.FLAGS.PRE_COVERAGE_NEGATIVE && (r.QTY_STATUS === 'CERTIFIED' || r.COST_STATUS === 'CERTIFIED'));
    add('UNKNOWN_OPENING_NEVER_CERTIFIED', bad.length === 0, { violations: bad.length, assets: bad.map((r) => r.ASSET).slice(0, 5) });
  }

  // 4. cost/qty never NaN
  {
    const bad = [];
    for (const r of records) {
      for (const st of [r.BEFORE_STATE, r.AFTER_STATE]) {
        if (!st) continue;
        if ((st.QTY !== null && !Number.isFinite(st.QTY)) ||
            (st.TOTAL_COST_CENTS !== null && !Number.isFinite(st.TOTAL_COST_CENTS))) bad.push(r.EVENT_ID);
      }
    }
    add('NO_NAN_IN_FISCAL_STATE', bad.length === 0, { violations: bad.length });
  }

  // 5. UNKNOWN != ZERO: blocked sells carry null realized, never zero
  {
    const bad = records.filter((r) => r.PROCESSING === 'BLOCKED_UNKNOWN' && r.TYPE === 'SELL' && r.REALIZED !== null);
    add('BLOCKED_SELL_REALIZED_IS_NULL_NOT_ZERO', bad.length === 0, { violations: bad.length });
  }

  // 6. every asset realizes in exactly one tax bucket; realized records have fiscal basis only
  {
    const bad = records.filter((r) => r.REALIZED !== null && (!r.BUCKET || !TAX_BUCKETS.includes(r.BUCKET) || r.MARKET_PRICE !== undefined));
    add('REALIZED_SINGLE_BUCKET_NO_MARKET_PRICE', bad.length === 0, { violations: bad.length });
  }

  // 7. realized result uses fiscal cost, never current market price
  {
    const bad = records.filter((r) => r.REALIZED !== null && (r.COST_REMOVED_CENTS === null || r.COST_REMOVED_CENTS === undefined));
    add('REALIZED_USES_FISCAL_COST_BASIS', bad.length === 0, { violations: bad.length });
  }

  // 8. no unrealized/current-position result inside fiscal P&L
  {
    const hasUnrealized = JSON.stringify(ledger).includes('UNREALIZED');
    add('NO_UNREALIZED_IN_FISCAL_PNL', !hasUnrealized, { found: hasUnrealized });
  }

  // 9. income RECEIVED only from certified credit evidence
  {
    let violations = 0;
    for (const ym of Object.keys(ledger.INCOME_LEDGER || {})) {
      for (const [bucket, v] of Object.entries(ledger.INCOME_LEDGER[ym])) {
        if (v.RECEIVED_CENTS > 0) {
          const hasEvidence = records.some((r) => r.DATE && r.DATE.startsWith(ym) && r.BUCKET === bucket &&
            r.EVIDENCE_STATUS === 'CERTIFIED');
          if (!hasEvidence) violations += 1;
        }
      }
    }
    add('INCOME_RECEIVED_ONLY_WITH_EVIDENCE', violations === 0, { violations });
  }

  // 10. transfers never generate realized profit
  {
    const transferRealized = records
      .filter((r) => r.TYPE === 'TRANSFER_IN' || r.TYPE === 'TRANSFER_OUT')
      .reduce((s, r) => s + (r.REALIZED || 0), 0);
    add('TRANSFERS_NEVER_REALIZE', transferRealized === 0, { total_realized: transferRealized });
  }

  // 11. no dropped events
  {
    const expected = ledger.INPUT_EVENT_COUNT;
    add('NO_DROPPED_EVENTS', records.length === expected, { records: records.length, expected });
  }

  // 12. asset never present in incompatible buckets in the same month close
  {
    let violations = 0;
    for (const c of ledger.MONTHLY_CLOSES) {
      if (c.BUCKET === 'RV_STOCK_SWING' && c.BUCKET === 'RV_STOCK_DAY_TRADE') violations += 1; // structural tautology guard
    }
    const dayTradeAndSwingSameAssetMonth = new Set();
    const seenAssetMonth = {};
    for (const r of records) {
      if (r.BUCKET && r.BUCKET.startsWith('RV_')) {
        const key = `${r.ASSET}|${r.DATE.slice(0, 7)}`;
        (seenAssetMonth[key] = seenAssetMonth[key] || new Set()).add(r.BUCKET);
      }
    }
    for (const [k, buckets] of Object.entries(seenAssetMonth)) {
      if (buckets.has('RV_STOCK_SWING') && buckets.has('RV_STOCK_DAY_TRADE')) dayTradeAndSwingSameAssetMonth.add(k);
    }
    add('NO_INCOMPATIBLE_BUCKETS_PER_ASSET_MONTH', violations === 0 && dayTradeAndSwingSameAssetMonth.size === 0,
      { violations, mixed: [...dayTradeAndSwingSameAssetMonth].slice(0, 5) });
  }

  const failures = checks.filter((c) => c.STATUS === 'FAIL');
  return { CHECKS: checks, ALL_PASS: failures.length === 0, FAILURES: failures };
}

module.exports = { checkInvariants };
