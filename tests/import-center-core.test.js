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
