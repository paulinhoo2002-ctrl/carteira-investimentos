/**
 * Testes do fluxo "RF em Aportes":
 * Aportes → + Nova movimentação → Renda Fixa → título existente
 * → editor oficial de movimentação dentro do mesmo modal.
 *
 * A implementação canônica já existe no index.html (rfExistingAssetOptionsHtml,
 * openRfMovementFromAportes, integração com quickMovementModal) e reutiliza as
 * funções oficiais openRfMovementEditor, rfMovementEditorHtml e
 * saveRfMovimentacao. Estes testes apenas fixam o contrato do fluxo.
 *
 * Mesmo padrão de harness do rf-movement-flow.test.js: blocos de função são
 * extraídos do index.html e avaliados num contexto mínimo com os helpers de
 * data/moeda reais copiados do index.html.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');
const INDEX_HTML = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');

function extractFunctionBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `${startMarker} precisa existir`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `${endMarker} precisa existir depois de ${startMarker}`);
  return source.slice(start, end);
}

function inputDateValue(v) {
  if (!v) return '';
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) { const d = m[1].padStart(2, '0'), mo = m[2].padStart(2, '0'), y = String(m[3].length < 3 ? 2000 + Number(m[3]) : Number(m[3])); return `${y}-${mo}-${d}`; }
  return '';
}
function parseNum(v) {
  if (v == null) return 0;
  let s = String(v).trim().replace(/R\$|%|\s/g, '');
  if (!s) return 0;
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = parseFloat(s); return isNaN(n) ? 0 : n;
}
function moneyInput(v) { return (Number(v) || 0).toFixed(2).replace('.', ','); }
function brDate(v) {
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y, m, d] = v.split('-'); return `${d}/${m}/${y}`; }
  return v;
}
function rfPosNorm(v) {
  return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}
function cleanAssetCode(txt) {
  let s = String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
  s = s.replace(/\s+/g, ' ');
  if (!s) return '';
  s = s.replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  return s.slice(0, 38);
}

function buildContext(initialState = {}) {
  const counters = { save: 0, render: 0, alert: 0, confirm: 0, toast: [] };
  const elements = {};
  const context = {
    elements,
    S: {
      assets: [],
      rfEvents: [],
      wallets: [],
      activeWalletId: '',
      rfMovementEditor: null,
      rfEventEditor: null,
      quickMovementDraft: null,
      quickMovementOpen: false,
      quickMovementSaving: false,
      quickMovementEditId: null,
      tab: 'aportes',
      aportes: [],
      ...initialState
    },
    window: {},
    FinanceCore: {},
    normalizeType: (value, fallback = 'Ação') => String(value ?? fallback).trim() || 'Ação',
    metaTicker: () => ({ type: 'Ação', sector: '—' }),
    inputDateValue,
    parseNum,
    moneyInput,
    brDate,
    rfPosNorm,
    cleanAssetCode,
    esc: (s) => String(s ?? ''),
    fmt: (v) => `R$${Number(v || 0).toFixed(2).replace('.', ',')}`,
    fmtP: (v) => `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`,
    canEditFromThisTab: () => true,
    rememberScroll: () => {},
    save: () => { counters.save += 1; },
    render: () => { counters.render += 1; },
    toast: (message) => { counters.toast.push(message); },
    alert: () => { counters.alert += 1; },
    confirm: () => { counters.confirm += 1; return true; },
    requestAnimationFrame: (fn) => { fn(); return 1; },
    withScrollPreserved: (fn) => { fn(); },
    document: {
      getElementById: (id) => elements[id] || null
    },
    quickMovementDefaultDraft: (kind = 'compra') => ({
      kind, date: new Date().toISOString().slice(0, 10), ticker: '', assetId: '', assetName: '',
      saleType: 'parcial', saleAvailable: 0, saleAvgPrice: 0, type: 'Ação', sector: '',
      qty: '', price: '', value: '', note: '', eventType: 'Rendimento',
      rfName: '', rfSubtype: 'CDB', rfAppDate: '', rfDue: '', rfRate: '', rfApplied: '',
      rfGross: '', rfLiquid: '', rfIrIof: '', rfUnavailable: '', rfNote: '',
      outroTitle: '', outroCategory: 'Geral', manualType: false, manualSector: false, manualName: false
    }),
    quickMovementKindOptions: () => [],
    quickMovementImpactText: () => '',
    quickMovementSellableAssets: () => [],
    quickMovementSaleOptionsHtml: () => '',
    quickMovementSaleInfoHtml: () => '',
    quickMovementAssetSummaryHtml: () => '',
    quickMovementPreviewHtml: () => ''
  };

  const blocks = [
    ['function closeQuickMovement(){', 'function rfExistingAssetOptionsHtml(){'],
    ['function rfExistingAssetOptionsHtml(){', 'function setQuickMovementField(field, value){'],
    ['function quickMovementModal(){', 'function aporteMovementKind(a){'],
    ['function normalizeQuickMovementKind(value){', 'function quickMovementKindTone(kind){'],
    ['function isRendaFixaAsset(a){', 'function parseNum(v){'],
    ['function rfMovementModeOptionsHtml(selected){', 'function rfEventEditorHtml(asset){']
  ];
  blocks.forEach(([start, end], index) => {
    const block = extractFunctionBlock(INDEX_HTML, start, end);
    vm.runInNewContext(block, context, { filename: `rf-in-aportes-block-${index}.js` });
  });

  return { context, counters, elements };
}

function makeRfAsset(overrides = {}) {
  return {
    id: 'rf-asset-1',
    ticker: 'CDB-FIX-1',
    name: 'CDB Prefixado',
    type: 'Renda Fixa',
    rf_subtype: 'CDB',
    rf_yield_type: 'prefixado',
    rf_contract_rate: '12% a.a.',
    rf_application_date: '2026-01-10',
    rf_applied_value: 1000,
    ...overrides
  };
}
function makeCdiAsset(overrides = {}) {
  return makeRfAsset({ id: 'rf-asset-cdi', ticker: 'CDI-LIQ-1', name: 'LCI CDI', rf_yield_type: 'CDI', ...overrides });
}
function makeAcao() { return { id: 'acao-1', ticker: 'PETR4', name: 'Petrobras PN', type: 'Ação' }; }
function makeFii() { return { id: 'fii-1', ticker: 'MXRF11', name: 'Maxi Renda', type: 'FII' }; }
function makeEtf() { return { id: 'etf-1', ticker: 'BOVA11', name: 'iShares Ibovespa', type: 'ETF' }; }

function selectAsset(context, assetId, mode = 'aporte') {
  context.elements['qm-rf-existing-asset'] = { value: assetId };
  context.elements['qm-rf-existing-mode'] = { value: mode };
}

// 1. opção Renda Fixa disponível
test('Renda Fixa aparece como opção no modal de Aportes', () => {
  const { context } = buildContext();
  context.S.quickMovementDraft = { kind: 'renda-fixa' };
  const html = context.quickMovementModal();
  assert.match(html, /openQuickMovement\('renda-fixa'\)/, 'deve existir aba Renda Fixa');
  assert.match(html, /Renda Fixa<\/button>/, 'aba deve ter rótulo Renda Fixa');
  assert.match(html, /Movimentar título existente/, 'bloco de movimentação de título existente deve renderizar');
});

// 2. lista apenas RF existentes
test('lista de títulos contém somente ativos de renda fixa', () => {
  const { context } = buildContext({
    assets: [makeRfAsset(), makeCdiAsset(), makeAcao(), makeFii(), makeEtf()]
  });
  const html = context.rfExistingAssetOptionsHtml();
  assert.match(html, /CDB-FIX-1/, 'RF prefixado deve aparecer');
  assert.match(html, /CDI-LIQ-1/, 'RF indexado deve aparecer');
  assert.doesNotMatch(html, /PETR4/);
  assert.doesNotMatch(html, /MXRF11/);
  assert.doesNotMatch(html, /BOVA11/);
});

// 3/4/5. ação, FII e ETF não aparecem como RF
test('ação não aparece na lista de renda fixa', () => {
  const { context } = buildContext({ assets: [makeRfAsset(), makeAcao()] });
  const html = context.rfExistingAssetOptionsHtml();
  assert.match(html, /CDB-FIX-1/);
  assert.doesNotMatch(html, /PETR4/);
});

test('FII não aparece na lista de renda fixa', () => {
  const { context } = buildContext({ assets: [makeRfAsset(), makeFii()] });
  const html = context.rfExistingAssetOptionsHtml();
  assert.doesNotMatch(html, /MXRF11/);
});

test('ETF não aparece na lista de renda fixa', () => {
  const { context } = buildContext({ assets: [makeRfAsset(), makeEtf()] });
  const html = context.rfExistingAssetOptionsHtml();
  assert.doesNotMatch(html, /BOVA11/);
});

// 6. título sem saldo válido tratado corretamente
test('título sem saldo válido aparece com saldo zero e resgates são rejeitados', () => {
  const asset = makeRfAsset({ rf_applied_value: undefined, fixed_initial_value: undefined, qty: undefined, avg_price: undefined });
  const { context } = buildContext({ assets: [asset] });
  assert.equal(context.rfPrincipalBalance(asset).value, 0);
  assert.equal(context.rfPrincipalBalance(asset).hasExplicitApplied, false);
  const html = context.rfExistingAssetOptionsHtml();
  assert.match(html, /CDB-FIX-1/);
  assert.match(html, /Saldo R\$0,00/);
  const parcial = context.rfMovementValidation(asset, { date: '2026-05-01', mode: 'resgate_parcial', principalDelta: '100,00' });
  assert.equal(parcial.ok, false);
  assert.match(parcial.error, /insuficiente/i);
  const total = context.rfMovementValidation(asset, { date: '2026-05-01', mode: 'resgate_total', principalDelta: '0,00' });
  assert.equal(total.ok, false);
});

// 7. seleção do título
test('selecionar título abre o editor oficial com o ativo certo', () => {
  const { context } = buildContext({ assets: [makeRfAsset()] });
  selectAsset(context, 'rf-asset-1', 'aporte');
  context.openRfMovementFromAportes();
  assert.ok(context.S.rfMovementEditor, 'editor deve abrir');
  assert.equal(context.S.rfMovementEditor.assetId, 'rf-asset-1');
});

// 8. modo aporte
test('modo aporte abre editor com mode=aporte', () => {
  const { context } = buildContext({ assets: [makeRfAsset()] });
  selectAsset(context, 'rf-asset-1', 'aporte');
  context.openRfMovementFromAportes();
  assert.equal(context.S.rfMovementEditor.draft.mode, 'aporte');
});

// 9. resgate parcial
test('modo resgate parcial abre editor com mode=resgate_parcial', () => {
  const { context } = buildContext({ assets: [makeRfAsset()] });
  selectAsset(context, 'rf-asset-1', 'resgate_parcial');
  context.openRfMovementFromAportes();
  assert.equal(context.S.rfMovementEditor.draft.mode, 'resgate_parcial');
});

// 10. resgate total
test('modo resgate total abre editor com mode=resgate_total e principal preenchido', () => {
  const { context } = buildContext({ assets: [makeRfAsset()] });
  selectAsset(context, 'rf-asset-1', 'resgate_total');
  context.openRfMovementFromAportes();
  assert.equal(context.S.rfMovementEditor.draft.mode, 'resgate_total');
  assert.equal(context.S.rfMovementEditor.draft.principalDelta, '1000,00');
});

// 11. saldo atual visível
test('editor mostra saldo atual do título', () => {
  const asset = makeRfAsset();
  const { context } = buildContext({ assets: [asset] });
  context.S.rfMovementEditor = { assetId: 'rf-asset-1', draft: context.rfMovementDraftForAsset(asset, 'aporte') };
  const html = context.rfMovementEditorHtml(asset);
  assert.match(html, /Saldo atual: <strong>R\$1000,00<\/strong>/);
  assert.match(html, /Saldo após:/);
});

// 12. parcial acima do saldo bloqueado
test('resgate parcial acima do saldo é bloqueado sem mutar estado', () => {
  const asset = makeRfAsset();
  const { context, counters } = buildContext({ assets: [asset] });
  const validation = context.rfMovementValidation(asset, { date: '2026-06-01', mode: 'resgate_parcial', principalDelta: '1200,00' });
  assert.equal(validation.ok, false);
  assert.match(validation.error, /insuficiente/i);
  context.S.rfMovementEditor = { assetId: 'rf-asset-1', draft: { mode: 'resgate_parcial', date: '2026-06-01', principalDelta: '1200,00', grossValue: '', netValue: '', ir: '0,00', iof: '0,00', source: 'Manual', note: '' } };
  context.saveRfMovimentacao();
  assert.equal(counters.alert, 1, 'deve alertar sobre saldo insuficiente');
  assert.equal(counters.save, 0, 'nada pode ser persistido');
  assert.equal(context.S.assets[0].rf_applied_value, 1000);
  assert.equal(context.S.rfEvents.length, 0);
});

// 13. saldo após parcial
test('resgate parcial atualiza saldo e o editor mostra saldo após', () => {
  const asset = makeRfAsset();
  const { context } = buildContext({ assets: [asset] });
  context.S.rfMovementEditor = { assetId: 'rf-asset-1', draft: context.rfMovementDraftForAsset(asset, 'resgate_parcial') };
  context.S.rfMovementEditor.draft.principalDelta = '300,00';
  const html = context.rfMovementEditorHtml(asset);
  assert.match(html, /Saldo após: <strong>R\$700,00<\/strong>/);
  context.saveRfMovimentacao();
  assert.equal(context.S.assets[0].rf_applied_value, 700);
});

// 14. saldo após total = 0
test('resgate total zera o saldo e o editor mostra saldo após zero', () => {
  const asset = makeRfAsset();
  const { context, counters } = buildContext({ assets: [asset] });
  context.S.rfMovementEditor = { assetId: 'rf-asset-1', draft: context.rfMovementDraftForAsset(asset, 'resgate_total') };
  const html = context.rfMovementEditorHtml(asset);
  assert.match(html, /Saldo após: <strong>R\$0,00<\/strong>/);
  context.saveRfMovimentacao();
  assert.equal(counters.confirm, 1);
  assert.equal(context.S.assets[0].rf_applied_value, 0);
});

// 15. saveRfMovimentacao reutilizado
test('fluxo completo usa saveRfMovimentacao oficial sem botão concorrente', () => {
  const { context } = buildContext({ assets: [makeCdiAsset()] });
  context.S.quickMovementDraft = { kind: 'renda-fixa' };
  selectAsset(context, 'rf-asset-cdi', 'aporte');
  context.openRfMovementFromAportes();
  context.S.rfMovementEditor.draft.principalDelta = '500,00';
  const modalHtml = context.quickMovementModal();
  assert.match(modalHtml, /data-rf-movement-editor="1"/, 'editor oficial renderiza dentro do modal');
  assert.match(modalHtml, /onclick="saveRfMovimentacao\(\)"/, 'salvar do editor chama saveRfMovimentacao');
  assert.doesNotMatch(modalHtml, /onclick="saveQuickMovement\(\)"/, 'footer não deve ter Salvar do quick movement');
  assert.match(modalHtml, />Fechar</, 'footer do editor ativo deve ser apenas Fechar');
  context.saveRfMovimentacao();
  assert.equal(context.S.rfEvents[0].type, 'aporte');
  assert.equal(context.S.assets[0].rf_applied_value, 1500);
});

// 16. S.rfEvents recebe apenas 1 evento
test('uma movimentação gera exatamente um evento', () => {
  const { context } = buildContext({ assets: [makeCdiAsset()] });
  context.S.rfMovementEditor = { assetId: 'rf-asset-cdi', draft: { mode: 'aporte', date: '2026-05-01', principalDelta: '500,00', grossValue: '', netValue: '', ir: '0,00', iof: '0,00', source: 'Manual', note: '' } };
  context.saveRfMovimentacao();
  assert.equal(context.S.rfEvents.length, 1);
});

// 17. S.aportes permanece intacto
test('movimentação RF não altera S.aportes', () => {
  const aportes = [{ id: 'ap1', ticker: 'PETR4', qty: 10 }];
  const { context } = buildContext({ assets: [makeCdiAsset()], aportes });
  context.S.rfMovementEditor = { assetId: 'rf-asset-cdi', draft: { mode: 'aporte', date: '2026-05-01', principalDelta: '500,00', grossValue: '', netValue: '', ir: '0,00', iof: '0,00', source: 'Manual', note: '' } };
  const before = JSON.stringify(context.S.aportes);
  context.saveRfMovimentacao();
  assert.equal(JSON.stringify(context.S.aportes), before, 'S.aportes não pode mudar após salvar');
});

// 18. fechar mantém S.tab = 'aportes'
test('fechar o modal mantém o usuário em Aportes', () => {
  const { context } = buildContext();
  context.S.tab = 'aportes';
  context.S.quickMovementOpen = true;
  context.S.rfMovementEditor = { assetId: 'rf-asset-1', draft: {} };
  context.closeQuickMovement();
  assert.equal(context.S.tab, 'aportes');
  assert.equal(context.S.quickMovementOpen, false);
});

// 19. salvar mantém S.tab = 'aportes'
test('salvar movimentação mantém o usuário em Aportes', () => {
  const { context } = buildContext({ assets: [makeCdiAsset()] });
  context.S.tab = 'aportes';
  context.S.rfMovementEditor = { assetId: 'rf-asset-cdi', draft: { mode: 'aporte', date: '2026-05-01', principalDelta: '500,00', grossValue: '', netValue: '', ir: '0,00', iof: '0,00', source: 'Manual', note: '' } };
  context.saveRfMovimentacao();
  assert.equal(context.S.tab, 'aportes');
  assert.equal(context.S.rfEvents.length, 1);
});

// 20. closeQuickMovement limpa S.rfMovementEditor
test('closeQuickMovement limpa S.rfMovementEditor', () => {
  const { context } = buildContext();
  context.S.rfMovementEditor = { assetId: 'rf-asset-1', draft: { mode: 'aporte' } };
  context.closeQuickMovement();
  assert.equal(context.S.rfMovementEditor, null);
});

// 21. cadastro de novo RF continua disponível
test('cadastro de novo título RF continua disponível junto do bloco existente', () => {
  const { context } = buildContext({ assets: [makeRfAsset()] });
  context.S.quickMovementDraft = { kind: 'renda-fixa' };
  const html = context.quickMovementModal();
  assert.match(html, /id="qm-rf-existing-asset"/, 'bloco de título existente presente');
  assert.match(html, /id="qm-rf-name"/, 'cadastro novo RF presente');
  assert.match(html, /id="qm-rf-applied"/, 'campo de valor aplicado do cadastro presente');
  assert.match(html, /onclick="saveQuickMovement\(\)"/, 'Salvar renda fixa do cadastro continua');
  assert.doesNotMatch(html, /onclick="saveRfMovimentacao\(\)"/, 'sem editor, não há botão de movimentação');
});

// Extras: comportamentos de borda do fluxo Aportes
test('sem títulos RF, abrir movimentação avisa e não abre editor', () => {
  const { context, counters } = buildContext({ assets: [makeAcao()] });
  context.elements['qm-rf-existing-asset'] = { value: '' };
  context.elements['qm-rf-existing-mode'] = { value: 'aporte' };
  context.openRfMovementFromAportes();
  assert.equal(context.S.rfMovementEditor, null);
  assert.ok(counters.toast.some((m) => /Cadastre um título de renda fixa/.test(m)));
});

test('opções de movimentação expõem aporte, resgate parcial e resgate total', () => {
  const { context } = buildContext();
  const html = context.rfMovementModeOptionsHtml('aporte');
  assert.match(html, /Novo aporte/);
  assert.match(html, /Resgate parcial/);
  assert.match(html, /Resgate total/);
});
