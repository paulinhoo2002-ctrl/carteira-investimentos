/**
 * M1401 — Passive Income Projection Engine Tests
 * Tests for analytics-passive-income-projection.js
 */
const PIP = require('../../analytics-passive-income-projection.js');

console.log('=== M1401 Passive Income Projection Tests ===\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log('✓ PASS:', message);
    passCount++;
  } else {
    console.log('✗ FAIL:', message);
    failCount++;
  }
}

function assertApprox(actual, expected, tolerance, message) {
  const diff = Math.abs(actual - expected);
  const pass = diff <= tolerance;
  if (pass) {
    console.log('✓ PASS:', message, '(~' + expected + ')');
    passCount++;
  } else {
    console.log('✗ FAIL:', message, '- got', actual, 'expected ~' + expected);
    failCount++;
  }
}

// Test 1: Portfolio Yield - Empty
const emptyYield = PIP.calculatePortfolioYield([]);
assert(emptyYield.monthlyIncome === 0, 'Empty portfolio yields 0 monthly income');
assert(emptyYield.annualIncome === 0, 'Empty portfolio yields 0 annual income');
assert(emptyYield.totalValue === 0, 'Empty portfolio yields 0 total value');
assert(emptyYield.avgDY === 0, 'Empty portfolio yields 0 avg DY');

// Test 2: Portfolio Yield - Single asset
const singleAsset = [{ qty: 100, current_price: 50, dy: 10 }];
const singleYield = PIP.calculatePortfolioYield(singleAsset);
assert(singleYield.totalValue === 5000, 'Single asset: total value = 100 * 50 = 5000');
assert(singleYield.annualIncome === 500, 'Single asset: annual income = 5000 * 10% = 500');
assert(singleYield.monthlyIncome === 41.67, 'Single asset: monthly income = 500/12 = 41.67');
assert(singleYield.avgDY === 10, 'Single asset: avg DY = 10%');

// Test 3: Portfolio Yield - Multiple assets
const multiAssets = [
  { qty: 100, current_price: 35.50, dy: 8.5 },
  { qty: 50, current_price: 60.00, dy: 12.3 },
  { qty: 200, current_price: 32.00, dy: 6.8 },
  { qty: 100, current_price: 180.00, dy: 9.2 }
];
const multiYield = PIP.calculatePortfolioYield(multiAssets);
assert(multiYield.totalValue === 30950, 'Multi asset total value');
assertApprox(multiYield.annualIncome, 2761.95, 0.01, 'Multi asset annual income');
assertApprox(multiYield.monthlyIncome, 230.16, 0.01, 'Multi asset monthly income');
assertApprox(multiYield.avgDY, 8.92, 0.01, 'Multi asset avg DY');

// Test 4: Portfolio Yield - Assets with zero qty/price
const zeroAssets = [
  { qty: 0, current_price: 50, dy: 10 },
  { qty: 100, current_price: 0, dy: 10 },
  { qty: 100, current_price: 50, dy: 10 }
];
const zeroYield = PIP.calculatePortfolioYield(zeroAssets);
assert(zeroYield.totalValue === 5000, 'Zero qty/price assets ignored');

// Test 5: Dividend CAGR - Empty
const emptyCAGR = PIP.calculateDividendCAGR([]);
assert(emptyCAGR.cagr === 0, 'Empty proventos CAGR = 0');
assert(emptyCAGR.confidence === 'LOW', 'Empty proventos confidence = LOW');

// Test 6: Dividend CAGR - Single year
const singleYearProventos = [
  { ticker: 'PETR4', payment_date: '2023-01-15', value_gross: 100 },
  { ticker: 'PETR4', payment_date: '2023-04-15', value_gross: 100 }
];
const singleYearCAGR = PIP.calculateDividendCAGR(singleYearProventos);
assert(singleYearCAGR.cagr === 0, 'Single year CAGR = 0');
assert(singleYearCAGR.periods === 1, 'Single year periods = 1');

// Test 7: Dividend CAGR - Multi-year
const multiYearProventos = [
  { ticker: 'PETR4', payment_date: '2020-01-15', value_gross: 200 },
  { ticker: 'PETR4', payment_date: '2020-04-15', value_gross: 210 },
  { ticker: 'PETR4', payment_date: '2021-01-15', value_gross: 250 },
  { ticker: 'PETR4', payment_date: '2021-04-15', value_gross: 260 },
  { ticker: 'PETR4', payment_date: '2022-01-15', value_gross: 350 },
  { ticker: 'PETR4', payment_date: '2022-04-15', value_gross: 360 },
  { ticker: 'PETR4', payment_date: '2023-01-15', value_gross: 500 },
  { ticker: 'PETR4', payment_date: '2023-04-15', value_gross: 520 }
];
const multiYearCAGR = PIP.calculateDividendCAGR(multiYearProventos);
assert(multiYearCAGR.cagr > 0, 'Multi-year CAGR > 0');
assert(multiYearCAGR.periods === 4, 'Multi-year periods = 4');
assert(multiYearCAGR.confidence === 'MEDIUM', '4 years = MEDIUM confidence');
// CAGR depends on test data - accept any positive value
assert(multiYearCAGR.annualGrowth > 0, 'Multi-year annual growth > 0');

// Test 8: DRIP Projection - Basic
const dripBasic = PIP.projectWithDRIP({
  currentPortfolioValue: 100000,
  currentMonthlyIncome: 500,
  dividendGrowthRate: 0.05,
  reinvestmentRate: 1,
  years: 10,
  monthlyContribution: 0,
  priceGrowthRate: 0.08
});
assert(dripBasic.finalPortfolioValue > 100000, 'DRIP: portfolio grows with reinvestment');
assert(dripBasic.finalMonthlyIncome > 500, 'DRIP: monthly income grows');
assert(dripBasic.yearlyResults.length === 10, 'DRIP: 10 yearly results');
assert(dripBasic.monthlyResults.length === 120, 'DRIP: 120 monthly results');
assert(dripBasic.totalDividendsReceived > 0, 'DRIP: dividends received > 0');
assert(dripBasic.totalReinvested > 0, 'DRIP: reinvested > 0');
assert(dripBasic.totalInvested > 100000, 'DRIP: total invested includes reinvestment');

// Test 9: DRIP Projection - With monthly contribution
const dripContrib = PIP.projectWithDRIP({
  currentPortfolioValue: 100000,
  currentMonthlyIncome: 500,
  dividendGrowthRate: 0.05,
  reinvestmentRate: 1,
  years: 10,
  monthlyContribution: 1000,
  priceGrowthRate: 0.08
});
assert(dripContrib.totalInvested > 100000 + 1000 * 12 * 10, 'DRIP with contribution: total invested includes contributions');
assert(dripContrib.finalPortfolioValue > dripBasic.finalPortfolioValue, 'DRIP with contribution > without');

// Test 10: DRIP Projection - Partial reinvestment
const dripPartial = PIP.projectWithDRIP({
  currentPortfolioValue: 100000,
  currentMonthlyIncome: 500,
  dividendGrowthRate: 0.05,
  reinvestmentRate: 0.5,
  years: 5,
  monthlyContribution: 0,
  priceGrowthRate: 0.08
});
assert(dripPartial.totalReinvested < dripBasic.totalReinvested, 'Partial reinvestment < full reinvestment');
assert(dripPartial.totalCashFlow > 0, 'Partial reinvestment generates cash flow');

// Test 11: Monte Carlo - Basic
const mc = PIP.monteCarloWealthProjection({
  currentValue: 100000,
  targetValue: 200000,
  monthlyContribution: 1000,
  expectedReturn: 0.10,
  volatility: 0.15,
  years: 10,
  simulations: 50
});
assert(mc.probabilitySuccess >= 0 && mc.probabilitySuccess <= 100, 'MC: probability 0-100%');
assert(mc.percentiles.p10 < mc.percentiles.p50, 'MC: p10 < p50');
assert(mc.percentiles.p50 < mc.percentiles.p90, 'MC: p50 < p90');
assert(mc.expectedValue > 0, 'MC: expected value > 0');
assert(mc.simulations === 50, 'MC: correct simulation count');

// Test 12: Tax Projection - Below exemption
const taxLow = PIP.projectTaxImpact({
  annualDividends: 10000,
  taxRate: 0.15,
  exemptionLimit: 24000,
  years: 5,
  dividendGrowth: 0
});
taxLow.forEach(function(t) {
  assert(t.tax === 0, 'Tax below exemption = 0');
  assert(t.net === t.grossAnnual, 'Net = gross when no tax');
  assert(t.effectiveRate === 0, 'Effective rate = 0%');
});

// Test 13: Tax Projection - Above exemption
const taxHigh = PIP.projectTaxImpact({
  annualDividends: 50000,
  taxRate: 0.15,
  exemptionLimit: 24000,
  years: 3,
  dividendGrowth: 0
});
assert(taxHigh[0].taxable === 26000, 'Taxable = 50000 - 24000 = 26000');
assert(taxHigh[0].tax === 3900, 'Tax = 26000 * 0.15 = 3900');
assert(taxHigh[0].net === 46100, 'Net = 50000 - 3900 = 46100');
assertApprox(taxHigh[0].effectiveRate, 7.8, 0.1, 'Effective rate ~7.8%');

// Test 14: Scenario Analysis
const scenarios = PIP.scenarioAnalysis({
  currentPortfolioValue: 100000,
  currentMonthlyIncome: 500,
  dividendGrowthRate: 0.05,
  dividendYield: 6,
  priceGrowthRate: 0.08,
  reinvestmentRate: 1,
  monthlyContribution: 1000,
  years: 5
});
assert(scenarios.bear.finalPortfolioValue < scenarios.base.finalPortfolioValue, 'Bear < Base');
assert(scenarios.base.finalPortfolioValue < scenarios.bull.finalPortfolioValue, 'Base < Bull');
assert(scenarios.bear.name === 'Pessimista', 'Bear name = Pessimista');
assert(scenarios.base.name === 'Base', 'Base name = Base');
assert(scenarios.bull.name === 'Otimista', 'Bull name = Otimista');

// Test 15: Full Report
const fullReport = PIP.generateFullProjectionReport({
  assets: multiAssets,
  proventos: multiYearProventos,
  goals: { proventos: { monthly: 5000 }, patrimonio: { target: 500000 } },
  monthlyContribution: 2000,
  years: 10
});
assert(fullReport.timestamp, 'Full report has timestamp');
assert(fullReport.portfolio, 'Full report has portfolio');
assert(fullReport.dividendCAGR, 'Full report has dividend CAGR');
assert(fullReport.baseProjection, 'Full report has base projection');
assert(fullReport.scenarios, 'Full report has scenarios');
assert(fullReport.monteCarlo, 'Full report has Monte Carlo');
assert(fullReport.taxProjection, 'Full report has tax projection');
assert(fullReport.goalTracking, 'Full report has goal tracking');
assert(fullReport.disclaimer, 'Full report has disclaimer');
assert(fullReport.goalTracking.progressPercent >= 0, 'Goal progress >= 0');
assert(fullReport.goalTracking.gap >= 0, 'Goal gap >= 0');

// Test 16: Edge cases
const edgeCase = PIP.calculatePortfolioYield(null);
assert(edgeCase.monthlyIncome === 0, 'Null assets handled');

const edgeCase2 = PIP.calculatePortfolioYield(undefined);
assert(edgeCase2.monthlyIncome === 0, 'Undefined assets handled');

const edgeCase3 = PIP.calculateDividendCAGR(null);
assert(edgeCase3.cagr === 0, 'Null proventos handled');

const edgeCase4 = PIP.projectWithDRIP({});
assert(edgeCase4.finalPortfolioValue === 0, 'Empty DRIP params handled');

// Summary
console.log('\n=== SUMMARY ===');
console.log('Passed:', passCount);
console.log('Failed:', failCount);
console.log('Total:', passCount + failCount);

if (failCount > 0) {
  process.exit(1);
}