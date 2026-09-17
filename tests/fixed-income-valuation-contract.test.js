'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { selectFixedIncomeValuation } = require('../fixed-income-valuation.js');

function legacy(position) {
  const field = ['rf_liquid_value', 'fixed_current_value', 'liquidValue', 'rf_gross_value', 'fixed_gross_value', 'marketValue', 'currentValue', 'current_price'].find(name => Number.isFinite(Number(position[name])) && Number(position[name]) > 0);
  if (field) return { current: Number(position[field]), currentState: { source: field } };
  return { current: Number.isFinite(Number(position.appliedValue)) ? Number(position.appliedValue) : null, currentState: { source: 'applied-fallback' } };
}

test('preserves legacy winner and exposes provenance without mutation', () => {
  const position = { rf_liquid_value: 1200, marketValue: 999, valuationAsOf: '2026-09-15' };
  const before = structuredClone(position);
  const result = selectFixedIncomeValuation(position, { legacyResolver: legacy });
  assert.equal(result.value, 1200);
  assert.equal(result.selectedField, 'rf_liquid_value');
  assert.equal(result.provenance, 'LEGACY_RF_LIQUID_VALUE');
  assert.equal(result.valuationAsOf, '2026-09-15');
  assert.deepEqual(position, before);
});

test('labels applied fallback without presenting it as market valuation', () => {
  const result = selectFixedIncomeValuation({ appliedValue: 500 }, { legacyResolver: legacy });
  assert.equal(result.value, 500);
  assert.equal(result.authority, 'LEGACY_FALLBACK');
  assert.equal(result.quality, 'LEGACY_FALLBACK');
  assert.equal(result.isFallback, true);
  assert.equal(result.valuationMode, 'APPLIED_VALUE_FALLBACK');
});

test('keeps absent value unavailable instead of inventing zero', () => {
  const result = selectFixedIncomeValuation({}, { legacyResolver: legacy });
  assert.equal(result.value, null);
  assert.equal(result.valueCents, null);
  assert.equal(result.quality, 'UNSUPPORTED');
});

test('freezes every legacy numeric precedence winner', () => {
  const fields = ['rf_liquid_value', 'fixed_current_value', 'liquidValue', 'rf_gross_value', 'fixed_gross_value', 'marketValue', 'currentValue', 'current_price'];
  for (let i = 0; i < fields.length; i += 1) {
    const position = Object.fromEntries(fields.map((field, index) => [field, index === i ? 100 + i : '']));
    const result = selectFixedIncomeValuation(position, { legacyResolver: legacy });
    assert.equal(result.selectedField, fields[i]);
    assert.equal(result.value, 100 + i);
  }
});

test('keeps explicit as-of fields distinct and does not invent dates', () => {
  const result = selectFixedIncomeValuation({ currentValue: 10, updatedAt: '2026-09-17' }, { legacyResolver: legacy });
  assert.equal(result.valuationAsOf, null);
  assert.equal(result.sourceAsOf, null);
  assert.equal(result.observedAt, null);
  assert.equal(result.quality, 'INCOMPLETE_METADATA');
});
