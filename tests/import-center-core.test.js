const assert = require('node:assert/strict');
const test = require('node:test');
const Core = require('../import-center-core.js');

test('detecta Inter por conteúdo e mantém XP/BTG como fixture-required', () => {
  assert.equal(Core.detectImportFile({ name: 'documento.pdf', text: 'INTER DTVM LTDA. Nota de Corretagem' }).provider, 'INTER');
  assert.equal(Core.detectImportFile({ name: 'nota.pdf', text: 'XP INVESTIMENTOS' }).support, 'FIXTURE_REQUIRED');
  assert.equal(Core.detectImportFile({ name: 'nota.pdf', text: 'BTG PACTUAL' }).support, 'FIXTURE_REQUIRED');
});

test('normaliza trade canônico em centavos e valida campos obrigatórios', () => {
  const row = Core.normalizeRecord({ Data: '15/09/2026', ticker: 'petr4', tipoOperacao: 'Compra', quantidade: '10', preco: 'R$ 35,50', valor: 'R$ 355,00' }, { sourceType: 'BROKERAGE_NOTE_PDF', broker: 'Inter' });
  assert.deepEqual({ tradeDate: row.tradeDate, ticker: row.ticker, operation: row.operation, quantity: row.quantity, unitPriceCents: row.unitPriceCents, grossValueCents: row.grossValueCents }, { tradeDate: '2026-09-15', ticker: 'PETR4', operation: 'BUY', quantity: '10', unitPriceCents: 3550, grossValueCents: 35500 });
  assert.equal(Core.validateRecord(row).valid, true);
});

test('preview separa novo, duplicado e conflito sem qualquer escrita', () => {
  const source = { name: 'inter.pdf', text: 'INTER DTVM', sourceType: 'BROKERAGE_NOTE_PDF' };
  const rows = [{ date: '2026-09-15', ticker: 'PETR4', operation: 'BUY', quantity: 10, unitPrice: 35.5, grossValue: 355, noteNumber: '10' }];
  const existing = [Core.normalizeRecord(rows[0], { sourceType: 'BROKERAGE_NOTE_PDF', broker: 'INTER', noteNumber: '10' })];
  const preview = Core.buildPreview({ source, rows, existing });
  assert.equal(preview.counts.EXACT_DUPLICATE, 1);
  assert.equal(preview.writeCount, 0);
  assert.equal(preview.financialWrite, false);
});

test('confirmação é obrigatória e não executa write financeiro', () => {
  const preview = Core.buildPreview({ source: { name: 'movimentos.xlsx', headers: ['Ticker', 'Quantidade'] }, rows: [] });
  const session = Core.createSession(preview, { sessionId: 'test-session' });
  assert.equal(Core.confirmSession(session).status, 'CONFIRMATION_REQUIRED');
  assert.equal(Core.confirmSession(session).writeCount, 0);
  assert.equal(Core.confirmSession(session, { confirmed: true }).financialWrite, false);
});

test('registry aceita parser futuro sem acoplar XP/BTG ao layout', () => {
  const registry = Core.registerParser({}, 'BROKERAGE_NOTE_PDF', () => [], { provider: 'INTER' });
  assert.equal(Core.parserFor(registry, { sourceType: 'BROKERAGE_NOTE_PDF' }).provider, 'INTER');
});

test('capacidades de corretora são factuais e extensíveis', () => {
  assert.equal(Core.capabilities().B3.status, 'FULL');
  assert.equal(Core.capabilities().INTER.status, 'FULL');
  assert.equal(Core.capabilities().XP.status, 'FIXTURE_REQUIRED');
  assert.equal(Core.capabilities().BTG.status, 'FIXTURE_REQUIRED');
  assert.match(Core.detectImportFile({ name: 'nota.pdf', text: 'XP INVESTIMENTOS' }).reason, /XP/);
});

test('normalização preserva provenance e operações conhecidas sem inventar dados', () => {
  const row = Core.normalizeRecord({ Data: '15/09/2026', ticker: 'PETR4', tipoOperacao: 'JCP', quantidade: '1', valor: 'R$ 12,34', sourceRow: 7 }, {
    sourceType: 'BROKERAGE_NOTE_PDF', broker: 'INTER', sourceFileName: 'nota-sanitizada.pdf', sourceDocumentType: 'BROKERAGE_NOTE', sourceRow: 7,
  });
  assert.equal(row.operation, 'JCP');
  assert.equal(row.provenance.broker, 'INTER');
  assert.equal(row.provenance.sourceRow, 7);
  assert.equal(row.provenance.sourceFileName, 'nota-sanitizada.pdf');
  assert.equal(row.provenance.hasProvenance, true);
});

test('pipeline é idempotente para conteúdo renomeado e separa conflito de duplicata', () => {
  const source = { name: 'nota-a.pdf', text: 'INTER DTVM', sourceType: 'BROKERAGE_NOTE_PDF', broker: 'INTER' };
  const rows = [{ date: '2026-09-15', ticker: 'PETR4', operation: 'BUY', quantity: 10, unitPrice: 35.5, grossValue: 355, noteNumber: '10' }];
  const first = Core.buildPreview({ source, rows });
  const renamed = Core.buildPreview({ source: { ...source, name: 'nota-b.pdf' }, rows });
  assert.equal(first.batchFingerprint, renamed.batchFingerprint);
  assert.equal(first.records[0].fingerprint, renamed.records[0].fingerprint);
  const conflicting = Core.normalizeRecord({ ...rows[0], grossValue: 400 }, { sourceType: 'BROKERAGE_NOTE_PDF', broker: 'INTER', sourceFileName: 'nota-a.pdf' });
  assert.equal(Core.buildPreview({ source, rows, existing: [conflicting] }).counts.IDENTITY_CONFLICT, 1);
});

test('pipeline classifica entradas vazias, unsupported e mantém todos os write counters em zero', () => {
  const empty = Core.buildPreview({ source: { name: 'vazio.csv', headers: ['ticker'] }, rows: [] });
  const unsupported = Core.buildPreview({ source: { name: 'arquivo.zip', text: 'conteudo desconhecido' }, rows: [{ ticker: 'PETR4' }] });
  assert.equal(empty.status, 'EMPTY');
  assert.equal(unsupported.detection.provider, 'UNKNOWN');
  assert.equal(unsupported.status, 'REVIEW_REQUIRED');
  assert.deepEqual(empty.writeCounters, { detect: 0, parse: 0, normalize: 0, validate: 0, preview: 0, dedupe: 0 });
  assert.equal(empty.records[0], undefined);
  assert.equal(Core.confirmSession(Core.createSession(empty), { confirmed: true }).status, 'CONFIRMATION_BLOCKED');
});

test('pipeline expõe estados de validação, warnings e operações unsupported sem limpar dados', () => {
  const preview = Core.buildPreview({ source: { name: 'inter.pdf', text: 'INTER DTVM' }, rows: [
    { date: '15/09/2026', ticker: 'PETR4', operation: 'TRANSFER', quantity: 1, grossValue: 10 },
    { date: '15/09/2026', ticker: 'PETR4', operation: 'BUY', quantity: 1, unitPrice: 10, grossValue: 10 },
  ] });
  assert.equal(preview.records[0].validation.valid, true);
  assert.equal(preview.records[0].validation.status, 'INFO');
  assert.equal(preview.records[1].validation.status, 'OK');
  assert.equal(preview.writeCount, 0);
  assert.equal(preview.financialWrite, false);
});
