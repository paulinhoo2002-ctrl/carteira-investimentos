const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const source = fs.readFileSync('index.html', 'utf8');
const start = source.indexOf('function rentabilidadeTab()');
const end = source.indexOf('\nfunction rebalanceScenarioValues', start);
const view = source.slice(start, end);

test('Rentabilidade preserva fontes oficiais e ordem analitica', () => {
  assert.match(view, /rentabilityHistory\(type, period, bench\)/);
  assert.match(view, /lineChart\(chartSeries, chartLabels, 'rent-performance-chart'\)/);
  assert.match(view, /Rentabilidade total/);
  assert.match(view, /Últimos 12 meses/);
  assert.match(view, /Último mês/);
  assert.match(view, /Melhor ano/);
  assert.match(view, /Pior ano/);
  assert.match(view, /Meses analisados/);
  assert.match(view, /Baseado na posição atual/);
});

test('Rentabilidade mantém filtros e valores financeiros legíveis', () => {
  assert.match(view, /aria-label="Período da rentabilidade"/);
  assert.match(view, /aria-label="Tipo de ativo da rentabilidade"/);
  assert.match(view, /aria-label="Benchmark da rentabilidade"/);
  assert.match(source, /\.rent-summary-chip-value[\s\S]*white-space:normal/);
  assert.match(source, /\.rent-summary-chip-value[\s\S]*text-overflow:clip/);
  assert.match(source, /\.rent-premium \.rent-performance-chart\{height:168px!important\}/);
});
