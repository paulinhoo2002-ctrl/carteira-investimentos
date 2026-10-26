/**
 * M1411 — Dividend Evolution Tests
 */
const DE = require('../../analytics-dividend-evolution.js');

console.log('=== M1411 Dividend Evolution Tests ===\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) { console.log('✓ PASS:', message); passCount++; }
  else { console.log('✗ FAIL:', message); failCount++; }
}

function assertApprox(actual, expected, tolerance, message) {
  const diff = Math.abs(actual - expected);
  const pass = diff <= tolerance;
  if (pass) { console.log('✓ PASS:', message); passCount++; }
  else { console.log('✗ FAIL:', message, '- got', actual, 'expected ~' + expected); failCount++; }
}

// Test 1: Empty proventos
const empty = DE.generateDividendEvolutionReport([]);
assert(Object.keys(empty.timeline.byTicker).length === 0, 'Empty proventos: no tickers');
assert(Object.keys(empty.timeline.byMonth).length === 0, 'Empty proventos: no months');
assert(empty.portfolioGrowth.cagr === 0, 'Empty proventos: CAGR = 0');

// Test 2: Single provento
const single = DE.generateDividendEvolutionReport([
  { ticker: 'PETR4', payment_date: '2023-01-15', value_gross: 100 }
]);
assert(single.timeline.byTicker.PETR4.total === 100, 'Single provento: ticker total');
assert(single.portfolioGrowth.cagr === 0, 'Single year: CAGR = 0');

// Test 3: Multi-year proventos
const multi = DE.generateDividendEvolutionReport([
  { ticker: 'PETR4', payment_date: '2020-01-15', value_gross: 200 },
  { ticker: 'PETR4', payment_date: '2020-04-15', value_gross: 210 },
  { ticker: 'PETR4', payment_date: '2021-01-15', value_gross: 250 },
  { ticker: 'PETR4', payment_date: '2021-04-15', value_gross: 260 },
  { ticker: 'VALE3', payment_date: '2020-01-15', value_gross: 150 },
  { ticker: 'VALE3', payment_date: '2021-01-15', value_gross: 180 }
]);
assert(multi.timeline.byTicker.PETR4.total === 920, 'PETR4 total = 920');
assert(multi.timeline.byTicker.VALE3.total === 330, 'VALE3 total = 330');
assert(multi.timeline.totalByYear[2020] === 560, '2020 total = 560');
assert(multi.timeline.totalByYear[2021] === 690, '2021 total = 690');
assert(multi.portfolioGrowth.cagr > 0, 'Multi-year CAGR > 0');
assert(multi.portfolioGrowth.annualGrowth.length === 1, 'One annual growth period');

// Test 4: YoY Growth
assert(multi.yoyGrowth.PETR4['2021'] > 0, 'PETR4 YoY 2021 > 0');
assert(multi.yoyGrowth.VALE3['2021'] > 0, 'VALE3 YoY 2021 > 0');

// Test 5: Top Payers
assert(multi.topPayers.year[0].ticker === 'PETR4', 'Top payer year = PETR4');
assert(multi.topPayers.all[0].ticker === 'PETR4', 'Top payer all = PETR4');

// Test 6: Monthly Trend
assert(multi.monthlyTrend.length > 0, 'Monthly trend has data');
assert(multi.monthlyTrend[0].month === '2020-01', 'First month = 2020-01');

// Test 7: Seasonality
assert(multi.seasonality['01'], 'Seasonality has January');
assert(multi.seasonality['04'], 'Seasonality has April');

// Test 8: Full report structure
const full = DE.generateDividendEvolutionReport([
  { ticker: 'PETR4', payment_date: '2020-01-15', value_gross: 200 },
  { ticker: 'PETR4', payment_date: '2021-01-15', value_gross: 250 }
]);
assert(full.timestamp, 'Report has timestamp');
assert(full.timeline, 'Report has timeline');
assert(full.yoyGrowth, 'Report has YoY growth');
assert(full.portfolioGrowth, 'Report has portfolio growth');
assert(full.topPayers, 'Report has top payers');
assert(full.monthlyTrend, 'Report has monthly trend');
assert(full.seasonality, 'Report has seasonality');
assert(full.disclaimer, 'Report has disclaimer');

// Test 9: getTopDividendPayers
const timeline = DE.buildDividendTimeline([
  { ticker: 'PETR4', payment_date: '2023-01-15', value_gross: 500 },
  { ticker: 'VALE3', payment_date: '2023-01-15', value_gross: 300 },
  { ticker: 'PETR4', payment_date: '2023-04-15', value_gross: 520 },
  { ticker: 'VALE3', payment_date: '2023-04-15', value_gross: 310 }
]);
const topYear = DE.getTopDividendPayers(timeline, 'year', 2);
assert(topYear.length === 2, 'Top 2 year payers');
assert(topYear[0].ticker === 'PETR4', 'Top year payer = PETR4');

const topMonth = DE.getTopDividendPayers(timeline, 'month', 2);
assert(topMonth.length === 2, 'Top 2 month payers');

const topAll = DE.getTopDividendPayers(timeline, 'all', 2);
assert(topAll.length === 2, 'Top 2 all-time payers');

// Test 10: Edge cases
const invalidDates = DE.generateDividendEvolutionReport([
  { ticker: 'PETR4', payment_date: 'invalid', value_gross: 100 },
  { ticker: 'VALE3', payment_date: '2023-01-15', value_gross: 200 }
]);
assert(invalidDates.timeline.byTicker.VALE3.total === 200, 'Invalid date ignored');
assert(!invalidDates.timeline.byTicker.PETR4, 'Invalid date ticker excluded');

// Test 11: Missing ticker
const missingTicker = DE.generateDividendEvolutionReport([
  { payment_date: '2023-01-15', value_gross: 100 }
]);
assert(missingTicker.timeline.byTicker.UNKNOWN.total === 100, 'Missing ticker -> UNKNOWN');

// Summary
console.log('\n=== SUMMARY ===');
console.log('Passed:', passCount);
console.log('Failed:', failCount);
console.log('Total:', passCount + failCount);

if (failCount > 0) process.exit(1);