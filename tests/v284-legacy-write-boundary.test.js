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
    cloneData: value => JSON.parse(JSON.stringify(value ?? null)),
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
    importCenterFinishReview() {},
    save() { metrics.saveCalls += 1; return true; },
    canEditFromThisTab: () => true,
    withScrollPreserved: callback => callback(),
    rememberScroll() {},
    fetchQuotes() { metrics.quoteCalls += 1; },
    scheduleAutoProventosGratis() { metrics.scheduleCalls += 1; },
    learnTickerMeta() {},
    normalizeType: value => value || 'Ação',
    notaNorm: value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase(),
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
    snippet('snapshotFinancialImportState', 'restoreFinancialImportState'),
    snippet('restoreFinancialImportState', 'persistFinancialImportState'),
    snippet('persistFinancialImportState', 'save'),
    snippet('canonicalNotaTradeDate', 'canonicalNotaBrokerIdentity'),
    snippet('canonicalNotaBrokerIdentity', 'parseNotaCorretoraWorkbook'),
    snippet('importedAssetSnapshotEqual', 'rfDetailedHasManualAuthority'),
    snippet('rfDetailedHasManualAuthority', 'rfDetailedFindExistingAsset'),
    snippet('rfDetailedFindExistingAsset', 'rfDetailedPossibleDuplicateAsset'),
  ];
  vm.runInContext([...sharedHelpers, ...functions.map(([name, nextName]) => snippet(name, nextName))].join('\n'), context);
  return { context, metrics };
}

function installSyntheticLocalPersistence(context, { failStorage = false, failQueue = false } = {}) {
  const persisted = new Map();
  let failStorageNow = failStorage;
  let failQueueNow = failQueue;
  let storageWrites = 0;
  const snapshot = () => JSON.stringify({
    assets: context.S.assets,
    aportes: context.S.aportes,
    learnMeta: context.S.learnMeta,
    wallets: context.S.wallets,
  });
  persisted.set('civ5', snapshot());
  context.STOR = 'civ5';
  context.localStorage = {
    getItem: key => persisted.get(key) ?? null,
    setItem(key, value) {
      if (failStorageNow && key === 'civ5') throw new Error('SYNTHETIC_STORAGE_FAILURE');
      persisted.set(key, String(value));
      if (key === 'civ5') storageWrites += 1;
    },
  };
  context.isV250OfflineCachedSession = () => false;
  context.isLocalTestMode = () => false;
  context.isProtectedReadOnlyQaBoot = () => false;
  context.isAuthoritativeLocalRecoveryBoot = () => false;
  context.canEditFromThisTab = () => context.S._financialWriteQuarantined !== true;
  context.cloneData = value => JSON.parse(JSON.stringify(value ?? null));
  context.syncWalletFromState = () => {
    const wallet = context.S.wallets?.find(item => item.id === context.S.activeWalletId);
    if (wallet) {
      wallet.assets = JSON.parse(JSON.stringify(context.S.assets));
      wallet.aportes = JSON.parse(JSON.stringify(context.S.aportes));
      wallet.learnMeta = JSON.parse(JSON.stringify(context.S.learnMeta || {}));
    }
  };
  context.PersistenceCore = {
    serializeStoredState(state) {
      return JSON.stringify({
        assets: state.assets,
        aportes: state.aportes,
        learnMeta: state.learnMeta,
        wallets: state.wallets,
      });
    },
  };
  context.normalizeGoals = value => value || {};
  context.queueCloudSave = () => {
    if (failQueueNow) throw new Error('SYNTHETIC_CLOUD_QUEUE_FAILURE');
  };
  context.debugError = () => {};
  context.toast = () => {};
  const saveStart = html.indexOf('function save(){');
  const saveEnd = html.indexOf('async function releaseCloudSyncAfterSuccessfulReconciliation', saveStart);
  assert.notEqual(saveStart, -1);
  assert.notEqual(saveEnd, -1);
  vm.runInContext(html.slice(saveStart, saveEnd), context);
  return {
    getPersisted: () => JSON.parse(persisted.get('civ5')),
    persisted,
    getStorageWrites: () => storageWrites,
    setFailures(next = {}) {
      failStorageNow = next.failStorage === true;
      failQueueNow = next.failQueue === true;
    },
  };
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
    S: { noteReview: { noteKey: 'v284-note|INTER|number|1|01-01-2026', noteIdentity: 'v284-note|INTER|number|1|01-01-2026', broker: 'INTER', noteNumber: '1', tradeDate: '2026-01-01', completenessStatus: 'COMPLETE', identityStatus: 'READY', rows: [{ include: true, ticker: 'SYN1', operation: 'compra', qty: 1, price: 10, sourceItem: { date: '2026-01-01', operation: 'compra' } }] } },
    syncAssetsFromAportes() { metrics.portfolioMutations += 1; },
  });
  context.openNotaReview({ items: [{ ticker: 'SYN1', qty: 1, price: 10, operation: 'compra', date: '2026-01-01' }], noteKey: 'v284-note|INTER|number|1|01-01-2026', noteIdentity: 'v284-note|INTER|number|1|01-01-2026', broker: 'INTER', noteNumber: '1', tradeDate: '2026-01-01', completenessStatus: 'COMPLETE', identityStatus: 'READY' }, 'synthetic.pdf');
  assert.equal(metrics.saveCalls, 0);
  context.closeNotaReview();
  assert.equal(metrics.saveCalls, 0);
  context.S.noteReview = { noteKey: 'v284-note|INTER|number|1|01-01-2026', noteIdentity: 'v284-note|INTER|number|1|01-01-2026', broker: 'INTER', noteNumber: '1', tradeDate: '2026-01-01', completenessStatus: 'COMPLETE', identityStatus: 'READY', rows: [{ include: true, ticker: 'SYN1', operation: 'compra', qty: 1, price: 10, sourceItem: { date: '2026-01-01', operation: 'compra' } }] };
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
  context.importB3Review(); // queued second confirmation sees the closed review
  const afterFirst = JSON.stringify(context.S.assets);
  assert.equal(metrics.saveCalls, 1, 'duplo envio da confirmação persiste a posição apenas uma vez');
  assert.equal(metrics.quoteCalls, 1);
  context.S.b3Review = { items: [item], selectedSheets: { Ações: true }, importDate: '2026-01-01' };
  context.importB3Review();
  assert.equal(metrics.saveCalls, 1, 'reimport idêntico não deve persistir novamente');
  assert.equal(metrics.quoteCalls, 1, 'reimport idêntico não deve disparar recálculo downstream');
  assert.equal(JSON.stringify(context.S.assets), afterFirst);
});

test('B3 positions: repeated confirmation upserts a snapshot without accumulating quantity', () => {
  const { context } = harness([['applyB3ImportedPositions', 'openBrokerNoteImport']], {
    S: { assets: [], learnMeta: {}, wallets: [] },
  });
  const persistence = installSyntheticLocalPersistence(context);
  const position = { ticker: 'SYN-SNAPSHOT', qty: 2, price: 50, value: 100, type: 'Ação' };
  assert.equal(context.applyB3ImportedPositions([position], '2026-01-01').status, 'APPLIED');
  assert.equal(context.applyB3ImportedPositions([position], '2026-01-01').ignored, 1);
  assert.equal(persistence.getStorageWrites(), 1);
  assert.equal(persistence.getPersisted().assets.length, 1);
  assert.equal(persistence.getPersisted().assets[0].qty, 2);
  assert.equal(context.applyB3ImportedPositions([{ ...position, qty: 3, value: 150 }], '2026-01-02').updated, 1);
  assert.equal(persistence.getPersisted().assets.length, 1);
  assert.equal(persistence.getPersisted().assets[0].qty, 3);
  assert.equal(persistence.getStorageWrites(), 2);
});

test('B3 positions: failed save quarantines; retry after reload creates one durable snapshot', () => {
  const { context } = harness([['applyB3ImportedPositions', 'openBrokerNoteImport']], {
    S: { assets: [], learnMeta: {}, wallets: [] },
  });
  const persistence = installSyntheticLocalPersistence(context, { failStorage: true });
  const position = { ticker: 'SYN-RETRY', qty: 2, price: 50, value: 100, type: 'Ação' };
  assert.equal(context.applyB3ImportedPositions([position], '2026-01-01').status, 'SAVE_OUTCOME_UNKNOWN');
  assert.equal(context.S.assets.length, 0);
  assert.equal(context.S._financialWriteQuarantined, true);
  assert.equal(persistence.getPersisted().assets.length, 0);
  context.S._financialWriteQuarantined = false; // synthetic reload after persisted state check
  persistence.setFailures();
  assert.equal(context.applyB3ImportedPositions([position], '2026-01-01').status, 'APPLIED');
  assert.equal(context.applyB3ImportedPositions([position], '2026-01-01').ignored, 1);
  assert.equal(persistence.getPersisted().assets.length, 1);
  assert.equal(persistence.getStorageWrites(), 1);
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
  const stamp = 'v284-note|INTER|number|1|01-01-2026';
  const existing = { id: 'synthetic-aporte', ticker: 'SYN1', operation: 'compra', qty: 2, price: 50, date: '2026-01-01', noteKey: stamp, decision: '[IMPORT_NOTA_CORRETORA] nota 1', type: 'Ação' };
  const sourceItem = { ticker: 'SYN1', operation: 'compra', qty: 2, price: 50, date: '2026-01-01', type: 'Ação' };
  const { context, metrics } = harness([
    ['importNotaReview', 'notaReviewSummary'], ['applyNotaCorretoraTrades', 'openNotaReview'],
  ], {
    S: { aportes: [existing], noteReview: { noteKey: stamp, noteIdentity: stamp, broker: 'INTER', noteNumber: '1', tradeDate: '2026-01-01', completenessStatus: 'COMPLETE', identityStatus: 'READY', rows: [{ include: true, ticker: 'SYN1', operation: 'compra', qty: 2, price: 50, type: 'Ação', sourceItem }] } },
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
  const stamp = 'v284-note|INTER|number|1|01-01-2026';
  const existing = { id: 'synthetic-aporte', ticker: 'SYN1', operation: 'compra', qty: 2, price: 50, date: '2026-01-01', noteKey: stamp, decision: '[IMPORT_NOTA_CORRETORA] nota 1', type: 'Ação' };
  const sourceItem = { ticker: 'SYN1', operation: 'compra', qty: 3, price: 50, date: '2026-01-01', type: 'Ação' };
  const { context, metrics } = harness([
    ['applyNotaCorretoraTrades', 'openNotaReview'],
  ], {
    S: { aportes: [existing] },
    syncAssetsFromAportes() {},
  });
  const before = JSON.stringify(context.S.aportes);
  const result = context.applyNotaCorretoraTrades([sourceItem], stamp, '1', '2026-01-01', 'INTER', stamp, 'COMPLETE', 'READY');
  assert.equal(result?.status, 'CONFLICT', 'mesma identidade externa com valores divergentes exige revisão');
  assert.equal(metrics.saveCalls, 0);
  assert.equal(JSON.stringify(context.S.aportes), before);
});

test('Inter note review: changed batch keeps the preview open for review', () => {
  const stamp = 'v284-note|INTER|number|1|01-01-2026';
  const existing = { id: 'synthetic-aporte', ticker: 'SYN1', operation: 'compra', qty: 2, price: 50, date: '2026-01-01', noteKey: stamp, decision: '[IMPORT_NOTA_CORRETORA] nota 1', type: 'Ação' };
  const review = { noteKey: stamp, noteIdentity: stamp, broker: 'INTER', noteNumber: '1', tradeDate: '2026-01-01', completenessStatus: 'COMPLETE', identityStatus: 'READY', rows: [{ include: true, ticker: 'SYN1', operation: 'compra', qty: 3, price: 50, type: 'Ação', sourceItem: {} }] };
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

test('Inter PDF: failed persistence restores the confirmed note and blocks later-save leakage', () => {
  const note = { valid: true, noteKey: 'synthetic-pdf-save-failure', noteNumber: '8', tradeDate: '2026-01-02', broker: 'INTER', rows: [{ include: true, ticker: 'SYN2', qty: 1, price: 25, total: 25, operation: 'compra', type: 'Ação', sector: 'Ação' }], operationsTotal: 25, costs: 0 };
  const reviewState = { parsed: note, rateCosts: false, allowDuplicate: false };
  const { context, metrics } = harness([
    ['confirmBrokerNoteImport', 'closeBrokerNoteImportSuccess'],
  ], {
    S: { aportes: [], assets: [], learnMeta: {}, wallets: [], brokerNoteImport: reviewState },
    brokerNoteCanConfirm: () => true,
    detectBrokerNoteDuplicate: () => false,
    brokerNoteValidTicker: () => true,
    brokerNoteAdjustedRow: row => ({ ...row, adjustedPrice: row.price, adjustedTotal: row.total, allocatedCost: 0 }),
    syncAssetsFromAportes() {},
    fetchQuotes() { metrics.quoteCalls += 1; },
    scheduleAutoProventosGratis() { metrics.scheduleCalls += 1; },
    learnTickerMeta() {},
    importCenterFinishReview() {},
  });
  context.save = () => {
    if (context.S._financialWriteQuarantined === true) return false;
    metrics.saveCalls += 1;
    return false;
  };
  const result = context.confirmBrokerNoteImport();
  assert.equal(result?.status, 'SAVE_OUTCOME_UNKNOWN');
  assert.equal(metrics.saveCalls, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(context.S.aportes)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(context.S.brokerNoteImport)), reviewState, 'review remains available for explicit reload/reconciliation');
  assert.equal(context.S._financialWriteQuarantined, true);
  context.S.aportes.push({ id: 'synthetic-unrelated', ticker: 'SYN3' });
  assert.equal(context.save(), false, 'later saves must remain blocked in quarantined session');
  assert.equal(metrics.saveCalls, 1);
});

test('Inter PDF: explicit confirmation persists once before success side effects', () => {
  const note = { valid: true, noteKey: 'synthetic-pdf-confirmed', noteNumber: '9', tradeDate: '2026-01-03', broker: 'INTER', rows: [{ include: true, ticker: 'SYN4', qty: 2, price: 15, total: 30, operation: 'compra', type: 'Ação', sector: 'Ação' }], operationsTotal: 30, costs: 0 };
  const order = [];
  const { context, metrics } = harness([
    ['confirmBrokerNoteImport', 'closeBrokerNoteImportSuccess'],
  ], {
    S: { aportes: [], assets: [], learnMeta: {}, wallets: [], brokerNoteImport: { parsed: note, rateCosts: false, allowDuplicate: false } },
    brokerNoteCanConfirm: () => true,
    detectBrokerNoteDuplicate: () => false,
    brokerNoteValidTicker: () => true,
    brokerNoteAdjustedRow: row => ({ ...row, adjustedPrice: row.price, adjustedTotal: row.total, allocatedCost: 0 }),
    syncAssetsFromAportes() { order.push('sync'); },
    fetchQuotes() { metrics.quoteCalls += 1; order.push('quotes'); },
    scheduleAutoProventosGratis() { metrics.scheduleCalls += 1; order.push('schedule'); },
    learnTickerMeta() {},
    importCenterFinishReview() {},
  });
  context.save = () => { metrics.saveCalls += 1; order.push('save'); return true; };
  const result = context.confirmBrokerNoteImport();
  assert.equal(result?.status, 'APPLIED');
  assert.equal(metrics.saveCalls, 1);
  assert.equal(context.S.aportes.length, 1);
  assert.equal(order.indexOf('save') >= 0 && order.indexOf('save') < order.indexOf('schedule'), true);
});

test('Inter PDF: explicit confirmation reaches synthetic local storage exactly once', () => {
  const note = { valid: true, noteKey: 'synthetic-pdf-local-save', noteNumber: '10', tradeDate: '2026-01-04', broker: 'INTER', rows: [{ include: true, ticker: 'SYN5', qty: 1, price: 40, total: 40, operation: 'compra', type: 'Ação', sector: 'Ação' }], operationsTotal: 40, costs: 0 };
  const { context } = harness([
    ['confirmBrokerNoteImport', 'closeBrokerNoteImportSuccess'],
  ], {
    S: { aportes: [], assets: [], learnMeta: {}, wallets: [], activeWalletId: '', brokerNoteImport: { parsed: note, rateCosts: false, allowDuplicate: false } },
    brokerNoteCanConfirm: () => true,
    detectBrokerNoteDuplicate: () => false,
    brokerNoteValidTicker: () => true,
    brokerNoteAdjustedRow: row => ({ ...row, adjustedPrice: row.price, adjustedTotal: row.total, allocatedCost: 0 }),
    syncAssetsFromAportes() {},
    fetchQuotes() {},
    scheduleAutoProventosGratis() {},
    learnTickerMeta() {},
    importCenterFinishReview() {},
  });
  const persistence = installSyntheticLocalPersistence(context);
  assert.equal(context.confirmBrokerNoteImport()?.status, 'APPLIED');
  assert.equal(persistence.getStorageWrites(), 1);
  assert.equal(persistence.getPersisted().aportes.length, 1);
  assert.equal(persistence.getPersisted().aportes[0].brokerNoteKey, note.noteKey);
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

function legacyNoteHarness() {
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  return harness([
    ['parseNotaCorretoraWorkbook', 'hasSameB3Import'],
    ['applyNotaCorretoraTrades', 'openNotaReview'],
    ['openNotaReview', 'closeNotaReview'],
    ['importNotaReview', 'notaReviewSummary'],
  ], {
    XLSX: { utils: { sheet_to_json: sheet => sheet.rows } },
    notaNorm: normalize,
    notaFindHeaderIndex: rows => rows.findIndex(row => row.includes('C/V')),
    notaFindValue(rows, key) {
      const normalizedKey = normalize(key);
      for (const row of rows) {
        for (let index = 0; index < row.length; index += 1) {
          if (normalize(row[index]) !== normalizedKey) continue;
          for (let next = index + 1; next < row.length; next += 1) {
            if (String(row[next] || '').trim()) return String(row[next]).trim();
          }
        }
      }
      return '';
    },
    cleanAssetCode: value => String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase(),
    notaTickerFromSpec: value => String(value || '').trim().toUpperCase(),
    inferNotaMeta: () => ({ type: 'Ação', sector: 'Ação' }),
    parseNum: value => Number(value) || 0,
    syncAssetsFromAportes() {},
  });
}

function syntheticLegacyNote(context, { fileName, broker = '', noteNumber = '', tradeDate = '05/08/2026', trades }) {
  const rows = [
    ['NUM NOTA', noteNumber],
    ['DATA PREGÃO', tradeDate],
    ['CORRETORA', broker],
    ['C/V', 'TIPO DE MERCADO', 'ESPECIFICAÇÃO DO TÍTULO', 'OBS', 'QUANTIDADE', 'PREÇO DE LIQUIDAÇÃO(R$)', 'COMPRA/VENDA (R$)'],
    ...trades.map(({ operation = 'C', ticker = 'SYN1', qty = 2, price = 50, total } = {}) => [operation, 'VISTA', ticker, '', qty, price, total === undefined ? Number(qty) * Number(price) : total]),
  ];
  return context.parseNotaCorretoraWorkbook({
    SheetNames: ['Nota sintética'],
    Sheets: { 'Nota sintética': { rows } },
  }, fileName);
}

test('PARTIAL-1: an invalid trade row prevents a valid subset from becoming ready or writing', () => {
  const { context, metrics } = legacyNoteHarness();
  const parsed = syntheticLegacyNote(context, { fileName: 'parcial.xlsx', broker: 'INTER DTVM LTDA', trades: [{}, { ticker: 'SYN2', qty: 'bad' }] });
  assert.equal(parsed.identityStatus, 'REVIEW_REQUIRED');
  assert.equal(applySyntheticLegacyNote(context, parsed)?.status, 'REVIEW_REQUIRED');
  assert.equal(metrics.saveCalls, 0);
});

test('PARTIAL-2: invalid quantity in an economic row fails closed', () => {
  const { context } = legacyNoteHarness();
  const parsed = syntheticLegacyNote(context, { fileName: 'qty-invalida.xlsx', broker: 'INTER DTVM LTDA', trades: [{}, { ticker: 'SYN2', qty: 'bad' }] });
  assert.equal(parsed.completenessStatus, 'PARTIAL');
  assert.equal(parsed.invalidRowCount, 1);
});

test('PARTIAL-3: invalid price without authoritative total fails closed', () => {
  const { context } = legacyNoteHarness();
  const parsed = syntheticLegacyNote(context, { fileName: 'preco-invalido.xlsx', broker: 'INTER DTVM LTDA', trades: [{}, { ticker: 'SYN2', price: 'bad', total: 100 }] });
  assert.equal(parsed.identityStatus, 'REVIEW_REQUIRED');
});

test('PARTIAL-4: an economic row missing asset identity fails closed', () => {
  const { context } = legacyNoteHarness();
  const parsed = syntheticLegacyNote(context, { fileName: 'ativo-ausente.xlsx', broker: 'INTER DTVM LTDA', trades: [{}, { ticker: '' }] });
  assert.equal(parsed.identityStatus, 'REVIEW_REQUIRED');
});

test('PARTIAL-5: fully parsed note retains ready identity', () => {
  const { context } = legacyNoteHarness();
  const parsed = syntheticLegacyNote(context, { fileName: 'completa.xlsx', broker: 'INTER DTVM LTDA', trades: [{}] });
  assert.equal(parsed.identityStatus, 'READY');
  assert.equal(parsed.completenessStatus, 'COMPLETE');
});

test('PARTIAL-6: all invalid trade rows never reach persistence', () => {
  const { context, metrics } = legacyNoteHarness();
  const parsed = syntheticLegacyNote(context, { fileName: 'todas-invalidas.xlsx', broker: 'INTER DTVM LTDA', trades: [{ qty: 'bad' }, { ticker: '' }] });
  assert.ok(['INVALID', 'REVIEW_REQUIRED'].includes(parsed.identityStatus));
  assert.notEqual(applySyntheticLegacyNote(context, parsed)?.status, 'APPLIED');
  assert.equal(metrics.saveCalls, 0);
});

test('PARTIAL-7: incomplete replay cannot be accepted as a duplicate or new import', () => {
  const { context, metrics } = legacyNoteHarness();
  const complete = syntheticLegacyNote(context, { fileName: 'completa.xlsx', broker: 'INTER DTVM LTDA', trades: [{}] });
  const partial = syntheticLegacyNote(context, { fileName: 'incompleta.xlsx', broker: 'INTER DTVM LTDA', trades: [{}, { ticker: 'SYN2', qty: 'bad' }] });
  assert.equal(applySyntheticLegacyNote(context, complete)?.status, 'APPLIED');
  assert.equal(applySyntheticLegacyNote(context, partial)?.status, 'REVIEW_REQUIRED');
  assert.equal(metrics.saveCalls, 1);
});

test('PARTIAL-8: partial note item is blocked while a separate complete note remains eligible', () => {
  const { context, metrics } = legacyNoteHarness();
  const complete = syntheticLegacyNote(context, { fileName: 'completa.xlsx', broker: 'INTER DTVM LTDA', noteNumber: '901', trades: [{}] });
  const partial = syntheticLegacyNote(context, { fileName: 'parcial.xlsx', broker: 'INTER DTVM LTDA', noteNumber: '902', trades: [{}, { qty: 0 }] });
  assert.equal(applySyntheticLegacyNote(context, partial)?.status, 'REVIEW_REQUIRED');
  assert.equal(applySyntheticLegacyNote(context, complete)?.status, 'APPLIED');
  assert.equal(metrics.saveCalls, 1);
});

test('PARTIAL-9: parser completeness diagnostics reach preview and writer integration', () => {
  const { context, metrics } = legacyNoteHarness();
  const parsed = syntheticLegacyNote(context, { fileName: 'preview-parcial.xlsx', broker: 'INTER', trades: [{}, { ticker: 'SYN2', qty: 'bad' }] });
  context.openNotaReview(parsed, 'preview-parcial.xlsx');
  assert.equal(context.S.noteReview.completenessStatus, 'PARTIAL');
  assert.equal(context.S.noteReview.sourceRowCount, 2);
  assert.equal(context.S.noteReview.parsedRowCount, 1);
  assert.equal(context.S.noteReview.invalidRowCount, 1);
  assert.match(context.S.noteReview.warnings.join(' '), /linha\(s\) econômica\(s\)/);
  context.importNotaReview();
  assert.equal(metrics.saveCalls, 0);
  assert.equal(context.S.noteReview.completenessStatus, 'PARTIAL');
});

test('PARTIAL-WRITER: writer independently rejects partial completeness even with otherwise valid identity', () => {
  const { context, metrics } = legacyNoteHarness();
  const parsed = syntheticLegacyNote(context, { fileName: 'partial.xlsx', broker: 'INTER', trades: [{}] });
  const result = context.applyNotaCorretoraTrades(parsed.items, parsed.noteKey, parsed.noteNumber, parsed.tradeDate, parsed.broker, parsed.noteIdentity, 'PARTIAL', 'READY');
  assert.equal(result?.status, 'REVIEW_REQUIRED');
  assert.equal(metrics.saveCalls, 0);
});

test('WRITER-IDENTITY: missing operation or trade date cannot default into a financial record', () => {
  const { context, metrics } = legacyNoteHarness();
  const parsed = syntheticLegacyNote(context, { fileName: 'writer-guard.xlsx', broker: 'INTER', noteNumber: '901', trades: [{}] });
  const missingOperation = { ...parsed.items[0], operation: '' };
  const missingDate = { ...parsed.items[0], date: '' };
  assert.equal(context.applyNotaCorretoraTrades([missingOperation], parsed.noteKey, parsed.noteNumber, parsed.tradeDate, parsed.broker, parsed.noteIdentity, 'COMPLETE', 'READY')?.status, 'REVIEW_REQUIRED');
  assert.equal(context.applyNotaCorretoraTrades([missingDate], parsed.noteKey, parsed.noteNumber, parsed.tradeDate, parsed.broker, parsed.noteIdentity, 'COMPLETE', 'READY')?.status, 'REVIEW_REQUIRED');
  assert.equal(metrics.saveCalls, 0);
});

test('BATCH-5: failed save is not reported as a completed import or followed by secondary effects', () => {
  const { context, metrics } = legacyNoteHarness();
  const parsed = syntheticLegacyNote(context, { fileName: 'save-failure.xlsx', broker: 'INTER', noteNumber: '904', trades: [{}] });
  context.save = () => { metrics.saveCalls += 1; return false; };
  const result = applySyntheticLegacyNote(context, parsed);
  assert.equal(result?.status, 'SAVE_OUTCOME_UNKNOWN');
  assert.equal(metrics.saveCalls, 1);
  assert.equal(metrics.quoteCalls, 0);
  assert.equal(metrics.scheduleCalls, 0);
});

test('BATCH-5-UI: unknown save outcome blocks same-session retry and keeps review open', () => {
  const { context, metrics } = legacyNoteHarness();
  const parsed = syntheticLegacyNote(context, { fileName: 'save-failure-ui.xlsx', broker: 'INTER', noteNumber: '905', trades: [{}] });
  context.save = () => { metrics.saveCalls += 1; return false; };
  context.openNotaReview(parsed, 'save-failure-ui.xlsx');
  context.importNotaReview();
  assert.equal(context.S.noteReview.persistenceStatus, 'QUARANTINED');
  assert.equal(metrics.saveCalls, 1);
  assert.equal(context.S.aportes.length, 0, 'falha de persistência restaura aportes em memória');
  context.importNotaReview();
  assert.equal(metrics.saveCalls, 1);
  assert.ok(metrics.alerts.length >= 2);
});

test('ORDER-1: canonical identity is independent of source row order', () => {
  const { context } = legacyNoteHarness();
  const forward = syntheticLegacyNote(context, { fileName: 'ordem-a.xlsx', broker: 'INTER DTVM LTDA', trades: [{ ticker: 'SYN1' }, { ticker: 'SYN2' }] });
  const reverse = syntheticLegacyNote(context, { fileName: 'ordem-b.xlsx', broker: 'INTER DTVM LTDA', trades: [{ ticker: 'SYN2' }, { ticker: 'SYN1' }] });
  assert.equal(forward.noteIdentity, reverse.noteIdentity);
});

test('ORDER-2: canonical identity ordering is stable for accented identifiers', () => {
  const { context } = legacyNoteHarness();
  const a = syntheticLegacyNote(context, { fileName: 'unicode-a.xlsx', broker: 'INTER DTVM LTDA', trades: [{ ticker: 'ÁRV1' }, { ticker: 'ÉCO2' }] });
  const b = syntheticLegacyNote(context, { fileName: 'unicode-b.xlsx', broker: 'INTER DTVM LTDA', trades: [{ ticker: 'ÉCO2' }, { ticker: 'ÁRV1' }] });
  assert.equal(a.noteIdentity, b.noteIdentity);
});

test('ORDER-3: canonical trade ordering does not invoke locale-sensitive comparison', () => {
  const parserSource = snippet('parseNotaCorretoraWorkbook', 'hasSameB3Import');
  assert.doesNotMatch(parserSource, /localeCompare/);
  assert.match(parserSource, /left<right\?-1:\(left>right\?1:0\)/);
  const writerSource = snippet('applyNotaCorretoraTrades', 'openNotaReview');
  assert.doesNotMatch(writerSource, /localeCompare/);
});

test('PARSER-INTEGRATION: file handler forwards every completeness diagnostic to preview', () => {
  assert.match(html, /const \{items,warnings,importDate,stats,noteKey,noteNumber,tradeDate,broker,identityStatus,noteIdentity,completenessStatus,sourceRowCount,parsedRowCount,invalidRowCount,discardedRowCount,ambiguousRowCount\}=parsed/);
});

test('ORDER-4: duplicate semantic operations retain the same canonical fingerprint in reverse order', () => {
  const { context } = legacyNoteHarness();
  const left = syntheticLegacyNote(context, { fileName: 'dup-a.xlsx', broker: 'INTER', trades: [{ ticker: 'SYN1' }, { ticker: 'SYN1' }, { ticker: 'SYN2' }] });
  const right = syntheticLegacyNote(context, { fileName: 'dup-b.xlsx', broker: 'INTER DTVM LTDA', trades: [{ ticker: 'SYN2' }, { ticker: 'SYN1' }, { ticker: 'SYN1' }] });
  assert.equal(left.noteIdentity, right.noteIdentity);
});

test('ORDER-5: materially different semantic set has a different fingerprint', () => {
  const { context } = legacyNoteHarness();
  const left = syntheticLegacyNote(context, { fileName: 'set-a.xlsx', broker: 'INTER', trades: [{ ticker: 'SYN1' }] });
  const right = syntheticLegacyNote(context, { fileName: 'set-b.xlsx', broker: 'INTER', trades: [{ ticker: 'SYN2' }] });
  assert.notEqual(left.noteIdentity, right.noteIdentity);
});

test('LEGACY-1: same date legacy row with a different explicit broker is not date-only conflict', () => {
  const { context, metrics } = legacyNoteHarness();
  context.S.aportes.push({ id: 'legacy', date: '05/08/2026', broker: 'INTER', decision: '[IMPORT_NOTA_CORRETORA] nota 1 · mercado · SYN1', noteNumber: '1' });
  const parsed = syntheticLegacyNote(context, { fileName: 'xp.xlsx', broker: 'XP INVESTIMENTOS', noteNumber: '1', trades: [{}] });
  assert.equal(applySyntheticLegacyNote(context, parsed)?.status, 'APPLIED');
  assert.equal(metrics.saveCalls, 1);
});

test('LEGACY-2: same date legacy row with a different stable note number may coexist', () => {
  const { context, metrics } = legacyNoteHarness();
  context.S.aportes.push({ id: 'legacy', date: '05/08/2026', broker: 'INTER', decision: '[IMPORT_NOTA_CORRETORA] nota 1 · mercado · SYN1', noteNumber: '1' });
  const parsed = syntheticLegacyNote(context, { fileName: 'nota-2.xlsx', broker: 'INTER DTVM LTDA', noteNumber: '2', trades: [{}] });
  assert.equal(applySyntheticLegacyNote(context, parsed)?.status, 'APPLIED');
  assert.equal(metrics.saveCalls, 1);
});

test('LEGACY-3: same date and same stable note number remain conservative review', () => {
  const { context, metrics } = legacyNoteHarness();
  context.S.aportes.push({ id: 'legacy', date: '05/08/2026', decision: '[IMPORT_NOTA_CORRETORA] nota 1 · mercado · SYN1', noteNumber: '1' });
  const parsed = syntheticLegacyNote(context, { fileName: 'nota-1.xlsx', broker: 'INTER DTVM LTDA', noteNumber: '1', trades: [{}] });
  assert.equal(applySyntheticLegacyNote(context, parsed)?.status, 'REVIEW_REQUIRED');
  assert.equal(metrics.saveCalls, 0);
});

test('LEGACY-4: date-only legacy evidence with unknown broker is review-required', () => {
  const { context, metrics } = legacyNoteHarness();
  context.S.aportes.push({ id: 'legacy', date: '05/08/2026', decision: '[IMPORT_NOTA_CORRETORA] registro legado' });
  const parsed = syntheticLegacyNote(context, { fileName: 'nota.xlsx', broker: 'XP INVESTIMENTOS', noteNumber: '2', trades: [{}] });
  assert.equal(applySyntheticLegacyNote(context, parsed)?.status, 'REVIEW_REQUIRED');
  assert.equal(metrics.saveCalls, 0);
});

test('LEGACY-5: date and broker with ambiguous legacy note identity stays review-required', () => {
  const { context, metrics } = legacyNoteHarness();
  context.S.aportes.push({ id: 'legacy', date: '05/08/2026', broker: 'INTER', decision: '[IMPORT_NOTA_CORRETORA] nota sem identidade estável' });
  const parsed = syntheticLegacyNote(context, { fileName: 'nota.xlsx', broker: 'INTER', trades: [{}] });
  assert.equal(applySyntheticLegacyNote(context, parsed)?.status, 'REVIEW_REQUIRED');
  assert.equal(metrics.saveCalls, 0);
});

test('LEGACY-6: two numbered notes on same date and broker may coexist', () => {
  const { context, metrics } = legacyNoteHarness();
  const first = syntheticLegacyNote(context, { fileName: 'nota-1.xlsx', broker: 'INTER DTVM LTDA', noteNumber: '1', trades: [{}] });
  const second = syntheticLegacyNote(context, { fileName: 'nota-2.xlsx', broker: 'INTER DTVM LTDA', noteNumber: '2', trades: [{}] });
  assert.equal(applySyntheticLegacyNote(context, first)?.status, 'APPLIED');
  assert.equal(applySyntheticLegacyNote(context, second)?.status, 'APPLIED');
  assert.equal(metrics.saveCalls, 2);
});

test('BATCH-4: conflict blocks the entire note before a new row can partially persist', () => {
  const { context, metrics } = legacyNoteHarness();
  const original = syntheticLegacyNote(context, { fileName: 'original.xlsx', broker: 'INTER', noteNumber: '903', trades: [{}] });
  assert.equal(applySyntheticLegacyNote(context, original)?.status, 'APPLIED');
  const before = JSON.stringify(context.S.aportes);
  const changedAndNew = syntheticLegacyNote(context, { fileName: 'changed.xlsx', broker: 'INTER', noteNumber: '903', trades: [{ qty: 3 }, { ticker: 'SYN2' }] });
  assert.equal(applySyntheticLegacyNote(context, changedAndNew)?.status, 'CONFLICT');
  assert.equal(metrics.saveCalls, 1);
  assert.equal(JSON.stringify(context.S.aportes), before);
});

test('BROKER-1: punctuation variants of unknown broker names remain distinct identities', () => {
  const { context } = legacyNoteHarness();
  const punctuated = syntheticLegacyNote(context, { fileName: 'broker-a.xlsx', broker: 'A-B Investimentos', trades: [{}] });
  const spaced = syntheticLegacyNote(context, { fileName: 'broker-b.xlsx', broker: 'A B Investimentos', trades: [{}] });
  assert.notEqual(punctuated.noteIdentity, spaced.noteIdentity);
});

test('BROKER-2: supported broker aliases canonicalize consistently without folding accented unknown labels', () => {
  const { context } = legacyNoteHarness();
  const short = syntheticLegacyNote(context, { fileName: 'inter-a.xlsx', broker: 'INTER', trades: [{}] });
  const legal = syntheticLegacyNote(context, { fileName: 'inter-b.xlsx', broker: 'INTER DTVM LTDA', trades: [{}] });
  const accentedUnknown = syntheticLegacyNote(context, { fileName: 'accent.xlsx', broker: 'INTÉR', trades: [{}] });
  const punctuationCollisionCandidate = syntheticLegacyNote(context, { fileName: 'punct.xlsx', broker: 'I-NTER', trades: [{}] });
  assert.equal(short.noteIdentity, legal.noteIdentity);
  assert.notEqual(short.noteIdentity, accentedUnknown.noteIdentity);
  assert.notEqual(short.noteIdentity, punctuationCollisionCandidate.noteIdentity);
});

function applySyntheticLegacyNote(context, parsed) {
  return context.applyNotaCorretoraTrades(
    parsed.items,
    parsed.noteKey,
    parsed.noteNumber,
    parsed.tradeDate,
    parsed.broker,
    parsed.noteIdentity,
    parsed.completenessStatus,
    parsed.identityStatus,
  );
}

test('NOTE-ID-1: unnumbered note reimported under same filename is duplicate-safe', () => {
  const { context, metrics } = legacyNoteHarness();
  const first = syntheticLegacyNote(context, { fileName: 'nota-a.xlsx', broker: 'INTER DTVM LTDA', trades: [{}] });
  const second = syntheticLegacyNote(context, { fileName: 'nota-a.xlsx', broker: 'INTER DTVM LTDA', trades: [{}] });
  assert.equal(applySyntheticLegacyNote(context, first)?.status, 'APPLIED');
  assert.notEqual(second.identityStatus, 'REVIEW_REQUIRED');
  assert.notEqual(applySyntheticLegacyNote(context, second)?.status, 'APPLIED');
  assert.equal(metrics.saveCalls, 1);
});

test('NOTE-ID-2: same unnumbered note renamed is duplicate-safe', () => {
  const { context, metrics } = legacyNoteHarness();
  const first = syntheticLegacyNote(context, { fileName: 'nota-original.xlsx', broker: 'INTER DTVM LTDA', trades: [{}] });
  const renamed = syntheticLegacyNote(context, { fileName: 'renomeada.xlsx', broker: 'INTER DTVM LTDA', trades: [{}] });
  assert.equal(applySyntheticLegacyNote(context, first)?.status, 'APPLIED');
  assert.equal(applySyntheticLegacyNote(context, renamed)?.status, 'NO_OP');
  assert.equal(metrics.saveCalls, 1);
});

test('NOTE-ID-3: changed unnumbered trade for same broker/date requires review', () => {
  const { context, metrics } = legacyNoteHarness();
  const first = syntheticLegacyNote(context, { fileName: 'nota-original.xlsx', broker: 'INTER DTVM LTDA', trades: [{}] });
  const changed = syntheticLegacyNote(context, { fileName: 'nota-editada.xlsx', broker: 'INTER DTVM LTDA', trades: [{ qty: 3 }] });
  assert.equal(applySyntheticLegacyNote(context, first)?.status, 'APPLIED');
  assert.equal(applySyntheticLegacyNote(context, changed)?.status, 'CONFLICT');
  assert.equal(metrics.saveCalls, 1);
});

test('NOTE-ID-4: identical date/trades from distinct identified brokers do not collapse', () => {
  const { context, metrics } = legacyNoteHarness();
  const inter = syntheticLegacyNote(context, { fileName: 'inter.xlsx', broker: 'INTER DTVM LTDA', trades: [{}] });
  const xp = syntheticLegacyNote(context, { fileName: 'xp.xlsx', broker: 'XP INVESTIMENTOS', trades: [{}] });
  assert.equal(applySyntheticLegacyNote(context, inter)?.status, 'APPLIED');
  assert.equal(applySyntheticLegacyNote(context, xp)?.status, 'APPLIED');
  assert.equal(metrics.saveCalls, 2);
});

test('NOTE-ID-5: missing broker and note number fails closed for review', () => {
  const { context, metrics } = legacyNoteHarness();
  const ambiguous = syntheticLegacyNote(context, { fileName: 'nota-sem-metadados.xlsx', trades: [{}] });
  assert.equal(ambiguous.identityStatus, 'REVIEW_REQUIRED');
  assert.equal(applySyntheticLegacyNote(context, ambiguous)?.status, 'REVIEW_REQUIRED');
  assert.equal(metrics.saveCalls, 0);
});

test('NOTE-ID-6: numbered note identity is stable across filename changes', () => {
  const { context, metrics } = legacyNoteHarness();
  const first = syntheticLegacyNote(context, { fileName: 'nota-original.xlsx', broker: 'INTER DTVM LTDA', noteNumber: '77', trades: [{}] });
  const renamed = syntheticLegacyNote(context, { fileName: 'renomeada.xlsx', broker: 'INTER DTVM LTDA', noteNumber: '77', trades: [{}] });
  assert.equal(first.noteKey, renamed.noteKey);
  assert.equal(applySyntheticLegacyNote(context, first)?.status, 'APPLIED');
  assert.equal(applySyntheticLegacyNote(context, renamed)?.status, 'NO_OP');
  assert.equal(metrics.saveCalls, 1);
});

test('NOTE-ID-7: numbered note with changed content requires review', () => {
  const { context, metrics } = legacyNoteHarness();
  const first = syntheticLegacyNote(context, { fileName: 'nota-original.xlsx', broker: 'INTER DTVM LTDA', noteNumber: '77', trades: [{}] });
  const changed = syntheticLegacyNote(context, { fileName: 'renomeada.xlsx', broker: 'INTER DTVM LTDA', noteNumber: '77', trades: [{ qty: 3 }] });
  assert.equal(applySyntheticLegacyNote(context, first)?.status, 'APPLIED');
  assert.equal(applySyntheticLegacyNote(context, changed)?.status, 'CONFLICT');
  assert.equal(metrics.saveCalls, 1);
});

test('NOTE-ID-8: second exact application does not persist again', () => {
  const { context, metrics } = legacyNoteHarness();
  const first = syntheticLegacyNote(context, { fileName: 'nota-original.xlsx', broker: 'INTER DTVM LTDA', trades: [{}] });
  const replay = syntheticLegacyNote(context, { fileName: 'renomeada.xlsx', broker: 'INTER DTVM LTDA', trades: [{}] });
  assert.equal(applySyntheticLegacyNote(context, first)?.status, 'APPLIED');
  const writesAfterFirst = metrics.saveCalls;
  assert.equal(applySyntheticLegacyNote(context, replay)?.status, 'NO_OP');
  assert.equal(metrics.saveCalls, writesAfterFirst);
});

test('NOTE-ID-9: malformed trade date fails closed without persistence', () => {
  const { context, metrics } = legacyNoteHarness();
  const malformed = syntheticLegacyNote(context, { fileName: 'nota.xlsx', broker: 'INTER DTVM LTDA', tradeDate: 'unknown', trades: [{}] });
  assert.equal(malformed.identityStatus, 'REVIEW_REQUIRED');
  assert.equal(applySyntheticLegacyNote(context, malformed)?.status, 'REVIEW_REQUIRED');
  assert.equal(metrics.saveCalls, 0);
});

test('NOTE-ID-10: same note number on a distinct trade date remains a separate identity', () => {
  const { context, metrics } = legacyNoteHarness();
  const first = syntheticLegacyNote(context, { fileName: 'nota-a.xlsx', broker: 'INTER DTVM LTDA', noteNumber: '77', tradeDate: '05/08/2026', trades: [{}] });
  const nextDate = syntheticLegacyNote(context, { fileName: 'nota-b.xlsx', broker: 'INTER DTVM LTDA', noteNumber: '77', tradeDate: '06/08/2026', trades: [{}] });
  assert.notEqual(first.noteKey, nextDate.noteKey);
  assert.equal(applySyntheticLegacyNote(context, first)?.status, 'APPLIED');
  assert.equal(applySyntheticLegacyNote(context, nextDate)?.status, 'APPLIED');
  assert.equal(metrics.saveCalls, 2);
});

test('NOTE-ID-11: writer rejects broker/date that do not match the parsed identity', () => {
  const { context, metrics } = legacyNoteHarness();
  const note = syntheticLegacyNote(context, { fileName: 'nota-a.xlsx', broker: 'INTER DTVM LTDA', noteNumber: '77', trades: [{}] });
  const result = context.applyNotaCorretoraTrades(note.items, note.noteKey, note.noteNumber, '06/08/2026', 'XP INVESTIMENTOS', note.noteIdentity, note.completenessStatus, note.identityStatus);
  assert.equal(result?.status, 'REVIEW_REQUIRED');
  assert.equal(metrics.saveCalls, 0);
});

test('SAVE-1: a real save false restores live import state and returns an explicit failure', () => {
  const { context } = legacyNoteHarness();
  context.S.assets = [{ ticker: 'SYN-BASE', value: 100 }];
  context.S.learnMeta = { 'SYN-BASE': { type: 'Ação', sector: 'Base' } };
  context.S.wallets = [{ id: 'wallet-1', assets: [{ ticker: 'SYN-BASE', value: 100 }], aportes: [], learnMeta: {} }];
  context.S.activeWalletId = 'wallet-1';
  context.syncAssetsFromAportes = () => { context.S.assets = [{ ticker: 'SYN-NEW', value: 100 }]; };
  context.learnTickerMeta = ticker => { context.S.learnMeta[ticker] = { type: 'Ação', sector: 'Synthetic' }; };
  const persistence = installSyntheticLocalPersistence(context, { failStorage: true });
  const before = JSON.stringify({ assets: context.S.assets, aportes: context.S.aportes, learnMeta: context.S.learnMeta, wallets: context.S.wallets });
  const note = syntheticLegacyNote(context, { fileName: 'fail-local.xlsx', broker: 'INTER', trades: [{}] });
  const result = applySyntheticLegacyNote(context, note);
  assert.equal(result?.status, 'SAVE_OUTCOME_UNKNOWN');
  assert.equal(JSON.stringify({ assets: context.S.assets, aportes: context.S.aportes, learnMeta: context.S.learnMeta, wallets: context.S.wallets }), before);
  assert.equal(context.S._financialWriteQuarantined, true);
  assert.equal(persistence.getStorageWrites(), 0);
});

test('SAVE-2: later unrelated save cannot persist an import after save false', () => {
  const { context } = legacyNoteHarness();
  context.syncAssetsFromAportes = () => { context.S.assets = [{ ticker: 'SYN-NEW' }]; };
  const persistence = installSyntheticLocalPersistence(context, { failStorage: true });
  const note = syntheticLegacyNote(context, { fileName: 'fail-then-save.xlsx', broker: 'INTER', trades: [{}] });
  assert.equal(applySyntheticLegacyNote(context, note)?.status, 'SAVE_OUTCOME_UNKNOWN');
  persistence.setFailures();
  assert.equal(context.save(), false);
  assert.deepEqual(persistence.getPersisted().aportes, []);
  assert.equal(persistence.getStorageWrites(), 0);
});

test('SAVE-3: after reload, failed note can retry once and a renamed replay is a no-op', () => {
  const { context } = legacyNoteHarness();
  context.syncAssetsFromAportes = () => { context.S.assets = context.S.aportes.map(row => ({ ticker: row.ticker })); };
  const persistence = installSyntheticLocalPersistence(context, { failStorage: true });
  const first = syntheticLegacyNote(context, { fileName: 'retry-original.xlsx', broker: 'INTER DTVM LTDA', trades: [{}] });
  assert.equal(applySyntheticLegacyNote(context, first)?.status, 'SAVE_OUTCOME_UNKNOWN');
  context.S._financialWriteQuarantined = false; // simulated full reload after checking persisted state
  persistence.setFailures();
  const retry = syntheticLegacyNote(context, { fileName: 'retry-renamed.xlsx', broker: 'INTER DTVM LTDA', trades: [{}] });
  assert.equal(applySyntheticLegacyNote(context, retry)?.status, 'APPLIED');
  assert.equal(applySyntheticLegacyNote(context, retry)?.status, 'NO_OP');
  assert.equal(persistence.getPersisted().aportes.length, 1);
  assert.equal(persistence.getStorageWrites(), 1);
});

test('SAVE-4: failed save does not poison live duplicate identity and blocks apply until reload', () => {
  const { context } = legacyNoteHarness();
  context.syncAssetsFromAportes = () => {};
  const persistence = installSyntheticLocalPersistence(context, { failStorage: true });
  const note = syntheticLegacyNote(context, { fileName: 'dedup-failure.xlsx', broker: 'INTER', trades: [{}] });
  assert.equal(applySyntheticLegacyNote(context, note)?.status, 'SAVE_OUTCOME_UNKNOWN');
  assert.equal(context.S.aportes.length, 0);
  assert.equal(applySyntheticLegacyNote(context, note)?.status, 'SESSION_QUARANTINED');
  assert.equal(persistence.getPersisted().aportes.length, 0);
});

test('SAVE-5: UI never reports import success when persistence fails', () => {
  const { context } = legacyNoteHarness();
  context.syncAssetsFromAportes = () => {};
  const persistence = installSyntheticLocalPersistence(context, { failStorage: true });
  const note = syntheticLegacyNote(context, { fileName: 'ui-failure.xlsx', broker: 'INTER', trades: [{}] });
  context.openNotaReview(note, note.fileName);
  context.importNotaReview();
  assert.equal(context.S.noteReview.persistenceStatus, 'QUARANTINED');
  assert.match(context.metrics.alerts.at(-1), /não foi aplicado|recarregue/i);
  assert.equal(context.S.aportes.length, 0);
  assert.equal(persistence.getPersisted().aportes.length, 0);
});

test('THROW-1: synchronous writer save throw restores state and quarantines session', () => {
  const { context } = legacyNoteHarness();
  context.syncAssetsFromAportes = () => { context.S.assets = [{ ticker: 'SYN-NEW' }]; };
  const persistence = installSyntheticLocalPersistence(context);
  const before = JSON.stringify({ assets: context.S.assets, aportes: context.S.aportes, learnMeta: context.S.learnMeta, wallets: context.S.wallets });
  context.save = () => { throw new Error('SYNTHETIC_THROW_AFTER_MUTATION'); };
  const note = syntheticLegacyNote(context, { fileName: 'throw.xlsx', broker: 'INTER', trades: [{}] });
  assert.equal(applySyntheticLegacyNote(context, note)?.status, 'SAVE_OUTCOME_UNKNOWN');
  assert.equal(JSON.stringify({ assets: context.S.assets, aportes: context.S.aportes, learnMeta: context.S.learnMeta, wallets: context.S.wallets }), before);
  assert.equal(context.S._financialWriteQuarantined, true);
  assert.equal(context.S.noteReview, null);
  assert.equal(persistence.getStorageWrites(), 0);
});

test('THROW-3: later unrelated save cannot leak a synchronously failed import', () => {
  const { context } = legacyNoteHarness();
  context.syncAssetsFromAportes = () => {};
  installSyntheticLocalPersistence(context);
  const actualSave = context.save;
  context.save = () => { throw new Error('SYNTHETIC_THROW'); };
  const note = syntheticLegacyNote(context, { fileName: 'throw-later-save.xlsx', broker: 'INTER', trades: [{}] });
  assert.equal(applySyntheticLegacyNote(context, note)?.status, 'SAVE_OUTCOME_UNKNOWN');
  context.save = actualSave;
  assert.equal(context.save(), false);
  assert.equal(context.S.aportes.length, 0);
});

test('BATCH-SAVE-1: failed persistence restores all new records as one batch', () => {
  const { context } = legacyNoteHarness();
  context.syncAssetsFromAportes = () => { context.S.assets = [{ ticker: 'SYN1' }, { ticker: 'SYN2' }]; };
  const persistence = installSyntheticLocalPersistence(context, { failStorage: true });
  const batch = syntheticLegacyNote(context, { fileName: 'batch-failure.xlsx', broker: 'INTER', noteNumber: '910', trades: [{ ticker: 'SYN1' }, { ticker: 'SYN2' }] });
  assert.equal(applySyntheticLegacyNote(context, batch)?.status, 'SAVE_OUTCOME_UNKNOWN');
  assert.equal(context.S.aportes.length, 0);
  assert.deepEqual(context.S.assets, []);
  assert.equal(persistence.getPersisted().aportes.length, 0);
  assert.equal(persistence.getStorageWrites(), 0);
});

test('BATCH-SAVE-3: failed mixed manual-RF and new import restores exact manual authority', () => {
  const { context } = legacyNoteHarness();
  const manual = { ticker: 'SYN-MANUAL-RF', quoteSource: 'manual', current_price: 125, rf_profit_value: 9, rf_profit_source: 'manual' };
  context.S.assets = [manual];
  context.syncAssetsFromAportes = () => { context.S.assets = [manual, { ticker: 'SYN-NEW-RF', quoteSource: 'manual', current_price: 100 }]; };
  const persistence = installSyntheticLocalPersistence(context, { failStorage: true });
  const note = syntheticLegacyNote(context, { fileName: 'mixed-rf.xlsx', broker: 'INTER', trades: [{ ticker: 'SYN-NEW-RF' }] });
  assert.equal(applySyntheticLegacyNote(context, note)?.status, 'SAVE_OUTCOME_UNKNOWN');
  assert.deepEqual(context.S.assets, [manual]);
  assert.equal(context.S.assets[0].current_price, 125);
  assert.equal(context.S.assets[0].rf_profit_value, 9);
  assert.equal(persistence.getPersisted().assets[0].ticker, 'SYN-MANUAL-RF');
});

test('SAVE-THROW-AFTER-STORAGE: save false after local storage write quarantines and restores session', () => {
  const { context } = legacyNoteHarness();
  context.syncAssetsFromAportes = () => { context.S.assets = [{ ticker: 'SYN-NEW' }]; };
  const persistence = installSyntheticLocalPersistence(context, { failQueue: true });
  const note = syntheticLegacyNote(context, { fileName: 'queue-failure.xlsx', broker: 'INTER', trades: [{}] });
  assert.equal(applySyntheticLegacyNote(context, note)?.status, 'SAVE_OUTCOME_UNKNOWN');
  assert.equal(context.S._financialWriteQuarantined, true);
  assert.equal(context.S.aportes.length, 0);
  assert.equal(persistence.getPersisted().aportes.length, 1, 'save() false pode ocorrer depois da gravação local; persistência deve ser tratada como incerta');
  const persistedAfterFailure = JSON.stringify(persistence.getPersisted());
  const writesAfterFailure = persistence.getStorageWrites();
  assert.equal(context.save(), false);
  assert.equal(persistence.getStorageWrites(), writesAfterFailure);
  assert.equal(JSON.stringify(persistence.getPersisted()), persistedAfterFailure);
});

test('SESSION-QUARANTINE: shared edit gate rejects writes after persistence uncertainty', () => {
  const source = snippet('canEditFromThisTab', 'broadcastEditLock');
  const context = {
    S: { _financialWriteQuarantined: true },
    toast() {},
    isEditOwner: () => true,
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  assert.equal(context.canEditFromThisTab('unrelated financial edit'), false);
});

test('BATCH-SAVE-2: failed B3 dividend batch cannot remain silently successful or leak into a later save', () => {
  const successMessages = [];
  const { context } = harness([
    ['importB3ProventosReview', 'b3ProventosReviewSummary'],
  ], {
    S: { b3ProventosReview: { items: [
      { ticker: 'SYN-BASE', paymentDate: '2026-01-02', eventType: 'DIVIDEND', netValue: 10, status: 'Duplicado', destination: 'Proventos', include: true },
      { ticker: 'SYN-NEW', paymentDate: '2026-01-03', eventType: 'DIVIDEND', netValue: 12, status: 'Novo provento', destination: 'Proventos', include: true },
    ] } },
    save: () => false,
    b3ImportCompletedMessage: message => successMessages.push(String(message)),
  });
  const existing = { ticker: 'SYN-BASE', date: '2026-01-02', value: 10, autoKey: 'base' };
  context.S.proventos = [existing];
  context.importB3ProventosReview();
  assert.deepEqual(context.S.proventos, [existing], 'failed new dividend must not remain in live state');
  assert.equal(context.S._financialWriteQuarantined, true);
  assert.equal(context.S.b3ProventosReview?.items?.length, 2, 'review remains available after failure');
  assert.equal(successMessages.length, 0, 'failure must not emit an import-complete message');
});

test('BATCH-SAVE-3: failed RF position batch preserves manual authority and quarantines session', () => {
  const successMessages = [];
  const manual = { ticker: 'SYN-MANUAL', type: 'Renda Fixa', current_price: 125, fixed_current_value: 125, fixed_source: 'manual' };
  const { context } = harness([
    ['importRfPositionReview', 'rfPositionReviewSummary'],
  ], {
    S: { assets: [manual], rfPositionReview: {
      items: [{ ticker: 'SYN-NEW-RF', name: 'Synthetic', qty: 1, appliedValue: 100, marketValue: 101, include: true, status: 'Novo ativo' }],
      events: [],
    } },
    b3ConfirmImport: () => true,
    rfPositionReviewSummary: () => ({}),
    rfDetailedFindExistingAsset: () => ({ idx: -1 }),
    rfDetailedHasManualAuthority: asset => asset?.fixed_source === 'manual',
    importRfPositionRows: items => {
      context.S.assets.push({ ticker: items[0].ticker, type: 'Renda Fixa', current_price: 101 });
      return { created: 1, updated: 0, ignored: 0 };
    },
    save: () => false,
    b3ImportCompletedMessage: message => successMessages.push(String(message)),
  });
  context.importRfPositionReview();
  assert.deepEqual(context.S.assets, [manual], 'the failed imported asset is restored, manual record is unchanged');
  assert.equal(context.S.assets[0].current_price, 125);
  assert.equal(context.S._financialWriteQuarantined, true);
  assert.ok(context.S.rfPositionReview, 'review state remains available after failure');
  assert.equal(successMessages.length, 0, 'failure must not emit an import-complete message');
});

test('BATCH-SAVE-POSITION: failed B3 position persistence restores assets and suppresses success', () => {
  const messages = [];
  const { context } = harness([
    ['applyB3ImportedPositions', 'openBrokerNoteImport'],
  ], {
    S: {
      assets: [{ ticker: 'SYN-BASE', value: 50 }],
      learnMeta: { 'SYN-BASE': { type: 'Ação' } },
      wallets: [{ id: 'synthetic-wallet', assets: [{ ticker: 'SYN-BASE', value: 50 }] }],
      activeWalletId: 'synthetic-wallet',
      b3Review: { items: [] },
    },
    normalizeType: value => value || 'Ação',
    metaTicker: () => ({ type: 'Ação', sector: 'Synthetic' }),
    rfPosNorm: value => String(value || '').toUpperCase(),
    save: () => { context.S.wallets[0].assets = [{ ticker: 'SYN-NEW', value: 20 }]; return false; },
    b3ImportCompletedMessage: message => messages.push(String(message)),
  });
  const baseline = JSON.parse(JSON.stringify({ assets: context.S.assets, learnMeta: context.S.learnMeta, wallets: context.S.wallets }));
  const result = context.applyB3ImportedPositions([
    { ticker: 'SYN-NEW', qty: 2, price: 10, value: 20, currentValue: 20, type: 'Ação' },
  ], '2026-01-01');
  assert.equal(result?.status, 'SAVE_OUTCOME_UNKNOWN');
  assert.deepEqual({ assets: context.S.assets, learnMeta: context.S.learnMeta, wallets: context.S.wallets }, baseline);
  assert.equal(context.S._financialWriteQuarantined, true);
  assert.equal(messages.length, 0);
});

test('BATCH-SAVE-MOVEMENT: failed B3 movement persistence restores aportes and assets', () => {
  const messages = [];
  const { context } = harness([
    ['applyB3MovementImported', 'importB3MovementReview'],
  ], {
    S: { assets: [{ ticker: 'SYN-BASE', value: 50 }], aportes: [], learnMeta: {}, b3MovementReview: { items: [{ ticker: 'SYN-NEW' }] } },
    b3MovementRefreshReviewFlags: row => row,
    b3MovementIsHistoricalImportable: () => true,
    b3MovementHistoricalOperationType: () => 'Compra',
    b3MovementHistoricalSide: () => 'Entrada',
    b3MovementHistoricalAutoKey: () => 'synthetic-movement-key',
    b3MovementDuplicateKind: () => '',
    rfPosNorm: value => String(value || '').toUpperCase(),
    b3MovementDateKey: value => String(value || ''),
    metaTicker: () => ({ type: 'Ação', sector: 'Synthetic' }),
    normalizeType: value => value || 'Ação',
    syncAssetsFromAportes: () => { context.S.assets = [{ ticker: 'SYN-NEW', value: 20 }]; },
    save: () => false,
    b3ImportCompletedMessage: message => messages.push(String(message)),
  });
  const baseline = JSON.parse(JSON.stringify({ assets: context.S.assets, aportes: context.S.aportes, learnMeta: context.S.learnMeta }));
  const result = context.applyB3MovementImported([
    { ticker: 'SYN-NEW', qty: 2, price: 10, value: 20, date: '2026-01-01', type: 'Ação' },
  ], '2026-01-01');
  assert.equal(result?.status, 'SAVE_OUTCOME_UNKNOWN');
  assert.deepEqual({ assets: context.S.assets, aportes: context.S.aportes, learnMeta: context.S.learnMeta }, baseline);
  assert.ok(context.S.b3MovementReview, 'review remains available after failure');
  assert.equal(context.S._financialWriteQuarantined, true);
  assert.equal(messages.length, 0);
});
