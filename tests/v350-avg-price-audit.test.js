const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// V350: synthetic audit of the legacy average-price engine (syncAssetsFromAportes).
// Runs the real extracted function in a VM sandbox with a minimal S. No real
// storage, no Firebase, purely in-memory fixtures.

const INDEX_HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractBlock(startMarker, endMarker) {
  const start = INDEX_HTML.indexOf(startMarker);
  assert.ok(start >= 0, `marker not found: ${startMarker}`);
  const end = INDEX_HTML.indexOf(endMarker, start);
  assert.ok(end > start, `end marker not found: ${endMarker}`);
  return INDEX_HTML.slice(start, end);
}

const syncFn = extractBlock('function syncAssetsFromAportes(', 'function qtyAtDate(');
const neutralMovementFn = extractBlock('function aporteMovementKind(', 'function aporteMovementLabel(');


function completeCoverage(ticker) {
  return { [ticker]: { __coverageRequest: true } };
}

function verifiedCoverage(ticker, movements) {
  return verifiedCoverageWithOpening(ticker, movements, 'NONE');
}

function verifiedCoverageWithOpening(ticker, movements, openingPosition) {
  const start = '2026-01-01';
  const end = '2026-12-31';
  const events = movements.filter(row => String(row.ticker).trim().toUpperCase() === ticker.toUpperCase()).map(row => ({
    id: String(row.id),
    type: ['venda', 'sell'].includes(String(row.operation || row.op || '').toLowerCase()) ? 'SALE' : 'PURCHASE',
    occurredOn: String(row.date),
    amount: Number(row.totalValue ?? row.value ?? Number(row.qty) * Number(row.price)),
    quantity: Number(row.qty),
    status: 'CONFIRMED',
  }));
  const openingEvidence = openingPosition === 'NONE'
    ? { semanticType: 'NO_OPENING_POSITION', coverageState: 'COMPLETE', assetIdentity: ticker,
        periodMembership: 'OPENING_COMPATIBLE', periodStart: start, periodEnd: end,
        occurredOn: '2025-12-31', noOpeningPositionCompatible: true }
    : { semanticType: 'OPENING_POSITION', coverageState: 'COMPLETE', assetIdentity: ticker,
        periodMembership: 'OPENING_COMPATIBLE', periodStart: start, periodEnd: end,
        occurredOn: '2025-12-31', openingPositionCompatible: true, positionQuantity: 100, quantityUnit: 'shares' };
  const sourceEvidence = [
    openingEvidence,
    ...events.map(event => ({ ...event, stableEventId: event.id, semanticType: event.type,
      assetIdentity: ticker, coverageState: 'COMPLETE', periodMembership: 'IN_PERIOD',
      periodStart: start, periodEnd: end })),
  ];
  const provenance = require('../financial-evidence-provenance.js');
  const registry = provenance.createRegistry(sourceEvidence.map((row, index) => ({
    ...row,
    sourceKind: 'SYNTHETIC_TEST', sourceId: 'synthetic-ledger',
    stableEventId: row.stableEventId || `opening-${index}`,
    authority: 'SYNTHETIC_TEST',
    status: row.semanticType === 'NO_OPENING_POSITION' ? 'OBSERVED' : (row.semanticType === 'OPENING_POSITION' ? 'OBSERVED' : 'CONFIRMED'),
    duplicateState: 'NONE', conflictState: 'NONE',
    positionQuantity: row.semanticType === 'NO_OPENING_POSITION' ? 0 : (row.semanticType === 'OPENING_POSITION' ? row.positionQuantity || 100 : undefined),
    quantityUnit: row.semanticType === 'NO_OPENING_POSITION' ? 'shares' : (row.semanticType === 'OPENING_POSITION' ? 'shares' : undefined),
    compatibleWithPeriod: row.semanticType === 'NO_OPENING_POSITION' || row.semanticType === 'OPENING_POSITION',
  })), { duplicatesResolved: true, sourceOverlapResolved: true });
  const result = require('../historical-coverage-engine.js').evaluateCoverage({
    historyEvidence: { status: 'COMPLETE', periodStart: start, periodEnd: end, openingPosition,
      allEventsRepresented: true, duplicatesResolved: true, sourceOverlapResolved: true },
    registry,
    componentCoverage: { contributions: 'COMPLETE', costBasis: 'COMPLETE' }, subjectIdentity: ticker, subjectPresent: true,
    expectedEvents: events, observedEvents: events,
  });
  return result.coverage;
}

function buildSandbox(aportes, assets = [], coverageByTicker = {}) {
  coverageByTicker = Object.fromEntries(Object.entries(coverageByTicker).map(([ticker, request]) => [
    ticker, request?.__coverageRequest ? verifiedCoverage(ticker, aportes) : request,
  ]));
  const S = { aportes, assets };
  const engine = require('../historical-coverage-engine.js');
  const sandbox = {
    S,
    coverageByTicker,
    parseAnyDate: value => {
      if (!value) return null;
      const [y, m, d] = String(value).split('-').map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    },
    toISODate: value => value instanceof Date ? value.toISOString().slice(0, 10) : String(value),
    parseNum: value => { const n = Number(String(value ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; },
    cleanAssetCode: value => String(value || '').trim().toUpperCase(),
    normalizeType: (value, fallback) => String(value || fallback || 'Ação').trim(),
    isReconciliationPendingMovement: row => String(row?.reconciliationStatus||'').trim().toUpperCase()==='PENDING_RECONCILIATION',
    metaTicker: () => ({ type: 'Ação', sector: '' }),
    learnedMetaFor: () => null,
    learnTickerMeta: () => {},
    isProtectedReadOnlyQaBoot: () => false,
    isLocalTestReadOnlyMode: () => false,
    window: { HistoricalCoverageEngine: engine, ProtectedRfReconstruction: null, __V76_RUNTIME_STATUS__: null },
    toast: () => {},
    autoDY: () => {},
    render: () => {},
    save: () => {},
    rfPositionImportSourceTag: () => '',
    Date, Math, Number, String, Object, Array, JSON,
  };
  vm.createContext(sandbox);
  vm.runInContext(neutralMovementFn, sandbox);
  vm.runInContext(syncFn, sandbox);
  return { S, run: () => vm.runInContext('syncAssetsFromAportes(false,false,coverageByTicker);', sandbox) };
}

test('V350: two buys at different prices produce weighted average cost', () => {
  const { S, run } = buildSandbox([
    { id: 1, date: '2026-01-10', ticker: 'TEST4', operation: 'compra', qty: 100, price: 10 },
    { id: 2, date: '2026-02-10', ticker: 'TEST4', operation: 'compra', qty: 100, price: 20 },
  ], [], completeCoverage('TEST4'));
  run();
  const a = S.assets.find(x => x.ticker === 'TEST4');
  assert.ok(a, 'asset missing after buys');
  assert.equal(a.qty, 200);
  assert.ok(Math.abs(a.avg_price - 15) < 1e-9, `weighted avg expected 15, got ${a.avg_price}`);
});

test('V350: partial sale keeps remaining unit average cost unchanged', () => {
  const { S, run } = buildSandbox([
    { id: 1, date: '2026-01-10', ticker: 'TEST4', operation: 'compra', qty: 100, price: 10 },
    { id: 2, date: '2026-02-10', ticker: 'TEST4', operation: 'compra', qty: 100, price: 20 },
    { id: 3, date: '2026-03-10', ticker: 'TEST4', operation: 'venda', qty: 100, price: 25 },
  ], [], completeCoverage('TEST4'));
  run();
  const a = S.assets.find(x => x.ticker === 'TEST4');
  assert.equal(a.qty, 100);
  assert.ok(Math.abs(a.avg_price - 15) < 1e-9, `partial sale must not change remaining unit cost; expected 15, got ${a.avg_price}`);
});

test('V350: full sale removes the position; rebuy starts fresh cost basis', () => {
  const { S, run } = buildSandbox([
    { id: 1, date: '2026-01-10', ticker: 'TEST4', operation: 'compra', qty: 100, price: 10 },
    { id: 2, date: '2026-02-10', ticker: 'TEST4', operation: 'venda', qty: 100, price: 12 },
    { id: 3, date: '2026-03-10', ticker: 'TEST4', operation: 'compra', qty: 50, price: 30 },
  ], [], completeCoverage('TEST4'));
  run();
  const a = S.assets.find(x => x.ticker === 'TEST4');
  assert.ok(a, 'asset missing after rebuy');
  assert.equal(a.qty, 50);
  assert.ok(Math.abs(a.avg_price - 30) < 1e-9, `rebuy cost basis must be fresh; expected 30, got ${a.avg_price}`);
});

test('V350: same-date operations follow insertion order; sell clamps to available qty', () => {
  const { S, run } = buildSandbox([
    { id: 1, date: '2026-01-10', ticker: 'TEST4', operation: 'compra', qty: 10, price: 10 },
    { id: 2, date: '2026-01-10', ticker: 'TEST4', operation: 'venda', qty: 4, price: 11 },
    { id: 3, date: '2026-01-10', ticker: 'TEST4', operation: 'venda', qty: 99, price: 11 }, // over-sell clamped
  ], [], completeCoverage('TEST4'));
  run();
  // over-sell clamps at available qty; combined sells (4 + 99 clamped to 6)
  // consume the whole position, so the fully sold ticker is removed entirely.
  assert.equal(S.assets.filter(x => x.ticker === 'TEST4').length, 0, 'fully sold asset must be removed');
});

test('V350: unverified imported price history cannot recalculate or overwrite positions', () => {
  const { S, run } = buildSandbox([
    { id: 1, date: '2026-01-10', ticker: 'TEST4', operation: 'compra', qty: 100, price: 10, source:'B3 Movimentação' },
    { id: 2, date: '2026-02-10', ticker: 'TEST4', operation: 'compra', qty: 50, source:'B3 Movimentação' }, // no price field
  ], [{ id:42, ticker:'TEST4', type:'Ação', qty:100, avg_price:15, current_price:22 }]);
  run();
  const a = S.assets.find(x => x.ticker === 'TEST4');
  assert.equal(a.qty,100);
  assert.equal(a.avg_price,15);
});

test('V350: unverified imported history preserves an unknown opening position', () => {
  const { S, run } = buildSandbox([
    { id: 2, date: '2026-02-10', ticker: 'TEST4', operation: 'compra', qty: 10, price: 20, source:'Nota de corretagem' },
  ], [{ id: 42, ticker: 'TEST4', type: 'Ação', qty: 100, avg_price: 15, current_price: 22 }]);
  run();
  const a = S.assets.find(x => x.ticker === 'TEST4');
  assert.equal(a.qty, 100);
  assert.equal(a.avg_price, 15);
});

test('V350: incomplete imported history preserves only its asset and does not block unrelated recalculation', () => {
  const { S, run } = buildSandbox([
    { id: 1, date: '2026-01-10', ticker: 'IMPORTED3', operation: 'compra', qty: 2, price: 10, source: 'B3 Movimentação' },
    { id: 2, date: '2026-01-11', ticker: 'MANUAL3', operation: 'compra', qty: 3, price: 20 },
  ], [
    { id: 41, ticker: 'IMPORTED3', type: 'Ação', qty: 7, avg_price: 12, current_price: 14 },
  ], completeCoverage('MANUAL3'));
  const result = run();
  assert.equal(JSON.stringify(S.assets.find(x => x.ticker === 'IMPORTED3')), JSON.stringify({
    id: 41, ticker: 'IMPORTED3', type: 'Ação', qty: 7, avg_price: 12, current_price: 14,
  }));
  const manual = S.assets.find(x => x.ticker === 'MANUAL3');
  assert.equal(manual.qty, 3);
  assert.equal(manual.avg_price, 20);
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.coverage.IMPORTED3.status, 'PARTIAL');
  assert.ok(result.coverage.IMPORTED3.blockers.includes('HISTORY_COVERAGE_UNPROVEN'));
});

test('V350: missing opening proof cannot create a new position from source-less history', () => {
  const { S, run } = buildSandbox([
    { id: 1, date: '2026-01-10', ticker: 'LEGACY3', operation: 'compra', qty: 4, price: 12 },
  ]);
  const result = run();
  assert.equal(S.assets.some(asset => asset.ticker === 'LEGACY3'), false);
  assert.equal(result.coverage.LEGACY3.status, 'PARTIAL');
});
test('V350: missing price preserves current position instead of becoming zero cost', () => {
  const { S, run } = buildSandbox([
    { id: 1, date: '2026-01-10', ticker: 'MISSING3', operation: 'compra', qty: 2 },
  ], [{ id: 43, ticker: 'MISSING3', type: 'Ação', qty: 9, avg_price: 15, current_price: 18 }]);
  run();
  const asset = S.assets.find(x => x.ticker === 'MISSING3');
  assert.equal(asset.qty, 9);
  assert.equal(asset.avg_price, 15);
});

test('V350: manual confirmation is not an evidence source for cost-basis completeness', () => {
  assert.doesNotMatch(INDEX_HTML, /confirmImportedCostBasisCompleteness/);
  assert.match(INDEX_HTML, /HISTORY_COVERAGE_UNPROVEN/);
});

test('V350: transfers, splits and corporate events do not create purchase cost in this sync', () => {
  const { S, run } = buildSandbox([
    { id: 1, date: '2026-01-10', ticker: 'TEST4', operation: 'compra', qty: 10, price: 10 },
    { id: 2, date: '2026-02-10', ticker: 'TEST4', operation: 'outro', movement: 'transferência', qty: 10, price: 10 },
    { id: 3, date: '2026-03-10', ticker: 'TEST4', operation: 'outro', movement: 'desdobramento', qty: 10, price: 0 },
    { id: 4, date: '2026-04-10', ticker: 'TEST4', operation: 'outro', movement: 'evento corporativo', qty: 10, price: 0 },
  ], [{ id: 54, ticker: 'TEST4', type: 'Ação', qty: 10, avg_price: 10, current_price: 15 }]);
  run();
  const a = S.assets.find(x => x.ticker === 'TEST4');
  assert.equal(a.qty, 10, 'ambiguous non-trade events do not change consolidated quantity');
  assert.equal(a.avg_price, 10, 'ambiguous non-trade events do not change cost basis');
});

test('V350: blocked duplicate positions with the same normalized ticker are all preserved', () => {
  const { S, run } = buildSandbox([], [
    { id: 51, ticker: 'DUP3', type: 'Ação', qty: 10, avg_price: 11 },
    { id: 52, ticker: ' DUP3 ', type: 'Ação', qty: 20, avg_price: 12 },
  ]);
  run();
  assert.equal(Array.from(S.assets, asset => asset.id).sort().join(','), '51,52');
});

test('V350: manual RF authority cannot merge distinct positions sharing a normalized ticker', () => {
  const ticker = 'CDB QA';
  const { S, run } = buildSandbox([
    { id: 1, date: '2026-01-01', ticker, operation: 'compra', qty: 1, price: 100, type: 'Renda Fixa', source: 'manual-rf', rf_applied_value: 100, rf_liquid_value: 100 },
  ], [
    { id: 51, ticker, type: 'Renda Fixa', qty: 1, avg_price: 100, source: 'manual-rf' },
    { id: 52, ticker: ` ${ticker} `, type: 'Renda Fixa', qty: 2, avg_price: 200, source: 'manual-rf' },
  ]);
  const result = run();
  assert.deepEqual(Array.from(S.assets, asset => asset.id).sort(), [51, 52]);
  assert.ok(result.coverage[ticker].blockers.includes('ASSET_IDENTITY_AMBIGUOUS'));
});
test('V350: unverified manual RF sale preserves the existing position pending reconciliation', () => {
  const ticker = 'CDB QA';
  const { S, run } = buildSandbox([
    { id: 1, date: '2026-01-01', ticker, operation: 'compra', qty: 1, price: 100, type: 'Renda Fixa', source: 'manual-rf', rf_applied_value: 100, rf_liquid_value: 100 },
    { id: 2, date: '2026-02-01', ticker, operation: 'venda', qty: 1, price: 100, type: 'Renda Fixa', source: 'manual-rf', rf_applied_value: 100, rf_liquid_value: 100 },
  ], [{ id: 53, ticker, type: 'Renda Fixa', qty: 1, avg_price: 100, source: 'manual-rf' }]);
  const result = run();
  assert.equal(S.assets.find(asset => asset.ticker === ticker)?.id, 53);
  assert.equal(S.assets.find(asset => asset.ticker === ticker)?.qty, 1);
  assert.ok(result.coverage[ticker].blockers.includes('HISTORY_COVERAGE_UNPROVEN'));
});
test('V350: pending sale blocks synchronization and preserves the complete existing position object', () => {
  const ticker = 'PEND3';
  const existing = { id: 54, ticker, type: 'Ação', qty: 12, avg_price: 17.5, current_price: 20 };
  const { S, run } = buildSandbox([
    { id: 9, date: '2026-03-01', ticker, operation: 'venda', qty: 2, price: 20, reconciliationStatus: 'PENDING_RECONCILIATION' },
  ], [existing], completeCoverage(ticker));
  const result = run();
  assert.deepEqual(JSON.parse(JSON.stringify(S.assets[0])), existing);
  assert.ok(result.coverage[ticker].blockers.includes('PENDING_RECONCILIATION'));
  assert.equal(result.recalculatedTickers.includes(ticker), false);
});
test('V350: legacy asset fields without avg keep imported positions without inventing cost', () => {
  const { S, run } = buildSandbox([], [{
    id: 42, ticker: 'IMP4', type: 'Ação', qty: 10, avg_price: 0, current_price: 12,
  }]);
  run();
  const a = S.assets.find(x => x.ticker === 'IMP4');
  // no aportes for the ticker: grouped is empty and the imported asset is not
  // rebuilt by the sync — imported positions pass through untouched.
  assert.ok(!a || (a.qty === 10 && a.avg_price === 0), 'imported position must not gain invented cost');
});

test('V350: known opening position with complete coverage allows recalculation (A-01)', () => {
  const { S, run } = buildSandbox([
    { id: 1, date: '2026-01-10', ticker: 'KNOWN4', operation: 'compra', qty: 100, price: 10 },
    { id: 2, date: '2026-02-10', ticker: 'KNOWN4', operation: 'compra', qty: 100, price: 20 },
  ], [{ id: 42, ticker: 'KNOWN4', type: 'Ação', qty: 100, avg_price: 10, current_price: 15 }], {
    KNOWN4: verifiedCoverageWithOpening('KNOWN4', [
      { id: 1, date: '2026-01-10', ticker: 'KNOWN4', operation: 'compra', qty: 100, price: 10 },
      { id: 2, date: '2026-02-10', ticker: 'KNOWN4', operation: 'compra', qty: 100, price: 20 },
    ], 'KNOWN'),
  });
  const result = run();
  const a = S.assets.find(x => x.ticker === 'KNOWN4');
  assert.ok(a, 'known opening position with complete coverage must be recalculated');
  assert.equal(a.qty, 200);
  assert.ok(Math.abs(a.avg_price - 15) < 1e-9, `weighted avg expected 15, got ${a.avg_price}`);
  assert.equal(result.recalculatedTickers.includes('KNOWN4'), true);
});

test('V350: known opening position without complete coverage blocks recalculation (A-01)', () => {
  const { S, run } = buildSandbox([
    { id: 1, date: '2026-01-10', ticker: 'PARTIAL4', operation: 'compra', qty: 100, price: 10 },
  ], [{ id: 43, ticker: 'PARTIAL4', type: 'Ação', qty: 100, avg_price: 10, current_price: 15 }], {
    PARTIAL4: verifiedCoverageWithOpening('PARTIAL4', [], 'KNOWN'),
  });
  const result = run();
  const a = S.assets.find(x => x.ticker === 'PARTIAL4');
  assert.equal(a.qty, 100, 'incomplete coverage must preserve existing quantity');
  assert.equal(a.avg_price, 10, 'incomplete coverage must preserve existing average cost');
  assert.equal(result.recalculatedTickers.includes('PARTIAL4'), false);
});

test('V350: unknown opening position blocks recalculation (A-01 fail-closed)', () => {
  const { S, run } = buildSandbox([
    { id: 1, date: '2026-01-10', ticker: 'UNKNOWN4', operation: 'compra', qty: 100, price: 10 },
  ], [{ id: 44, ticker: 'UNKNOWN4', type: 'Ação', qty: 100, avg_price: 10, current_price: 15 }], {
    UNKNOWN4: verifiedCoverageWithOpening('UNKNOWN4', [], 'UNKNOWN'),
  });
  const result = run();
  const a = S.assets.find(x => x.ticker === 'UNKNOWN4');
  assert.equal(a.qty, 100, 'unknown opening position must preserve existing quantity');
  assert.equal(a.avg_price, 10, 'unknown opening position must preserve existing average cost');
  assert.equal(result.recalculatedTickers.includes('UNKNOWN4'), false);
});
