const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const rendererStart = source.indexOf('function rendaFixaTab()');
const rendererEnd = source.indexOf('\nfunction dashboardMetricIcon', rendererStart);
const renderer = source.slice(rendererStart, rendererEnd);

test('Renda Fixa adopts visual primitives without replacing official sources', () => {
  assert.match(source, /function rfIntelligenceSnapshot\(\)/);
  assert.match(source, /function rfValues\(a\)/);
  assert.match(source, /function assetRfMaturityDate\(a\)/);
  assert.match(source, /function edA\(/);
  assert.match(renderer, /class="premium-rf-kpi ds-kpi"/);
  assert.match(renderer, /class="premium-rf-panel ds-panel ds-panel--readonly"/);
  assert.match(renderer, /class="btn bs ds-button ds-button--secondary"/);
  assert.match(renderer, /class="btn bp ds-button ds-button--primary"/);
  assert.match(renderer, /class="premium-rf-maturity-badge ds-badge/);
  assert.match(renderer, /ds-empty-state/);
});

test('Renda Fixa keeps row semantics, explicit identity and editor handlers', () => {
  for (const field of ['Valor aplicado', 'Vencimento', 'Resultado', 'Rentab.', 'indexer', 'issuer']) {
    assert.match(renderer, new RegExp(field));
  }
  assert.match(renderer, /edA\(.*assetId/);
  assert.match(renderer, /openRfMovementEditor\(.*assetId/);
  assert.match(renderer, /rfIntelligenceSnapshot\(\)/);
  assert.doesNotMatch(renderer, /modern\/src|createRoot|ReactDOM/);
});
