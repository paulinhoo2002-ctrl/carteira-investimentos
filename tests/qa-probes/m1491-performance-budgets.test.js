/**
 * M1491 — Performance Budgets Tests
 */
const PB = require('../../analytics-performance-budgets.js');

console.log('=== M1491 Performance Budgets Tests ===\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) { console.log('✓ PASS:', message); passCount++; }
  else { console.log('✗ FAIL:', message); failCount++; }
}

// Test 1: Default budgets
const defaults = PB.defaults;
assert(defaults.lighthouse.performance === 90, 'Default Lighthouse performance = 90');
assert(defaults.lighthouse.accessibility === 95, 'Default Lighthouse accessibility = 95');
assert(defaults.metrics.LCP === 2500, 'Default LCP = 2500ms');
assert(defaults.metrics.FID === 100, 'Default FID = 100ms');
assert(defaults.metrics.CLS === 0.1, 'Default CLS = 0.1');
assert(defaults.metrics.maxTotalBundle === 500 * 1024, 'Default maxTotalBundle = 500KB');
assert(defaults.metrics.maxInitialJS === 170 * 1024, 'Default maxInitialJS = 170KB');
assert(defaults.metrics.maxCSS === 50 * 1024, 'Default maxCSS = 50KB');
assert(defaults.metrics.maxRequests === 50, 'Default maxRequests = 50');
assert(defaults.metrics.maxThirdPartyRequests === 10, 'Default maxThirdPartyRequests = 10');
assert(defaults.metrics.maxJSHeapSize === 50 * 1024 * 1024, 'Default maxJSHeapSize = 50MB');
assert(defaults.metrics.maxDOMContentLoaded === 2000, 'Default maxDOMContentLoaded = 2000ms');
assert(defaults.metrics.maxLoad === 4000, 'Default maxLoad = 4000ms');

// Test 2: getBudgets with custom config
const customBudgets = PB.getBudgets({
  lighthouse: { performance: 95 },
  metrics: { LCP: 2000, maxTotalBundle: 300 * 1024 }
});
assert(customBudgets.lighthouse.performance === 95, 'Custom Lighthouse performance = 95');
assert(customBudgets.metrics.LCP === 2000, 'Custom LCP = 2000ms');
assert(customBudgets.metrics.maxTotalBundle === 300 * 1024, 'Custom maxTotalBundle = 300KB');
// Unchanged defaults preserved
assert(customBudgets.lighthouse.accessibility === 95, 'Unchanged accessibility = 95');
assert(customBudgets.metrics.maxInitialJS === 170 * 1024, 'Unchanged maxInitialJS = 170KB');

// Test 3: checkBudgets - all pass
const passingMetrics = {
  lighthouse: { performance: 95, accessibility: 98, 'best-practices': 92, seo: 95, pwa: 85 },
  LCP: 2000, FID: 50, CLS: 0.05, FCP: 1500, TTFB: 400, TBT: 100, TTI: 3000,
  totalBundle: 400 * 1024, initialJS: 150 * 1024, cssSize: 40 * 1024,
  fontSize: 80 * 1024, imageSize: 400 * 1024,
  requestCount: 40, thirdPartyRequests: 5,
  jsHeapSize: 30 * 1024 * 1024,
  domContentLoaded: 1500, load: 3000
};

const passResult = PB.checkBudgets(passingMetrics);
assert(passResult.passed === true, 'All budgets pass');
assert(passResult.violations.length === 0, 'No violations');
assert(passResult.warnings.length === 0, 'No warnings');
assert(passResult.summary.passed > 0, 'Passed count > 0');
assert(passResult.summary.failed === 0, 'Failed count = 0');
assert(passResult.summary.warnings === 0, 'Warnings count = 0');

// Test 4: checkBudgets - Lighthouse violation
const failLighthouse = {
  lighthouse: { performance: 85, accessibility: 98, 'best-practices': 92, seo: 95, pwa: 85 },
  LCP: 2000, FID: 50, CLS: 0.05
};
const failLH = PB.checkBudgets(failLighthouse);
assert(failLH.passed === false, 'Lighthouse failure marks passed=false');
assert(failLH.violations.length === 1, 'One violation for performance');
assert(failLH.violations[0].metric === 'performance', 'Violation metric = performance');
assert(failLH.violations[0].severity === 'error', 'Severity = error');

// Test 5: Core Web Vitals violations
const failCWV = {
  lighthouse: { performance: 95, accessibility: 98, 'best-practices': 92, seo: 95, pwa: 85 },
  LCP: 3000,  // exceeds 2500
  FID: 150,   // exceeds 100
  CLS: 0.15,  // exceeds 0.1
  FCP: 1500, TTFB: 400, TBT: 100, TTI: 3000
};
const failCWVResult = PB.checkBudgets(failCWV);
assert(failCWVResult.passed === false, 'CWV failures mark passed=false');
assert(failCWVResult.violations.length >= 3, 'At least 3 CWV violations');
const lcpViolation = failCWVResult.violations.find(v => v.metric === 'LCP');
assert(lcpViolation !== undefined, 'LCP violation exists');
assert(lcpViolation.severity === 'error', 'LCP severity = error');
const clsViolation = failCWVResult.violations.find(v => v.metric === 'CLS');
assert(clsViolation !== undefined, 'CLS violation exists');
assert(clsViolation.severity === 'error', 'CLS severity = error');
const fidViolation = failCWVResult.violations.find(v => v.metric === 'FID');
assert(fidViolation !== undefined, 'FID violation exists');
assert(fidViolation.severity === 'warning', 'FID severity = warning');

// Test 6: Bundle size violations
const failBundle = {
  lighthouse: { performance: 95, accessibility: 98, 'best-practices': 92, seo: 95, pwa: 85 },
  totalBundle: 600 * 1024, // exceeds 500KB
  initialJS: 200 * 1024,  // exceeds 170KB
  cssSize: 60 * 1024,     // exceeds 50KB
  fontSize: 120 * 1024,   // exceeds 100KB
  imageSize: 600 * 1024   // exceeds 500KB
};
const failBundleResult = PB.checkBudgets(failBundle);
assert(failBundleResult.passed === false, 'Bundle failures mark passed=false');
assert(failBundleResult.violations.length >= 5, 'At least 5 bundle violations');
assert(failBundleResult.violations.every(v => v.severity === 'warning'), 'Bundle violations are warnings');

// Test 6b: Resource count warnings
const failResources = {
  lighthouse: { performance: 95, accessibility: 98, 'best-practices': 92, seo: 95, pwa: 85 },
  requestCount: 60, // exceeds 50
  thirdPartyRequests: 15 // exceeds 10
};
const failResResult = PB.checkBudgets(failResources);
assert(failResResult.passed === false, 'Resource failures mark passed=false');
assert(failResResult.warnings.length >= 2, 'At least 2 resource warnings');
assert(failResResult.warnings.every(w => w.severity === 'warning'), 'Resource warnings are warnings');

// Test 7: Memory violation
const failMemory = {
  lighthouse: { performance: 95, accessibility: 98, 'best-practices': 92, seo: 95, pwa: 85 },
  jsHeapSize: 60 * 1024 * 1024 // exceeds 50MB
};
const failMemResult = PB.checkBudgets(failMemory);
assert(failMemResult.passed === false, 'Memory failure marks passed=false');
assert(failMemResult.violations.length >= 1, 'Memory violation exists');
const memViolation = failMemResult.violations.find(v => v.metric === 'jsHeapSize');
assert(memViolation !== undefined, 'Memory violation exists');
assert(memViolation.severity === 'error', 'Memory severity = error');

// Test 8: Timing warnings (treated as warnings, not violations - doesn't block passed)
const failTiming = {
  lighthouse: { performance: 95, accessibility: 98, 'best-practices': 92, seo: 95, pwa: 85 },
  domContentLoaded: 2500, // exceeds 2000
  load: 4500              // exceeds 4000
};
const failTimeResult = PB.checkBudgets(failTiming);
assert(failTimeResult.passed === true, 'Timing warnings do not block passed (warning only)');
assert(failTimeResult.warnings.length >= 2, 'At least 2 timing warnings');
assert(failTimeResult.warnings.every(w => w.severity === 'warning'), 'Timing issues are warnings');
assert(failTimeResult.violations.length === 0, 'No violations for timing');

// Test 9: Mixed results (some pass, some fail)
const mixedMetrics = {
  lighthouse: { performance: 95, accessibility: 98, 'best-practices': 92, seo: 95, pwa: 85 },
  LCP: 3000, // fail
  FID: 50,   // pass
  totalBundle: 600 * 1024, // fail
  initialJS: 150 * 1024,   // pass
  requestCount: 40,        // pass
  thirdPartyRequests: 15   // fail (warning)
};
const mixedResult = PB.checkBudgets(mixedMetrics);
assert(mixedResult.passed === false, 'Mixed results mark passed=false');
assert(mixedResult.violations.length >= 2, 'At least 2 violations');
assert(mixedResult.warnings.length >= 1, 'At least 1 warning');

// Test 10: generateCIReport - GitHub Actions format
const ciReport = PB.generateCIReport({
  passed: false,
  violations: [{ metric: 'LCP', actual: 3000, budget: 2500, label: 'LCP' }],
  warnings: [{ metric: 'requestCount', actual: 60, budget: 50, label: 'Requests' }],
  summary: { passed: 5, failed: 2, warnings: 1 },
  passed: false
}, { format: 'github-actions', file: 'test.html', line: 10 });
assert(ciReport.includes('::error'), 'CI report has error annotation');
assert(ciReport.includes('LCP'), 'CI report mentions LCP');
assert(ciReport.includes('::warning'), 'CI report has warning');
assert(ciReport.includes('Requests'), 'CI report mentions requests');
assert(ciReport.includes('::error file=performance-budget'), 'CI report has error annotation format');

// Test 11: generateCIReport - JSON format
const jsonReport = PB.generateCIReport({
  passed: true,
  violations: [],
  warnings: [],
  summary: { passed: 10, failed: 0, warnings: 0 },
  passed: true
}, { format: 'json' });
const parsed = JSON.parse(jsonReport);
assert(parsed.passed === true, 'JSON report passed = true');
assert(parsed.summary.passed === 10, 'JSON summary passed = 10');
assert(parsed.timestamp, 'JSON has timestamp');

// Test 12: generateCIReport - Markdown format
const mdReport = PB.generateCIReport({
  passed: false,
  violations: [{ metric: 'LCP', actual: 3000, budget: 2500, label: 'LCP' }],
  warnings: [{ metric: 'requestCount', actual: 60, budget: 50, label: 'Requests' }],
  summary: { passed: 5, failed: 1, warnings: 1 },
  passed: false
}, { format: 'markdown' });
assert(mdReport.includes('# Performance Budget Report'), 'Markdown has title');
assert(mdReport.includes('❌ FAIL'), 'Markdown shows FAIL');
assert(mdReport.includes('❌ Violations'), 'Markdown has violations section');
assert(mdReport.includes('LCP'), 'Markdown mentions LCP');
assert(mdReport.includes('⚠️ Warnings'), 'Markdown has warnings section');
assert(mdReport.includes('Requests'), 'Markdown mentions requests');

// Test 12: generateBudgetsFile
const budgetsFile = PB.generateBudgetsFile();
const parsedBudgets = JSON.parse(budgetsFile);
assert(parsedBudgets.lighthouse.performance === 90, 'Budgets file has default Lighthouse performance');
assert(parsedBudgets.metrics.LCP === 2500, 'Budgets file has default LCP');
assert(typeof parsedBudgets.metrics.maxTotalBundle === 'number', 'Budgets file has maxTotalBundle');

// Test 12: parseLighthouseOutput
const mockLH = buildMockLH();

const parsedLH = PB.parseLighthouseOutput(mockLH);
assert(parsedLH.lighthouse.performance === 92, 'Parsed Lighthouse performance = 92');
assert(parsedLH.lighthouse.accessibility === 98, 'Parsed accessibility = 98');
assert(parsedLH.LCP === 2100, 'Parsed LCP = 2100');
assert(parsedLH.FID === 80, 'Parsed FID = 80');
assert(parsedLH.CLS === 0.05, 'Parsed CLS = 0.05');
assert(parsedLH.FCP === 1600, 'Parsed FCP = 1600');
assert(parsedLH.TTFB === 300, 'Parsed TTFB = 300');
assert(parsedLH.TBT === 120, 'Parsed TBT = 120');
assert(parsedLH.TTI === 3200, 'Parsed TTI = 3200');
assert(parsedLH.domContentLoaded === 1800, 'Parsed DCL = 1800');
assert(parsedLH.load === 3500, 'Parsed load = 3500');
assert(parsedLH.requestCount === 3, 'Parsed requestCount = 3');
assert(parsedLH.totalBundle === 400000, 'Parsed totalBundle = 400000');
assert(parsedLH.initialJS === 150000, 'Parsed initialJS = 150000');
assert(parsedLH.cssSize === 30000, 'Parsed cssSize = 30000');
assert(parsedLH.fontSize === 50000, 'Parsed fontSize = 50000');
assert(parsedLH.imageSize === 200000, 'Parsed imageSize = 200000');
assert(parsedLH.jsHeapSize === 10000000, 'Parsed jsHeapSize = 10000000');
assert(parsedLH.thirdPartyRequests === 2, 'Parsed thirdPartyRequests = 2');

// Test: Empty Lighthouse result
const emptyParsed = PB.parseLighthouseOutput({});
assert(Object.keys(emptyParsed).length === 0, 'Empty LH returns empty object');

const nullParsed = PB.parseLighthouseOutput(null);
assert(Object.keys(nullParsed).length === 0, 'Null LH returns empty object');

// Summary
console.log('\n=== SUMMARY ===');
console.log('Passed:', passCount);
console.log('Failed:', failCount);
console.log('Total:', passCount + failCount);

if (failCount > 0) process.exit(1);

function buildMockLH() {
  return {
    categories: {
      performance: { score: 0.92 },
      accessibility: { score: 0.98 },
      'best-practices': { score: 0.9 },
      seo: { score: 0.95 },
      pwa: { score: 0.8 }
    },
    audits: {
      'largest-contentful-paint': { numericValue: 2100 },
      'max-potential-fid': { numericValue: 80 },
      'cumulative-layout-shift': { numericValue: 0.05 },
      'first-contentful-paint': { numericValue: 1600 },
      'server-response-time': { numericValue: 300 },
      'total-blocking-time': { numericValue: 120 },
      'interactive': { numericValue: 3200 },
      'dom-content-loaded': { numericValue: 1800 },
      'load-time': { numericValue: 3500 },
      'resource-summary': { details: { items: [{}, {}, {}] } },
      'total-byte-weight': { numericValue: 400000 },
      'script-boot-up-time': { numericValue: 150000 },
      'unused-css-rules': { numericValue: 30000 },
      'font-display': { details: { items: [{ size: 50000 }] } },
      'uses-optimized-images': { details: { items: [{ size: 200000 }] } },
      'uses-long-cache-ttl': { details: { items: [{ size: 10000000 }] } },
      'third-party-summary': { details: { items: [{}, {}] } }
    }
  };
}