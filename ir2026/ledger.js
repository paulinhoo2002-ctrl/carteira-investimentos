'use strict';
// ============================================================================
// IR2026 — Ledger orchestrator: OPENING + EVENTS → TAX_LEDGER_2026 (P8),
// monthly close (P17/P18), loss carryforward ledger (P19), withholding
// registry (P20), income ledger (P15), annual close (P23), OPENING_2027 (P24).
// ============================================================================

const { applyEvent, normalizeEvent, summary, saleBucket } = require('./tax-ledger');
const { sha256Json } = require('./hash');
const { TAX_BUCKETS } = require('./contracts');

const SELL_LIKE = new Set(['SELL', 'RIGHTS_TRANSFER']);
const INCOME_BUCKETS = new Set(['INCOME_DIVIDEND', 'INCOME_JCP', 'INCOME_AMORTIZATION', 'INCOME_LENDING']);

function sortEvents(events) {
  return [...events].sort((a, b) => {
    if (a.DATE !== b.DATE) return a.DATE < b.DATE ? -1 : 1;
    return String(a.EVENT_ID) < String(b.EVENT_ID) ? -1 : 1;
  });
}

function statesFromOpening(opening) {
  const states = {};
  for (const row of (opening.ROWS || [])) {
    states[row.ASSET] = {
      ASSET: row.ASSET,
      ASSET_CLASS: row.ASSET_CLASS,
      CLASSIFICATION_BASIS: row.CLASSIFICATION_BASIS,
      QTY: row.OPENING_QTY,
      QTY_STATUS: row.QTY_STATUS,
      TOTAL_COST_CENTS: row.OPENING_TOTAL_COST_CENTS,
      COST_STATUS: row.COST_STATUS,
      AVG_COST_CENTS: row.OPENING_TOTAL_COST_CENTS !== null && row.OPENING_QTY
        ? Math.round(row.OPENING_TOTAL_COST_CENTS / row.OPENING_QTY) : null,
      FEES_STATUS: row.FEES_STATUS || 'CERTIFIED',
      OPEN_LOAN_QTY: 0,
      LENDING_CHAIN_INCOMPLETE: false,
      FLAGS: { ...(row.FLAGS || {}) },
    };
  }
  return states;
}

function incomeStatusOf(rec, ev) {
  // P15: RECEIVED only from certified credit evidence; never auto-promoted.
  if (ev.INCOME_STATUS === 'EXCLUDED') return 'EXCLUDED';
  if (ev.INCOME_STATUS === 'EXPECTED' || ev.INCOME_STATUS === 'PROVISIONED') return ev.INCOME_STATUS;
  if (ev.EVIDENCE_STATUS === 'CERTIFIED' && String(ev.DIRECTION || '').toUpperCase().startsWith('CREDIT')) return 'RECEIVED';
  return 'UNKNOWN';
}

function buildTaxLedger({ opening, events, registry, fiscalYear }) {
  const fy = fiscalYear || 2026;
  const normalized = events.map(normalizeEvent);
  const ordered = sortEvents(normalized);
  const states = statesFromOpening(opening);
  const records = [];
  const incomeLedger = {};      // YM → bucket → {RECEIVED_CENTS, UNKNOWN_CENTS, EXCLUDED_CENTS, EVENTS}
  const realizedByMonthBucket = {}; // YM → bucket → {SALES_GROSS, GAIN, LOSS, UNKNOWN_BLOCKERS, EVENTS}
  const withholdingRegistry = [];

  const ctx = { registry, fiscalYear: fy };

  for (const ev of ordered) {
    const rec = applyEvent(states, ev, ctx);
    records.push(rec);
    const ym = ev.YEAR_MONTH;

    if (SELL_LIKE.has(rec.TYPE)) {
      // P17: blocked sells must still appear in their month/bucket with
      // UNKNOWN_BLOCKERS — invisible blockers would fake full coverage.
      // Blocked sells contribute no gross/gain (missing amounts are never priced).
      const st = states[ev.ASSET];
      const bucket = rec.BUCKET || (st ? saleBucket(st.ASSET_CLASS, ev.CORP_DAY_TRADE === true) : null);
      if (bucket) {
        const b = (realizedByMonthBucket[ym] = realizedByMonthBucket[ym] || {});
        const mb = (b[bucket] = b[bucket] || { SALES_GROSS_CENTS: 0, GAIN_CENTS: 0, LOSS_CENTS: 0, UNKNOWN_BLOCKERS: 0, EVENTS: 0 });
        mb.EVENTS += 1;
        if (rec.PROCESSING === 'BLOCKED_UNKNOWN') { mb.UNKNOWN_BLOCKERS += 1; }
        else {
          mb.SALES_GROSS_CENTS += rec.GROSS_CENTS || 0;
          if (rec.REALIZED >= 0) mb.GAIN_CENTS += rec.REALIZED; else mb.LOSS_CENTS += -rec.REALIZED;
        }
      }
    }

    const isIncome = (rec.BUCKET && (INCOME_BUCKETS.has(rec.BUCKET) || rec.BUCKET === 'RF_INCOME'));
    if (isIncome) {
      const inc = (incomeLedger[ym] = incomeLedger[ym] || {});
      const ib = (inc[rec.BUCKET] = inc[rec.BUCKET] || { RECEIVED_CENTS: 0, UNKNOWN_CENTS: 0, EXCLUDED_CENTS: 0, EXPECTED_CENTS: 0, PROVISIONED_CENTS: 0, EVENTS: 0 });
      const status = incomeStatusOf(rec, ev);
      const amountCents = rec.BUCKET === 'RF_INCOME' ? rec.RF_INTEREST_CENTS : rec.GROSS_CENTS;
      ib.EVENTS += 1;
      if (amountCents === null || status === 'UNKNOWN') ib.UNKNOWN_CENTS += (amountCents || 0); // unknown amount stays in UNKNOWN, never received
      else if (status === 'EXCLUDED') ib.EXCLUDED_CENTS += amountCents;
      else if (status === 'EXPECTED') ib.EXPECTED_CENTS += amountCents;
      else if (status === 'PROVISIONED') ib.PROVISIONED_CENTS += amountCents;
      else ib.RECEIVED_CENTS += amountCents;
      ib[status + '_EVENTS'] = (ib[status + '_EVENTS'] || 0) + 1;
    }

    withholdingRegistry.push({
      TYPE: 'IRRF',
      AMOUNT_CENTS: ev.WITHHOLDING_CENTS,
      DATE: ev.DATE,
      ASSET: ev.ASSET,
      SOURCE: ev.SOURCE,
      CONFIDENCE: ev.WITHHOLDING_STATUS, // UNKNOWN until source evidence exists (P20)
      EVENT_ID: ev.EVENT_ID,
    });
  }

  // --- Monthly close (P17) with bucket separation (P18) ---
  const months = Object.keys(realizedByMonthBucket).sort();
  const monthlyCloses = [];
  const lossLedger = {};
  for (const bucket of TAX_BUCKETS) {
    lossLedger[bucket] = {
      BUCKET: bucket,
      OPENING_LOSS_BALANCE_CENTS: null,
      OPENING_STATUS: 'UNKNOWN',
      OPENING_REASON: 'PRE_FISCAL_CARRYFORWARD_REQUIRES_PRIOR_YEAR_DECLARATION_EVIDENCE',
      MONTHLY: [],
      CLOSING_KNOWN_CENTS: 0,
      CLOSING_STATUS: 'UNKNOWN',
      LOSS_COMPENSATED_CENTS: 0,
    };
  }
  for (const ym of months) {
    for (const bucket of Object.keys(realizedByMonthBucket[ym]).sort()) {
      const mb = realizedByMonthBucket[ym][bucket];
      const ll = lossLedger[bucket];
      const monthNet = mb.GAIN_CENTS - mb.LOSS_CENTS;
      const monthLoss = monthNet < 0 ? -monthNet : 0;
      const closingKnown = ll.CLOSING_KNOWN_CENTS + monthLoss;
      ll.MONTHLY.push({ YEAR_MONTH: ym, CURRENT_MONTH_LOSS_CENTS: monthLoss });
      ll.CLOSING_KNOWN_CENTS = closingKnown;
      ll.CLOSING_STATUS = closingKnown > 0 ? 'PARTIAL' : (ll.OPENING_STATUS === 'UNKNOWN' ? 'UNKNOWN' : 'CERTIFIED');
      monthlyCloses.push({
        YEAR_MONTH: ym,
        BUCKET: bucket,
        SALES_GROSS_CENTS: mb.SALES_GROSS_CENTS,
        REALIZED_GAIN_CENTS: mb.GAIN_CENTS,
        REALIZED_LOSS_CENTS: mb.LOSS_CENTS,
        WITHHOLDING_CENTS: null,
        WITHHOLDING_STATUS: 'UNKNOWN',          // P9/P20: no withholding evidence in the export
        FEES_CENTS: null,                        // P8: itemized fees absent from the movement export
        FEES_STATUS: 'MISSING_FEES',
        TAXABLE_BASE_CENTS: monthNet, // netted base; exemption/rate rules NOT applied
        EXEMPTION_STATUS: 'NOT_ASSESSED_RULES_UNCERTIFIED',
        TAX_DUE: 'NOT_CALCULATED',   // P17: never definitive until rules certified
        OPENING_LOSS_CARRY_CENTS: closingKnown - monthLoss,
        OPENING_LOSS_CARRY_STATUS: ll.OPENING_STATUS,
        LOSS_USED_CENTS: 0,                      // P19: compensation stays zero while prior losses are UNKNOWN
        LOSS_USED_STATUS: ll.OPENING_STATUS === 'UNKNOWN' ? 'UNKNOWN_PRIOR_LOSSES' : 'CERTIFIED',
        CARRY_FORWARD_LOSSES_CENTS: closingKnown,
        CARRY_FORWARD_STATUS: ll.CLOSING_STATUS,
        UNKNOWN_BLOCKERS: mb.UNKNOWN_BLOCKERS,
        STATUS: mb.UNKNOWN_BLOCKERS === 0 ? 'SIMULATION_ONLY' : (mb.UNKNOWN_BLOCKERS === mb.EVENTS ? 'BLOCKED' : 'PARTIAL'),
        SOURCE_COVERAGE: mb.EVENTS ? (mb.EVENTS - mb.UNKNOWN_BLOCKERS) / mb.EVENTS : null,
      });
    }
  }

  // --- Annual close (P23) ---
  const closingStates = {};
  for (const [asset, st] of Object.entries(states)) closingStates[asset] = summary(st);
  const eventCounts = {
    TOTAL: records.length,
    APPLIED: records.filter((r) => r.PROCESSING && r.PROCESSING.startsWith('APPLIED')).length,
    BLOCKED: records.filter((r) => r.PROCESSING === 'BLOCKED_UNKNOWN').length,
    UNKNOWN_IMPACT: records.filter((r) => r.IMPACT_FLAGS.includes('AFFECTS_IR')).length,
  };
  const incomeTotals = {};
  for (const ym of Object.keys(incomeLedger)) {
    for (const [bucket, v] of Object.entries(incomeLedger[ym])) {
      const t = (incomeTotals[bucket] = incomeTotals[bucket] || { RECEIVED_CENTS: 0, UNKNOWN_CENTS: 0, EXCLUDED_CENTS: 0, EVENTS: 0 });
      t.RECEIVED_CENTS += v.RECEIVED_CENTS; t.UNKNOWN_CENTS += v.UNKNOWN_CENTS;
      t.EXCLUDED_CENTS += v.EXCLUDED_CENTS; t.EVENTS += v.EVENTS;
    }
  }
  const realizedTotals = {};
  for (const c of monthlyCloses) {
    const t = (realizedTotals[c.BUCKET] = realizedTotals[c.BUCKET] || { SALES_GROSS_CENTS: 0, GAIN_CENTS: 0, LOSS_CENTS: 0, UNKNOWN_BLOCKERS: 0 });
    t.SALES_GROSS_CENTS += c.SALES_GROSS_CENTS; t.GAIN_CENTS += c.REALIZED_GAIN_CENTS;
    t.LOSS_CENTS += c.REALIZED_LOSS_CENTS; t.UNKNOWN_BLOCKERS += c.UNKNOWN_BLOCKERS;
  }

  const annualClose = {
    FISCAL_YEAR: fy,
    OPENING_FISCAL_SHA256: opening.SHA256 || null,
    EVENT_COUNTS: eventCounts,
    REALIZED_BY_BUCKET: realizedTotals,
    INCOME_BY_BUCKET: incomeTotals,
    WITHHOLDING: { STATUS: 'UNKNOWN', EVIDENCED_ENTRIES: 0 },
    TAXES: 'NOT_CALCULATED_RULES_UNCERTIFIED',
    LOSS_CARRYFORWARD: Object.values(lossLedger).map((l) => ({
      BUCKET: l.BUCKET, OPENING_STATUS: l.OPENING_STATUS,
      CLOSING_KNOWN_CENTS: l.CLOSING_KNOWN_CENTS, CLOSING_STATUS: l.CLOSING_STATUS,
    })),
    CLOSING_FISCAL_STATE_SHA256: sha256Json(closingStates),
    UNKNOWN_ITEMS: records.filter((r) => r.PROCESSING === 'BLOCKED_UNKNOWN').map((r) => ({
      EVENT_ID: r.EVENT_ID, DATE: r.DATE, ASSET: r.ASSET, TYPE: r.TYPE, REASON: r.BLOCK_REASON, IMPACT: r.IMPACT_FLAGS,
    })),
    COVERAGE: eventCounts.TOTAL ? eventCounts.APPLIED / eventCounts.TOTAL : null,
  };
  annualClose.ANNUAL_CLOSE_SHA256 = sha256Json(annualClose);

  // --- OPENING_FISCAL_2027 (P24): 2027 must not replay 2019-2026 ---
  const opening2027 = {
    FISCAL_YEAR: 2027,
    DERIVED_FROM_ANNUAL_CLOSE_SHA256: annualClose.ANNUAL_CLOSE_SHA256,
    NOTE: 'Opening 2027 = closing fiscal state of the 2026 annual close. Requires annual close certification before fiscal use.',
    ROWS: Object.entries(closingStates).map(([asset, st]) => ({
      ASSET: asset, ASSET_CLASS: st.ASSET_CLASS,
      OPENING_QTY: st.QTY, QTY_STATUS: st.QTY_STATUS,
      OPENING_TOTAL_COST_CENTS: st.TOTAL_COST_CENTS, COST_STATUS: st.COST_STATUS,
      FLAGS: st.FLAGS,
    })),
  };
  opening2027.SHA256 = sha256Json(opening2027.ROWS);

  const ledger = {
    FISCAL_YEAR: fy,
    INPUT_EVENT_COUNT: ordered.length,
    OPENING_SHA256: opening.SHA256 || null,
    STATES: closingStates,
    PROCESSING_RECORDS: records,
    MONTHLY_CLOSES: monthlyCloses,
    LOSS_LEDGER: Object.values(lossLedger),
    INCOME_LEDGER: incomeLedger,
    WITHHOLDING_REGISTRY_SUMMARY: {
      ENTRIES: withholdingRegistry.length,
      EVIDENCED: withholdingRegistry.filter((w) => w.CONFIDENCE !== 'UNKNOWN').length,
      STATUS: 'UNKNOWN',
    },
    ANNUAL_CLOSE: annualClose,
    OPENING_2027: opening2027,
  };
  ledger.LEDGER_SHA256 = sha256Json({
    OPENING: ledger.OPENING_SHA256,
    RECORDS: records.map((r) => sha256Json(r)),
    MONTHLY_CLOSES: monthlyCloses,
    LOSS_LEDGER: ledger.LOSS_LEDGER,
    ANNUAL: annualClose.ANNUAL_CLOSE_SHA256,
  });
  return ledger;
}

module.exports = { buildTaxLedger, sortEvents, statesFromOpening, incomeStatusOf };
