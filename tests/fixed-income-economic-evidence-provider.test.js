'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const provider = require('../fixed-income-economic-evidence-provider.js');
const engine = require('../fixed-income-economic-result.js');
const adapter = require('../fixed-income-economic-result-adapter.js');

const trend = (name = 'Trend DI FIC RF Simples RL') => ({ id: 'trend-1', ticker: 'TREND', type: 'Renda Fixa', name });
const proof = (coverage = {}) => ({
  status: 'COMPLETE', periodStart: '2024-01-01', periodEnd: '2026-10-18',
  openingPosition: 'NONE', allEventsRepresented: true, duplicatesResolved: true,
  coverage: { contributions: 'COMPLETE', income: 'COMPLETE', taxes: 'COMPLETE', capitalReturns: 'COMPLETE', principal: 'COMPLETE', ...coverage },
});
const event = (id, type, fields = {}) => ({
  id, assetId: 'trend-1', ticker: 'TREND', date: '2025-01-01', type,
  grossValue: 0, netValue: 0, ir: 0, iof: 0, principalDelta: 0, source: 'Movimento confirmado', ...fields,
});

test('PROVIDER_ONLY_TREND_PRODUCTS_ELIGIBLE; exact products only', () => {
  for (const name of ['Trend DI FIC RF Simples RL', 'Trend DI II FIC RF Simples RL']) {
    assert.ok(provider.buildEvidence({ asset: trend(name), assets: [trend(name)], events: [] }));
  }
  for (const name of ['DEB MOVIDA - JUN/2029', 'CRA JBS - MAI/2039', 'Trend DI outro fundo']) {
    assert.equal(provider.buildEvidence({ asset: trend(name), assets: [trend(name)], events: [] }), null);
  }
  assert.equal(provider.buildEvidence({ asset: { ...trend(), type: 'Ação' }, assets: [trend()], events: [] }), null);
});

test('PROVIDER_UNKNOWN_FAILS_CLOSED and missing type does not become interest', () => {
  const result = provider.buildEvidence({ asset: trend(), assets: [trend()], events: [{ ...event('unknown-1', ''), description: 'Pagamento de juros', netValue: 80, status: 'RECEIVED' }], historyEvidence: proof() });
  assert.equal(result.events[0].type, 'UNKNOWN');
  assert.equal(result.coverage.history.status, 'PARTIAL');
  assert.equal(result.coverage.income, 'PARTIAL');
});

test('history completion requires period, no opening position, all events, and resolved duplicates', () => {
  const base = { asset: trend(), assets: [trend()], events: [event('application-1', 'aporte', { status: 'CONFIRMED', principalDelta: 100 })], historyEvidence: proof() };
  assert.equal(provider.buildEvidence({ ...base, historyEvidence: { ...proof(), periodStart: null } }).coverage.history.status, 'PARTIAL');
  assert.equal(provider.buildEvidence({ ...base, historyEvidence: { ...proof(), openingPosition: 'UNKNOWN' } }).coverage.history.status, 'PARTIAL');
  assert.equal(provider.buildEvidence({ ...base, historyEvidence: { ...proof(), allEventsRepresented: false } }).coverage.history.status, 'PARTIAL');
  assert.equal(provider.buildEvidence({ ...base, historyEvidence: { ...proof(), duplicatesResolved: false } }).coverage.history.status, 'PARTIAL');
  assert.equal(provider.buildEvidence(base).coverage.history.status, 'COMPLETE');
});

test('PROVIDER_MISSING_OPENING_HISTORY_IS_PARTIAL and migration baseline is not a contribution', () => {
  const baseline = event('baseline-1', 'aporte', { source: 'Migração', note: 'Saldo inicial anterior ao histórico de movimentações', principalDelta: 5000 });
  const result = provider.buildEvidence({ asset: trend(), assets: [trend()], events: [baseline], historyEvidence: proof() });
  assert.equal(result.contributions.length, 0);
  assert.equal(result.coverage.history.openingPosition, 'UNKNOWN');
  assert.equal(result.coverage.history.status, 'PARTIAL');
});

test('PROVIDER_NO_SYNTHETIC_BALANCING keeps unknown values absent instead of zero', () => {
  const row = event('unknown-1', '', { amount: undefined, grossValue: 0, netValue: 0 });
  const result = provider.buildEvidence({ asset: trend(), assets: [trend()], events: [row], historyEvidence: proof() });
  assert.equal(result.events[0].type, 'UNKNOWN');
  assert.equal(result.events[0].amount, null);
  assert.equal(result.coverage.history.status, 'PARTIAL');
});

test('missing or zero receipt/tax amounts are not promoted from normalizer defaults', () => {
  const coupon = event('coupon-zero-default', 'juros', { status: 'RECEIVED' });
  const tax = event('tax-zero-default', 'ir', { status: 'PAID', relatedEventId: 'coupon-zero-default' });
  const result = provider.buildEvidence({ asset: trend(), assets: [trend()], events: [coupon, tax], historyEvidence: proof() });
  assert.equal(result.events.find(row => row.id === coupon.id).amount, null);
  assert.equal(result.events.find(row => row.id === tax.id).amount, null);
  assert.equal(result.coverage.history.status, 'PARTIAL');
});

test('PROVIDER_COMPLETE_HISTORY_REQUIRES_STABLE_IDS_AND_DATES', () => {
  const noId = event('', 'juros', { status: 'RECEIVED', netValue: 10 });
  const noDate = event('coupon-2', 'juros', { status: 'RECEIVED', date: '' , netValue: 10 });
  for (const row of [noId, noDate]) {
    const result = provider.buildEvidence({ asset: trend(), assets: [trend()], events: [row], historyEvidence: proof() });
    assert.equal(result.coverage.history.status, 'PARTIAL');
  }
});

test('PROVIDER_DUPLICATE_EVENT_BLOCKS_COMPLETE without deduplicating rows', () => {
  const rows = [event('coupon-1', 'juros', { status: 'RECEIVED', netValue: 10 }), event('coupon-2', 'juros', { status: 'RECEIVED', netValue: 10 })];
  const result = provider.buildEvidence({ asset: trend(), assets: [trend()], events: rows, historyEvidence: proof() });
  assert.equal(result.events.length, 2);
  assert.equal(result.coverage.history.status, 'PARTIAL');
});

test('ambiguous ticker links block completeness instead of dropping unrelated-looking rows', () => {
  const rows = [trend(), { ...trend(), id: 'trend-2' }];
  const result = provider.buildEvidence({ asset: rows[0], assets: rows, events: [event('app-1', 'aporte', { assetId: '', status: 'CONFIRMED', principalDelta: 100 })], historyEvidence: proof() });
  assert.ok(result.blockers.includes('AMBIGUOUS_ASSET_LINK'));
  assert.equal(result.coverage.history.status, 'PARTIAL');
});

test('PROVIDER_EXPECTED_NOT_RECEIVED; unknown runtime status blocks component coverage', () => {
  for (const status of ['EXPECTED', undefined]) {
    const result = provider.buildEvidence({ asset: trend(), assets: [trend()], events: [event('coupon-1', 'juros', { status, netValue: 10 })], historyEvidence: proof() });
    assert.equal(result.coverage.history.status, 'PARTIAL');
    assert.equal(result.coverage.income, 'PARTIAL');
  }
});

test('PROVIDER_REDEMPTION_NOT_INCOME and PROVIDER_AMORTIZATION_NOT_INCOME', () => {
  const rows = [
    event('redeem-1', 'resgate_parcial', { status: 'RECEIVED', grossValue: 100, netValue: 90, principalDelta: -100 }),
    event('amort-1', 'amortizacao', { status: 'RECEIVED', grossValue: 20, netValue: 20, principalDelta: -20 }),
  ];
  const result = provider.buildEvidence({ asset: trend(), assets: [trend()], events: rows, historyEvidence: proof() });
  assert.deepEqual(result.events.map(row => row.type), ['PARTIAL_REDEMPTION', 'AMORTIZATION']);
  assert.ok(result.events.every(row => !['COUPON', 'INTEREST', 'INCOME'].includes(row.type)));
});

test('PROVIDER_PAID_IR_LINKED_ONCE; projected IR is never promoted to paid', () => {
  const rows = [
    event('redeem-1', 'resgate_parcial', { status: 'RECEIVED', grossValue: 100, netValue: 90, principalDelta: -100 }),
    event('tax-paid', 'ir', { status: 'PAID', amount: 10, relatedEventId: 'redeem-1' }),
    event('tax-projected', 'iof', { status: 'POTENTIAL', amount: 3, relatedEventId: 'redeem-1' }),
  ];
  const result = provider.buildEvidence({ asset: trend(), assets: [trend()], events: rows, historyEvidence: proof() });
  assert.equal(result.events.filter(row => row.type === 'IR').length, 1);
  assert.equal(result.events.find(row => row.type === 'IR').relatedEventId, 'redeem-1');
  assert.equal(result.events.find(row => row.id === 'tax-projected').type, 'IOF');
  assert.equal(result.events.find(row => row.id === 'tax-projected').status, 'UNKNOWN');
  assert.equal(result.events.find(row => row.id === 'tax-projected').amount, null);
});

test('validated paid IR with complete tax coverage can remain COMPLETE and net gross cash exactly once', () => {
  const asset = trend();
  const evidence = provider.buildEvidence({
    asset,
    assets: [asset],
    currentPositionCoverage: 'COMPLETE',
    historyEvidence: proof(),
    events: [
      event('application-1', 'aporte', { date: '2024-06-01', status: 'CONFIRMED', principalDelta: 100 }),
      event('redemption-1', 'resgate_parcial', { date: '2025-06-01', status: 'RECEIVED', amount: 100, amountBasis: 'GROSS', principalDelta: -100 }),
      event('tax-paid', 'ir', { date: '2025-06-02', status: 'PAID', amount: 10, relatedEventId: 'redemption-1' }),
    ],
  });

  assert.equal(evidence.coverage.history.status, 'COMPLETE');
  assert.equal(evidence.coverage.taxes, 'COMPLETE');

  const calculated = adapter.calculate({
    currentMarketValue: 0,
    currentPositionKnown: true,
    currentPositionCoverage: 'COMPLETE',
    evidence,
    engine: engine.calculateFixedIncomeEconomicResult,
  });

  assert.equal(calculated.taxesPaid, 10);
  assert.equal(calculated.capitalReturnNet, 90);
  assert.equal(calculated.totalEconomicResult, -10);
});

test('PROVIDER_GROSS_NET_NOT_MIXED keeps one explicit cash basis', () => {
  const result = provider.buildEvidence({ asset: trend(), assets: [trend()], events: [event('coupon-1', 'juros', { status: 'RECEIVED', grossValue: 100, netValue: 90, ir: 10 })], historyEvidence: proof() });
  const coupon = result.events[0];
  assert.equal(coupon.amountBasis, 'NET');
  assert.equal(coupon.amount, 90);
  assert.equal(Object.hasOwn(coupon, 'grossAmount'), false);
  assert.equal(result.coverage.taxes, 'PARTIAL');
});

test('PROVIDER_MISSING_APPLICATION_BLOCKS_COMPLETE and duplicate linked source risk blocks', () => {
  const noApplication = provider.buildEvidence({ asset: trend(), assets: [trend()], events: [event('coupon-1', 'juros', { status: 'RECEIVED', netValue: 10 })], historyEvidence: proof() });
  assert.equal(noApplication.coverage.contributions, 'UNKNOWN');
  const withApplication = [event('app-1', 'aporte', { status: 'CONFIRMED', principalDelta: 100 }), event('coupon-1', 'juros', { status: 'RECEIVED', netValue: 10 })];
  const ambiguous = provider.buildEvidence({ asset: trend(), assets: [trend()], events: withApplication, aportes: [{ id: 'legacy-ap-1', ticker: 'TREND', type: 'Renda Fixa', operation: 'compra', date: '2024-01-01', total: 100 }], historyEvidence: proof() });
  assert.notEqual(ambiguous.coverage.history.status, 'COMPLETE');
  const linked = provider.buildEvidence({ asset: trend(), assets: [trend()], events: withApplication, linkedIncomeEvents: [
    { sourceEventKind: 'rf', sourceEventId: 'coupon-1', ticker: 'TREND', assetName: trend().name },
    { sourceEventKind: 'rf', sourceEventId: 'coupon-1', ticker: 'TREND', assetName: trend().name },
  ], historyEvidence: proof() });
  assert.ok(linked.blockers.includes('DUPLICATE_LINKED_INCOME_SOURCE'));
  assert.equal(linked.coverage.history.status, 'PARTIAL');
});

test('PROVIDER_TREND_DI_ENGINE_DERIVES only from explicit complete synthetic evidence', () => {
  const asset = trend();
  const result = provider.buildEvidence({ asset, assets: [asset], historyEvidence: proof(), currentPositionCoverage: 'COMPLETE', events: [
    event('application-1', 'aporte', { date: '2024-06-01', status: 'CONFIRMED', principalDelta: 65644.47 }),
    event('redemption-1', 'resgate_parcial', { date: '2025-06-01', status: 'RECEIVED', amount: 9035.34, amountBasis: 'NET', principalDelta: -9097 }),
  ] });
  const calculated = adapter.calculate({ currentMarketValue: 64018.06, currentPositionKnown: true, currentPositionCoverage: 'COMPLETE', evidence: result, engine: engine.calculateFixedIncomeEconomicResult });
  assert.equal(result.coverage.history.status, 'COMPLETE');
  assert.equal(calculated.totalEconomicResult, 7408.93);
  assert.equal(calculated.incomeNet, 0);
  assert.equal(calculated.capitalReturnNet, 9035.34);
});

test('PROVIDER_TREND_DI_II_ENGINE_DERIVES_WITHOUT_OPEN_POSITION_BASIS', () => {
  const asset = trend('Trend DI II FIC RF Simples RL');
  const result = provider.buildEvidence({ asset, assets: [asset], historyEvidence: proof({ costBasis: 'UNKNOWN' }), currentPositionCoverage: 'COMPLETE', events: [
    event('application-1', 'aporte', { date: '2024-06-01', status: 'CONFIRMED', principalDelta: 73157.60 }),
    event('redemption-1', 'resgate_parcial', { date: '2025-06-01', status: 'RECEIVED', amount: 48965.43, amountBasis: 'NET', principalDelta: -49237.86 }),
  ] });
  const calculated = adapter.calculate({ currentMarketValue: 28024.01, currentPositionKnown: true, currentPositionCoverage: 'COMPLETE', evidence: result, engine: engine.calculateFixedIncomeEconomicResult });
  assert.equal(calculated.totalEconomicResult, 3831.84);
  assert.equal(calculated.openPositionResult, null);
});

test('PROVIDER_MOVIDA_NOT_CERTIFIED and PROVIDER_CRA_NOT_CERTIFIED', () => {
  for (const name of ['DEB MOVIDA - JUN/2029', 'CRA JBS - MAI/2039']) {
    assert.equal(provider.buildEvidence({ asset: trend(name), assets: [trend(name)], events: [] }), null);
  }
});

test('real runtime evidence is gated by REAL authorization and logout clears source state', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const start = source.indexOf('function rfEconomicEvidenceForAsset(asset){');
  const end = source.indexOf('function rfIntelligenceSnapshot(){', start);
  assert.notEqual(start, -1); assert.notEqual(end, -1);
  let calls = 0;
  const context = {
    FB: { accountMode: 'DEMO', user: null, access: { allowed: false }, cloudLoaded: false },
    S: { assets: [trend()], rfEvents: [event('live-1', 'juros', { status: 'RECEIVED', netValue: 1 })], aportes: [], proventos: [] },
    rfPosNorm: value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim(),
    assetRfName: asset => asset.name,
    rfAssetEventId: asset => asset.id,
    isLocalTestMode: () => false,
    rfValues: () => ({ hasExplicitCurrent: true, current: 100, currentState: { state: 'valid' } }),
    assetRfCurrentValueMeta: () => ({ authority: 'MANUAL_AUTHORITATIVE', isFallback: false, isEstimated: false, isStale: false }),
    FixedIncomeEconomicEvidenceProvider: { buildEvidence(args) { calls++; return provider.buildEvidence(args); } },
    FixedIncomeEconomicResultTestEvidence: { 'trend-1': { events: [{ id: 'synthetic' }] } },
  };
  vm.createContext(context); vm.runInContext(source.slice(start, end), context);
  context.asset = trend();
  assert.equal(vm.runInContext('rfEconomicEvidenceForAsset(asset)', context), null);
  assert.equal(calls, 0, 'demo must not invoke the real provider');
  context.FB.accountMode = 'REAL'; context.FB.user = { uid: 'owner' }; context.FB.access.allowed = true; context.FB.cloudLoaded = false;
  assert.equal(vm.runInContext('rfEconomicEvidenceForAsset(asset)', context), null);
  assert.equal(calls, 0, 'unauthorized/unloaded runtime must not invoke provider');
  context.FB.cloudLoaded = true;
  const runtimeEvidence = vm.runInContext('rfEconomicEvidenceForAsset(asset)', context);
  assert.ok(runtimeEvidence);
  assert.equal(runtimeEvidence.coverage.history.status, 'PARTIAL', 'runtime data has no proof manifest and cannot certify complete history');
  assert.equal(calls, 1);
  const clearStart = source.indexOf('function clearRealStateInMemory(){');
  const clearEnd = source.indexOf('function sanitizeFirestoreValue(', clearStart);
  vm.runInContext(source.slice(clearStart, clearEnd), context);
  vm.runInContext('clearRealStateInMemory()', context);
  assert.equal(context.S.rfEvents.length, 0);
  assert.equal(context.FB.cloudLoaded, false);
  assert.equal(vm.runInContext('rfEconomicEvidenceForAsset(asset)', context), null);
  context.FB.accountMode = 'BLOCKED'; context.FB.user = null; context.FB.access.allowed = false; context.FB.cloudLoaded = false;
  context.S = { assets: [], rfEvents: [], aportes: [], proventos: [] };
  assert.equal(vm.runInContext('rfEconomicEvidenceForAsset(asset)', context), null);
  assert.deepEqual(context.S, { assets: [], rfEvents: [], aportes: [], proventos: [] });
});

test('runtime data sources and strict authenticated gate remain explicit', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const start = source.indexOf('function rfEconomicEvidenceForAsset(asset){');
  const end = source.indexOf('function rfIntelligenceSnapshot(){', start);
  const integration = source.slice(start, end);
  assert.match(integration, /FB\.user/);
  assert.match(integration, /FB\.access\?\.allowed!==true/);
  assert.match(integration, /FB\.cloudLoaded!==true/);
  assert.match(integration, /S\.assets/);
  assert.match(integration, /S\.rfEvents/);
  assert.match(integration, /S\.aportes/);
  assert.match(integration, /S\.proventos/);
  assert.doesNotMatch(integration, /FixedIncomeEconomicResultEvidence/);
  assert.match(integration, /FixedIncomeEconomicEvidenceProvider\?\.buildEvidence/);
  assert.match(source, /<script src="fixed-income-economic-evidence-provider\.js"><\/script>/);
});
