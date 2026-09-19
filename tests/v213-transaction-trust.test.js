const test = require('node:test');
const assert = require('node:assert/strict');
const { V213TransactionTrust } = require('../v213-transaction-trust.js');

const rows = [
  { id: 'a', ticker: 'BBAS3', type: 'Compra', date: '2026-09-02', value: 1200, source: 'B3' },
  { id: 'b', ticker: 'PETR4', type: 'Venda', date: '2026-08-12', value: 800, source: 'manual' },
  { id: 'c', ticker: 'BBAS3', type: 'Aporte', date: '2026-07-01', value: 500, source: 'manual' },
  { id: 'd', ticker: 'VALE3', type: 'Provento', date: '', value: null, source: '' }
];

test('normalizes valid, missing and invalid dates without epoch fallback', () => {
  assert.equal(V213TransactionTrust.normalizeDate('2026-09-02').state, 'value');
  assert.equal(V213TransactionTrust.normalizeDate('').state, 'missing');
  assert.equal(V213TransactionTrust.normalizeDate('not-a-date').state, 'invalid');
  assert.notEqual(V213TransactionTrust.normalizeDate('').timestamp, 0);
});

test('searches ticker, type and source without mutating rows', () => {
  const original = rows.slice();
  assert.deepEqual(V213TransactionTrust.searchTransactions(rows, 'bbas3').map(row => row.id), ['a', 'c']);
  assert.deepEqual(V213TransactionTrust.searchTransactions(rows, 'manual').map(row => row.id), ['b', 'c']);
  assert.deepEqual(rows, original);
});

test('filters by real transaction type and preserves unknown types', () => {
  assert.deepEqual(V213TransactionTrust.filterTransactions(rows, { type: 'Compra' }).map(row => row.id), ['a']);
  assert.deepEqual(V213TransactionTrust.filterTransactions(rows, { type: 'Todos' }).map(row => row.id), ['a', 'b', 'c', 'd']);
});

test('sorts dates descending and keeps missing dates at the end', () => {
  assert.deepEqual(V213TransactionTrust.sortTransactions(rows, 'date', 'desc').map(row => row.id), ['a', 'b', 'c', 'd']);
});

test('summarizes categories without mixing their monetary meaning', () => {
  assert.deepEqual(V213TransactionTrust.summarizeTransactions(rows), {
    total: 4, buys: 1, sells: 1, contributions: 1, others: 1
  });
});

test('scopes asset history by ticker and identity', () => {
  assert.deepEqual(V213TransactionTrust.assetTransactions(rows, { ticker: 'BBAS3' }).map(row => row.id), ['a', 'c']);
});

test('returns no provenance facts when metadata is absent', () => {
  assert.deepEqual(V213TransactionTrust.provenanceFacts({}), []);
});

test('returns only factual provenance metadata', () => {
  assert.deepEqual(V213TransactionTrust.provenanceFacts({
    source: 'Yahoo Finance', valuationMode: 'market', sourceAsOf: '2026-09-19', stale: true
  }), [
    { key: 'source', label: 'Fonte', value: 'Yahoo Finance' },
    { key: 'valuationMode', label: 'Modo de valuation', value: 'market' },
    { key: 'sourceAsOf', label: 'Data da fonte', value: '2026-09-19' },
    { key: 'stale', label: 'Status', value: 'Desatualizado' }
  ]);
});
