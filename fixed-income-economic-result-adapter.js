'use strict';

(function expose(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FixedIncomeEconomicResultAdapter = api;
}(typeof globalThis === 'object' ? globalThis : this, function createAdapter() {
  function calculate({ currentMarketValue, currentPositionKnown, currentPositionCoverage, evidence, engine } = {}) {
    if (typeof engine !== 'function') return null;
    const source = evidence && typeof evidence === 'object' && !Array.isArray(evidence) ? evidence : {};
    const coverage = source.coverage && typeof source.coverage === 'object' ? source.coverage : {};
    return engine({
      currentMarketValue: currentPositionKnown === true ? currentMarketValue : null,
      remainingCostBasis: source.remainingCostBasis,
      contributions: source.contributions,
      events: source.events,
      coverage: {
        currentPosition: currentPositionKnown === true
          ? currentPositionCoverage || coverage.currentPosition
          : 'UNKNOWN',
        costBasis: coverage.costBasis,
        contributions: coverage.contributions,
        income: coverage.income,
        taxes: coverage.taxes,
        capitalReturns: coverage.capitalReturns,
        principal: coverage.principal,
        history: coverage.history,
      },
      returnPercentBasis: source.returnPercentBasis,
    });
  }

  function canExposeTotal(result) {
    return result?.status === 'DERIVED_WITH_COMPLETE_HISTORY'
      && result.coverage?.totalResult === 'DERIVED'
      && Number.isFinite(result.totalEconomicResult);
  }

  function canExposeReturnPercent(result) {
    return canExposeTotal(result)
      && result.coverage?.totalReturnPercent === 'DERIVED'
      && Number.isFinite(result.totalReturnPercent);
  }

  return Object.freeze({ calculate, canExposeTotal, canExposeReturnPercent });
}));
