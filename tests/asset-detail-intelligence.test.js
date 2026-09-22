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

test('classifica proventos reais sem campo state usando o motor de dividendos', () => {
  const result = Engine.buildAssetDetailIntelligence({
    asset: { id: 'asset-1', ticker: 'HGLG11', qty: 104, avg_price: 147.32 },
    position: { quantity: 104, averageCost: 147.32, currentValue: 15321.28, result: -1 },
    incomeEvents: [
      { id: 'r1', ticker: 'HGLG11', type: 'Rendimento', date: '2026-06-14', value: 105.6 },
      { id: 'r2', ticker: 'HGLG11', type: 'Rendimento', date: '2026-07-14', value: 105.6 },
      { id: 'r3', ticker: 'OUTRO11', type: 'Rendimento', date: '2026-06-14', value: 999 },
    ],
    taxModel: { positions: [{ ticker: 'HGLG11', runningCostBasis: 15321.28, averageCost: 147.32, status: 'COMPLETE' }] },
  });
  assert.equal(result.income.paidTotal, 211.2);
  assert.equal(result.income.paidEventCount, 2);
  assert.equal(result.coverage.income, 'FULL_COVERAGE');
});

test('renda anunciada não é tratada como paga e ausência de renda não vira zero falso', () => {
  const result = Engine.buildAssetDetailIntelligence({
    asset: { id: 'asset-1', ticker: 'AAA3', qty: 8 },
    position: { quantity: 8, averageCost: 10, currentValue: 120, result: 40 },
    incomeEvents: [
      { id: 'ann1', ticker: 'AAA3', type: 'DIVIDEND', date: '2027-01-10', value: 20, state: 'ANNOUNCED' },
    ],
    taxModel: { positions: [{ ticker: 'AAA3', runningCostBasis: 80, averageCost: 10, status: 'COMPLETE' }] },
  });
  assert.equal(result.income.paidTotal, 0);
  assert.equal(result.income.paidEventCount, 0);
  assert.equal(result.income.announcedEventCount, 1);
  assert.equal(result.coverage.income, 'UNKNOWN');
  assert.equal(result.semantics.announcedIsNotPaid, true);
});

test('mantém NEEDS_REVIEW e valores desconhecidos sem convertê-los em zero', () => {
  const result = Engine.buildAssetDetailIntelligence({
    asset: { id: 'asset-2', ticker: 'BBB3' },
    historicalAudit: { status: 'NEEDS_REVIEW', coverage: { status: 'PARTIAL' }, transactions: [{ ticker: 'BBB3', reasons: ['WEAK_SOURCE'] }] },
    taxModel: { positions: [{ ticker: 'BBB3', status: 'NEEDS_REVIEW', runningCostBasis: null, averageCost: null, needsReviewReasons: ['MISSING_PURCHASE_HISTORY'] }] },
  });
  assert.equal(result.tax.averageCost, null);
  assert.equal(result.tax.costBasis, null);
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

test('inclui YTD e TTM da renda paga pelo motor de dividendos', () => {
  const now = new Date(2026, 8, 21);
  const result = Engine.buildAssetDetailIntelligence({
    asset: { id: 'asset-1', ticker: 'AAA3', qty: 8, avg_price: 10 },
    position: { quantity: 8, averageCost: 10, currentValue: 120, result: 40 },
    incomeEvents: [
      { id: 'paid1', ticker: 'AAA3', type: 'DIVIDEND', date: '2026-01-10', value: 12, state: 'PAID' },
      { id: 'paid2', ticker: 'AAA3', type: 'DIVIDEND', date: '2026-05-10', value: 8, state: 'PAID' },
      { id: 'paid3', ticker: 'AAA3', type: 'DIVIDEND', date: '2026-08-10', value: 10, state: 'PAID' },
      { id: 'old', ticker: 'AAA3', type: 'DIVIDEND', date: '2025-01-10', value: 5, state: 'PAID' },
    ],
    taxModel: { positions: [{ ticker: 'AAA3', runningCostBasis: 80, averageCost: 10, status: 'COMPLETE' }] },
    options: { now },
  });
  assert.equal(result.income.ytdPaidIncome, 30);
  assert.equal(result.income.ttmPaidIncome, 30);
});

test('usa o taxModel para custo-base, custo médio e resultado realizado', () => {
  const result = Engine.buildAssetDetailIntelligence({
    asset: { id: 'asset-1', ticker: 'AAA3', qty: 8, avg_price: 10 },
    position: { quantity: 8, averageCost: 10, currentValue: 120, result: 40 },
    incomeEvents: [],
    historicalAudit: null,
    taxModel: {
      positions: [{ ticker: 'AAA3', runningCostBasis: 75, averageCost: 9.375, status: 'COMPLETE' }],
      realizedGains: { rows: [
        { ticker: 'AAA3', realizedGainLoss: 5, status: 'AVAILABLE' },
        { ticker: 'AAA3', realizedGainLoss: 3, status: 'AVAILABLE' },
      ] },
    },
  });
  assert.equal(result.tax.costBasis, 75);
  assert.equal(result.tax.averageCost, 9.375);
  assert.equal(result.tax.realizedResult, 8);
  assert.equal(result.tax.status, 'COMPLETE');
  assert.equal(result.tax.realizedStatus, 'AVAILABLE');
});

test('venda sem base confiável mantém resultado realizado em revisão, nunca lucro falso', () => {
  const result = Engine.buildAssetDetailIntelligence({
    asset: { id: 'asset-1', ticker: 'CCC3', qty: 0 },
    position: { quantity: 0, averageCost: null, currentValue: null, result: null },
    taxModel: {
      positions: [{ ticker: 'CCC3', status: 'NEEDS_REVIEW', runningCostBasis: null, averageCost: null, needsReviewReasons: ['MISSING_PURCHASE_HISTORY'] }],
      realizedGains: { rows: [{ asset: 'CCC3', realizedGainLoss: null, allocatedCostBasis: null, status: 'NEEDS_REVIEW', needsReviewReason: 'MISSING_PURCHASE_HISTORY' }] },
    },
  });
  assert.equal(result.tax.realizedResult, null);
  assert.equal(result.tax.realizedStatus, 'NEEDS_REVIEW');
  assert.ok(result.review.reasons.includes('MISSING_PURCHASE_HISTORY'));
});

test('consolida marketData, dataTrust e performance via providers sem duplicar motores', () => {
  const result = Engine.buildAssetDetailIntelligence({
    asset: { id: 'asset-1', ticker: 'PETR4', qty: 50, avg_price: 38.03 },
    position: { quantity: 50, averageCost: 38.03, currentValue: 2400.5, result: 499 },
    taxModel: { positions: [{ ticker: 'PETR4', runningCostBasis: 1901.5, averageCost: 38.03, status: 'COMPLETE' }] },
    options: {
      now: new Date('2026-09-22T12:00:00Z'),
      marketData: { getQuote: () => ({ price: 48.01, currency: 'BRL', source: 'yahoo', fetchedAt: '2026-09-21T17:09:00Z', marketTime: '2026-09-21T16:54:00Z', status: 'CURRENT', freshness: 'FRESH' }) },
      dataTrust: { getTrustInfo: () => ({ status: 'CURRENT', source: 'yahoo', updatedAt: '2026-09-21T17:09:00Z' }) },
      performance: { getAssetPerformance: () => ({ result: 499, period: 'TOTAL', coverage: 'FULL', historicalAvailability: 'AVAILABLE' }) },
    },
  });
  assert.equal(result.marketData.price, 48.01);
  assert.equal(result.marketData.status, 'CURRENT');
  assert.equal(result.marketData.source, 'yahoo');
  assert.equal(result.dataTrust.status, 'CURRENT');
  assert.equal(result.performance.result, 499);
  assert.equal(result.performance.coverage, 'FULL');
  assert.equal(result.coverage.marketData, 'CURRENT');
  assert.equal(result.coverage.performance, 'FULL');
  assert.equal(result.provenance.marketDataSource, 'yahoo');
});

test('marketData ausente ou stale permanece truthful e nunca vira zero', () => {
  const stale = Engine.buildAssetDetailIntelligence({
    asset: { id: 'asset-1', ticker: 'CRA024004SB' },
    position: { quantity: 18, averageCost: 901.73, currentValue: 16231.13, result: 0 },
    options: {
      marketData: { getQuote: () => ({ price: null, currency: 'BRL', source: 'manual', status: 'STALE', freshness: 'STALE' }) },
    },
  });
  assert.equal(stale.marketData.price, null);
  assert.equal(stale.marketData.status, 'STALE');
  assert.equal(stale.coverage.marketData, 'STALE');

  const offline = Engine.buildAssetDetailIntelligence({
    asset: { id: 'asset-2', ticker: 'MOVI18' },
    position: { quantity: 20, averageCost: 1038.74, currentValue: 20774.77, result: 0 },
  });
  assert.equal(offline.marketData.price, null);
  assert.equal(offline.marketData.status, 'UNAVAILABLE');
  assert.equal(offline.coverage.marketData, 'UNAVAILABLE');
});

test('consolida qualidade de dados, monitoramento e eventos corporativos por ticker', () => {
  const result = Engine.buildAssetDetailIntelligence({
    asset: { id: 'asset-1', ticker: 'BBAS3', qty: 203 },
    position: { quantity: 203, averageCost: 20.18, currentValue: 4656.82, result: 560.28 },
    taxModel: { positions: [{ ticker: 'BBAS3', runningCostBasis: 4096.47, averageCost: 20.18, status: 'NEEDS_REVIEW', needsReviewReasons: ['MISSING_FEES'] }] },
    options: {
      dataQuality: { getIssuesForAsset: () => ({ issues: [{ id: 'dq-1', domain: 'POSITIONS', rootCause: 'Ativos', needsReview: true }], needsReview: true, status: 'NEEDS_REVIEW' }) },
      monitoring: { getAlertsForAsset: () => ({ alerts: [{ id: 'a1', severity: 'CRITICAL', description: 'Posição sem setor' }], status: 'ONGOING' }) },
      corporateEvents: { getEventsForAsset: () => ({ events: [{ id: 'e1', type: 'SPLIT', status: 'SHADOW' }], status: 'SHADOW_READ_ONLY' }) },
    },
  });
  assert.equal(result.dataQuality.issues.length, 1);
  assert.equal(result.dataQuality.needsReview, true);
  assert.equal(result.monitoring.alerts.length, 1);
  assert.equal(result.coverage.monitoring, 'ONGOING');
  assert.equal(result.events.list.length, 1);
  assert.equal(result.coverage.events, 'SHADOW_READ_ONLY');
  assert.ok(result.review.reasons.some(r => String(r).includes('Ativos')));
  assert.ok(result.review.reasons.some(r => String(r).includes('Posição sem setor')));
  assert.equal(result.writeEnabled, false);
});

test('transações, fonte e cobertura vêm do provider sem afetar a carteira', () => {
  const result = Engine.buildAssetDetailIntelligence({
    asset: { id: 'asset-1', ticker: 'HODL11', qty: 168 },
    position: { quantity: 168, averageCost: 73.97, currentValue: 12426.96, result: 0 },
    transactions: [
      { id: 't1', ticker: 'HODL11', movementKind: 'compra', date: '24/06/2026', qty: 17, price: 52.5 },
      { id: 't2', ticker: 'OUTRO11', movementKind: 'compra', date: '24/06/2026', qty: 1, price: 1 },
    ],
    options: {
      transactionSource: { getSourceForTicker: () => 'Nota Inter PDF', getCoverageForTicker: () => 'PARTIAL' },
    },
  });
  assert.equal(result.transactions.list.length, 1);
  assert.equal(result.transactions.source, 'Nota Inter PDF');
  assert.equal(result.transactions.coverage, 'PARTIAL');
  assert.equal(result.coverage.transactions, 'PARTIAL');
});

test('documentos e proveniência consolidam referências do ativo', () => {
  const result = Engine.buildAssetDetailIntelligence({
    asset: { id: 'asset-1', ticker: 'BBAS3', qty: 203 },
    position: { quantity: 203, averageCost: 20.18, currentValue: 4656.82, result: 560.28 },
    options: {
      documents: { getDocumentsForAsset: () => ({ items: [{ title: 'Nota 41800778', date: '24/06/2026' }], status: 'AVAILABLE' }) },
    },
  });
  assert.equal(result.documents.list.length, 1);
  assert.equal(result.documents.status, 'AVAILABLE');
  assert.equal(result.coverage.documents, 'AVAILABLE');
});

test('histórico parcial via historicalReconstruction provider preserva estados do motor', () => {
  const result = Engine.buildAssetDetailIntelligence({
    asset: { id: 'asset-1', ticker: 'MOVI18', qty: 20 },
    position: { quantity: 20, averageCost: 1038.74, currentValue: 20774.77, result: 0 },
    options: {
      historicalReconstruction: { getReconstruction: () => ({ status: 'NEEDS_REVIEW', coverage: 'PARTIAL', needsReview: true, reconciliationState: 'REVIEW_REQUIRED', transactionLinkage: null, positionEvolution: null }) },
    },
  });
  assert.equal(result.historical.status, 'NEEDS_REVIEW');
  assert.equal(result.historical.coverage, 'PARTIAL');
  assert.equal(result.historical.needsReview, true);
  assert.equal(result.historical.reconciliationState, 'REVIEW_REQUIRED');
});

test('custo-base ausente permanece null em vez de zero', () => {
  const result = Engine.buildAssetDetailIntelligence({
    asset: { id: 'asset-1', ticker: 'NOVO11', qty: 10 },
    position: { quantity: 10, averageCost: null, currentValue: 100, result: null },
    taxModel: { positions: [] },
  });
  assert.equal(result.tax.costBasis, null);
  assert.equal(result.tax.status, 'UNAVAILABLE');
  assert.equal(result.tax.realizedStatus, 'UNAVAILABLE');
  assert.equal(result.coverage.tax, 'PARTIAL');
});
