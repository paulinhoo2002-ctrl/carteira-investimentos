const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const T = require('../tax-cost-basis-intelligence.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// ── Static contract checks on the V327 surface (index.html) ────────────────
test('V327: buy and sell forms expose the fees field with accessible label', () => {
  const buyForm = html.slice(html.indexOf('const buySellFields'), html.indexOf('const proventoFields'));
  assert.match(buyForm, /id="qm-fees"/, 'buy form must include qm-fees input');
  assert.match(buyForm, /aria-label="Taxas e emolumentos"/, 'buy fees input must be labeled');
  const saleForm = html.slice(html.indexOf('const saleFields'), html.indexOf('const rfMovEditorAsset'));
  assert.match(saleForm, /id="qm-fees"/, 'sale form must include qm-fees input');
  assert.match(saleForm, /aria-label="Taxas da venda"/, 'sale fees input must be labeled');
});

test('V327: fees are wired into buy and sale records, empty stays null (UNKNOWN != ZERO)', () => {
  const build = html.slice(html.indexOf('function quickMovementBuildAporteFromFields'), html.indexOf('function saveQuickMovement'));
  // sale branch persists fees (null when empty)
  assert.match(build, /const fees=feesState\.reason==='empty'\?null:feesState\.value;/);
  assert.match(build, /fees,\r?\n\s+date:brDate\(dt\)/, 'sale reg must carry fees');
  // buy branch persists fees (null when empty)
  assert.match(build, /fees,\r?\n\s+date:dt/, 'buy reg must carry fees');
  assert.match(build, /if\(feesState\.value<0\) return \{error:'Taxas: informe um valor maior ou igual a zero\.'/, 'negative fees fail closed');
});

test('V327: sale preview shows fees, gross, net proceeds and realized P&L state', () => {
  const previewFn = html.slice(html.indexOf('function quickMovementSalePreviewHtml'), html.indexOf('function quickMovementSourceLabel'));
  assert.match(previewFn, /quickMovementSaleRealizedPnl/, 'preview must call the fail-closed pnl helper');
  assert.match(previewFn, /Resultado realizado/);
  assert.match(previewFn, /Resultado não disponível/);
  assert.match(previewFn, /Revisão necessária/);
  assert.match(previewFn, /Líquido/);
  assert.match(previewFn, /Bruto/);
});

test('V327: pnl helper consumes V326 engine and fails closed, never inventing basis', () => {
  const helper = html.slice(html.indexOf('function quickMovementSaleRealizedPnl'), html.indexOf('function quickMovementSalePreviewHtml'));
  assert.match(helper, /TaxCostBasisIntelligence/);
  assert.match(helper, /RESULT_NOT_AVAILABLE/);
  assert.match(helper, /NEEDS_REVIEW/);
  assert.match(helper, /buildCostBasis/);
});

test('V327: history rows render fees column with explicit unknown marker', () => {
  const apTab = html.slice(html.indexOf('function apTab'));
  assert.match(apTab, /a\.fees===null\|\|a\.fees===undefined\?'<span class="mu">—<\/span>':fmt\(Number\(a\.fees\)\)/);
  assert.match(apTab, /<th scope="col">Taxas<\/th>/);
});

// ── Runtime checks through the real V326 engine (the single financial authority) ──
// The UI helper must faithfully surface these states; these tests pin the contract.
test('V326 contract: buy fees enter the basis and sell fees reduce proceeds', () => {
  const result = T.buildTaxIntelligence({ transactions: [
    { id: 'b1', date: '2025-01-10', ticker: 'QMFE3', type: 'Ação', operation: 'compra', qty: 100, price: 10, fees: 5, source: 'manual-transaction' },
    { id: 's1', date: '2025-02-10', ticker: 'QMFE3', type: 'Ação', operation: 'venda', qty: 50, price: 20, fees: 2, source: 'manual-transaction' },
  ] });
  const sale = result.realizedGains.rows.find(r => r.id === 's1');
  assert.equal(sale.allocatedCostBasis, 502.5); // (1000+5)/100 * 50
  assert.equal(sale.netProceeds, 998);          // 1000 - 2
  assert.equal(sale.realizedGainLoss, 495.5);
  assert.equal(sale.status, 'COMPLETE');
});

test('V326 contract: missing fees keep the realized row in review (never zero)', () => {
  const result = T.buildTaxIntelligence({ transactions: [
    { id: 'b1', date: '2025-01-10', ticker: 'QMFN3', type: 'Ação', operation: 'compra', qty: 10, price: 100, source: 'manual-transaction' },
    { id: 's1', date: '2025-02-10', ticker: 'QMFN3', type: 'Ação', operation: 'venda', qty: 10, price: 120, source: 'manual-transaction' },
  ] });
  const sale = result.realizedGains.rows.find(r => r.id === 's1');
  assert.equal(sale.status, 'NEEDS_REVIEW');
  assert.match(sale.needsReviewReason, /MISSING_FEES/);
  assert.notEqual(sale.confidence, 'HIGH');
});

test('V326 contract: over-sale yields NEEDS_REVIEW with no usable gain', () => {
  const result = T.buildTaxIntelligence({ transactions: [
    { id: 'b1', date: '2025-01-10', ticker: 'QMOV3', type: 'Ação', operation: 'compra', qty: 10, price: 10, fees: 0, source: 'manual-transaction' },
    { id: 's1', date: '2025-02-10', ticker: 'QMOV3', type: 'Ação', operation: 'venda', qty: 11, price: 20, fees: 0, source: 'manual-transaction' },
  ] });
  const sale = result.realizedGains.rows.find(r => r.id === 's1');
  assert.equal(sale.status, 'NEEDS_REVIEW');
  assert.equal(sale.realizedGainLoss, null);
  assert.match(sale.needsReviewReason, /SELL_EXCEEDS_AVAILABLE_QUANTITY/);
});

test('V326 contract: multiple lots produce weighted-average basis', () => {
  const result = buildTaxIntelligence({ transactions: [
      { id: 'b1', date: '2025-01-10', ticker: 'QMFE3', type: 'Ação', operation: 'compra', qty: 100, price: 10, fees: 5, source: 'manual-transaction' },
      { id: 'b2', date: '2025-02-10', ticker: 'QMFE3', type: 'Ação', operation: 'compra', qty: 100, price: 20, fees: 5, source: 'manual-transaction' },
      { id: 's1', date: '2025-02-10', ticker: 'QMFE3', type: 'Ação', operation: 'venda', qty: 50, price: 20, fees: 2, source: 'manual-transaction' }
    ] });
    const sale = result.realizedGains.rows.find(r => r.id === 's1');
    assert.equal(sale.allocatedCostBasis, 502.5);
  assert.equal(sale.realizedGainLoss, 1000);
  assert.equal(result.positions[0].runningQuantity, 100);
  assert.equal(result.positions[0].runningCostBasis, 1500);
});

test('V326 contract: sell without any purchase history has no basis (RESULT_NOT_AVAILABLE path)', () => {
  const result = T.buildTaxIntelligence({ transactions: [
    { id: 's1', date: '2025-02-10', ticker: 'QMNB3', type: 'Ação', operation: 'venda', qty: 10, price: 20, fees: 0, source: 'manual-transaction' },
  ] });
  const sale = result.realizedGains.rows.find(r => r.id === 's1');
  assert.equal(sale.status, 'NEEDS_REVIEW');
  assert.equal(sale.allocatedCostBasis, null);
  assert.equal(sale.realizedGainLoss, null);
  assert.match(sale.needsReviewReason, /MISSING_PURCHASE_HISTORY/);
});

test('V326 contract: full sale zeroes the position and preserves realized gain', () => {
  const result = T.buildTaxIntelligence({ transactions: [
    { id: 'b1', date: '2025-01-10', ticker: 'QMFS3', type: 'Ação', operation: 'compra', qty: 10, price: 10, fees: 1, source: 'manual-transaction' },
    { id: 's1', date: '2025-02-10', ticker: 'QMFS3', type: 'Ação', operation: 'venda', qty: 10, price: 15, fees: 1, source: 'manual-transaction' },
  ] });
  const sale = result.realizedGains.rows.find(r => r.id === 's1');
  assert.equal(sale.allocatedCostBasis, 101);
  assert.equal(sale.netProceeds, 149);
  assert.equal(sale.realizedGainLoss, 48);
  assert.equal(result.positions[0].runningQuantity, 0);
});

test('V326 contract: losing sale surfaces negative realized result faithfully', () => {
  const result = T.buildTaxIntelligence({ transactions: [
    { id: 'b1', date: '2025-01-10', ticker: 'QMLS3', type: 'Ação', operation: 'compra', qty: 10, price: 50, fees: 0, source: 'manual-transaction' },
    { id: 's1', date: '2025-02-10', ticker: 'QMLS3', type: 'Ação', operation: 'venda', qty: 10, price: 40, fees: 0, source: 'manual-transaction' },
  ] });
  const sale = result.realizedGains.rows.find(r => r.id === 's1');
  assert.equal(sale.realizedGainLoss, -100);
  assert.equal(sale.status, 'COMPLETE');
});

test('V326 contract: unknown asset classes stay unsupported, no fake compatibility', () => {
  const result = T.buildTaxIntelligence({ transactions: [
    { id: 'c1', date: '2025-01-10', ticker: 'QMBT5', type: 'Crypto', operation: 'compra', qty: 1, price: 100, fees: 0, source: 'manual-transaction' },
  ] });
  assert.ok(result.costBasis.unsupported.some(r => r.ticker === 'QMBT5' || String(r.type).includes('Crypto')));
  assert.equal(result.realizedGains.rows.length, 0);
});
