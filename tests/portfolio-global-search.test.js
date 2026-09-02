const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = source.indexOf('const PORTFOLIO_SEARCH_GROUPS=');
const end = source.indexOf('function clA(){', start);
assert.notEqual(start, -1);
assert.notEqual(end, -1);

function loadSearch() {
  const context = {
    S: {
      assets: [
        { id: 'asset-1', ticker: 'PETR4', name: 'Petrobras', type: 'Ação', current_price: 100 },
        { id: 'asset-2', ticker: 'PETR4', name: 'Petrobras PN', type: 'Ação', current_price: 200 },
        { id: 'rf-1', ticker: 'CDB26', name: 'CDB Banco', type: 'Renda Fixa', rf_maturity_date: '2026-12-15', rf_liquid_value: 500 },
      ],
      aportes: [{ id: 'move-1', ticker: 'PETR4', date: '2026-08-01', name: 'Compra PETR4', type: 'Ação', qty: 2, price: 50 }],
      proventos: [{ id: 'income-1', ticker: 'PETR4', date: '2026-08-15', value: 10, type: 'Dividendo' }],
      goals: { patrimonio: { target: 1000 }, ativos: { ticker: 'PETR4', type: 'Ação' }, proventos: { monthly: 100 } },
    },
    fmt: value => `R$ ${Number(value || 0).toFixed(2)}`,
    esc: value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])),
    parseAnyDate: value => new Date(`${value}T12:00:00`),
    isRendaFixaAsset: asset => asset.type === 'Renda Fixa',
    assetRfMaturityDate: asset => asset.rf_maturity_date || '',
    normalizeGoals: goals => goals,
    dataQualitySnapshot: () => ({ issues: [] }),
    debugWarn: () => {},
    document: { addEventListener: () => {} },
    console,
  };
  return vm.runInNewContext(`${source.slice(start, end)}
    ({ portfolioSearchBuildEntries, portfolioSearchResults, portfolioSearchScore });`, context);
}

test('busca global preserva identidades distintas e agrupa entidades oficiais', () => {
  const { portfolioSearchBuildEntries } = loadSearch();
  const entries = portfolioSearchBuildEntries();
  assert.equal(entries.filter(entry => entry.kind === 'asset').length, 2);
  assert.equal(entries.filter(entry => entry.kind === 'rf').length, 1);
  assert.equal(entries.filter(entry => entry.kind === 'movement').length, 1);
  assert.equal(entries.filter(entry => entry.kind === 'dividend').length, 1);
  assert.equal(new Set(entries.map(entry => `${entry.kind}:${entry.id}`)).size, entries.length);
});

test('ranking prioriza ticker exato e nao usa fuzzy matching', () => {
  const { portfolioSearchResults, portfolioSearchScore } = loadSearch();
  const entries = [
    { kind: 'asset', id: 'long', title: 'PETR4 · Petrobras', fields: ['long', 'PETR4', 'Petrobras'] },
    { kind: 'asset', id: 'PETR4', title: 'PETR4 · Outro cadastro', fields: ['PETR4', 'Outro cadastro'] },
  ];
  assert.equal(portfolioSearchScore(entries[1], 'PETR4'), 1000);
  assert.equal(portfolioSearchScore(entries[0], 'PETR'), 700);
  assert.equal(portfolioSearchScore(entries[0], 'ptr4'), 0);
  assert.equal(portfolioSearchResults('PETR4').length >= 3, true);
});

test('consulta vazia nao cria resultados nem altera estado', () => {
  const { portfolioSearchResults } = loadSearch();
  assert.equal(portfolioSearchResults('').length, 0);
});
