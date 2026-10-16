'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDryRun } = require('../ir2026/scripts/build-fiscal-2026');

const syntheticEvent = { CANONICAL_ID: 'SYN-1', DATE: '2026-02-01', TICKER: 'TEST4', PRODUCT: 'Synthetic',
  TYPE: 'BUY', DIRECTION: 'Credito', QUANTITY: 2, UNIT_PRICE: 10, AMOUNT: 20,
  STATUS: 'CERTIFIED', PROVENANCE: 'synthetic' };

test('real dry-run boundary keeps absent January opening UNKNOWN and never certifies empty month closes', () => {
  const input = [syntheticEvent];
  const master = [{ asset_identity: 'TEST4', asset_class: 'BRAZIL_STOCK', package1a_quantity: 2, average_cost_status: 'CERTIFIED' }];
  const report = buildDryRun(input, master);
  const opening = report.OPENING.ROWS.find(row => row.ASSET === 'TEST4');
  assert.equal(opening.OPENING_QTY, null);
  assert.equal(opening.COST_STATUS, 'UNKNOWN');
  assert.equal(report.CERTIFICATION.LAYERS.MONTHLY_CLOSE_READY.STATUS, 'PARTIAL');
  assert.equal(report.MONTHLY_2026.length, 12);
  assert.equal(report.MONTHLY_2026[0].TAX_DUE, 'NOT_CALCULATED');
  assert.equal(report.CURRENT_POSITION_CROSSCHECK.STATUS, 'PARTIAL');
  assert.deepEqual(report.CURRENT_POSITION_CROSSCHECK.CURRENT_COST_CERTIFIED_BUT_FISCAL_UNKNOWN_ASSETS, ['TEST4']);
  assert.equal(buildDryRun(input, master).HASHES.LEDGER, report.HASHES.LEDGER);
});

test('real dry-run rejects duplicate canonical events', () => {
  assert.throws(() => buildDryRun([syntheticEvent, syntheticEvent], []), /duplicate canonical event/);
});
