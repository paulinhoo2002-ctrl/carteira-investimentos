/**
 * M1431 — Wealth Goals Tracking Tests
 */
const WG = require('../../analytics-wealth-goals.js');

console.log('=== M1431 Wealth Goals Tests ===\n');

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
  { ticker: 'PETR4', qty: 100, current_price: 35.50 },
  { ticker: 'HGLG11', qty: 100, current_price: 180.00 }
];

// Test 1: calculateGoalProgress
const progress = WG.calculateGoalProgress(50000, 100000);
assert(progress.currentValue === 50000, 'Progress current value');
assert(progress.targetValue === 100000, 'Progress target value');
assertApprox(progress.progressPercent, 50, 0.1, 'Progress percent = 50%');
assert(progress.remaining === 50000, 'Progress remaining = 50000');
assert(progress.achieved === false, 'Not achieved at 50%');
assert(progress.status === 'PROGRESSING', 'Status = PROGRESSING');

// Test 2: Goal achieved
const achieved = WG.calculateGoalProgress(100000, 100000);
assert(achieved.achieved === true, 'Achieved at 100%');
assert(achieved.status === 'ACHIEVED', 'Status = ACHIEVED');

// Test 3: Goal 75%
const onTrack = WG.calculateGoalProgress(75000, 100000);
assert(onTrack.status === 'ON_TRACK', 'Status = ON_TRACK at 75%');

// Test 4: Goal 25%
const behind = WG.calculateGoalProgress(25000, 100000);
assert(behind.status === 'BEHIND', 'Status = BEHIND at 25%');

// Test 5: No target
const noTarget = WG.calculateGoalProgress(50000, 0);
assert(noTarget === null, 'No target returns null');

// Test 6: estimateTimeToGoal
const time = WG.estimateTimeToGoal(100000, 200000, 5000, 0.10);
assert(time.months > 0, 'Time estimate months > 0');
assert(time.years >= 0, 'Time estimate years >= 0');
assert(time.estimatedDate, 'Has estimated date');

// Test 7: Already achieved
const timeDone = WG.estimateTimeToGoal(200000, 100000, 5000, 0.10);
assert(timeDone.months === 0, 'Already achieved = 0 months');

// Test 8: No contribution
const timeNone = WG.estimateTimeToGoal(100000, 200000, 0, 0.10);
assert(timeNone === null, 'No contribution = null');

// Test 9: generateMilestones
const milestones = WG.generateMilestones(100000, 4);
assert(milestones.length === 4, '4 milestones');
assert(milestones[0].value === 20000, 'First milestone = 20%');
assert(milestones[3].value === 80000, 'Last milestone = 80%');
assert(milestones[0].percent === 20, 'First percent = 20%');

// Test 10: getMilestoneStatus
const status = WG.getMilestoneStatus(milestones, 50000);
assert(status[0].achieved === true, 'First milestone achieved');
assert(status[1].achieved === true, 'Second milestone also achieved at 50000');
assert(status[0].progress === 100, 'First milestone progress capped at 100%');
assert(status[2].achieved === false, 'Third milestone not achieved');
assertApprox(status[2].progress, 83, 1, 'Third milestone progress ~83%');

// Test 11: monteCarloGoalProbability
const mc = WG.monteCarloGoalProbability({
  currentValue: 100000,
  targetValue: 200000,
  monthlyContribution: 5000,
  expectedReturn: 0.10,
  volatility: 0.15,
  years: 10,
  simulations: 50
});
assert(mc.probability >= 0 && mc.probability <= 100, 'Probability 0-100%');
assert(mc.percentiles.p10 < mc.percentiles.p50, 'p10 < p50');
assert(mc.percentiles.p50 < mc.percentiles.p90, 'p50 < p90');
assert(mc.simulations === 50, 'Correct simulation count');

// Test 12: Already achieved Monte Carlo
const mcDone = WG.monteCarloGoalProbability({
  currentValue: 200000,
  targetValue: 100000,
  monthlyContribution: 5000
});
assert(mcDone.probability === 100, 'Already achieved = 100%');

// Test 13: generateWealthGoalReport
const report = WG.generateWealthGoalReport({
  assets,
  goals: { patrimonio: { target: 500000, aporte: 2000 } },
  monthlyContribution: 2000,
  expectedReturn: 0.10,
  volatility: 0.15,
  projectionYears: 10
});
assert(report.timestamp, 'Report has timestamp');
assert(report.currentValue > 0, 'Current value > 0');
assert(report.targetValue === 500000, 'Target value = 500000');
assert(report.progress, 'Has progress');
assert(report.timeEstimate, 'Has time estimate');
assert(report.milestones.length === 5, '5 milestones');
assert(report.monteCarlo, 'Has Monte Carlo');
assert(report.assumptions, 'Has assumptions');
assert(report.disclaimer, 'Has disclaimer');

// Test 14: Empty assets
const emptyReport = WG.generateWealthGoalReport({ assets: [], goals: {} });
assert(emptyReport.currentValue === 0, 'Empty assets = 0');
assert(emptyReport.targetValue === 0, 'Empty target = 0');

// Test 15: Assets without target
const noTargetReport = WG.generateWealthGoalReport({ assets, goals: {} });
assert(noTargetReport.targetValue === noTargetReport.currentValue * 2, 'Default target = 2x current');

// Summary
console.log('\n=== SUMMARY ===');
console.log('Passed:', passCount);
console.log('Failed:', failCount);
console.log('Total:', passCount + failCount);

if (failCount > 0) process.exit(1);