'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { explainFiscalValue } = require('../ir2026/fiscal-product');

test('explainFiscalValue returns null if saleId not found in matrix or opening rows', () => {
  const matrix = { ROWS: [] };
  const openingRows = [];
  const registry = { RULES: [] };
  assert.strictEqual(explainFiscalValue({ matrix, openingRows, registry, saleId: 'sale1' }), null);
});

test('explainFiscalValue returns an explanation object when saleId is found', () => {
  const matrix = {
    ROWS: [
      {
        SALE_ID: 'sale1',
        ASSET: 'DEMO3',
        DATE: '2026-06-01',
        SOURCE_REFS: ['src1'],
        SOURCE_PROVENANCE: 'provenance1',
        CERTIFICATION_STATUS: 'DERIVED_SIMULATION',
        BLOCKER_CODES: [],
        SIMULATED_DERIVED_REALIZED_CENTS: 1000,
      },
    ],
  };
  const openingRows = [
    {
      ASSET: 'DEMO3',
      OPENING_STATUS: 'PARTIAL',
      SOURCE: 'source1',
    },
  ];
  const registry = {
    RULES: [
      { RULE_ID: 'RULE_COST_BASIS_WEIGHTED_AVERAGE', STATUS: 'VERIFIED_OFFICIAL_SOURCE' },
      { RULE_ID: 'RULE_SALE_COST_REMOVAL_AVERAGE', STATUS: 'VERIFIED_OFFICIAL_SOURCE' },
    ],
  };
  const result = explainFiscalValue({ matrix, openingRows, registry, saleId: 'sale1' });
  assert.notStrictEqual(result, null);
  assert.strictEqual(result.VALUE_ID, 'SALE_REALIZED:sale1');
  assert.strictEqual(result.ASSET, 'DEMO3');
  assert.strictEqual(result.DATE, '2026-06-01');
  assert.deepStrictEqual(result.SOURCES, ['src1']);
  assert.strictEqual(result.SOURCE_PROVENANCE, 'provenance1');
  assert.deepStrictEqual(result.EVENTS, ['sale1']);
  assert.strictEqual(result.OPENING_STATUS, 'PARTIAL');
  assert.strictEqual(result.OPENING_SOURCE, 'source1');
  assert.deepStrictEqual(result.RULES, [
    { RULE_ID: 'RULE_COST_BASIS_WEIGHTED_AVERAGE', RULE_VERSION: null, STATUS: null, SOURCE_AUTHORITY: null, EFFECTIVE_FROM: null, SEMANTICS_VERIFIED: false },
    { RULE_ID: 'RULE_SALE_COST_REMOVAL_AVERAGE', RULE_VERSION: null, STATUS: null, SOURCE_AUTHORITY: null, EFFECTIVE_FROM: null, SEMANTICS_VERIFIED: false },
  ]);
  assert.strictEqual(result.ENGINE_BEHAVIOR, 'SIMULATED_DERIVED (non-authoritative)');
  assert.deepStrictEqual(result.BLOCKERS, []);
  assert.strictEqual(result.WHEN_COMPUTABLE, false);
});

test('explainFiscalValue returns null for engine behavior when certification status is not DERIVED_SIMULATION', () => {
  const matrix = {
    ROWS: [
      {
        SALE_ID: 'sale2',
        ASSET: 'DEMO3',
        DATE: '2026-06-01',
        SOURCE_REFS: ['src1'],
        SOURCE_PROVENANCE: 'provenance1',
        CERTIFICATION_STATUS: 'BLOCKED',
        BLOCKER_CODES: ['MISSING_OPENING_COST'],
        SIMULATED_DERIVED_REALIZED_CENTS: null,
      },
    ],
  };
  const openingRows = [];
  const registry = { RULES: [] };
  const result = explainFiscalValue({ matrix, openingRows, registry, saleId: 'sale2' });
  assert.notStrictEqual(result, null);
  assert.strictEqual(result.ENGINE_BEHAVIOR, 'BLOCKED');
  assert.strictEqual(result.WHEN_COMPUTABLE, false);
});
