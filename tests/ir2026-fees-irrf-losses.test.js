'use strict';

// IR2026 — P8 fees + P9 IRRF + P10 losses engine tests (synthetic).

const test = require('node:test');
const assert = require('node:assert/strict');
const { allocateItemized, allocateTotalFee, feesCoverage, ALLOCATION_METHODS } = require('../ir2026/fees');
const { buildIrrfLedger } = require('../ir2026/irrf');
const { advanceLossLedger, promoteInitialLosses, bucketOf, BUCKETS } = require('../ir2026/losses');
const { ingestDocument } = require('../ir2026/ingest');

const trades = () => [
  { trade_id: 't1', gross_cents: 100000 },
  { trade_id: 't2', gross_cents: 300000 },
  { trade_id: 't3', gross_cents: 0 },
];

test('P8: itemized fees attach per trade with CERTIFIED status', () => {
  const out = allocateItemized(trades(), [{ trade_ref: 't1', fees_cents: 500, source: 'note#1' }]);
  assert.equal(out.find((t) => t.trade_id === 't1').FEES_CENTS, 500);
  assert.equal(out.find((t) => t.trade_id === 't1').FEES_STATUS, 'CERTIFIED');
  assert.equal(out.find((t) => t.trade_id === 't2').FEES_CENTS, null);
  assert.equal(out.find((t) => t.trade_id === 't2').FEES_STATUS, 'MISSING_FEES');
});

test('P8: total-only note allocates pro-rata by gross and preserves the sum exactly', () => {
  const out = allocateTotalFee(trades(), 1000, 'note#7');
  const sum = out.reduce((s, t) => s + (t.FEES_CENTS || 0), 0);
  assert.equal(sum, 1000);
  assert.equal(out.find((t) => t.trade_id === 't1').FEES_ALLOCATION_METHOD, ALLOCATION_METHODS.PRO_RATA_GROSS);
  assert.equal(out.find((t) => t.trade_id === 't3').FEES_STATUS, 'NOT_APPLICABLE'); // zero-gross trade
  assert.ok(out.find((t) => t.trade_id === 't1').FEES_CENTS < out.find((t) => t.trade_id === 't2').FEES_CENTS);
});

test('P8: deterministic remainder lands on the first eligible trade', () => {
  const a = allocateTotalFee(trades(), 999, 'n');
  const b = allocateTotalFee(trades(), 999, 'n');
  assert.deepEqual(a.map((t) => t.FEES_CENTS), b.map((t) => t.FEES_CENTS));
  assert.equal(a.reduce((s, t) => s + (t.FEES_CENTS || 0), 0), 999);
});

test('P8: fees coverage reports count and value dimensions', () => {
  const out = allocateTotalFee(trades(), 1000, 'n');
  const cov = feesCoverage(out.filter((t) => t.trade_id !== 't3'));
  assert.equal(cov.FEES_STATUS, 'COVERED');
  assert.equal(cov.FEES_COVERAGE_VALUE_PERCENT, 100);
  const none = feesCoverage(trades());
  assert.equal(none.FEES_STATUS, 'MISSING_FEES');
  assert.equal(none.FEES_COVERAGE_COUNT_PERCENT, 0);
});

test('P9: statement total equal to event sum certifies the month bucket', () => {
  const led = buildIrrfLedger({
    eventEntries: [{ YEAR_MONTH: '2026-03', BUCKET: 'SWING_TRADE', AMOUNT_CENTS: 4500, CONFIDENCE: 'CERTIFIED', SOURCE: 'mov' }],
    statementEntries: [{ YEAR_MONTH: '2026-03', BUCKET: 'SWING_TRADE', AMOUNT_CENTS: 4500, SOURCE: 'ir-mar' }],
  });
  const row = led.ROWS[0];
  assert.equal(row.STATUS, 'IRRF_CERTIFIED');
  assert.equal(row.AMOUNT_CENTS, 4500);
  assert.equal(row.BLOCKER, null);
});

test('P9: statement != event sum is IRRF_CONFLICT, never auto-fixed', () => {
  const led = buildIrrfLedger({
    eventEntries: [{ YEAR_MONTH: '2026-03', BUCKET: 'DAY_TRADE', AMOUNT_CENTS: 1000, CONFIDENCE: 'CERTIFIED', SOURCE: 'mov' }],
    statementEntries: [{ YEAR_MONTH: '2026-03', BUCKET: 'DAY_TRADE', AMOUNT_CENTS: 1300, SOURCE: 'ir-mar' }],
  });
  assert.equal(led.ROWS[0].STATUS, 'IRRF_CONFLICT');
  assert.equal(led.ROWS[0].MISMATCH_CENTS, 300);
  assert.equal(led.ROWS[0].BLOCKER, 'SOURCE_CONFLICT');
});

test('P9: buckets never mix (swing month unaffected by day-trade month)', () => {
  const led = buildIrrfLedger({
    eventEntries: [{ YEAR_MONTH: '2026-03', BUCKET: 'DAY_TRADE', AMOUNT_CENTS: 100, CONFIDENCE: 'CERTIFIED', SOURCE: 's' }],
    statementEntries: [{ YEAR_MONTH: '2026-03', BUCKET: 'SWING_TRADE', AMOUNT_CENTS: 200, SOURCE: 'ir' }],
  });
  const day = led.ROWS.find((r) => r.BUCKET === 'DAY_TRADE');
  const swing = led.ROWS.find((r) => r.BUCKET === 'SWING_TRADE');
  assert.equal(day.AMOUNT_CENTS, 100); // events only
  assert.equal(swing.AMOUNT_CENTS, 200); // statement only
});

test('P9: no evidence stays IRRF_UNKNOWN with blocker (never zero)', () => {
  const led = buildIrrfLedger({ eventEntries: [], statementEntries: [] });
  assert.equal(led.SUMMARY.STATUS, 'UNKNOWN');
  const led2 = buildIrrfLedger({ eventEntries: [{ YEAR_MONTH: '2026-05', BUCKET: 'SWING_TRADE', AMOUNT_CENTS: null, CONFIDENCE: 'UNKNOWN', SOURCE: 's' }] });
  assert.equal(led2.ROWS[0].STATUS, 'IRRF_UNKNOWN');
  assert.equal(led2.ROWS[0].BLOCKER, 'MISSING_IRRF');
});

test('P10: bucketOf separates stock swing, day trade, FII and ETF/BDR', () => {
  assert.equal(bucketOf('BRAZIL_STOCK', false), 'RV_STOCK_SWING');
  assert.equal(bucketOf('BRAZIL_STOCK', true), 'RV_STOCK_DAY_TRADE');
  assert.equal(bucketOf('FII', false), 'RV_FII');
  assert.equal(bucketOf('ETF_BR', false), 'RV_ETF_BDR');
  assert.equal(bucketOf('MYSTERY_CLASS', false), null); // unknown class never leaks into stock buckets
});

test('P10: certified opening loss compensates same-bucket gains only', () => {
  const led = advanceLossLedger({
    initialStates: { RV_STOCK_SWING: { BALANCE_CENTS: 50000, STATUS: 'CERTIFIED' } },
    monthlyEntries: [
      { BUCKET: 'RV_STOCK_SWING', YEAR_MONTH: '2026-01', NET_CENTS: 20000 },
      { BUCKET: 'RV_FII', YEAR_MONTH: '2026-01', NET_CENTS: 10000 },
    ],
  });
  const swing = led.LEDGER.find((l) => l.BUCKET === 'RV_STOCK_SWING');
  const fii = led.LEDGER.find((l) => l.BUCKET === 'RV_FII');
  assert.equal(swing.LOSS_COMPENSATED_CENTS, 20000);
  assert.equal(swing.CLOSING_BALANCE_CENTS, 30000);
  assert.equal(fii.LOSS_COMPENSATED_CENTS, 0); // cross-bucket compensation forbidden
  assert.equal(fii.CLOSING_BALANCE_CENTS, null); // FII had no certified opening
});

test('P10: UNKNOWN opening keeps closing UNKNOWN even with month losses', () => {
  const led = advanceLossLedger({
    initialStates: {},
    monthlyEntries: [{ BUCKET: 'RV_STOCK_SWING', YEAR_MONTH: '2026-02', NET_CENTS: -5000 }],
  });
  const swing = led.LEDGER.find((l) => l.BUCKET === 'RV_STOCK_SWING');
  assert.equal(swing.OPENING_STATUS, 'UNKNOWN');
  assert.equal(swing.CLOSING_STATUS, 'UNKNOWN');
  assert.equal(swing.UNKNOWN_ACCRUED_LOSS_CENTS, 5000); // tracked, never authoritative
});

test('P10: loss report evidence proposes certified initial balances', () => {
  const doc = ingestDocument({ name: 'prejuizo', type: 'LOSS_CARRYFORWARD_REPORT', rows: [{ bucket: 'RV_STOCK_SWING', prejuizo: 1200 }] , knownAssets: [] });
  const p = promoteInitialLosses({ ingested: doc });
  assert.equal(p.PROMOTIONS[0].BUCKET, 'RV_STOCK_SWING');
  assert.equal(p.PROMOTIONS[0].PROPOSED_BALANCE_CENTS, 120000);
  assert.equal(p.PROMOTIONS[0].PROPOSED_STATUS, 'CERTIFIED');
});

test('P10: negative loss balance is flagged for human review, not silently flipped', () => {
  const doc = ingestDocument({ name: 'prejuizo', type: 'LOSS_CARRYFORWARD_REPORT', rows: [{ bucket: 'RV_FII', prejuizo: -300 }], knownAssets: [] });
  const p = promoteInitialLosses({ ingested: doc });
  assert.match(p.PROMOTIONS[0].NOTE, /human review/);
});

test('P10: all buckets present and no universal bucket', () => {
  assert.deepEqual([...BUCKETS], ['RV_STOCK_SWING', 'RV_STOCK_DAY_TRADE', 'RV_FII', 'RV_ETF_BDR']);
});
