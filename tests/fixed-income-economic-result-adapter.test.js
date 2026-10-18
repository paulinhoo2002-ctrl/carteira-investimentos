'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const engine = require('../fixed-income-economic-result.js');
const adapter = require('../fixed-income-economic-result-adapter.js');

const completeCoverage = {
  currentPosition: 'COMPLETE',
  costBasis: 'COMPLETE',
  contributions: 'COMPLETE',
  income: 'COMPLETE',
  taxes: 'COMPLETE',
  capitalReturns: 'COMPLETE',
  principal: 'COMPLETE',
  history: {
    status: 'COMPLETE',
    periodStart: '2024-06-01',
    periodEnd: '2026-10-18',
    openingPosition: 'NONE',
    allEventsRepresented: true,
    duplicatesResolved: true,
  },
};

function trendDiEvidence() {
  return {
    remainingCostBasis: 56417.11,
    contributions: [{ id: 'application-1', type: 'APPLICATION', amount: 65644.47, status: 'CONFIRMED', occurredOn: '2024-06-01' }],
    events: [
      { id: 'redemption-1', type: 'PARTIAL_REDEMPTION', amount: 9097, amountBasis: 'GROSS', status: 'RECEIVED', occurredOn: '2025-06-01' },
      { id: 'tax-1', type: 'IR', amount: 61.66, status: 'PAID', relatedEventId: 'redemption-1', occurredOn: '2025-06-02' },
    ],
    coverage: { ...completeCoverage, history: { ...completeCoverage.history } },
    returnPercentBasis: 'CUMULATIVE_CONTRIBUTIONS_SIMPLE',
  };
}

test('adapter fails closed when runtime coverage evidence is absent', () => {
  const result = adapter.calculate({
    assetId: 'synthetic-rf-1',
    currentMarketValue: 100,
    currentPositionKnown: true,
    evidence: null,
    engine: engine.calculateFixedIncomeEconomicResult,
  });
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.coverage.currentPosition, 'UNKNOWN');
  assert.equal(result.coverage.history, 'PARTIAL');
  assert.equal(result.totalEconomicResult, null);
  assert.equal(adapter.canExposeTotal(result), false);
});

test('explicit current value does not imply complete position coverage', () => {
  const evidence = trendDiEvidence();
  delete evidence.coverage.currentPosition;
  const result = adapter.calculate({
    currentMarketValue: 64018.06,
    currentPositionKnown: true,
    evidence,
    engine: engine.calculateFixedIncomeEconomicResult,
  });
  assert.equal(result.coverage.currentPosition, 'UNKNOWN');
  assert.equal(result.currentMarketValue, null);
  assert.equal(adapter.canExposeTotal(result), false);
});

test('missing current position remains unknown even if event coverage is declared', () => {
  const result = adapter.calculate({
    assetId: 'synthetic-rf-1',
    currentMarketValue: null,
    currentPositionKnown: false,
    evidence: trendDiEvidence(),
    engine: engine.calculateFixedIncomeEconomicResult,
  });
  assert.equal(result.coverage.currentPosition, 'UNKNOWN');
  assert.equal(result.currentMarketValue, null);
  assert.equal(adapter.canExposeTotal(result), false);
});

test('adapter maps only explicit complete Trend DI evidence into the engine', () => {
  const result = adapter.calculate({
    assetId: 'synthetic-trend-di', currentMarketValue: 64018.06, currentPositionKnown: true,
    evidence: trendDiEvidence(), engine: engine.calculateFixedIncomeEconomicResult,
  });
  assert.equal(result.status, 'DERIVED_WITH_COMPLETE_HISTORY');
  assert.equal(result.openPositionResult, 7600.95);
  assert.equal(result.totalEconomicResult, 7408.93);
  assert.equal(result.totalReturnPercent, 11.29);
  assert.equal(adapter.canExposeTotal(result), true);
});

test('Trend DI II may derive total without inventing open-position basis', () => {
  const result = adapter.calculate({
    assetId: 'synthetic-trend-di-ii', currentMarketValue: 28024.01, currentPositionKnown: true,
    evidence: {
      remainingCostBasis: null,
      contributions: [{ id: 'application-1', type: 'APPLICATION', amount: 73157.60, status: 'CONFIRMED', occurredOn: '2024-06-01' }],
      events: [
        { id: 'redemption-1', type: 'PARTIAL_REDEMPTION', amount: 49237.86, amountBasis: 'GROSS', status: 'RECEIVED', occurredOn: '2025-06-01' },
        { id: 'tax-1', type: 'IR', amount: 272.43, status: 'PAID', relatedEventId: 'redemption-1', occurredOn: '2025-06-02' },
      ],
      coverage: { ...completeCoverage, costBasis: 'UNKNOWN' },
      returnPercentBasis: 'CUMULATIVE_CONTRIBUTIONS_SIMPLE',
    }, engine: engine.calculateFixedIncomeEconomicResult,
  });
  assert.equal(result.status, 'DERIVED_WITH_COMPLETE_HISTORY');
  assert.equal(result.openPositionResult, null);
  assert.equal(result.totalEconomicResult, 3831.84);
  assert.equal(result.totalReturnPercent, 5.24);
  assert.equal(adapter.canExposeTotal(result), true);
});

test('partial MOVIDA and CRA evidence never exposes candidate total returns', () => {
  const partial = {
    ...completeCoverage,
    costBasis: 'PARTIAL',
    taxes: 'PARTIAL',
    history: { status: 'PARTIAL', periodStart: '2024-08-28', periodEnd: '2026-10-18', openingPosition: 'UNKNOWN', allEventsRepresented: false, duplicatesResolved: false },
  };
  for (const assetId of ['synthetic-movida', 'synthetic-cra']) {
    const result = adapter.calculate({
      assetId, currentMarketValue: 22000, currentPositionKnown: true,
      evidence: { ...trendDiEvidence(), coverage: partial }, engine: engine.calculateFixedIncomeEconomicResult,
    });
    assert.equal(result.status, 'PARTIAL');
    assert.equal(result.totalEconomicResult, null);
    assert.equal(adapter.canExposeTotal(result), false);
  }
});

test('only complete-history result with derived result coverage can expose totals', () => {
  const valid = engine.calculateFixedIncomeEconomicResult({
    currentMarketValue: 64018.06, ...trendDiEvidence(),
  });
  assert.equal(adapter.canExposeTotal(valid), true);
  assert.equal(adapter.canExposeTotal({ ...valid, coverage: { ...valid.coverage, totalResult: 'PARTIAL' } }), false);
  assert.equal(adapter.canExposeTotal({ ...valid, status: 'PARTIAL' }), false);
  assert.equal(adapter.canExposeReturnPercent({ ...valid, coverage: { ...valid.coverage, totalReturnPercent: 'UNKNOWN' } }), false);
});
