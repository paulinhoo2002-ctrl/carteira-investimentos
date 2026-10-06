const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tax-cost-basis-intelligence');

test('calcula custo médio ponderado e venda parcial sem tratar venda como lucro', () => {
  const result = T.buildTaxIntelligence({ transactions: [
    { id: 'buy-1', date: '2025-01-10', ticker: 'AAA3', type: 'Ação', operation: 'compra', qty: 100, price: 10, fees: 5, source: 'broker-note' },
    { id: 'buy-2', date: '2025-02-10', ticker: 'AAA3', type: 'Ação', operation: 'compra', qty: 100, price: 20, fees: 5, source: 'broker-note' },
    { id: 'sell-1', date: '2025-03-10', ticker: 'AAA3', type: 'Ação', operation: 'venda', qty: 50, price: 30, fees: 2, source: 'broker-note' },
  ] });
  assert.equal(result.costBasis.status, 'PARTIAL');
  assert.equal(result.realizedGains.rows.length, 1);
  assert.equal(result.realizedGains.rows[0].allocatedCostBasis, 752.5);
  assert.equal(result.realizedGains.rows[0].netProceeds, 1498);
  assert.equal(result.realizedGains.rows[0].realizedGainLoss, 745.5);
  assert.equal(result.positions[0].runningQuantity, 150);
  assert.equal(result.positions[0].runningCostBasis, 2257.5);
  assert.equal(result.taxSummary.taxDue.status, 'NEEDS_REVIEW');
});

test('não inventa taxas: custo e ganho ficam pendentes quando custos não estão disponíveis', () => {
  const result = T.buildTaxIntelligence({ transactions: [
    { id: 'buy-1', date: '2025-01-10', ticker: 'BBB3', type: 'Ação', operation: 'compra', qty: 10, price: 100, source: 'historical-reconstruction' },
    { id: 'sell-1', date: '2025-02-10', ticker: 'BBB3', type: 'Ação', operation: 'venda', qty: 10, price: 120, source: 'historical-reconstruction' },
  ] });
  assert.equal(result.costBasis.rows[0].confidence, 'LOW');
  assert.equal(result.realizedGains.rows[0].status, 'NEEDS_REVIEW');
  assert.match(result.realizedGains.rows[0].needsReviewReason, /MISSING_FEES/);
  assert.equal(result.taxSummary.taxDue.value, null);
});

test('venda acima da quantidade com custo disponível não produz ganho realizado utilizável', () => {
  const result = T.buildTaxIntelligence({ transactions: [
    { id: 'buy-1', date: '2025-01-10', ticker: 'OVER3', type: 'Ação', operation: 'compra', qty: 10, price: 10, fees: 0, source: 'broker-note' },
    { id: 'sell-1', date: '2025-02-10', ticker: 'OVER3', type: 'Ação', operation: 'venda', qty: 11, price: 20, fees: 0, source: 'broker-note' },
  ] });

  const sale = result.realizedGains.rows[0];
  assert.equal(sale.status, 'NEEDS_REVIEW');
  assert.equal(sale.needsReview, true);
  assert.match(sale.needsReviewReason, /SELL_EXCEEDS_AVAILABLE_QUANTITY/);
  assert.equal(sale.realizedGainLoss, null);
  assert.equal(result.realizedGains.status, 'PARTIAL');
  const saleTransaction = result.costBasis.rows.find(row => row.id === 'sell-1');
  assert.equal(saleTransaction.status, 'NEEDS_REVIEW');
  assert.equal(saleTransaction.coverage, 'PARTIAL');
  assert.notEqual(saleTransaction.confidence, 'HIGH');
  assert.match(saleTransaction.needsReviewReason, /SELL_EXCEEDS_AVAILABLE_QUANTITY/);
});

test('fechamento fracionário exato não é classificado como venda excedente', () => {
  const result = T.buildTaxIntelligence({ transactions: [
    { id: 'buy-1', date: '2025-01-10', ticker: 'FRA3', type: 'Ação', operation: 'compra', qty: 0.3, price: 10, fees: 0, source: 'broker-note' },
    { id: 'sell-1', date: '2025-02-10', ticker: 'FRA3', type: 'Ação', operation: 'venda', qty: 0.1, price: 20, fees: 0, source: 'broker-note' },
    { id: 'sell-2', date: '2025-03-10', ticker: 'FRA3', type: 'Ação', operation: 'venda', qty: 0.2, price: 30, fees: 0, source: 'broker-note' },
  ] });

  assert.equal(result.positions[0].runningQuantity, 0);
  assert.equal(result.positions[0].status, 'COMPLETE');
  assert.ok(result.realizedGains.rows.every(row => row.status === 'COMPLETE'));
});

test('excesso fracionário real continua em revisão', () => {
  const result = T.buildTaxIntelligence({ transactions: [
    { id: 'buy-1', date: '2025-01-10', ticker: 'FRA4', type: 'Ação', operation: 'compra', qty: 0.3, price: 10, fees: 0, source: 'broker-note' },
    { id: 'sell-1', date: '2025-02-10', ticker: 'FRA4', type: 'Ação', operation: 'venda', qty: 0.1, price: 20, fees: 0, source: 'broker-note' },
    { id: 'sell-2', date: '2025-03-10', ticker: 'FRA4', type: 'Ação', operation: 'venda', qty: 0.2001, price: 30, fees: 0, source: 'broker-note' },
  ] });

  const sale = result.realizedGains.rows.find(row => row.id === 'sell-2');
  assert.equal(sale.status, 'NEEDS_REVIEW');
  assert.equal(sale.realizedGainLoss, null);
  assert.match(sale.needsReviewReason, /SELL_EXCEEDS_AVAILABLE_QUANTITY/);
});

test('separa classes não suportadas e eventos não transacionais', () => {
  const result = T.buildTaxIntelligence({ transactions: [
    { id: 'fii-1', date: '2025-01-10', ticker: 'FII11', type: 'FII', operation: 'compra', qty: 10, price: 100, fees: 1, source: 'broker-note' },
    { id: 'transfer-1', date: '2025-02-10', ticker: 'FII11', type: 'FII', operation: 'transferência', qty: 10, price: 0, source: 'movement-reference' },
    { id: 'split-1', date: '2025-03-10', ticker: 'FII11', type: 'FII', operation: 'desdobramento', qty: 10, price: 0, source: 'corporate-event' },
  ] });
  assert.equal(result.positions[0].status, 'NEEDS_REVIEW');
  assert.match(result.positions[0].needsReviewReason, /UNSUPPORTED_CORPORATE_EVENT|TRANSFER_WITHOUT_COST_BASIS/);
  assert.equal(result.realizedGains.rows.length, 0);
});

test('reconcilia income ledger da V253 sem mutá-lo', () => {
  const result = T.buildTaxIntelligence({ transactions: [], incomeEvents: [
    { id: 'income-1', date: '2025-04-10', ticker: 'AAA3', type: 'Dividendo', value: 10, source: 'ledger' },
  ] });
  assert.equal(result.incomeLedger.total, 10);
  assert.equal(result.incomeLedger.writeEnabled, false);
  assert.equal(result.incomeLedger.status, 'COMPLETE');
});

test('year-end snapshot é derivado da sequência de transações, não da posição atual', () => {
  const result = T.buildTaxIntelligence({ transactions: [
    { id: 'buy-1', date: '2024-01-10', ticker: 'CCC3', type: 'ETF', operation: 'compra', qty: 10, price: 20, fees: 1, source: 'broker-note' },
    { id: 'buy-2', date: '2025-01-10', ticker: 'CCC3', type: 'ETF', operation: 'compra', qty: 5, price: 30, fees: 1, source: 'broker-note' },
  ], yearEndYears: [2024, 2025] });
  assert.equal(result.yearEnd.find(row => row.year === 2024).quantity, 10);
  assert.equal(result.yearEnd.find(row => row.year === 2025).quantity, 15);
  assert.equal(result.yearEnd.find(row => row.year === 2024).status, 'MATCH');
});

test('regras oficiais ficam versionadas e cálculo tributário permanece fail-closed', () => {
  assert.ok(T.OFFICIAL_RULES.length >= 3);
  assert.ok(T.OFFICIAL_RULES.every(rule => rule.ruleVersion && rule.source && rule.verifiedAt));
  const result = T.buildTaxIntelligence({ transactions: [] });
  assert.equal(result.taxSummary.taxDue.value, null);
  assert.equal(result.taxSummary.taxDue.status, 'UNAVAILABLE');
  assert.equal(result.taxSummary.darfEnabled, false);
});
test('incerteza de venda excedente contamina vendas posteriores da mesma posição', () => {
  const result = T.buildTaxIntelligence({ transactions: [
    { id: 'buy-1', date: '2025-01-10', ticker: 'OVER4', type: 'Ação', operation: 'compra', qty: 10, price: 10, fees: 0, source: 'broker-note' },
    { id: 'sell-over', date: '2025-02-10', ticker: 'OVER4', type: 'Ação', operation: 'venda', qty: 11, price: 20, fees: 0, source: 'broker-note' },
    { id: 'sell-after', date: '2025-03-10', ticker: 'OVER4', type: 'Ação', operation: 'venda', qty: 1, price: 30, fees: 0, source: 'broker-note' },
  ] });
  const laterSale = result.realizedGains.rows.find(row => row.id === 'sell-after');
  assert.equal(laterSale.status, 'NEEDS_REVIEW');
  assert.equal(laterSale.realizedGainLoss, null);
  assert.match(laterSale.needsReviewReason, /SELL_EXCEEDS_AVAILABLE_QUANTITY/);
});

test('classe ausente ou desconhecida permanece revisão, nunca Ação inferida', () => {
  const result = T.buildTaxIntelligence({ transactions: [
    { id: 'unknown-type', date: '2025-01-10', ticker: 'UNK3', operation: 'compra', qty: 10, price: 10, fees: 0, source: 'broker-note' },
  ] });
  const row = result.costBasis.unsupported[0];
  assert.equal(row.id, 'unknown-type');
  assert.equal(row.type, 'UNKNOWN');
  assert.equal(T.normalizeTransaction({ type: 'Renda Variável' }).type, 'UNKNOWN');
  assert.equal(result.positions[0].status, 'NEEDS_REVIEW');
  assert.match(result.positions[0].needsReviewReason, /UNSUPPORTED_ASSET_CLASS/);
});

test('resultado público de ativos não suportados permanece serializável', () => {
  const result = T.buildTaxIntelligence({ transactions: [
    { id: 'crypto-buy', date: '2025-01-10', ticker: 'COIN', type: 'Crypto', operation: 'compra', qty: 0.5, price: 100, fees: 0, source: 'broker-note' },
  ] });
  assert.doesNotThrow(() => JSON.stringify(result));
});
test('IDs duplicados na mesma carga são quarantinados e não somam operações duas vezes', () => {
  const transactions = [
    { id: 'buy-dup', date: '2025-01-10', ticker: 'DUP3', type: 'Ação', operation: 'compra', qty: 10, price: 10, fees: 0, source: 'broker-note' },
    { id: 'sell-dup', date: '2025-02-10', ticker: 'DUP3', type: 'Ação', operation: 'venda', qty: 5, price: 20, fees: 0, source: 'broker-note' },
    { id: 'sell-dup', date: '2025-02-10', ticker: 'DUP3', type: 'Ação', operation: 'venda', qty: 5, price: 20, fees: 0, source: 'broker-note' },
  ];
  const result = T.buildTaxIntelligence({ transactions });
  assert.equal(result.costBasis.unsupported.length, 2);
  assert.ok(result.costBasis.unsupported.every(row => row.reasons.includes('DUPLICATE_TRANSACTION_ID')));
  assert.equal(result.realizedGains.rows.length, 0);
  assert.equal(result.positions[0].status, 'NEEDS_REVIEW');
  assert.equal(result.costBasis.status, 'PARTIAL');
  assert.deepEqual(T.buildTaxIntelligence({ transactions }), result);
});
test('operação desconhecida torna a cobertura parcial e não oculta resultado realizado', () => {
  const result = T.buildTaxIntelligence({ transactions: [
    { id: 'buy-1', date: '2025-01-10', ticker: 'UNKOP3', type: 'Ação', operation: 'compra', qty: 10, price: 10, fees: 0, source: 'broker-note' },
    { id: 'sell-1', date: '2025-02-10', ticker: 'UNKOP3', type: 'Ação', operation: 'venda', qty: 2, price: 20, fees: 0, source: 'broker-note' },
    { id: 'unknown-1', date: '2025-03-10', ticker: 'UNKOP3', type: 'Ação', operation: 'MISTYPED', qty: 8, price: 20, fees: 0, source: 'broker-note' },
  ] });
  assert.ok(result.costBasis.unsupported.some(row => row.id === 'unknown-1' && row.reasons.includes('UNSUPPORTED_OPERATION')));
  assert.equal(result.positions[0].status, 'NEEDS_REVIEW');
  assert.equal(result.positions[0].runningQuantity, null);
  assert.equal(result.positions[0].runningCostBasis, null);
  assert.equal(result.realizedGains.status, 'PARTIAL');
});

test('compra posterior a operação desconhecida não declara running state completo', () => {
  const result = T.buildTaxIntelligence({ transactions: [
    { id: 'buy-1', date: '2025-01-10', ticker: 'UNKOP4', type: 'Ação', operation: 'compra', qty: 10, price: 10, fees: 0, source: 'broker-note' },
    { id: 'unknown-1', date: '2025-02-10', ticker: 'UNKOP4', type: 'Ação', operation: 'MISTYPED', qty: 8, price: 20, fees: 0, source: 'broker-note' },
    { id: 'buy-after', date: '2025-03-10', ticker: 'UNKOP4', type: 'Ação', operation: 'compra', qty: 1, price: 30, fees: 0, source: 'broker-note' },
  ] });
  const laterBuy = result.costBasis.rows.find(row => row.id === 'buy-after');
  assert.equal(laterBuy.status, 'NEEDS_REVIEW');
  assert.equal(laterBuy.coverage, 'PARTIAL');
  assert.equal(laterBuy.runningQuantity, null);
  assert.equal(laterBuy.runningCostBasis, null);
  assert.match(laterBuy.needsReviewReason, /UNSUPPORTED_OPERATION/);
});

test('taxa em branco é desconhecida, nunca zero confirmado', () => {
  const result = T.buildTaxIntelligence({ transactions: [
    { id: 'buy-1', date: '2025-01-10', ticker: 'FEE3', type: 'Ação', operation: 'compra', qty: 10, price: 10, fees: '  ', source: 'broker-note' },
    { id: 'sell-1', date: '2025-02-10', ticker: 'FEE3', type: 'Ação', operation: 'venda', qty: 1, price: 20, fees: 0, source: 'broker-note' },
  ] });
  assert.equal(result.costBasis.rows[0].fees, null);
  assert.equal(result.costBasis.rows[0].status, 'NEEDS_REVIEW');
  assert.equal(result.realizedGains.rows[0].realizedGainLoss, null);
  assert.match(result.realizedGains.rows[0].needsReviewReason, /MISSING_FEES/);
});
