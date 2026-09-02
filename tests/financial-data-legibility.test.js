const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('saidas financeiras criticas nao usam recorte por ellipsis', () => {
  const expectedSelectors = [
    '.premium-metric-value',
    '.analysis-ranking-value',
    '.rf-summary-value',
    '.assets-premium-kpi-value',
    '.premium-rf-kpi-value',
    '.div-premium-metric-value',
    '.div-receipt-value',
    '.div-upcoming-value',
    '.reports-kpi .value',
  ];

  const start = source.indexOf('/* Keep critical financial readings intact');
  const end = source.indexOf('</style>', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const guard = source.slice(start, end);
  for (const selector of expectedSelectors) assert.ok(guard.includes(selector), `missing selector: ${selector}`);
  assert.match(guard, /overflow:\s*visible/);
  assert.match(guard, /text-overflow:\s*clip/);
  assert.match(guard, /white-space:\s*normal/);
  assert.match(guard, /overflow-wrap:\s*anywhere/);
});

test('ellipsis continua reservado para texto descritivo', () => {
  assert.match(source, /\.premium-metric-note\{[^}]*text-overflow:ellipsis/);
  assert.match(source, /\.rf-preview-row \.premium-row-sub\{[^}]*text-overflow:ellipsis/);
  assert.match(source, /\.reports-kpi \.sub\{[^}]*text-overflow:ellipsis/);
});
