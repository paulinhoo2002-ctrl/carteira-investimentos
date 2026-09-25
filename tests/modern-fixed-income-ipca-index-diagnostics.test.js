const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

require('./modern-fixed-income-bcb-ipca-fetcher.test.js');

const DIAGNOSTICS_PATH = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'domain',
  'fixedIncome',
  'ipcaIndexDiagnostics.ts',
);

async function loadDiagnostics() {
  return import(pathToFileURL(DIAGNOSTICS_PATH).href);
}

async function loadParser() {
  const parserPath = path.join(__dirname, '..', 'modern', 'src', 'domain', 'fixedIncome', 'ipcaContractParser.ts');
  return import(pathToFileURL(parserPath).href);
}

async function loadLegacyEngine() {
  const enginePath = path.join(__dirname, '..', 'modern', 'src', 'domain', 'fixedIncome', 'ipcaRateEngine.ts');
  return import(pathToFileURL(enginePath).href);
}

describe('analyzeIpcaIndexDiagnostics', () => {
  it('separates full monthly coverage from source freshness', async () => {
    const { analyzeIpcaIndexDiagnostics } = await loadDiagnostics();
    const result = analyzeIpcaIndexDiagnostics(
      [
        { date: '2024-02', indexValue: 0.5 },
        { date: '2024-03', indexValue: 0.3 },
        { date: '2024-04', indexValue: 0.4 },
      ],
      { applicationDate: '2024-01-15', asOf: '2024-05-15' },
    );

    assert.equal(result.coverageStatus, 'FULL');
    assert.equal(result.coveragePercent, 100);
    assert.deepEqual(result.missingMonths, []);
    assert.equal(result.freshness, 'FRESH');
    assert.equal(result.sourceAsOf, '2024-04');
  });

  it('reports gaps in the expected month sequence and floors coverage', async () => {
    const { analyzeIpcaIndexDiagnostics } = await loadDiagnostics();
    const result = analyzeIpcaIndexDiagnostics(
      [
        { date: '2024-04', indexValue: 0.4 },
        { date: '2024-02', indexValue: 0.5 },
      ],
      { applicationDate: '2024-01-15', asOf: '2024-05-15' },
    );

    assert.equal(result.coverageStatus, 'PARTIAL');
    assert.equal(result.expectedMonthCount, 3);
    assert.equal(result.availableMonthCount, 2);
    assert.equal(result.coveragePercent, 66);
    assert.deepEqual(result.missingMonths, ['2024-03']);
    assert.equal(result.sourceAsOf, '2024-04');
  });

  it('keeps coverage unavailable when no IPCA source rows were supplied', async () => {
    const { analyzeIpcaIndexDiagnostics } = await loadDiagnostics();
    const result = analyzeIpcaIndexDiagnostics([], {
      applicationDate: '2024-01-15',
      asOf: '2024-05-15',
    });

    assert.equal(result.coverageStatus, 'UNAVAILABLE');
    assert.equal(result.coveragePercent, null);
    assert.equal(result.expectedStartMonth, '2024-02');
    assert.equal(result.expectedEndMonth, '2024-04');
    assert.equal(result.availableMonthCount, 0);
    assert.deepEqual(result.missingMonths, []);
    assert.equal(result.freshness, 'UNKNOWN');
    assert.equal(result.sourceAsOf, null);
  });

  it('calculates 3 of 31 required months as 9 percent using conservative floor rounding', async () => {
    const { analyzeIpcaIndexDiagnostics } = await loadDiagnostics();
    const result = analyzeIpcaIndexDiagnostics(
      [
        { date: '2024-04', indexValue: 0.4 },
        { date: '2024-02', indexValue: 0.5 },
        { date: '2024-03', indexValue: 0.3 },
      ],
      { applicationDate: '2024-01-15', asOf: '2026-09-15' },
    );

    assert.equal(result.expectedMonthCount, 31);
    assert.equal(result.availableMonthCount, 3);
    assert.equal(result.coveragePercent, 9);
    assert.equal(result.sourceAsOf, '2024-04');
    assert.equal(result.freshness, 'STALE');
  });

  it('excludes current and future reference months from full-month coverage', async () => {
    const { analyzeIpcaIndexDiagnostics } = await loadDiagnostics();
    const result = analyzeIpcaIndexDiagnostics(
      [
        { date: '2025-01', indexValue: 0.2 },
        { date: '2025-02', indexValue: 0.3 },
        { date: '2025-03', indexValue: 0.4 },
      ],
      { applicationDate: '2024-12-15', asOf: '2025-03-10' },
    );

    assert.equal(result.expectedStartMonth, '2025-01');
    assert.equal(result.expectedEndMonth, '2025-02');
    assert.equal(result.coverageStatus, 'FULL');
    assert.equal(result.coveragePercent, 100);
    assert.equal(result.sourceAsOf, '2025-02');
    assert.equal(result.excludedFutureOrIncompleteMonthCount, 1);
  });

  it('does not count duplicate months twice and keeps the series partial', async () => {
    const { analyzeIpcaIndexDiagnostics } = await loadDiagnostics();
    const result = analyzeIpcaIndexDiagnostics(
      [
        { date: '2024-02', indexValue: 0.5 },
        { date: '2024-02', indexValue: 0.6 },
        { date: '2024-03', indexValue: 0.3 },
      ],
      { applicationDate: '2024-01-15', asOf: '2024-04-15' },
    );

    assert.equal(result.coverageStatus, 'PARTIAL');
    assert.equal(result.coveragePercent, 100);
    assert.deepEqual(result.duplicateMonths, ['2024-02']);
    assert.equal(result.availableMonthCount, 2);
  });

  it('accepts legitimate zero and negative monthly IPCA while excluding invalid factors', async () => {
    const { analyzeIpcaIndexDiagnostics } = await loadDiagnostics();
    const result = analyzeIpcaIndexDiagnostics(
      [
        { date: '2024-02', indexValue: 0 },
        { date: '2024-03', indexValue: -0.1 },
        { date: '2024-04', indexValue: -100 },
      ],
      { applicationDate: '2024-01-15', asOf: '2024-05-15' },
    );

    assert.equal(result.coverageStatus, 'PARTIAL');
    assert.equal(result.coveragePercent, 66);
    assert.deepEqual(result.invalidMonths, ['2024-04']);
  });

  it('reports coverage unavailable without an application date or an expected month range', async () => {
    const { analyzeIpcaIndexDiagnostics } = await loadDiagnostics();
    const missingStart = analyzeIpcaIndexDiagnostics(
      [{ date: '2024-04', indexValue: 0.4 }],
      { applicationDate: null, asOf: '2024-05-15' },
    );
    const emptyPeriod = analyzeIpcaIndexDiagnostics(
      [{ date: '2024-04', indexValue: 0.4 }],
      { applicationDate: '2024-04-15', asOf: '2024-05-15' },
    );

    assert.equal(missingStart.coverageStatus, 'UNAVAILABLE');
    assert.equal(missingStart.coveragePercent, null);
    assert.equal(emptyPeriod.coverageStatus, 'UNAVAILABLE');
    assert.equal(emptyPeriod.coveragePercent, null);
  });

  it('rejects malformed calendar dates instead of deriving a month from a prefix', async () => {
    const { analyzeIpcaIndexDiagnostics } = await loadDiagnostics();
    const result = analyzeIpcaIndexDiagnostics([], {
      applicationDate: '2024-02-30',
      asOf: '2024-05-15',
    });
    assert.equal(result.coverageStatus, 'UNAVAILABLE');
    assert.equal(result.coveragePercent, null);
  });
});

describe('IPCA method safety', () => {
  it('does not reinterpret a malformed explicit IPCA contract as pure IPCA from indexer', async () => {
    const { parseIpcaContract } = await loadParser();
    assert.equal(parseIpcaContract('IPCA + 5.5%', 'IPCA'), null);
    assert.equal(parseIpcaContract('CDI + 1% aa', 'IPCA'), null);
    assert.equal(parseIpcaContract('some text', 'IPCA'), null);
  });

  it('keeps supported IPCA contract parsing as descriptive metadata only', async () => {
    const { parseIpcaContract } = await loadParser();
    assert.deepEqual(parseIpcaContract('IPCA + 5.5% aa', 'IPCA'), {
      kind: 'IPCA_PLUS_SPREAD', annualSpreadRate: 0.055,
    });
    assert.deepEqual(parseIpcaContract('', 'IPCA'), { kind: 'IPCA_PURE' });
  });

  it('fails closed instead of applying the legacy generic IPCA valuation', async () => {
    const { calculateIpcaValue } = await loadLegacyEngine();
    const result = calculateIpcaValue({
      principal: 10000,
      contract: { kind: 'IPCA_PLUS_SPREAD', annualSpreadRate: 0.055 },
      monthlyIndices: [{ date: '2026-08', indexValue: 0.3 }],
    });
    assert.deepEqual(result, { ok: false, error: 'UNSUPPORTED_METHODOLOGY' });
  });
});
