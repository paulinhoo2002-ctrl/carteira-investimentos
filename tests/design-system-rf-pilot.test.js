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
  assert.match(renderer, /class="premium-rf-kpi ds-kpi(?:\s|`)/);
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

test('financial KPI labels and context use the documented readable type scale', () => {
  assert.match(source, /\.ds-kpi__label\{[^}]*font-size:var\(--fs-label\)/);
  assert.match(source, /\.ds-kpi__context\{[^}]*font-size:var\(--fs-caption\)/);
  assert.match(source, /\.premium-rf-kpi-label\{font-size:var\(--fs-label\)/);
  assert.match(source, /\.premium-rf-kpi-note\{[^}]*font-size:var\(--fs-caption\)/);
  assert.match(source, /\.premium-rf-controls label\{[^}]*font-size:var\(--fs-label\)/);
  assert.match(source, /\.premium-rf-primary-kpi \.premium-rf-kpi-note\{[^}]*font-size:var\(--fs-caption\)/);
  assert.match(source, /\.premium-rf-row-meta\{[^}]*font-size:var\(--fs-caption\)/);
  assert.match(source, /\.premium-rf-review-item-value\{[^}]*font-size:var\(--fs-label\)/);
  assert.match(source, /\.premium-rf-review-action\{min-height:44px;[^}]*font-size:var\(--fs-label\)/);
  assert.match(source, /\.analysis-summary-kicker,[\s\S]*?font-size: var\(--fs-label\) !important;/);
  assert.match(source, /\.analysis-summary-sub,[\s\S]*?font-size: var\(--fs-caption\) !important;/);
});
