const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');
const chartPath = path.join(root, 'legacy', 'js', 'ui', 'charts.js');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function renderChart(values, hideValues = false) {
  const context = vm.createContext({
    innerWidth: 390,
    document: { activeElement: null },
    CLRS: ['#34d399'],
    esc: value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    fmtP: value => `R$ ${Number(value).toFixed(2)}`,
    S: { hideValues },
  });
  vm.runInContext(fs.readFileSync(chartPath, 'utf8'), context, { filename: chartPath });
  return context.lineChart(
    [{ name: 'Série sintética', values, color: '#34d399' }],
    ['jan', 'fev', 'mar', 'abr'],
    'synthetic-chart',
    context.fmtP,
  );
}

test('real line chart renderer preserves unknown gaps, confirmed zero, and accessible summary', () => {
  const svg = renderChart([12000, null, 0, 13000]);
  assert.match(svg, /<svg class="synthetic-chart" role="img" aria-labelledby=/);
  assert.match(svg, /<title id="chart-synthetic-chart-4-title">Série sintética<\/title>/);
  assert.match(svg, /<desc id="chart-synthetic-chart-4-desc">Série sintética: jan, R\$ 12000\.00; abr, R\$ 13000\.00\. Intervalo sem dados: fev\.<\/desc>/);
  assert.match(svg, /data-chart-index="2"/);
  assert.doesNotMatch(svg, /data-chart-index="1"/);
  assert.match(svg, /aria-label="mar\nSérie sintética\nR\$ 0\.00"/);
  assert.doesNotMatch(svg, /NaN|Infinity/);
});

test('real line chart renderer does not invent a series when all periods are unknown', () => {
  assert.match(renderChart([null, undefined, NaN, '0']), /Sem dados suficientes para desenhar o gráfico/);
});

test('real line chart renderer respects hidden-value preference in accessible points', () => {
  const svg = renderChart([12000, null, 0, 13000], true);
  assert.match(svg, /aria-label="jan\nSérie sintética\nR\$ ••••"/);
  assert.doesNotMatch(svg, /aria-label="jan\nSérie sintética\nR\$ 12000\.00"/);
});

test('real dividend chart tooltip shows accessible text and respects pinned focus on hide', () => {
  const context = vm.createContext({ document: { activeElement: null } });
  vm.runInContext(fs.readFileSync(chartPath, 'utf8'), context, { filename: chartPath });
  const tooltip = { hidden: true, offsetWidth: 40, offsetHeight: 18, style: {} };
  const wrap = { querySelector: () => tooltip, getBoundingClientRect: () => ({ left: 10, top: 20, width: 120 }) };
  const point = {
    dataset: { tooltip: 'Synthetic dividend: R$ 10,00' },
    closest: () => wrap,
    getAttribute: () => 'Synthetic dividend label',
    getBoundingClientRect: () => ({ left: 50, top: 50, width: 10 }),
  };
  context.showDividendChartTooltip(point);
  assert.equal(tooltip.textContent, 'Synthetic dividend: R$ 10,00');
  assert.equal(tooltip.hidden, false);
  assert.equal(tooltip.style.left, '25px');
  assert.equal(tooltip.style.top, '6px');
  context.hideDividendChartTooltip(point);
  assert.equal(tooltip.hidden, true);
  point.dataset.tooltipPinned = 'true';
  context.showDividendChartTooltip(point);
  context.hideDividendChartTooltip(point);
  assert.equal(tooltip.hidden, false);
});

test('chart module loads before app callers and participates in build and offline shell', () => {
  // Normalize line endings for reliable indexOf checks
  const normalizedHtml = html.replace(/\r\n/g, '\n');
  const moduleTag = normalizedHtml.indexOf('<script src="legacy/js/ui/charts.js"></script>');
  const settingsModuleTag = normalizedHtml.indexOf('<script defer src="legacy/js/screens/settings.js"></script>');
  const dashboardModuleTag = normalizedHtml.indexOf('<script src="legacy/js/screens/dashboard-executive-kpis.js"></script>');
  const allocationModuleTag = normalizedHtml.indexOf('<script src="legacy/js/screens/dashboard-allocation.js"></script>');
  const appTag = normalizedHtml.indexOf('<script>\n(()=>{if(window.__LOCAL_TEST_MODE__) return;');
  assert.ok(moduleTag >= 0 && moduleTag < appTag, 'chart globals must load before application callers');
  assert.ok(settingsModuleTag >= 0 && settingsModuleTag < appTag, 'settings renderer must load before application callers');
  assert.ok(dashboardModuleTag >= 0 && dashboardModuleTag < appTag, 'dashboard KPI renderer must load before application callers');
  assert.ok(allocationModuleTag >= 0 && allocationModuleTag < appTag, 'dashboard allocation renderer must load before application callers');
  assert.match(html, /__EXPECTED_SERVICE_WORKER_CACHE__='carteira-investimentos-v250\.10'/);
  assert.match(sw, /SW_VERSION = 'v250\.10'/);
  assert.ok(sw.includes("'./legacy/js/ui/charts.js'"), 'offline shell must pre-cache the extracted renderer');
  assert.ok(sw.includes("'./legacy/js/screens/settings.js'"), 'offline shell must pre-cache the settings renderer');
  assert.ok(sw.includes("'./legacy/js/screens/dashboard-executive-kpis.js'"), 'offline shell must pre-cache the dashboard KPI renderer');
  assert.ok(sw.includes("'./legacy/js/screens/dashboard-allocation.js'"), 'offline shell must pre-cache the dashboard allocation renderer');
  assert.ok(packageJson.scripts.build.includes('legacy/js/ui/charts.js'), 'static build must require the renderer');
  assert.ok(packageJson.scripts.build.includes('legacy/js/screens/settings.js'), 'static build must require the settings renderer');
  assert.ok(packageJson.scripts.build.includes('legacy/js/screens/dashboard-executive-kpis.js'), 'static build must require the dashboard KPI renderer');
  assert.ok(packageJson.scripts.build.includes('legacy/js/screens/dashboard-allocation.js'), 'static build must require the dashboard allocation renderer');
});
