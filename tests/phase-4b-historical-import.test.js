const test = require('node:test');
const assert = require('node:assert/strict');
const Preview = require('../historical-import-preview.js');

test('detects supported B3 and brokerage source formats without guessing', () => {
  assert.equal(Preview.detectSourceFormat({ fileName: 'proventos-2025.xlsx' }), 'B3_DIVIDENDS_XLSX');
  assert.equal(Preview.detectSourceFormat({ fileName: 'movimentacao.xlsx' }), 'B3_MOVEMENTS_XLSX');
  assert.equal(Preview.detectSourceFormat({ headers: ['Quantidade', 'Produto'] }), 'B3_POSITION_XLSX');
  assert.equal(Preview.detectSourceFormat({ fileName: 'nota-inter.pdf' }), 'BROKER_NOTE_PDF');
  assert.equal(Preview.detectSourceFormat({ fileName: 'unknown.dat' }), 'UNKNOWN');
});

test('normalizes supported income and exposes unsupported or malformed rows', () => {
  const event = Preview.normalizeDividendEvent({ Data: '31/01/2025', Ticker: 'ABCD3', Tipo: 'JCP', Valor: 'R$ 12,34' }, { sourceType: 'B3', fileName: 'p.xlsx' });
  assert.equal(event.state, 'NEW');
  assert.equal(event.eventType, 'JCP');
  assert.equal(event.identity, 'ticker:ABCD3');
  assert.equal(event.grossValue, 1234);
  const unsupported = Preview.normalizeDividendEvent({ Data: '31/01/2025', Ticker: 'ABCD3', Tipo: 'Evento desconhecido', Valor: '1' }, { sourceType: 'B3' });
  assert.equal(unsupported.state, 'UNSUPPORTED');
  assert.ok(unsupported.reasons.includes('UNSUPPORTED_EVENT_TYPE'));
});

test('extracts the exact ticker from the B3 product field', () => {
  const event = Preview.normalizeDividendEvent({ Data: '14/08/2026', Produto: 'HGLG11 - PATRIA LOG FII', Tipo: 'Dividendo', Valor: 112.32 }, { sourceType: 'B3' });
  assert.equal(event.ticker, 'HGLG11');
  assert.equal(event.identity, 'ticker:HGLG11');
});

test('preview deduplicates within batch and against existing records without writing', () => {
  const source = { sourceType: 'B3', fileName: 'proventos.xlsx', period: '2025' };
  const row = { Data: '31/01/2025', Ticker: 'ABCD3', Tipo: 'Dividendo', Valor: '10,00' };
  const preview = Preview.previewDividendImport({ source, rows: [row, row], existing: [] });
  assert.equal(preview.counts.NEW, 1);
  assert.equal(preview.counts.EXACT_DUPLICATE, 1);
  assert.equal(preview.whatWillChange, 0);
  assert.equal(preview.writeEnabled, false);
  const repeated = Preview.previewDividendImport({ source, rows: [row], previousFingerprints: [preview.newRecords[0].fingerprint] });
  assert.equal(repeated.counts.EXACT_DUPLICATE, 1);
});

test('preview keeps a different month for the same ticker as a new event', () => {
  const preview = Preview.previewDividendImport({
    source: { sourceType: 'B3' },
    rows: [{ Data: '14/08/2026', Ticker: 'HGLG11', Tipo: 'Dividendo', Valor: '112,32' }],
    existing: [{ date: '05/06/2026', ticker: 'HGLG11', type: 'Dividendo', value: '77,10' }]
  });
  assert.equal(preview.counts.POSSIBLE_DUPLICATE, 0);
  assert.equal(preview.counts.NEW, 1);
});

test('file idempotency recognizes exact source and same content with a renamed file', () => {
  const source = { sourceType: 'B3', fileName: 'proventos.xlsx', fileSize: 20, rows: [{ date: '2025-01-01', ticker: 'ABCD3', eventType: 'DIVIDEND', value: 10 }] };
  const first = Preview.sourceIdempotency(source);
  assert.equal(first.state, 'NEW');
  assert.equal(Preview.sourceIdempotency(source, [first]).state, 'ALREADY_PROCESSED');
  const renamed = { ...source, fileName: 'renamed.xlsx' };
  assert.equal(Preview.sourceIdempotency(renamed, [first]).state, 'ALREADY_PROCESSED');
});

test('historical totals are grouped read-only by month, year and asset', () => {
  const preview = Preview.previewDividendImport({ source: { sourceType: 'B3' }, rows: [
    { Data: '31/01/2024', Ticker: 'ABCD3', Tipo: 'Dividendo', Valor: '10,00' },
    { Data: '15/02/2024', Ticker: 'ABCD3', Tipo: 'Dividendo', Valor: '5,00' },
    { Data: '10/01/2025', Ticker: 'EFGH4', Tipo: 'Rendimento FII', Valor: '7,50' }
  ] });
  assert.deepEqual(preview.monthlyTotals, [['2024-01', 1000], ['2024-02', 500], ['2025-01', 750]]);
  assert.deepEqual(preview.yearlyTotals, [['2024', 1500], ['2025', 750]]);
  assert.deepEqual(preview.assetTotals, [['ticker:ABCD3', 1500], ['ticker:EFGH4', 750]]);
});

test('income history reconciliation reports missing and value differences without mutation', () => {
  const preview = Preview.previewDividendImport({ source: { sourceType: 'B3' }, rows: [
    { Data: '31/01/2024', Ticker: 'ABCD3', Tipo: 'Dividendo', Valor: '10,00' },
    { Data: '15/02/2024', Ticker: 'EFGH4', Tipo: 'JCP', Valor: '5,00' }
  ] });
  const result = Preview.reconcileDividendHistory(preview, [
    { date: '31/01/2024', ticker: 'ABCD3', type: 'DIVIDEND', value: '9,00' }
  ]);
  assert.equal(result.counts.VALUE_DIFFERENCE, 1);
  assert.equal(result.counts.APP_MISSING_EVENT, 1);
  assert.equal(result.status, 'REVIEW_REQUIRED');
});

test('movement classifier keeps custody, income, corporate and unknown events separate', () => {
  assert.equal(Preview.classifyMovement({ Movimento: 'Transferência sem financeiro' }).classification, 'TRANSFER');
  assert.equal(Preview.classifyMovement({ Movimento: 'Empréstimo de ativos' }).destination, 'CUSTODY_HISTORY');
  assert.equal(Preview.classifyMovement({ Movimento: 'Direito de subscrição' }).state, 'REVIEW_REQUIRED');
  assert.equal(Preview.classifyMovement({ Movimento: 'Dividendo' }).destination, 'INCOME_HISTORY');
  assert.equal(Preview.classifyMovement({ Movimento: 'Evento não catalogado' }).classification, 'UNKNOWN');
});

test('position reconciliation uses exact identity and protects the current position', () => {
  const result = Preview.reconcileCurrentPosition({
    b3: [{ ticker: 'ABCD3', qty: 10 }, { ticker: 'EFGH4', qty: 2 }],
    app: [{ ticker: 'ABCD3', qty: 12 }, { ticker: 'IJKL5', qty: 1 }]
  });
  assert.equal(result.summary.MATCHED, 0);
  assert.equal(result.summary.QUANTITY_DIFFERENCES, 1);
  assert.equal(result.summary.B3_ONLY, 1);
  assert.equal(result.summary.APP_ONLY, 1);
  assert.equal(result.writeEnabled, false);
});

test('broker note identity and duplicate alert require broker, number and date', () => {
  const note = { broker: 'Inter', noteNumber: 'N-10', tradeDate: '31/01/2025', operations: [{ ticker: 'ABCD3' }] };
  assert.equal(Preview.crossCheckBrokerNote(note, [note]).state, 'EXACT_DUPLICATE');
  assert.equal(Preview.crossCheckBrokerNote(note, []).noteIdentitySupported, true);
});

test('report model and PDF readiness matrix are explicit and read-only', () => {
  const preview = Preview.previewDividendImport({ source: { fileName: 'x.xlsx' }, rows: [] });
  const report = Preview.buildImportReportModel(preview, '2026-09-06T00:00:00Z');
  assert.equal(report.reportType, 'IMPORT_RECONCILIATION');
  assert.equal(report.reconciliationStatus, 'READ_ONLY');
  assert.equal(report.writeEnabled, false);
  assert.equal(Preview.pdfReportReadinessMatrix().length, 8);
});

test('historical preview scales deterministically to 1k, 5k and 10k rows', () => {
  for (const size of [1000, 5000, 10000]) {
    const rows = Array.from({ length: size }, (_, index) => ({ Data: '01/01/2025', Ticker: `ABCD${index % 10}`, Tipo: 'Dividendo', Valor: '1,00' }));
    const preview = Preview.previewDividendImport({ source: { sourceType: 'B3' }, rows });
    assert.equal(preview.parsed, size);
    assert.equal(preview.writeEnabled, false);
  }
});
