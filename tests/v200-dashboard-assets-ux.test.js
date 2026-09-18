const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('V200 mantém contexto de filtros e contagem da leitura de Ativos', () => {
  assert.match(html, /class="assets-filter-summary" role="status" aria-live="polite"/);
  assert.match(html, /assetFiltersActive/);
  assert.match(html, /S\.assetsSectorFilter && S\.assetsSectorFilter!==['"]all['"]/);
  assert.match(html, /S\.assetsPerformanceFilter && S\.assetsPerformanceFilter!==['"]all['"]/);
  assert.match(html, /displayAssets\.length[\s\S]{0,220}ativos exibidos de/);
});

test('V200 aplica hierarquia visual sem criar uma segunda fonte de métricas', () => {
  assert.match(html, /V200: daily-use hierarchy for Dashboard and Ativos/);
  assert.match(html, /dashboard-executive-kpis \.premium-metric:first-child/);
  assert.match(html, /dashboard-quick-action/);
  assert.doesNotMatch(html, /function dashboardMetricCardV200|function assetCurrentValueV200/);
});
