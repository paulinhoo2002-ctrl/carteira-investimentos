const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('index.html', 'utf8');

function loadHelpers() {
  const start = source.indexOf('function priorityReviewSnapshot');
  const end = source.indexOf('function dashboardLatestSourceInfo');
  const context = {
    portfolioInsightsSnapshot: () => [],
    fmtP: value => `${Number(value).toFixed(2)}%`,
    esc: value => String(value),
    console,
  };
  vm.runInNewContext(`${source.slice(start, end)}; this.api={priorityReviewSnapshot,profitabilityContext};`, context);
  return context.api;
}

test('prioriza severidade e remove o mesmo insight duplicado', () => {
  const { priorityReviewSnapshot } = loadHelpers();
  const result = priorityReviewSnapshot([
    { id: 'info', severity: 'INFO', category: 'concentration' },
    { id: 'rf', severity: 'IMPORTANT', category: 'fixed-income' },
    { id: 'rf', severity: 'IMPORTANT', category: 'fixed-income' },
    { id: 'goal', severity: 'ATTENTION', category: 'goals' },
  ]);
  assert.deepEqual(result.map(item => item.id), ['rf', 'goal', 'info']);
});

test('contextualiza rentabilidade apenas com carteira e benchmark oficiais', () => {
  const { profitabilityContext } = loadHelpers();
  assert.match(profitabilityContext({ cumReturn: 12, currentBench: 10, bench: 'CDI' }), /2\.00% acima do CDI/);
  assert.match(profitabilityContext({ cumReturn: 8, currentBench: 10, bench: 'IPCA' }), /2\.00% abaixo do IPCA/);
  assert.match(profitabilityContext({ cumReturn: NaN, currentBench: 10, bench: 'CDI' }), /valores oficiais/);
});

test('IA mantém a fila completa e Dashboard continua limitado a tres prioridades', () => {
  assert.match(source, /priorityReviewMarkup\(priorityReviewSnapshot\(\)\)/);
  assert.match(source, /data\.insights\.slice\(0,3\)/);
  assert.match(source, /function priorityReviewSnapshot/);
  assert.doesNotMatch(source, /setInterval\([^)]*portfolioInsights/);
});