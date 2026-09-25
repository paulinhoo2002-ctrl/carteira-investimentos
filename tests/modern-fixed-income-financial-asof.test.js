const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const FINANCIAL_ASOF_PATH = path.join(__dirname, '..', 'modern', 'src', 'domain', 'fixedIncome', 'financialAsOf.ts');

async function loadModule() {
  return import(pathToFileURL(FINANCIAL_ASOF_PATH).href);
}

const REFERENCE_DATE = '2026-09-15';

describe('extractFinancialAsOfEvidence', () => {
  it('returns HIGH confidence for explicit financialAsOf field', async () => {
    const { extractFinancialAsOfEvidence } = await loadModule();
    const evidence = extractFinancialAsOfEvidence(
      { financialAsOfRaw: '2026-09-14' },
      { referenceDate: REFERENCE_DATE },
    );
    assert.strictEqual(evidence.value, '2026-09-14');
    assert.strictEqual(evidence.confidence, 'HIGH');
    assert.strictEqual(evidence.source, 'financialAsOf');
  });

  it('normalizes full ISO timestamps to date-only', async () => {
    const { extractFinancialAsOfEvidence } = await loadModule();
    const evidence = extractFinancialAsOfEvidence(
      { financialAsOfRaw: '2026-06-18T13:09:43.614Z' },
      { referenceDate: REFERENCE_DATE },
    );
    assert.strictEqual(evidence.value, '2026-06-18');
    assert.strictEqual(evidence.confidence, 'HIGH');
  });

  it('returns MEDIUM confidence for quoteUpdatedAt metadata', async () => {
    const { extractFinancialAsOfEvidence } = await loadModule();
    const evidence = extractFinancialAsOfEvidence(
      { quoteUpdatedAt: '2026-06-18T13:09:43.614Z' },
      { referenceDate: REFERENCE_DATE },
    );
    assert.strictEqual(evidence.value, '2026-06-18');
    assert.strictEqual(evidence.confidence, 'MEDIUM');
    assert.strictEqual(evidence.source, 'quoteUpdatedAt');
  });

  it('rejects impossible calendar dates such as 2026-02-31 (no rollover)', async () => {
    const { extractFinancialAsOfEvidence } = await loadModule();
    const evidence = extractFinancialAsOfEvidence(
      { financialAsOfRaw: '2026-02-31' },
      { referenceDate: REFERENCE_DATE },
    );
    assert.strictEqual(evidence.value, null);
    assert.strictEqual(evidence.confidence, 'UNKNOWN');
  });

  it('rejects impossible calendar dates inside full timestamps', async () => {
    const { extractFinancialAsOfEvidence } = await loadModule();
    const evidence = extractFinancialAsOfEvidence(
      { financialAsOfRaw: '2026-02-31T13:00:00.000Z' },
      { referenceDate: REFERENCE_DATE },
    );
    assert.strictEqual(evidence.value, null);
    assert.strictEqual(evidence.confidence, 'UNKNOWN');
  });

  it('accepts real leap-day dates such as 2024-02-29', async () => {
    const { extractFinancialAsOfEvidence } = await loadModule();
    const evidence = extractFinancialAsOfEvidence(
      { financialAsOfRaw: '2024-02-29' },
      { referenceDate: REFERENCE_DATE },
    );
    assert.strictEqual(evidence.value, '2024-02-29');
    assert.strictEqual(evidence.confidence, 'HIGH');
  });

  it('treats whitespace-only timestamps as absent', async () => {
    const { extractFinancialAsOfEvidence } = await loadModule();
    const evidence = extractFinancialAsOfEvidence(
      { financialAsOfRaw: '   ' },
      { referenceDate: REFERENCE_DATE },
    );
    assert.strictEqual(evidence.value, null);
    assert.strictEqual(evidence.confidence, 'UNKNOWN');
  });

  it('does NOT promote MEDIUM broker metadata delivered as quoteUpdatedAtRaw', async () => {
    const { extractFinancialAsOfEvidence } = await loadModule();
    const evidence = extractFinancialAsOfEvidence(
      { quoteUpdatedAtRaw: '2026-09-10T13:00:00.000Z' },
      { referenceDate: REFERENCE_DATE },
    );
    assert.strictEqual(evidence.value, '2026-09-10');
    assert.strictEqual(evidence.confidence, 'MEDIUM');
    assert.strictEqual(evidence.source, 'quoteUpdatedAt');
  });

  it('prefers explicit financialAsOf over quoteUpdatedAt metadata', async () => {
    const { extractFinancialAsOfEvidence } = await loadModule();
    const evidence = extractFinancialAsOfEvidence(
      { financialAsOfRaw: '2026-09-01', quoteUpdatedAt: '2026-09-14' },
      { referenceDate: REFERENCE_DATE },
    );
    assert.strictEqual(evidence.value, '2026-09-01');
    assert.strictEqual(evidence.confidence, 'HIGH');
  });

  it('rejects future dates with UNKNOWN confidence (never LIVE)', async () => {
    const { extractFinancialAsOfEvidence } = await loadModule();
    const evidence = extractFinancialAsOfEvidence(
      { financialAsOfRaw: '2026-12-31' },
      { referenceDate: REFERENCE_DATE },
    );
    assert.strictEqual(evidence.value, null);
    assert.strictEqual(evidence.confidence, 'UNKNOWN');
    assert.match(evidence.reason, /futura rejeitada/);
  });

  it('rejects invalid timestamps instead of guessing', async () => {
    const { extractFinancialAsOfEvidence } = await loadModule();
    const evidence = extractFinancialAsOfEvidence(
      { quoteUpdatedAt: 'not-a-date' },
      { referenceDate: REFERENCE_DATE },
    );
    assert.strictEqual(evidence.value, null);
    assert.strictEqual(evidence.confidence, 'UNKNOWN');
  });

  it('returns UNKNOWN when no financial date exists (UNKNOWN != zero)', async () => {
    const { extractFinancialAsOfEvidence } = await loadModule();
    const evidence = extractFinancialAsOfEvidence({}, { referenceDate: REFERENCE_DATE });
    assert.strictEqual(evidence.value, null);
    assert.strictEqual(evidence.confidence, 'UNKNOWN');
    // The reason may legitimately mention application/capture dates while
    // explaining they are NOT financialAsOf; what matters is value=null.
    assert.match(evidence.reason, /não são financialAsOf/);
  });

  it('does NOT treat applicationDate-like fields as financial as-of', async () => {
    const { extractFinancialAsOfEvidence } = await loadModule();
    // The extractor must ignore application/capture/reconstruction fields entirely.
    const evidence = extractFinancialAsOfEvidence(
      { applicationDate: '2024-01-15', capturedAt: '2026-09-08', reconstructedAt: '2026-09-08' },
      { referenceDate: REFERENCE_DATE },
    );
    assert.strictEqual(evidence.value, null);
    assert.strictEqual(evidence.confidence, 'UNKNOWN');
  });
});

describe('freshnessFromAsOfEvidence', () => {
  it('returns FRESH for evidence within 3 days', async () => {
    const { extractFinancialAsOfEvidence, freshnessFromAsOfEvidence } = await loadModule();
    const evidence = extractFinancialAsOfEvidence(
      { financialAsOfRaw: '2026-09-13' },
      { referenceDate: REFERENCE_DATE },
    );
    assert.strictEqual(freshnessFromAsOfEvidence(evidence, { referenceDate: REFERENCE_DATE }), 'FRESH');
  });

  it('returns STALE for evidence older than 3 days', async () => {
    const { extractFinancialAsOfEvidence, freshnessFromAsOfEvidence } = await loadModule();
    const evidence = extractFinancialAsOfEvidence(
      { financialAsOfRaw: '2026-06-18' },
      { referenceDate: REFERENCE_DATE },
    );
    assert.strictEqual(freshnessFromAsOfEvidence(evidence, { referenceDate: REFERENCE_DATE }), 'STALE');
  });

  it('returns UNKNOWN when evidence is missing or untrusted', async () => {
    const { extractFinancialAsOfEvidence, freshnessFromAsOfEvidence } = await loadModule();
    const evidence = extractFinancialAsOfEvidence({}, { referenceDate: REFERENCE_DATE });
    assert.strictEqual(freshnessFromAsOfEvidence(evidence, { referenceDate: REFERENCE_DATE }), 'UNKNOWN');
  });

  it('honors a custom freshWithinDays window', async () => {
    const { extractFinancialAsOfEvidence, freshnessFromAsOfEvidence } = await loadModule();
    const evidence = extractFinancialAsOfEvidence(
      { financialAsOfRaw: '2026-09-01' },
      { referenceDate: REFERENCE_DATE },
    );
    assert.strictEqual(
      freshnessFromAsOfEvidence(evidence, { referenceDate: REFERENCE_DATE, freshWithinDays: 30 }),
      'FRESH',
    );
  });
});
