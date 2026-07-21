const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function makeContext() {
  const indexHtml = read('index.html');
  const fnStart = indexHtml.indexOf('function dividendDistributionRow(');
  const fnEnd = indexHtml.indexOf('function dividendOverviewRecentPanel(', fnStart);
  assert.ok(fnStart >= 0, 'dividendDistributionRow precisa existir');
  assert.ok(fnEnd > fnStart, 'dividendOverviewRecentPanel precisa existir depois');
  const snippet = indexHtml.slice(fnStart, fnEnd);

  const context = {
    console,
    S: {},
    fmt(value) {
      return Number(value ?? 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    },
    esc: escapeHtml,
    Math, Number, Date, String, Array, Object, Set, Map, JSON, RegExp, Boolean, Intl,
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(snippet, context, { filename: 'summary-clarity-snippet.js' });
  return context;
}

function makeMonth(key, total) {
  return { key, total, count: total > 0 ? 1 : 0 };
}

const months12 = [
  '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
  '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07',
];

test('dividendDistributionRow gera HTML sem NaN/undefined', () => {
  const ctx = makeContext();
  const row = ctx.dividendDistributionRow(makeMonth('2026-07', 150), 200);
  assert.ok(row.startsWith('<div class="div-dist-row">'));
  assert.ok(row.includes('div-dist-month'));
  assert.ok(row.includes('div-dist-track'));
  assert.ok(row.includes('div-dist-fill'));
  assert.ok(row.includes('div-dist-value'));
  assert.equal(row.includes('NaN'), false);
  assert.equal(row.includes('undefined'), false);
  assert.equal(row.includes('null'), false);
});

test('dividendDistributionRow zero real preservado', () => {
  const ctx = makeContext();
  const row = ctx.dividendDistributionRow(makeMonth('2026-06', 0), 200);
  assert.ok(row.includes('div-dist-fill empty'));
  assert.ok(row.includes('div-dist-value zero'));
  assert.match(row, /R\$\s*0,00/);
});

test('dividendDistributionPanel gera no maximo 12 meses ordem cronologica', () => {
  const ctx = makeContext();
  const byMonth = months12.map((key, i) => makeMonth(key, i * 10));
  const stats = { byMonth };
  const html = ctx.dividendDistributionPanel(stats);
  assert.ok(html.startsWith('<div class="div-dist-panel">'));
  const rowCount = (html.match(/<div class="div-dist-row">/g) || []).length;
  assert.equal(rowCount, 12);
  assert.ok(html.includes('ago'));
  assert.ok(html.includes('jul'));
  assert.equal(html.includes('NaN'), false);
  assert.equal(html.includes('undefined'), false);
});

test('dividendDistributionPanel aceita menos de 12 meses', () => {
  const ctx = makeContext();
  const byMonth = months12.slice(-3).map((key, i) => makeMonth(key, (i + 1) * 50));
  const stats = { byMonth };
  const html = ctx.dividendDistributionPanel(stats);
  const rowCount = (html.match(/<div class="div-dist-row">/g) || []).length;
  assert.equal(rowCount, 3);
});

test('overviewBody usa div-exec-overview com distribution panel', () => {
  const indexHtml = read('index.html');
  assert.match(indexHtml, /div-exec-overview/);
  assert.match(indexHtml, /dividendDistributionPanel\(dfStats\)/);
  assert.match(indexHtml, /div-exec-kpis/);
  assert.match(indexHtml, /div-dist-panel/);
});

test('dividendSummaryCards ainda contem KPIs essenciais', () => {
  const indexHtml = read('index.html');
  const fnStart = indexHtml.indexOf('function dividendSummaryCards()');
  const fnEnd = indexHtml.indexOf('function dividendDistributionRow(', fnStart);
  const fn = indexHtml.slice(fnStart, fnEnd);
  assert.ok(fn.includes('Recebido no mês'));
  assert.ok(fn.includes('Total últimos 12 meses'));
  assert.ok(fn.includes('Meta mensal'));
  assert.ok(fn.includes('fmt(stats.total12)'));
  assert.ok(fn.includes('fmt(stats.monthlyAvg)'));
});

test('dividendDistributionRow aceita maxVal zero sem quebrar', () => {
  const ctx = makeContext();
  const row = ctx.dividendDistributionRow(makeMonth('2026-01', 0), 0);
  assert.ok(row.includes('div-dist-fill empty'));
  assert.ok(row.includes('width:100%'));
  assert.equal(row.includes('NaN'), false);
  assert.equal(row.includes('Infinity'), false);
});

test('CSS media query duplicata removida', () => {
  const indexHtml = read('index.html');
  const count768 = (indexHtml.match(/@media\(max-width:768px\)\{/g) || []).length;
  const occurrences = indexHtml.match(/\@media\(max-width:768px\)\{[^}]*\.div-exec-overview\{grid-template-columns:1fr\}/g) || [];
  assert.equal(occurrences.length, 0, 'Nao deve ter .div-exec-overview duplicado no @media 768px');
});

test('helper visual sem duplicar calculo financeiro', () => {
  const indexHtml = read('index.html');
  const fn = indexHtml.slice(indexHtml.indexOf('function dividendDistributionRow('), indexHtml.indexOf('function dividendDistributionPanel('));
  assert.equal(fn.includes('passiveIncomeGoalStats'), false);
  assert.equal(fn.includes('proventoHistoricoMensal'), false);
  assert.equal(fn.includes('dividendMonthlyHistorySummary'), false);
  assert.equal(fn.includes('dividendMonthlyHistoryGroupRows'), false);
});
