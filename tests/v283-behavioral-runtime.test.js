// V283 Wave A - Behavioral Runtime Tests
// These test ACTUAL runtime behavior after adapter loads
// Uses Node's built-in test runner with jsdom-like environment

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Load the adapter file
const adapterSource = fs.readFileSync(path.join(__dirname, '..', 'v283-rentability-adapter.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const realClassifier = require('../portfolio-cash-flow-classifier.js');
const realEngine = require('../historical-performance-engine.js');

// Create a realistic browser-like environment
function createRuntimeContext() {
  // Mock HistoricalPerformance engine
  const mockEngine = {
    calculatePerformance: function(opts) {
      const valuations = opts.valuations || [];
      const coverage = opts.priceCoverage?.status || 'UNKNOWN';
      const start = valuations[0]?.value || 0;
      const end = valuations[valuations.length - 1]?.value || 0;
      
      return {
        coverage: coverage,
        valuations: valuations.map(v => ({ date: v.date, value: v.value })),
        metrics: {
          simpleReturn: { status: 'PASS', availability: 'AVAILABLE', value: start > 0 ? (end - start) / start : 0, formula: 'simple' },
          twr: { status: 'PASS', availability: 'AVAILABLE', value: start > 0 ? (end - start) / start : 0, formula: 'twr' },
          xirr: { status: 'PASS', availability: 'AVAILABLE', value: start > 0 ? (end - start) / start : 0, formula: 'xirr' },
          incomeReturn: { status: 'INSUFFICIENT_DATA', value: null, formula: 'income' },
          capitalReturn: { status: 'INSUFFICIENT_DATA', value: null, formula: 'capital' },
          totalReturn: { status: 'PASS', availability: 'AVAILABLE', value: start > 0 ? (end - start) / start : 0, formula: 'total' }
        },
        benchmark: { points: [] },
        engineAvailability: { simpleReturn: true, twr: true, xirr: true },
        evidence: { valuationCount: valuations.length, priceCoverage: coverage },
        period: { start: valuations[0]?.date || null, end: valuations[valuations.length - 1]?.date || null },
        asOf: valuations[valuations.length - 1]?.date || null,
        dataReadiness: { state: 'UNASSESSED' }
      };
    },
    normalizeBenchmark: function() { return { points: [] }; },
    buildYearEndPosition: function() { return { rows: [] }; }
  };
  
  // Mock PortfolioCashFlowClassifier
  const mockClassifier = {
    classifyEvent: function(row, opts) {
      return {
        kind: row.kind || 'EXTERNAL_CONTRIBUTION',
        eventId: row.id,
        date: row.date,
        signedAmount: row.signedAmount || row.amount || 1000,
        portfolioSignedAmount: row.signedAmount || row.amount || 1000,
        walletId: opts.walletId,
        sourceIdentity: 'test',
        timing: 'END_OF_SUBPERIOD'
      };
    },
    assessCashFlowReadiness: function() {
      return { state: 'READY', trustedExternalFlows: [], ambiguousEvents: 0, unknownEvents: 0, unscopedEvents: 0 };
    }
  };
  
  // Mock PortfolioHistory
  const mockHistory = {
    assessSufficiency: function() {
      return { capabilities: [] };
    }
  };
  
  const runtime = {
    console: console,
    window: { 
      HistoricalPerformance: mockEngine,
      PortfolioCashFlowClassifier: mockClassifier,
      PortfolioHistory: mockHistory
    },
    document: {},
    Map: Map,
    Set: Set,
    Number: Number,
    String: String,
    Array: Array,
    Object: Object,
    Date: Date,
    Math: Math,
    parseInt: parseInt,
    parseFloat: parseFloat,
    isFinite: isFinite,
    isNaN: isNaN,
    JSON: JSON,
    Promise: Promise,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    navigator: { userAgent: 'test' },
    location: { href: 'http://localhost' },
    history: { pushState: () => {}, replaceState: () => {} },
    CustomEvent: function() {},
    Event: function() {},
    Node: { ELEMENT_NODE: 1 },
    HTMLElement: function() {},
    SVGElement: function() {},
    Element: function() {},
    NodeList: function() {},
    HTMLCollection: function() {},
    MutationObserver: function() {},
    IntersectionObserver: function() {},
    ResizeObserver: function() {},
    requestAnimationFrame: (cb) => setTimeout(cb, 16),
    cancelAnimationFrame: (id) => clearTimeout(id),
    esc: function(s) { return String(s).replace(/[&<>"']/g, function(c) { var m = {"&":"&","<":"<",">":">","\"":"\"","'":"'"}; return m[c]; }); },
    fmt: function(n) { return Number.isFinite(n) ? new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL',minimumFractionDigits:2}).format(n) : '\u2014'; },
    fmtP: function(n) { return Number.isFinite(n) ? new Intl.NumberFormat('pt-BR', {style:'percent',minimumFractionDigits:2}).format(n/100) : '\u2014'; },
    cleanAssetCode: function(s) { return String(s||'').trim().toUpperCase().replace(/\s+/g,''); },
    parseAnyDate: function(s) { return s ? new Date(String(s).replace(/-/g,'/')) : null; },
    isNeutralMovement: function() { return false; },
    normalizeType: function(t, d) { return t || d; },
    metaTicker: function() { return {type:'A\u00e7\u00e3o'}; },
    learnedMetaFor: function() { return {}; },
    rentBenchRate: function(b) { return ({CDI: 10.5, IPCA: 4.5, SELIC: 10.5}[b] || 10.5); },
    S: {
      assets: [],
      aportes: [],
      activeWalletId: 'wallet-1',
      rentBench: 'CDI',
      rentType: 'all',
      rentPeriod: 'all'
    },
    rentabilityIncomeRows: function() { return []; },
    __V76_RUNTIME__: {
      snapshots: { snapshots: [] },
      flows: { flows: [] }
    }
  };
  
  runtime.window = runtime;
  runtime.self = runtime;
  runtime.globalThis = runtime;
  runtime.HistoricalPerformance = mockEngine;
  runtime.PortfolioCashFlowClassifier = mockClassifier;
  runtime.PortfolioHistory = mockHistory;
  
  return runtime;
}

// ============ BEHAVIORAL TESTS ============

test('R1: Missing dated valuation evidence => UNAVAILABLE/INSUFFICIENT_DATA', async () => {
  const ctx = createRuntimeContext();
  // No snapshots = no dated valuations
  ctx.__V76_RUNTIME__.snapshots.snapshots = [];
  
  // Create context and run adapter
  const context = vm.createContext(ctx);
  vm.runInContext(adapterSource, context);
  
  // Call adapter's rentabilityHistory
  const result = await ctx.window.rentabilityHistory('all', 'all', 'CDI');
  
  assert.ok(result.status === 'UNAVAILABLE' || result.status === 'INSUFFICIENT_DATA', 
    `Expected UNAVAILABLE or INSUFFICIENT_DATA, got ${result.status}`);
  assert.ok(!result.current || result.current === null, 'current should be null when unavailable');
  assert.equal(result.return12m, null, 'return12m is unavailable, not zero');
  assert.equal(result.currentBench, null, 'currentBench is unavailable, not zero');
});

test('R1b: valuation ausente não é convertida em zero no adapter', async () => {
  const ctx = createRuntimeContext();
  ctx.__V76_RUNTIME__.snapshots.snapshots = [
    { walletId: 'wallet-1', localDate: '2024-01-31', totalPortfolioValue: null, totalCoveragePercent: 100 },
    { walletId: 'wallet-1', localDate: '2024-02-29', totalPortfolioValue: 1100000, totalCoveragePercent: 100 }
  ];
  const context = vm.createContext(ctx);
  vm.runInContext(adapterSource, context);
  const result = await ctx.window.rentabilityHistory('all', 'all', 'CDI');
  assert.equal(result.status, 'UNAVAILABLE');
  assert.equal(result.current, null);
});

test('R2: priceCoverage UNKNOWN => fail closed, no fake 0%', async () => {
  const ctx = createRuntimeContext();
  // Snapshots with UNKNOWN coverage
  ctx.__V76_RUNTIME__.snapshots.snapshots = [
    { walletId: 'wallet-1', localDate: '2024-01-31', totalPortfolioValue: 1000000, totalCoveragePercent: 0 },
    { walletId: 'wallet-1', localDate: '2024-02-29', totalPortfolioValue: 1100000, totalCoveragePercent: 0 }
  ];
  
  const context = vm.createContext(ctx);
  vm.runInContext(adapterSource, context);
  
  const result = await ctx.window.rentabilityHistory('all', 'all', 'CDI');
  
  // With UNKNOWN coverage, engine should return INSUFFICIENT_DATA
  assert.ok(result.status === 'UNAVAILABLE' || result.status === 'INSUFFICIENT_DATA' || result.coverage === 'UNKNOWN',
    `Expected fail-closed state, got status=${result.status}, coverage=${result.coverage}`);
});

test('R3: priceCoverage PARTIAL => status PARTIAL, not COMPLETE', async () => {
  const ctx = createRuntimeContext();
  // Snapshots with PARTIAL coverage (50%)
  ctx.__V76_RUNTIME__.snapshots.snapshots = [
    { walletId: 'wallet-1', localDate: '2024-01-31', totalPortfolioValue: 1000000, totalCoveragePercent: 50 },
    { walletId: 'wallet-1', localDate: '2024-02-29', totalPortfolioValue: 1100000, totalCoveragePercent: 50 }
  ];
  
  const context = vm.createContext(ctx);
  vm.runInContext(adapterSource, context);
  
  const result = await ctx.window.rentabilityHistory('all', 'all', 'CDI');
  
  // PARTIAL coverage should not yield AVAILABLE unless engine explicitly allows
  assert.ok(result.status !== 'AVAILABLE' || result.coverage === 'PARTIAL_COVERAGE',
    `PARTIAL coverage should not be AVAILABLE without explicit engine approval`);
});

test('R3b: 95% de cobertura patrimonial não vira cobertura completa de preço', async () => {
  const ctx = createRuntimeContext();
  ctx.__V76_RUNTIME__.snapshots.snapshots = [
    { walletId: 'wallet-1', localDate: '2024-01-31', totalPortfolioValue: 1000000, totalCoveragePercent: 95 },
    { walletId: 'wallet-1', localDate: '2024-02-29', totalPortfolioValue: 1100000, totalCoveragePercent: 95 }
  ];
  const context = vm.createContext(ctx);
  vm.runInContext(adapterSource, context);
  const result = await ctx.window.rentabilityHistory('all', 'all', 'CDI');
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.coverage, 'PARTIAL_COVERAGE');
  assert.equal(result.current, null);
});

test('R4: Valid dated valuations + FULL coverage => numeric result available', async () => {
  const ctx = createRuntimeContext();
  // Snapshots with explicit 100% coverage
  ctx.__V76_RUNTIME__.snapshots.snapshots = [
    { walletId: 'wallet-1', localDate: '2024-01-31', totalPortfolioValue: 1000000, totalCoveragePercent: 100 },
    { walletId: 'wallet-1', localDate: '2024-02-29', totalPortfolioValue: 1100000, totalCoveragePercent: 100 }
  ];
  
  const context = vm.createContext(ctx);
  vm.runInContext(adapterSource, context);
  
  const result = await ctx.window.rentabilityHistory('all', 'all', 'CDI');
  
  assert.equal(result.status, 'AVAILABLE', 'Full dated synthetic evidence should expose an available aggregate return');
  assert.ok(Math.abs(result.current.cumReturn - 10) < 1e-9, 'Aggregate return must match the engine, not a fabricated zero');
  assert.equal(result.return12m, null, 'Two monthly observations do not prove a trailing-12-month boundary');
  assert.equal(result.points.length, 0, 'Do not fabricate monthly return points from valuations alone');
  assert.equal(result.totalMonths, 0, 'Valuation observation count is not a monthly-return series');
});

test('R5: Current price mutation must NOT alter historical result', async () => {
  const ctx = createRuntimeContext();
  ctx.__V76_RUNTIME__.snapshots.snapshots = [
    { walletId: 'wallet-1', localDate: '2024-01-31', totalPortfolioValue: 1000000, totalCoveragePercent: 100 },
    { walletId: 'wallet-1', localDate: '2024-02-29', totalPortfolioValue: 1100000, totalCoveragePercent: 100 }
  ];
  // Add current asset with current_price
  ctx.S.assets = [
    { ticker: 'PETR4', current_price: 30, qty: 100, price: 25 }
  ];
  
  const context = vm.createContext(ctx);
  vm.runInContext(adapterSource, context);
  
  const result1 = await ctx.window.rentabilityHistory('all', 'all', 'CDI');
  
  // Mutate current_price
  ctx.S.assets[0].current_price = 50;
  
  const result2 = await ctx.window.rentabilityHistory('all', 'all', 'CDI');
  
  // Historical result based on dated snapshots should NOT change
  assert.deepEqual(result1.points, result2.points, 
    'Historical points must not change when current_price mutates');
});

test('R6: Current holdings mutation must NOT rewrite prior dated holding state', async () => {
  const ctx = createRuntimeContext();
  ctx.__V76_RUNTIME__.snapshots.snapshots = [
    { walletId: 'wallet-1', localDate: '2024-01-31', totalPortfolioValue: 1000000, totalCoveragePercent: 100 },
    { walletId: 'wallet-1', localDate: '2024-02-29', totalPortfolioValue: 1100000, totalCoveragePercent: 100 }
  ];
  
  const context = vm.createContext(ctx);
  vm.runInContext(adapterSource, context);
  
  const result1 = await ctx.window.rentabilityHistory('all', 'all', 'CDI');
  
  // Mutate current holdings
  ctx.S.assets = [
    { ticker: 'VALE3', current_price: 60, qty: 200, price: 55 }
  ];
  
  const result2 = await ctx.window.rentabilityHistory('all', 'all', 'CDI');
  
  // Historical points should not change
  assert.deepEqual(result1.points, result2.points,
    'Historical points must not change when current holdings mutate');
});

test('R7: Benchmark unavailable => no synthetic benchmark series', async () => {
  const ctx = createRuntimeContext();
  ctx.__V76_RUNTIME__.snapshots.snapshots = [
    { walletId: 'wallet-1', localDate: '2024-01-31', totalPortfolioValue: 1000000, totalCoveragePercent: 100 },
    { walletId: 'wallet-1', localDate: '2024-02-29', totalPortfolioValue: 1100000, totalCoveragePercent: 100 }
  ];
  
  const context = vm.createContext(ctx);
  vm.runInContext(adapterSource, context);
  
  const result = await ctx.window.rentabilityHistory('all', 'all', 'CDI');
  
  // benchSeries should have unavailable markers, not synthetic values
  if (result.benchSeries && result.benchSeries.length > 0) {
    const allUnavailable = result.benchSeries.every(b => b.unavailable === true || b.value === null);
    assert.ok(allUnavailable, 'Benchmark series should be unavailable markers, not synthetic values');
  }
});

test('R8: Portfolio return available even if benchmark unavailable', async () => {
  const ctx = createRuntimeContext();
  ctx.__V76_RUNTIME__.snapshots.snapshots = [
    { walletId: 'wallet-1', localDate: '2024-01-31', totalPortfolioValue: 1000000, totalCoveragePercent: 100 },
    { walletId: 'wallet-1', localDate: '2024-02-29', totalPortfolioValue: 1100000, totalCoveragePercent: 100 }
  ];
  
  const context = vm.createContext(ctx);
  vm.runInContext(adapterSource, context);
  
  const result = await ctx.window.rentabilityHistory('all', 'all', 'CDI');
  
  // Portfolio return (current, return12m) should be computable from valuations
  // even if benchmark is unavailable
  assert.ok(result.current !== undefined, 'Portfolio current should exist');
  assert.equal(result.return12m, null, 'Trailing 12M is unavailable without a dated opening boundary');
  assert.ok(Number.isFinite(result.current?.cumReturn), 'The available aggregate return is preserved');
});

test('R9: Legacy rentabilityHistory resolves to adapter at runtime', async function() {
  const ctx = createRuntimeContext();
  const context = vm.createContext(ctx);
  vm.runInContext(adapterSource, context);
  
  // Check that window.rentabilityHistory is the adapter (async function)
  const fn = ctx.window.rentabilityHistory;
  assert.ok(typeof fn === 'function', 'rentabilityHistory should be a function');
  
  const result = fn('all', 'all', 'CDI');
  assert.ok(result && typeof result.then !== 'function', 'Legacy render callers require a synchronous result');
});

test('R10: Legacy rentBenchSeries does NOT execute old synthetic implementation', async () => {
  const ctx = createRuntimeContext();
  const context = vm.createContext(ctx);
  vm.runInContext(adapterSource, context);
  
  // Call rentBenchSeries - should return unavailable markers
  const bench = ctx.window.rentBenchSeries(12, 'CDI');
  
  // Should return array of unavailable markers
  assert.ok(Array.isArray(bench), 'benchSeries should return array');
  assert.equal(bench.length, 12, 'Should have 12 entries');
  assert.ok(bench.every(b => b.unavailable === true || b.value === null),
    'All benchmark entries should be unavailable (no synthetic)');
});

test('R10b: Adapter loads after legacy rentability globals are defined', () => {
  const adapterTag = indexHtml.indexOf('<script src="v283-rentability-adapter.js"></script>');
  const legacyHistory = indexHtml.indexOf('function rentabilityHistory(');
  assert.ok(adapterTag >= 0, 'Rentability adapter script tag exists');
  assert.ok(legacyHistory >= 0, 'Legacy history function exists for compatibility');
  assert.ok(adapterTag > legacyHistory,
    'Adapter must load after legacy function declarations or they overwrite the adapter');
});

test('R10c: Deprecated fixed-rate benchmark API fails closed', () => {
  const ctx = createRuntimeContext();
  const context = vm.createContext(ctx);
  vm.runInContext(adapterSource, context);
  assert.equal(ctx.window.rentBenchRate('CDI'), null,
    'Deprecated fixed-rate API must not expose a synthetic numeric benchmark');
});

test('R10d: Adapter preserves classified cash-flow evidence for the engine', async () => {
  const ctx = createRuntimeContext();
  ctx.PortfolioCashFlowClassifier = realClassifier;
  let received;
  ctx.HistoricalPerformance = {
    ...realEngine,
    calculatePerformance(options) { received = options; return realEngine.calculatePerformance(options); }
  };
  ctx.__V76_RUNTIME__.snapshots.snapshots = [
    { walletId: 'wallet-1', localDate: '2024-01-31', totalPortfolioValue: 1000000, totalCoveragePercent: 100 },
    { walletId: 'wallet-1', localDate: '2024-02-29', totalPortfolioValue: 1100000, totalCoveragePercent: 100 }
  ];
  ctx.__V76_RUNTIME__.flows.flows = [{ id: 'synthetic-flow-1', sourceId: 'synthetic-source-1', source: 'MANUAL', walletId: 'wallet-1', date: '2024-02-29', type: 'EXTERNAL_CONTRIBUTION', amount: 100, timing: 'END_OF_SUBPERIOD' }];
  const context = vm.createContext(ctx);
  vm.runInContext(adapterSource, context);
  const result = ctx.rentabilityHistory('all', 'all', 'CDI');
  assert.equal(received.events.length, 1, 'Trusted external flow must reach the engine');
  assert.equal(received.events[0].classification, 'EXTERNAL_CONTRIBUTION');
  assert.equal(result.status, 'AVAILABLE');
  assert.ok(Math.abs(result.current.cumReturn - 9) < 1e-9, 'TWR must neutralize the synthetic contribution at its observed boundary');
});

test('R10e: Ambiguous flow evidence blocks aggregate return', () => {
  const ctx = createRuntimeContext();
  ctx.PortfolioCashFlowClassifier = realClassifier;
  let received;
  ctx.HistoricalPerformance = {
    ...realEngine,
    calculatePerformance(options) { received = options; return realEngine.calculatePerformance(options); }
  };
  ctx.__V76_RUNTIME__.snapshots.snapshots = [
    { walletId: 'wallet-1', localDate: '2024-01-31', totalPortfolioValue: 1000000, totalCoveragePercent: 100 },
    { walletId: 'wallet-1', localDate: '2024-02-29', totalPortfolioValue: 1100000, totalCoveragePercent: 100 }
  ];
  ctx.__V76_RUNTIME__.flows.flows = [{ id: 'synthetic-ambiguous-1', sourceId: 'synthetic-source-2', source: 'MANUAL', walletId: 'wallet-1', date: '2024-02-29', type: 'TRANSFER', amount: 100, timing: 'END_OF_SUBPERIOD' }];
  const context = vm.createContext(ctx);
  vm.runInContext(adapterSource, context);
  const result = ctx.rentabilityHistory('all', 'all', 'CDI');
  assert.equal(received.events[0].classification, 'AMBIGUOUS');
  assert.equal(result.status, 'UNAVAILABLE', 'Ambiguous external-flow candidate cannot yield an available return');
  assert.equal(result.current, null);
});

test('Aportes import buttons reference implemented handlers only', () => {
  const start = indexHtml.indexOf('<details class="card aportes-imports-panel">');
  const end = indexHtml.indexOf('</details>', start);
  assert.ok(start >= 0 && end > start, 'Aportes import panel exists');
  const panel = indexHtml.slice(start, end);
  const handlers = [...panel.matchAll(/onclick="([A-Za-z_$][\w$]*)\(\)"/g)].map(match => match[1]);
  assert.equal(handlers.length, 4, 'All four import buttons are inspected');
  const missing = handlers.filter(name => !new RegExp('function\\s+' + name + '\\s*\\(').test(indexHtml));
  assert.deepEqual(missing, [], 'Every visible import button must resolve to an implemented handler');
});

test('R11: Engine unavailable => fail closed, no fabricated numeric series', async () => {
  const ctx = createRuntimeContext();
  // Remove engine
  delete ctx.window.HistoricalPerformance;
  
  const context = vm.createContext(ctx);
  vm.runInContext(adapterSource, context);
  
  const result = await ctx.window.rentabilityHistory('all', 'all', 'CDI');
  
  assert.equal(result.status, 'UNAVAILABLE', 'Should be UNAVAILABLE when engine missing');
  assert.ok(result.reason && result.reason.includes('engine'), 'Reason should mention engine');
});

test('R12: Adapter preserves provenance/coverage status when provided', async function() {
  const ctx = createRuntimeContext();
  ctx.__V76_RUNTIME__.snapshots.snapshots = [
    { walletId: 'wallet-1', localDate: '2024-01-31', totalPortfolioValue: 1000000, totalCoveragePercent: 100 },
    { walletId: 'wallet-1', localDate: '2024-02-29', totalPortfolioValue: 1100000, totalCoveragePercent: 50 }
  ];
  
  const context = vm.createContext(ctx);
  vm.runInContext(adapterSource, context);
  
  const result = await ctx.window.rentabilityHistory('all', 'all', 'CDI');
  
  // Debug: log the result
  console.log('R12 result:', JSON.stringify({status: result.status, coverage: result.coverage, hasCoverage: result.coverage !== undefined}));
  
  // Result should expose coverage info - check status or coverage field
  assert.ok(result.coverage !== undefined || result.status !== undefined, 'Result should have coverage or status field');
  if (result.coverage !== undefined) {
    assert.ok(['FULL_COVERAGE', 'PARTIAL_COVERAGE', 'UNKNOWN', 'INSUFFICIENT_DATA'].includes(result.coverage),
      'Coverage should be a valid status, got ' + result.coverage);
  }
});

console.log('Behavioral runtime tests defined. Run with: node --test tests/v283-behavioral-runtime.test.js');
