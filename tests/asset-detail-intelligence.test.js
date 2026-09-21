const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../asset-detail-intelligence');

test('compõe renda paga, anunciada e custo-base por identidade exata do ativo', () => {
  const result = Engine.buildAssetDetailIntelligence({
    asset: { id: 'asset-1', ticker: 'AAA3', qty: 8, avg_price: 10 },
    position: { quantity: 8, averageCost: 10, currentValue: 120, result: 40 },
    incomeEvents: [
      { id: 'paid', ticker: 'AAA3', type: 'DIVIDEND', date: '2026-01-10', value: 12, state: 'PAID' },
      { id: 'announced', ticker: 'AAA3', type: 'DIVIDEND', date: '2026-02-10', value: 20, state: 'ANNOUNCED' },
      { id: 'other', ticker: 'BBB3', type: 'DIVIDEND', date: '2026-01-10', value: 99, state: 'PAID' },
    ],
    taxModel: { positions: [{ ticker: 'AAA3', runningCostBasis: 80, averageCost: 10, status: 'COMPLETE' }] },
  });
  assert.equal(result.income.paidTotal, 12);
  assert.equal(result.income.announcedEventCount, 1);
  assert.equal(result.tax.costBasis, 80);
  assert.equal(result.position.authority, 'CURRENT_POSITION');
  assert.equal(result.writeEnabled, false);
});

test('mantém NEEDS_REVIEW e valores desconhecidos sem convertê-los em zero', () => {
  const result = Engine.buildAssetDetailIntelligence({
    asset: { id: 'asset-2', ticker: 'BBB3' },
    historicalAudit: { status: 'NEEDS_REVIEW', coverage: { status: 'PARTIAL' }, transactions: [{ ticker: 'BBB3', reasons: ['WEAK_SOURCE'] }] },
    taxModel: { positions: [{ ticker: 'BBB3', status: 'NEEDS_REVIEW', runningCostBasis: null, averageCost: null, needsReviewReasons: ['MISSING_PURCHASE_HISTORY'] }] },
  });
  assert.equal(result.tax.costBasis, null);
  assert.equal(result.tax.averageCost, null);
  assert.equal(result.review.status, 'NEEDS_REVIEW');
  assert.equal(result.historical.coverage, 'PARTIAL');
  assert.deepEqual(result.semantics, { unknownIsNotZero: true, needsReviewIsNotFinal: true, announcedIsNotPaid: true, currentPositionIsNotOverwritten: true });
});

test('não aceita ticker de outra posição quando a linha informa assetId diferente', () => {
  assert.equal(Engine.matchesAsset({ assetId: 'asset-2', ticker: 'AAA3' }, { id: 'asset-1', ticker: 'AAA3' }), false);
  assert.equal(Engine.matchesAsset({ ticker: 'AAA3' }, { id: 'asset-1', ticker: 'AAA3' }), true);
});

test('isola a cobertura histórica do ativo e não herda revisão de outro ticker', () => {
  const result = Engine.buildAssetDetailIntelligence({
    asset: { id: 'asset-1', ticker: 'AAA3' },
    historicalAudit: {
      status: 'NEEDS_REVIEW',
      coverage: { status: 'PARTIAL' },
      transactions: [
        { ticker: 'AAA3', reasons: [] },
        { ticker: 'BBB3', reasons: ['UNKNOWN_OPERATION'] },
      ],
    },
  });
  assert.equal(result.historical.status, 'FULL');
  assert.equal(result.historical.coverage, 'FULL');
});
