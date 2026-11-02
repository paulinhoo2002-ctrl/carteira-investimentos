/**
 * M1471 — Memory Profiler Tests
 */
const MP = require('../../analytics-memory-profiler.js');

console.log('=== M1471 Memory Profiler Tests ===\n');

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

// Test 1: Basic API existence
assert(typeof MP.start === 'function', 'start() function exists');
assert(typeof MP.stop === 'function', 'stop() function exists');
assert(typeof MP.takeSnapshot === 'function', 'takeSnapshot() function exists');
assert(typeof MP.getSnapshots === 'function', 'getSnapshots() function exists');
assert(typeof MP.getCurrentMemory === 'function', 'getCurrentMemory() function exists');
assert(typeof MP.setThreshold === 'function', 'setThreshold() function exists');
assert(typeof MP.onThresholdExceeded === 'function', 'onThresholdExceeded() function exists');
assert(typeof MP.onPotentialLeak === 'function', 'onPotentialLeak() function exists');
assert(typeof MP.gc === 'function', 'gc() function exists');
assert(typeof MP.generateReport === 'function', 'generateReport() function exists');

// Test 2: getCurrentMemory returns valid structure (or null if not available)
const current = MP.getCurrentMemory();
if (current) {
  assert(typeof current.usedJSHeapSize === 'number', 'current.usedJSHeapSize is number');
  assert(typeof current.totalJSHeapSize === 'number', 'current.totalJSHeapSize is number');
  assert(typeof current.jsHeapSizeLimit === 'number', 'current.jsHeapSizeLimit is number');
  assert(typeof current.usagePercent === 'number', 'current.usagePercent is number');
  assert(current.usedJSHeapSize > 0, 'usedJSHeapSize > 0');
  assert(current.totalJSHeapSize >= current.usedJSHeapSize, 'total >= used');
  assert(current.jsHeapSizeLimit > 0, 'limit > 0');
} else {
  console.log('⚠ SKIP: performance.memory not available in this environment');
}

// Test 3: takeSnapshot returns valid structure
const snapshot = MP.takeSnapshot();
if (snapshot) {
  assert(typeof snapshot.timestamp === 'number', 'snapshot.timestamp is number');
  assert(typeof snapshot.usedJSHeapSize === 'number', 'snapshot.usedJSHeapSize is number');
  assert(typeof snapshot.totalJSHeapSize === 'number', 'snapshot.totalJSHeapSize is number');
  assert(typeof snapshot.jsHeapSizeLimit === 'number', 'snapshot.jsHeapSizeLimit is number');
  assert(typeof snapshot.usagePercent === 'number', 'snapshot.usagePercent is number');
  assert(snapshot.timestamp > 0, 'timestamp > 0');
}

// Test 4: getSnapshots returns array
const snapshots = MP.getSnapshots();
assert(Array.isArray(snapshots), 'getSnapshots returns array');
if (snapshot) {
  assert(snapshots.length >= 1, 'at least one snapshot stored');
}

// Test 4b: clear snapshots for next tests
MP.snapshots = [];

// Test 5: setThreshold
MP.setThreshold(100 * 1024 * 1024); // 100MB
assert(MP.threshold === 100 * 1024 * 1024, 'threshold set to 100MB');

// Test 5b: reset threshold
MP.setThreshold(50 * 1024 * 1024);

// Test 6: onThresholdExceeded callback
let thresholdCalled = false;
MP.onThresholdExceeded((data) => { thresholdCalled = true; });
// Can't easily test without mocking performance.memory, so just verify registration
assert(typeof MP.observers.find(o => o.type === 'threshold_exceeded') !== 'undefined', 'threshold observer registered');

// Test 7: onPotentialLeak callback
let leakCalled = false;
MP.onPotentialLeak((data) => { leakCalled = true; });
assert(typeof MP.observers.find(o => o.type === 'potential_leak') !== 'undefined', 'leak observer registered');

// Test 8: gc function exists and doesn't throw
try {
  MP.gc();
  assert(true, 'gc() executes without throwing');
} catch (e) {
  assert(false, 'gc() threw: ' + e.message);
}

// Test 9: generateReport returns valid structure
const report = MP.generateReport();
assert(report !== null && typeof report === 'object', 'generateReport returns object');
assert(typeof report.current === 'object' || report.current === null, 'report.current is object or null');
assert(typeof report.trend === 'string', 'report.trend is string');
assert(['stable', 'growing', 'shrinking', 'insufficient_data'].includes(report.trend), 'trend is valid');
assert(typeof report.snapshotsCount === 'number', 'snapshotsCount is number');

// Test 10: start/stop
MP.start(100);
assert(MP.intervalId !== null, 'intervalId set after start');
MP.stop();
assert(MP.intervalId === null, 'intervalId cleared after stop');

// Test 11: observer cleanup
MP.observers = [];
MP.onThresholdExceeded(() => {});
MP.onPotentialLeak(() => {});
MP.observers = [];
assert(MP.observers.length === 0, 'observers can be cleared');

// Test 12: growth detection logic (mock test)
MP.snapshots = [
  { usedJSHeapSize: 10000000, timestamp: 1000 },
  { usedJSHeapSize: 11000000, timestamp: 2000 },
  { usedJSHeapSize: 12000000, timestamp: 3000 },
  { usedJSHeapSize: 13000000, timestamp: 4000 },
  { usedJSHeapSize: 14000000, timestamp: 5000 },
  { usedJSHeapSize: 15000000, timestamp: 6000 },
  { usedJSHeapSize: 16000000, timestamp: 7000 },
  { usedJSHeapSize: 17000000, timestamp: 8000 },
  { usedJSHeapSize: 18000000, timestamp: 9000 },
  { usedJSHeapSize: 19000000, timestamp: 10000 }
];
const report2 = MP.generateReport();
assert(report2.trend === 'growing', 'trend detected as growing for 90% growth');

// Test 13: shrinking detection
MP.snapshots = [
  { usedJSHeapSize: 20000000, timestamp: 1000 },
  { usedJSHeapSize: 19000000, timestamp: 2000 },
  { usedJSHeapSize: 18000000, timestamp: 3000 },
  { usedJSHeapSize: 17000000, timestamp: 4000 },
  { usedJSHeapSize: 16000000, timestamp: 5000 },
  { usedJSHeapSize: 15000000, timestamp: 6000 },
  { usedJSHeapSize: 14000000, timestamp: 7000 },
  { usedJSHeapSize: 13000000, timestamp: 8000 },
  { usedJSHeapSize: 12000000, timestamp: 9000 },
  { usedJSHeapSize: 11000000, timestamp: 10000 }
];
const report3 = MP.generateReport();
assert(report3.trend === 'shrinking', 'trend detected as shrinking for -45% growth');

// Test 14: stable detection
MP.snapshots = [
  { usedJSHeapSize: 15000000, timestamp: 1000 },
  { usedJSHeapSize: 15100000, timestamp: 2000 },
  { usedJSHeapSize: 15050000, timestamp: 3000 },
  { usedJSHeapSize: 15020000, timestamp: 4000 },
  { usedJSHeapSize: 15030000, timestamp: 5000 },
  { usedJSHeapSize: 15010000, timestamp: 6000 },
  { usedJSHeapSize: 15040000, timestamp: 7000 },
  { usedJSHeapSize: 15000000, timestamp: 8000 },
  { usedJSHeapSize: 15010000, timestamp: 9000 },
  { usedJSHeapSize: 15000000, timestamp: 10000 }
];
const report4 = MP.generateReport();
assert(report4.trend === 'stable', 'trend detected as stable for <1% growth');

// Cleanup
MP.stop();
MP.snapshots = [];
MP.observers = [];

// Summary
console.log('\n=== SUMMARY ===');
console.log('Passed:', passCount);
console.log('Failed:', failCount);
console.log('Total:', passCount + failCount);

if (failCount > 0) process.exit(1);