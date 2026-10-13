const { readLegacyHtml } = require('./helpers/read-legacy-html.cjs');
const ROOT = require('node:path').resolve(__dirname, '..');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyFullAppFixture } = require('./helpers/full-app-fixtures');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function read(relativePath) {
  return relativePath === 'index.html' ? readLegacyHtml() : fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
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
  const fnStart = indexHtml.indexOf('function dividendMonthlyHistoryRows(');
  const fnEnd = indexHtml.indexOf('function dividendOverviewRecentPanel(', fnStart);
  assert.ok(fnStart >= 0, 'dividendMonthlyHistoryRows precisa existir');
  assert.ok(fnEnd > fnStart, 'dividendOverviewRecentPanel precisa existir depois');
  const snippet = indexHtml.slice(fnStart, fnEnd);

  const context = {
    console,
    S: {
      dividendMonthlyHistoryPeriod: 'all',
      dividendMonthlyHistoryTicker: 'all',
      dividendMonthlyHistoryType: 'all',
      dividendDistributionOpen: false,
    },
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
  const row = ctx.dividendDistributionRow({ ...makeMonth('2026-06', 0), coverage: 'COMPLETE' }, 200);
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
  assert.equal(rowCount, 11, 'Mês sem registros não pode ser convertido em linha sintética de zero');
  assert.equal(html.includes('ago'), false);
  assert.ok(html.includes('jul'));
  assert.equal(html.includes('NaN'), false);
  assert.equal(html.includes('undefined'), false);
});

test('dividendDistributionPanel usa recolhimento e filtros atuais', () => {
  const ctx = makeContext();
  ctx.dividendMonthlyHistoryRows = () => [
    { monthKey: '2026-01', paymentDt: new Date('2026-01-15T12:00:00'), ticker: 'AAA1', type: 'Dividendo', value: 120 },
    { monthKey: '2026-02', paymentDt: new Date('2026-02-15T12:00:00'), ticker: 'BBB2', type: 'JCP', value: 80 },
    { monthKey: '2025-12', paymentDt: new Date('2025-12-15T12:00:00'), ticker: 'CCC3', type: 'Rendimento', value: 40 },
  ];

  const collapsed = ctx.dividendDistributionPanel({ byMonth: months12.map((key, i) => makeMonth(key, i * 10)) });
  assert.match(collapsed, /Distribuição mensal/);
  assert.match(collapsed, /Ver distribuição mensal/);
  assert.match(collapsed, /aria-expanded="false"/);
  assert.match(collapsed, /aria-controls="div-month-dist-body"/);
  assert.equal(collapsed.includes('div-dist-periods'), false);
  assert.match(collapsed, /class="hidden"/);

  ctx.S.dividendDistributionOpen = true;
  const expanded = ctx.dividendDistributionPanel({ byMonth: months12.map((key, i) => makeMonth(key, i * 10)) });
  assert.match(expanded, /Ocultar distribuição/);
  assert.match(expanded, /aria-expanded="true"/);
  assert.equal((expanded.match(/div-dist-row/g) || []).length >= 3, true);
});

test('overviewBody usa div-exec-kpis sem distribution panel no layout simplificado', () => {
  const indexHtml = read('index.html');
  assert.match(indexHtml, /div-exec-overview/);
  assert.match(indexHtml, /function dividendDistributionPanel\(stats\)/);
  assert.match(indexHtml, /div-exec-kpis/);
  const overviewStart=indexHtml.indexOf('const overviewBody=');
  const bodyStart=indexHtml.indexOf('const body=',overviewStart);
  const overviewBlock=indexHtml.slice(overviewStart,bodyStart);
  assert.equal(overviewBlock.includes('dividendDistributionPanel(dfStats)'), false);
});

test('dividendSummaryCards ainda contem KPIs essenciais', () => {
  const indexHtml = read('index.html');
  const fnStart = indexHtml.indexOf('function dividendSummaryCards()');
  const fnEnd = indexHtml.indexOf('function dividendDistributionRow(', fnStart);
  const fn = indexHtml.slice(fnStart, fnEnd);
  assert.ok(fn.includes('Recebido este mês'));
  assert.ok(fn.includes('Total últimos 12 meses'));
  assert.ok(fn.includes('Meta mensal'));
  assert.ok(fn.includes('passiveIncomeValue(stats.total12)'));
  assert.ok(fn.includes('Cobertura confirmada: ${complete.length}/12 meses'));
  assert.ok(fn.includes('passiveIncomeValue(stats.monthlyAvg)'));
});

test('dividendDistributionRow aceita maxVal zero sem quebrar', () => {
  const ctx = makeContext();
  const row = ctx.dividendDistributionRow({ ...makeMonth('2026-01', 0), coverage: 'COMPLETE' }, 0);
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

test('dividendDistributionRow sem duplicar calculo financeiro', () => {
  const indexHtml = read('index.html');
  const fnStart = indexHtml.indexOf('function dividendDistributionRow(');
  const fnEnd = indexHtml.indexOf('function dividendDistributionMonths(', fnStart);
  assert.ok(fnStart >= 0);
  assert.ok(fnEnd > fnStart);
  const fn = indexHtml.slice(fnStart, fnEnd);
  assert.equal(fn.includes('passiveIncomeGoalStats'), false);
  assert.equal(fn.includes('proventoHistoricoMensal'), false);
  assert.equal(fn.includes('dividendMonthlyHistorySummary'), false);
  assert.equal(fn.includes('dividendMonthlyHistoryGroupRows'), false);
});

test('dividendDistributionMonths usa fontes canonicas', () => {
  const indexHtml = read('index.html');
  const fnStart = indexHtml.indexOf('function dividendDistributionMonths(');
  const fnEnd = indexHtml.indexOf('function dividendDistributionPanel(', fnStart);
  assert.ok(fnStart >= 0);
  assert.ok(fnEnd > fnStart);
  const fn = indexHtml.slice(fnStart, fnEnd);
  assert.ok(fn.includes('passiveIncomeGoalStats'));
  assert.ok(fn.includes('dividendMonthlyHistoryRows'));
  assert.ok(fn.includes('passiveIncomeRollingMonthKeys'));
});

test('dividendDistributionPanel inclui seletor de periodo', () => {
  const indexHtml = read('index.html');
  const fnStart = indexHtml.indexOf('function dividendDistributionPanel(');
  const fnEnd = indexHtml.indexOf('function dividendOverviewRecentPanel(', fnStart);
  assert.ok(fnStart >= 0);
  assert.ok(fnEnd > fnStart);
  const fn = indexHtml.slice(fnStart, fnEnd);
  assert.ok(fn.includes('div-month-dist-body'));
  assert.ok(fn.includes('Ver distribuição mensal'));
  assert.ok(fn.includes('Ocultar distribuição'));
  assert.ok(fn.includes('aria-controls'));
  assert.equal(fn.includes('div-dist-periods'), false);
});

test('dividendDistributionRow isAbsent renderiza — sem NaN', () => {
  const ctx = makeContext();
  ctx.S.dividendDistributionPeriod = '24m';
  const row = ctx.dividendDistributionRow({key:'2020-01', total:0, isAbsent:true}, 100);
  assert.ok(row.includes('div-dist-value zero'));
  assert.ok(row.includes('—'));
  assert.equal(row.includes('NaN'), false);
  assert.equal(row.includes('undefined'), false);
});

test('dividendDistributionRow isAbsent=false sozinho não confirma zero', () => {
  const ctx = makeContext();
  const row = ctx.dividendDistributionRow({key:'2026-06', total:0, isAbsent:false}, 200);
  assert.ok(row.includes('div-dist-fill empty'));
  assert.ok(row.includes('div-dist-value zero'));
  assert.doesNotMatch(row, /R\$\s*0,00/);
  assert.match(row, /—/);
  assert.equal(row.includes('NaN'), false);
});

test('historico mensal fica recolhido no overview e abre somente na visao mensal', async () => {
  const harness = await startLocalHttpServer(ROOT, 0, { syntheticQa: true });
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
  const page = await context.newPage();

  await page.goto(harness.url + '&testReadOnly=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof S !== 'undefined' && !!document.querySelector('.test-mode-banner'), { timeout: 5000 });
  await applyFullAppFixture(page, 'large', 'CONFIRMED');
  await page.evaluate(() => go('dividendos'));
  await page.waitForFunction(() => S.tab === 'dividendos', { timeout: 5000 });

  // Overview view: monthly history should be present (as part of overview)
  const overviewHtml = await page.evaluate(() => document.body.innerHTML);
  assert.ok(overviewHtml.includes('dividend-history-block'), 'overview must contain dividend-history-block');

  // Monthly view: monthly table block should be present
  await page.evaluate(() => { S.dividendViewMode = 'monthly'; go('dividendos'); });
  await page.waitForFunction(() => S.tab === 'dividendos' && S.dividendViewMode === 'monthly', { timeout: 3000 });
  const monthlyHtml = await page.evaluate(() => document.body.innerHTML);
  assert.ok(monthlyHtml.includes('div-monthly-body') || monthlyHtml.includes('dividend-monthly-table'), 'monthly view must contain monthly table');

  // More views dropdown exists
  assert.ok(overviewHtml.includes('div-dividend-moreviews'), 'must have more views dropdown');

  await browser.close();
  harness.server.close();
});

test('dividendDistributionPeriod estado default e reset', () => {
  const indexHtml = read('index.html');
  assert.ok(indexHtml.includes("dividendDistributionPeriod:'12m'"));
  assert.ok(indexHtml.includes("S.dividendDistributionPeriod='12m'"));
  assert.ok(indexHtml.includes("dividendDistributionOpen:false"));
  assert.ok(indexHtml.includes("S.dividendDistributionOpen=false"));
});
