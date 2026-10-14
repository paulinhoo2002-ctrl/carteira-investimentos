'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Policy = require('../package1-mixed-source-policy');

test('unresolved V2 rows fall back to legacy and certified rows replace, never duplicate', () => {
  const legacy = [
    { canonical_id: 'SYN_INTER_ASSET_A', asset_id: 'SYN_A', custodian_id: 'INTER', source: 'LEGACY' },
    { canonical_id: 'SYN_INTER_ASSET_B', asset_id: 'SYN_B', custodian_id: 'INTER', source: 'LEGACY' },
  ];
  const v2 = [
    { canonical_id: 'SYN_INTER_ASSET_A', asset_id: 'SYN_A', custodian_id: 'INTER', source: 'V2' },
    { canonical_id: 'SYN_INTER_ASSET_B', asset_id: 'SYN_B', custodian_id: 'INTER', source: 'V2' },
    { canonical_id: 'SYN_INTER_ASSET_C', asset_id: 'SYN_C', custodian_id: 'INTER', source: 'V2' },
  ];
  const result = Policy.selectOperationalPositions({ legacyPositions: legacy, v2Positions: v2,
    reconciliationRows: [
      { canonical_id: 'SYN_INTER_ASSET_A', classification: 'EXACT_CERTIFIED_MATCH' },
      { canonical_id: 'SYN_INTER_ASSET_B', classification: 'QUANTITY_CONFLICT' },
      { canonical_id: 'SYN_INTER_ASSET_C', classification: 'V2_ONLY' },
    ] });
  assert.deepEqual(result.positions, [v2[0], legacy[1]]);
  assert.equal(result.doubleCount, 0);
  assert.deepEqual(result.excludedV2.map(row => row.classification), ['QUANTITY_CONFLICT', 'V2_ONLY']);
});

test('same asset at distinct custodians remains distinct and ambiguous identities fail closed', () => {
  const result = Policy.selectOperationalPositions({
    legacyPositions: [{ canonical_id: 'SYN_INTER_ASSET_A', custodian_id: 'INTER' },
      { canonical_id: 'SYN_OTHER_ASSET_A', custodian_id: 'OTHER' }],
    v2Positions: [{ canonical_id: 'SYN_INTER_ASSET_A', custodian_id: 'INTER' }],
    reconciliationRows: [{ canonical_id: 'SYN_INTER_ASSET_A', classification: 'LIKELY_MATCH' }]
  });
  assert.equal(result.positions.length, 2);
  assert.equal(result.doubleCount, 0);
  assert.throws(() => Policy.selectOperationalPositions({
    legacyPositions: [{ canonical_id: 'DUP', custodian_id: 'INTER' }, { canonical_id: 'DUP', custodian_id: 'INTER' }],
    v2Positions: [], reconciliationRows: []
  }), /POSITION_IDENTITY_AMBIGUOUS/);
});
