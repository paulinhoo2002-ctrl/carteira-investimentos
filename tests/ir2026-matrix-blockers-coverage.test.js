'use strict';

// IR2026 — P11 day-trade match groups + P18 blockers + P17 coverage +
// productized matrix fields (synthetic fixtures only).

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDayTradeMatchGroups } = require('../ir2026/day-trade');
const { BLOCKERS, isBlockerCode, checklistFromBlockers } = require('../ir2026/blockers');
const { buildFiscalCoverage } = require('../ir2026/coverage');
const { buildOpeningV1 } = require('../ir2026/opening-v1');
const { loadRegistry } = require('../ir2026/rules');

let seq = 0;
function ev(over) {
  seq += 1;
  return { CANONICAL_ID: 'dt' + String(seq).padStart(3, '0'), DATE: '2026-06-01', TICKER: 'DEMO4',
    TYPE: 'BUY', DIRECTION: 'Debito', QUANTITY: 10, UNIT_PRICE: 100, AMOUNT: 1000,
    STATUS: 'CERTIFIED', CONFIDENCE: 'HIGH', MOVEMENT_RAW: 'Transferência - Liquidação',
    PROVENANCE: 'synthetic', SOURCE_ROW_IDS: ['s:' + seq], SOURCE_COUNT: 1, ...over };
}

test('P11: exact single match group', () => {
  const g = buildDayTradeMatchGroups([
    ev({ TYPE: 'BUY', QUANTITY: 100 }),
    ev({ TYPE: 'SELL', QUANTITY: 100 }),
  ], 2026);
  assert.equal(g.DAY_TRADE_MATCH_GROUPS.length, 1);
  assert.equal(g.DAY_TRADE_MATCH_GROUPS[0].STATUS, 'DAY_TRADE_EXACT');
  assert.equal(g.DAY_TRADE_MATCH_GROUPS[0].MATCHED_QTY, 100);
  assert.equal(g.DAY_TRADE_MATCH_GROUPS[0].UNMATCHED_INTRADAY_QTY, 0);
});

test('P11: partial fills across multiple buys match FIFO', () => {
  const b1 = ev({ TYPE: 'BUY', QUANTITY: 30 });
  const b2 = ev({ TYPE: 'BUY', QUANTITY: 30 });
  const s1 = ev({ TYPE: 'SELL', QUANTITY: 45 });
  const g = buildDayTradeMatchGroups([b1, b2, s1], 2026);
  const group = g.DAY_TRADE_MATCH_GROUPS[0];
  assert.equal(group.MATCHED_QTY, 45);
  assert.equal(group.MATCHES[0].BUY_EVENT_ID, b1.CANONICAL_ID);
  assert.equal(group.MATCHES[0].MATCHED_QTY, 30);
  assert.equal(group.MATCHES[1].BUY_EVENT_ID, b2.CANONICAL_ID);
  assert.equal(group.MATCHES[1].MATCHED_QTY, 15);
});

test('P11: sell beyond same-day buys records swing remainder', () => {
  const g = buildDayTradeMatchGroups([
    ev({ TYPE: 'BUY', QUANTITY: 20 }),
    ev({ TYPE: 'SELL', QUANTITY: 50 }),
  ], 2026);
  const group = g.DAY_TRADE_MATCH_GROUPS[0];
  assert.equal(group.STATUS, 'DAY_TRADE_PARTIAL_WITH_SWING_REMAINDER');
  assert.equal(group.MATCHED_QTY, 20);
  assert.equal(group.UNMATCHED_INTRADAY_QTY, 30);
});

test('P11: buy beyond sells records unmatched buy remainder', () => {
  const g = buildDayTradeMatchGroups([
    ev({ TYPE: 'BUY', QUANTITY: 80 }),
    ev({ TYPE: 'SELL', QUANTITY: 30 }),
  ], 2026);
  const group = g.DAY_TRADE_MATCH_GROUPS[0];
  const buyRemainder = group.MATCHES.find((m) => m.BUY_EVENT_ID && m.UNMATCHED_INTRADAY_QTY);
  assert.equal(buyRemainder.UNMATCHED_INTRADAY_QTY, 50);
});

test('P11: different assets on the same day never cross-match', () => {
  const g = buildDayTradeMatchGroups([
    ev({ TYPE: 'BUY', TICKER: 'DEMO4', QUANTITY: 10 }),
    ev({ TYPE: 'SELL', TICKER: 'DEMO11', QUANTITY: 10 }),
  ], 2026);
  assert.equal(g.DAY_TRADE_MATCH_GROUPS.length, 0);
});

test('P18: blocker taxonomy codes are stable and documented', () => {
  for (const code of ['MISSING_OPENING_COST', 'MISSING_OPENING_QTY', 'MISSING_SALE_AMOUNT', 'MISSING_FEES',
    'MISSING_IRRF', 'MISSING_PRIOR_LOSS', 'CORPORATE_ACTION_UNRESOLVED', 'TRANSFER_COST_UNKNOWN',
    'ASSET_CLASS_UNKNOWN', 'SOURCE_CONFLICT', 'SOURCE_DATE_MISMATCH', 'LENDING_CUSTODY_UNPRICED']) {
    assert.ok(isBlockerCode(code), code + ' must be a stable code');
    assert.ok(BLOCKERS[code].TITLE);
    assert.ok(BLOCKERS[code].RESOLVED_BY.length);
  }
  assert.equal(isBlockerCode('NOT_A_CODE'), false);
});

test('P18/P20: checklist orders by affected count and merges duplicates', () => {
  const list = checklistFromBlockers({ MISSING_IRRF: 10, MISSING_FEES: 3, MISSING_FEES: 3, BOGUS_CODE: 5 });
  assert.equal(list[0].CODE, 'MISSING_IRRF');
  assert.equal(list[0].TOTAL_AFFECTED, 10);
  assert.equal(list.length, 2); // bogus code ignored
});

test('P17: coverage metrics expose count and value dimensions', () => {
  const cov = buildFiscalCoverage({
    opening: { OPENING_COVERAGE: { OPENING_HELD_CANDIDATES: 32, OPENING_CERTIFIED: 0, OPENING_DERIVED: 7, OPENING_PARTIAL: 20, OPENING_UNKNOWN: 5, OPENING_COST_COVERAGE_PERCENT: 84.38, OPENING_COST_CLEAN_DERIVED_PERCENT: 21.88 } },
    matrix: { ROWS: [
      { CERTIFICATION_STATUS: 'DERIVED_SIMULATION', SELL_VALUE_CENTS: 17137023 },
      { CERTIFICATION_STATUS: 'BLOCKED', SELL_VALUE_CENTS: 3246423 },
    ] },
    monthlyCloses: [{ SOURCE_COVERAGE: 1, UNKNOWN_BLOCKERS: 0 }, { SOURCE_COVERAGE: 0.5, UNKNOWN_BLOCKERS: 2 }],
  });
  assert.equal(cov.OPENING_ASSET_COVERAGE.COUNT_PERCENT, 84.38);
  assert.equal(cov.SALES_COUNT_COVERAGE.COUNT_PERCENT, 50);
  assert.equal(cov.SALES_VALUE_COVERAGE.VALUE_PERCENT, 84.07);
  assert.equal(cov.MONTHLY_CLOSE_COVERAGE.COMPLETE, 1);
  assert.equal(cov.MONTHLY_CLOSE_COVERAGE.PERCENT, 50);
  assert.equal(cov.LOSS_CARRY_COVERAGE.STATUS, 'UNKNOWN');
});

test('P6/P7: productized matrix rows carry sale_id, day-trade detail and stable blocker codes', () => {
  const rawEvents = [
    ev({ DATE: '2025-06-01', TYPE: 'BUY', QUANTITY: 50, AMOUNT: 5000 }),
    ev({ DATE: '2026-07-01', TYPE: 'SELL', QUANTITY: 20, AMOUNT: 2600 }),
    // custody-signature sell: same-day loan + unpriced sell (P7 signature)
    ev({ DATE: '2026-08-01', TYPE: 'SELL', QUANTITY: 30, AMOUNT: null }),
    ev({ DATE: '2026-08-01', TYPE: 'STOCK_LOAN', QUANTITY: 30, AMOUNT: null }),
  ];
  const v1 = buildOpeningV1({ rawEvents, anchors: {}, registry: loadRegistry() });
  const priced = v1.SALES_FORENSIC_MATRIX.ROWS.find((r) => r.SALE_ID && r.GROSS_AMOUNT_CENTS !== null);
  const custody = v1.SALES_FORENSIC_MATRIX.ROWS.find((r) => r.BLOCKER_CODES.includes('LENDING_CUSTODY_UNPRICED'));
  assert.ok(priced);
  assert.equal(priced.CERTIFICATION_STATUS, 'DERIVED_SIMULATION');
  assert.equal(priced.FEES_STATUS, 'MISSING_FEES');
  assert.equal(priced.IRRF_STATUS, 'UNKNOWN');
  assert.ok(priced.SOURCE_REFS.length >= 1);
  assert.ok(custody, 'unpriced sell with same-day equal-qty loan must carry LENDING_CUSTODY_UNPRICED');
  assert.ok(custody.BLOCKER_CODES.includes('MISSING_SALE_AMOUNT'));
  assert.equal(v1.SALES_FORENSIC_MATRIX.SALES_CUSTODY_SIGNATURE, 1);
  assert.ok(v1.DOCUMENT_CHECKLIST.length >= 1);
  assert.ok(v1.FISCAL_COVERAGE.SALES_COUNT_COVERAGE);
  assert.equal(v1.DAY_TRADE.MATCH_GROUPS.length, 0); // no same-day buy+sell in this fixture
});

test('P19 invariants: never display unknown as zero — matrix keeps null, checklist explains', () => {
  const rawEvents = [
    ev({ DATE: '2026-01-05', TYPE: 'SELL', QUANTITY: 5, AMOUNT: null }), // unpriced, no pair
    ev({ DATE: '2026-01-05', TYPE: 'BUY', QUANTITY: 5, AMOUNT: 500 }),
  ];
  const v1 = buildOpeningV1({ rawEvents, anchors: {}, registry: loadRegistry() });
  const row = v1.SALES_FORENSIC_MATRIX.ROWS[0];
  assert.equal(row.GROSS_AMOUNT_CENTS, null); // never priced from market
  assert.equal(row.NET_AMOUNT_CENTS, null);
  assert.equal(row.REALIZED_RESULT_CENTS, null);
  assert.equal(row.SIMULATED_DERIVED_REALIZED_CENTS, null);
  assert.equal(row.BLOCKER_CODES.includes('MISSING_SALE_AMOUNT'), true);
});
