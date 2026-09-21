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
