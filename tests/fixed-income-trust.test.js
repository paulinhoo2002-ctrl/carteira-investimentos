'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const Trust = require('../fixed-income-trust.js');

test('classifies manual authority without inventing source metadata', () => {
  const result = Trust.classify({ authority: 'MANUAL_AUTHORITATIVE', source: '' });
  assert.equal(result.status, 'MANUAL_AUTHORITATIVE');
  assert.equal(result.label, 'Valor manual');
  assert.equal(result.source, '—');
});

test('keeps shadow reference secondary to manual authority', () => {
  const result = Trust.classify({ authority: 'MANUAL_TRUSTED', status: 'SHADOW_ONLY', provenance: { source: 'BCB_SGS_CDI_SHADOW' } });
  assert.equal(result.status, 'REFERENCE_SHADOW');
  assert.equal(result.authoritative, false);
  assert.match(result.label, /Referência/);
});

test('maps existing benchmark classifications to factual secondary or unsupported states', () => {
  assert.equal(Trust.classify({ classification: 'CDI_BENCHMARK_SHADOW', manualValueCents: 100 }).status, 'REFERENCE_SHADOW');
  assert.equal(Trust.classify({ classification: 'UNSUPPORTED_IPCA_EXACT', manualValueCents: 100 }).status, 'UNSUPPORTED');
});

test('distinguishes unsupported and unavailable from zero', () => {
  assert.equal(Trust.classify({ status: 'UNSUPPORTED', manualValueCents: null }).status, 'UNSUPPORTED');
  assert.equal(Trust.classify({ status: 'REVIEW_REQUIRED', manualValueCents: null }).status, 'UNAVAILABLE');
  assert.equal(Trust.classify({ isFallback: true, manualValueCents: 100 }).status, 'UNAVAILABLE');
  assert.equal(Trust.classify({ status: 'CURRENT', manualValueCents: 0 }).status, 'MANUAL_AUTHORITATIVE');
  assert.equal(Trust.classify({}).status, 'UNKNOWN');
});

test('does not infer stale without a valid factual date', () => {
  assert.equal(Trust.classify({ authority: 'MANUAL_AUTHORITATIVE', valuationAsOf: 'not-a-date' }).status, 'MANUAL_AUTHORITATIVE');
  assert.equal(Trust.classify({ authority: 'MANUAL_AUTHORITATIVE', valuationAsOf: '2026-09-10', stale: true }).status, 'STALE');
});

test('filters and sorts fixed-income rows predictably', () => {
  const rows = [
    { ticker: 'B', current: 100, trustStatus: 'UNSUPPORTED' },
    { ticker: 'A', current: 300, trustStatus: 'MANUAL_AUTHORITATIVE' },
    { ticker: 'C', current: null, trustStatus: 'UNAVAILABLE' },
  ];
  assert.deepEqual(Trust.filterRows(rows, 'a', 'all').map(row => row.ticker), ['A']);
  assert.deepEqual(Trust.filterRows(rows, '', 'UNSUPPORTED').map(row => row.ticker), ['B']);
  assert.deepEqual(Trust.sortRows(rows, 'value', 'desc').map(row => row.ticker), ['A', 'B', 'C']);
  assert.deepEqual(Trust.sortRows(rows, 'name', 'asc').map(row => row.ticker), ['A', 'B', 'C']);
});

test('summarizes only confirmed numeric values and exposes trust counts', () => {
  const summary = Trust.summarize([
    { current: 100, trustStatus: 'MANUAL_AUTHORITATIVE' },
    { current: null, trustStatus: 'UNAVAILABLE' },
    { current: 0, trustStatus: 'REFERENCE_SHADOW' },
    { current: 200, trustStatus: 'UNSUPPORTED' },
  ]);
  assert.equal(summary.confirmedCurrent, 300);
  assert.equal(summary.unavailableCount, 1);
  assert.equal(summary.manualCount, 1);
  assert.equal(summary.shadowCount, 1);
  assert.equal(summary.unsupportedCount, 1);
  assert.equal(summary.positionCount, 4);
});
