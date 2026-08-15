const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFunctionSource(name, nextMarker) {
  const start = indexHtml.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Função não encontrada: ${name}`);
  const end = indexHtml.indexOf(nextMarker, start);
  assert.notEqual(end, -1, `Marcador final não encontrado para: ${name}`);
  return indexHtml.slice(start, end);
}

function makeDraft(overrides = {}) {
  return {
    kind: 'compra',
    date: '2026-08-05',
    ticker: '',
    assetId: '',
    assetName: '',
    saleType: 'parcial',
    saleAvailable: 0,
    saleAvgPrice: 0,
    type: 'Ação',
    sector: '',
    qty: '',
    price: '',
    value: '',
    note: '',
    eventType: 'Rendimento',
    rfName: '',
    rfSubtype: 'CDB',
    rfAppDate: '',
    rfDue: '',
    rfRate: '',
    rfApplied: '',
    rfGross: '',
    rfLiquid: '',
    rfIrIof: '',
    rfUnavailable: '',
    rfNote: '',
    outroTitle: '',
    outroCategory: 'Geral',
    ...overrides,
  };
}

function makeBaseS(overrides = {}) {
  return {
    assets: [],
    aportes: [],
    proventos: [],
    rfEvents: [],
    showA: false,
    showP: false,
    showD: false,
    editId: null,
    editPId: null,
    quickMovementOpen: false,
    quickMovementDraft: null,
    quickMovementEditId: null,
    quickMovementSaving: false,
    quickMovementError: null,
    quickMovementErrorField: '',
    quickMovementRfTab: 'aplicar',
    rfMovementEditor: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Builder: erro -> campo
// ---------------------------------------------------------------------------

const helperCode = [
  extractFunctionSource('normalizeQuickMovementKind', 'function quickMovementKindLabel'),
  extractFunctionSource('parseNum', 'function moneyInput'),
  extractFunctionSource('inputDateValue', 'function brDate'),
  extractFunctionSource('brDate', 'function parseAnyDate'),
  extractFunctionSource('cleanAssetCode', 'function normalizeMetadataTicker'),
].join('\n');

function buildBuilderContext({ draft, elementValues = {}, contract = null, saleAsset = null, resolve = null } = {}) {
  const context = {
    console,
    S: makeBaseS({ quickMovementDraft: draft || makeDraft() }),
    document: {
      getElementById(id) {
        return elementValues[id] !== undefined ? { value: elementValues[id] } : null;
      },
    },
    normalizeMetadataTicker: (t) => String(t || '').trim().toUpperCase(),
    normalizeType: (v, fallback = 'Ação') => String(v || '').trim() || fallback,
    resolveAssetMetadata: resolve || ((ticker) => ({ ticker: String(ticker || '').toUpperCase(), type: 'Ação', sector: 'Petróleo', name: '', source: 'stub' })),
    quickMovementContract: () => contract,
    quickMovementSaleAssetById: (id) => (saleAsset ? { ...saleAsset, assetId: id } : null),
  };
  vm.runInNewContext(`${helperCode}\n${extractFunctionSource('quickMovementBuildAporteFromFields', 'function saveQuickMovement')}\nthis.build = quickMovementBuildAporteFromFields;`, context);
  return context;
}

test('compra sem ticker retorna erro mapeado para qm-ti', () => {
  const context = buildBuilderContext({ elementValues: { 'qm-dt': '2026-08-05', 'qm-ti': '', 'qm-qty': '10', 'qm-price': '34,25' } });
  const built = context.build('compra');
  assert.equal(built.error, 'Preencha o ticker do ativo.');
  assert.equal(built.field, 'qm-ti');
  assert.equal(built.reg, undefined);
});

test('compra com quantidade inválida retorna erro mapeado para qm-qty', () => {
  const context = buildBuilderContext({ elementValues: { 'qm-dt': '2026-08-05', 'qm-ti': 'BBAS3', 'qm-qty': '0', 'qm-price': '34,25' } });
  const built = context.build('compra');
  assert.equal(built.error, 'Preencha uma quantidade válida maior que zero.');
  assert.equal(built.field, 'qm-qty');
});

test('compra com preço inválido retorna erro mapeado para qm-price', () => {
  const context = buildBuilderContext({ elementValues: { 'qm-dt': '2026-08-05', 'qm-ti': 'BBAS3', 'qm-qty': '10', 'qm-price': '' } });
  const built = context.build('compra');
  assert.equal(built.error, 'Preencha um preço unitário válido maior que zero.');
  assert.equal(built.field, 'qm-price');
});

test('compra válida monta o registro sem erro e mantém o contrato', () => {
  const context = buildBuilderContext({ elementValues: { 'qm-dt': '2026-08-05', 'qm-ti': 'BBAS3', 'qm-qty': '10', 'qm-price': '34,25' } });
  const built = context.build('compra');
  assert.equal(built.error, undefined);
  assert.equal(built.kind, 'compra');
  assert.equal(built.reg.operation, 'compra');
  assert.equal(built.reg.movementKind, 'compra');
  assert.equal(built.reg.ticker, 'BBAS3');
  assert.equal(built.reg.qty, 10);
  assert.equal(built.reg.price, 34.25);
});

test('provento sem ticker retorna erro mapeado para qm-ti', () => {
  const context = buildBuilderContext({ elementValues: { 'qm-ti': '', 'qm-value': '35,80', 'qm-event': 'Rendimento' } });
  const built = context.build('provento');
  assert.equal(built.error, 'Preencha o ticker do provento.');
  assert.equal(built.field, 'qm-ti');
});

test('provento com valor inválido retorna erro mapeado para qm-value', () => {
  const context = buildBuilderContext({ elementValues: { 'qm-ti': 'MXRF11', 'qm-value': '0', 'qm-event': 'Rendimento' } });
  const built = context.build('provento');
  assert.equal(built.error, 'Preencha um valor recebido maior que zero.');
  assert.equal(built.field, 'qm-value');
});

test('renda fixa sem nome retorna erro mapeado para qm-rf-name', () => {
  const context = buildBuilderContext({ elementValues: { 'qm-rf-name': '', 'qm-rf-subtype': 'CDB', 'qm-rf-app-date': '2026-08-05' } });
  const built = context.build('renda-fixa');
  assert.equal(built.error, 'Preencha o nome do ativo de renda fixa.');
  assert.equal(built.field, 'qm-rf-name');
});

test('renda fixa sem data de aplicação mantém o mapeamento para qm-rf-app-date', () => {
  const buildSource = extractFunctionSource('quickMovementBuildAporteFromFields', 'function saveQuickMovement');
  assert.match(buildSource, /field:'qm-rf-app-date'/);
});

test('renda fixa sem valores retorna erro mapeado para qm-rf-applied', () => {
  const context = buildBuilderContext({ elementValues: { 'qm-rf-name': 'CDB Banco X 2028', 'qm-rf-subtype': 'CDB', 'qm-rf-app-date': '2026-08-05' } });
  const built = context.build('renda-fixa');
  assert.equal(built.error, 'Preencha ao menos um valor: aplicado, bruto ou líquido.');
  assert.equal(built.field, 'qm-rf-applied');
});

test('outro sem título retorna erro mapeado para qm-outro-title', () => {
  const context = buildBuilderContext({ elementValues: { 'qm-outro-title': '', 'qm-outro-value': '150,00' } });
  const built = context.build('outro');
  assert.equal(built.error, 'Preencha o título do registro.');
  assert.equal(built.field, 'qm-outro-title');
});

test('outro com valor inválido retorna erro mapeado para qm-outro-value', () => {
  const context = buildBuilderContext({ elementValues: { 'qm-outro-title': 'Ajuste interno', 'qm-outro-value': '0' } });
  const built = context.build('outro');
  assert.equal(built.error, 'Preencha um valor maior que zero.');
  assert.equal(built.field, 'qm-outro-value');
});

test('venda sem ativo retorna erro mapeado para qm-sale-asset e mantém a mensagem', () => {
  const context = buildBuilderContext({ draft: makeDraft({ kind: 'venda' }), contract: { buildVariableIncomeSalePreview: () => ({ ok: true }) } });
  const built = context.build('venda');
  assert.equal(built.error, 'Selecione um ativo para vender.');
  assert.equal(built.field, 'qm-sale-asset');
});

test('venda com preview inválido (quantidade acima da posição) mapeia para qm-qty', () => {
  const context = buildBuilderContext({
    draft: makeDraft({ kind: 'venda', assetId: 'stk-petr4', saleType: 'parcial', qty: '999', price: '34,25' }),
    saleAsset: { assetId: 'stk-petr4', ticker: 'PETR4', type: 'Ação', sector: 'Petróleo' },
    contract: { buildVariableIncomeSalePreview: () => ({ ok: false, error: 'Quantidade acima da posição disponível.', code: 'INSUFFICIENT_QUANTITY' }) },
  });
  const built = context.build('venda');
  assert.match(built.error, /acima da posição/);
  assert.equal(built.field, 'qm-qty');
});

// ---------------------------------------------------------------------------
// saveQuickMovement: inline error, foco e reabertura do modal
// ---------------------------------------------------------------------------

const SAVE_SOURCE = extractFunctionSource('saveQuickMovement', 'function isRendaFixaAsset');

function saveContext({ draft = makeDraft(), builder = null, save = () => {}, open = false } = {}) {
  const focuses = [];
  const renders = [];
  const toasts = [];
  const context = {
    console,
    S: makeBaseS({ quickMovementDraft: draft, quickMovementOpen: open }),
    canEditFromThisTab: () => true,
    render: () => { renders.push(1); },
    toast: (m) => { toasts.push(m); },
    save,
    learnTickerMeta: () => {},
    syncAssetsFromAportes: () => {},
    fetchQuotes: () => {},
    scheduleAutoProventosGratis: () => {},
    markProventosDirty: () => {},
    quickMovementBuildAporteFromFields: builder || (() => ({ reg: { id: 'r1', ticker: 'PETR4', operation: 'compra', movementKind: 'compra', type: 'Ação', sector: 'Petróleo' } })),
    document: {
      getElementById: (id) => ({ value: '', focus: () => focuses.push(id) }),
    },
    setTimeout: (fn) => { fn(); },
  };
  vm.runInNewContext(`${helperCode}\n${SAVE_SOURCE}\nthis.saveM = saveQuickMovement;`, context);
  return { context, focuses, renders, toasts };
}

test('saveQuickMovement sem alert() e com erro inline no fluxo rápido', () => {
  assert.ok(!SAVE_SOURCE.includes('alert('), 'saveQuickMovement não pode mais usar alert()');
});

test('saveQuickMovement com erro de build mantém modal aberto, seta erro e foca o campo', () => {
  const { context, focuses, renders } = saveContext({
    open: true,
    builder: () => ({ error: 'Preencha uma quantidade válida maior que zero.', field: 'qm-qty' }),
  });
  context.saveM();
  assert.equal(context.S.quickMovementError, 'Preencha uma quantidade válida maior que zero.');
  assert.equal(context.S.quickMovementErrorField, 'qm-qty');
  assert.equal(context.S.quickMovementOpen, true, 'modal deve permanecer aberto em erro de validação');
  assert.deepEqual(focuses, ['qm-qty'], 'foco deve ir para o primeiro campo inválido');
  assert.ok(renders.length >= 1, 'render deve ser chamado para exibir o erro');
  assert.equal(context.S.quickMovementSaving, false);
});

test('saveQuickMovement com erro sem campo seta banner genérico sem foco', () => {
  const { context, focuses } = saveContext({
    open: true,
    builder: () => ({ error: 'Preview de venda indisponível.' }),
  });
  context.saveM();
  assert.equal(context.S.quickMovementError, 'Preview de venda indisponível.');
  assert.equal(context.S.quickMovementErrorField, '');
  assert.deepEqual(focuses, []);
});

test('saveQuickMovement com sucesso limpa erro, fecha modal e persiste', () => {
  const { context } = saveContext({ open: true, draft: makeDraft({ kind: 'compra' }) });
  context.S.quickMovementError = 'erro antigo';
  context.S.quickMovementErrorField = 'qm-ti';
  context.saveM();
  assert.equal(context.S.aportes.length, 1);
  assert.equal(context.S.quickMovementDraft, null);
  assert.equal(context.S.quickMovementOpen, false);
  assert.equal(context.S.quickMovementError, null);
  assert.equal(context.S.quickMovementErrorField, '');
});

test('saveQuickMovement reabre o modal com erro quando a persistência falha', () => {
  const { context } = saveContext({
    open: true,
    draft: makeDraft({ kind: 'outro' }),
    save: () => { throw new Error('falha ao persistir'); },
  });
  context.saveM();
  assert.equal(context.S.quickMovementOpen, true, 'modal deve ser reaberto em falha de persistência');
  assert.equal(context.S.quickMovementError, 'Erro ao salvar a movimentação.');
  assert.ok(context.S.quickMovementDraft, 'draft deve ser restaurado para permitir correção');
  assert.equal(context.S.quickMovementSaving, false);
});

// ---------------------------------------------------------------------------
// Modal: banner acessível + aria-invalid/aria-describedby
// ---------------------------------------------------------------------------

const MODAL_SOURCE = extractFunctionSource('quickMovementModal', 'function aporteMovementKind');

function modalContext({ error = null, field = '', kind = 'compra' } = {}) {
  const context = {
    console,
    S: makeBaseS({
      quickMovementDraft: makeDraft({ kind }),
      quickMovementError: error,
      quickMovementErrorField: field,
    }),
    normalizeQuickMovementKind: (v) => String(v || 'compra').trim().toLowerCase(),
    normalizeType: (v, fallback = 'Ação') => String(v || '').trim() || fallback,
    esc: (s) => String(s ?? ''),
    quickMovementDefaultDraft: () => makeDraft({ kind }),
    quickMovementKindOptions: () => ['Ação', 'FII', 'ETF'],
    quickMovementKindIcon: (k) => `[${k}]`,
    quickMovementKindLabel: (k) => String(k || 'compra'),
    quickMovementImpactText: () => 'Impacto do lançamento.',
    quickMovementSellableAssets: () => [],
    quickMovementSaleOptionsHtml: () => '',
    quickMovementSaleInfoHtml: () => '',
    quickMovementAssetSummaryHtml: () => '',
    quickMovementPreviewHtml: () => '<div>preview</div>',
    rfExistingAssetOptionsHtml: () => '<option>Nenhum título</option>',
    rfQuickSelectedAsset: () => null,
    rfQuickSummaryHtml: () => '<div>resumo</div>',
    getRfAssetByEventId: () => null,
  };
  vm.runInNewContext(`${MODAL_SOURCE}\nthis.modal = quickMovementModal;`, context);
  return context;
}

test('modal exibe banner de erro acessível quando há erro', () => {
  const context = modalContext({ error: 'Preencha o ticker do ativo.', field: 'qm-ti' });
  const html = context.modal();
  assert.match(html, /id="qm-error-banner"/);
  assert.match(html, /role="alert"/);
  assert.match(html, /aria-live="assertive"/);
  assert.match(html, /data-qm-error="1"/);
  assert.match(html, /Preencha o ticker do ativo\./);
});

test('modal aplica aria-invalid e aria-describedby no campo mapeado', () => {
  const context = modalContext({ error: 'Preencha uma quantidade válida maior que zero.', field: 'qm-qty' });
  const html = context.modal();
  const qtyInput = html.match(/<input id="qm-qty"[^>]*>/);
  assert.ok(qtyInput, 'input qm-qty deve existir');
  assert.match(qtyInput[0], /aria-invalid="true"/);
  assert.match(qtyInput[0], /aria-describedby="qm-error-banner"/);
});

test('modal sem erro não renderiza banner nem aria-invalid', () => {
  const context = modalContext();
  const html = context.modal();
  assert.ok(!html.includes('data-qm-error'), 'sem erro não deve haver banner');
  assert.ok(!html.includes('aria-invalid="true"'), 'sem erro não deve marcar campo inválido');
});

test('modal mapeia erro de venda para o seletor de ativo', () => {
  const context = modalContext({ error: 'Selecione um ativo para vender.', field: 'qm-sale-asset', kind: 'venda' });
  const html = context.modal();
  const saleSelect = html.match(/<select id="qm-sale-asset"[^>]*>/);
  assert.ok(saleSelect, 'select qm-sale-asset deve existir');
  assert.match(saleSelect[0], /aria-invalid="true"/);
  assert.match(saleSelect[0], /aria-describedby="qm-error-banner"/);
});

// ---------------------------------------------------------------------------
// Limpeza do erro ao corrigir
// ---------------------------------------------------------------------------

const FIELD_SOURCE = [
  extractFunctionSource('setQuickMovementField', 'function quickMovementModal'),
  extractFunctionSource('normalizeQuickMovementKind', 'function quickMovementKindLabel'),
].join('\n');

function fieldContext({ error = null, field = '', kind = 'compra' } = {}) {
  const context = {
    console,
    S: makeBaseS({ quickMovementDraft: makeDraft({ kind }), quickMovementError: error, quickMovementErrorField: field }),
    normalizeMetadataTicker: (t) => String(t || '').trim().toUpperCase(),
    findQuickMovementAssetByTicker: () => null,
    normalizeType: (v, fallback = 'Ação') => String(v || '').trim() || fallback,
    refreshQuickMovementPreview: () => {},
  };
  vm.runInNewContext(`${FIELD_SOURCE}\nthis.set = setQuickMovementField;`, context);
  return context;
}

test('corrigir o campo do erro limpa a mensagem', () => {
  const context = fieldContext({ error: 'Preencha uma quantidade válida maior que zero.', field: 'qm-qty' });
  context.set('qty', '10');
  assert.equal(context.S.quickMovementError, null);
  assert.equal(context.S.quickMovementErrorField, '');
});

test('editar outro campo mantém o erro até o campo certo ser corrigido', () => {
  const context = fieldContext({ error: 'Preencha o ticker do ativo.', field: 'qm-ti' });
  context.set('sector', 'Bancos');
  assert.equal(context.S.quickMovementError, 'Preencha o ticker do ativo.');
  assert.equal(context.S.quickMovementErrorField, 'qm-ti');
  context.set('ticker', 'BBAS3');
  assert.equal(context.S.quickMovementError, null);
});

test('corrigir o valor de outro (kind outro) limpa o erro de qm-outro-value', () => {
  const context = fieldContext({ error: 'Preencha um valor maior que zero.', field: 'qm-outro-value', kind: 'outro' });
  context.set('value', '150');
  assert.equal(context.S.quickMovementError, null);
  assert.equal(context.S.quickMovementErrorField, '');
});

// ---------------------------------------------------------------------------
// Reset de erro ao abrir/fechar
// ---------------------------------------------------------------------------

const OPEN_SOURCE = [
  extractFunctionSource('openQuickMovement', 'function closeQuickMovement'),
  extractFunctionSource('closeQuickMovement', 'function rfExistingAssetOptionsHtml'),
  extractFunctionSource('normalizeQuickMovementKind', 'function quickMovementKindLabel'),
].join('\n');

function openCloseContext({ error = 'erro pendente', field = 'qm-ti' } = {}) {
  const context = {
    console,
    S: makeBaseS({
      quickMovementDraft: makeDraft(),
      quickMovementError: error,
      quickMovementErrorField: field,
    }),
    quickMovementDefaultDraft: () => makeDraft(),
    normalizeQuickMovementKind: (v) => String(v || 'compra').trim().toLowerCase(),
    findQuickMovementAssetByTicker: () => null,
    normalizeType: (v, fallback = 'Ação') => String(v || '').trim() || fallback,
    render: () => {},
    withScrollPreserved: (fn) => { fn(); },
  };
  vm.runInNewContext(`${OPEN_SOURCE}\nthis.open = openQuickMovement; this.close = closeQuickMovement;`, context);
  return context;
}

test('abrir nova movimentação limpa o erro pendente', () => {
  const context = openCloseContext();
  context.open('compra');
  assert.equal(context.S.quickMovementError, null);
  assert.equal(context.S.quickMovementErrorField, '');
});

test('fechar o modal limpa o erro pendente', () => {
  const context = openCloseContext();
  context.close();
  assert.equal(context.S.quickMovementError, null);
  assert.equal(context.S.quickMovementErrorField, '');
  assert.equal(context.S.quickMovementOpen, false);
});

// ---------------------------------------------------------------------------
// CSS do banner
// ---------------------------------------------------------------------------

test('CSS do banner de erro e do campo inválido estão presentes', () => {
  assert.match(indexHtml, /\.quick-movement-error\{[^}]+\}/);
  assert.match(indexHtml, /\.quick-movement-modal \.fg input\[aria-invalid="true"\],\.quick-movement-modal \.fg select\[aria-invalid="true"\]\{border-color:var\(--danger\)\}/);
});