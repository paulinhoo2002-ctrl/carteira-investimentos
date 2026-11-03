/**
 * M1441 — Financial Insights Tests
 */
const FI = require('../../analytics-financial-insights.js');

console.log('=== M1441 Financial Insights Tests ===\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) { console.log('✓ PASS:', message); passCount++; }
  else { console.log('✗ FAIL:', message); failCount++; }
}

const assets = [
  { ticker: 'PETR4', qty: 100, current_price: 35.50, avg_price: 30, type: 'rv' },
  { ticker: 'VALE3', qty: 50, current_price: 60.00, avg_price: 55, type: 'rv' },
  { ticker: 'HGLG11', qty: 100, current_price: 180.00, avg_price: 170, type: 'fiis' },
  { ticker: 'TESOURO IPCA+ 2035', qty: 10, current_price: 4500, avg_price: 4300, type: 'rf' },
  { ticker: 'IVVB11', qty: 50, current_price: 220.00, avg_price: 200, type: 'international' },
  { ticker: 'BTC', qty: 0.1, current_price: 300000, avg_price: 250000, type: 'crypto' }
];

const proventos = [
  { ticker: 'PETR4', payment_date: '2023-01-15', value_gross: 500 },
  { ticker: 'PETR4', payment_date: '2023-01-15', value_gross: 500 },
  { ticker: 'HGLG11', payment_date: '2023-10-15', value_gross: 415 }
];

const goals = {
  patrimonio: { target: 500000, aporte: 2000 },
  proventos: { monthly: 2000 },
  allocation: { items: [{ type: 'rv', pct: 40 }, { type: 'rf', pct: 20 }, { type: 'fiis', pct: 15 }, { type: 'international', pct: 15 }, { type: 'crypto', pct: 10 }] }
};

const movements = [
  { ticker: 'PETR4', date: '2023-01-15', price: 35.50, qty: 100 },
  { ticker: 'VALE3', date: '2023-02-15', price: 0, qty: 50 }
];

// Test 1: analyzePortfolioHealth - basic
const health = FI.analyzePortfolioHealth(assets, proventos, goals);
assert(typeof health.score === 'number', 'Health returns score');
assert(health.score >= 0 && health.score <= 100, 'Score 0-100');
assert(['EXCELENTE','BOM','ATENÇÃO','CRÍTICO'].includes(health.healthLabel), 'Valid health label');
assert(health.alerts.length >= 0, 'Alerts array');
assert(health.opportunities.length >= 0, 'Opportunities array');
assert(health.metrics, 'Has metrics');

// Test 2: Concentration alert
const concentratedAssets = [
  { ticker: 'PETR4', qty: 1000, current_price: 100, type: 'rv' },
  { ticker: 'VALE3', qty: 10, current_price: 50, type: 'rv' }
];
const concHealth = FI.analyzePortfolioHealth(concentratedAssets, [], {});
assert(concHealth.alerts.some(a => a.type === 'CONCENTRATION' && a.severity === 'HIGH'), 'Concentration HIGH alert for >25%');

// Test 3: Diversification alert
const singleClass = [
  { ticker: 'PETR4', qty: 100, current_price: 50, type: 'rv' },
  { ticker: 'VALE3', qty: 50, current_price: 60, type: 'rv' }
];
const divHealth = FI.analyzePortfolioHealth(singleClass, [], {});
assert(divHealth.alerts.some(a => a.type === 'DIVERSIFICATION'), 'Diversification alert for single class');

// Test 4: Stale quotes
const staleAssets = [
  { ticker: 'PETR4', qty: 100, current_price: 0, type: 'rv' }
];
const staleHealth = FI.analyzePortfolioHealth(staleAssets, [], {});
assert(staleHealth.alerts.some(a => a.type === 'STALE_QUOTES'), 'Stale quotes alert');

// Test 5: No recent dividends
const oldProventos = [
  { ticker: 'PETR4', payment_date: '2020-01-15', value_gross: 100 }
];
const noDivHealth = FI.analyzePortfolioHealth(assets, oldProventos, {});
assert(noDivHealth.alerts.some(a => a.type === 'NO_RECENT_DIVIDENDS'), 'No recent dividends alert');

// Test 6: Missing goals
const noGoalsHealth = FI.analyzePortfolioHealth(assets, proventos, {});
assert(noGoalsHealth.opportunities.some(o => o.type === 'SET_GOAL'), 'Missing patrimonio goal opportunity');
assert(noGoalsHealth.opportunities.some(o => o.type === 'SET_INCOME_GOAL'), 'Missing income goal opportunity');
assert(noGoalsHealth.opportunities.some(o => o.type === 'SET_CONTRIBUTION'), 'Missing contribution opportunity');

// Test 7: Rebalance opportunity
const rebalanceHealth = FI.analyzePortfolioHealth(assets, proventos, goals);
assert(rebalanceHealth.opportunities.some(o => o.type === 'REBALANCE'), 'Rebalance opportunity detected');
assert(rebalanceHealth.metrics.allocationDeviation > 0, 'Allocation deviation metric > 0');

// Test 8: detectAnomalies - duplicate dividend
const anomalies = FI.detectAnomalies(assets, proventos, movements);
assert(anomalies.some(a => a.type === 'DUPLICATE_DIVIDEND'), 'Detects duplicate dividend');
assert(anomalies.some(a => a.ticker === 'PETR4'), 'Duplicate has correct ticker');

// Test 9: detectAnomalies - zero price movement
assert(anomalies.some(a => a.type === 'ZERO_PRICE_MOVEMENT'), 'Detects zero price movement');
assert(anomalies.some(a => a.ticker === 'VALE3'), 'Zero price has correct ticker');

// Test 10: detectAnomalies - negative quantity
const negAssets = [{ ticker: 'TEST', qty: -10, current_price: 10, type: 'rv' }];
const negAnomalies = FI.detectAnomalies(negAssets, [], []);
assert(negAnomalies.some(a => a.type === 'NEGATIVE_QUANTITY'), 'Detects negative quantity');

// Test 11: generateInsightsReport - full
const report = FI.generateInsightsReport(assets, proventos, goals, movements);
assert(report.timestamp, 'Report has timestamp');
assert(report.health, 'Report has health');
assert(report.anomalies, 'Report has anomalies');
assert(report.summary, 'Report has summary');
assert(report.disclaimer, 'Report has disclaimer');
assert(report.summary.totalAlerts === report.health.alerts.length, 'Summary totalAlerts matches');
assert(report.summary.highAlerts === report.health.alerts.filter(a => a.severity === 'HIGH').length, 'Summary highAlerts matches');
assert(report.summary.totalAnomalies === report.anomalies.length, 'Summary totalAnomalies matches');
assert(report.summary.highAnomalies === report.anomalies.filter(a => a.severity === 'HIGH').length, 'Summary highAnomalies matches');

// Test 12: Sorting by severity
const sortedAlerts = report.health.alerts;
const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
let sorted = true;
for (let i = 1; i < sortedAlerts.length; i++) {
  if (severityOrder[sortedAlerts[i-1].severity] > severityOrder[sortedAlerts[i].severity]) sorted = false;
}
assert(sorted, 'Alerts sorted by severity');

const sortedAnomalies = report.anomalies;
let sorted2 = true;
for (let i = 1; i < sortedAnomalies.length; i++) {
  if (severityOrder[sortedAnomalies[i-1].severity] > severityOrder[sortedAnomalies[i].severity]) sorted2 = false;
}
assert(sorted2, 'Anomalies sorted by severity');

// Test 13: Empty arrays
const emptyReport = FI.generateInsightsReport([], [], {}, []);
// Empty portfolio with no goals will have opportunities penalties
assert(emptyReport.health.score >= 0, 'Empty portfolio score >= 0');
assert(['EXCELENTE','BOM','ATENÇÃO','CRÍTICO'].includes(emptyReport.health.healthLabel), 'Empty has valid label');
assert(emptyReport.anomalies.length === 0, 'Empty anomalies = 0');

// Test 14: Negative quantity anomaly
const negQtyAssets = [{ ticker: 'TEST', qty: -5, current_price: 10, type: 'rv' }];
const negQtyAnomalies = FI.detectAnomalies(negQtyAssets, [], []);
assert(negQtyAnomalies.some(a => a.type === 'NEGATIVE_QUANTITY'), 'Negative qty detected');

// Summary
console.log('\n=== SUMMARY ===');
console.log('Passed:', passCount);
console.log('Failed:', failCount);
console.log('Total:', passCount + failCount);

if (failCount > 0) process.exit(1);