const assert = require('node:assert/strict');
const test = require('node:test');
const Core = require('../import-center-core.js');
const PreviewRenderer = require('../import-center-preview-renderer.js');
const fs = require('node:fs');

const source = (name = 'movimentos.xlsx', extra = {}) => ({ name, headers: ['Movimentação', 'Ticker', 'Quantidade'], ...extra });
const row = (overrides = {}) => ({ date: '2026-09-15', ticker: 'PETR4', operation: 'BUY', quantity: 10, unitPrice: 35.5, grossValue: 355, ...overrides });

test('detector distingue B3 por evidência e rejeita extensão sozinha', () => {
  assert.equal(Core.detectImportFile(source()).provider, 'B3');
  assert.equal(Core.detectImportFile({ name: 'movimentos.pdf' }).provider, 'UNKNOWN');
  assert.equal(Core.detectImportFile({ name: 'qualquer.xlsx', headers: ['ticker'] }).provider, 'UNKNOWN');
});

test('detector mantém XP e BTG factuais sem promover fixture a parser completo', () => {
  const xp = Core.detectImportFile({ name: 'documento.pdf', text: 'XP INVESTIMENTOS' });
  const btg = Core.detectImportFile({ name: 'documento.pdf', text: 'BTG PACTUAL' });
  assert.equal(xp.capability, 'FIXTURE_REQUIRED');
  assert.equal(btg.capability, 'FIXTURE_REQUIRED');
  assert.equal(xp.requiresReview, true);
});

test('normalização cobre datas, centavos, quantidade, identidade e fingerprint estáveis', () => {
  const a = Core.normalizeRecord(row({ date: '15/09/2026', unitPrice: 'R$ 35,50', grossValue: 'R$ 355,00' }), { sourceType: 'B3_MOVEMENTS_XLSX', broker: 'B3', sourceFileName: 'b3.xlsx', sourceRow: 4 });
  const b = Core.normalizeRecord(row(), { sourceType: 'B3_MOVEMENTS_XLSX', broker: 'B3', sourceFileName: 'renamed.xlsx', sourceRow: 4 });
  assert.equal(a.tradeDate, '2026-09-15');
  assert.equal(a.unitPriceCents, 3550);
  assert.equal(a.quantity, '10');
  assert.equal(a.identity, 'ticker:PETR4');
  assert.equal(a.fingerprint, b.fingerprint);
});

test('operações suportadas não são artificialmente reduzidas a compra/venda', () => {
  for (const operation of ['DIVIDEND', 'JCP', 'TRANSFER', 'SUBSCRIPTION', 'SPLIT', 'FEE']) {
    const normalized = Core.normalizeRecord(row({ operation }), { sourceType: 'B3_MOVEMENTS_XLSX', broker: 'B3', sourceFileName: 'b3.xlsx' });
    assert.equal(Core.validateRecord(normalized).errors.includes('UNSUPPORTED_OPERATION'), false, operation);
  }
});

test('validação diferencia erro, warning e informação', () => {
  const invalid = Core.validateRecord(Core.normalizeRecord(row({ date: '31/02/2026' }), { sourceType: 'B3_MOVEMENTS_XLSX', broker: 'B3' }));
  const transfer = Core.validateRecord(Core.normalizeRecord(row({ operation: 'TRANSFER' }), { sourceType: 'B3_MOVEMENTS_XLSX', broker: 'B3', sourceFileName: 'b3.xlsx' }));
  const missingProvenance = Core.validateRecord(Core.normalizeRecord(row(), { sourceType: 'B3_MOVEMENTS_XLSX' }));
  assert.equal(invalid.status, 'ERROR');
  assert.equal(transfer.status, 'INFO');
  assert.equal(missingProvenance.status, 'WARNING');
});

test('provenance não registra conteúdo do documento nem PII', () => {
  const record = Core.normalizeRecord(row(), { sourceType: 'BROKERAGE_NOTE_PDF', broker: 'INTER', sourceFileName: 'nota-sanitizada.pdf', sourceReference: 'row:8' });
  assert.deepEqual(record.provenance, { broker: 'INTER', sourceType: 'BROKERAGE_NOTE_PDF', sourceDocumentType: 'BROKERAGE_NOTE_PDF', sourceFileName: 'nota-sanitizada.pdf', sourceRow: null, sourceReference: 'row:8', hasProvenance: true });
  assert.equal(JSON.stringify(record).includes('CPF'), false);
});

test('dedupe classifica exact, potential e conflict sem remoção automática', () => {
  const base = Core.normalizeRecord(row(), { sourceType: 'B3_MOVEMENTS_XLSX', broker: 'B3', sourceFileName: 'b3.xlsx' });
  const potential = Core.normalizeRecord(row({ unitPrice: 36 }), { sourceType: 'B3_MOVEMENTS_XLSX', broker: 'B3', sourceFileName: 'b3.xlsx' });
  const exact = Core.classifyRecord(base, [base]);
  const conflict = Core.classifyRecord(potential, [base]);
  assert.equal(exact.state, 'EXACT_DUPLICATE');
  assert.equal(conflict.state, 'IDENTITY_CONFLICT');
  assert.equal(Core.classifyRecord(base, [Core.normalizeRecord(row({ noteNumber: 'different' }), { sourceType: 'B3_MOVEMENTS_XLSX', broker: 'B3' })]).state, 'PROBABLE_DUPLICATE');
});

test('dedupe classifica registros repetidos dentro do mesmo preview', () => {
  const source = { name: 'movimentacoes-b3.csv', sourceType: 'CSV' };
  const row = { date: '2026-09-18', operation: 'BUY', ticker: 'PETR4', quantity: 2, unitPrice: '35,00', grossValue: '70,00', sourceRow: 2 };
  const preview = Core.buildPreview({ rows: [row, { ...row, sourceRow: 3 }], source });
  assert.equal(preview.records[0].duplicate.state, 'UNIQUE');
  assert.equal(preview.records[1].duplicate.state, 'EXACT_DUPLICATE');
  assert.equal(preview.counts.EXACT_DUPLICATE, 1);
});

test('mesmo filename com conteúdo diferente não colapsa fingerprint', () => {
  const a = Core.buildPreview({ source: source('same.xlsx'), rows: [row()] });
  const b = Core.buildPreview({ source: source('same.xlsx'), rows: [row({ ticker: 'VALE3' })] });
  assert.notEqual(a.records[0].fingerprint, b.records[0].fingerprint);
  assert.notEqual(a.batchFingerprint, b.batchFingerprint);
});

test('preview é obrigatório, explica unsupported e não oferece atalho de confirmação', () => {
  const preview = Core.buildPreview({ source: { name: 'unknown.zip', text: 'dados' }, rows: [row()] });
  const session = Core.createSession(preview);
  assert.equal(preview.previewOnly, true);
  assert.equal(preview.financialWrite, false);
  assert.equal(Core.confirmSession(session, { confirmed: true }).reason, 'REAL_IMPORT_CONFIRMATION_NOT_AUTHORIZED');
});

test('contadores de escrita permanecem zero em todas as etapas', () => {
  const preview = Core.buildPreview({ source: source(), rows: [row()] });
  assert.deepEqual(preview.writeCounters, { detect: 0, parse: 0, normalize: 0, validate: 0, preview: 0, dedupe: 0 });
  assert.equal(preview.writeCount, 0);
});

test('arquivo vazio, malformado e operação não classificada permanecem revisáveis', () => {
  const empty = Core.buildPreview({ source: source('empty.csv'), rows: [] });
  const malformed = Core.buildPreview({ source: source(), rows: [{ ticker: 'PETR4', operation: '??' }] });
  assert.equal(empty.status, 'EMPTY');
  assert.equal(malformed.status, 'WARNING');
  assert.equal(malformed.summary.errors > 0, true);
});

test('lote grande usa uma passagem determinística e mantém identidade', () => {
  const rows = Array.from({ length: 250 }, (_, index) => row({ date: `2026-09-${String((index % 28) + 1).padStart(2, '0')}`, noteNumber: String(index) }));
  const preview = Core.buildPreview({ source: source(), rows });
  assert.equal(preview.records.length, 250);
  assert.equal(new Set(preview.records.map(item => item.fingerprint)).size, 250);
  assert.equal(preview.writeCount, 0);
});

test('registry permite adapter futuro sem alterar a autoridade do núcleo', () => {
  const registry = Core.registerParser({}, 'XP_BROKERAGE_NOTE_PDF', rows => rows, { provider: 'XP' });
  assert.equal(Core.parserFor(registry, { sourceType: 'XP_BROKERAGE_NOTE_PDF' }).provider, 'XP');
});

test('contratos de ausência continuam explícitos', () => {
  const preview = Core.buildPreview({ source: source(), rows: [{ date: '15/09/2026', operation: 'TRANSFER' }] });
  assert.equal(preview.records[0].validation.errors.includes('UNKNOWN_ASSET'), true);
  assert.equal(preview.financialWrite, false);
});

test('preview visual expõe exact duplicate e Historical Reconstruction Lab sem escrita', () => {
  const html = PreviewRenderer.render({
    files: [{ name: 'historico-b3-sanitizado.csv' }],
    result: { duplicates: 1, potentialDuplicates: 0, conflicts: 0, review: 0, unsupported: 0, newRecords: 0, status: 'SUCCESS', snapshot: 'validado', rollback: 'testado', duplicateAudit: [{ label: 'historico-b3-sanitizado.csv', state: 'EXACT_DUPLICATE', reason: 'Mesmo conteúdo' }] },
    history: [],
    escapeText: value => String(value),
    supportLabel: value => value
  });
  assert.match(html, /EXACT_DUPLICATE/);
  assert.match(html, /Historical Reconstruction Lab/);
  assert.match(html, /nenhuma linha financeira foi gravada/);
});

test('regressão de 768px mantém cabeçalho e navegação dentro da viewport', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(source, /@media\(min-width:621px\) and \(max-width:900px\)/);
  assert.match(source, /\.hdr-right\{min-width:0;max-width:52%/);
});
