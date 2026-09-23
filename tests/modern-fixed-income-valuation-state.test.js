const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const VALUATION_STATE_PATH = path.join(__dirname, '..', 'modern', 'src', 'domain', 'fixedIncome', 'valuationState.ts');

async function loadValuationState() {
  return import(pathToFileURL(VALUATION_STATE_PATH).href);
}

// Helper to create mock CDI rows
function createCdiRows(dates, value = 0.02) {
  return dates.map(date => ({
    date,
    valuePercentPerDay: value,
    factor: 1 + value / 100,
  }));
}

// Helper to create a mock fixed income item - all values must be explicitly provided
function createMockAsset(overrides = {}) {
  const base = {
    id: 'rf-test1',
    ticker: 'CDB1',
    name: 'CDB Test',
    subtype: 'CDB',
    issuer: 'Banco Teste',
    applicationDate: '2024-01-15',
    maturityDate: '2026-12-31',
    contractedRate: 'CDI + 0.95% aa',
    indexer: 'CDI',
    appliedValue: null,
    grossValue: null,
    liquidValue: null,
    profitValue: null,
    irValue: null,
    iofValue: null,
    combinedTaxValue: null,
    liquidity: 'Diária',
    unavailableValue: null,
    maturityStatus: 'A vencer',
    note: null,
  };
  
  // Apply overrides, allowing explicit null/undefined to override defaults
  const result = { ...base };
  for (const key of Object.keys(overrides)) {
    result[key] = overrides[key];
  }
  return result;
}

describe('computeFixedIncomeValuationState', () => {
  it('returns UNAVAILABLE for missing asset', async () => {
    const { computeFixedIncomeValuationState } = await loadValuationState();
    const result = computeFixedIncomeValuationState(null, []);
    assert.strictEqual(result.authoritativeStatus, 'UNAVAILABLE');
    assert.strictEqual(result.authoritativeValue, null);
    assert.strictEqual(result.shadowValue, null);
  });

  it('returns MANUAL_AUTHORITATIVE for position with manual value', async () => {
    const { computeFixedIncomeValuationState } = await loadValuationState();
    const asset = createMockAsset({ liquidValue: 10400 });
    const cdiRows = createCdiRows(['2024-01-16', '2024-01-17']);
    const result = computeFixedIncomeValuationState(asset, cdiRows);
    assert.strictEqual(result.authoritativeStatus, 'MANUAL_AUTHORITATIVE');
    assert.strictEqual(result.authoritativeValue, 10400);
    assert.strictEqual(result.authoritativeFreshness, 'UNKNOWN');
    assert.strictEqual(result.authoritativeSource, 'manual-rf');
  });

  it('returns UNAVAILABLE for position without any value', async () => {
    const { computeFixedIncomeValuationState } = await loadValuationState();
    const asset = createMockAsset({ liquidValue: null, grossValue: null, appliedValue: null });
    const cdiRows = createCdiRows(['2024-01-16']);
    const result = computeFixedIncomeValuationState(asset, cdiRows);
    assert.strictEqual(result.authoritativeStatus, 'UNAVAILABLE');
    assert.strictEqual(result.authoritativeValue, null);
  });

  it('computes CDI shadow for valid CDI position with fresh data', async () => {
    const { computeFixedIncomeValuationState } = await loadValuationState();
    const asset = createMockAsset({
      contractedRate: '100% CDI',
      indexer: 'CDI',
      appliedValue: 10000,
      applicationDate: '2024-01-15',
    });
    // CDI data up to today (fresh)
    const today = new Date().toISOString().slice(0, 10);
    const cdiRows = createCdiRows(['2024-01-16', '2024-01-17', today]);
    const result = computeFixedIncomeValuationState(asset, cdiRows);
    assert.strictEqual(result.shadowStatus, 'SHADOW_AVAILABLE');
    assert.strictEqual(result.shadowSource, 'BCB_SGS_CDI');
    assert.strictEqual(result.valuationMethod, 'CDI_CONTRACTUAL_CDI_PERCENTAGE');
    assert.ok(result.shadowValue !== null && result.shadowValue > 10000);
    assert.strictEqual(result.shadowFreshness, 'FRESH');
    assert.strictEqual(result.shadowCoverage, 100);
  });

  it('returns SHADOW_STALE when CDI data is stale', async () => {
    const { computeFixedIncomeValuationState } = await loadValuationState();
    const asset = createMockAsset({
      contractedRate: '100% CDI',
      indexer: 'CDI',
      appliedValue: 10000,
      applicationDate: '2024-01-15',
    });
    // CDI data is 10 days old (stale)
    const staleDate = '2024-01-20';
    const cdiRows = createCdiRows(['2024-01-16', staleDate]);
    const result = computeFixedIncomeValuationState(asset, cdiRows);
    assert.strictEqual(result.shadowStatus, 'SHADOW_STALE');
    assert.strictEqual(result.shadowFreshness, 'STALE');
  });

  it('returns SHADOW_PARTIAL when missing principal', async () => {
    const { computeFixedIncomeValuationState } = await loadValuationState();
    const asset = createMockAsset({
      contractedRate: '100% CDI',
      indexer: 'CDI',
      appliedValue: null, // missing principal
      applicationDate: '2024-01-15',
    });
    const cdiRows = createCdiRows(['2024-01-16', '2024-01-17']);
    const result = computeFixedIncomeValuationState(asset, cdiRows);
    assert.strictEqual(result.shadowStatus, 'SHADOW_PARTIAL');
    assert.ok(result.limitations.some(l => l.includes('principal')));
  });

  it('returns SHADOW_PARTIAL when missing application date', async () => {
    const { computeFixedIncomeValuationState } = await loadValuationState();
    const asset = createMockAsset({
      contractedRate: '100% CDI',
      indexer: 'CDI',
      appliedValue: 10000,
      applicationDate: undefined, // missing date
    });
    const cdiRows = createCdiRows(['2024-01-16']);
    const result = computeFixedIncomeValuationState(asset, cdiRows);
    assert.strictEqual(result.shadowStatus, 'SHADOW_PARTIAL');
    assert.ok(result.limitations.some(l => l.includes('application')));
  });

  it('returns UNSUPPORTED for IPCA+ position', async () => {
    const { computeFixedIncomeValuationState } = await loadValuationState();
    const asset = createMockAsset({
      contractedRate: 'IPCA + 5.5% aa',
      indexer: 'IPCA',
      appliedValue: 10000,
      applicationDate: '2024-01-15',
    });
    const cdiRows = createCdiRows(['2024-01-16']);
    const result = computeFixedIncomeValuationState(asset, cdiRows);
    assert.strictEqual(result.shadowStatus, 'UNSUPPORTED');
    assert.strictEqual(result.valuationMethod, 'UNSUPPORTED_IPCA');
    assert.ok(result.limitations.some(l => l.includes('IPCA')));
  });

  it('returns UNSUPPORTED for prefixado position', async () => {
    const { computeFixedIncomeValuationState } = await loadValuationState();
    const asset = createMockAsset({
      contractedRate: '12.5% aa',
      indexer: 'Prefixado',
      appliedValue: 10000,
      applicationDate: '2024-01-15',
    });
    const cdiRows = createCdiRows(['2024-01-16']);
    const result = computeFixedIncomeValuationState(asset, cdiRows);
    assert.strictEqual(result.shadowStatus, 'UNSUPPORTED');
    assert.strictEqual(result.valuationMethod, 'UNSUPPORTED_PREFIXADO');
  });

  it('returns NOT_COMPARABLE when manual has no explicit as-of', async () => {
    const { computeFixedIncomeValuationState } = await loadValuationState();
    const asset = createMockAsset({
      contractedRate: '100% CDI',
      indexer: 'CDI',
      appliedValue: 10000,
      applicationDate: '2024-01-15',
      liquidValue: 10400,
    });
    const today = new Date().toISOString().slice(0, 10);
    const cdiRows = createCdiRows(['2024-01-16', today]);
    const result = computeFixedIncomeValuationState(asset, cdiRows);
    assert.strictEqual(result.comparisonStatus, 'NOT_COMPARABLE');
    assert.ok(result.comparisonReason !== null);
  });

  it('uses liquidValue as authoritative when available', async () => {
    const { computeFixedIncomeValuationState } = await loadValuationState();
    const asset = createMockAsset({
      liquidValue: 10400,
      grossValue: 10500,
      appliedValue: 10000,
    });
    const cdiRows = createCdiRows(['2024-01-16']);
    const result = computeFixedIncomeValuationState(asset, cdiRows);
    assert.strictEqual(result.authoritativeValue, 10400);
  });

  it('falls back to grossValue when liquidValue is null', async () => {
    const { computeFixedIncomeValuationState } = await loadValuationState();
    const asset = createMockAsset({
      liquidValue: null,
      grossValue: 10500,
      appliedValue: 10000,
    });
    const cdiRows = createCdiRows(['2024-01-16']);
    const result = computeFixedIncomeValuationState(asset, cdiRows);
    assert.strictEqual(result.authoritativeValue, 10500);
  });

  it('falls back to appliedValue when liquidValue and grossValue are null', async () => {
    const { computeFixedIncomeValuationState } = await loadValuationState();
    const asset = createMockAsset({
      liquidValue: null,
      grossValue: null,
      appliedValue: 10000,
    });
    const cdiRows = createCdiRows(['2024-01-16']);
    const result = computeFixedIncomeValuationState(asset, cdiRows);
    assert.strictEqual(result.authoritativeValue, 10000);
  });

  it('returns STALE freshness when no CDI data available', async () => {
    const { computeFixedIncomeValuationState } = await loadValuationState();
    const asset = createMockAsset({
      contractedRate: '100% CDI',
      indexer: 'CDI',
      appliedValue: 10000,
      applicationDate: '2024-01-15',
    });
    const cdiRows = []; // empty CDI data
    const result = computeFixedIncomeValuationState(asset, cdiRows);
    assert.strictEqual(result.shadowStatus, 'SHADOW_STALE');
    assert.strictEqual(result.shadowFreshness, 'STALE');
  });

  it('handles CDI + spread contract correctly', async () => {
    const { computeFixedIncomeValuationState } = await loadValuationState();
    const asset = createMockAsset({
      contractedRate: 'CDI + 1.5% aa',
      indexer: 'CDI',
      appliedValue: 10000,
      applicationDate: '2024-01-15',
    });
    const today = new Date().toISOString().slice(0, 10);
    const cdiRows = createCdiRows(['2024-01-16', today]);
    const result = computeFixedIncomeValuationState(asset, cdiRows);
    assert.strictEqual(result.shadowStatus, 'SHADOW_AVAILABLE');
    assert.strictEqual(result.valuationMethod, 'CDI_CONTRACTUAL_CDI_PLUS_SPREAD');
    assert.ok(result.shadowValue !== null && result.shadowValue > 10000);
  });

  it('parses CDI percentage from indexer when contractedRate does not match', async () => {
    const { computeFixedIncomeValuationState } = await loadValuationState();
    const asset = createMockAsset({
      contractedRate: 'some text',
      indexer: '95% CDI',
      appliedValue: 10000,
      applicationDate: '2024-01-15',
    });
    const today = new Date().toISOString().slice(0, 10);
    const cdiRows = createCdiRows(['2024-01-16', today]);
    const result = computeFixedIncomeValuationState(asset, cdiRows);
    assert.strictEqual(result.shadowStatus, 'SHADOW_AVAILABLE');
    assert.strictEqual(result.valuationMethod, 'CDI_CONTRACTUAL_CDI_PERCENTAGE');
  });
});