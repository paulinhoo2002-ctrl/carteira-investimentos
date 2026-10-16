'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeOpeningEvidence } = require('../ir2026/opening-evidence');

test('opening evidence triage keeps quantity and cost statuses separate and sale dependencies private', () => {
  const report = {
    OPENING: { ROWS: [
      { ASSET: 'SYNTH3', ASSET_CLASS: 'BRAZIL_STOCK', OPENING_QTY: 10, QTY_STATUS: 'PARTIAL',
        SOURCE: 'SYNTH_HISTORY', AUTHORITY_LEVEL: 'DERIVED', BLOCKERS: ['NO_OFFICIAL_OPENING'] },
      { ASSET: 'NEW3', ASSET_CLASS: 'BRAZIL_STOCK', OPENING_QTY: null, QTY_STATUS: 'UNKNOWN',
        SOURCE: 'UNAVAILABLE', AUTHORITY_LEVEL: 'UNKNOWN_LINEAGE', BLOCKERS: [] },
    ] },
    LEDGER: { PROCESSING_RECORDS: [{ EVENT_ID: 'sale-synth', BLOCK_REASON: 'FISCAL_COST_UNKNOWN' }] },
  };
  const events = [
    { CANONICAL_ID: 'buy-synth', TICKER: 'SYNTH3', DATE: '2025-01-01', TYPE: 'BUY' },
    { CANONICAL_ID: 'bonus-synth', TICKER: 'SYNTH3', DATE: '2025-12-01', TYPE: 'CORPORATE_ACTION', MOVEMENT_RAW: 'Bonificação em Ativos' },
    { CANONICAL_ID: 'old-only', TICKER: 'OLD3', DATE: '2025-03-01', TYPE: 'BUY' },
    { CANONICAL_ID: 'sale-synth', TICKER: 'SYNTH3', DATE: '2026-02-01', TYPE: 'SELL' },
    { CANONICAL_ID: 'buy-new', TICKER: 'NEW3', DATE: '2026-02-01', TYPE: 'BUY' },
  ];
  const result = analyzeOpeningEvidence(report, events);
  assert.equal(result.AGGREGATE.OPENING_REAL_ASSET_COUNT, null);
  assert.equal(result.AGGREGATE.HISTORICAL_ONLY_IDENTIFIERS, 1);
  assert.equal(result.AGGREGATE.OPENING_QTY_PARTIAL, 1);
  assert.equal(result.AGGREGATE.OPENING_QTY_UNKNOWN, 1);
  assert.equal(result.AGGREGATE.OPENING_COST_UNKNOWN, 2);
  assert.equal(result.AGGREGATE.SELL_EVENTS_2026, 1);
  assert.equal(result.AGGREGATE.SELLS_PROVEN_UNBLOCKED, 0);
  assert.equal(result.SELL_DEPENDENCIES[0].BLOCKER, 'FISCAL_COST_UNKNOWN');
  assert.ok(result.SELL_DEPENDENCIES[0].EVIDENCE_GAPS.includes('PRE_2026_CORPORATE_ACTION_EVIDENCE'));
  assert.equal(result.OPENING_FISCAL_2026_V2[0].OPENING_COST_CENTS, null);
  assert.equal(result.OPENING_FISCAL_2026_V2[0].OPENING_QTY_STATUS, 'PARTIAL');
  assert.equal(result.AGGREGATE.TAX_DUE, 'NOT_CALCULATED');
  assert.equal(result.SHA256, analyzeOpeningEvidence(report, events).SHA256);
});

test('malformed evidence input is rejected before analysis', () => {
  assert.throws(() => analyzeOpeningEvidence({}, []), /required/);
});
