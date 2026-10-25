/**
 * M1421 — Asset Class Comparison Tests
 */
const ACC = require('../../analytics-asset-class-comparison.js');

console.log('=== M1421 Asset Class Comparison Tests ===\n');

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

const assets = [
  { ticker: 'PETR4', qty: 100, current_price: 35.50, avg_price: 30, dy: 8.5, type: 'rv' },
  { ticker: 'VALE3', qty: 50, current_price: 60.00, avg_price: 55, dy: 12.3, type: 'rv' },
  { ticker: 'HGLG11', qty: 100, current_price: 180.00, avg_price: 170, dy: 9.2, type: 'fiis' },
  { ticker: 'TESOURO IPCA+ 2035', qty: 10, current_price: 4500, avg_price: 4300, dy: 5.2, type: 'rf' },
  { ticker: 'IVVB11', qty: 50, current_price: 220.00, avg_price: 200, dy: 1.2, type: 'international' }
];

// Test 1: classifyAsset
assert(ACC.classifyAsset({ticker: 'PETR4', type: 'rv'}) === 'rv', 'Explicit type rv');
assert(ACC.classifyAsset({ticker: 'HGLG11'}) === 'fiis', 'FII by ticker ending 11');
assert(ACC.classifyAsset({ticker: 'IVVB11'}) === 'international', 'International ETF (heuristic)');
assert(ACC.classifyAsset({ticker: 'BTC'}) === 'crypto', 'Crypto ticker');
assert(ACC.classifyAsset({ticker: 'CDB', type: 'rf'}) === 'rf', 'Explicit RF');

// Test 2: aggregateByClass
const byClass = ACC.aggregateByClass(assets);
assert(byClass.rv.count === 2, 'RV count = 2');
assert(byClass.fiis.count === 1, 'FIIs count = 1');
assert(byClass.rf.count === 1, 'RF count = 1');
assert(byClass.international.count === 1, 'International count = 1');
assert(byClass.crypto.count === 0, 'Crypto count = 0');

// Test 3: calculateAllocation
const total = ACC.calculateAllocation(byClass);
assert(total > 0, 'Total portfolio > 0');
const sumAlloc = Object.values(byClass).reduce((s, c) => s + c.allocation, 0);
assertApprox(sumAlloc, 100, 0.1, 'Allocations sum to 100%');

// Test 4: generateComparisonReport
const report = ACC.generateComparisonReport(assets, { allocation: { rf: 20, rv: 40, fiis: 15, international: 15, crypto: 10 } });
assert(report.timestamp, 'Report has timestamp');
assert(report.totalPortfolio > 0, 'Total portfolio > 0');
assert(report.classes.length === 4, '4 classes with assets');
assert(report.summary.totalClasses === 4, 'Summary totalClasses = 4');
// crypto has 0 assets, so 4 deviations (rf, rv, fiis, international)
assert(report.deviations.length === 4, '4 deviations (crypto excluded)');
assert(report.disclaimer, 'Has disclaimer');

// Test 5: getRebalanceActions
const actions = ACC.getRebalanceActions(report);
assert(actions.length > 0, 'Has rebalance actions');
assert(actions[0].action === 'COMPRAR' || actions[0].action === 'VENDER', 'Action is valid');
assert(actions[0].amount > 0, 'Amount > 0');
assert(['ALTA', 'MÉDIA', 'BAIXA'].includes(actions[0].priority), 'Priority valid');

// Test 6: Risk score
assert(report.riskScore >= 0, 'Risk score >= 0');
assert(report.riskScore <= 10, 'Risk score <= 10');

// Test 7: Class properties
for (const c of report.classes) {
  assert(c.name, 'Class has name');
  assert(c.color, 'Class has color');
  assert(c.icon, 'Class has icon');
  assert(typeof c.totalValue === 'number', 'Class has totalValue');
  assert(typeof c.allocation === 'number', 'Class has allocation');
  assert(typeof c.gainLoss === 'number', 'Class has gainLoss');
  assert(typeof c.yieldOnCost === 'number', 'Class has yieldOnCost');
}

// Test 8: Empty assets
const emptyReport = ACC.generateComparisonReport([]);
assert(emptyReport.totalPortfolio === 0, 'Empty portfolio = 0');
assert(emptyReport.classes.length === 0, 'Empty classes = 0');

// Test 9: Assets with zero qty/price
const zeroAssets = [
  { ticker: 'PETR4', qty: 0, current_price: 35.50, dy: 8.5 },
  { ticker: 'VALE3', qty: 100, current_price: 0, dy: 12.3 },
  { ticker: 'HGLG11', qty: 100, current_price: 180.00, dy: 9.2 }
];
const zeroReport = ACC.generateComparisonReport(zeroAssets);
assert(zeroReport.classes.length === 1, 'Only valid assets counted');
assert(zeroReport.classes[0].name === 'FIIs', 'Only FIIs valid');

// Test 10: ASSET_CLASSES constant
assert(ACC.ASSET_CLASSES.rf.name === 'Renda Fixa', 'RF name');
assert(ACC.ASSET_CLASSES.fiis.color === '#8b5cf6', 'FIIs color');
assert(ACC.ASSET_CLASSES.crypto.icon === '₿', 'Crypto icon');

// Summary
console.log('\n=== SUMMARY ===');
console.log('Passed:', passCount);
console.log('Failed:', failCount);
console.log('Total:', passCount + failCount);

if (failCount > 0) process.exit(1);