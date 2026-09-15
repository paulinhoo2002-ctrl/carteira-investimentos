'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Linkage = require('../income-linkage-reconciliation.js');

const yahoo = (id, value = 100) => ({ id, ticker: 'ABCP11', type: 'Yahoo', date: '03/08/2026', value });
const b3 = (id, value = 100) => ({ id, ticker: 'ABCP11', type: 'Rendimento', source: 'B3 Proventos Recebidos', date: '14/08/2026', value });

test('preserves missing Yahoo reference events when cloud snapshot contains B3 ledger only', () => {
  const merged = Linkage.mergeReferenceIncomeEvents([yahoo('y1')], [b3('b1')]);
  assert.deepEqual(merged.map(item => item.id), ['b1', 'y1']);
});

test('does not duplicate a reference event already present in the incoming snapshot', () => {
  const merged = Linkage.mergeReferenceIncomeEvents([yahoo('local')], [yahoo('cloud')]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, 'cloud');
});

test('does not preserve unrelated B3 rows through the reference-only merge', () => {
  const merged = Linkage.mergeReferenceIncomeEvents([b3('local-b3')], [b3('cloud-b3')]);
  assert.deepEqual(merged.map(item => item.id), ['cloud-b3']);
});
