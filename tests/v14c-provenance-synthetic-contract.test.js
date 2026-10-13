'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const sourceTypes = ['EXTRATO', 'MOVIMENTAÇÃO', 'POSIÇÃO', 'DERIVADO', 'DESCONHECIDO'];
const coverages = ['COMPLETE', 'PARTIAL', 'UNKNOWN'];
const custodians = ['INTER', 'OUTRO', 'UNKNOWN'];

const syntheticSnapshots = [
  { id: 'INTER_SYNTH_RV', custodian: 'INTER', source: 'POSIÇÃO', asOf: '2026-01-31', coverage: 'COMPLETE', assetClass: 'RV', amount: 120, provenance: 'synthetic:test-fixture' },
  { id: 'INTER_SYNTH_RF', custodian: 'INTER', source: 'EXTRATO', asOf: '2026-01-31', coverage: 'COMPLETE', assetClass: 'RF', amount: 60, provenance: 'synthetic:test-fixture' },
  { id: 'OTHER_SYNTH', custodian: 'OUTRO', source: 'MOVIMENTAÇÃO', asOf: '2026-01-31', coverage: 'COMPLETE', assetClass: 'OUTRO', amount: 20, provenance: 'synthetic:test-fixture' },
  { id: 'GLOBAL_SYNTH', custodian: 'UNKNOWN', source: 'DERIVADO', asOf: '2026-01-31', coverage: 'COMPLETE', assetClass: 'GLOBAL', amount: 200, provenance: 'synthetic:test-fixture' },
  { id: 'UNKNOWN_SYNTH', custodian: 'UNKNOWN', source: 'DESCONHECIDO', asOf: null, coverage: 'UNKNOWN', assetClass: 'RV', amount: null, provenance: 'synthetic:test-fixture' },
];

test('synthetic provenance fixtures declare source, coverage and custodian vocabularies', () => {
  for (const item of syntheticSnapshots) {
    assert.ok(custodians.includes(item.custodian), `${item.id} custodian`);
    assert.ok(sourceTypes.includes(item.source), `${item.id} source`);
    assert.ok(coverages.includes(item.coverage), `${item.id} coverage`);
    assert.equal(item.provenance, 'synthetic:test-fixture');
  }
});

test('synthetic complete custodian totals reconcile without production financial constants', () => {
  const get = id => syntheticSnapshots.find(item => item.id === id);
  assert.equal(get('INTER_SYNTH_RV').amount + get('INTER_SYNTH_RF').amount, 180);
  assert.equal(get('INTER_SYNTH_RV').amount + get('INTER_SYNTH_RF').amount + get('OTHER_SYNTH').amount, get('GLOBAL_SYNTH').amount);
});

test('unknown synthetic coverage retains null amount instead of manufacturing zero', () => {
  const unknown = syntheticSnapshots.find(item => item.id === 'UNKNOWN_SYNTH');
  assert.equal(unknown.coverage, 'UNKNOWN');
  assert.equal(unknown.amount, null);
  assert.equal(unknown.asOf, null);
});
