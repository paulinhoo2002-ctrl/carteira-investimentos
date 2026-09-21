const test = require('node:test');
const assert = require('node:assert/strict');
const Reconstruction = require('../historical-reconstruction-hardening.js');

test('V259 replays weighted average, partial sell and rebuy without writes', () => {
  const result = Reconstruction.buildHistoricalReconstructionCompleteness({
    transactions: [
      { id: 'buy-a', date: '2024-01-02', ticker: 'AAA3', operation: 'compra', qty: 10, total: 100, source: 'broker-note' },
      { id: 'buy-b', date: '2024-02-02', ticker: 'AAA3', operation: 'compra', qty: 10, total: 300, source: 'broker-note' },
      { id: 'sell-a', date: '2024-03-02', ticker: 'AAA3', operation: 'venda', qty: 5, total: 150, source: 'broker-note' },
      { id: 'sell-b', date: '2024-04-02', ticker: 'AAA3', operation: 'venda', qty: 15, total: 450, source: 'broker-note' },
      { id: 'buy-c', date: '2024-05-02', ticker: 'AAA3', operation: 'compra', qty: 2, total: 50, source: 'broker-note' }
    ],
    currentPositions: [{ ticker: 'AAA3', quantity: 2 }],
    yearEndYears: [2024]
  });
  assert.equal(result.writeEnabled, false);
  assert.equal(result.replay.realizedSales.length, 2);
  assert.equal(result.replay.positions[0].quantity, 2);
  assert.equal(result.replay.positions[0].costBasis, 50);
  assert.equal(result.reconciliation[0].status, 'MATCH');
  assert.equal(result.sales.needsReview, 0);
});

test('V259 does not create a definitive gain when sale lacks acquisition basis', () => {
  const result = Reconstruction.buildHistoricalReconstructionCompleteness({
    transactions: [{ id: 'sell-only', date: '2024-03-02', ticker: 'BBB3', operation: 'venda', qty: 2, total: 200, source: 'historical-import' }]
  });
  assert.equal(result.replay.realizedSales.length, 0);
  assert.equal(result.sales.needsReview, 1);
  assert.equal(result.replay.issues[0].type, 'SELL_WITHOUT_CONFIDENT_BASIS');
});

test('V259 recognizes canonical operation fields and derives total from unit price', () => {
  const result = Reconstruction.buildHistoricalReconstructionCompleteness({
    transactions: [
      { id: 'buy', date: '2024-01-02', ticker: 'AAA3', operationType: 'Compra', qty: 10, price: 10, source: 'historical-import' },
      { id: 'sell', date: '2024-02-02', ticker: 'AAA3', action: 'venda', qty: 4, price: 12, source: 'historical-import' }
    ]
  });
  assert.equal(result.counts.buy, 1);
  assert.equal(result.counts.sell, 1);
  assert.equal(result.sales.total, 1);
  assert.equal(result.sales.needsReview, 0);
  assert.equal(result.replay.realizedSales[0].proceeds, 48);
});

test('V259 supports explicit split and ticker lineage without changing total basis', () => {
  const result = Reconstruction.buildHistoricalReconstructionCompleteness({
    transactions: [{ id: 'buy', date: '2024-01-02', ticker: 'CCC3', operation: 'compra', qty: 10, total: 100, source: 'broker-note' }],
    corporateEvents: [
      { id: 'split', date: '2024-02-01', ticker: 'CCC3', type: 'split', ratio: 2, source: 'official-event' },
      { id: 'migration', date: '2024-03-01', ticker: 'CCC3', newTicker: 'CCC4', type: 'ticker migration', source: 'official-event' }
    ],
    currentPositions: [{ ticker: 'CCC4', quantity: 20 }]
  });
  assert.equal(result.appliedEvents.length, 2);
  assert.equal(result.replay.positions[0].ticker, 'CCC4');
  assert.equal(result.replay.positions[0].quantity, 20);
  assert.equal(result.replay.positions[0].costBasis, 100);
  assert.equal(result.reconciliation[0].status, 'MATCH');
});

test('V259 keeps unsupported corporate events and reference movements explicit', () => {
  const result = Reconstruction.buildHistoricalReconstructionCompleteness({
    transactions: [
      { id: 'transfer', date: '2024-01-01', ticker: 'DDD3', operation: 'transferência', qty: 5, source: 'movement-reference' },
      { id: 'loan', date: '2024-01-02', ticker: 'DDD3', operation: 'Empréstimo de ativos', qty: 5, source: 'broker-note' }
    ],
    corporateEvents: [{ id: 'merger', date: '2024-02-01', ticker: 'DDD3', type: 'merger', source: 'official-event' }]
  });
  assert.equal(result.referenceTransactionFinancialEffectCount, 0);
  assert.equal(result.stockLoanPositionMutationCount, 0);
  assert.equal(result.unsupportedEvents.length, 1);
  assert.equal(result.writeEnabled, false);
});

test('V259 preserves unknown, partial and annual coverage semantics', () => {
  const result = Reconstruction.buildHistoricalReconstructionCompleteness({
    transactions: [{ id: 'unknown', date: '2024-01-01', ticker: 'EEE3', operation: 'sem catálogo', qty: 1, total: 10, source: 'UNKNOWN' }],
    yearEndYears: [2023, 2024]
  });
  assert.equal(result.yearEndSnapshots[0].status, 'UNAVAILABLE');
  assert.equal(result.yearEndSnapshots[1].status, 'PARTIAL');
  assert.equal(result.coverage.status, 'PARTIAL');
  assert.equal(result.currentPositionAutoOverwriteCount, 0);
});
