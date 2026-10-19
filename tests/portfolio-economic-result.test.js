'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const pipeline = require('../financial-truth-reconciliation.js');
const engine = require('../fixed-income-economic-result.js');
const adapter = require('../fixed-income-economic-result-adapter.js');

const completeCoverage = overrides => ({
  currentPosition: 'COMPLETE', costBasis: 'UNKNOWN', contributions: 'COMPLETE',
  income: 'COMPLETE', taxes: 'COMPLETE', capitalReturns: 'COMPLETE', principal: 'UNKNOWN',
  history: {
    status: 'COMPLETE', periodStart: '2024-01-01', periodEnd: '2026-10-18',
    openingPosition: 'NONE', allEventsRepresented: true, duplicatesResolved: true,
    sourceOverlapResolved: true,
  },
  ...overrides,
});

function completeProvenance(assetId, eventId = `${assetId}-application`, amount = 100) {
  return [{
    sourceKind: 'RF_EVENT', sourceId: 'synthetic-source', stableEventId: eventId,
    assetIdentity: assetId, occurredOn: '2024-01-01', amount, authority: 'SYNTHETIC_TEST_SOURCE',
    semanticType: 'APPLICATION', status: 'CONFIRMED', amountBasis: 'GROSS',
    periodStart: '2024-01-01', periodEnd: '2026-10-18', periodMembership: 'IN_PERIOD',
    duplicateState: 'NONE', conflictState: 'NONE', sourceOverlapResolution: 'RESOLVED',
    coverageState: 'COMPLETE', historyRelevant: true,
  }];
}

function completeAsset(assetId, currentMarketValue = 110, contributed = 100) {
  const evidence = {
    contributions: [{ id: `${assetId}-application`, type: 'APPLICATION', amount: contributed, status: 'CONFIRMED', occurredOn: '2024-01-01' }],
    events: [],
    coverage: completeCoverage(),
    returnPercentBasis: 'CUMULATIVE_CONTRIBUTIONS_SIMPLE',
    sourceEvidence: completeProvenance(assetId, `${assetId}-application`, contributed),
    provenanceComplete: true,
    blockers: [],
  };
  const calculated = adapter.calculate({
    currentMarketValue,
    currentPositionKnown: true,
    currentPositionCoverage: 'COMPLETE',
    evidence,
    engine: engine.calculateFixedIncomeEconomicResult,
  });
  return pipeline.reconcileAsset({
    asset: { id: assetId, type: 'Renda Fixa', name: 'Trend DI FIC RF Simples RL' },
    currentPosition: { value: currentMarketValue, coverage: 'COMPLETE' },
    evidence,
    result: calculated,
  });
}

test('UNKNOWN_NOT_ZERO and PARTIAL_NOT_COMPLETE', () => {
  const unknown = pipeline.reconcileAsset({ asset: { id: 'unknown-1', type: 'Renda Fixa' } });
  const partial = pipeline.reconcileAsset({
    asset: { id: 'partial-1', type: 'Renda Fixa' },
    currentPosition: { value: 125, coverage: 'COMPLETE' },
    result: { status: 'PARTIAL', totalEconomicResult: null, coverage: { history: { status: 'PARTIAL' }, totalResult: 'PARTIAL' }, blockers: ['HISTORY_NOT_COMPLETE'] },
  });

  assert.equal(unknown.currentPosition.value, null);
  assert.equal(unknown.economicResult.value, null);
  assert.equal(unknown.status, 'UNKNOWN');
  assert.equal(partial.currentPosition.value, 125);
  assert.equal(partial.economicResult.value, null);
  assert.equal(partial.status, 'PARTIAL');
});

test('missing provenance cannot promote an engine result to complete', () => {
  const calculated = engine.calculateFixedIncomeEconomicResult({
    currentMarketValue: 110,
    contributions: [{ id: 'synthetic-contribution', type: 'APPLICATION', amount: 100, status: 'CONFIRMED', occurredOn: '2024-01-01' }],
    events: [], coverage: completeCoverage(), returnPercentBasis: 'CUMULATIVE_CONTRIBUTIONS_SIMPLE',
  });
  const result = pipeline.reconcileAsset({
    asset: { id: 'synthetic-trend', type: 'Renda Fixa', name: 'Trend DI FIC RF Simples RL' },
    currentPosition: { value: 110, coverage: 'COMPLETE' },
    evidence: { coverage: completeCoverage(), blockers: [] },
    result: calculated,
  });

  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.economicResult.value, null);
  assert.ok(result.blockers.includes('PROVENANCE_NOT_COMPLETE'));
});

test('provenance amount must match the normalized economic event amount', () => {
  const asset = { id: 'synthetic-trend', type: 'Renda Fixa', name: 'Trend DI FIC RF Simples RL' };
  const evidence = {
    contributions: [{ id: 'application-1', type: 'APPLICATION', amount: 200, status: 'CONFIRMED', occurredOn: '2024-01-01' }],
    events: [],
    coverage: completeCoverage(),
    sourceEvidence: [{
      ...completeProvenance(asset.id, 'application-1')[0],
      amount: 100,
    }],
    provenanceComplete: true,
    blockers: [],
  };
  const calculated = engine.calculateFixedIncomeEconomicResult({
    currentMarketValue: 220,
    contributions: evidence.contributions,
    events: evidence.events,
    coverage: evidence.coverage,
    returnPercentBasis: 'CUMULATIVE_CONTRIBUTIONS_SIMPLE',
  });

  const result = pipeline.reconcileAsset({
    asset,
    currentPosition: { value: 220, coverage: 'COMPLETE' },
    evidence,
    result: calculated,
  });

  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.economicResult.value, null);
  assert.ok(result.blockers.includes('PROVENANCE_NOT_COMPLETE'));
});

test('unmapped relevant provenance event blocks complete reconciliation', () => {
  const asset = { id: 'synthetic-trend', type: 'Renda Fixa', name: 'Trend DI FIC RF Simples RL' };
  const evidence = {
    contributions: [{ id: 'application-1', type: 'APPLICATION', amount: 100, status: 'CONFIRMED', occurredOn: '2024-01-01' }],
    events: [],
    coverage: completeCoverage(),
    sourceEvidence: [
      ...completeProvenance(asset.id, 'application-1', 100),
      {
        ...completeProvenance(asset.id, 'omitted-coupon', 10)[0],
        semanticType: 'COUPON', status: 'RECEIVED', amountBasis: 'GROSS', occurredOn: '2025-01-01',
      },
    ],
    provenanceComplete: true,
    blockers: [],
  };
  const calculated = engine.calculateFixedIncomeEconomicResult({
    currentMarketValue: 110,
    contributions: evidence.contributions,
    events: evidence.events,
    coverage: evidence.coverage,
    returnPercentBasis: 'CUMULATIVE_CONTRIBUTIONS_SIMPLE',
  });

  const result = pipeline.reconcileAsset({
    asset,
    currentPosition: { value: 110, coverage: 'COMPLETE' },
    evidence,
    result: calculated,
  });

  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.economicResult.value, null);
  assert.ok(result.blockers.includes('PROVENANCE_NOT_COMPLETE'));
});

test('provenance amount basis must match the normalized receipt basis', () => {
  const asset = { id: 'synthetic-trend', type: 'Renda Fixa', name: 'Trend DI FIC RF Simples RL' };
  const evidence = {
    contributions: [{ id: 'application-1', type: 'APPLICATION', amount: 100, status: 'CONFIRMED', occurredOn: '2024-01-01' }],
    events: [{ id: 'coupon-1', type: 'COUPON', amount: 10, amountBasis: 'NET', status: 'RECEIVED', occurredOn: '2025-01-01' }],
    coverage: completeCoverage(),
    sourceEvidence: [
      ...completeProvenance(asset.id, 'application-1', 100),
      {
        ...completeProvenance(asset.id, 'coupon-1', 10)[0],
        semanticType: 'COUPON',
        amountBasis: 'GROSS',
        status: 'RECEIVED',
        occurredOn: '2025-01-01',
      },
    ],
    provenanceComplete: true,
    blockers: [],
  };
  const calculated = engine.calculateFixedIncomeEconomicResult({
    currentMarketValue: 100,
    contributions: evidence.contributions,
    events: evidence.events,
    coverage: evidence.coverage,
    returnPercentBasis: 'CUMULATIVE_CONTRIBUTIONS_SIMPLE',
  });

  const result = pipeline.reconcileAsset({
    asset,
    currentPosition: { value: 100, coverage: 'COMPLETE' },
    evidence,
    result: calculated,
  });

  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.economicResult.value, null);
  assert.ok(result.blockers.includes('PROVENANCE_NOT_COMPLETE'));
});

test('missing history evidence fails closed without throwing', () => {
  const result = pipeline.reconcileAsset({
    asset: { id: 'synthetic-trend', type: 'Renda Fixa', name: 'Trend DI FIC RF Simples RL' },
    currentPosition: { value: 10, coverage: 'COMPLETE' },
    evidence: {
      coverage: {},
      sourceEvidence: [{}],
      contributions: [],
      events: [],
      provenanceComplete: true,
      blockers: [],
    },
  });

  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.economicResult.value, null);
  assert.ok(result.blockers.includes('EVIDENCE_HISTORY_NOT_COMPLETE'));
});

test('incomplete source identity in provenance blocks certification', () => {
  const asset = { id: 'synthetic-trend', type: 'Renda Fixa', name: 'Trend DI FIC RF Simples RL' };
  const evidence = {
    coverage: completeCoverage(), provenanceComplete: true, blockers: [],
    sourceEvidence: [{
      sourceKind: 'RF_EVENT', sourceId: 'synthetic-source', stableEventId: 'synthetic-event',
      assetIdentity: asset.id, occurredOn: '2024-01-01', authority: null, semanticType: 'APPLICATION',
      status: 'CONFIRMED', periodStart: '2024-01-01', periodEnd: '2026-10-18', periodMembership: 'IN_PERIOD',
      duplicateState: 'NONE', conflictState: 'NONE', coverageState: 'UNKNOWN', historyRelevant: true,
    }],
  };
  const result = pipeline.reconcileAsset({
    asset, currentPosition: { value: 110, coverage: 'COMPLETE' }, evidence,
    result: engine.calculateFixedIncomeEconomicResult({
      currentMarketValue: 110,
      contributions: [{ id: 'synthetic-event', type: 'APPLICATION', amount: 100, status: 'CONFIRMED', occurredOn: '2024-01-01' }],
      events: [], coverage: completeCoverage(), returnPercentBasis: 'CUMULATIVE_CONTRIBUTIONS_SIMPLE',
    }),
  });

  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.economicResult.value, null);
  assert.ok(result.blockers.includes('PROVENANCE_NOT_COMPLETE'));
});

test('provenance must explicitly resolve source overlap and match normalized event identities', () => {
  const asset = { id: 'synthetic-trend', type: 'Renda Fixa', name: 'Trend DI FIC RF Simples RL' };
  const evidence = {
    contributions: [{ id: 'normalized-application', type: 'APPLICATION', amount: 100, status: 'CONFIRMED', occurredOn: '2024-01-01' }],
    events: [], coverage: completeCoverage(), provenanceComplete: true, blockers: [],
    sourceEvidence: completeProvenance(asset.id, 'different-source-event').map(({ sourceOverlapResolution, ...row }) => row),
  };
  const result = pipeline.reconcileAsset({
    asset, currentPosition: { value: 110, coverage: 'COMPLETE' }, evidence,
    result: engine.calculateFixedIncomeEconomicResult({
      currentMarketValue: 110,
      contributions: evidence.contributions,
      events: evidence.events,
      coverage: completeCoverage(), returnPercentBasis: 'CUMULATIVE_CONTRIBUTIONS_SIMPLE',
    }),
  });

  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.economicResult.value, null);
  assert.ok(result.blockers.includes('PROVENANCE_NOT_COMPLETE'));
});

test('missing asset identity cannot receive a certified reconciliation', () => {
  const result = pipeline.reconcileAsset({
    asset: { type: 'Renda Fixa', name: 'Trend DI FIC RF Simples RL' },
    currentPosition: { value: 110, coverage: 'COMPLETE' },
    evidence: { coverage: completeCoverage(), sourceEvidence: [{ stableEventId: 'synthetic-event' }], provenanceComplete: true, blockers: [] },
    result: engine.calculateFixedIncomeEconomicResult({
      currentMarketValue: 110,
      contributions: [{ id: 'synthetic-event', type: 'APPLICATION', amount: 100, status: 'CONFIRMED', occurredOn: '2024-01-01' }],
      events: [], coverage: completeCoverage(), returnPercentBasis: 'CUMULATIVE_CONTRIBUTIONS_SIMPLE',
    }),
  });

  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.economicResult.value, null);
  assert.ok(result.blockers.includes('ASSET_ID_UNKNOWN'));
});

test('negative current market value is not certified as a current position', () => {
  const result = pipeline.reconcileAsset({
    asset: { id: 'synthetic-trend', type: 'Renda Fixa', name: 'Trend DI FIC RF Simples RL' },
    currentPosition: { value: -1, coverage: 'COMPLETE' },
    evidence: { coverage: completeCoverage(), sourceEvidence: [{ stableEventId: 'synthetic-event' }], provenanceComplete: true, blockers: [] },
    result: { status: 'DERIVED_WITH_COMPLETE_HISTORY', totalEconomicResult: 1, totalContributedCapital: 1, totalReturnPercent: 100,
      coverage: { history: 'COMPLETE', totalResult: 'DERIVED', totalReturnPercent: 'DERIVED' }, blockers: [] },
  });

  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.currentPosition.value, null);
  assert.equal(result.economicResult.value, null);
});

test('history status alone cannot certify missing period and opening proof', () => {
  const calculated = engine.calculateFixedIncomeEconomicResult({
    currentMarketValue: 110,
    contributions: [{ id: 'synthetic-contribution', type: 'APPLICATION', amount: 100, status: 'CONFIRMED', occurredOn: '2024-01-01' }],
    events: [], coverage: completeCoverage(), returnPercentBasis: 'CUMULATIVE_CONTRIBUTIONS_SIMPLE',
  });
  const evidence = {
    coverage: { ...completeCoverage(), history: { status: 'COMPLETE', sourceOverlapResolved: true } },
    sourceEvidence: [{ stableEventId: 'synthetic-contribution' }], provenanceComplete: true, blockers: [],
  };
  const result = pipeline.reconcileAsset({
    asset: { id: 'synthetic-trend', type: 'Renda Fixa', name: 'Trend DI FIC RF Simples RL' },
    currentPosition: { value: 110, coverage: 'COMPLETE' }, evidence, result: calculated,
  });

  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.economicResult.value, null);
  assert.ok(result.blockers.includes('EVIDENCE_HISTORY_NOT_COMPLETE'));
});

test('reconciliation copies provenance and does not mutate source evidence', () => {
  const evidence = {
    coverage: completeCoverage(),
    sourceEvidence: [{ stableEventId: 'synthetic-event', metadata: { label: 'fixture' } }],
    provenanceComplete: true,
    blockers: [],
  };
  pipeline.reconcileAsset({
    asset: { id: 'synthetic-trend', type: 'Renda Fixa', name: 'Trend DI FIC RF Simples RL' },
    currentPosition: { value: 100, coverage: 'COMPLETE' }, evidence,
    result: { status: 'PARTIAL', totalEconomicResult: null, blockers: [] },
  });

  assert.equal(Object.isFrozen(evidence), false);
  assert.equal(Object.isFrozen(evidence.coverage), false);
  assert.equal(Object.isFrozen(evidence.sourceEvidence[0]), false);
  assert.equal(Object.isFrozen(evidence.sourceEvidence[0].metadata), false);
});

test('CERTIFIED_SUBTOTAL_NOT_TOTAL: partial portfolio exposes only a certified subset', () => {
  const certified = completeAsset('trend-certified');
  const partial = pipeline.reconcileAsset({
    asset: { id: 'movida-partial', type: 'Renda Fixa' },
    currentPosition: { value: 50, coverage: 'COMPLETE' },
    result: { status: 'PARTIAL', totalEconomicResult: null, coverage: { history: { status: 'PARTIAL' }, totalResult: 'PARTIAL' }, blockers: ['HISTORY_NOT_COMPLETE'] },
  });
  const portfolio = pipeline.aggregatePortfolio({
    assets: [{ id: 'trend-certified' }, { id: 'movida-partial' }],
    reconciliations: [certified, partial],
    inventoryCoverage: 'COMPLETE',
  });

  assert.equal(portfolio.status, 'PARTIAL');
  assert.equal(portfolio.certifiedEconomicResult, 10);
  assert.equal(portfolio.certifiedReturnPct, 10);
  assert.equal(portfolio.totalEconomicResult, null);
  assert.equal(portfolio.certifiedSubtotal.scope, 'CERTIFIED_SUBSET');
  assert.deepEqual(portfolio.certifiedAssets, ['trend-certified']);
  assert.deepEqual(portfolio.partialAssets, ['movida-partial']);
});

test('PORTFOLIO_COMPLETE_REQUIRES_ALL_COMPONENTS and explicit inventory coverage', () => {
  const complete = completeAsset('asset-1');
  const missing = pipeline.aggregatePortfolio({
    assets: [{ id: 'asset-1' }, { id: 'asset-2' }], reconciliations: [complete], inventoryCoverage: 'COMPLETE',
  });
  const unprovenInventory = pipeline.aggregatePortfolio({
    assets: [{ id: 'asset-1' }], reconciliations: [complete], inventoryCoverage: 'UNKNOWN',
  });

  assert.equal(missing.status, 'PARTIAL');
  assert.equal(missing.totalEconomicResult, null);
  assert.ok(missing.blockers.includes('ASSET_RECONCILIATION_MISSING'));
  assert.equal(unprovenInventory.status, 'PARTIAL');
  assert.equal(unprovenInventory.totalEconomicResult, null);
  assert.ok(unprovenInventory.blockers.includes('PORTFOLIO_INVENTORY_NOT_COMPLETE'));
});

test('duplicate portfolio identities fail closed without double counting', () => {
  const one = completeAsset('same-id');
  const portfolio = pipeline.aggregatePortfolio({
    assets: [{ id: 'same-id' }, { id: 'same-id' }], reconciliations: [one], inventoryCoverage: 'COMPLETE',
  });

  assert.equal(portfolio.status, 'PARTIAL');
  assert.equal(portfolio.totalEconomicResult, null);
  assert.ok(portfolio.blockers.includes('DUPLICATE_ASSET_ID'));
});

test('empty certified subset does not become a zero money subtotal', () => {
  const portfolio = pipeline.aggregatePortfolio({
    assets: [{ id: 'unknown-asset' }],
    reconciliations: [pipeline.reconcileAsset({ asset: { id: 'unknown-asset', type: 'Renda Fixa' } })],
    inventoryCoverage: 'UNKNOWN',
  });

  assert.equal(portfolio.status, 'PARTIAL');
  assert.equal(portfolio.certifiedEconomicResult, null);
  assert.equal(portfolio.certifiedCurrentMarket, null);
  assert.equal(portfolio.totalEconomicResult, null);
});

test('certified return is a cumulative contribution weighted ratio, not an average of percentages', () => {
  const a = completeAsset('asset-a', 110, 100);
  const b = completeAsset('asset-b', 220, 200);
  const portfolio = pipeline.aggregatePortfolio({
    assets: [{ id: 'asset-a' }, { id: 'asset-b' }], reconciliations: [a, b], inventoryCoverage: 'COMPLETE',
  });

  assert.equal(portfolio.status, 'COMPLETE');
  assert.equal(portfolio.certifiedEconomicResult, 30);
  assert.equal(portfolio.totalEconomicResult, 30);
  assert.equal(portfolio.certifiedReturnPct, 10);
  assert.equal(portfolio.totalReturnPct, 10);
  assert.equal(portfolio.coverageRatio, 1);
});

test('non-fixed-income assets remain NOT_AVAILABLE until their own evidence adapter exists', () => {
  const result = pipeline.reconcileAsset({ asset: { id: 'equity-1', type: 'Ação' } });
  assert.equal(result.status, 'NOT_AVAILABLE');
  assert.equal(result.economicResult.value, null);
  assert.ok(result.blockers.includes('ASSET_CLASS_NOT_SUPPORTED'));
});

test('MOVIDA and CRA remain PARTIAL and never expose arithmetic candidate totals', () => {
  for (const name of ['DEB MOVIDA - JUN/2029', 'CRA JBS - MAI/2039']) {
    const result = pipeline.reconcileAsset({
      asset: { id: `synthetic-${name}`, type: 'Renda Fixa', name },
      currentPosition: { value: 100, coverage: 'COMPLETE' },
      result: { status: 'PARTIAL', totalEconomicResult: null, coverage: { history: { status: 'PARTIAL' }, totalResult: 'PARTIAL' }, blockers: ['HISTORY_NOT_COMPLETE'] },
    });
    assert.equal(result.status, 'PARTIAL');
    assert.equal(result.economicResult.value, null);
  }
});

test('OPENING_UNKNOWN, duplicate, overlap, and unknown event evidence block fixed-income results', () => {
  const variants = [
    { name: 'opening', history: { ...completeCoverage().history, status: 'PARTIAL', openingPosition: 'UNKNOWN' } },
    { name: 'duplicate', history: { ...completeCoverage().history, duplicatesResolved: false } },
    { name: 'overlap', history: { ...completeCoverage().history, sourceOverlapResolved: false } },
  ];
  for (const variant of variants) {
    const result = engine.calculateFixedIncomeEconomicResult({
      currentMarketValue: 110,
      contributions: [{ id: 'application-1', type: 'APPLICATION', amount: 100, status: 'CONFIRMED', occurredOn: '2024-01-01' }],
      events: [], coverage: completeCoverage({ history: variant.history }), returnPercentBasis: 'CUMULATIVE_CONTRIBUTIONS_SIMPLE',
    });
    assert.equal(result.totalEconomicResult, null, variant.name);
  }
  const unknown = engine.calculateFixedIncomeEconomicResult({
    currentMarketValue: 110,
    contributions: [{ id: 'application-1', type: 'APPLICATION', amount: 100, status: 'CONFIRMED', occurredOn: '2024-01-01' }],
    events: [{ id: 'unknown-1', type: 'UNKNOWN', amount: 10, amountBasis: 'NET', status: 'RECEIVED', occurredOn: '2025-01-01' }],
    coverage: completeCoverage(), returnPercentBasis: 'CUMULATIVE_CONTRIBUTIONS_SIMPLE',
  });
  assert.equal(unknown.totalEconomicResult, null);
  assert.ok(unknown.blockers.includes('UNKNOWN_EVENT'));
});

test('expected income and projected tax cannot be certified as received or paid', () => {
  const expectedIncome = engine.calculateFixedIncomeEconomicResult({
    currentMarketValue: 110,
    contributions: [{ id: 'application-1', type: 'APPLICATION', amount: 100, status: 'CONFIRMED', occurredOn: '2024-01-01' }],
    events: [{ id: 'coupon-1', type: 'COUPON', amount: 10, amountBasis: 'NET', status: 'EXPECTED', occurredOn: '2025-01-01' }],
    coverage: completeCoverage(), returnPercentBasis: 'CUMULATIVE_CONTRIBUTIONS_SIMPLE',
  });
  const projectedTax = engine.calculateFixedIncomeEconomicResult({
    currentMarketValue: 110,
    contributions: [{ id: 'application-1', type: 'APPLICATION', amount: 100, status: 'CONFIRMED', occurredOn: '2024-01-01' }],
    events: [
      { id: 'coupon-1', type: 'COUPON', amount: 10, amountBasis: 'GROSS', status: 'RECEIVED', occurredOn: '2025-01-01' },
      { id: 'tax-1', type: 'IR', amount: 2, status: 'POTENTIAL', relatedEventId: 'coupon-1', occurredOn: '2025-01-01' },
    ], coverage: completeCoverage(), returnPercentBasis: 'CUMULATIVE_CONTRIBUTIONS_SIMPLE',
  });

  assert.equal(expectedIncome.incomeNet, null);
  assert.ok(expectedIncome.blockers.includes('EXPECTED_NOT_RECEIVED'));
  assert.equal(projectedTax.totalEconomicResult, null);
  assert.equal(projectedTax.taxesPaid, null);
  assert.ok(projectedTax.blockers.includes('INVALID_TAX_EVENT'));
});

test('redemptions and amortization are capital return, not income', () => {
  for (const type of ['PARTIAL_REDEMPTION', 'AMORTIZATION']) {
    const result = engine.calculateFixedIncomeEconomicResult({
      currentMarketValue: 80,
      contributions: [{ id: 'application-1', type: 'APPLICATION', amount: 100, status: 'CONFIRMED', occurredOn: '2024-01-01' }],
      events: [{ id: 'return-1', type, amount: 20, amountBasis: 'NET', status: 'RECEIVED', occurredOn: '2025-01-01' }],
      coverage: completeCoverage(), returnPercentBasis: 'CUMULATIVE_CONTRIBUTIONS_SIMPLE',
    });
    assert.equal(result.incomeNet, 0, type);
    assert.equal(result.capitalReturnNet, 20, type);
    assert.equal(result.totalEconomicResult, 0, type);
  }
});

test('gross receipt with linked paid tax is normalized once and not double-subtracted', () => {
  const result = engine.calculateFixedIncomeEconomicResult({
    currentMarketValue: 0,
    contributions: [{ id: 'application-1', type: 'APPLICATION', amount: 100, status: 'CONFIRMED', occurredOn: '2024-01-01' }],
    events: [
      { id: 'coupon-1', type: 'COUPON', amount: 100, amountBasis: 'GROSS', status: 'RECEIVED', occurredOn: '2025-01-01' },
      { id: 'tax-1', type: 'IR', amount: 10, status: 'PAID', relatedEventId: 'coupon-1', occurredOn: '2025-01-02' },
    ], coverage: completeCoverage(), returnPercentBasis: 'CUMULATIVE_CONTRIBUTIONS_SIMPLE',
  });
  assert.equal(result.incomeNet, 90);
  assert.equal(result.taxesPaid, 10);
  assert.equal(result.totalEconomicResult, -10);
});

test('pipeline module performs no hosted access or fiscal classification', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'financial-truth-reconciliation.js'), 'utf8');
  assert.doesNotMatch(source, /firebase|firestore|fetch\s*\(|fiscal|IRPF/i);
});

test('runtime RF snapshot consumes reconciliation output without activating Dashboard totals', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.equal((app.match(/<script src="financial-truth-reconciliation\.js"><\/script>/g) || []).length, 1);
  assert.match(app, /FinancialTruthReconciliation\?\.reconcileAsset/);
  assert.match(app, /reconciliation,\s*eventCount/);
  assert.match(app, /const totalResultWithEvents=null;/);
});
