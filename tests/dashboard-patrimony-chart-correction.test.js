const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = source.indexOf('function dashboardEvolutionPanel(data){');
const end = source.indexOf('\nfunction dashboardIncomePanel(data){', start);
const panel = source.slice(start, end);

test('evolucao patrimonial usa a serie real de aportes quando existe historico', () => {
  assert.ok(start >= 0 && end > start, 'painel patrimonial precisa existir');
  assert.match(panel, /histórico patrimonial ainda não disponível/i);
  assert.match(panel, /Patrimônio consolidado/);
  assert.match(panel, /Aportes líquidos acumulados/);
  assert.match(panel, /dashboard-patrimony-chart/);
  assert.match(panel, /tooltipLabel:'Patrimônio'/);
  assert.match(panel, /snapshot\.months\.map\(row=>row\.label\)/);
  assert.match(panel, /lineChart\(/);
});

test('evolucao patrimonial preserva pontos navegáveis e tooltip sem inventar serie', () => {
  const chartStart = source.indexOf('function lineChart(series, labels, chartClass=', 0);
  const chartEnd = source.indexOf('\nfunction syncAssetsFromAportes(', chartStart);
  const chart = source.slice(chartStart, chartEnd);

  assert.ok(chartStart >= 0 && chartEnd > chartStart, 'lineChart precisa existir');
  assert.match(chart, /class="chart-data-point"/);
  assert.match(chart, /tabindex="0"/);
  assert.match(chart, /aria-label="\$\{esc\(tooltip\)\}"/);
  assert.match(chart, /data-chart-tooltip="\$\{esc\(tooltip\)\}"/);
  assert.match(chart, /onpointerenter="showLineChartTooltip/);
  assert.match(chart, /onclick="showLineChartTooltip/);
  assert.match(chart, /const all=series\.flatMap\(s=>s\.values\.map/);
});
