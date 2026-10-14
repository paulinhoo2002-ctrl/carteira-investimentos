'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Reconciliation = require('../package1-position-reconciliation');

const row = overrides => ({ canonical_id: 'SYN_ID', match_status: 'AMBIGUOUS', asset_type: 'RV_ACAO',
  quantity_v2: 5, quantity_legacy: 5, value_v2: null, value_legacy: null,
  legacy_location: 'synthetic-root', cost_status: 'UNKNOWN', result_status: 'UNAVAILABLE', ...overrides });

test('classifies comparable same-quantity candidates as likely, not certified', () => {
  assert.equal(Reconciliation.classifyPosition(row()), 'LIKELY_MATCH');
  assert.equal(Reconciliation.classifyPosition(row({ match_status: 'EXACT_MATCH', identity_unique: true,
    as_of_v2: '2026-10-10', as_of_legacy: '2026-10-10', value_v2: 100, value_legacy: 100 })), 'EXACT_CERTIFIED_MATCH');
});

test('keeps quantity conflicts and uncertain loan relationships out of certified matches', () => {
  assert.equal(Reconciliation.classifyPosition(row({ match_status: 'SAME_ASSET_DIFFERENT_QUANTITY', quantity_legacy: 4 })), 'QUANTITY_CONFLICT');
  assert.equal(Reconciliation.classifyPosition(row({ match_status: 'SAME_ASSET_DIFFERENT_QUANTITY', quantity_legacy: 4,
    asset_type: 'RV_ACAO_LENT' })), 'LOAN_RELATION_UNKNOWN');
  assert.equal(Reconciliation.classifyPosition(row({ match_status: 'V2_ONLY', quantity_legacy: null,
    legacy_location: null })), 'V2_ONLY');
});

test('does not coerce missing or blank quantities to confirmed zero', () => {
  assert.equal(Reconciliation.classifyPosition(row({ quantity_v2: 0, quantity_legacy: '' })), 'AMBIGUOUS');
  const table = Reconciliation.buildPositionReconciliationTable(Array.from({ length: 35 }, (_, i) =>
    row({ canonical_id: `SYN_${i + 1}`, quantity_v2: i === 0 ? 0 : 5, quantity_legacy: i === 0 ? '' : 5 })));
  assert.equal(table.rows[0].quantity_status, 'NOT_COMPARABLE');
  assert.equal(table.rows[0].quantity_legacy, null);
});

test('builds an exact 35-row table and rejects duplicate identities', () => {
  const rows = Array.from({ length: 35 }, (_, i) => row({ canonical_id: `SYN_${i + 1}` }));
  const result = Reconciliation.buildPositionReconciliationTable(rows);
  assert.equal(result.rows.length, 35);
  assert.equal(result.counts.LIKELY_MATCH, 35);
  assert.throws(() => Reconciliation.buildPositionReconciliationTable([...rows.slice(0, 34), rows[0]]), /POSITION_RECONCILIATION_ID_INVALID/);
});
