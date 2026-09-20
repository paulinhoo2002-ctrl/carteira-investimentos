const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../historical-performance-engine');

const closeTo = (actual, expected, tolerance = 1e-8) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

test('não há fluxo externo: retorno simples e TWR coincidem', () => {
  const result = H.calculatePerformance({
    valuations: [
      { date: '2025-01-01', value: 100 },
      { date: '2025-12-31', value: 110 },
    ],
  });
  assert.equal(result.coverage, 'FULL_COVERAGE');
  closeTo(result.metrics.simpleReturn.value, 0.1);
  closeTo(result.metrics.twr.value, 0.1);
});

test('aporte externo não vira retorno e TWR neutraliza o fluxo', () => {
  const result = H.calculatePerformance({
    valuations: [
      { date: '2025-01-01', value: 100 },
      { date: '2025-06-30', value: 200 },
      { date: '2025-12-31', value: 220 },
    ],
    events: [
      { date: '2025-06-30', type: 'EXTERNAL_CONTRIBUTION', amount: 100 },
    ],
  });
  assert.equal(result.metrics.simpleReturn.status, 'INSUFFICIENT_DATA');
  closeTo(result.metrics.twr.value, 0.1);
  assert.equal(result.metrics.totalReturn.status, 'INSUFFICIENT_DATA');
  assert.equal(result.metrics.incomeReturn.status, 'INSUFFICIENT_DATA');
  assert.equal(result.externalFlows[0].type, 'EXTERNAL_CONTRIBUTION');
});

test('compra, venda, dividendo, transferência e empréstimo não são aportes externos', () => {
  const rows = [
    ['BUY', 'INTERNAL'],
    ['SELL', 'INTERNAL'],
    ['DIVIDEND', 'INCOME'],
    ['CUSTODY_TRANSFER', 'INTERNAL'],
    ['STOCK_LOAN', 'INTERNAL'],
    ['EXTERNAL_WITHDRAWAL', 'EXTERNAL_WITHDRAWAL'],
  ];
  for (const [type, expected] of rows) {
    assert.equal(H.classifyCashFlow({ type }).kind, expected);
  }
});

test('renda e valorização são decompostas sem confundir aporte', () => {
  const result = H.calculatePerformance({
    valuations: [
      { date: '2025-01-01', value: 100 },
      { date: '2025-12-31', value: 115 },
    ],
    income: [{ date: '2025-12-31', amount: 5, type: 'DIVIDEND' }],
  });
  closeTo(result.metrics.capitalReturn.value, 0.1);
  closeTo(result.metrics.incomeReturn.value, 0.05);
  closeTo(result.metrics.totalReturn.value, 0.15);
});

test('split isolado preserva valor econômico e não inventa retorno', () => {
  const result = H.simulatePosition({
    quantity: 100,
    unitPrice: 10,
    event: { type: 'SPLIT', ratio: 2 },
  });
  assert.equal(result.quantity, 200);
  assert.equal(result.unitPrice, 5);
  assert.equal(result.totalValueBefore, result.totalValueAfter);
  assert.equal(result.returnValue, 0);
});

test('preço ausente é cobertura parcial, nunca zero', () => {
  const result = H.calculatePerformance({
    valuations: [{ date: '2025-01-01', value: null }, { date: '2025-12-31', value: 100 }],
    priceCoverage: { status: 'PARTIAL_COVERAGE', missingAssets: ['ABC3'] },
  });
  assert.equal(result.coverage, 'PARTIAL_COVERAGE');
  assert.equal(result.metrics.simpleReturn.status, 'INSUFFICIENT_DATA');
  assert.notEqual(result.knownValue, 0);
});

test('XIRR sem solução retorna estado explícito', () => {
  const result = H.xirr([
    { date: '2025-01-01', amount: -100 },
    { date: '2026-01-01', amount: -10 },
  ]);
  assert.equal(result.status, 'INSUFFICIENT_DATA');
});

test('benchmark é normalizado e alinhado ao primeiro ponto válido', () => {
  const result = H.normalizeBenchmark([
    { date: '2025-01-01', value: 100 },
    { date: '2025-06-30', value: 105 },
  ], '2025-01-01', '2025-12-31');
  assert.equal(result.coverage, 'PARTIAL_COVERAGE');
  assert.deepEqual(result.points.map(point => point.value), [1, 1.05]);
});

test('posição de fim de ano é determinística e read-only', () => {
  const result = H.buildYearEndPosition([
    { date: '2025-02-01', ticker: 'ABC3', quantity: 10, value: 100 },
    { date: '2025-12-31', ticker: 'ABC3', quantity: 12, value: 150 },
    { date: '2025-12-31', ticker: 'XYZ3', quantity: 2, value: 50 },
  ], 2025);
  assert.deepEqual(result.rows.map(row => row.ticker), ['ABC3', 'XYZ3']);
  assert.equal(result.writeEnabled, false);
});

test('reprocessar o mesmo histórico preserva saída', () => {
  const input = {
    valuations: [{ date: '2025-01-01', value: 100 }, { date: '2025-12-31', value: 110 }],
    events: [{ date: '2025-01-01', type: 'EXTERNAL_CONTRIBUTION', amount: 100 }],
  };
  assert.deepEqual(H.calculatePerformance(input), H.calculatePerformance(input));
});
