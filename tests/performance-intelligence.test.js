const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../performance-intelligence');

test('reconcilia patrimônio, custo e resultado sem escrever', () => {
  const result = P.buildPerformanceIntelligence({
    assets: [
      { ticker: 'AAA3', type: 'Ação', invested: 100, current: 120 },
      { ticker: 'BBB11', type: 'FII', invested: 80, current: 75 },
    ],
    externalFlows: [{ type: 'CONTRIBUTION', amount: 50 }, { type: 'WITHDRAWAL', amount: 10 }],
    income: [{ type: 'DIVIDEND', value: 5 }],
    realized: [{ result: 7 }],
  });
  assert.equal(result.writeEnabled, false);
  assert.equal(result.coverage, 'FULL_COVERAGE');
  assert.equal(result.portfolio.currentPatrimony, 195);
  assert.equal(result.portfolio.investedCapital, 180);
  assert.equal(result.portfolio.unrealizedResult, 15);
  assert.equal(result.cashFlow.netContributions, 40);
  assert.equal(result.income.paid, 5);
  assert.equal(result.realized.value, 7);
  assert.equal(result.byClass.length, 2);
});

test('dados incompletos permanecem parciais e nunca viram zero', () => {
  const result = P.buildPerformanceIntelligence({ assets: [{ ticker: 'AAA3', invested: 100, current: null }] });
  assert.equal(result.coverage, 'PARTIAL_COVERAGE');
  assert.equal(result.portfolio.unrealizedResult, null);
  assert.equal(result.portfolio.returnPct, null);
  assert.equal(result.rows[0].status, 'INSUFFICIENT_DATA');
});

test('proventos anunciados ou estimados não entram como pagos', () => {
  const result = P.buildPerformanceIntelligence({
    assets: [{ ticker: 'AAA3', invested: 100, current: 100 }],
    income: [
      { value: 10, state: 'PAID' },
      { value: 20, state: 'ANNOUNCED' },
      { value: 30, state: 'PROJECTED' },
    ],
  });
  assert.equal(result.income.paid, 10);
});

test('benchmark exige janela e cobertura alinhadas', () => {
  assert.equal(P.compareBenchmark({ portfolioReturn: 10, benchmarkReturn: 8, portfolioCoverage: 'PARTIAL_COVERAGE', benchmarkCoverage: 'FULL_COVERAGE' }).status, 'UNAVAILABLE');
  assert.deepEqual(P.compareBenchmark({ portfolioReturn: 10, benchmarkReturn: 8, portfolioCoverage: 'FULL_COVERAGE', benchmarkCoverage: 'FULL_COVERAGE' }), { status: 'PASS', value: 2, reason: 'ALIGNED_SAME_WINDOW' });
});

test('empty portfolio is explicit UNKNOWN', () => {
  const result = P.buildPerformanceIntelligence();
  assert.equal(result.coverage, 'UNKNOWN');
  assert.equal(result.portfolio.status, 'UNKNOWN');
  assert.equal(result.portfolio.currentPatrimony, null);
  assert.equal(result.income.status, 'UNKNOWN');
  assert.equal(result.income.paid, null);
  assert.equal(result.realized.status, 'UNAVAILABLE');
});
