'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function snippet(name, nextName) {
  const start = html.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Função não encontrada: ${name}`);
  const end = html.indexOf(`function ${nextName}(`, start + 1);
  assert.notEqual(end, -1, `Marcador final não encontrado: ${nextName}`);
  return html.slice(start, end);
}

function harness(functions, overrides = {}) {
  const { S: initialState, ...helpers } = overrides;
  const metrics = { confirmCalls: 0, saveCalls: 0, portfolioMutations: 0, renderCalls: 0, quoteCalls: 0, scheduleCalls: 0, alerts: [] };
  const context = {
    console,
    Date,
    Math,
    Number,
    String,
    Set,
    Map,
    JSON,
    S: {
      assets: [], aportes: [], proventos: [], rfEvents: [],
      b3Review: null, b3ProventosReview: null, noteReview: null,
      brokerNoteImport: null, rfPositionReview: null,
      ...initialState,
    },
    metrics,
    confirmAnswer: overrides.confirmAnswer ?? true,
    confirm() { metrics.confirmCalls += 1; return context.confirmAnswer; },
    alert(message) { metrics.alerts.push(String(message)); },
    toast() {},
    render() { metrics.renderCalls += 1; },
    save() { metrics.saveCalls += 1; return true; },
    canEditFromThisTab: () => true,
    withScrollPreserved: callback => callback(),
    rememberScroll() {},
    fetchQuotes() { metrics.quoteCalls += 1; },
    scheduleAutoProventosGratis() { metrics.scheduleCalls += 1; },
    learnTickerMeta() {},
    normalizeType: value => value || 'Ação',
    metaTicker: () => ({ type: 'Ação', sector: '' }),
    rfPosNorm: value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim(),
    isB3PositionSummaryRow: () => false,
    b3ActiveWalletGate: () => ({ allow: true, name: 'Carteira sintética' }),
    b3ConfirmApplyToActiveWallet: () => context.confirm(),
    b3ConfirmImport: () => context.confirm(),
    b3ReviewSelectedItems: () => context.S.b3Review?.items || [],
    b3ReviewSummary: () => ({ ignored: 0 }),
    b3ApplySimpleKey: row => [row.ticker, row.date, row.eventType, row.value].join('|'),
    b3ProventoSavedAutoKey: row => row.autoKey || [row.ticker, row.paymentDate, row.eventType, row.netValue].join('|'),
    b3MovementDateKey: value => String(value || ''),
    inputDateValue: value => String(value || ''),
    rfEventNumber: value => Number(value || 0),
    normalizeRfEvents: values => values || [],
    normalizeRfEventType: event => String(event.type || event.eventType || '').toLowerCase(),
    isB3PositionSummaryRow: () => false,
    b3ImportCompletedMessage: () => {},
    ...helpers,
  };
  vm.createContext(context);
  const sharedHelpers = [
    snippet('importedAssetSnapshotEqual', 'rfDetailedHasManualAuthority'),
    snippet('rfDetailedHasManualAuthority', 'rfDetailedFindExistingAsset'),
    snippet('rfDetailedFindExistingAsset', 'rfDetailedPossibleDuplicateAsset'),
  ];
  vm.runInContext([...sharedHelpers, ...functions.map(([name, nextName]) => snippet(name, nextName))].join('\n'), context);
  return { context, metrics };
}

test('B3 positions: opening and closing preview do not persist or mutate portfolio', () => {
  const { context, metrics } = harness([
    ['openB3Review', 'closeB3Review'], ['closeB3Review', 'setB3ReviewSheet'],
  ]);
  context.openB3Review({ items: [{ ticker: 'SYN1', qty: 1, value: 10 }], selectedSheets: { Ações: true } }, 'synthetic.xlsx');
  assert.equal(metrics.saveCalls, 0);
  assert.deepEqual(context.S.assets, []);
  context.closeB3Review();
  assert.equal(metrics.saveCalls, 0);
  assert.deepEqual(context.S.assets, []);
});

test('B3 positions: cancel blocks writer; explicit apply reaches it once', () => {
  const { context, metrics } = harness([
    ['importB3Review', 'b3ReviewModal'],
  ], {
    S: { b3Review: { items: [{ ticker: 'SYN1', qty: 1, value: 10, include: true }], importDate: '2026-01-01' } },
    b3ReviewSelectedItems: () => context.S.b3Review.items,
    b3ReviewSummary: () => ({ ignored: 0 }),
    applyB3ImportedPositions: () => { metrics.portfolioMutations += 1; },
  });
  context.confirmAnswer = false;
  context.importB3Review();
  assert.equal(metrics.portfolioMutations, 0);
  assert.equal(metrics.saveCalls, 0);
  context.confirmAnswer = true;
  context.importB3Review();
  assert.equal(metrics.portfolioMutations, 1);
});

test('B3 income: opening/canceling preview does not persist; cancel blocks apply', () => {
  const { context, metrics } = harness([
    ['openB3ProventosReview', 'closeB3ProventosReview'], ['closeB3ProventosReview', 'setB3ProventoReviewItem'],
    ['importB3ProventosReview', 'b3ProventosReviewSummary'],
  ], {
    b3ProventoBuild: row => ({ ...row, status: 'Novo provento', destination: 'Proventos', include: true }),
    S: { b3ProventosReview: { items: [{ ticker: 'SYN1', paymentDate: '2026-01-01', eventType: 'DIVIDEND', netValue: 10, status: 'Novo provento', destination: 'Proventos', include: true }] } },
  });
  context.openB3ProventosReview({ items: [{ ticker: 'SYN1', paymentDate: '2026-01-01', eventType: 'DIVIDEND', netValue: 10 }] }, 'synthetic.csv');
  assert.equal(metrics.saveCalls, 0);
  context.closeB3ProventosReview();
  assert.equal(metrics.saveCalls, 0);
  context.S.b3ProventosReview = { items: [{ ticker: 'SYN1', paymentDate: '2026-01-01', eventType: 'DIVIDEND', netValue: 10, status: 'Novo provento', destination: 'Proventos', include: true }] };
  context.confirmAnswer = false;
  context.importB3ProventosReview();
  assert.equal(metrics.saveCalls, 0);
  assert.equal(context.S.proventos.length, 0);
});

test('Inter note review: opening/closing is read-only; explicit import invokes persistence', () => {
  const { context, metrics } = harness([
    ['openNotaReview', 'closeNotaReview'], ['closeNotaReview', 'setNotaReviewAll'],
    ['importNotaReview', 'notaReviewSummary'], ['applyNotaCorretoraTrades', 'openNotaReview'],
  ], {
    S: { noteReview: { noteKey: 'synthetic-note', noteNumber: '1', tradeDate: '2026-01-01', rows: [{ include: true, ticker: 'SYN1', qty: 1, price: 10, sourceItem: {} }] } },
    syncAssetsFromAportes() { metrics.portfolioMutations += 1; },
  });
  context.openNotaReview({ items: [{ ticker: 'SYN1', qty: 1, price: 10 }], noteKey: 'synthetic-note' }, 'synthetic.pdf');
  assert.equal(metrics.saveCalls, 0);
  context.closeNotaReview();
  assert.equal(metrics.saveCalls, 0);
  context.S.noteReview = { noteKey: 'synthetic-note', noteNumber: '1', tradeDate: '2026-01-01', rows: [{ include: true, ticker: 'SYN1', qty: 1, price: 10, sourceItem: {} }] };
  context.importNotaReview();
  assert.equal(metrics.saveCalls, 1);
  assert.equal(metrics.portfolioMutations, 1);
});

test('fixed-income review: cancel blocks persistence; explicit apply reaches confirmed writer', () => {
  const { context, metrics } = harness([
    ['importRfPositionReview', 'rfPositionReviewSummary'],
  ], {
    S: { rfPositionReview: { items: [{ include: true, status: 'Novo ativo', ticker: 'SYN1' }], events: [] } },
    rfPositionReviewSummary: () => ({ count: 1 }),
    importRfPositionRows: () => { metrics.portfolioMutations += 1; return { created: 1, updated: 0, ignored: 0 }; },
  });
  context.confirmAnswer = false;
  context.importRfPositionReview();
  assert.equal(metrics.portfolioMutations, 0);
  assert.equal(metrics.saveCalls, 0);
  context.confirmAnswer = true;
  context.importRfPositionReview();
  assert.equal(metrics.portfolioMutations, 1);
});

test('Import Center confirmation remains preview-only and has no writer adapter', () => {
  const core = require('../import-center-core.js');
  const preview = core.buildPreview({ source: { name: 'synthetic.csv', headers: ['ticker', 'quantidade'] }, rows: [] });
  const session = core.createSession(preview, { sessionId: 'synthetic-v284' });
  const confirmed = core.confirmSession(session, { confirmed: true });
  assert.equal(confirmed.status, 'CONFIRMATION_BLOCKED');
  assert.equal(confirmed.financialWrite, false);
  assert.equal(confirmed.writeCount, 0);
});

test('B3 positions: identical confirmed reimport is a no-op', () => {
  const item = { ticker: 'SYN1', qty: 2, price: 50, value: 100, type: 'Ação', sheet: 'Ações', sourceItem: { ticker: 'SYN1', qty: 2, price: 50, value: 100, type: 'Ação' } };
  const { context, metrics } = harness([
    ['importB3Review', 'b3ReviewModal'], ['applyB3ImportedPositions', 'openBrokerNoteImport'],
  ], {
    S: {
      assets: [],
      b3Review: { items: [item], selectedSheets: { Ações: true }, importDate: '2026-01-01' },
    },
    b3ReviewSelectedItems: () => context.S.b3Review.items,
    b3ReviewSummary: () => ({ ignored: 0 }),
  });
  context.importB3Review();
  const afterFirst = JSON.stringify(context.S.assets);
  assert.equal(metrics.saveCalls, 1, 'primeira importação persiste a nova posição');
  assert.equal(metrics.quoteCalls, 1);
  context.S.b3Review = { items: [item], selectedSheets: { Ações: true }, importDate: '2026-01-01' };
  context.importB3Review();
  assert.equal(metrics.saveCalls, 1, 'reimport idêntico não deve persistir novamente');
  assert.equal(metrics.quoteCalls, 1, 'reimport idêntico não deve disparar recálculo downstream');
  assert.equal(JSON.stringify(context.S.assets), afterFirst);
});

test('B3 income: duplicate-only confirmed batch performs no persistence write', () => {
  const existing = { id: 'synthetic-income', ticker: 'SYN1', date: '2026-01-01', eventType: 'DIVIDEND', type: 'DIVIDEND', value: 10, autoKey: 'synthetic-income-key' };
  const row = { ticker: 'SYN1', paymentDate: '2026-01-01', eventType: 'DIVIDEND', netValue: 10, autoKey: 'synthetic-income-key', status: 'Novo provento', destination: 'Proventos', include: true };
  const { context, metrics } = harness([
    ['importB3ProventosReview', 'b3ProventosReviewSummary'],
  ], { S: { proventos: [existing], b3ProventosReview: { items: [row] } } });
  context.importB3ProventosReview();
  assert.equal(metrics.saveCalls, 0, 'duplicata exata não deve persistir');
  assert.equal(context.S.proventos.length, 1);
  assert.equal(context.S.proventos[0].id, 'synthetic-income');
});

test('B3 income: duplicate plus one new event persists only the new event once', () => {
  const existing = { id: 'synthetic-income', ticker: 'SYN1', date: '2026-01-01', eventType: 'DIVIDEND', type: 'DIVIDEND', value: 10, autoKey: 'synthetic-income-key' };
  const duplicate = { ticker: 'SYN1', paymentDate: '2026-01-01', eventType: 'DIVIDEND', netValue: 10, autoKey: 'synthetic-income-key', status: 'Novo provento', destination: 'Proventos', include: true };
  const fresh = { ticker: 'SYN2', paymentDate: '2026-01-02', eventType: 'DIVIDEND', netValue: 20, autoKey: 'synthetic-income-key-2', status: 'Novo provento', destination: 'Proventos', include: true };
  const { context, metrics } = harness([
    ['importB3ProventosReview', 'b3ProventosReviewSummary'],
  ], {
    b3ProventoBuild: row => ({ ...row, status: 'Novo provento', destination: 'Proventos', include: true }),
    S: { proventos: [existing], b3ProventosReview: { items: [duplicate, fresh] } },
  });
  context.importB3ProventosReview();
  assert.equal(metrics.saveCalls, 1);
  assert.equal(Array.from(context.S.proventos, row => row.ticker).join(','), 'SYN2,SYN1');
  assert.equal(context.S.proventos.length, 2);
});

test('Inter note: exact same transaction batch is idempotent', () => {
  const stamp = 'synthetic-note-key';
  const existing = { id: 'synthetic-aporte', ticker: 'SYN1', operation: 'compra', qty: 2, price: 50, date: '2026-01-01', noteKey: stamp, decision: '[IMPORT_NOTA_CORRETORA] nota 1', type: 'Ação' };
  const sourceItem = { ticker: 'SYN1', operation: 'compra', qty: 2, price: 50, date: '2026-01-01', type: 'Ação' };
  const { context, metrics } = harness([
    ['importNotaReview', 'notaReviewSummary'], ['applyNotaCorretoraTrades', 'openNotaReview'],
  ], {
    S: { aportes: [existing], noteReview: { noteKey: stamp, noteNumber: '1', tradeDate: '2026-01-01', rows: [{ include: true, ticker: 'SYN1', operation: 'compra', qty: 2, price: 50, type: 'Ação', sourceItem }] } },
    syncAssetsFromAportes() { metrics.portfolioMutations += 1; },
  });
  const before = JSON.stringify(context.S.aportes);
  context.importNotaReview();
  assert.equal(metrics.saveCalls, 0, 'reenvio exato não deve chamar persistência');
  assert.equal(metrics.portfolioMutations, 0);
  assert.equal(metrics.quoteCalls, 0);
  assert.equal(metrics.scheduleCalls, 0);
  assert.equal(JSON.stringify(context.S.aportes), before);
});

test('Inter note: changed batch with same external identity is rejected without persistence', () => {
  const stamp = 'synthetic-note-key';
  const existing = { id: 'synthetic-aporte', ticker: 'SYN1', operation: 'compra', qty: 2, price: 50, date: '2026-01-01', noteKey: stamp, decision: '[IMPORT_NOTA_CORRETORA] nota 1', type: 'Ação' };
  const sourceItem = { ticker: 'SYN1', operation: 'compra', qty: 3, price: 50, date: '2026-01-01', type: 'Ação' };
  const { context, metrics } = harness([
    ['applyNotaCorretoraTrades', 'openNotaReview'],
  ], {
    S: { aportes: [existing] },
    syncAssetsFromAportes() {},
  });
  const before = JSON.stringify(context.S.aportes);
  const result = context.applyNotaCorretoraTrades([sourceItem], stamp, '1', '2026-01-01');
  assert.equal(result?.status, 'CONFLICT', 'mesma identidade externa com valores divergentes exige revisão');
  assert.equal(metrics.saveCalls, 0);
  assert.equal(JSON.stringify(context.S.aportes), before);
});

test('Inter note review: changed batch keeps the preview open for review', () => {
  const stamp = 'synthetic-note-key';
  const existing = { id: 'synthetic-aporte', ticker: 'SYN1', operation: 'compra', qty: 2, price: 50, date: '2026-01-01', noteKey: stamp, decision: '[IMPORT_NOTA_CORRETORA] nota 1', type: 'Ação' };
  const review = { noteKey: stamp, noteNumber: '1', tradeDate: '2026-01-01', rows: [{ include: true, ticker: 'SYN1', operation: 'compra', qty: 3, price: 50, type: 'Ação', sourceItem: {} }] };
  const { context, metrics } = harness([
    ['importNotaReview', 'notaReviewSummary'], ['applyNotaCorretoraTrades', 'openNotaReview'],
  ], { S: { aportes: [existing], noteReview: review }, syncAssetsFromAportes() {} });
  context.importNotaReview();
  assert.equal(context.S.noteReview, review);
  assert.equal(metrics.saveCalls, 0);
  assert.ok(metrics.alerts.length > 0);
});

test('Inter PDF: confirmed identical note does not append or schedule downstream writes', () => {
  const note = { valid: true, noteKey: 'synthetic-pdf-note', noteNumber: '7', tradeDate: '2026-01-01', broker: 'INTER', rows: [{ include: true, ticker: 'SYN1', qty: 2, price: 50, total: 100, operation: 'compra', type: 'Ação', sector: 'Ação' }], operationsTotal: 100, costs: 0 };
  const existing = { id: 'synthetic-pdf-aporte', ticker: 'SYN1', operation: 'compra', qty: 2, price: 50, totalValue: 100, date: '2026-01-01', type: 'Ação', sector: 'Ação', source: 'Nota Inter PDF', brokerNoteKey: note.noteKey, brokerNoteNumber: note.noteNumber, brokerNoteCostsAllocated: false, brokerNoteAllocatedCost: 0 };
  const { context, metrics } = harness([
    ['confirmBrokerNoteImport', 'closeBrokerNoteImportSuccess'],
  ], {
    S: { aportes: [existing], brokerNoteImport: { parsed: note, rateCosts: false, allowDuplicate: true } },
    brokerNoteCanConfirm: () => true,
    detectBrokerNoteDuplicate: () => true,
    brokerNoteValidTicker: () => true,
    brokerNoteAdjustedRow: row => ({ ...row, adjustedPrice: row.price, adjustedTotal: row.total, allocatedCost: 0 }),
    syncAssetsFromAportes() { metrics.portfolioMutations += 1; },
  });
  const before = JSON.stringify(context.S.aportes);
  const result = context.confirmBrokerNoteImport();
  assert.equal(result?.status, 'NO_OP');
  assert.equal(JSON.stringify(context.S.aportes), before);
  assert.equal(metrics.portfolioMutations, 0);
  assert.equal(metrics.scheduleCalls, 0);
});

test('Inter PDF: changed note with same identity remains review-only', () => {
  const note = { valid: true, noteKey: 'synthetic-pdf-note', noteNumber: '7', tradeDate: '2026-01-01', broker: 'INTER', rows: [{ include: true, ticker: 'SYN1', qty: 3, price: 50, total: 150, operation: 'compra', type: 'Ação', sector: 'Ação' }], operationsTotal: 150, costs: 0 };
  const existing = { id: 'synthetic-pdf-aporte', ticker: 'SYN1', operation: 'compra', qty: 2, price: 50, totalValue: 100, date: '2026-01-01', type: 'Ação', sector: 'Ação', source: 'Nota Inter PDF', brokerNoteKey: note.noteKey, brokerNoteNumber: note.noteNumber, brokerNoteCostsAllocated: false, brokerNoteAllocatedCost: 0 };
  const { context, metrics } = harness([
    ['confirmBrokerNoteImport', 'closeBrokerNoteImportSuccess'],
  ], {
    S: { aportes: [existing], brokerNoteImport: { parsed: note, rateCosts: false, allowDuplicate: true } },
    brokerNoteCanConfirm: () => true,
    detectBrokerNoteDuplicate: () => true,
    brokerNoteValidTicker: () => true,
    brokerNoteAdjustedRow: row => ({ ...row, adjustedPrice: row.price, adjustedTotal: row.total, allocatedCost: 0 }),
    syncAssetsFromAportes() { metrics.portfolioMutations += 1; },
  });
  const before = JSON.stringify(context.S.aportes);
  const result = context.confirmBrokerNoteImport();
  assert.equal(result?.status, 'CONFLICT');
  assert.equal(JSON.stringify(context.S.aportes), before);
  assert.equal(metrics.scheduleCalls, 0);
  assert.ok(metrics.alerts.length > 0);
});

test('fixed-income import: exact repeat is a no-op', () => {
  const asset = { id: 'synthetic-rf', ticker: 'SYN-CDB', name: 'Synthetic CDB', product: 'Synthetic CDB', type: 'Renda Fixa', sector: 'CDB', qty: 1, avg_price: 100, current_price: 110, fixed_initial_value: 100, fixed_current_value: 110, fixed_source: 'B3 Posição Atual', source: 'B3 Posição Atual', fixed_rate: 'CDI', fixed_application_date: '2025-01-01', fixed_maturity_date: '2027-01-01', fixed_issuer: 'Synthetic issuer', fixed_indexer: 'CDI', quoteSource: 'importado', quoteUpdatedAt: '2026-01-01T00:00:00.000Z', institution: '', broker: '', observation: '', note: '' };
  const item = { ticker: 'SYN-CDB', name: 'Synthetic CDB', qty: 1, appliedValue: 100, marketValue: 110, rate: 'CDI', applicationDate: '2025-01-01', maturityDate: '2027-01-01', issuer: 'Synthetic issuer', sector: 'CDB', status: 'Atualizar existente', include: true };
  const { context, metrics } = harness([
    ['importRfPositionReview', 'rfPositionReviewSummary'], ['importRfPositionRows', 'importRfEventRows'],
  ], {
    S: { assets: [], rfPositionReview: { items: [item], events: [] } },
    rfDetailedStatus: row => ({ status: row.status, note: '' }),
    rfDetailedFindExistingAsset: row => ({ idx: context.S.assets.findIndex(current => current.ticker === row.ticker) }),
    rfPositionReviewSummary: () => ({ count: 1 }),
    learnTickerMeta() {},
  });
  context.importRfPositionReview();
  assert.equal(metrics.saveCalls, 1, 'primeira aplicação cria a posição confirmada');
  const afterFirst = JSON.stringify(context.S.assets);
  context.S.rfPositionReview = { items: [{ ...item }], events: [] };
  context.importRfPositionReview();
  assert.equal(metrics.saveCalls, 1, 'reimport idêntico não deve persistir novamente');
  assert.equal(JSON.stringify(context.S.assets), afterFirst);
});

test('fixed-income import: manual-authoritative position is not silently overwritten', () => {
  const asset = { id: 'synthetic-manual-rf', ticker: 'SYN-CDB', name: 'Synthetic CDB', type: 'Renda Fixa', sector: 'CDB', qty: 1, avg_price: 100, current_price: 125, fixed_initial_value: 100, fixed_current_value: 125, source: 'manual-rf', quoteSource: 'manual', manual_authority: true, manualValueAuthority: 'manual', rf_profit_source: 'manual' };
  const item = { ticker: 'SYN-CDB', name: 'Synthetic CDB', qty: 1, appliedValue: 100, marketValue: 110, rate: 'CDI', applicationDate: '2025-01-01', maturityDate: '2027-01-01', issuer: 'Synthetic issuer', sector: 'CDB', status: 'Atualizar existente', include: true };
  const { context, metrics } = harness([
    ['importRfPositionReview', 'rfPositionReviewSummary'], ['importRfPositionRows', 'importRfEventRows'],
  ], {
    S: { assets: [asset], rfPositionReview: { items: [item], events: [] } },
    rfDetailedStatus: row => ({ status: row.status, note: '' }),
    rfDetailedFindExistingAsset: row => ({ idx: context.S.assets.findIndex(current => current.ticker === row.ticker) }),
    rfPositionReviewSummary: () => ({ count: 1 }),
    learnTickerMeta() {},
  });
  context.importRfPositionReview();
  assert.equal(metrics.saveCalls, 0, 'posição manual exige revisão própria');
  assert.equal(context.S.assets[0].fixed_current_value, 125);
  assert.equal(context.S.assets[0].manual_authority, true);
});

test('B3 fixed-income position writer preserves manual-authoritative value', () => {
  const asset = { id: 'synthetic-manual-rf', ticker: 'SYN-CDB', type: 'Renda Fixa', qty: 1, current_price: 125, fixed_current_value: 125, source: 'manual-rf', quoteSource: 'manual', manual_authority: true };
  const { context, metrics } = harness([
    ['applyB3ImportedPositions', 'openBrokerNoteImport'],
  ], { S: { assets: [asset] } });
  context.applyB3ImportedPositions([{ ticker: 'SYN-CDB', qty: 1, currentValue: 110, type: 'Renda Fixa', sector: 'CDB' }], '2026-01-01');
  assert.equal(metrics.saveCalls, 0);
  assert.equal(context.S.assets[0].current_price, 125);
  assert.equal(context.S.assets[0].fixed_current_value, 125);
});

test('fixed-income parser marks an existing manual-authoritative position for review', () => {
  const asset = { id: 'synthetic-manual-rf', ticker: 'SYN-CDB', name: 'Synthetic CDB', type: 'Renda Fixa', source: 'manual-rf', quoteSource: 'manual' };
  const { context } = harness([
    ['rfDetailedStatus', 'parseRfDetailedPositionWorkbook'],
  ], { S: { assets: [asset] } });
  const status = context.rfDetailedStatus({ ticker: 'SYN-CDB', name: 'Synthetic CDB', qty: 1, appliedValue: 100, marketValue: 110 });
  assert.equal(status.status, 'Revisar');
  assert.match(status.note, /autoridade manual/);
});

test('fixed-income mixed import keeps manual-authoritative rows in review', () => {
  const manual = { id: 'synthetic-manual', ticker: 'SYN-MANUAL', name: 'Manual CDB', type: 'Renda Fixa', qty: 1, fixed_current_value: 125, source: 'manual-rf', quoteSource: 'manual' };
  const manualItem = { ticker: 'SYN-MANUAL', name: 'Manual CDB', qty: 1, appliedValue: 100, marketValue: 110, status: 'Atualizar existente', include: true };
  const importItem = { ticker: 'SYN-NEW', name: 'New CDB', qty: 1, appliedValue: 100, marketValue: 110, rate: 'CDI', applicationDate: '2025-01-01', maturityDate: '2027-01-01', issuer: 'Synthetic issuer', sector: 'CDB', status: 'Novo ativo', include: true };
  const { context, metrics } = harness([
    ['importRfPositionReview', 'rfPositionReviewSummary'], ['importRfPositionRows', 'importRfEventRows'],
  ], {
    S: { assets: [manual], rfPositionReview: { items: [manualItem, importItem], events: [] } },
    rfDetailedStatus: row => ({ status: row.status, note: '' }),
    rfPositionReviewSummary: () => ({ count: 1 }),
    learnTickerMeta() {},
  });
  context.importRfPositionReview();
  assert.equal(metrics.saveCalls, 1, 'somente a posição nova é persistida');
  assert.equal(context.S.assets.find(row => row.ticker === 'SYN-MANUAL').fixed_current_value, 125);
  assert.ok(context.S.assets.some(row => row.ticker === 'SYN-NEW'));
  assert.deepEqual(Array.from(context.S.rfPositionReview.items, row => [row.ticker, row.include, row.status]), [['SYN-MANUAL', false, 'Revisar']]);
});
