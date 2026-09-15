const test = require('node:test');
const assert = require('node:assert/strict');
const ImportFoundation = require('../import-foundation.js');

test('exact identity uses explicit assetId, ISIN, ticker and then security identity', () => {
  assert.equal(ImportFoundation.resolveExactIdentity({ assetId: 'a-1', ticker: 'ABCD3' }), 'assetId:A-1');
  assert.equal(ImportFoundation.resolveExactIdentity({ isin: 'brabc1234567', ticker: 'ABCD3' }), 'isin:BRABC1234567');
  assert.equal(ImportFoundation.resolveExactIdentity({ ticker: 'abcd3' }), 'ticker:ABCD3');
  assert.equal(ImportFoundation.resolveExactIdentity({ name: 'Título Oficial' }), 'security:TITULO_OFICIAL');
  assert.equal(ImportFoundation.resolveExactIdentity({ name: 'ABCD' }), 'security:ABCD');
  assert.equal(ImportFoundation.resolveExactIdentity({}), '');
});

test('date, money and quantity normalization are deterministic and reject invalid values', () => {
  assert.equal(ImportFoundation.normalizeDate('31/01/2026'), '2026-01-31');
  assert.equal(ImportFoundation.normalizeDate('2026-02-30'), '');
  assert.equal(ImportFoundation.normalizeMoneyCents('R$ 1.234,56'), 123456);
  assert.equal(ImportFoundation.normalizeMoneyCents('1234.56'), 123456);
  assert.equal(ImportFoundation.normalizeMoneyCents('x'), null);
  assert.equal(ImportFoundation.normalizeQuantity('1.250,50'), '1250.5');
  assert.equal(ImportFoundation.normalizeQuantity('x'), '');
});

test('event and source fingerprints are stable across formatting variations', () => {
  const one = { source: 'B3', eventType: 'Compra', date: '31/01/2026', ticker: 'abcd3', qty: '10,00', price: 'R$ 12,34', noteNumber: 'N-1' };
  const two = { source: ' b3 ', operation: ' compra ', tradeDate: '2026-01-31', ticker: 'ABCD3', quantity: 10, unitPrice: 12.34, documentId: 'N-1' };
  assert.equal(ImportFoundation.eventFingerprint(one), ImportFoundation.eventFingerprint(two));
  const source = { sourceType: 'broker-note', broker: 'Inter', noteNumber: 'N-1', tradeDate: '31/01/2026', fileName: 'nota.pdf', fileSize: 100, rows: [one] };
  assert.equal(ImportFoundation.sourceFingerprint(source), ImportFoundation.sourceFingerprint({ ...source, rows: [two] }));
});

test('duplicate classification never approximates identity', () => {
  const existing = [{ source: 'B3', eventType: 'Compra', date: '2026-01-31', ticker: 'ABCD3', qty: 10, price: 12.34 }];
  assert.equal(ImportFoundation.classifyDuplicate(existing[0], existing).state, 'EXACT_DUPLICATE');
  assert.equal(ImportFoundation.classifyDuplicate({ source: 'B3', eventType: 'Compra', date: '2026-01-31', ticker: 'ABCD3', qty: 11, price: 12.34 }, existing).state, 'POSSIBLE_DUPLICATE');
  assert.equal(ImportFoundation.classifyDuplicate({ source: 'B3', eventType: 'Compra', date: '2026-01-31', ticker: 'ABCD30', qty: 10, price: 12.34 }, existing).state, 'NOT_DUPLICATE');
});

test('same ticker in a different month is not a duplicate', () => {
  const existing = [{ source: 'B3', eventType: 'Dividendo', date: '2026-06-05', ticker: 'HGLG11', value: 77.10 }];
  assert.equal(ImportFoundation.classifyDuplicate({ source: 'B3', eventType: 'Dividendo', date: '2026-08-14', ticker: 'HGLG11', value: 112.32 }, existing).state, 'NOT_DUPLICATE');
});

test('same ticker, date, value and type is an economic duplicate', () => {
  const row = { source: 'B3', eventType: 'Dividendo', date: '2026-08-14', ticker: 'HGLG11', value: 112.32 };
  assert.equal(ImportFoundation.classifyDuplicate(row, [row]).state, 'EXACT_DUPLICATE');
});

test('same ticker and date with materially different value is a conflict', () => {
  const existing = [{ source: 'B3', eventType: 'Dividendo', date: '2026-08-14', ticker: 'HGLG11', value: 112.32 }];
  assert.equal(ImportFoundation.classifyDuplicate({ source: 'B3', eventType: 'Dividendo', date: '2026-08-14', ticker: 'HGLG11', value: 99.99 }, existing).state, 'IDENTITY_CONFLICT');
});

test('same value with a different ticker is not a duplicate', () => {
  const existing = [{ source: 'B3', eventType: 'Dividendo', date: '2026-08-14', ticker: 'HGLG11', value: 112.32 }];
  assert.equal(ImportFoundation.classifyDuplicate({ source: 'B3', eventType: 'Dividendo', date: '2026-08-14', ticker: 'VISC11', value: 112.32 }, existing).state, 'NOT_DUPLICATE');
});

test('position reconciliation is read-only and reports explicit differences', () => {
  const summary = ImportFoundation.reconcilePositions(
    [{ assetId: 'a1', ticker: 'ABCD3', qty: 10 }, { ticker: 'EFGH4', qty: 2 }],
    [{ assetId: 'a1', ticker: 'ABCD3', qty: 12 }, { ticker: 'IJKL5', qty: 1 }]
  );
  assert.equal(summary.status, 'QUANTITY_DIFFERENCE');
  assert.deepEqual(summary.differences.map(row => row.identity), ['assetId:A1', 'ticker:EFGH4', 'ticker:IJKL5']);
  assert.equal(summary.beforeCount, 2);
  assert.equal(summary.importedCount, 2);
});
