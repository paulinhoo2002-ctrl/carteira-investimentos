const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const contract = require('../portfolio-movement-contract.js');

function extractFunctionSource(name, nextMarker) {
  const start = indexHtml.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Função não encontrada: ${name}`);
  const end = indexHtml.indexOf(nextMarker, start);
  assert.notEqual(end, -1, `Marcador final não encontrado para: ${name}`);
  return indexHtml.slice(start, end).replace(/\r\n/g, '\n');
}

const ASSETS = [
  { id: 'stk-petr4', ticker: 'PETR4', name: 'Petrobras PN', product: 'PETR4 Petrobras PN', title: 'Petrobras PN', type: 'Ação', sector: 'Petróleo', qty: 120, avg_price: 28.1, current_price: 34.25 },
  { id: 'fii-mxrf11', ticker: 'MXRF11', name: 'Maxi Renda', product: 'MXRF11 Maxi Renda', title: 'Maxi Renda', type: 'FII', sector: 'Papel', qty: 500, avg_price: 9.65, current_price: 10.12 },
  { id: 'etf-bova11', ticker: 'BOVA11', name: 'iShares Ibovespa', product: 'BOVA11 iShares Ibovespa', title: 'iShares Ibovespa', type: 'ETF', sector: 'ETF', qty: 25, avg_price: 121, current_price: 129.3 },
  { id: 'rf-movi18', ticker: 'MOVI18', name: 'CDB MOVI18', product: 'CDB MOVI18', title: 'CDB MOVI18', type: 'Renda Fixa', sector: 'Renda Fixa', qty: 1, avg_price: 5000, current_price: 5748.41 },
  { id: 'stk-zero3', ticker: 'ZERO3', name: 'Sem saldo', product: 'ZERO3', title: 'Sem saldo', type: 'Ação', sector: 'Geral', qty: 0, avg_price: 0, current_price: 0 },
  { ticker: 'SEMID3', name: 'Sem id', product: 'SEMID3', title: 'Sem id', type: 'Ação', sector: 'Geral', qty: 10, avg_price: 1, current_price: 1 },
];

const HELPERS = {
  esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  fmtN(v) {
    return Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  },
  fmtRaw(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  },
  parseNum(v) {
    if (v == null) return 0;
    let s = String(v).trim().replace(/R\$|%|\s/g, '');
    if (!s) return 0;
    if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.includes(',')) s = s.replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  },
  brDate(v) {
    if (!v) return new Date().toLocaleDateString('pt-BR');
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [y, m, d] = v.split('-');
      return `${d}/${m}/${y}`;
    }
    return v;
  },
  cleanAssetCode(txt) {
    return String(txt || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 38);
  },
  normalizeType(v, fallback = 'Ação') {
    const raw = String(v || '').trim();
    return raw || fallback;
  },
  normalizeQuickMovementKind(value) {
    const s = String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (s === 'venda') return 'venda';
    if (['provento', 'dividendo', 'dividendos', 'jcp', 'rendimento'].includes(s)) return 'provento';
    if (['renda fixa', 'renda-fixa', 'rf', 'tesouro direto'].includes(s)) return 'renda-fixa';
    if (['outro', 'outros', 'neutral', 'neutro'].includes(s)) return 'outro';
    return 'compra';
  },
  refreshQuickMovementPreview() {},
  quickMovementDefaultDraft() {
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
      note: '',
      eventType: 'Rendimento',
    };
  },
  QUICK_SALE_TYPES: ['Ação', 'FII', 'ETF'],
};

function saleFlowContext(draft, overrides = {}) {
  return {
    console,
    PortfolioMovementContract: contract,
    S: {
      assets: ASSETS,
      aportes: [],
      proventos: [],
      quickMovementOpen: false,
      quickMovementDraft: draft,
      quickMovementEditId: null,
      quickMovementSaving: false,
    },
    document: {
      getElementById(id) {
        const values = overrides.elementValues || {};
        return values[id] !== undefined ? { value: values[id] } : null;
      },
    },
    ...HELPERS,
  };
}

const SALE_FLOW_SOURCES = [
  ['quickMovementContract', 'function quickMovementSellableAssets'],
  ['quickMovementSellableAssets', 'function quickMovementSaleAssetById'],
  ['quickMovementSaleAssetById', 'function quickMovementSaleOptionsHtml'],
  ['quickMovementSaleOptionsHtml', 'function selectQuickMovementSaleAsset'],
  ['selectQuickMovementSaleAsset', 'function setQuickMovementSaleType'],
  ['setQuickMovementSaleType', 'function quickMovementSalePreview'],
  ['quickMovementSalePreview', 'function quickMovementSaleInfoHtml'],
  ['quickMovementSaleInfoHtml', 'function quickMovementSalePreviewHtml'],
  ['quickMovementSalePreviewHtml', 'function quickMovementSourceLabel'],
];

function loadSaleFlow(draft, overrides = {}) {
  const context = saleFlowContext(draft, overrides);
  const code = SALE_FLOW_SOURCES.map(([name, marker]) => extractFunctionSource(name, marker)).join('\n');
  vm.runInNewContext(code, context);
  return context;
}

function loadBuilder(draft, overrides = {}) {
  const context = saleFlowContext(draft, overrides);
  const code = [
    extractFunctionSource('quickMovementContract', 'function quickMovementSellableAssets'),
    extractFunctionSource('quickMovementSellableAssets', 'function quickMovementSaleAssetById'),
    extractFunctionSource('quickMovementSaleAssetById', 'function quickMovementSaleOptionsHtml'),
    extractFunctionSource('quickMovementBuildAporteFromFields', 'function saveQuickMovement'),
  ].join('\n');
  vm.runInNewContext(code, context);
  return context;
}

function makeDraft(overrides = {}) {
  return {
    kind: 'venda',
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
    note: '',
    ...overrides,
  };
}

test('quickMovementSellableAssets lista somente ativos existentes (sem RF, sem saldo, sem id)', () => {
  const context = loadSaleFlow(makeDraft());
  const list = context.quickMovementSellableAssets();
  const ids = list.map((a) => a.assetId);
  assert.deepEqual(ids, ['stk-petr4', 'etf-bova11', 'fii-mxrf11']);
  const petr = list.find((a) => a.assetId === 'stk-petr4');
  assert.equal(petr.ticker, 'PETR4');
  assert.equal(petr.availableQuantity, 120);
  assert.equal(petr.averagePrice, 28.1);
  assert.equal(petr.movementKind, 'sale');
});

test('quickMovementSaleOptionsHtml oferece ativos por assetId e usa label disponível', () => {
  const context = loadSaleFlow(makeDraft());
  const html = context.quickMovementSaleOptionsHtml();
  assert.ok(html.includes('value="stk-petr4"'), 'PETR4 deve aparecer com seu assetId');
  assert.ok(html.includes('120 disp.'), 'Label deve exibir quantidade disponível');
  assert.ok(!html.includes('rf-movi18'), 'Renda fixa não deve ser vendável');
  assert.ok(!html.includes('ZERO3'), 'Ativo sem saldo não deve ser vendável');
  assert.ok(!html.includes('SEMID3'), 'Ativo sem id não deve ser vendável');
});

test('selectQuickMovementSaleAsset seleciona por assetId sem ticker manual', () => {
  const draft = makeDraft();
  const context = loadSaleFlow(draft);
  context.selectQuickMovementSaleAsset('stk-petr4');
  assert.equal(draft.assetId, 'stk-petr4');
  assert.equal(draft.ticker, 'PETR4');
  assert.equal(draft.assetName, 'Petrobras PN');
  assert.equal(draft.type, 'Ação');
  assert.equal(draft.sector, 'Petróleo');
  assert.equal(draft.saleAvailable, 120);
  assert.equal(draft.saleAvgPrice, 28.1);
});

test('selectQuickMovementSaleAsset com assetId desconhecido limpa o draft de venda', () => {
  const draft = makeDraft({ assetId: 'stk-petr4', ticker: 'PETR4', saleAvailable: 120 });
  const context = loadSaleFlow(draft);
  context.selectQuickMovementSaleAsset('nao-existe');
  assert.equal(draft.assetId, '');
  assert.equal(draft.ticker, '');
  assert.equal(draft.saleAvailable, 0);
  assert.equal(draft.qty, '');
});

test('setQuickMovementSaleType alterna entre Venda parcial e Vender tudo', () => {
  const draft = makeDraft({ assetId: 'stk-petr4', saleAvailable: 120, qty: '30' });
  const context = loadSaleFlow(draft);
  context.setQuickMovementSaleType('total');
  assert.equal(draft.saleType, 'total');
  assert.equal(draft.qty, '120');
  context.setQuickMovementSaleType('parcial');
  assert.equal(draft.saleType, 'parcial');
});

test('quickMovementSalePreview usa o contrato real e mostra saldo após (parcial)', () => {
  const draft = makeDraft({ assetId: 'stk-petr4', saleType: 'parcial', qty: '30', price: '34,25' });
  const context = loadSaleFlow(draft);
  const preview = context.quickMovementSalePreview();
  assert.equal(preview.ok, true);
  assert.equal(preview.assetId, 'stk-petr4');
  assert.equal(preview.quantityAvailable, 120);
  assert.equal(preview.quantityToSell, 30);
  assert.equal(preview.quantityRemaining, 90);
  assert.equal(preview.unitPrice, 34.25);
  assert.equal(preview.estimatedGrossValue, 1027.5);
  assert.equal(preview.isTotal, false);
  const html = context.quickMovementSalePreviewHtml();
  assert.ok(html.includes('Venda parcial'), 'Preview deve rotular a venda parcial');
  assert.ok(html.includes('Saldo após a venda: 90 unidade(s).'), 'Preview deve informar o saldo após a venda');
});

test('quickMovementSalePreview bloqueia quantidade acima da posição', () => {
  const draft = makeDraft({ assetId: 'stk-petr4', saleType: 'parcial', qty: '999', price: '34,25' });
  const context = loadSaleFlow(draft);
  const preview = context.quickMovementSalePreview();
  assert.equal(preview.ok, false);
  assert.equal(preview.code, contract.MOVEMENT_ERROR_CODES.INSUFFICIENT_QUANTITY);
  assert.match(preview.error, /acima da posição/);
});

test('quickMovementSalePreview aceita Vender tudo com quantidade igual à posição', () => {
  const draft = makeDraft({ assetId: 'fii-mxrf11', saleType: 'total', qty: '', price: '10,12' });
  const context = loadSaleFlow(draft);
  const preview = context.quickMovementSalePreview();
  assert.equal(preview.ok, true);
  assert.equal(preview.saleType, 'total');
  assert.equal(preview.quantityToSell, 500);
  assert.equal(preview.quantityRemaining, 0);
  assert.equal(preview.isTotal, true);
});

test('quickMovementBuildAporteFromFields monta o registro de venda parcial (assetId, sem ticker manual)', () => {
  const draft = makeDraft({ assetId: 'stk-petr4', saleType: 'parcial', qty: '30', price: '34,25', note: 'Venda parcial para rebalancear' });
  const context = loadBuilder(draft, {
    elementValues: { 'qm-dt': '2026-08-05', 'qm-price': '34,25', 'qm-note': 'Venda parcial para rebalancear' },
  });
  const built = context.quickMovementBuildAporteFromFields('venda');
  assert.equal(built.error, undefined);
  assert.equal(built.kind, 'venda');
  assert.equal(built.reg.operation, 'venda');
  assert.equal(built.reg.movementKind, 'venda');
  assert.equal(built.reg.assetId, 'stk-petr4');
  assert.equal(built.reg.ticker, 'PETR4');
  assert.equal(built.reg.qty, 30);
  assert.equal(built.reg.price, 34.25);
  assert.equal(built.reg.date, '05/08/2026');
  assert.equal(built.reg.decision, 'Venda parcial para rebalancear');
  assert.equal(built.reg.type, 'Ação');
  assert.equal(built.reg.saleType, 'partial');
});

test('quickMovementBuildAporteFromFields monta o registro de Vender tudo', () => {
  const draft = makeDraft({ assetId: 'fii-mxrf11', saleType: 'total', qty: '', price: '10,12' });
  const context = loadBuilder(draft, {
    elementValues: { 'qm-dt': '2026-08-05', 'qm-price': '10,12' },
  });
  const built = context.quickMovementBuildAporteFromFields('venda');
  assert.equal(built.error, undefined);
  assert.equal(built.reg.qty, 500);
  assert.equal(built.reg.assetId, 'fii-mxrf11');
  assert.equal(built.reg.saleType, 'total');
});

test('quickMovementBuildAporteFromFields rejeita venda sem ativo selecionado', () => {
  const context = loadBuilder(makeDraft());
  const built = context.quickMovementBuildAporteFromFields('venda');
  assert.equal(built.error, 'Selecione um ativo para vender.');
});

test('quickMovementBuildAporteFromFields rejeita quantidade acima da posição no build', () => {
  const draft = makeDraft({ assetId: 'stk-petr4', saleType: 'parcial', qty: '999', price: '34,25' });
  const context = loadBuilder(draft, {
    elementValues: { 'qm-dt': '2026-08-05', 'qm-price': '34,25' },
  });
  const built = context.quickMovementBuildAporteFromFields('venda');
  assert.match(built.error, /acima da posição/);
});

test('quickMovementSaleInfoHtml exibe dados do ativo selecionado', () => {
  const draft = makeDraft({ assetId: 'stk-petr4' });
  const context = loadSaleFlow(draft);
  const html = context.quickMovementSaleInfoHtml();
  assert.ok(html.includes('PETR4'), 'Deve exibir o ticker');
  assert.ok(html.includes('Petrobras PN'), 'Deve exibir o nome');
  assert.ok(html.includes('120'), 'Deve exibir a quantidade disponível');
  assert.ok(html.includes('28,10'), 'Deve exibir o preço médio');
  draft.assetId = '';
  assert.equal(context.quickMovementSaleInfoHtml(), '', 'Sem ativo selecionado deve retornar vazio');
});

test('saveQuickMovement tem guarda anti duplo clique via quickMovementSaving', () => {
  const source = extractFunctionSource('saveQuickMovement', 'function isRendaFixaAsset');
  assert.ok(source.includes('S.quickMovementSaving'), 'saveQuickMovement deve usar o estado quickMovementSaving');
  assert.ok(source.includes('if(S.quickMovementSaving){'), 'Guarda anti duplo clique presente');
  assert.ok(source.includes('S.quickMovementSaving=true'), 'Deve travar a gravação ao iniciar');
});

test('saveQuickMovement com gravação em andamento não duplica o lançamento', () => {
  const toasts = [];
  const context = {
    console,
    S: {
      aportes: [],
      proventos: [],
      quickMovementDraft: makeDraft(),
      quickMovementEditId: null,
      quickMovementSaving: true,
    },
    canEditFromThisTab() {
      return true;
    },
    toast(message) {
      toasts.push(message);
    },
  };
  vm.runInNewContext(`${extractFunctionSource('saveQuickMovement', 'function isRendaFixaAsset')}\nthis.__save = saveQuickMovement;`, context);
  context.__save();
  assert.equal(toasts.length, 1);
  assert.match(toasts[0], /em andamento/);
  assert.equal(context.S.aportes.length, 0, 'Nenhum lançamento deve ser gravado enquanto já grava');
});

test('fluxo de venda não altera renda fixa nem usa ticker manual', () => {
  const saleFieldsRegion = indexHtml.slice(
    indexHtml.indexOf('const saleType=draft.saleType=='),
    indexHtml.indexOf('const body=kind===\'provento\'')
  );
  assert.ok(saleFieldsRegion.includes('Ativo (somente posições com saldo)'), 'Venda deve usar seletor de posições');
  assert.ok(saleFieldsRegion.includes('select id="qm-sale-asset"'), 'Seleção deve ser por select (sem ticker manual)');
  assert.ok(saleFieldsRegion.includes('Venda parcial'), 'Deve oferecer Venda parcial');
  assert.ok(saleFieldsRegion.includes('Vender tudo'), 'Deve oferecer Vender tudo');
  assert.ok(!saleFieldsRegion.includes('qm-ti'), 'Venda não deve expor input de ticker manual');
  assert.ok(!saleFieldsRegion.includes('qm-type'), 'Venda não deve expor tipo manual');
  assert.ok(!saleFieldsRegion.includes('qm-sector'), 'Venda não deve expor setor manual');
  assert.ok(!saleFieldsRegion.includes('qm-rf-'), 'Venda não deve tocar campos de renda fixa');
  assert.ok(!saleFieldsRegion.includes('eventType'), 'Venda não deve tocar campos de proventos');
});

test('contrato expõe as funções exigidas pela venda simplificada', () => {
  assert.equal(typeof contract.buildSellableAssets, 'function');
  assert.equal(typeof contract.buildVariableIncomeSalePreview, 'function');
  assert.equal(typeof contract.findPortfolioMovementAsset, 'function');
  assert.equal(contract.MOVEMENT_ERROR_CODES.INSUFFICIENT_QUANTITY, 'INSUFFICIENT_QUANTITY');
});

test('diff da venda simplificada contém os marcadores exigidos', () => {
  const diff = require('node:child_process').execSync('git diff -- index.html', { encoding: 'utf8' });
  for (const marker of [
    'buildSellableAssets',
    'assetId',
    'Venda parcial',
    'Vender tudo',
    'buildVariableIncomeSalePreview',
    'quickMovementSaving',
  ]) {
    assert.ok(diff.includes(marker), `O diff deve conter: ${marker}`);
  }
});
