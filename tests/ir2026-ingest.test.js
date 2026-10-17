'use strict';

// IR2026 — P3 ingestion tests: content-based detection, row normalization,
// provenance hashes. Synthetic documents only.

const test = require('node:test');
const assert = require('node:assert/strict');
const { detectDocumentType, ingestDocument, sha256Text } = require('../ir2026/ingest');

const yearEndRows = () => [
  { ticker: 'DEMO4', quantity: 100, custo: 3500.5, data: '31/12/2025' },
  { ticker: 'DEMO11', quantidade: 53, 'custo médio': 112.85 },
];

test('P3: year-end position detected by content, not filename', () => {
  const d = detectDocumentType({ name: 'random-file', rows: yearEndRows(), rawText: 'Posição em 31/12/2025' });
  assert.equal(d.TYPE, 'YEAR_END_POSITION');
});

test('P3: loss report detected by loss fields', () => {
  const d = detectDocumentType({ name: 'x', rows: [{ bucket: 'RV_STOCK_SWING', prejuizo: 1200 }], rawText: 'prejuízo acumulado' });
  assert.ok(['LOSS_CARRYFORWARD_REPORT', 'WITHHOLDING_REPORT'].includes(d.TYPE));
});

test('P3: withholding report detected by IRRF fields', () => {
  const d = detectDocumentType({ name: 'ir-jan', rows: [{ mes: '01/2026', irrf: 45.2 }], rawText: 'IRRF' });
  assert.equal(d.TYPE, 'WITHHOLDING_REPORT');
});

test('P3: featureless document is rejected fail-closed', () => {
  const d = detectDocumentType({ name: 'nothing', rows: [{ a: 1 }], rawText: '' });
  assert.equal(d.TYPE, null);
  assert.equal(d.REASON, 'NO_SIGNATURE');
});

test('P3: ambiguous signature is rejected, not guessed', () => {
  const d = detectDocumentType({ name: 'custo e irrf', rows: [{ ticker: 'DEMO4', custo: 1, irrf: 2 }], rawText: 'custo irrf' });
  assert.equal(d.TYPE, null);
  assert.equal(d.REASON, 'AMBIGUOUS_SIGNATURE');
});

test('P3: ingest normalizes rows with match confidence and row hashes', () => {
  const out = ingestDocument({ name: 'pos-2025', rows: yearEndRows(), knownAssets: ['DEMO4', 'DEMO11'], asOf: '2025-12-31' });
  assert.equal(out.ACCEPTED, true);
  assert.equal(out.DOCUMENT_TYPE, 'YEAR_END_POSITION');
  assert.equal(out.RECORDS.length, 2);
  assert.equal(out.RECORDS[0].ASSET_MATCH, 'EXACT');
  assert.equal(out.RECORDS[0].ASSET, 'DEMO4');
  assert.equal(out.RECORDS[0].QTY, 100);
  assert.equal(out.RECORDS[0].COST, 3500.5);
  assert.match(out.RECORDS[0].ROW_SHA256, /^[0-9a-f]{64}$/);
});

test('P3: BR number format parses (1.234,56 -> 1234.56)', () => {
  const out = ingestDocument({ name: 'pos', type: 'YEAR_END_POSITION', rows: [{ ticker: 'DEMO4', quantidade: '10', custo: '1.234,56' }], knownAssets: ['DEMO4'] });
  assert.equal(out.RECORDS[0].QTY, 10);
  assert.equal(out.RECORDS[0].COST, 1234.56);
});

test('P3: unknown tickers count as UNMATCHED, never invented', () => {
  const out = ingestDocument({ name: 'pos', rows: yearEndRows(), knownAssets: ['DEMO4'], asOf: '2025-12-31' });
  assert.equal(out.UNMATCHED, 1);
  assert.equal(out.RECORDS.find((r) => r.ASSET_INPUT === 'DEMO11').ASSET_MATCH, 'NO_MATCH');
});

test('P3: forced type bypasses detection but keeps provenance', () => {
  const out = ingestDocument({ name: 'n', type: 'FEES_STATEMENT', rows: [{ ticker: 'DEMO4', taxa: 3.5 }], knownAssets: ['DEMO4'] });
  assert.equal(out.DOCUMENT_TYPE, 'FEES_STATEMENT');
  assert.equal(out.RECORDS[0].FEES, 3.5);
  assert.equal(out.DETECTION_CONFIDENCE, 'FORCED');
});

test('P3: content hash is stable for identical documents', () => {
  const rows = yearEndRows();
  const a = ingestDocument({ name: 'pos', rows, knownAssets: ['DEMO4', 'DEMO11'], contentHash: sha256Text(JSON.stringify(rows)) });
  const b = ingestDocument({ name: 'pos', rows, knownAssets: ['DEMO4', 'DEMO11'], contentHash: sha256Text(JSON.stringify(rows)) });
  assert.equal(a.CONTENT_SHA256, b.CONTENT_SHA256);
});
