const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('index.html', 'utf8');
function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} deve existir`);
  let depth = 0;
  let opened = false;
  for (let i = source.indexOf('{', source.indexOf(')', start)); i < source.length; i += 1) {
    if (source[i] === '{') { depth += 1; opened = true; }
    if (source[i] === '}') depth -= 1;
    if (opened && depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`funcao ${name} incompleta`);
}

const context = {};
vm.runInNewContext(`${extractFunction('assetsPortfolioSummary')}; this.assetsPortfolioSummary=assetsPortfolioSummary;`, context);
const summarize = (rows) => context.assetsPortfolioSummary(rows, {
  assetAppliedValue: asset => asset.applied,
  assetCurrentValue: asset => asset.current,
  assetRentabPct: asset => asset.applied ? ((asset.current - asset.applied) / asset.applied) * 100 : null,
  normalizeType: value => String(value || 'Outros')
});

const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0);

test('carteira vazia produz totais seguros', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(summarize([]))), { assets: [], invested: 0, current: 0, result: 0, returnPct: null, byClass: [] });
});

test('ativo positivo deriva resultado e rentabilidade', () => {
  const result = summarize([{ ticker: 'PETR4', type: 'Ação', applied: 200, current: 250 }]);
  assert.deepEqual(result.assets[0].result, 50);
  assert.equal(result.assets[0].returnPct, 25);
  assert.equal(result.result, 50);
});

test('ativo negativo preserva o sinal', () => {
  const result = summarize([{ ticker: 'FII1', type: 'FII', applied: 5000, current: 4500 }]);
  assert.equal(result.result, -500);
  assert.equal(result.returnPct, -10);
});

test('resultado zero legítimo permanece zero', () => {
  const result = summarize([{ ticker: 'ETF1', type: 'ETF', applied: 1000, current: 1000 }]);
  assert.equal(result.result, 0);
  assert.equal(result.returnPct, 0);
});

test('ativo sem valor atual não vira lucro falso', () => {
  const result = summarize([{ ticker: 'OLD1', type: 'Ação', applied: 1000, current: null }]);
  assert.equal(result.assets[0].current, null);
  assert.equal(result.assets[0].result, null);
  assert.equal(result.byClass[0].incomplete, 1);
});

test('múltiplos ativos fecham no total global', () => {
  const result = summarize([
    { ticker: 'A', type: 'Ação', applied: 10000, current: 11000 },
    { ticker: 'B', type: 'FII', applied: 5000, current: 4500 },
    { ticker: 'C', type: 'ETF', applied: 3000, current: 3300 },
    { ticker: 'D', type: 'Renda Fixa', applied: 20000, current: 21000 }
  ]);
  assert.equal(result.invested, 38000);
  assert.equal(result.current, 39800);
  assert.equal(result.result, 1800);
  assert.equal(result.returnPct, (1800 / 38000) * 100);
});

test('múltiplas classes agrupam sem perder linhas', () => {
  const result = summarize([
    { ticker: 'A', type: 'Ação', applied: 100, current: 110 },
    { ticker: 'B', type: 'Ação', applied: 200, current: 180 },
    { ticker: 'C', type: 'Cripto', applied: 50, current: 75 }
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(result.byClass.map(group => group.className))), ['Ação', 'Cripto']);
  assert.equal(result.byClass[0].result, -10);
  assert.equal(result.byClass[1].result, 25);
});

test('Renda Fixa usa somente aplicado e atual', () => {
  const result = summarize([{ ticker: 'CDB', type: 'Renda Fixa', applied: 1000, current: 1100, juros: 100, proventos: 100 }]);
  assert.equal(result.invested, 1000);
  assert.equal(result.current, 1100);
  assert.equal(result.result, 100);
});

test('RF sem atual explícito permanece incompleta', () => {
  const result = summarize([{ ticker: 'CDB', type: 'Renda Fixa', applied: 1000, current: null }]);
  assert.equal(result.returnPct, null);
  assert.equal(result.byClass[0].current, 0);
  assert.equal(result.byClass[0].incomplete, 1);
});

test('fechamento ativo para classe e classe para carteira', () => {
  const result = summarize([
    { ticker: 'A', type: 'Ação', applied: 10, current: 12 },
    { ticker: 'B', type: 'Ação', applied: 20, current: 18 },
    { ticker: 'C', type: 'ETF', applied: 30, current: 33 }
  ]);
  assert.equal(sum(result.assets, 'invested'), result.invested);
  assert.equal(sum(result.assets, 'current'), result.current);
  assert.equal(sum(result.byClass, 'invested'), result.invested);
  assert.equal(sum(result.byClass, 'current'), result.current);
  assert.equal(sum(result.byClass, 'result'), result.result);
});

test('paridade com fontes oficiais preserva os valores recebidos', () => {
  const result = context.assetsPortfolioSummary([{ ticker: 'X', type: 'Ação', applied: 1, current: 2 }], {
    assetAppliedValue: () => 40,
    assetCurrentValue: () => 50,
    assetRentabPct: () => 25,
    normalizeType: value => value
  });
  assert.deepEqual(JSON.parse(JSON.stringify(result.assets[0])), { asset: { ticker: 'X', type: 'Ação', applied: 1, current: 2 }, ticker: 'X', assetClass: 'Ação', invested: 40, current: 50, result: 10, returnPct: 25 });
});

test('não gera NaN', () => {
  const result = summarize([{ ticker: 'X', type: 'Ação', applied: 0, current: 0 }]);
  assert.equal(Number.isNaN(result.result), false);
  assert.equal(Number.isNaN(result.returnPct), false);
});

test('não gera Infinity, undefined ou null em métricas completas', () => {
  const result = summarize([{ ticker: 'X', type: 'Ação', applied: 10, current: 11 }]);
  for (const value of [result.invested, result.current, result.result, result.returnPct, result.byClass[0].returnPct]) {
    assert.equal(Number.isFinite(value), true);
  }
});

test('helper é puro e não muta entradas', () => {
  const rows = [{ ticker: 'X', type: 'Ação', applied: 10, current: 11 }];
  const before = JSON.stringify(rows);
  summarize(rows);
  assert.equal(JSON.stringify(rows), before);
});

test('helper é determinístico', () => {
  const rows = [{ ticker: 'X', type: 'Ação', applied: 10, current: 11 }];
  assert.deepEqual(summarize(rows), summarize(rows));
});
