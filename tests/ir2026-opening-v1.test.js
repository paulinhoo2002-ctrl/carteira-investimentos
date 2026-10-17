'use strict';

// IR2026 — P21 tests for the opening-fiscal-2026-v1 evidence layer and the
// deterministic day-trade detector. Synthetic fixtures only: no real tickers,
// no real financial data.

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildOpeningV1 } = require('../ir2026/opening-v1');
const { detectDayTrade } = require('../ir2026/day-trade');
const { loadRegistry } = require('../ir2026/rules');

let seq = 0;
function ev(over) {
  seq += 1;
  return {
    CANONICAL_ID: 'evt' + String(seq).padStart(4, '0'),
    DATE: '2026-06-01',
    TICKER: 'DEMO4',
    PRODUCT: 'DEMO4 - SYNTHETIC',
    TYPE: 'BUY',
    DIRECTION: 'Debito',
    QUANTITY: 10,
    UNIT_PRICE: 100,
    AMOUNT: 1000,
    CUSTODIAN: 'INTER',
    STATUS: 'CERTIFIED',
    CONFIDENCE: 'HIGH',
    MOVEMENT_RAW: 'Transferência - Liquidação',
    PROVENANCE: 'synthetic fixture',
    SOURCE_ROW_IDS: ['synthetic:' + seq],
    SOURCE_COUNT: 1,
    ...over,
  };
}

const registry = () => loadRegistry();

test('P11: same-day buy+sell is detected as day trade with matched quantity', () => {
  const events = [
    ev({ DATE: '2026-03-05', TYPE: 'BUY', QUANTITY: 100, AMOUNT: 10000 }),
    ev({ DATE: '2026-03-05', TYPE: 'SELL', QUANTITY: 40, AMOUNT: 4200 }),
  ];
  const dt = detectDayTrade(events, 2026);
  assert.equal(dt.DAY_TRADE_DAYS.length, 1);
  assert.equal(dt.DAY_TRADE_DAYS[0].MATCHED_QTY, 40);
  assert.equal(dt.DAY_TRADE_DAYS[0].GRANULARITY, 'DAILY');
  assert.equal(dt.sellClassification.get(events[1].CANONICAL_ID), 'DAY_TRADE_CANDIDATE');
});

test('P11: sell without same-day buy stays swing; detection ignores other days', () => {
  const events = [
    ev({ DATE: '2026-02-01', TYPE: 'SELL', QUANTITY: 10, AMOUNT: 1000 }),
    ev({ DATE: '2026-02-02', TYPE: 'BUY', QUANTITY: 10, AMOUNT: 900 }),
  ];
  const dt = detectDayTrade(events, 2026);
  assert.equal(dt.DAY_TRADE_DAYS.length, 0);
  assert.equal(dt.sellClassification.size, 0);
});

test('P11: partial match — matched qty is the minimum of same-day buy/sell', () => {
  const events = [
    ev({ DATE: '2026-04-10', TYPE: 'BUY', QUANTITY: 30 }),
    ev({ DATE: '2026-04-10', TYPE: 'BUY', QUANTITY: 20 }),
    ev({ DATE: '2026-04-10', TYPE: 'SELL', QUANTITY: 45 }),
  ];
  const dt = detectDayTrade(events, 2026);
  assert.equal(dt.DAY_TRADE_DAYS[0].BUY_QTY, 50);
  assert.equal(dt.DAY_TRADE_DAYS[0].SELL_QTY, 45);
  assert.equal(dt.DAY_TRADE_DAYS[0].MATCHED_QTY, 45);
});

test('P14/P4: clean full-window replay maps to DERIVED, never CERTIFIED, with cost', () => {
  const rawEvents = [
    ev({ DATE: '2024-01-10', TICKER: 'DEMOCLEAN', TYPE: 'BUY', QUANTITY: 100, AMOUNT: 35000 }),
    ev({ DATE: '2026-05-05', TICKER: 'DEMOCLEAN', TYPE: 'SELL', QUANTITY: 10, AMOUNT: 3800 }),
  ];
  const v1 = buildOpeningV1({ rawEvents, anchors: {}, registry: registry() });
  const row = v1.OPENING_FISCAL_2026_V1.find((r) => r.ASSET === 'DEMOCLEAN');
  assert.equal(row.OPENING_STATUS, 'DERIVED');
  assert.equal(row.AUTHORITY_LEVEL, 'DERIVED');
  assert.equal(row.OPENING_QTY, 100); // opening is at the 01/01/2026 boundary; the 2026 sell happens after
  assert.equal(row.OPENING_TOTAL_COST_CENTS, 3500000); // R$35,000.00 = 100 x R$350
  assert.equal(row.OPENING_AVG_COST_CENTS, 35000);
  assert.equal(v1.OPENING_COVERAGE.OPENING_CERTIFIED, 0);
});

test('P5: pre-coverage holding becomes MISSING_OPENING_EVIDENCE, never synthetic', () => {
  const rawEvents = [
    ev({ DATE: '2019-12-02', TICKER: 'DEMOOLD', TYPE: 'SELL', QUANTITY: 5, AMOUNT: 500 }),
    ev({ DATE: '2020-01-05', TICKER: 'DEMOOLD', TYPE: 'BUY', QUANTITY: 10, AMOUNT: 900 }),
    ev({ DATE: '2026-01-06', TICKER: 'DEMOOLD', TYPE: 'DIVIDEND', DIRECTION: 'Credito', QUANTITY: 0, AMOUNT: 10 }),
  ];
  const v1 = buildOpeningV1({ rawEvents, anchors: {}, registry: registry() });
  const row = v1.OPENING_FISCAL_2026_V1.find((r) => r.ASSET === 'DEMOOLD');
  assert.equal(row.OPENING_STATUS, 'UNKNOWN');
  assert.ok(row.BLOCKERS.includes('MISSING_OPENING_EVIDENCE'));
  assert.equal(row.OPENING_TOTAL_COST_CENTS, null);
  assert.notEqual(row.OPENING_QTY, 0); // never forced to zero
});

test('P4: flagged history (unknown pre-year event) maps to PARTIAL', () => {
  const rawEvents = [
    ev({ DATE: '2023-03-01', TICKER: 'DEMOFLAG', TYPE: 'BUY', QUANTITY: 10, AMOUNT: 1000 }),
    ev({ DATE: '2024-03-01', TICKER: 'DEMOFLAG', TYPE: 'UNKNOWN', QUANTITY: null, AMOUNT: 5 }),
    ev({ DATE: '2026-02-02', TICKER: 'DEMOFLAG', TYPE: 'SELL', QUANTITY: 2, AMOUNT: 300 }),
  ];
  const v1 = buildOpeningV1({ rawEvents, anchors: {}, registry: registry() });
  const row = v1.OPENING_FISCAL_2026_V1.find((r) => r.ASSET === 'DEMOFLAG');
  assert.equal(row.OPENING_STATUS, 'PARTIAL');
  assert.ok(row.BLOCKERS.includes('UNKNOWN_PRE_YEAR_EVENTS'));
});

test('P6/P19: sell on derived cost yields SIMULATED value only; authoritative result stays null', () => {
  const rawEvents = [
    ev({ DATE: '2025-06-01', TICKER: 'DEMOSIM', TYPE: 'BUY', QUANTITY: 50, AMOUNT: 5000 }),
    ev({ DATE: '2026-07-01', TICKER: 'DEMOSIM', TYPE: 'SELL', QUANTITY: 20, AMOUNT: 2600 }),
  ];
  const v1 = buildOpeningV1({ rawEvents, anchors: {}, registry: registry() });
  const sell = v1.SALES_FORENSIC_MATRIX.ROWS.find((r) => r.ASSET === 'DEMOSIM');
  assert.equal(sell.CERTIFICATION_STATUS, 'DERIVED_SIMULATION');
  assert.equal(sell.REALIZED_RESULT_CENTS, null);
  assert.equal(sell.SIMULATED_DERIVED_REALIZED_CENTS, 60000); // 2600 - 20*100 avg
  assert.equal(sell.IRRF_STATUS, 'UNKNOWN');
  assert.equal(sell.TRADE_CLASSIFICATION, 'SWING_TRADE');
  assert.equal(v1.TAX_PAYABLE_STATUS, 'NOT_CALCULATED');
});

test('P6/P13: sell after unknown-cost transfer stays blocked (no synthetic cost)', () => {
  const rawEvents = [
    ev({ DATE: '2025-01-10', TICKER: 'DEMOTRF', TYPE: 'BUY', QUANTITY: 10, AMOUNT: 1000 }),
    ev({ DATE: '2025-06-10', TICKER: 'DEMOTRF', TYPE: 'TRANSFER_CANDIDATE', DIRECTION: 'Credito', QUANTITY: 30, AMOUNT: 0 }),
    ev({ DATE: '2026-08-10', TICKER: 'DEMOTRF', TYPE: 'SELL', QUANTITY: 35, AMOUNT: 4000 }),
  ];
  const v1 = buildOpeningV1({ rawEvents, anchors: {}, registry: registry() });
  const sell = v1.SALES_FORENSIC_MATRIX.ROWS.find((r) => r.ASSET === 'DEMOTRF');
  assert.equal(sell.CERTIFICATION_STATUS, 'BLOCKED');
  assert.equal(sell.SIMULATED_DERIVED_REALIZED_CENTS, null);
  assert.ok(sell.BLOCKER);
});

test('P7/P8/P9: fees/IRRF/prior-losses evidence statuses stay honest on synthetic data', () => {
  const rawEvents = [
    ev({ DATE: '2026-01-02', TICKER: 'DEMOX', TYPE: 'SELL', QUANTITY: 1, AMOUNT: 100 }),
  ];
  const v1 = buildOpeningV1({ rawEvents, anchors: {}, registry: registry() });
  assert.equal(v1.EVIDENCE_INVENTORY.FEES.STATUS, 'MISSING_ITEMIZED');
  assert.equal(v1.EVIDENCE_INVENTORY.IRRF.STATUS, 'UNKNOWN');
  assert.equal(v1.EVIDENCE_INVENTORY.PRIOR_LOSSES.STATUS, 'UNKNOWN');
});

test('P12: pre-year corporate event on a sold asset becomes a FISCAL_RESULT blocker', () => {
  const rawEvents = [
    ev({ DATE: '2025-02-01', TICKER: 'DEMOCORP', TYPE: 'BUY', QUANTITY: 10, AMOUNT: 1000 }),
    ev({ DATE: '2025-09-01', TICKER: 'DEMOCORP', TYPE: 'MARKET_EVENT', QUANTITY: null, AMOUNT: 0, MOVEMENT_RAW: 'SPLIT DO GRUPO' }),
    ev({ DATE: '2026-04-01', TICKER: 'DEMOCORP', TYPE: 'SELL', QUANTITY: 3, AMOUNT: 500 }),
  ];
  const v1 = buildOpeningV1({ rawEvents, anchors: {}, registry: registry() });
  const blocker = v1.CORPORATE_ACTION_BLOCKERS.find((b) => b.ASSET === 'DEMOCORP');
  assert.ok(blocker);
  assert.equal(blocker.FISCAL_RESULT, 'BLOCKED');
  assert.equal(blocker.REASON, 'PRE_2026_CORPORATE_ACTION_EVIDENCE');
});

test('P29-style: opening v1 is deterministic (same input, same SHA256)', () => {
  const rawEvents = [
    ev({ DATE: '2025-03-03', TICKER: 'DEMODET', TYPE: 'BUY', QUANTITY: 7, AMOUNT: 700 }),
    ev({ DATE: '2026-03-03', TICKER: 'DEMODET', TYPE: 'SELL', QUANTITY: 2, AMOUNT: 250 }),
    ev({ DATE: '2026-03-03', TICKER: 'DEMODET', TYPE: 'BUY', QUANTITY: 1, AMOUNT: 120 }),
  ];
  const a = buildOpeningV1({ rawEvents, anchors: {}, registry: registry() });
  const b = buildOpeningV1({ rawEvents, anchors: {}, registry: registry() });
  assert.equal(a.SHA256, b.SHA256);
  // same-day buy+sell surfaces in the matrix classification
  const sell = a.SALES_FORENSIC_MATRIX.ROWS.find((r) => r.ASSET === 'DEMODET');
  assert.equal(sell.TRADE_CLASSIFICATION, 'DAY_TRADE_CANDIDATE');
});
