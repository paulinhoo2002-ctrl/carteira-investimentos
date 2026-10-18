'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { calculateFixedIncomeEconomicResult } = require('../fixed-income-economic-result');
const appShell = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('economic result engine is loaded as an internal runtime API without changing legacy formulas', () => {
  assert.equal((appShell.match(/<script src="fixed-income-economic-result\.js"><\/script>/g) || []).length, 1);
  assert.ok(appShell.indexOf('<script src="fixed-income-valuation.js"></script>') < appShell.indexOf('<script src="fixed-income-economic-result.js"></script>'));
  assert.ok(appShell.indexOf('<script src="fixed-income-economic-result.js"></script>') < appShell.indexOf('<script src="fixed-income-display.js"></script>'));
  const browserContext = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'fixed-income-economic-result.js'), 'utf8'), browserContext);
  assert.equal(typeof browserContext.FixedIncomeEconomicResultEngine.calculateFixedIncomeEconomicResult, 'function');
});

function completeCoverage(overrides = {}) {
  return {
    currentPosition: 'COMPLETE',
    costBasis: 'COMPLETE',
    contributions: 'COMPLETE',
    income: 'COMPLETE',
    taxes: 'COMPLETE',
    capitalReturns: 'COMPLETE',
    principal: 'COMPLETE',
    history: {
      status: 'COMPLETE',
      periodStart: '2023-01-01',
      periodEnd: '2026-10-18',
      openingPosition: 'NONE',
      allEventsRepresented: true,
      duplicatesResolved: true,
    },
    ...overrides,
  };
}

function completeInput(overrides = {}) {
  const input = {
    currentMarketValue: 100,
    remainingCostBasis: 100,
    contributions: [{ id: 'application-1', type: 'APPLICATION', amount: 100, status: 'CONFIRMED', occurredOn: '2024-06-01' }],
    events: [],
    coverage: completeCoverage(),
    ...overrides,
  };
  input.contributions = input.contributions.map((row) => ({ occurredOn: '2024-06-01', ...row }));
  input.events = input.events.map((row) => ({ occurredOn: '2024-06-01', ...row }));
  return input;
}

test('RF_UNKNOWN_EVENT_FAILS_CLOSED and does not become zero or income', () => {
  const result = calculateFixedIncomeEconomicResult(completeInput({
    events: [{ id: 'unknown-1', type: 'UNKNOWN', amount: 80, amountBasis: 'NET' }],
  }));

  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.incomeNet, null);
  assert.equal(result.totalEconomicResult, null);
  assert.ok(result.blockers.includes('UNKNOWN_EVENT'));
});

test('MISSING_TYPE_POSITIVE_VALUE_NOT_AUTOMATIC_INTEREST', () => {
  const result = calculateFixedIncomeEconomicResult(completeInput({
    events: [{ id: 'untagged-1', amount: 80, amountBasis: 'NET', description: 'juros' }],
  }));

  assert.equal(result.incomeNet, null);
  assert.equal(result.totalEconomicResult, null);
  assert.ok(result.blockers.includes('UNKNOWN_EVENT'));
});

test('RF_COUPON_COUNTS_AS_INCOME and tax is netted once', () => {
  const result = calculateFixedIncomeEconomicResult(completeInput({
    events: [
      { id: 'coupon-1', type: 'COUPON', amount: 100, amountBasis: 'GROSS', status: 'RECEIVED' },
      { id: 'tax-1', type: 'IR', amount: 10, status: 'PAID', relatedEventId: 'coupon-1' },
    ],
  }));

  assert.equal(result.incomeGross, 100);
  assert.equal(result.taxesPaid, 10);
  assert.equal(result.incomeNet, 90);
  assert.equal(result.totalEconomicResult, 90);
});

test('EXPECTED income is not treated as received cash', () => {
  const result = calculateFixedIncomeEconomicResult(completeInput({
    events: [{ id: 'expected-coupon', type: 'COUPON', amount: 10, amountBasis: 'NET', status: 'EXPECTED' }],
  }));

  assert.equal(result.incomeNet, null);
  assert.equal(result.totalEconomicResult, null);
  assert.ok(result.blockers.includes('EXPECTED_NOT_RECEIVED'));
});

test('RF_REDEMPTION_NOT_INCOME while net redemption cash contributes to total result', () => {
  const result = calculateFixedIncomeEconomicResult(completeInput({
    currentMarketValue: 0,
    remainingCostBasis: 0,
    contributions: [{ id: 'application-1', type: 'APPLICATION', amount: 100, status: 'CONFIRMED' }],
    events: [{ id: 'redemption-1', type: 'TOTAL_REDEMPTION', amount: 100, amountBasis: 'NET', status: 'RECEIVED' }],
  }));

  assert.equal(result.incomeGross, 0);
  assert.equal(result.incomeNet, 0);
  assert.equal(result.capitalReturnNet, 100);
  assert.equal(result.totalEconomicResult, 0);
});

test('RF_AMORTIZATION_NOT_INCOME and RF_PRINCIPAL_RETURN_NOT_PROFIT', () => {
  const result = calculateFixedIncomeEconomicResult(completeInput({
    currentMarketValue: 75,
    remainingCostBasis: 75,
    events: [{ id: 'amort-1', type: 'AMORTIZATION', amount: 25, amountBasis: 'NET', status: 'RECEIVED' }],
  }));

  assert.equal(result.incomeNet, 0);
  assert.equal(result.principalReturned, 25);
  assert.equal(result.totalEconomicResult, 0);
});

test('RF_TAX_NOT_NEGATIVE_RETURN: tax alone is not treated as a return event', () => {
  const result = calculateFixedIncomeEconomicResult(completeInput({
    events: [{ id: 'tax-1', type: 'IR', amount: 5, status: 'PAID', relatedEventId: 'missing-receipt' }],
  }));

  assert.equal(result.openPositionResult, 0);
  assert.equal(result.totalEconomicResult, null);
  assert.ok(result.blockers.includes('ORPHAN_TAX_EVENT'));
});

test('invalid tax linkage cannot leave event history coverage marked COMPLETE', () => {
  const result = calculateFixedIncomeEconomicResult(completeInput({
    events: [{ id: 'tax-1', type: 'IR', amount: 5, status: 'PAID', relatedEventId: 'missing-receipt' }],
  }));

  assert.equal(result.coverage.history, 'PARTIAL');
  assert.equal(result.coverage.taxes, 'PARTIAL');
  assert.equal(result.principalReturned, null);
});

test('tax greater than gross receipt cannot leave income history coverage marked COMPLETE', () => {
  const result = calculateFixedIncomeEconomicResult(completeInput({
    events: [
      { id: 'coupon-1', type: 'COUPON', amount: 4, amountBasis: 'GROSS', status: 'RECEIVED' },
      { id: 'tax-1', type: 'IR', amount: 5, status: 'PAID', relatedEventId: 'coupon-1' },
    ],
  }));

  assert.equal(result.coverage.history, 'PARTIAL');
  assert.equal(result.coverage.income, 'PARTIAL');
  assert.equal(result.coverage.taxes, 'PARTIAL');
  assert.equal(result.incomeNet, null);
  assert.ok(result.blockers.includes('TAX_EXCEEDS_GROSS_RECEIPT'));
});

test('RF_TAX_NOT_SUBTRACTED_TWICE for gross redemption with linked paid tax', () => {
  const result = calculateFixedIncomeEconomicResult(completeInput({
    currentMarketValue: 0,
    remainingCostBasis: 100,
    events: [
      { id: 'redemption-1', type: 'PARTIAL_REDEMPTION', amount: 100, amountBasis: 'GROSS', status: 'RECEIVED' },
      { id: 'tax-1', type: 'IOF', amount: 10, status: 'PAID', relatedEventId: 'redemption-1' },
    ],
  }));

  assert.equal(result.capitalReturnNet, 90);
  assert.equal(result.taxesPaid, 10);
  assert.equal(result.totalEconomicResult, -10);
});

test('RF_GROSS_NET_NOT_MIXED: one receipt cannot carry both gross and net amounts', () => {
  const result = calculateFixedIncomeEconomicResult(completeInput({
    events: [{ id: 'coupon-1', type: 'COUPON', amount: 100, amountBasis: 'GROSS', netAmount: 90 }],
  }));

  assert.equal(result.incomeNet, null);
  assert.equal(result.totalEconomicResult, null);
  assert.ok(result.blockers.includes('AMBIGUOUS_GROSS_NET'));
});

test('RF_OPEN_POSITION_RESULT_SEPARATE from income and capital-return cash', () => {
  const result = calculateFixedIncomeEconomicResult(completeInput({
    currentMarketValue: 110,
    remainingCostBasis: 100,
    events: [{ id: 'coupon-1', type: 'INTEREST', amount: 5, amountBasis: 'NET', status: 'RECEIVED' }],
  }));

  assert.equal(result.openPositionResult, 10);
  assert.equal(result.incomeNet, 5);
  assert.equal(result.totalEconomicResult, 15);
});

test('partial market-value coverage does not produce a complete open-position result', () => {
  const result = calculateFixedIncomeEconomicResult(completeInput({
    currentMarketValue: 90,
    coverage: completeCoverage({ currentPosition: 'PARTIAL' }),
  }));

  assert.equal(result.currentMarketValue, 90);
  assert.equal(result.openPositionResult, null);
  assert.equal(result.totalEconomicResult, null);
});

test('invalid period dates cannot certify complete history', () => {
  const result = calculateFixedIncomeEconomicResult(completeInput({
    coverage: completeCoverage({
      history: { status: 'COMPLETE', periodStart: '2026-02-30', periodEnd: '2026-10-18', openingPosition: 'NONE', allEventsRepresented: true },
    }),
  }));

  assert.equal(result.coverage.history, 'PARTIAL');
  assert.equal(result.totalEconomicResult, null);
  assert.ok(result.blockers.includes('HISTORY_NOT_COMPLETE'));
});

test('RF_TOTAL_RESULT_REQUIRES_HISTORY_COVERAGE', () => {
  const result = calculateFixedIncomeEconomicResult(completeInput({
    coverage: completeCoverage({
      history: { status: 'PARTIAL', periodStart: '2023-01-01', periodEnd: '2026-10-18', openingPosition: 'NONE', allEventsRepresented: false },
    }),
  }));

  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.totalEconomicResult, null);
  assert.equal(result.coverage.totalResult, 'PARTIAL');
  assert.equal(result.coverage.totalReturnPercent, 'PARTIAL');
  assert.ok(result.blockers.includes('HISTORY_NOT_COMPLETE'));
});

test('duplicate contribution IDs prevent a complete total from double counting', () => {
  const result = calculateFixedIncomeEconomicResult(completeInput({
    contributions: [
      { id: 'application-1', type: 'APPLICATION', amount: 100, status: 'CONFIRMED' },
      { id: 'application-1', type: 'APPLICATION', amount: 100, status: 'CONFIRMED' },
    ],
  }));

  assert.equal(result.totalEconomicResult, null);
  assert.ok(result.blockers.includes('DUPLICATE_EVENT_ID'));
});

test('complete history must attest duplicate review and a known opening position', () => {
  const result = calculateFixedIncomeEconomicResult(completeInput({
    coverage: completeCoverage({
      history: { status: 'COMPLETE', periodStart: '2023-01-01', periodEnd: '2026-10-18', openingPosition: 'NONE', allEventsRepresented: true, duplicatesResolved: false },
    }),
  }));

  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.totalEconomicResult, null);
  assert.ok(result.blockers.includes('HISTORY_NOT_COMPLETE'));
});

test('events and contributions outside the declared history window block the result', () => {
  const badContribution = calculateFixedIncomeEconomicResult(completeInput({
    contributions: [{ id: 'application-1', type: 'APPLICATION', amount: 100, status: 'CONFIRMED', occurredOn: '2022-12-31' }],
  }));
  const badReceipt = calculateFixedIncomeEconomicResult(completeInput({
    events: [{ id: 'coupon-1', type: 'COUPON', amount: 10, amountBasis: 'NET', status: 'RECEIVED', occurredOn: '2027-01-01' }],
  }));
  const missingDate = calculateFixedIncomeEconomicResult(completeInput({
    events: [{ id: 'coupon-1', type: 'COUPON', amount: 10, amountBasis: 'NET', status: 'RECEIVED', occurredOn: undefined }],
  }));

  assert.equal(badContribution.totalEconomicResult, null);
  assert.ok(badContribution.blockers.includes('CONTRIBUTION_OUTSIDE_HISTORY'));
  assert.equal(badReceipt.totalEconomicResult, null);
  assert.ok(badReceipt.blockers.includes('EVENT_OUTSIDE_HISTORY'));
  assert.equal(missingDate.totalEconomicResult, null);
  assert.ok(missingDate.blockers.includes('EVENT_DATE_MISSING'));
});

test('positive current position without confirmed contributed capital is not a return', () => {
  const result = calculateFixedIncomeEconomicResult(completeInput({
    currentMarketValue: 100,
    remainingCostBasis: null,
    contributions: [],
    coverage: completeCoverage({ costBasis: 'UNKNOWN' }),
  }));

  assert.equal(result.totalEconomicResult, null);
  assert.ok(result.blockers.includes('UNEXPLAINED_CURRENT_POSITION'));
});

test('complete history with no capital origin cannot certify positive cash receipts', () => {
  const result = calculateFixedIncomeEconomicResult(completeInput({
    currentMarketValue: 0,
    remainingCostBasis: 0,
    contributions: [],
    events: [{ id: 'coupon-1', type: 'COUPON', amount: 10, amountBasis: 'NET', status: 'RECEIVED' }],
  }));

  assert.equal(result.totalEconomicResult, null);
  assert.equal(result.status, 'PARTIAL');
  assert.ok(result.blockers.includes('UNEXPLAINED_CURRENT_POSITION'));
});

test('Trend DI economic result is derived only with complete synthetic history', () => {
  const result = calculateFixedIncomeEconomicResult({
    currentMarketValue: 64018.06,
    remainingCostBasis: 56417.11,
    contributions: [{ id: 'application-1', type: 'APPLICATION', amount: 65644.47, status: 'CONFIRMED', occurredOn: '2024-06-01' }],
    events: [
      { id: 'redemption-1', type: 'PARTIAL_REDEMPTION', amount: 9097, amountBasis: 'GROSS', status: 'RECEIVED', occurredOn: '2025-06-01' },
      { id: 'tax-1', type: 'IR', amount: 61.66, status: 'PAID', relatedEventId: 'redemption-1', occurredOn: '2025-06-02' },
    ],
    coverage: completeCoverage(),
    returnPercentBasis: 'CUMULATIVE_CONTRIBUTIONS_SIMPLE',
  });

  assert.equal(result.status, 'DERIVED_WITH_COMPLETE_HISTORY');
  assert.equal(result.openPositionResult, 7600.95);
  assert.equal(result.incomeNet, 0);
  assert.equal(result.capitalReturnNet, 9035.34);
  assert.equal(result.principalReturned, 9227.36);
  assert.equal(result.totalEconomicResult, 7408.93);
  assert.equal(result.totalReturnPercent, 11.29);
});

test('Trend DI II economic result can be derived without inventing a cost basis', () => {
  const result = calculateFixedIncomeEconomicResult({
    currentMarketValue: 28024.01,
    remainingCostBasis: null,
    contributions: [{ id: 'application-1', type: 'APPLICATION', amount: 73157.6, status: 'CONFIRMED', occurredOn: '2024-06-01' }],
    events: [
      { id: 'redemption-1', type: 'PARTIAL_REDEMPTION', amount: 49237.86, amountBasis: 'GROSS', status: 'RECEIVED', occurredOn: '2025-06-01' },
      { id: 'tax-1', type: 'IR', amount: 272.43, status: 'PAID', relatedEventId: 'redemption-1', occurredOn: '2025-06-02' },
    ],
    coverage: completeCoverage({ costBasis: 'UNKNOWN' }),
    returnPercentBasis: 'CUMULATIVE_CONTRIBUTIONS_SIMPLE',
  });

  assert.equal(result.status, 'DERIVED_WITH_COMPLETE_HISTORY');
  assert.equal(result.remainingCostBasis, null);
  assert.equal(result.openPositionResult, null);
  assert.equal(result.principalReturned, null);
  assert.equal(result.capitalReturnNet, 48965.43);
  assert.equal(result.totalEconomicResult, 3831.84);
  assert.equal(result.totalReturnPercent, 5.24);
});

test('MOVIDA remains PARTIAL despite arithmetic closeness', () => {
  const result = calculateFixedIncomeEconomicResult(completeInput({
    currentMarketValue: 22510.87,
    remainingCostBasis: 21174.14,
    contributions: [{ id: 'purchase-1', type: 'PURCHASE', amount: 21174.14, status: 'CONFIRMED' }],
    events: [{ id: 'coupon-1', type: 'COUPON', amount: 3581.55, amountBasis: 'GROSS', status: 'RECEIVED' }],
    coverage: completeCoverage({
      costBasis: 'PARTIAL',
      taxes: 'PARTIAL',
      history: { status: 'PARTIAL', periodStart: '2024-08-28', periodEnd: '2026-10-18', openingPosition: 'UNKNOWN', allEventsRepresented: false },
    }),
  }));

  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.totalEconomicResult, null);
  assert.equal(result.coverage.totalResult, 'PARTIAL');
  assert.equal(result.coverage.totalReturnPercent, 'PARTIAL');
});

test('CRA remains PARTIAL when tax was not recorded rather than proven zero', () => {
  const result = calculateFixedIncomeEconomicResult(completeInput({
    currentMarketValue: 18400.31,
    remainingCostBasis: null,
    contributions: [{ id: 'purchase-1', type: 'PURCHASE', amount: 18586.46, status: 'CONFIRMED' }],
    events: [{ id: 'coupon-1', type: 'COUPON', amount: 2487.8, amountBasis: 'GROSS', status: 'RECEIVED' }],
    coverage: completeCoverage({
      costBasis: 'UNKNOWN', taxes: 'UNKNOWN', principal: 'UNKNOWN',
      history: { status: 'PARTIAL', periodStart: '2024-08-28', periodEnd: '2026-10-18', openingPosition: 'UNKNOWN', allEventsRepresented: false },
    }),
  }));

  assert.equal(result.taxesPaid, null);
  assert.equal(result.incomeNet, null);
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.totalEconomicResult, null);
});

test('UNKNOWN_NOT_ZERO and PARTIAL_NOT_COMPLETE for missing and partial components', () => {
  const missingMarket = calculateFixedIncomeEconomicResult(completeInput({
    currentMarketValue: null,
    coverage: completeCoverage({ currentPosition: 'UNKNOWN' }),
  }));
  const noKnownComponents = calculateFixedIncomeEconomicResult({});
  const partialIncome = calculateFixedIncomeEconomicResult(completeInput({
    coverage: completeCoverage({ income: 'PARTIAL' }),
  }));

  assert.equal(missingMarket.currentMarketValue, null);
  assert.equal(missingMarket.totalEconomicResult, null);
  assert.equal(missingMarket.coverage.totalResult, 'PARTIAL');
  assert.equal(partialIncome.incomeNet, null);
  assert.equal(partialIncome.status, 'PARTIAL');
  assert.equal(partialIncome.totalEconomicResult, null);
  assert.equal(partialIncome.coverage.totalResult, 'PARTIAL');
  assert.equal(noKnownComponents.coverage.totalResult, 'UNKNOWN');
});

test('malformed top-level input fails closed without throwing', () => {
  const result = calculateFixedIncomeEconomicResult(null);

  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.currentMarketValue, null);
  assert.equal(result.totalEconomicResult, null);
});

test('return percentage requires an explicit denominator contract and is not annualized', () => {
  const unspecified = calculateFixedIncomeEconomicResult(completeInput());
  const explicit = calculateFixedIncomeEconomicResult(completeInput({
    events: [{ id: 'coupon-1', type: 'COUPON', amount: 10, amountBasis: 'NET', status: 'RECEIVED' }],
    returnPercentBasis: 'CUMULATIVE_CONTRIBUTIONS_SIMPLE',
  }));

  assert.equal(unspecified.totalReturnPercent, null);
  assert.ok(unspecified.blockers.includes('RETURN_PERCENT_BASIS_UNSPECIFIED'));
  assert.equal(explicit.totalReturnPercent, 10);
  assert.equal(explicit.returnPercentMethod, 'CUMULATIVE_CONTRIBUTIONS_SIMPLE');
});
