const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function loadSuggestions() {
  const start = indexHtml.indexOf('function rebalanceAssetSuggestions(');
  const end = indexHtml.indexOf('function dashboardSnapshot(', start);
  assert.ok(start >= 0 && end > start, 'função de sugestões precisa existir');
  const context = {
    S: { assets: [] },
    Number,
    Math,
    String,
    Array,
    Map,
    metaTicker: () => ({ type: 'Ação' }),
    normalizeType: (value, fallback) => String(value || fallback),
    assetCurrentValue: asset => Number(asset.current),
  };
  vm.runInNewContext(`${indexHtml.slice(start, end)}; rebalanceAssetSuggestions`, context);
  return context.rebalanceAssetSuggestions;
}

function distribution(allocation, totalCurrent = 1000) {
  return { totalCurrent, rows: [{ type: 'Ação', allocation }] };
}

test('decompõe a alocação oficial entre ativos abaixo da meta', () => {
  const suggest = loadSuggestions();
  const result = suggest(distribution(100), [
    { ticker: 'AAA3', type: 'Ação', current: 100, ideal_pct: 20 },
    { ticker: 'BBB3', type: 'Ação', current: 300, ideal_pct: 40 },
  ]);
  assert.deepEqual(result[0].suggestions.map(item => item.ticker), ['AAA3', 'BBB3']);
  assert.equal(result[0].suggestions.reduce((sum, item) => sum + item.amount, 0), 100);
  assert.ok(result[0].suggestions.every(item => item.amount >= 0));
});

test('não sugere aporte para ativo no target ou acima dele', () => {
  const suggest = loadSuggestions();
  const result = suggest(distribution(100), [
    { ticker: 'AAA3', type: 'Ação', current: 500, ideal_pct: 40 },
    { ticker: 'BBB3', type: 'Ação', current: 100, ideal_pct: 40 },
  ]);
  assert.deepEqual(result[0].suggestions.map(item => item.ticker), ['BBB3']);
  assert.equal(result[0].suggestions[0].amount, 100);
});

test('preserva centavos, determinismo e não aloca sem classe elegível', () => {
  const suggest = loadSuggestions();
  const assets = [
    { ticker: 'AAA3', type: 'Ação', current: 100, ideal_pct: 40 },
    { ticker: 'BBB3', type: 'Ação', current: 100, ideal_pct: 40 },
    { ticker: 'CCC3', type: 'Ação', current: 100, ideal_pct: 40 },
  ];
  const first = suggest(distribution(0.01, 1000), assets);
  const second = suggest(distribution(0.01, 1000), assets);
  assert.deepEqual(first, second);
  assert.equal(first[0].suggestions.reduce((sum, item) => sum + item.amount, 0), 0.01);
  const noDeficit = suggest(distribution(100), [{ ticker: 'AAA3', type: 'Ação', current: 1000, ideal_pct: 100 }]);
  assert.equal(noDeficit.length, 1);
  assert.equal(noDeficit[0].suggestions.length, 0);
});
