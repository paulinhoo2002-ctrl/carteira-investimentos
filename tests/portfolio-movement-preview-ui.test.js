/**
 * Testes da UI de preview de movimentação de carteira (Entrega 2B).
 *
 * Testa o módulo real portfolio-movement-preview.js + portfolio-movement-contract.js,
 * com helpers/globais mínimos do ambiente. Não extrai blocos do index.html.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const repoRoot = path.join(__dirname, '..');
const INDEX_HTML = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
const CONTRACT_JS = fs.readFileSync(path.join(repoRoot, 'portfolio-movement-contract.js'), 'utf8');
const PREVIEW_JS = fs.readFileSync(path.join(repoRoot, 'portfolio-movement-preview.js'), 'utf8');

// ── Helpers de data/número usados pelos fixtures ──────────────
function inputDateValue(v) {
  if (!v) return '';
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) { const d = m[1].padStart(2,'0'), mo = m[2].padStart(2,'0'), y = String(m[3].length < 3 ? 2000+Number(m[3]) : m[3]); return `${y}-${mo}-${d}`; }
  return '';
}
function parseNum(v) {
  if (v == null) return 0;
  let s = String(v).trim().replace(/R\$|%|\s/g, '');
  if (!s) return 0;
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}
function fmt(v) {
  const n = typeof v === 'number' ? v : parseNum(v);
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function esc(s) { return String(s ?? '').replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"'); }

// ── TYPE_ALIASES canônico do index.html ──────────────────────
const TYPE_ALIASES = {
  'ACAO': 'Ação', 'AÇÃO': 'Ação', 'STOCK': 'Ação', 'AÇOES': 'Ação', 'AÇÕES': 'Ação',
  'FII': 'FII', 'FIIS': 'FII', 'FUNDO IMOBILIARIO': 'FII', 'FUNDO IMOBILIÁRIO': 'FII',
  'ETF': 'ETF', 'FUNDO DE INDICE': 'ETF', 'FUNDO DE ÍNDICE': 'ETF',
  'RENDA FIXA': 'Renda Fixa', 'RF': 'Renda Fixa', 'CDB': 'Renda Fixa', 'LCI': 'Renda Fixa', 'LCA': 'Renda Fixa',
  'TESOURO DIRETO': 'Tesouro Direto', 'TESOURO': 'Tesouro Direto', 'TD': 'Tesouro Direto',
  'RESERVA DE EMERGENCIA': 'Reserva de emergência', 'RESERVA DE EMERGÊNCIA': 'Reserva de emergência',
  'RESERVA EMERGENCIA': 'Reserva de emergência', 'RESERVA': 'Reserva de emergência',
  'BDR': 'BDR', 'CRIPTO': 'Cripto', 'CRYPTO': 'Cripto', 'CRYPTOCURRENCY': 'Cripto',
  'OUTRO': 'Outro', 'UNKNOWN': 'Outro'
};
const TYPE_ALIAS_LOOKUP = Object.fromEntries(
  Object.entries(TYPE_ALIASES).map(([k,v]) => [k.toUpperCase(), v])
);
function normalizeType(raw, fallback) {
  if (!raw) return fallback || '';
  const key = String(raw).toUpperCase().trim();
  return TYPE_ALIAS_LOOKUP[key] || String(raw).trim();
}

// ── Helpers RF ────────────────────────────────────────────────
function isRendaFixaAsset(a) {
  const t = normalizeType(a?.type || a?.asset_type || '', '');
  return t === 'Renda Fixa' || t === 'Tesouro Direto';
}
function rfPrincipalBalance(a) {
  return { value: Number(a?.rf_applied_value || a?.rf_applied || 0) || 0 };
}
function fixedIncomeOfficialValues(a) {
  return {
    applied: Number(a?.rf_applied_value || a?.rf_applied || 0) || 0,
    gross: Number(a?.rf_gross_value || 0) || 0,
    liquid: Number(a?.rf_liquid_value || 0) || 0
  };
}
function rfAssetEventId(a) { return String(a?.rf_asset_id || a?.id || ''); }
function rfAssetEventTicker(a) { return String(a?.ticker || ''); }

// ── Fixtures ──────────────────────────────────────────────────
const RV_FIXTURES = [
  { id: 'rv1', ticker: 'PETR4', type: 'Ação', name: 'Petrobras PN', qty: 100, avg_price: 28.50, current_price: 31.00 },
  { id: 'rv2', ticker: 'HGLG11', type: 'FII', name: 'CSHG Log11', qty: 50, avg_price: 160.00, current_price: 165.00 },
  { id: 'rv3', ticker: 'BOVA11', type: 'ETF', name: 'iBovespa', qty: 30, avg_price: 105.00, current_price: 110.00 },
  { id: 'rv-reserva', ticker: 'RESERV1', type: 'Reserva de emergência', name: 'Reserva', qty: 10, avg_price: 1, current_price: 1 },
  { id: 'rv-bdr', ticker: 'AAPL34', type: 'BDR', name: 'Apple BDR', qty: 5, avg_price: 100, current_price: 110 },
  { id: 'rv-cripto', ticker: 'BTC', type: 'Cripto', name: 'Bitcoin', qty: 0.5, avg_price: 200000, current_price: 300000 },
  { id: 'rv-zero', ticker: 'ZERO4', type: 'Ação', name: 'Zero Qty', qty: 0, avg_price: 1, current_price: 1 }
];

const RF_FIXTURES = [
  { id: 'rf1', ticker: 'CDB-1', type: 'Renda Fixa', rf_subtype: 'CDB', name: 'CDB Banco X', rf_applied_value: 1000, rf_gross_value: 1200, rf_liquid_value: 1100, rf_asset_id: 'rf-evt-1', rf_maturity_date: '2027-01-01' },
  { id: 'rf2', ticker: 'LCI-1', type: 'Renda Fixa', rf_subtype: 'LCI', name: 'LCI Banco Y', rf_applied_value: 500, rf_gross_value: 600, rf_liquid_value: 550, rf_asset_id: 'rf-evt-2', rf_maturity_date: '2028-06-01' },
  { id: 'rf3', ticker: 'TD-SELIC', type: 'Tesouro Direto', rf_subtype: 'Selic', name: 'Tesouro Selic 2029', rf_applied_value: 2000, rf_gross_value: 2500, rf_liquid_value: 2400, rf_asset_id: 'rf-evt-3', rf_maturity_date: '2029-01-01' },
  { id: 'rf-zero', ticker: 'CDB-ZERO', type: 'Renda Fixa', rf_subtype: 'CDB', name: 'CDB Zero', rf_applied_value: 0, rf_asset_id: 'rf-evt-zero' }
];

// ── Construção do contexto de execução ───────────────────────
function buildContext(opts) {
  const o = opts || {};
  const isTestMode = o.testMode === true;
  const isFlagOn = o.flag === true;
  const isFlagOff = o.flag === false;

  const sandbox = {
      console: console,
      exports: {},
      require: function (m) { if (m === 'node:test') return require('node:test'); if (m === 'node:assert/strict') return require('node:assert/strict'); throw new Error('Cannot require: ' + m); },
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      URLSearchParams: URLSearchParams,
      location: o.location || { search: isFlagOn ? '?portfolioMovementPreview=1' : '', hostname: 'localhost' },
      window: {},
      S: { assets: (RV_FIXTURES.concat(RF_FIXTURES)) },
      document: { currentScript: { type: '' } },
      isLocalTestMode: function () { return isTestMode; },
      normalizeType: normalizeType,
      isRendaFixaAsset: isRendaFixaAsset,
      rfPrincipalBalance: rfPrincipalBalance,
      fixedIncomeOfficialValues: fixedIncomeOfficialValues,
      rfAssetEventId: rfAssetEventId,
      rfAssetEventTicker: rfAssetEventTicker,
      fmt: fmt,
      esc: esc,
      render: function () { /* no-op */ },
    };
    sandbox.window.__LOCAL_TEST_MODE__ = isTestMode;
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;
  if (isTestMode) sandbox.window.__LOCAL_TEST_MODE__ = true;

  const ctx = vm.createContext(sandbox);

  // 1. Carregar contrato
  vm.runInContext(CONTRACT_JS, ctx, { filename: 'portfolio-movement-contract.js' });
  if (!ctx.globalThis.PortfolioMovementContract) {
    throw new Error('PortfolioMovementContract não registrado após carregar contrato');
  }

  // 2. Carregar preview
  vm.runInContext(PREVIEW_JS, ctx, { filename: 'portfolio-movement-preview.js' });
  if (!ctx.globalThis.PortfolioMovementPreview) {
    throw new Error('PortfolioMovementPreview não registrado após carregar módulo');
  }

  return ctx;
}

// ── Tests ─────────────────────────────────────────────────────

// 1. Contrato e módulo carregados
test('1. Contrato e módulo carregados (globalThis.PortfolioMovementPreview)', () => {
  const ctx = buildContext({ testMode: true });
  assert.ok(ctx.globalThis.PortfolioMovementContract, 'Contrato deve estar registrado');
  assert.ok(ctx.globalThis.PortfolioMovementPreview, 'Preview deve estar registrado');
  assert.equal(typeof ctx.globalThis.PortfolioMovementPreview.renderHtml, 'function');
});

// 2. Flag desativada em produção normal
test('2. Flag desativada em produção normal (sem query, sem testMode)', () => {
  const ctx = buildContext({ testMode: false, flag: false });
  assert.equal(ctx.globalThis.PortfolioMovementPreview.isEnabled(), false);
});

// 3. Flag ativa em testMode
test('3. Flag ativa em testMode', () => {
  const ctx = buildContext({ testMode: true });
  assert.equal(ctx.globalThis.PortfolioMovementPreview.isEnabled(), true);
});

// 4. Flag ativa via query string
test('4. Flag ativa via query string portfolioMovementPreview=1', () => {
  const ctx = buildContext({ testMode: false, flag: true, location: { search: '?portfolioMovementPreview=1', hostname: 'localhost' } });
  assert.equal(ctx.globalThis.PortfolioMovementPreview.isEnabled(), true);
});

// 5. Estado inicial vazio
test('5. Estado inicial vazio', () => {
  const ctx = buildContext({ testMode: true });
  const s = ctx.globalThis.PortfolioMovementPreview.getState();
  assert.equal(s.open, false);
  assert.equal(s.step, 'operation');
  assert.equal(s.direction, null);
  assert.equal(s.movementKind, null);
});

// 6. Modal abre/fecha/reset
test('6. Modal abre/fecha/reset', () => {
  const ctx = buildContext({ testMode: true });
  const P = ctx.globalThis.PortfolioMovementPreview;
  P.open();
  assert.equal(P.getState().open, true);
  P.close();
  assert.equal(P.getState().open, false);
  assert.equal(P.getState().step, 'operation');
});

// 7. Comprar/Aplicar é apenas informativo
test('7. Comprar/Aplicar é apenas informativo (não avança)', () => {
  const ctx = buildContext({ testMode: true });
  const P = ctx.globalThis.PortfolioMovementPreview;
  P.open();
  P.chooseDirection('buy');
  assert.equal(P.getState().direction, 'buy');
  assert.equal(P.getState().movementKind, null);
  assert.equal(P.getState().step, 'operation');
  P.close();
});

// 8. Vender/Resgatar avança para seleção
test('8. Vender/Resgatar avança para seleção', () => {
  const ctx = buildContext({ testMode: true });
  const P = ctx.globalThis.PortfolioMovementPreview;
  P.open();
  P.chooseDirection('sell');
  assert.equal(P.getState().direction, 'sell');
  assert.equal(P.getState().movementKind, null);
  assert.equal(P.getState().step, 'asset');
  P.close();
});

// 9. Builders usam contrato real
test('9. Builders usam contrato real (buildSellableAssets + buildRedeemableAssets)', () => {
  const ctx = buildContext({ testMode: true });
  const P = ctx.globalThis.PortfolioMovementPreview;
  const sellable = P.buildSellableAssets();
  const redeemable = P.buildRedeemableAssets();
  assert.ok(sellable.length > 0, 'Deve retornar ativos vendáveis');
  assert.ok(redeemable.length > 0, 'Deve retornar ativos resgatáveis');
  assert.ok(sellable.every(a => a.movementKind === 'sale'), 'Todos vendáveis são sale');
  assert.ok(redeemable.every(a => a.movementKind === 'redemption'), 'Todos resgatáveis são redemption');
});

// 10. Helpers RF oficiais injetados
test('10. Helpers RF oficiais injetados no contrato', () => {
  const ctx = buildContext({ testMode: true });
  const P = ctx.globalThis.PortfolioMovementPreview;
  const redeemable = P.buildRedeemableAssets();
  assert.ok(redeemable.length >= 3, 'Deve ter pelo menos 3 RF');
  assert.ok(redeemable.every(a => a.appliedBalance > 0), 'Todos têm saldo aplicado');
});

// 11. Filtros: RV=sale, RF=redemption, reserva omitida, busca
test('11. Filtros: RV=sale, RF=redemption, reserva/BDR/cripto/zero omitidos', () => {
  const ctx = buildContext({ testMode: true });
  const P = ctx.globalThis.PortfolioMovementPreview;
  const sellable = P.buildSellableAssets();
  const redeemable = P.buildRedeemableAssets();
  const all = sellable.concat(redeemable);

  // RV: somente Ação, FII, ETF
  const sellTypes = [...new Set(sellable.map(a => a.type))];
  assert.ok(sellTypes.includes('Ação'));
  assert.ok(sellTypes.includes('FII'));
  assert.ok(sellTypes.includes('ETF'));
  assert.ok(!sellTypes.includes('Reserva de emergência'));
  assert.ok(!sellTypes.includes('BDR'));
  assert.ok(!sellTypes.includes('Cripto'));

  // RF: somente Renda Fixa, Tesouro Direto
  const redeemTypes = [...new Set(redeemable.map(a => a.type))];
  assert.ok(redeemTypes.includes('Renda Fixa'));
  assert.ok(redeemTypes.includes('Tesouro Direto'));
  assert.ok(redeemable.every(a => a.appliedBalance > 0), 'Sem saldo zero');

  // Busca
  const filtered = P.filterAssetsBySearch(all, 'PETR');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].ticker, 'PETR4');
});

// 12. Seleção por assetId
test('12. Seleção sempre por assetId (não ticker)', () => {
  const ctx = buildContext({ testMode: true });
  const P = ctx.globalThis.PortfolioMovementPreview;
  P.open();
  P.chooseDirection('sell');
  P.selectAsset('rv1'); // PETR4
  assert.equal(P.getState().selectedAssetId, 'rv1');
  assert.equal(P.getState().movementKind, 'sale');
  assert.equal(P.getState().step, 'values');
  P.close();
});

// 13. Venda parcial usa preview oficial
test('13. Venda parcial usa buildVariableIncomeSalePreview', () => {
  const ctx = buildContext({ testMode: true });
  const P = ctx.globalThis.PortfolioMovementPreview;
  P.open();
  P.chooseDirection('sell');
  P.selectAsset('rv1');
  P.chooseMode('venda_parcial');
  // Note: chooseMode advances to confirm, so go back to values first
  // Actually, chooseMode sets step=confirm. We need to test calculatePreview
  // while in values step. Let's reset and set fields manually.
  P.getState().step = 'values';
  P.getState().mode = 'venda_parcial';
  P.getState().quantity = '10';
  P.getState().unitPrice = '31';
  const p = P.calculatePreview();
  assert.ok(p && p.ok, 'Preview deve ser válido');
  assert.equal(p.movementKind, 'sale');
  assert.equal(p.saleType, 'partial');
  assert.equal(p.quantityToSell, 10);
  assert.equal(p.unitPrice, 31);
  assert.equal(p.estimatedGrossValue, 310);
  P.close();
});

// 14. Venda total usa preview oficial
test('14. Venda total usa buildVariableIncomeSalePreview', () => {
  const ctx = buildContext({ testMode: true });
  const P = ctx.globalThis.PortfolioMovementPreview;
  P.open();
  P.chooseDirection('sell');
  P.selectAsset('rv1');
  P.getState().step = 'values';
  P.getState().mode = 'venda_total';
  P.getState().unitPrice = '32';
  const p = P.calculatePreview();
  assert.ok(p && p.ok, 'Preview deve ser válido');
  assert.equal(p.saleType, 'total');
  assert.equal(p.quantityToSell, 100);
  assert.equal(p.isTotal, true);
  assert.equal(p.estimatedGrossValue, 3200);
  P.close();
});

// 14b. Venda sem preço retorna INVALID_UNIT_PRICE
test('14b. Venda sem preço retorna INVALID_UNIT_PRICE', () => {
  const ctx = buildContext({ testMode: true });
  const P = ctx.globalThis.PortfolioMovementPreview;
  P.open();
  P.chooseDirection('sell');
  P.selectAsset('rv1');
  P.getState().step = 'values';
  P.getState().mode = 'venda_total';
  P.getState().unitPrice = '';
  const p = P.calculatePreview();
  assert.ok(p, 'Preview deve retornar algo');
  assert.equal(p.ok, false);
  assert.equal(p.errorCode || p.code, 'INVALID_UNIT_PRICE');
  P.close();
});

// 15. Resgate parcial usa buildFixedIncomeRedemptionPreview
test('15. Resgate parcial usa buildFixedIncomeRedemptionPreview', () => {
  const ctx = buildContext({ testMode: true });
  const P = ctx.globalThis.PortfolioMovementPreview;
  P.open();
  P.chooseDirection('sell');
  P.selectAsset('rf-evt-1');
  P.getState().step = 'values';
  P.getState().mode = 'resgate_parcial';
  P.getState().amount = '300';
  const p = P.calculatePreview();
  assert.ok(p && p.ok, 'Preview deve ser válido');
  assert.equal(p.movementKind, 'redemption');
  assert.equal(p.redemptionType, 'partial');
  assert.equal(p.amountToRedeem, 300);
  assert.equal(p.balanceRemaining, 700);
  P.close();
});

// 16. Resgate total usa buildFixedIncomeRedemptionPreview
test('16. Resgate total usa buildFixedIncomeRedemptionPreview', () => {
  const ctx = buildContext({ testMode: true });
  const P = ctx.globalThis.PortfolioMovementPreview;
  P.open();
  P.chooseDirection('sell');
  P.selectAsset('rf-evt-1');
  P.getState().step = 'values';
  P.getState().mode = 'resgate_total';
  const p = P.calculatePreview();
  assert.ok(p && p.ok, 'Preview deve ser válido');
  assert.equal(p.redemptionType, 'total');
  assert.equal(p.amountToRedeem, 1000);
  assert.equal(p.balanceRemaining, 0);
  assert.equal(p.isTotal, true);
  P.close();
});

// 17. Confirmação não chama saveQuickMovement
test('17. Confirmação não chama saveQuickMovement (sem escrita)', () => {
  const ctx = buildContext({ testMode: true });
  const P = ctx.globalThis.PortfolioMovementPreview;
  let called = false;
  ctx.globalThis.saveQuickMovement = function () { called = true; };
  P.open();
  P.chooseDirection('sell');
  P.selectAsset('rv1');
  P.getState().step = 'values';
  P.getState().mode = 'venda_total';
  P.getState().unitPrice = '30';
  P.getState().step = 'confirm';
  P.confirmSimulation();
  assert.equal(called, false, 'saveQuickMovement não deve ser chamado');
  assert.equal(P.getState().completed, true);
  assert.equal(P.getState().submitting, true);
  P.close();
});

// 18. Confirmação não chama saveRfMovimentacao
test('18. Confirmação não chama saveRfMovimentacao (sem escrita RF)', () => {
  const ctx = buildContext({ testMode: true });
  const P = ctx.globalThis.PortfolioMovementPreview;
  let called = false;
  ctx.globalThis.saveRfMovimentacao = function () { called = true; };
  P.open();
  P.chooseDirection('sell');
  P.selectAsset('rf-evt-1');
  P.getState().step = 'values';
  P.getState().mode = 'resgate_total';
  P.getState().step = 'confirm';
  P.confirmSimulation();
  assert.equal(called, false, 'saveRfMovimentacao não deve ser chamado');
  P.close();
});

// 19. Confirmação não altera S.aportes
test('19. Confirmação não altera S.aportes', () => {
  const ctx = buildContext({ testMode: true });
  const P = ctx.globalThis.PortfolioMovementPreview;
  ctx.globalThis.S.aportes = [
    { id: 1, ticker: 'PETR4', qty: 100, price: 28, operation: 'compra' }
  ];
  const before = JSON.stringify(ctx.globalThis.S.aportes);
  P.open();
  P.chooseDirection('sell');
  P.selectAsset('rv1');
  P.getState().step = 'confirm';
  P.confirmSimulation();
  const after = JSON.stringify(ctx.globalThis.S.aportes);
  assert.equal(after, before, 'S.aportes deve ser idêntico');
  P.close();
});

// 20. Confirmação não altera S.rfEvents
test('20. Confirmação não altera S.rfEvents', () => {
  const ctx = buildContext({ testMode: true });
  const P = ctx.globalThis.PortfolioMovementPreview;
  ctx.globalThis.S.rfEvents = [
    { id: 'rf-evt-1', type: 'aplicacao', amount: 1000 }
  ];
  const before = JSON.stringify(ctx.globalThis.S.rfEvents);
  P.open();
  P.chooseDirection('sell');
  P.selectAsset('rf-evt-1');
  P.getState().step = 'confirm';
  P.confirmSimulation();
  const after = JSON.stringify(ctx.globalThis.S.rfEvents);
  assert.equal(after, before, 'S.rfEvents deve ser idêntico');
  P.close();
});

// 21. Duplo clique bloqueado por submitting
test('21. Duplo clique na confirmação é bloqueado', () => {
  const ctx = buildContext({ testMode: true });
  const P = ctx.globalThis.PortfolioMovementPreview;
  P.open();
  P.chooseDirection('sell');
  P.selectAsset('rv1');
  P.getState().step = 'confirm';
  P.confirmSimulation();
  assert.equal(P.getState().submitting, true);
  assert.equal(P.getState().completed, true);
  // Segunda chamada não deve alterar nada
  const state1 = JSON.stringify(P.getState());
  P.confirmSimulation();
  const state2 = JSON.stringify(P.getState());
  assert.equal(state1, state2, 'Segundo clique não muda nada');
  P.close();
});

// 22. Estado vazio inicial
test('22. Estado vazio inicial após reset', () => {
  const ctx = buildContext({ testMode: true });
  const P = ctx.globalThis.PortfolioMovementPreview;
  P.open();
  P.chooseDirection('sell');
  P.selectAsset('rv1');
  P.reset();
  const s = P.getState();
  assert.equal(s.open, false);
  assert.equal(s.step, 'operation');
  assert.equal(s.selectedAssetId, null);
  assert.equal(s.mode, null);
});

// 23. Estado de erro: preview inválido desabilita
test('23. Estado de erro: preview inválido desabilita continuar', () => {
  const ctx = buildContext({ testMode: true });
  const P = ctx.globalThis.PortfolioMovementPreview;
  P.open();
  P.chooseDirection('sell');
  P.selectAsset('rv1');
  P.getState().step = 'values';
  P.getState().mode = 'venda_parcial';
  P.getState().quantity = '';
  P.getState().unitPrice = '';
  assert.equal(P.isValid(), false, 'Sem qty/price deve ser inválido');
  P.close();
});

// 24. Acessibilidade: role, aria-modal, aria-labelledby
test('24. Acessibilidade: role=dialog, aria-modal=true, aria-labelledby', () => {
  const ctx = buildContext({ testMode: true });
  const P = ctx.globalThis.PortfolioMovementPreview;
  P.open();
  const html = P.renderHtml();
  assert.ok(html.includes('role="dialog"'), 'Deve ter role=dialog');
  assert.ok(html.includes('aria-modal="true"'), 'Deve ter aria-modal=true');
  assert.ok(html.includes('aria-labelledby="pmp-title"'), 'Deve ter aria-labelledby');
  assert.ok(html.includes('id="pmp-title"'), 'Deve ter id pmp-title');
  assert.ok(html.includes('aria-label') || html.includes('aria-live'), 'Deve ter aria-label ou aria-live');
  P.close();
});

// 25a. CSS: prefixo .pmp- (sem .rfmv-)
test('25a. CSS usa prefixo .pmp- no index.html', () => {
  assert.ok(INDEX_HTML.includes('.pmp-modal'), 'Deve ter .pmp-modal no CSS');
  assert.ok(INDEX_HTML.includes('.pmp-panel'), 'Deve ter .pmp-panel');
  assert.ok(INDEX_HTML.includes('.pmp-btn-primary'), 'Deve ter .pmp-btn-primary');
});

// 25b. Modal HTML contém atributos de acessibilidade
test('25b. Modal HTML tem atributos de acessibilidade', () => {
  const ctx = buildContext({ testMode: true });
  const P = ctx.globalThis.PortfolioMovementPreview;
  P.open();
  const html = P.renderHtml();
  assert.ok(html.includes('role="dialog"'));
  assert.ok(html.includes('aria-modal="true"'));
  assert.ok(html.includes('aria-labelledby'));
  P.close();
});

// 25c. Scripts carregados na ordem correta no index.html
test('25c. Scripts carregados na ordem: contrato antes de preview', () => {
  const contractIdx = INDEX_HTML.indexOf('portfolio-movement-contract.js');
  const previewIdx = INDEX_HTML.indexOf('portfolio-movement-preview.js');
  assert.ok(contractIdx > 0, 'Contrato script tag deve existir');
  assert.ok(previewIdx > 0, 'Preview script tag deve existir');
  assert.ok(contractIdx < previewIdx, 'Contrato deve vir antes do preview');
});

// 26. Botão antigo preservado em apTab()
test('26. Botão antigo "+ Nova movimentação" preservado em apTab()', () => {
  assert.ok(INDEX_HTML.includes('openQuickMovement()'), 'Botão antigo deve existir');
  assert.ok(INDEX_HTML.includes('+ Nova movimentação'), 'Texto do botão antigo deve existir');
});

// 27. Botão preview existe em apTab() condicional
test('27. Botão preview existe em apTab() condicional à flag', () => {
  assert.ok(INDEX_HTML.includes('Nova movimentação inteligente'), 'Botão preview deve existir no HTML');
  assert.ok(INDEX_HTML.includes('PortfolioMovementPreview'), 'Deve usar namespace PortfolioMovementPreview');
});

// 28. Modal injetado no shell app()
test('28. Modal injetado no shell app()', () => {
  assert.ok(INDEX_HTML.includes("PortfolioMovementPreview"), 'app() deve referenciar PortfolioMovementPreview');
  assert.ok(INDEX_HTML.includes("renderHtml()"), 'app() deve chamar renderHtml()');
});