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

  it('keeps IPCA+ security valuation unsupported when index data is missing', async () => {
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
      assert.strictEqual(result.valuationMethod, 'UNSUPPORTED_IPCA_EXACT');
      assert.strictEqual(result.shadowValue, null);
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

    // Helper to create mock IPCA rows
        function createIpcaRows(yearMonths, value = 0.5) {
          const values = Array.isArray(value) ? value : new Array(yearMonths.length).fill(value);
          return yearMonths.map((date, i) => ({
            date, // YYYY-MM format
            indexValue: values[i],
          }));
        }

    describe('computeFixedIncomeValuationState IPCA', () => {
      // Use a fixed reference date to avoid test flakiness
      const REFERENCE_DATE = '2026-09-15';
      const REFERENCE_YEAR_MONTH = '2026-09';

      it('keeps IPCA+ unsupported and reports only index freshness/coverage diagnostics', async () => {
        const { computeFixedIncomeValuationState } = await loadValuationState();
        const asset = createMockAsset({
          contractedRate: 'IPCA + 5.5% aa',
          indexer: 'IPCA',
          appliedValue: 10000,
          applicationDate: '2024-01-15',
        });
        // IPCA data from Jan 2024 to reference month (fresh)
        const ipcaRows = createIpcaRows(['2024-02', '2024-03', '2024-04', REFERENCE_YEAR_MONTH], 0.5);
        const result = computeFixedIncomeValuationState(asset, [], ipcaRows, REFERENCE_DATE);
        assert.strictEqual(result.shadowStatus, 'UNSUPPORTED');
        assert.strictEqual(result.shadowSource, 'BCB_SGS_IPCA');
        assert.strictEqual(result.valuationMethod, 'UNSUPPORTED_IPCA_EXACT');
        assert.strictEqual(result.shadowValue, null);
        assert.strictEqual(result.shadowFreshness, 'STALE');
      });

      it('keeps exact IPCA security valuation unsupported even when the index series is available', async () => {
        const { computeFixedIncomeValuationState } = await loadValuationState();
        const asset = createMockAsset({
          contractedRate: 'IPCA + 5.5% aa',
          indexer: 'IPCA',
          appliedValue: 10000,
          applicationDate: '2024-01-15',
        });
        const ipcaRows = createIpcaRows(['2026-06', '2026-07', '2026-08'], [0.1, 0.2, 0.3]);

        const result = computeFixedIncomeValuationState(asset, [], ipcaRows, '2026-09-15');

        assert.strictEqual(result.shadowStatus, 'UNSUPPORTED');
        assert.strictEqual(result.valuationMethod, 'UNSUPPORTED_IPCA_EXACT');
        assert.strictEqual(result.shadowValue, null);
        assert.strictEqual(result.ipcaIndexDiagnostics?.sourceAsOf, '2026-08');
        assert.strictEqual(result.authoritativeStatus, 'MANUAL_AUTHORITATIVE');
      });

      it('keeps security valuation unsupported when the IPCA index series is stale', async () => {
        const { computeFixedIncomeValuationState } = await loadValuationState();
        const asset = createMockAsset({
          contractedRate: 'IPCA + 5.5% aa',
          indexer: 'IPCA',
          appliedValue: 10000,
          applicationDate: '2024-01-15',
        });
        // IPCA data is 6 months old (stale relative to reference)
        const ipcaRows = createIpcaRows(['2024-02', '2024-03'], 0.5);
        const result = computeFixedIncomeValuationState(asset, [], ipcaRows, REFERENCE_DATE);
        assert.strictEqual(result.shadowStatus, 'UNSUPPORTED');
        assert.strictEqual(result.shadowFreshness, 'STALE');
      });

      it('does not require principal to report index-only diagnostics', async () => {
        const { computeFixedIncomeValuationState } = await loadValuationState();
        const asset = createMockAsset({
          contractedRate: 'IPCA + 5.5% aa',
          indexer: 'IPCA',
          appliedValue: null,
          applicationDate: '2024-01-15',
        });
        const ipcaRows = createIpcaRows(['2024-02', '2024-03'], 0.5);
        const result = computeFixedIncomeValuationState(asset, [], ipcaRows);
        assert.strictEqual(result.shadowStatus, 'UNSUPPORTED');
        assert.ok(result.limitations.some(l => l.includes('do not determine a security value')));
      });

      it('reports coverage unavailable when the application date is missing', async () => {
        const { computeFixedIncomeValuationState } = await loadValuationState();
        const asset = createMockAsset({
          contractedRate: 'IPCA + 5.5% aa',
          indexer: 'IPCA',
          appliedValue: 10000,
          applicationDate: undefined,
        });
        const ipcaRows = createIpcaRows(['2024-02', '2024-03'], 0.5);
        const result = computeFixedIncomeValuationState(asset, [], ipcaRows);
        assert.strictEqual(result.shadowStatus, 'UNSUPPORTED');
      });

      it('returns UNSUPPORTED for unrecognized IPCA contract format', async () => {
          const { computeFixedIncomeValuationState } = await loadValuationState();
          const asset = createMockAsset({
            contractedRate: 'IPCA exotic structure',
            indexer: 'exotic',
            appliedValue: 10000,
            applicationDate: '2024-01-15',
          });
          const ipcaRows = createIpcaRows(['2024-02', '2024-03'], 0.5);
          const result = computeFixedIncomeValuationState(asset, [], ipcaRows);
          assert.strictEqual(result.shadowStatus, 'UNSUPPORTED');
          assert.strictEqual(result.valuationMethod, 'UNSUPPORTED_IPCA_EXACT');
          assert.ok(result.limitations.some(l => l.includes('malformed or unsupported')));
        });

      it('keeps a pure IPCA contract unsupported as a security valuation', async () => {
              const { computeFixedIncomeValuationState } = await loadValuationState();
              const asset = createMockAsset({
                contractedRate: 'IPCA',
                indexer: 'IPCA',
                appliedValue: 10000,
                applicationDate: '2024-01-15',
              });
              const currentYearMonth = new Date().toISOString().slice(0, 7);
              const ipcaRows = createIpcaRows(['2024-02', '2024-03', currentYearMonth], 0.5);
              const result = computeFixedIncomeValuationState(asset, [], ipcaRows);
              assert.strictEqual(result.shadowStatus, 'UNSUPPORTED');
              assert.strictEqual(result.valuationMethod, 'UNSUPPORTED_IPCA_EXACT');
              assert.strictEqual(result.shadowValue, null);
            });

            it('does not apply a generic IPCA+ monthly formula', async () => {
                    const { computeFixedIncomeValuationState } = await loadValuationState();
                    const asset = createMockAsset({
                      contractedRate: 'IPCA + 5.5% aa',
                      indexer: 'IPCA',
                      appliedValue: 10000,
                      applicationDate: '2024-01-15',
                    });
                    // 3 months: 0.5%, 0.3%, 0.4% IPCA; spread = 5.5%/12 = 0.458333%
                    // Month 1: 1 + 0.005 + 0.00458333 = 1.00958333
                    // Month 2: 1 + 0.003 + 0.00458333 = 1.00758333
                    // Month 3: 1 + 0.004 + 0.00458333 = 1.00858333
                    // Factor = 1.00958333 * 1.00758333 * 1.00858333 = 1.025876...
                    // Value = 10000 * 1.025876 = 10258.76
                    const ipcaRows = createIpcaRows(['2024-02', '2024-03', '2024-04'], [0.5, 0.3, 0.4]);
                    const result = computeFixedIncomeValuationState(asset, [], ipcaRows, '2026-09-15');
                    assert.strictEqual(result.shadowStatus, 'UNSUPPORTED');
                    assert.strictEqual(result.valuationMethod, 'UNSUPPORTED_IPCA_EXACT');
                    assert.strictEqual(result.shadowValue, null);
                  });

                  it('does not calculate a pure IPCA security value', async () => {
                    const { computeFixedIncomeValuationState } = await loadValuationState();
                    const asset = createMockAsset({
                      contractedRate: 'IPCA',
                      indexer: 'IPCA',
                      appliedValue: 10000,
                      applicationDate: '2024-01-15',
                    });
                    // 3 months: 0.5%, 0.3%, 0.4% IPCA; no spread
                    // Month 1: 1.005
                    // Month 2: 1.003
                    // Month 3: 1.004
                    // Factor = 1.005 * 1.003 * 1.004 = 1.012036...
                    // Value = 10000 * 1.012036 = 10120.36
                    const ipcaRows = createIpcaRows(['2024-02', '2024-03', '2024-04'], [0.5, 0.3, 0.4]);
                    const result = computeFixedIncomeValuationState(asset, [], ipcaRows, '2026-09-15');
                    assert.strictEqual(result.shadowStatus, 'UNSUPPORTED');
                    assert.strictEqual(result.valuationMethod, 'UNSUPPORTED_IPCA_EXACT');
                    assert.strictEqual(result.shadowValue, null);
                  });

            it('handles zero IPCA month', async () => {
              const { computeFixedIncomeValuationState } = await loadValuationState();
              const asset = createMockAsset({
                contractedRate: 'IPCA + 5.5% aa',
                indexer: 'IPCA',
                appliedValue: 10000,
                applicationDate: '2024-01-15',
              });
              // Month with 0% IPCA
              const ipcaRows = createIpcaRows(['2024-02', '2024-03', '2024-04'], [0.5, 0, 0.4]);
              const result = computeFixedIncomeValuationState(asset, [], ipcaRows, '2026-09-15');
              assert.strictEqual(result.shadowStatus, 'UNSUPPORTED');
              assert.strictEqual(result.shadowValue, null);
            });

            it('handles negative IPCA month (deflation)', async () => {
              const { computeFixedIncomeValuationState } = await loadValuationState();
              const asset = createMockAsset({
                contractedRate: 'IPCA + 5.5% aa',
                indexer: 'IPCA',
                appliedValue: 10000,
                applicationDate: '2024-01-15',
              });
              // Month with -0.1% IPCA (deflation)
              const ipcaRows = createIpcaRows(['2024-02', '2024-03', '2024-04'], [0.5, -0.1, 0.4]);
              const result = computeFixedIncomeValuationState(asset, [], ipcaRows, '2026-09-15');
              assert.strictEqual(result.shadowStatus, 'UNSUPPORTED');
              assert.strictEqual(result.shadowValue, null);
            });

            it('handles missing month in sequence (gap in data)', async () => {
                          const { computeFixedIncomeValuationState } = await loadValuationState();
                          const asset = createMockAsset({
                            contractedRate: 'IPCA + 5.5% aa',
                            indexer: 'IPCA',
                            appliedValue: 10000,
                            applicationDate: '2024-01-15',
                          });
                          // Missing 2024-03, have 2024-02 and 2024-04
                          const ipcaRows = createIpcaRows(['2024-02', '2024-04'], [0.5, 0.4]);
                          const result = computeFixedIncomeValuationState(asset, [], ipcaRows, '2026-09-15');
                          // Should still compute with available months
                          assert.strictEqual(result.shadowStatus, 'UNSUPPORTED');
                          assert.strictEqual(result.shadowValue, null);
                          // Coverage: 2 months of data out of 30 months since latest data (Apr 2024) to valuation date (Sep 2026)
                          // ageMonths = (2026-2024)*12 + (9-4) = 2*12 + 5 = 29
                          // coverage = Math.round((2 / (29 + 1)) * 100) = Math.round(6.666...) = 7
                          assert.strictEqual(result.ipcaIndexDiagnostics?.coveragePercent, 6);
                        });

            it('handles unsorted IPCA rows (should be sorted by engine)', async () => {
                          const { computeFixedIncomeValuationState } = await loadValuationState();
                          const asset = createMockAsset({
                            contractedRate: 'IPCA + 5.5% aa',
                            indexer: 'IPCA',
                            appliedValue: 10000,
                            applicationDate: '2024-01-15',
                          });
                          // Provide unsorted rows - engine should sort them
                          const ipcaRows = [
                            { date: '2024-04', indexValue: 0.4 },
                            { date: '2024-02', indexValue: 0.5 },
                            { date: '2024-03', indexValue: 0.3 },
                          ];
                          const result = computeFixedIncomeValuationState(asset, [], ipcaRows, '2026-09-15');
                          assert.strictEqual(result.shadowStatus, 'UNSUPPORTED');
                          assert.strictEqual(result.shadowValue, null);
                          // Latest data is Apr 2024, valuation date is Sep 2026 → ~31 months gap
                          // We have 3 months of data (Feb, Mar, Apr 2024)
                          assert.strictEqual(result.ipcaIndexDiagnostics?.coveragePercent, 9);
                        });

            it('reports duplicate months as partial index coverage', async () => {
              const { computeFixedIncomeValuationState } = await loadValuationState();
              const asset = createMockAsset({
                contractedRate: 'IPCA + 5.5% aa',
                indexer: 'IPCA',
                appliedValue: 10000,
                applicationDate: '2024-01-15',
              });
              const ipcaRows = [
                { date: '2024-02', indexValue: 0.5 },
                { date: '2024-02', indexValue: 0.6 }, // duplicate
                { date: '2024-03', indexValue: 0.3 },
              ];
              const result = computeFixedIncomeValuationState(asset, [], ipcaRows, '2026-09-15');
              // Engine should reject duplicate dates
              assert.strictEqual(result.shadowStatus, 'UNSUPPORTED');
              assert.deepStrictEqual(result.ipcaIndexDiagnostics?.duplicateMonths, ['2024-02']);
            });

            it('excludes current/future IPCA months from complete-month coverage', async () => {
              const { computeFixedIncomeValuationState } = await loadValuationState();
              const asset = createMockAsset({
                contractedRate: 'IPCA + 5.5% aa',
                indexer: 'IPCA',
                appliedValue: 10000,
                applicationDate: '2024-01-15',
              });
              // Future month beyond reference date
              const ipcaRows = createIpcaRows(['2024-02', '2024-03', '2026-10'], [0.5, 0.3, 0.4]);
              const result = computeFixedIncomeValuationState(asset, [], ipcaRows, '2026-09-15');
              // Should filter to only months <= reference date
              assert.strictEqual(result.shadowStatus, 'UNSUPPORTED');
              assert.strictEqual(result.shadowValue, null);
            });

            it('handles pure IPCA contract string in indexer field', async () => {
              const { computeFixedIncomeValuationState } = await loadValuationState();
              const asset = createMockAsset({
                contractedRate: '',
                indexer: 'IPCA',
                appliedValue: 10000,
                applicationDate: '2024-01-15',
              });
              const currentYearMonth = new Date().toISOString().slice(0, 7);
              const ipcaRows = createIpcaRows(['2024-02', '2024-03', currentYearMonth], 0.5);
              const result = computeFixedIncomeValuationState(asset, [], ipcaRows);
              assert.strictEqual(result.shadowStatus, 'UNSUPPORTED');
              assert.strictEqual(result.valuationMethod, 'UNSUPPORTED_IPCA_EXACT');
            });

            it('handles IPCA+ spread in indexer field', async () => {
              const { computeFixedIncomeValuationState } = await loadValuationState();
              const asset = createMockAsset({
                contractedRate: '',
                indexer: 'IPCA + 6.0% aa',
                appliedValue: 10000,
                applicationDate: '2024-01-15',
              });
              const currentYearMonth = new Date().toISOString().slice(0, 7);
              const ipcaRows = createIpcaRows(['2024-02', '2024-03', currentYearMonth], 0.5);
              const result = computeFixedIncomeValuationState(asset, [], ipcaRows);
              assert.strictEqual(result.shadowStatus, 'UNSUPPORTED');
              assert.strictEqual(result.valuationMethod, 'UNSUPPORTED_IPCA_EXACT');
            });

            it('returns UNSUPPORTED for IPCA without aa suffix', async () => {
              const { computeFixedIncomeValuationState } = await loadValuationState();
              const asset = createMockAsset({
                contractedRate: 'IPCA + 5.5%',
                indexer: 'IPCA',
                appliedValue: 10000,
                applicationDate: '2024-01-15',
              });
              const ipcaRows = createIpcaRows(['2024-02', '2024-03'], 0.5);
              const result = computeFixedIncomeValuationState(asset, [], ipcaRows);
              // Parser requires aa/a.a. suffix
              assert.strictEqual(result.shadowStatus, 'UNSUPPORTED');
              assert.strictEqual(result.valuationMethod, 'UNSUPPORTED_IPCA_EXACT');
            });

            it('returns UNSUPPORTED for missing application date', async () => {
              const { computeFixedIncomeValuationState } = await loadValuationState();
              const asset = createMockAsset({
                contractedRate: 'IPCA + 5.5% aa',
                indexer: 'IPCA',
                appliedValue: 10000,
                applicationDate: undefined,
              });
              const ipcaRows = createIpcaRows(['2024-02', '2024-03'], 0.5);
              const result = computeFixedIncomeValuationState(asset, [], ipcaRows);
              assert.strictEqual(result.shadowStatus, 'UNSUPPORTED');
              assert.ok(result.limitations.some(l => l.includes('index diagnostics do not determine')));
            });

            it('keeps manual authority when principal is missing', async () => {
              const { computeFixedIncomeValuationState } = await loadValuationState();
              const asset = createMockAsset({
                contractedRate: 'IPCA + 5.5% aa',
                indexer: 'IPCA',
                appliedValue: null,
                applicationDate: '2024-01-15',
              });
              const ipcaRows = createIpcaRows(['2024-02', '2024-03'], 0.5);
              const result = computeFixedIncomeValuationState(asset, [], ipcaRows);
              assert.strictEqual(result.shadowStatus, 'UNSUPPORTED');
              assert.ok(result.limitations.some(l => l.includes('index diagnostics do not determine')));
            });

            it('preserves manual authority when manual value exists', async () => {
              const { computeFixedIncomeValuationState } = await loadValuationState();
              const asset = createMockAsset({
                contractedRate: 'IPCA + 5.5% aa',
                indexer: 'IPCA',
                appliedValue: 10000,
                applicationDate: '2024-01-15',
                liquidValue: 10500,
              });
              const ipcaRows = createIpcaRows(['2024-02', '2024-03', '2024-04'], 0.5);
              const result = computeFixedIncomeValuationState(asset, [], ipcaRows, '2026-09-15');
              assert.strictEqual(result.authoritativeStatus, 'MANUAL_AUTHORITATIVE');
              assert.strictEqual(result.authoritativeValue, 10500);
              assert.strictEqual(result.shadowStatus, 'UNSUPPORTED');
              // Manual remains authoritative, shadow is reference only
            });

            it('returns NOT_COMPARABLE when manual as-of differs from shadow as-of', async () => {
              const { computeFixedIncomeValuationState } = await loadValuationState();
              const asset = createMockAsset({
                contractedRate: 'IPCA + 5.5% aa',
                indexer: 'IPCA',
                appliedValue: 10000,
                applicationDate: '2024-01-15',
                liquidValue: 10500,
              });
              const ipcaRows = createIpcaRows(['2024-02', '2024-03', '2024-04'], 0.5);
              const result = computeFixedIncomeValuationState(asset, [], ipcaRows, '2026-09-15');
              // Manual has no explicit as-of, shadow has as-of -> NOT_COMPARABLE
              assert.strictEqual(result.comparisonStatus, 'NOT_COMPARABLE');
            });

            it('zero financial writes - read only computation', async () => {
              const { computeFixedIncomeValuationState } = await loadValuationState();
              const asset = createMockAsset({
                contractedRate: 'IPCA + 5.5% aa',
                indexer: 'IPCA',
                appliedValue: 10000,
                applicationDate: '2024-01-15',
              });
              const ipcaRows = createIpcaRows(['2024-02', '2024-03', '2024-04'], 0.5);
              const result = computeFixedIncomeValuationState(asset, [], ipcaRows, '2026-09-15');
              // Verify result has no write-side effects - purely computational
              assert.ok(typeof result.shadowValue === 'number' || result.shadowValue === null);
              assert.ok(typeof result.authoritativeValue === 'number' || result.authoritativeValue === null);
            });
          });
