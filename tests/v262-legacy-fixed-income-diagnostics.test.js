const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

const bridgePath = path.join(__dirname, '..', 'modern', 'src', 'features', 'fixed-income', 'v262LegacyDiagnostics.ts');
const htmlPath = path.join(__dirname, '..', 'index.html');

test('legacy V262 bridge exposes only factual IPCA diagnostics', async () => {
  const { buildV262LegacyIpcaDiagnostics } = await import(pathToFileURL(bridgePath).href);
  const result = buildV262LegacyIpcaDiagnostics([{
    id: 'asset-ipca-1',
    type: 'Renda Fixa',
    ticker: 'IPCAQA1',
    name: 'Tesouro IPCA QA',
    rf_subtype: 'Tesouro Direto',
    fixed_indexer: 'IPCA',
    rf_contract_rate: 'IPCA + 5,5% aa',
    rf_application_date: '2024-01-15',
    rf_applied_value: 10000,
    rf_liquid_value: 12000,
  }], '2024-05-15');

  assert.equal(result.length, 1);
  assert.equal(result[0].valuationMethod, 'UNSUPPORTED_IPCA_EXACT');
  assert.equal(result[0].valuationStatus, 'UNSUPPORTED');
  assert.equal(result[0].shadowValue, null);
  assert.equal(result[0].coverageStatus, 'UNAVAILABLE');
  assert.equal(result[0].coveragePercent, null);
  assert.equal(result[0].freshness, 'UNKNOWN');
  assert.equal(result[0].sourceAsOf, null);
  assert.equal(Object.hasOwn(result[0], 'appliedValue'), false);
  assert.equal(Object.hasOwn(result[0], 'liquidValue'), false);
});

test('legacy bridge ignores non-IPCA fixed-income positions', async () => {
  const { buildV262LegacyIpcaDiagnostics } = await import(pathToFileURL(bridgePath).href);
  const result = buildV262LegacyIpcaDiagnostics([{
    id: 'asset-cdi-1',
    type: 'Renda Fixa',
    ticker: 'CDIQA1',
    fixed_indexer: 'CDI',
    rf_contract_rate: '100% CDI',
    rf_application_date: '2024-01-15',
  }], '2024-05-15');

  assert.deepEqual(result, []);
});

test('legacy fixed-income screen mounts the read-only diagnostic without changing authority', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const route = html.slice(html.indexOf('function rendaFixaTab(){'), html.indexOf('\nfunction dashboardMetricIcon', html.indexOf('function rendaFixaTab(){')));

  assert.match(html, /import\('\/modern\/dist\/assets\/v262-legacy-diagnostics\.js'\)/);
  assert.match(route, /V262FixedIncomeDiagnostics/);
  assert.match(route, /UNSUPPORTED/);
  assert.match(route, /valor manual continua sendo a autoridade/);
  assert.match(route, /coveragePercent===null/);
  assert.match(route, /Frescor/);
  assert.doesNotMatch(route, /save\s*\(|\.setItem\s*\(|fetch\s*\(/);
});
