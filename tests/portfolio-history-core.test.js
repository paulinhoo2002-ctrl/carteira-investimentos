const test = require('node:test');
const assert = require('node:assert/strict');
const PortfolioHistory = require('../portfolio-history-core.js');

const DAY_MS = 86400000;

function dateMs(dateStr) {
  const ms = Date.parse(dateStr);
  return Number.isFinite(ms) ? ms : null;
}

function fixtureState() {
  return {
    wallets: [{ id: 'w1', name: 'Principal' }],
    activeWalletId: 'w1',
    assets: [
      { id: 'a1', ticker: 'ABCD3', qty: 10, current_price: 12.34 },
      { id: 'a2', ticker: 'EFGH4', qty: 5, current_price: 25.00 }
    ],
    aportes: [{ id: 'm1', date: '2026-01-02', value: 1000 }],
    proventos: [{ id: 'i1', date: '2026-02-03', value: 12.5, type: 'DIVIDEND' }],
    rfEvents: [{ id: 'rf1', value: 5000, manual: true }],
    goals: { patrimonio: { target: 100000 } }
  };
}

function fixtureHistoryState() {
  return {
    snapshots: [],
    config: PortfolioHistory.getDefaultConfig()
  };
}

test('V268 captureSnapshot produces deterministic output', async () => {
  const state = fixtureState();
  const fixedTime = '2026-09-25T12:00:00.000Z';
  const a = await PortfolioHistory.captureSnapshot(state, { source: 'MANUAL', captureReason: 'test', capturedAt: fixedTime });
  const b = await PortfolioHistory.captureSnapshot(state, { source: 'MANUAL', captureReason: 'test', capturedAt: fixedTime });

  // Same input should produce same contentHash
  assert.equal(a.contentHash, b.contentHash);
  assert.equal(a.valuations.totalValue, b.valuations.totalValue);
  assert.equal(JSON.stringify(a.valuations.byAsset), JSON.stringify(b.valuations.byAsset));
  assert.equal(a.priceCoverage, b.priceCoverage);

  // But different IDs (different captures)
  assert.notEqual(a.id, b.id);
  assert.equal(a.capturedAt, fixedTime);
  assert.equal(b.capturedAt, fixedTime);
});

test('V268 captureSnapshot includes all required fields', async () => {
  const state = fixtureState();
  const snap = await PortfolioHistory.captureSnapshot(state, { source: 'AUTO', captureReason: 'scheduled' });

  assert.equal(snap.format, 'carteira-portfolio-history');
  assert.equal(snap.version, '1.0');
  assert.ok(snap.id);
  assert.ok(snap.capturedAt);
  assert.equal(snap.source, 'AUTO');
  assert.ok(snap.provenance);
  assert.equal(snap.provenance.captureReason, 'scheduled');
  assert.ok(snap.valuations);
  assert.ok(snap.valuations.totalValue);
  assert.ok(Array.isArray(snap.valuations.byAsset));
  assert.ok(['FULL_COVERAGE', 'PARTIAL_COVERAGE', 'UNKNOWN'].includes(snap.priceCoverage));
  assert.ok(snap.contentHash);
  assert.equal(snap.schemaVersion, 'portfolio-history-v1.0');
});

test('V268 captureSnapshot rejects invalid source', async () => {
  const state = fixtureState();
  await assert.rejects(
    PortfolioHistory.captureSnapshot(state, { source: 'INVALID' }),
    /INVALID_SOURCE/
  );
});

test('V268 captureSnapshot validates price coverage', async () => {
  // State with prices
  const stateWithPrices = fixtureState();
  const snap1 = await PortfolioHistory.captureSnapshot(stateWithPrices);
  assert.equal(snap1.priceCoverage, 'FULL_COVERAGE');

  // State without prices
  const stateWithoutPrices = {
    ...fixtureState(),
    assets: [
      { id: 'a1', ticker: 'ABCD3', qty: 10 }, // no current_price
      { id: 'a2', ticker: 'EFGH4', qty: 5, current_price: 25.00 }
    ]
  };
  const snap2 = await PortfolioHistory.captureSnapshot(stateWithoutPrices);
  assert.equal(snap2.priceCoverage, 'PARTIAL_COVERAGE');

  // Empty state
  const emptyState = { ...fixtureState(), assets: [] };
  const snap3 = await PortfolioHistory.captureSnapshot(emptyState);
  assert.equal(snap3.priceCoverage, 'UNKNOWN');
});

test('V268 getSnapshots returns sorted and filtered results', () => {
  const historyState = {
    snapshots: [
      { id: '1', capturedAt: '2026-01-01T00:00:00.000Z', source: 'MANUAL' },
      { id: '2', capturedAt: '2026-01-02T00:00:00.000Z', source: 'AUTO' },
      { id: '3', capturedAt: '2026-01-03T00:00:00.000Z', source: 'MANUAL' },
      { id: '4', capturedAt: '2026-01-04T00:00:00.000Z', source: 'IMPORT' }
    ]
  };

  // Default: descending by date (newest first)
  const all = PortfolioHistory.getSnapshots(historyState);
  assert.equal(all.length, 4);
  assert.equal(all[0].id, '4'); // newest
  assert.equal(all[3].id, '1'); // oldest

  // Filter by source
  const manual = PortfolioHistory.getSnapshots(historyState, { source: 'MANUAL' });
  assert.equal(manual.length, 2);
  assert.ok(manual.every(s => s.source === 'MANUAL'));

  // Filter by since
  const since = PortfolioHistory.getSnapshots(historyState, { since: '2026-01-03' });
  assert.equal(since.length, 2);
  assert.ok(since.every(s => s.capturedAt >= '2026-01-03'));

  // Limit
  const limited = PortfolioHistory.getSnapshots(historyState, { limit: 2 });
  assert.equal(limited.length, 2);
  assert.equal(limited[0].id, '4');
});

test('V268 deduplicateSnapshots removes duplicates by contentHash', () => {
  const snapshots = [
    { id: '1', contentHash: 'abc123', capturedAt: '2026-01-01' },
    { id: '2', contentHash: 'abc123', capturedAt: '2026-01-02' }, // duplicate
    { id: '3', contentHash: 'def456', capturedAt: '2026-01-03' },
    { id: '4', contentHash: 'def456', capturedAt: '2026-01-04' }, // duplicate
  ];

  const unique = PortfolioHistory.deduplicateSnapshots(snapshots);
  assert.equal(unique.length, 2);
  assert.ok(unique.some(s => s.contentHash === 'abc123'));
  assert.ok(unique.some(s => s.contentHash === 'def456'));
});

test('V268 pruneSnapshots applies age and count limits', () => {
  const now = new Date();
  const snapshots = Array.from({ length: 10 }, (_, i) => {
    const date = new Date(now.getTime() - (9 - i) * 2 * DAY_MS); // oldest first
    return { id: String(i), capturedAt: date.toISOString() };
  });

  const pruned = PortfolioHistory.pruneSnapshots(snapshots, { maxSnapshots: 5, maxAgeDays: 30 });
  assert.equal(pruned.length, 5);
  // Chronological storage order: oldest first (ids 5-9)
  assert.equal(pruned[0].id, '5'); // oldest retained
  assert.equal(pruned[4].id, '9'); // newest retained
  // Explicit chronological order check
  for (let i = 1; i < pruned.length; i++) {
    assert.ok(dateMs(pruned[i].capturedAt) >= dateMs(pruned[i-1].capturedAt),
      `Snapshots must be chronological: ${pruned[i-1].id} -> ${pruned[i].id}`);
  }
});

test('V268 pruneSnapshots removes old snapshots', () => {
  const now = new Date();
  const snapshots = [
    { id: 'old', capturedAt: new Date(now.getTime() - 400 * DAY_MS).toISOString() }, // > 365 days
    { id: 'recent', capturedAt: new Date(now.getTime() - 10 * DAY_MS).toISOString() }
  ];

  const pruned = PortfolioHistory.pruneSnapshots(snapshots, { maxAgeDays: 365 });
  assert.equal(pruned.length, 1);
  assert.equal(pruned[0].id, 'recent');
});

test('V268 validateSnapshot catches invalid snapshots', () => {
  const validSnap = {
    format: 'carteira-portfolio-history',
    version: '1.0',
    id: 'test',
    capturedAt: '2026-01-01T00:00:00.000Z',
    source: 'MANUAL',
    provenance: { userId: 'u1', walletId: 'w1', captureReason: 'test' },
    valuations: { totalValue: 100, byAsset: [] },
    priceCoverage: 'FULL_COVERAGE',
    contentHash: 'abc123',
    schemaVersion: 'portfolio-history-v1.0'
  };

  assert.equal(PortfolioHistory.validateSnapshot(validSnap), null);

  // Missing format
  const noFormat = { ...validSnap };
  delete noFormat.format;
  assert.ok(PortfolioHistory.validateSnapshot(noFormat).includes('INVALID_FORMAT'));

  // Invalid priceCoverage
  const badCoverage = { ...validSnap, priceCoverage: 'INVALID' };
  assert.ok(PortfolioHistory.validateSnapshot(badCoverage).includes('INVALID_PRICE_COVERAGE'));
});

test('V268 computeValuations derives correct totals', () => {
  const state = fixtureState();
  const vals = PortfolioHistory.computeValuations(state);

  // ABCD3: 10 * 12.34 = 123.4
  // EFGH4: 5 * 25.00 = 125.0
  // Total = 248.4
  assert.equal(vals.totalValue, 248.4);
  assert.equal(vals.byAsset.length, 2);
  assert.equal(vals.byAsset[0].ticker, 'ABCD3');
  assert.equal(vals.byAsset[0].value, 123.4);
  assert.equal(vals.byAsset[1].value, 125.0);
});

test('V268 shouldAutoCapture respects interval', async () => {
  const config = PortfolioHistory.getDefaultConfig();
  const historyState = { snapshots: [] };

  // No snapshots -> should capture
  assert.ok(await PortfolioHistory.shouldAutoCapture(historyState, config));

  // Snapshot just captured (0 days ago - few milliseconds)
  const recentHistory = {
    snapshots: [{ capturedAt: new Date(Date.now() - 10).toISOString() }]
  };
  assert.ok(!await PortfolioHistory.shouldAutoCapture(recentHistory, config));

  // Snapshot 2 days ago with 1-day interval
  const oldHistory = {
    snapshots: [{
      capturedAt: new Date(Date.now() - 2 * DAY_MS).toISOString()
    }]
  };
  assert.ok(await PortfolioHistory.shouldAutoCapture(oldHistory, config));
});

test('V268 addSnapshotToHistory maintains order and prunes', async () => {
  let historyState = fixtureHistoryState();

  // Add first snapshot with fixed time
  const snap1 = await PortfolioHistory.captureSnapshot(fixtureState(), { source: 'MANUAL', capturedAt: '2026-01-01T00:00:00.000Z' });
  historyState = PortfolioHistory.addSnapshotToHistory(historyState, snap1);
  assert.equal(historyState.snapshots.length, 1);

  // Add second (different state -> different content hash) with later fixed time
  const state2 = { ...fixtureState(), assets: [...fixtureState().assets, { id: 'a3', ticker: 'IJKL5', qty: 3, current_price: 50 }] };
  const snap2 = await PortfolioHistory.captureSnapshot(state2, { source: 'AUTO', capturedAt: '2026-01-02T00:00:00.000Z' });
  historyState = PortfolioHistory.addSnapshotToHistory(historyState, snap2);
  assert.equal(historyState.snapshots.length, 2);
  // Oldest first (chronological order)
  assert.equal(historyState.snapshots[0].id, snap1.id);
  assert.equal(historyState.snapshots[1].id, snap2.id);
});

test('V268 getDefaultConfig returns valid config', () => {
  const config = PortfolioHistory.getDefaultConfig();
  assert.ok(PortfolioHistory.validateConfig(config));
  assert.ok(config.autoCaptureEnabled);
  assert.equal(config.captureIntervalDays, 1);
  assert.equal(config.maxSnapshots, 3650);
  assert.equal(config.maxAgeDays, 3650);
  assert.ok(config.dedupEnabled);
});

test('V268 validateConfig rejects invalid config', () => {
  assert.ok(!PortfolioHistory.validateConfig(null));
  assert.ok(!PortfolioHistory.validateConfig({}));
  assert.ok(!PortfolioHistory.validateConfig({ autoCaptureEnabled: 'yes' }));
  assert.ok(!PortfolioHistory.validateConfig({ captureIntervalDays: 0 }));
  assert.ok(!PortfolioHistory.validateConfig({ maxSnapshots: -1 }));
  assert.ok(!PortfolioHistory.validateConfig({ maxAgeDays: 0 }));
  assert.ok(!PortfolioHistory.validateConfig({ dedupEnabled: 'maybe' }));
});

// ===== ORDERING REGRESSION TESTS =====

test('V268 storage order is chronological (oldest first)', async () => {
  let historyState = fixtureHistoryState();
  const fixedTimes = [
    '2026-01-01T00:00:00.000Z',
    '2026-01-02T00:00:00.000Z',
    '2026-01-03T00:00:00.000Z'
  ];

  for (const t of fixedTimes) {
    const snap = await PortfolioHistory.captureSnapshot(fixtureState(), { capturedAt: t });
    historyState = PortfolioHistory.addSnapshotToHistory(historyState, snap);
  }

  // Storage is oldest-first
  assert.equal(historyState.snapshots[0].capturedAt, fixedTimes[0]);
  assert.equal(historyState.snapshots[1].capturedAt, fixedTimes[1]);
  assert.equal(historyState.snapshots[2].capturedAt, fixedTimes[2]);

  // Verify monotonic
  for (let i = 1; i < historyState.snapshots.length; i++) {
    assert.ok(dateMs(historyState.snapshots[i].capturedAt) >= dateMs(historyState.snapshots[i-1].capturedAt));
  }
});

test('V268 getSnapshots display order is newest-first by default', async () => {
  let historyState = fixtureHistoryState();
  const fixedTimes = [
    '2026-01-01T00:00:00.000Z',
    '2026-01-02T00:00:00.000Z',
    '2026-01-03T00:00:00.000Z'
  ];

  for (const t of fixedTimes) {
    const snap = await PortfolioHistory.captureSnapshot(fixtureState(), { capturedAt: t });
    historyState = PortfolioHistory.addSnapshotToHistory(historyState, snap);
  }

  // getSnapshots returns newest-first
  const displayed = PortfolioHistory.getSnapshots(historyState);
  assert.equal(displayed[0].capturedAt, fixedTimes[2]); // newest
  assert.equal(displayed[1].capturedAt, fixedTimes[1]);
  assert.equal(displayed[2].capturedAt, fixedTimes[0]); // oldest
});

test('V268 pruneSnapshots preserves chronological storage order', () => {
  const now = new Date();
  const snapshots = Array.from({ length: 10 }, (_, i) => {
    const date = new Date(now.getTime() - (9 - i) * 2 * DAY_MS); // oldest first
    return { id: String(i), capturedAt: date.toISOString() };
  });

  const pruned = PortfolioHistory.pruneSnapshots(snapshots, { maxSnapshots: 5, maxAgeDays: 30 });

  // Output is chronological (oldest first)
  for (let i = 1; i < pruned.length; i++) {
    assert.ok(dateMs(pruned[i].capturedAt) >= dateMs(pruned[i-1].capturedAt),
      `pruneSnapshots output must be chronological: ${pruned[i-1].id} -> ${pruned[i].id}`);
  }
  // Retained IDs 5..9 in order
  assert.equal(pruned[0].id, '5');
  assert.equal(pruned[4].id, '9');
});

test('V268 addSnapshotToHistory preserves chronological storage after dedup/prune', async () => {
  let historyState = fixtureHistoryState();

  // Add 3 snapshots with fixed times
  const times = [
    '2026-01-01T00:00:00.000Z',
    '2026-01-02T00:00:00.000Z',
    '2026-01-03T00:00:00.000Z'
  ];
  const snaps = [];
  for (const t of times) {
    snaps.push(await PortfolioHistory.captureSnapshot(fixtureState(), { capturedAt: t }));
  }

  for (const s of snaps) {
    historyState = PortfolioHistory.addSnapshotToHistory(historyState, s);
  }

  // Verify chronological storage
  assert.equal(historyState.snapshots.length, 3);
  assert.equal(historyState.snapshots[0].id, snaps[0].id);
  assert.equal(historyState.snapshots[1].id, snaps[1].id);
  assert.equal(historyState.snapshots[2].id, snaps[2].id);

  // Add duplicate (same content -> different time but same state = same hash)
  const dupSnap = await PortfolioHistory.captureSnapshot(fixtureState(), { capturedAt: times[1] });
  historyState = PortfolioHistory.addSnapshotToHistory(historyState, dupSnap);
  // Should still be 3 (dedup removed the duplicate)
  assert.equal(historyState.snapshots.length, 3);

  // Add new unique snapshot
  const state2 = { ...fixtureState(), assets: [...fixtureState().assets, { id: 'a3', ticker: 'IJKL5', qty: 3, current_price: 50 }] };
  const snap4 = await PortfolioHistory.captureSnapshot(state2, { capturedAt: '2026-01-04T00:00:00.000Z' });
  historyState = PortfolioHistory.addSnapshotToHistory(historyState, snap4);
  assert.equal(historyState.snapshots.length, 4);
  // Chronological order maintained
  assert.equal(historyState.snapshots[3].id, snap4.id);

  // getSnapshots still returns newest-first
  const displayed = PortfolioHistory.getSnapshots(historyState);
  assert.equal(displayed[0].id, snap4.id);
});