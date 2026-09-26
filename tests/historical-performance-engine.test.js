const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../historical-performance-engine');

const closeTo = (actual, expected, tolerance = 1e-8) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const trustedContribution = (date = '2025-06-30') => ({
  id: 'flow-1', walletId: 'wallet-a', date, classification: 'EXTERNAL_CONTRIBUTION',
  isExternalFlow: true, confidence: 'HIGH', amount: 100, investorSignedAmount: -100,
  timing: 'END_OF_SUBPERIOD',
  sourceIdentity: 'MANUAL:flow-1', provenance: { sourceSystem: 'MANUAL', sourceId: 'flow-1' }
});

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
    events: [trustedContribution()], walletId: 'wallet-a',
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

test('cobertura UNKNOWN bloqueia métricas definitivas sem converter em zero', () => {
  const result = H.calculatePerformance({
    valuations: [
      { date: '2025-01-01', value: 100 },
      { date: '2025-12-31', value: 110 },
    ],
    priceCoverage: { status: 'UNKNOWN' },
  });
  for (const key of ['simpleReturn', 'twr', 'xirr', 'incomeReturn', 'capitalReturn', 'totalReturn']) {
    assert.equal(result.metrics[key].status, 'INSUFFICIENT_DATA');
    assert.equal(result.metrics[key].value, null);
    assert.equal(result.metrics[key].coverage, 'UNKNOWN');
  }
});

test('cobertura parcial também falha fechada para retorno', () => {
  const result = H.calculatePerformance({
    valuations: [
      { date: '2025-01-01', value: 100 },
      { date: '2025-12-31', value: 110 },
    ],
    priceCoverage: { status: 'PARTIAL_COVERAGE' },
  });
  assert.equal(result.metrics.simpleReturn.status, 'INSUFFICIENT_DATA');
  assert.equal(result.metrics.xirr.status, 'INSUFFICIENT_DATA');
  assert.equal(result.metrics.simpleReturn.value, null);
  assert.equal(result.metrics.xirr.value, null);
});

test('cobertura completa preserva métricas certificadas', () => {
  const result = H.calculatePerformance({
    valuations: [
      { date: '2025-01-01', value: 100 },
      { date: '2025-12-31', value: 110 },
    ],
    priceCoverage: { status: 'FULL_COVERAGE' },
  });
  assert.equal(result.metrics.simpleReturn.status, 'PASS');
  closeTo(result.metrics.simpleReturn.value, 0.1);
  assert.equal(result.metrics.twr.status, 'PASS');
  assert.equal(result.metrics.xirr.status, 'INSUFFICIENT_DATA');
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
    events: [trustedContribution('2025-06-30')], walletId: 'wallet-a',
  };
  assert.deepEqual(H.calculatePerformance(input), H.calculatePerformance(input));
});

test('V272 performance engine accepts only canonical trusted external flow evidence', () => {
  const trusted = {
    id: 'flow-a', walletId: 'wallet-a', date: '2025-06-30',
    classification: 'EXTERNAL_CONTRIBUTION', isExternalFlow: true, confidence: 'HIGH',
    amount: 100, investorSignedAmount: -100,
    sourceIdentity: 'MANUAL:flow-a', provenance: { sourceSystem: 'MANUAL', sourceId: 'flow-a' }
  };
  const make = events => H.calculatePerformance({
    valuations: [{ date: '2025-01-01', value: 100 }, { date: '2025-06-30', value: 200 }, { date: '2025-12-31', value: 220 }],
    events, walletId: 'wallet-a'
  });
  assert.equal(make([trusted]).externalFlows.length, 1);
  assert.equal(make([trusted]).externalFlows[0].signedAmount, -100);
  assert.equal(make([trusted]).externalFlows[0].portfolioSignedAmount, 100);
  assert.equal(make([{ ...trusted, walletId: undefined }]).externalFlows.length, 0);
  assert.equal(make([{ ...trusted, walletId: 'wallet-b' }]).externalFlows.length, 0);
  assert.equal(make([{ ...trusted, confidence: 'LOW' }]).metrics.twr.value, null);
  assert.equal(make([{ ...trusted, type: 'BUY', classification: undefined }]).metrics.xirr.value, null);
  const duplicate = make([trusted, { ...trusted, id: 'flow-a-copy' }]);
  assert.equal(duplicate.externalFlows.length, 0);
  assert.equal(duplicate.metrics.xirr.reason, 'UNTRUSTED_EXTERNAL_FLOW_EVIDENCE');
});

test('V272 ambiguous external-flow candidates block seemingly clean return metrics', () => {
  const result = H.calculatePerformance({
    valuations: [{ date: '2025-01-01', value: 100 }, { date: '2025-12-31', value: 110 }],
    events: [{ id: 'transfer-unknown', walletId: 'wallet-a', date: '2025-06-30', type: 'TRANSFER',
      classification: 'AMBIGUOUS', isExternalFlow: false, confidence: 'LOW',
      sourceIdentity: 'MANUAL:transfer-unknown', provenance: { sourceSystem: 'MANUAL', sourceId: 'transfer-unknown' } }],
    walletId: 'wallet-a', priceCoverage: { status: 'FULL_COVERAGE' }
  });
  assert.equal(result.metrics.simpleReturn.value, null);
  assert.equal(result.metrics.simpleReturn.reason, 'UNTRUSTED_EXTERNAL_FLOW_EVIDENCE');
  assert.equal(result.metrics.twr.value, null);
  assert.equal(result.metrics.twr.reason, 'UNTRUSTED_EXTERNAL_FLOW_EVIDENCE');
  assert.equal(result.dataReadiness.state, 'PARTIAL');
  assert.equal(result.dataReadiness.untrustedExternalFlowCount, 1);
});

test('V272 rejects a trusted flow without an observed valuation boundary and rejects date rollover', () => {
  const flow = {
    id: 'flow-a', walletId: 'wallet-a', date: '2025-04-15',
    classification: 'EXTERNAL_CONTRIBUTION', isExternalFlow: true, confidence: 'HIGH',
    amount: 100, investorSignedAmount: -100, sourceIdentity: 'MANUAL:flow-a',
    provenance: { sourceSystem: 'MANUAL', sourceId: 'flow-a' }, timing: 'END_OF_SUBPERIOD'
  };
  const result = H.calculatePerformance({
    valuations: [{ date: '2025-01-01', value: 100 }, { date: '2025-12-31', value: 220 }],
    events: [flow], walletId: 'wallet-a'
  });
  assert.equal(result.metrics.twr.value, null);
  assert.equal(result.metrics.twr.status, 'INSUFFICIENT_DATA');
  assert.equal(H.validDate('2025-02-30'), false);
  assert.equal(H.validDate('15/04/2025'), false);
});

test('V272 daily date alone does not prove TWR same-day flow timing', () => {
  const flow = { ...trustedContribution('2025-06-30'), timing: null };
  const result = H.calculatePerformance({
    valuations: [{ date: '2025-01-01', value: 100 }, { date: '2025-06-30', value: 200 }, { date: '2025-12-31', value: 220 }],
    events: [flow], walletId: 'wallet-a'
  });
  assert.equal(result.externalFlows.length, 1);
  assert.equal(result.metrics.twr.status, 'INSUFFICIENT_DATA');
  assert.equal(result.metrics.twr.reason, 'FLOW_BOUNDARY_VALUATION_MISSING');
});

test('V272 engine availability is distinct from data readiness and XIRR does not invent opening cash flow', () => {
  const noFlows = H.calculatePerformance({
    valuations: [{ date: '2025-01-01', value: 100 }, { date: '2026-01-01', value: 110 }],
    priceCoverage: { status: 'FULL_COVERAGE' }
  });
  assert.equal(noFlows.engineAvailability.xirr, true);
  assert.equal(noFlows.metrics.xirr.value, null);
  assert.equal(noFlows.metrics.xirr.availability, 'UNAVAILABLE');
  assert.equal(noFlows.dataReadiness.state, 'UNAVAILABLE');
  assert.deepEqual(noFlows.period, { start: '2025-01-01', end: '2026-01-01' });
  assert.equal(noFlows.asOf, '2026-01-01');
  assert.deepEqual(noFlows.evidence.externalFlowIds, []);

  const flow = { ...trustedContribution('2025-01-01'), amount: 100, investorSignedAmount: -100 };
  const withFlow = H.calculatePerformance({
    valuations: [{ date: '2025-01-01', value: 100 }, { date: '2026-01-01', value: 110 }],
    events: [flow], priceCoverage: { status: 'FULL_COVERAGE' }, walletId: 'wallet-a'
  });
  closeTo(withFlow.metrics.xirr.value, 0.1, 0.001);
  assert.equal(withFlow.metrics.xirr.availability, 'AVAILABLE');
  assert.equal(withFlow.evidence.externalFlowCount, 1);
  assert.notEqual(withFlow.dataReadiness.state, 'READY');
});

test('V272 rejects negative valuation inputs rather than calculating a plausible return', () => {
  const result = H.calculatePerformance({
    valuations: [{ date: '2025-01-01', value: -100 }, { date: '2025-12-31', value: 50 }],
    priceCoverage: { status: 'FULL_COVERAGE' }
  });
  assert.equal(result.metrics.simpleReturn.value, null);
  assert.equal(result.metrics.twr.value, null);
});
