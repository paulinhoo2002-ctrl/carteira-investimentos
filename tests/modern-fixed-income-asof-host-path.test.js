// V263 regression: prove as-of CONFIDENCE provenance through the REAL path
// legacy asset -> hostFixedIncomeReadonlySource mapper -> readonly contract -> valuationState.
// Prevents semantic collapse of MEDIUM broker metadata into HIGH explicit evidence.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const BASE = path.join(__dirname, '..', 'modern', 'src');
const HOST_SRC = path.join(BASE, 'bootstrap', 'hostFixedIncomeReadonlySource.ts');
const VALUATION_STATE = path.join(BASE, 'domain', 'fixedIncome', 'valuationState.ts');

const REFERENCE_DATE = '2026-09-25';
const GENERATED_AT = '2026-09-25T00:00:00.000Z';

async function loadModules() {
  const [host, domain] = await Promise.all([
    import(pathToFileURL(HOST_SRC).href),
    import(pathToFileURL(VALUATION_STATE).href),
  ]);
  return { createHostFixedIncomeReadonlySource: host.createHostFixedIncomeReadonlySource, computeFixedIncomeValuationState: domain.computeFixedIncomeValuationState };
}

function mkAsset(overrides = {}) {
  return {
    id: 'rf-x1',
    ticker: 'CDBX1',
    name: 'CDB X1',
    type: 'renda fixa',
    rf_subtype: 'CDB',
    rf_applied_value: 1000,
    rf_liquid_value: 1100,
    rf_contract_rate: '100% CDI',
    rf_maturity_date: '2027-01-01',
    ...overrides,
  };
}

// Full real path: mapper -> contract -> domain state
async function confidenceThroughRealPath(overrides) {
  const { createHostFixedIncomeReadonlySource, computeFixedIncomeValuationState } = await loadModules();
  const source = createHostFixedIncomeReadonlySource({
    getAssets: () => [mkAsset(overrides)],
    getGeneratedAt: () => GENERATED_AT,
  });
  const snapshot = source.getSnapshot();
  assert.ok(snapshot.items.length === 1, 'mapper produced no item');
  const item = snapshot.items[0];
  const state = computeFixedIncomeValuationState(item, [], [], REFERENCE_DATE);
  return { item, state };
}

test('host path: explicit financialAsOf -> HIGH, source financialAsOf', async () => {
  const { state } = await confidenceThroughRealPath({ financialAsOf: '2026-09-20' });
  assert.strictEqual(state.authoritativeAsOfConfidence, 'HIGH');
  assert.strictEqual(state.authoritativeAsOfSource, 'financialAsOf');
  assert.strictEqual(state.authoritativeValueAsOf, '2026-09-20');
});

test('host path: explicit valuationAsOf -> HIGH', async () => {
  const { state, item } = await confidenceThroughRealPath({ valuationAsOf: '2026-09-20' });
  // The mapper collapses explicit aliases (financialAsOf/valuationAsOf/rf_valuation_as_of)
  // into financialAsOfRaw, so the domain labels the source as the explicit family
  // ('financialAsOf'); the per-alias label is covered by the direct-domain unit test.
  assert.strictEqual(item.financialAsOfRaw, '2026-09-20');
  assert.strictEqual(state.authoritativeAsOfConfidence, 'HIGH');
  assert.strictEqual(state.authoritativeValueAsOf, '2026-09-20');
});

test('host path: broker quoteUpdatedAt only -> MEDIUM (not promoted to HIGH)', async () => {
  const { state, item } = await confidenceThroughRealPath({ quoteUpdatedAt: '2026-09-20T13:00:00.000Z' });
  assert.strictEqual(item.financialAsOfRaw, null, 'broker metadata must not enter financialAsOfRaw');
  assert.strictEqual(item.quoteUpdatedAtRaw, '2026-09-20T13:00:00.000Z');
  assert.strictEqual(state.authoritativeAsOfConfidence, 'MEDIUM');
  assert.strictEqual(state.authoritativeAsOfSource, 'quoteUpdatedAt');
  assert.strictEqual(state.authoritativeValueAsOf, '2026-09-20');
});

test('host path: updated_at (snake) only -> MEDIUM', async () => {
  const { state } = await confidenceThroughRealPath({ updated_at: '2026-09-20T13:00:00.000Z' });
  assert.strictEqual(state.authoritativeAsOfConfidence, 'MEDIUM');
  assert.strictEqual(state.authoritativeAsOfSource, 'quoteUpdatedAt');
});

test('host path: updatedAt (camel) only -> MEDIUM', async () => {
  const { state } = await confidenceThroughRealPath({ updatedAt: '2026-09-20T13:00:00.000Z' });
  assert.strictEqual(state.authoritativeAsOfConfidence, 'MEDIUM');
  assert.strictEqual(state.authoritativeAsOfSource, 'quoteUpdatedAt');
});

test('host path: explicit financialAsOf wins over broker quoteUpdatedAt', async () => {
  const { state } = await confidenceThroughRealPath({
    financialAsOf: '2026-09-01',
    quoteUpdatedAt: '2026-09-24T10:00:00.000Z',
  });
  assert.strictEqual(state.authoritativeAsOfConfidence, 'HIGH');
  assert.strictEqual(state.authoritativeValueAsOf, '2026-09-01');
});

test('host path: no timestamp -> UNKNOWN (never zero, never LIVE)', async () => {
  const { state } = await confidenceThroughRealPath({});
  assert.strictEqual(state.authoritativeAsOfConfidence, 'UNKNOWN');
  assert.strictEqual(state.authoritativeValueAsOf, null);
  assert.strictEqual(state.authoritativeFreshness, 'UNKNOWN');
});

test('host path: application/captured/imported/reconstruction dates are NEVER promoted', async () => {
  const { state, item } = await confidenceThroughRealPath({
    applicationDate: '2026-09-20',
    capturedAt: '2026-09-21',
    importedAt: '2026-09-22',
    reconstructedAt: '2026-09-23',
  });
  assert.strictEqual(item.financialAsOfRaw, null);
  assert.strictEqual(item.quoteUpdatedAtRaw, null);
  assert.strictEqual(state.authoritativeAsOfConfidence, 'UNKNOWN');
  assert.strictEqual(state.authoritativeValueAsOf, null);
});

test('host path: future timestamp -> UNKNOWN', async () => {
  const { state } = await confidenceThroughRealPath({ financialAsOf: '2027-01-01' });
  assert.strictEqual(state.authoritativeAsOfConfidence, 'UNKNOWN');
  assert.strictEqual(state.authoritativeValueAsOf, null);
  assert.strictEqual(state.authoritativeFreshness, 'UNKNOWN');
});

test('contract: legacy snapshot WITHOUT new fields remains valid', async () => {
  const contract = await import(pathToFileURL(path.join(BASE, 'features', 'fixed-income', 'fixedIncomeReadonlyContract.mjs')).href);
  const legacySnapshot = {
    version: 1,
    generatedAt: GENERATED_AT,
    notice: 'Snapshot legado.',
    summary: {
      totalApplied: 1000, totalGross: null, totalLiquid: 1100, totalProfit: null,
      totalIrValue: null, totalIofValue: null, totalCombinedTaxValue: null,
      totalUnavailableValue: null, itemCount: 1,
    },
    items: [{
      id: 'rf-legacy', ticker: 'CDBL1', name: 'CDB Legacy', subtype: 'CDB', issuer: null,
      applicationDate: null, maturityDate: null, contractedRate: null, indexer: null,
      appliedValue: 1000, grossValue: null, liquidValue: 1100, profitValue: null,
      irValue: null, iofValue: null, combinedTaxValue: null, liquidity: null,
      unavailableValue: null, maturityStatus: 'A vencer', note: null,
    }],
  };
  assert.strictEqual(contract.isReadonlyFixedIncomeSnapshot(legacySnapshot), true);
  const normalized = contract.normalizeReadonlyFixedIncomeSnapshot(legacySnapshot);
  assert.strictEqual(normalized.items.length, 1);
  assert.ok(!('financialAsOfRaw' in normalized.items[0]));
  assert.ok(!('quoteUpdatedAtRaw' in normalized.items[0]));
});

test('contract: snapshot WITH both raw fields normalizes and clones them', async () => {
  const contract = await import(pathToFileURL(path.join(BASE, 'features', 'fixed-income', 'fixedIncomeReadonlyContract.mjs')).href);
  const withFields = {
    version: 1,
    generatedAt: GENERATED_AT,
    notice: 'Snapshot novo.',
    summary: {
      totalApplied: 1000, totalGross: null, totalLiquid: 1100, totalProfit: null,
      totalIrValue: null, totalIofValue: null, totalCombinedTaxValue: null,
      totalUnavailableValue: null, itemCount: 1,
    },
    items: [{
      id: 'rf-new', ticker: 'CDBN1', name: 'CDB New', subtype: 'CDB', issuer: null,
      applicationDate: null, maturityDate: null, contractedRate: null, indexer: null,
      appliedValue: 1000, grossValue: null, liquidValue: 1100, profitValue: null,
      irValue: null, iofValue: null, combinedTaxValue: null, liquidity: null,
      unavailableValue: null, maturityStatus: 'A vencer', note: null,
      financialAsOfRaw: '2026-09-01',
      quoteUpdatedAtRaw: '2026-09-24T10:00:00.000Z',
    }],
  };
  assert.strictEqual(contract.isReadonlyFixedIncomeSnapshot(withFields), true);
  const normalized = contract.normalizeReadonlyFixedIncomeSnapshot(withFields);
  assert.strictEqual(normalized.items[0].financialAsOfRaw, '2026-09-01');
  assert.strictEqual(normalized.items[0].quoteUpdatedAtRaw, '2026-09-24T10:00:00.000Z');
  const { computeFixedIncomeValuationState } = await loadModules();
  const state = computeFixedIncomeValuationState(normalized.items[0], [], [], REFERENCE_DATE);
  assert.strictEqual(state.authoritativeAsOfConfidence, 'HIGH', 'explicit field must win over MEDIUM metadata');
  assert.strictEqual(state.authoritativeValueAsOf, '2026-09-01');
});
