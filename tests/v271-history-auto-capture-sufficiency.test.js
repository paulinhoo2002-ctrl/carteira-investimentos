const test = require('node:test');
const assert = require('node:assert/strict');
const AutoCapture = require('../portfolio-history-auto-capture.js');
const PortfolioHistory = require('../portfolio-history-core.js');
const Sufficiency = require('../portfolio-history-sufficiency.js');

const DAY_MS = 86400000;

function fixtureState() {
  return {
    assets: [
      { id: 'a1', ticker: 'ABCD3', qty: 10, current_price: 12.34 },
      { id: 'a2', ticker: 'EFGH4', qty: 5, current_price: 25.00 }
    ],
    aportes: [{ id: 'm1', date: '2026-01-02', value: 1000 }],
    proventos: [{ id: 'i1', date: '2026-02-03', value: 12.5, type: 'DIVIDEND' }],
    rfEvents: [{ id: 'rf1', value: 5000, manual: true }]
  };
}

function fixtureHistoryState() {
  return {
    snapshots: [],
    config: PortfolioHistory.getDefaultConfig()
  };
}

async function createSnapshot(state, overrides = {}) {
  return PortfolioHistory.captureSnapshot(state, {
    source: 'MANUAL',
    captureReason: 'test',
    capturedAt: '2026-01-01T00:00:00.000Z',
    walletId: 'default',
    userId: 'test',
    ...overrides
  });
}

// ===== AUTO-CAPTURE TESTS =====

test('V271 AutoCapture shouldAutoCapture returns FIRST_CAPTURE for empty history', () => {
  const historyState = { snapshots: [], config: { autoCaptureEnabled: true, captureIntervalDays: 1 } };
  const result = AutoCapture.shouldAutoCapture(historyState, historyState.config);
  assert.equal(result.eligible, true);
  assert.equal(result.reason, 'FIRST_CAPTURE');
});

test('V271 AutoCapture shouldAutoCapture respects disabled config', () => {
  const historyState = { snapshots: [], config: { autoCaptureEnabled: false, captureIntervalDays: 1 } };
  const result = AutoCapture.shouldAutoCapture(historyState, historyState.config);
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'DISABLED');
});

test('V271 AutoCapture shouldAutoCapture returns SAME_DAY_ALREADY_CAPTURED', () => {
  const now = Date.now();
  const today = new Date(now).toISOString();
  const historyState = { 
    snapshots: [{
      capturedAt: today,
      provenance: { walletId: 'default' }
    }],
    config: { autoCaptureEnabled: true, captureIntervalDays: 1 }
  };
  const result = AutoCapture.shouldAutoCapture(historyState, historyState.config, { now });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'SAME_DAY_ALREADY_CAPTURED');
});

test('V271 AutoCapture shouldAutoCapture returns INTERVAL_ELAPSED for next day', () => {
  const now = new Date('2026-01-02T12:00:00.000Z').getTime();
  const historyState = { 
    snapshots: [{
      capturedAt: '2026-01-01T12:00:00.000Z',
      provenance: { walletId: 'default' }
    }],
    config: { autoCaptureEnabled: true, captureIntervalDays: 1 }
  };
  const result = AutoCapture.shouldAutoCapture(historyState, historyState.config, { now });
  assert.equal(result.eligible, true);
  assert.equal(result.reason, 'INTERVAL_ELAPSED');
});

test('V271 AutoCapture shouldAutoCapture respects captureIntervalDays > 1', () => {
  const now = new Date('2026-01-02T12:00:00.000Z').getTime();
  const historyState = { 
    snapshots: [{
      capturedAt: '2026-01-01T12:00:00.000Z',
      provenance: { walletId: 'default' }
    }],
    config: { autoCaptureEnabled: true, captureIntervalDays: 3 }
  };
  const result = AutoCapture.shouldAutoCapture(historyState, historyState.config, { now });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'INTERVAL_NOT_ELAPSED');
});

test('V271 AutoCapture shouldAutoCapture detects future timestamp', () => {
  const future = new Date(Date.now() + 2 * DAY_MS).toISOString();
  const historyState = { 
    snapshots: [{
      capturedAt: future,
      provenance: { walletId: 'default' }
    }],
    config: { autoCaptureEnabled: true, captureIntervalDays: 1 }
  };
  const result = AutoCapture.shouldAutoCapture(historyState, historyState.config);
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'FUTURE_TIMESTAMP_DETECTED');
});

test('V271 AutoCapture shouldAutoCapture is wallet-scoped', () => {
  const now = new Date('2026-01-02T12:00:00.000Z').getTime();
  const historyState = { 
    snapshots: [
      { capturedAt: '2026-01-01T12:00:00.000Z', provenance: { walletId: 'wallet-A' } },
      { capturedAt: '2026-01-01T12:00:00.000Z', provenance: { walletId: 'wallet-B' } }
    ],
    config: { autoCaptureEnabled: true, captureIntervalDays: 1 }
  };
  
  const resultA = AutoCapture.shouldAutoCapture(historyState, historyState.config, { now, walletId: 'wallet-A' });
  const resultB = AutoCapture.shouldAutoCapture(historyState, historyState.config, { now, walletId: 'wallet-B' });
  
  assert.equal(resultA.eligible, true);
  assert.equal(resultB.eligible, true);
});

test('V271 AutoCapture attemptAutoCapture creates snapshot on first run', async () => {
  const state = fixtureState();
  const historyState = fixtureHistoryState();
  const config = PortfolioHistory.getDefaultConfig();
  
  let captureCalled = false;
  const mockCapture = async (s, ctx) => {
    captureCalled = true;
    return PortfolioHistory.captureSnapshot(s, { ...ctx, capturedAt: '2026-01-01T12:00:00.000Z' });
  };
  const mockAdd = (h, snap) => PortfolioHistory.addSnapshotToHistory(h, snap, config);
  
  const result = await AutoCapture.attemptAutoCapture(state, historyState, config, mockCapture, mockAdd);
  
  assert.equal(result.status, 'CREATED');
  assert.ok(captureCalled);
  assert.ok(result.snapshot);
  assert.equal(result.snapshot.source, 'AUTO');
});

test('V271 AutoCapture attemptAutoCapture skips on same day', async () => {
  const state = fixtureState();
  const today = new Date().toISOString();
  const historyState = { 
    snapshots: [{
      capturedAt: today,
      provenance: { walletId: 'default' }
    }],
    config: PortfolioHistory.getDefaultConfig()
  };
  const config = PortfolioHistory.getDefaultConfig();
  
  const mockCapture = async () => { throw new Error('Should not be called'); };
  const mockAdd = () => { throw new Error('Should not be called'); };
  
  const result = await AutoCapture.attemptAutoCapture(state, historyState, config, mockCapture, mockAdd);
  
  assert.equal(result.status, 'SKIPPED');
  assert.equal(result.reason, 'SAME_DAY_ALREADY_CAPTURED');
});

test('V271 AutoCapture attemptAutoCapture protects against concurrency', async () => {
  const state = fixtureState();
  const historyState = fixtureHistoryState();
  const config = PortfolioHistory.getDefaultConfig();
  
  let captureCount = 0;
  const mockCapture = async (s, ctx) => {
    captureCount++;
    await new Promise(r => setTimeout(r, 10)); // Simulate async work
    return PortfolioHistory.captureSnapshot(s, { ...ctx, capturedAt: new Date().toISOString() });
  };
  const mockAdd = (h, snap) => PortfolioHistory.addSnapshotToHistory(h, snap, config);
  
  // Fire two concurrent attempts
  const [result1, result2] = await Promise.all([
    AutoCapture.attemptAutoCapture(state, historyState, config, mockCapture, mockAdd),
    AutoCapture.attemptAutoCapture(state, historyState, config, mockCapture, mockAdd)
  ]);
  
  // One should succeed, one should be skipped
  const created = [result1, result2].filter(r => r.status === 'CREATED').length;
  const skipped = [result1, result2].filter(r => r.status === 'SKIPPED' && r.reason === 'CONCURRENT_CAPTURE_IN_PROGRESS').length;
  
  assert.equal(created + skipped, 2);
  assert.equal(created, 1);
  assert.equal(skipped, 1);
});

test('V271 AutoCapture attemptAutoCapture skips when state insufficient', async () => {
  const emptyState = { assets: [] };
  const historyState = fixtureHistoryState();
  const config = PortfolioHistory.getDefaultConfig();
  
  const mockCapture = async () => { throw new Error('Should not be called'); };
  const mockAdd = () => { throw new Error('Should not be called'); };
  
  const result = await AutoCapture.attemptAutoCapture(emptyState, historyState, config, mockCapture, mockAdd);
  
  assert.equal(result.status, 'SKIPPED');
  assert.equal(result.reason, 'STATE_INSUFFICIENT_FOR_HONEST_SNAPSHOT');
});

test('V271 AutoCapture localDayBoundary handles local timezone', () => {
  // Test that local day boundary works correctly
  const iso = '2026-01-15T23:30:00.000Z'; // 23:30 UTC
  const boundary = AutoCapture.localDayBoundary(iso);
  // Should return local date (may be same or different depending on TZ)
  assert.ok(typeof boundary === 'string');
  assert.ok(boundary.match(/^\d{4}-\d{2}-\d{2}$/));
});

test('V271 AutoCapture daysBetween calculates calendar days correctly', () => {
  // Use explicit UTC timezone for deterministic test
  const days = AutoCapture.daysBetween('2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z', 0);
  assert.equal(days, 1);
  
  const days2 = AutoCapture.daysBetween('2026-01-01T23:00:00.000Z', '2026-01-02T01:00:00.000Z', 0);
  assert.equal(days2, 1); // Same UTC day boundary
});

// ===== SUFFICIENCY TESTS =====

test('V271 Sufficiency assessSufficiency returns NOT_STARTED for empty history', () => {
  const historyState = { snapshots: [], config: PortfolioHistory.getDefaultConfig() };
  const fullState = fixtureState();
  
  const result = Sufficiency.assessSufficiency(historyState, fullState);
  
  assert.equal(result.overallState, 'NOT_STARTED');
  assert.equal(result.snapshotCount, 0);
  assert.ok(result.warnings.some(w => w.includes('Histórico vazio')));
});

test('V271 Sufficiency assessSufficiency returns BUILDING for 1 snapshot', () => {
  const snap = { 
    id: '1', capturedAt: '2026-01-01T00:00:00.000Z', 
    source: 'MANUAL', priceCoverage: 'FULL_COVERAGE',
    valuations: { totalValue: 100, byAsset: [{ id: 'a1', ticker: 'ABCD3', quantity: 10, currentPrice: 10, value: 100 }] },
    provenance: { walletId: 'default', userId: 'test', captureReason: 'manual', extra: {} }
  };
  
  const historyState = { snapshots: [snap], config: PortfolioHistory.getDefaultConfig() };
  const fullState = fixtureState();
  
  const result = Sufficiency.assessSufficiency(historyState, fullState);
  
  assert.equal(result.overallState, 'BUILDING');
  assert.equal(result.snapshotCount, 1);
});

test('V271 Sufficiency assessSufficiency evaluates PORTFOLIO_EVOLUTION readiness', () => {
  // 2 snapshots, different days, FULL_COVERAGE
  const snaps = [
    { 
      id: '1', capturedAt: '2026-01-01T00:00:00.000Z', 
      source: 'MANUAL', priceCoverage: 'FULL_COVERAGE',
      valuations: { totalValue: 100, byAsset: [{ id: 'a1', ticker: 'ABCD3', quantity: 10, currentPrice: 10, value: 100 }] },
      provenance: { walletId: 'default', userId: 'test', captureReason: 'manual', extra: {} }
    },
    { 
      id: '2', capturedAt: '2026-01-02T00:00:00.000Z', 
      source: 'AUTO', priceCoverage: 'FULL_COVERAGE',
      valuations: { totalValue: 110, byAsset: [{ id: 'a1', ticker: 'ABCD3', quantity: 10, currentPrice: 11, value: 110 }] },
      provenance: { walletId: 'default', userId: 'test', captureReason: 'DAILY_BASELINE', extra: {} }
    }
  ];
  
  const historyState = { snapshots: snaps, config: PortfolioHistory.getDefaultConfig() };
  const fullState = fixtureState();
  
  const result = Sufficiency.assessSufficiency(historyState, fullState);
  
  const evolution = result.capabilities.find(c => c.capability === 'PORTFOLIO_EVOLUTION');
  assert.equal(evolution.ready, true);
});

test('V271 Sufficiency assessSufficiency evaluates ALLOCATION_HISTORY readiness', () => {
  const snaps = [
    { 
      id: '1', capturedAt: '2026-01-01T00:00:00.000Z', 
      source: 'MANUAL', priceCoverage: 'FULL_COVERAGE',
      valuations: { totalValue: 100, byAsset: [{ id: 'a1', ticker: 'ABCD3', quantity: 10, currentPrice: 10, value: 100 }] },
      provenance: { walletId: 'default', userId: 'test', captureReason: 'manual', extra: {} }
    },
    { 
      id: '2', capturedAt: '2026-01-02T00:00:00.000Z', 
      source: 'AUTO', priceCoverage: 'FULL_COVERAGE',
      valuations: { totalValue: 110, byAsset: [{ id: 'a1', ticker: 'ABCD3', quantity: 10, currentPrice: 11, value: 110 }] },
      provenance: { walletId: 'default', userId: 'test', captureReason: 'DAILY_BASELINE', extra: {} }
    }
  ];
  
  const historyState = { snapshots: snaps, config: PortfolioHistory.getDefaultConfig() };
  const fullState = fixtureState();
  
  const result = Sufficiency.assessSufficiency(historyState, fullState);
  
  const allocation = result.capabilities.find(c => c.capability === 'ALLOCATION_HISTORY');
  assert.equal(allocation.ready, true);
});

test('V271 Sufficiency assessSufficiency evaluates VALUATION_HISTORY readiness', () => {
  const snaps = [];
  const baseDate = new Date('2026-01-01T00:00:00.000Z');
  for (let i = 0; i < 10; i++) {
    const date = new Date(baseDate.getTime() + i * DAY_MS);
    snaps.push({
      id: String(i),
      capturedAt: date.toISOString(),
      source: i === 0 ? 'MANUAL' : 'AUTO',
      priceCoverage: 'FULL_COVERAGE',
      valuations: { totalValue: 100 + i, byAsset: [{ id: 'a1', ticker: 'ABCD3', quantity: 10, currentPrice: 10 + i * 0.1, value: 100 + i }] },
      provenance: { walletId: 'default', userId: 'test', captureReason: i === 0 ? 'manual' : 'DAILY_BASELINE', extra: {} }
    });
  }
  
  const historyState = { snapshots: snaps, config: PortfolioHistory.getDefaultConfig() };
  const fullState = fixtureState();
  
  const result = Sufficiency.assessSufficiency(historyState, fullState);
  
  const valuation = result.capabilities.find(c => c.capability === 'VALUATION_HISTORY');
  assert.equal(valuation.ready, true);
});

test('V271 Sufficiency assessSufficiency evaluates TWR readiness - needs external flows', () => {
  const snaps = [];
  const baseDate = new Date('2026-01-01T00:00:00.000Z');
  for (let i = 0; i < 40; i++) {
    const date = new Date(baseDate.getTime() + i * DAY_MS);
    snaps.push({
      id: String(i),
      capturedAt: date.toISOString(),
      source: i === 0 ? 'MANUAL' : 'AUTO',
      priceCoverage: 'FULL_COVERAGE',
      valuations: { totalValue: 100 + i, byAsset: [{ id: 'a1', ticker: 'ABCD3', quantity: 10, currentPrice: 10 + i * 0.1, value: 100 + i }] },
      provenance: { walletId: 'default', userId: 'test', captureReason: i === 0 ? 'manual' : 'DAILY_BASELINE', extra: {} }
    });
  }
  
  const historyState = { snapshots: snaps, config: PortfolioHistory.getDefaultConfig() };
  // fullState WITHOUT aportes (no external flows)
  const fullState = { 
    assets: fixtureState().assets,
    aportes: [], // No external contributions
    proventos: [],
    rfEvents: []
  };
  
  const result = Sufficiency.assessSufficiency(historyState, fullState);
  
  const twr = result.capabilities.find(c => c.capability === 'TWR');
  assert.equal(twr.ready, false);
  assert.ok(twr.missingPrerequisites.some(p => p.includes('external') || p.includes('flow') || p.includes('contrib')));
});

test('V271 Sufficiency assessSufficiency evaluates XIRR readiness - needs dated cash flows', () => {
  const snaps = [
    { 
      id: '1', capturedAt: '2026-01-01T00:00:00.000Z', 
      source: 'MANUAL', priceCoverage: 'FULL_COVERAGE',
      valuations: { totalValue: 100, byAsset: [{ id: 'a1', ticker: 'ABCD3', quantity: 10, currentPrice: 10, value: 100 }] },
      provenance: { walletId: 'default', userId: 'test', captureReason: 'manual', extra: {} }
    },
    { 
      id: '2', capturedAt: '2026-01-02T00:00:00.000Z', 
      source: 'AUTO', priceCoverage: 'FULL_COVERAGE',
      valuations: { totalValue: 110, byAsset: [{ id: 'a1', ticker: 'ABCD3', quantity: 10, currentPrice: 11, value: 110 }] },
      provenance: { walletId: 'default', userId: 'test', captureReason: 'DAILY_BASELINE', extra: {} }
    }
  ];
  
  const historyState = { snapshots: snaps, config: PortfolioHistory.getDefaultConfig() };
  const fullState = { 
    assets: fixtureState().assets,
    aportes: [], // No dated cash flows
    proventos: [],
    rfEvents: []
  };
  
  const result = Sufficiency.assessSufficiency(historyState, fullState);
  
  const xirr = result.capabilities.find(c => c.capability === 'XIRR');
  assert.equal(xirr.ready, false);
  assert.ok(xirr.missingPrerequisites.includes('dated cash flows'));
});

test('V271 Sufficiency priceCoverage analysis works correctly', () => {
  const snaps = [
    { priceCoverage: 'FULL_COVERAGE', provenance: { walletId: 'default' } },
    { priceCoverage: 'FULL_COVERAGE', provenance: { walletId: 'default' } },
    { priceCoverage: 'PARTIAL_COVERAGE', provenance: { walletId: 'default' } }
  ];
  
  const result = Sufficiency.analyzePriceCoverage(snaps);
  assert.equal(result.full, 2);
  assert.equal(result.partial, 1);
  assert.equal(result.unknown, 0);
  assert.equal(result.level, 'PARTIAL_COVERAGE');
  assert.equal(result.ratio, 2/3);
});

test('V271 Sufficiency dailyCoverage calculates gaps correctly', () => {
  const base = new Date('2026-01-01T00:00:00.000Z');
  const snaps = [
    { capturedAt: base.toISOString(), provenance: { walletId: 'default' } },
    { capturedAt: new Date(base.getTime() + 5 * DAY_MS).toISOString(), provenance: { walletId: 'default' } }, // 5 day gap (Jan 6)
    { capturedAt: new Date(base.getTime() + 6 * DAY_MS).toISOString(), provenance: { walletId: 'default' } }  // Jan 7
  ];
  
  const result = Sufficiency.analyzeDailyCoverage(snaps);
  assert.equal(result.observedDays, 3);
  assert.equal(result.expectedDays, 7); // Jan 1 to Jan 7 = 7 days
  assert.equal(result.largestGapDays, 5); // Gap from Jan 1 to Jan 6 = 5 days
});

test('V271 Sufficiency inventoryCashFlows categorizes sources', () => {
  const fullState = fixtureState();
  const result = Sufficiency.inventoryCashFlows(fullState);
  
  assert.equal(result.aportes.available, true);
  assert.equal(result.aportes.trustworthy, true);
  assert.equal(result.proventos.available, true);
  assert.equal(result.proventos.trustworthy, true);
  assert.equal(result.rfEvents.available, true);
  assert.equal(result.rfEvents.ambiguous, true);
});

test('V271 Sufficiency classifyCashFlowPrerequisites separates correctly', () => {
  const inventory = {
    aportes: { available: true, trustworthy: true, ambiguous: false },
    proventos: { available: true, trustworthy: true, ambiguous: false },
    rfEvents: { available: true, trustworthy: false, ambiguous: true },
    transactions: { available: false, trustworthy: false, ambiguous: false }
  };
  
  const result = Sufficiency.classifyCashFlowPrerequisites(inventory);
  assert.ok(result.trustworthyExternal.includes('aportes'));
  assert.ok(result.trustworthyExternal.includes('proventos'));
  assert.ok(result.ambiguous.includes('rfEvents'));
  assert.ok(result.unavailable.includes('transactions'));
});

test('V271 Sufficiency getSufficiencySummary provides readable output', () => {
  const historyState = { 
    snapshots: [{ capturedAt: '2026-01-01T00:00:00.000Z', priceCoverage: 'FULL_COVERAGE', provenance: { walletId: 'default' } }],
    config: PortfolioHistory.getDefaultConfig()
  };
  const fullState = fixtureState();
  
  const assessment = Sufficiency.assessSufficiency(historyState, fullState);
  const summary = Sufficiency.getSufficiencySummary(assessment);
  
  assert.ok(summary.overallState);
  assert.ok(Array.isArray(summary.readyCapabilities));
  assert.ok(Array.isArray(summary.notReadyCapabilities));
  assert.equal(summary.snapshotCount, 1);
});

// ===== REGRESSION: V268 CORE FUNCTIONS STILL WORK =====

test('V271 REGRESSION: PortfolioHistory.captureSnapshot still works', async () => {
  const state = fixtureState();
  const snap = await PortfolioHistory.captureSnapshot(state, { source: 'MANUAL', capturedAt: '2026-01-01T00:00:00.000Z' });
  assert.ok(snap.id);
  assert.equal(snap.source, 'MANUAL');
});

test('V271 REGRESSION: PortfolioHistory.shouldAutoCapture still works', async () => {
  const config = PortfolioHistory.getDefaultConfig();
  const historyState = { snapshots: [] };
  const should = await PortfolioHistory.shouldAutoCapture(historyState, config);
  assert.equal(should, true);
});

test('V271 REGRESSION: PortfolioHistory.addSnapshotToHistory maintains order', async () => {
  let historyState = fixtureHistoryState();
  const snap1 = await createSnapshot(fixtureState(), { capturedAt: '2026-01-01T00:00:00.000Z' });
  const snap2 = await createSnapshot(fixtureState(), { capturedAt: '2026-01-02T00:00:00.000Z' });
  
  historyState = PortfolioHistory.addSnapshotToHistory(historyState, snap1);
  historyState = PortfolioHistory.addSnapshotToHistory(historyState, snap2);
  
  assert.equal(historyState.snapshots[0].id, snap1.id);
  assert.equal(historyState.snapshots[1].id, snap2.id);
});