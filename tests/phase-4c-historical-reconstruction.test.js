const test = require('node:test');
const assert = require('node:assert/strict');
const Reconstruction = require('../historical-reconstruction.js');

test('classifies custody, lending, subscription, corporate, income and trade events', () => {
  assert.equal(Reconstruction.classifyMovement({ Movimento: 'Transferência entrada' }).classification, 'TRANSFER_IN');
  assert.equal(Reconstruction.classifyMovement({ Movimento: 'Empréstimo de ativos' }).classification, 'STOCK_LOAN');
  assert.equal(Reconstruction.classifyMovement({ Movimento: 'Empréstimo de ativos' }).positionEffect, 'NONE');
  assert.equal(Reconstruction.classifyMovement({ Movimento: 'Direito de subscrição' }).classification, 'SUBSCRIPTION_RIGHT');
  assert.equal(Reconstruction.classifyMovement({ Movimento: 'Subscrição executada' }).classification, 'SUBSCRIPTION_EXECUTION');
  assert.equal(Reconstruction.classifyMovement({ Movimento: 'Bonificação' }).classification, 'CORPORATE_EVENT');
  assert.equal(Reconstruction.classifyMovement({ Movimento: 'Dividendo' }).classification, 'INCOME');
  assert.equal(Reconstruction.classifyMovement({ Movimento: 'Compra' }).classification, 'BUY');
  assert.equal(Reconstruction.classifyMovement({ Movimento: 'Alienação / Venda' }).classification, 'SELL');
  assert.equal(Reconstruction.classifyMovement({ Movimento: 'Sem catálogo' }).confidence, 'UNKNOWN');
});

test('expected position uses only verified buy/sell and excludes custody uncertainty', () => {
  const result = Reconstruction.expectedPositionFromVerifiedHistory([
    { date: '2019-01-01', ticker: 'ABCD3', qty: 10, movement: 'Compra' },
    { date: '2020-01-01', ticker: 'ABCD3', qty: 2, movement: 'Venda' },
    { date: '2021-01-01', ticker: 'ABCD3', qty: 8, movement: 'Transferência entrada' },
    { date: '2022-01-01', ticker: 'ABCD3', qty: 1, movement: 'Desconhecido' }
  ]);
  assert.deepEqual(result.positions, [['ticker:ABCD3', 8]]);
  assert.equal(result.unverifiedEventPositionImpact, 0);
  assert.equal(result.writeEnabled, false);
});

test('cross-source matching is exact and economic duplicates count once', () => {
  const b3 = [{ date: '2024-01-02', ticker: 'ABCD3', qty: 10, price: '10,00', value: '100,00', movement: 'Compra' }];
  const note = [{ date: '02/01/2024', ticker: 'ABCD3', qty: '10,00', price: 10, value: 100, movement: 'Compra' }];
  const matched = Reconstruction.crossSourceMatch(b3, note);
  assert.equal(matched.counts.EXACT_CROSS_SOURCE_MATCH, 1);
  const dedup = Reconstruction.deduplicateEconomicEvents([{ source: 'B3', events: b3 }, { source: 'NOTE', events: note }]);
  assert.equal(dedup.doubleCount, 1);
  assert.equal(dedup.economicEventDoubleCount, 0);
});

test('three-way position reconciliation keeps current position separate', () => {
  const result = Reconstruction.reconcilePositions(
    [['ticker:ABCD3', 8], ['ticker:IJKL5', 2]],
    [{ ticker: 'ABCD3', qty: 8 }, { ticker: 'IJKL5', qty: 1 }],
    [{ ticker: 'ABCD3', qty: 8 }, { ticker: 'IJKL5', qty: 1 }]
  );
  assert.equal(result.summary.ALL_MATCH, 1);
  assert.equal(result.summary.APP_B3_MATCH_HISTORY_DIFFERS, 1);
  assert.equal(result.writeEnabled, false);
});

test('divergence explanations remain review-only and human-readable', () => {
  assert.match(Reconstruction.explainDivergence({ identity: 'ticker:ABCD3', status: 'QUANTITY_CONFLICT' }, [{ identity: 'ticker:ABCD3', classification: 'TRANSFER_IN' }]), /Transferência/);
  assert.match(Reconstruction.explainDivergence({ identity: 'ticker:ZZZZ3', status: 'REVIEW_REQUIRED' }, []), /lacuna/);
});

test('coverage supports 2019 through 2026 without fabricating dates', () => {
  const years = Array.from({ length: 8 }, (_, index) => 2019 + index);
  const result = Reconstruction.coverage(years.map(year => ({ date: `${year}-01-01`, verified: true })), []);
  assert.equal(result.DATE_RANGE, '2019-01-01..2026-01-01');
  assert.equal(result.TOTAL_EVENTS, 8);
  assert.equal(result.POSITION_COVERAGE_PERCENT, 100);
});

test('conflict review, session and report models are explicit and non-persistent', () => {
  const conflicts = Reconstruction.buildConflictReview([{ status: 'CONFLICT', sourceA: { identity: 'ticker:ABCD3', date: '2024-01-01', quantity: 1 }, sourceB: { identity: 'ticker:ABCD3', date: '2024-01-01', quantity: 2 } }]);
  assert.equal(conflicts[0].CONFLICT_ID, 'conflict-1');
  const session = Reconstruction.buildImportSession({ sessionId: 's-1', conflicts: 1 });
  assert.equal(session.persistent, false);
  const report = Reconstruction.buildReconciliationReport({ period: '2019-2026', conflicts });
  assert.equal(report.writeEnabled, false);
});

test('corporate event and identity mapping audits never invent historical links', () => {
  const support = Reconstruction.corporateEventSupportMap();
  assert.equal(support.splits, 'UNSUPPORTED');
  assert.equal(support.subscription, 'REVIEW_REQUIRED');
  assert.equal(Reconstruction.historicalIdentityMappingStatus().status, 'NO_AUTOMATIC_MAPPING');
});

test('large historical reconstruction remains deterministic at 10k, 25k and 50k events', () => {
  for (const size of [10000, 25000, 50000]) {
    const events = Array.from({ length: size }, (_, index) => ({ date: '2025-01-01', ticker: `ABCD${index % 20}`, qty: 1, movement: 'Compra' }));
    const result = Reconstruction.expectedPositionFromVerifiedHistory(events);
    assert.equal(result.unverifiedEventPositionImpact, 0);
    assert.equal(result.positions.length, 20);
  }
});

test('historical report keeps loans outside position and marks exact repeats auditably', () => {
  const events = [
    { date: '2019-01-02', ticker: 'ABCD3', qty: 10, movement: 'Compra' },
    { date: '2019-01-03', ticker: 'ABCD3', qty: 10, movement: 'Empréstimo de ativos' },
    { date: '2019-02-01', ticker: 'ABCD3', qty: 2, movement: 'Dividendo' }
  ];
  const report = Reconstruction.buildHistoricalReport(events, [{ ticker: 'ABCD3', qty: 10 }]);
  assert.equal(report.writeEnabled, false);
  assert.equal(report.ignoredLoans.length, 1);
  assert.equal(report.positions[0][1], 10);
  assert.equal(report.income.length, 1);
  const duplicate = Reconstruction.deduplicateEconomicEvents([{ source: 'B3', events }, { source: 'B3-copy', events }]);
  assert.equal(duplicate.groups.every(item => item.state === 'EXACT_DUPLICATE'), true);
});
