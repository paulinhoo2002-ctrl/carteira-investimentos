const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const source = fs.readFileSync('index.html', 'utf8');
const rentModule = fs.readFileSync('legacy/js/screens/rentabilidade.js', 'utf8');
const start = rentModule.indexOf('function rentabilidadeTab(');
const end = rentModule.indexOf('\nfunction rebalanceScenarioValues', start);
const view = rentModule.slice(start, end);

test('Rentabilidade preserva fontes oficiais e ordem analitica', () => {
  assert.match(view, /rentabilityHistory\(type, period, bench\)/);
  assert.match(view, /lineChart\(chartSeries, chartLabels, 'rent-performance-chart'\)/);
  assert.match(view, /Rentabilidade total/);
  assert.match(view, /Últimos 12 meses/);
  assert.match(view, /Último mês/);
  assert.match(view, /Melhor ano/);
  assert.match(view, /Pior ano/);
  assert.match(view, /Meses com retorno calculado/);
  assert.match(view, /TWR datado|Retorno simples datado/);
});

test('Rentabilidade mantém filtros e valores financeiros legíveis', () => {
  assert.match(view, /aria-label="Período da rentabilidade"/);
  assert.match(view, /aria-label="Tipo de ativo da rentabilidade"/);
  assert.match(view, /aria-label="Benchmark da rentabilidade"/);
  const css = fs.readFileSync('legacy/css/responsive-layout.css', 'utf8');
  assert.match(css, /\.rent-summary-chip-value[\s\S]*white-space:normal/);
  assert.match(css, /\.rent-summary-chip-value[\s\S]*text-overflow:clip/);
  assert.match(css, /\.rent-premium \.rent-performance-chart\{height:168px!important\}/);
});
