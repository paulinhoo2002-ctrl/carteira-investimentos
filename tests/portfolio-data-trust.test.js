const test = require('node:test');
const assert = require('node:assert/strict');
const Trust = require('../portfolio-data-trust.js');

const NOW = Date.parse('2026-09-19T12:00:00Z');
const asset = (overrides = {}) => ({ id: 'a1', ticker: 'ABCD3', name: 'Ativo', type: 'Ação', current_price: 10, quoteSource: 'Yahoo Finance', quoteUpdatedAt: '2026-09-19T10:00:00Z', sector: 'Financeiro', issuer: 'Emissor', ...overrides });

test('current quote is classified from a real timestamp', () => assert.equal(Trust.freshness(asset(), { now: NOW }).status, 'CURRENT'));
test('stale quote is visible without changing its value', () => assert.equal(Trust.freshness(asset({ quoteUpdatedAt: '2026-09-10T10:00:00Z' }), { now: NOW }).status, 'STALE'));
test('missing quote timestamp is UNKNOWN', () => assert.equal(Trust.freshness(asset({ quoteUpdatedAt: '' }), { now: NOW }).status, 'UNKNOWN'));
test('invalid quote timestamp is UNKNOWN', () => assert.equal(Trust.freshness(asset({ quoteUpdatedAt: 'not-a-date' }), { now: NOW }).status, 'UNKNOWN'));
test('future timestamp is rejected', () => assert.equal(Trust.freshness(asset({ quoteUpdatedAt: '2027-01-01' }), { now: NOW }).status, 'UNKNOWN'));
test('known source is preserved', () => assert.equal(Trust.provenance(asset()).source, 'Yahoo Finance'));
test('unknown source is not invented', () => assert.equal(Trust.provenance(asset({ quoteSource: '' })).source, ''));
test('provenance metadata is detected', () => assert.equal(Trust.provenance(asset()).hasProvenance, true));
test('missing provenance remains missing', () => assert.equal(Trust.provenance({}).hasProvenance, false));
test('manual fixed income is classified', () => assert.equal(Trust.fixedIncomeStatus({ type: 'Renda Fixa', currentMeta: { authority: 'MANUAL', manual: true } }), 'MANUAL'));
test('shadow fixed income is classified', () => assert.equal(Trust.fixedIncomeStatus({ type: 'Renda Fixa', currentMeta: { status: 'SHADOW_ONLY' } }), 'SHADOW'));
test('unsupported fixed income is classified', () => assert.equal(Trust.fixedIncomeStatus({ type: 'Renda Fixa', currentMeta: { status: 'UNSUPPORTED' } }), 'UNSUPPORTED'));
test('unknown fixed income is not treated as manual', () => assert.equal(Trust.fixedIncomeStatus({ type: 'Renda Fixa' }), 'UNKNOWN'));
test('class coverage counts known and unknown', () => { const c = Trust.classificationCoverage([asset(), asset({ id: 'a2', type: '' })]); assert.equal(c.className.knownCount, 1); assert.equal(c.className.unknownCount, 1); });
test('sector coverage preserves unknown', () => { const c = Trust.classificationCoverage([asset({ sector: '' })]); assert.equal(c.sector.unknownCount, 1); });
test('issuer coverage preserves unknown', () => { const c = Trust.classificationCoverage([asset({ issuer: '' })]); assert.equal(c.issuer.unknownCount, 1); });
test('legitimate zero is distinct from unknown', () => { assert.deepEqual(Trust.valueState({ current: 0 }), { value: 0, status: 'LEGITIMATE_ZERO' }); });
test('unknown value is not zero', () => { assert.deepEqual(Trust.valueState({ current: null }), { value: null, status: 'UNKNOWN' }); });
test('cloud connected requires applied snapshot', () => assert.equal(Trust.cloudHealth({ authReady: true, backendReachable: true, snapshotReceived: true, applied: true }).status, 'CONNECTED'));
test('cloud connecting is distinct from empty', () => assert.equal(Trust.cloudHealth({ authReady: true, backendReachable: true }).status, 'CONNECTING'));
test('cloud error is distinct from empty', () => assert.equal(Trust.cloudHealth({ authReady: true, error: true }).status, 'ERROR'));
test('false-zero detector flags received cloud data not applied', () => assert.equal(Trust.falseZeroDiagnostic({ authReady: true, backendReachable: true, snapshotReceived: true, snapshotAssetCount: 4, stateAssetCount: 0, applied: false }).status, 'MISMATCH'));
test('cloud empty is confirmed only when snapshot says empty', () => assert.equal(Trust.falseZeroDiagnostic({ authReady: true, backendReachable: true, snapshotReceived: true, snapshotAssetCount: 0, stateAssetCount: 0, applied: true }).status, 'EMPTY_CONFIRMED'));
test('loading is not empty', () => assert.notEqual(Trust.falseZeroDiagnostic({ loading: true }).status, 'EMPTY_CONFIRMED'));
test('error is not empty', () => assert.notEqual(Trust.falseZeroDiagnostic({ error: true }).status, 'EMPTY_CONFIRMED'));
test('patrimony reconciliation passes equal values', () => assert.equal(Trust.reconcileValues([100, 100, 100]).status, 'OK'));
test('patrimony mismatch is explicit', () => assert.equal(Trust.reconcileValues([100, 90]).status, 'MISMATCH'));
test('not comparable is not forced to pass', () => assert.equal(Trust.reconcileValues([100]).status, 'NOT_COMPARABLE'));
test('fixed-income reconciliation is available through build', () => assert.equal(Trust.build({ assets: [], fixedIncomeTotal: 1, reportsFixedIncomeTotal: 1, dashboardFixedIncomeTotal: 1 }).reconciliations.fixedIncome.status, 'OK'));
test('dividend reconciliation uses the same semantic totals', () => assert.equal(Trust.build({ assets: [], dividendsTotal: 2, reportsDividendsTotal: 2, timelineIncomeTotal: 2 }).reconciliations.dividends.status, 'OK'));
test('dividend reconciliation marks partial timeline coverage instead of a false mismatch', () => {
  const result = Trust.build({ assets: [], dividendsTotal: 10, reportsDividendsTotal: 10, timelineIncomeTotal: 6, dividendEventCount: 3, timelineIncomeEventCount: 2 });
  assert.equal(result.reconciliations.dividends.status, 'PARTIAL_COVERAGE');
  assert.match(result.reconciliations.dividends.reason, /cobertura|Timeline/i);
});
test('transaction reconciliation compares counts', () => assert.equal(Trust.build({ assets: [], transactionCount: 2, timelineTransactionCount: 2 }).reconciliations.transactions.status, 'OK'));
test('transaction mismatch remains explicit when comparable counts differ', () => {
  const result = Trust.build({ assets: [], transactionCount: 2, timelineTransactionCount: 1 });
  assert.equal(result.reconciliations.transactions.status, 'PARTIAL_COVERAGE');
  assert.match(result.reconciliations.transactions.reason, /movimentações normalizadas/);
});
test('transaction mismatch remains explicit when coverage is complete', () => {
  const result = Trust.build({ assets: [], transactionCount: 2, timelineTransactionCount: 1, transactionCoverageComplete: true });
  assert.equal(result.reconciliations.transactions.status, 'MISMATCH');
});
test('timeline/detail reconciliation compares counts', () => assert.equal(Trust.build({ assets: [], timelineCount: 3, detailTimelineCount: 3 }).reconciliations.timeline.status, 'OK'));
test('exact duplicate is identified by stable id', () => assert.equal(Trust.duplicateDiagnostics([{ id: 'x' }, { id: 'x' }]).exact.length, 1));
test('potential duplicate is identified by natural identity', () => assert.equal(Trust.duplicateDiagnostics([{ date: '2026-01-01', type: 'DIVIDEND', ticker: 'A', value: 1 }, { date: '2026-01-01', type: 'DIVIDEND', ticker: 'A', value: 1 }]).potential.length, 1));
test('unique event remains unique', () => assert.equal(Trust.duplicateDiagnostics([{ id: 'x' }, { id: 'y' }]).unique.length, 2));
test('reference events can be passed to diagnostics without income mutation', () => { const model = Trust.build({ assets: [], events: [{ id: 'r', status: 'REFERENCE', value: 100 }] }); assert.equal(model.duplicates.rows.length, 1); assert.equal(model.summary.totalKnownValue, 0); });
test('shadow events do not affect asset values', () => { const model = Trust.build({ assets: [asset()], events: [{ id: 's', status: 'SHADOW', value: 999 }] }); assert.equal(model.summary.totalKnownValue, 10); });
test('build preserves unknown value state', () => assert.equal(Trust.build({ assets: [asset({ current_price: null })] }).assets[0].valueStatus, 'UNKNOWN'));
test('build preserves legitimate zero value state', () => assert.equal(Trust.build({ assets: [asset({ current_price: 0 })] }).assets[0].valueStatus, 'LEGITIMATE_ZERO'));
test('build counts stale positions', () => assert.equal(Trust.build({ assets: [asset({ quoteUpdatedAt: '2026-09-01' })] }, { now: NOW }).summary.staleQuoteCount, 1));
test('market data aggregation uses the same freshness buckets as the summary', () => {
  const assets = [
    ...Array.from({ length: 36 }, (_, index) => asset({ id: `fresh-${index}`, quoteStatus: index === 0 ? 'STALE' : 'OK' })),
    ...Array.from({ length: 2 }, (_, index) => asset({ id: `stale-${index}`, quoteStatus: 'STALE', quoteUpdatedAt: '2026-09-01T10:00:00Z' })),
    ...Array.from({ length: 3 }, (_, index) => asset({ id: `unknown-${index}`, quoteStatus: 'UNKNOWN', quoteUpdatedAt: '' })),
  ];
  const model = Trust.build({ assets }, { now: NOW });
  assert.equal(model.summary.currentQuoteCount, 36);
  assert.equal(model.summary.staleQuoteCount, 2);
  assert.equal(model.summary.unknownQuoteCount, 3);
  assert.equal(model.marketData.freshCount, model.summary.currentQuoteCount);
  assert.equal(model.marketData.staleCount, model.summary.staleQuoteCount);
  assert.equal(model.marketData.unknownCount, model.summary.unknownQuoteCount);
  assert.equal(model.marketData.freshCount + model.marketData.staleCount + model.marketData.unknownCount, assets.length);
});
test('build counts provenance gaps', () => assert.equal(Trust.build({ assets: [asset({ quoteSource: '', quoteUpdatedAt: '' })] }).summary.noProvenanceCount, 1));
test('build counts fixed-income authority states', () => { const model = Trust.build({ assets: [asset({ type: 'Renda Fixa', currentMeta: { authority: 'MANUAL', manual: true } })] }); assert.equal(model.summary.manualFixedIncomeCount, 1); });
test('search filters ticker and source', () => { const model = Trust.build({ assets: [asset(), asset({ id: 'a2', ticker: 'EFGH4', quoteSource: 'Importado' })] }); assert.equal(Trust.filter(model, { search: 'ABCD3' }).length, 1); assert.equal(Trust.filter(model, { source: 'Importado' }).length, 1); });
test('status filter is factual', () => { const model = Trust.build({ assets: [asset({ quoteUpdatedAt: '2026-09-01' }), asset({ id: 'a2' })] }, { now: NOW }); assert.equal(Trust.filter(model, { status: 'STALE' }).length, 1); });
test('current and stale statuses are not scores', () => assert.equal(Object.prototype.hasOwnProperty.call(Trust.build({ assets: [asset()] }).assets[0], 'score'), false));
test('summary has no prescriptive language', () => { const text = JSON.stringify(Trust.build({ assets: [asset()] })); assert.equal(/compre|venda|rebalanceie|oportunidade|melhor|pior/i.test(text), false); });
test('cloud snapshot applied does not imply a write', () => { const model = Trust.build({ assets: [asset()], cloud: { authReady: true, backendReachable: true, snapshotReceived: true, applied: true } }); assert.equal(model.cloud.status, 'CONNECTED'); });
test('unknown cloud state stays unknown', () => assert.equal(Trust.cloudHealth({}).status, 'AUTHENTICATING'));
test('empty model is explicit and safe', () => { const model = Trust.build({ assets: [], cloud: { authReady: true, backendReachable: true, snapshotReceived: true, applied: true, snapshotAssetCount: 0 } }); assert.equal(model.summary.assetCount, 0); assert.equal(model.falseZero.status, 'EMPTY_CONFIRMED'); });
test('import health remains descriptive and read-only', () => { const model = Trust.build({ importHealth: { status: 'DETECTED', previewCount: 4, duplicateCount: 1 } }); assert.equal(model.importHealth.status, 'DETECTED'); assert.equal(model.importHealth.previewCount, 4); assert.equal(model.importHealth.duplicateCount, 1); });
test('corporate health keeps shadow/reference separate from realized', () => { const model = Trust.build({ corporateHealth: { detectedShadowCount: 2, referenceCount: 1, realizedCount: 0 } }); assert.equal(model.corporateHealth.detectedShadowCount, 2); assert.equal(model.corporateHealth.referenceCount, 1); assert.equal(model.corporateHealth.realizedCount, 0); });
