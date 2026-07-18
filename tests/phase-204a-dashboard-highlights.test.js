const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');

function readIndexHtml() {
  return fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
}

function extractSnippet(startMarker, endMarker) {
  const html = readIndexHtml();
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  assert.notEqual(start, -1, `Start marker not found: ${startMarker}`);
  assert.notEqual(end, -1, `End marker not found: ${endMarker}`);
  return html.slice(start, end);
}

function extractDashboardHighlightsSnippet() {
  return extractSnippet('function setDashboardHighlightsTab(tab){', 'function dashboardHomeCompositionPanel(data){');
}

function makeContext(rows, overrides = {}) {
  const counters = { renders: 0 };
  const context = {
    S: { dashboardHighlightsTab: 'high' },
    esc(value) {
      return String(value ?? '');
    },
    fmt(value) {
      return `R$${Number(value || 0).toFixed(2)}`;
    },
    fmtP(value) {
      return `${Number(value || 0).toFixed(2)}%`;
    },
    render() {
      counters.renders += 1;
    },
    go() {
      counters.renders += 1;
    },
    assetPerformanceOverviewRows() {
      return rows;
    },
    ...overrides,
  };
  vm.runInNewContext(extractDashboardHighlightsSnippet(), context);
  return { context, counters };
}

test('destaques da carteira usa dados oficiais e ordenacao correta', () => {
  const rows = [
    { ticker: 'AAA3', type: 'Acao', sector: 'Banco', resultPct: 18.5, result: 1850, hasPerformanceData: true },
    { ticker: 'AAB3', type: 'FII', sector: 'Imobiliario', resultPct: 18.5, result: 1600, hasPerformanceData: true },
    { ticker: 'AAC3', type: 'ETF', sector: 'Indice', resultPct: 12.0, result: 1200, hasPerformanceData: true },
    { ticker: 'AAD3', type: 'Acao', sector: 'Energia', resultPct: 0, result: 0, hasPerformanceData: true },
    { ticker: 'BAA3', type: 'Acao', sector: 'Banco', resultPct: -4.2, result: -420, hasPerformanceData: true },
    { ticker: 'BAB3', type: 'FII', sector: 'Imobiliario', resultPct: -4.2, result: -500, hasPerformanceData: true },
    { ticker: 'BAC3', type: 'Renda Fixa', sector: 'Credito', resultPct: -9.1, result: -910, hasPerformanceData: true },
    { ticker: 'BAD3', type: 'Acao', sector: 'Banco', resultPct: 7, result: 700, hasPerformanceData: false },
  ];
  const { context } = makeContext(rows);

  const highs = context.dashboardHighlightsRows('high');
  const lows = context.dashboardHighlightsRows('low');

  assert.equal(highs.length, 3);
  assert.deepEqual([...highs.map((row) => row.ticker)], ['AAA3', 'AAB3', 'AAC3']);
  assert.equal(highs.some((row) => row.ticker === 'AAD3'), false);
  assert.equal(highs.some((row) => row.ticker === 'BAD3'), false);

  assert.equal(lows.length, 3);
  assert.deepEqual([...lows.map((row) => row.ticker)], ['BAC3', 'BAB3', 'BAA3']);
  assert.equal(lows.some((row) => row.ticker === 'AAD3'), false);
  assert.equal(lows.some((row) => row.ticker === 'BAD3'), false);
});

test('destaques da carteira renderiza abas, estado vazio e atalho para desempenho', () => {
  const rows = [
    { ticker: 'AAA3', type: 'Acao', sector: 'Banco', resultPct: 18.5, result: 1850, hasPerformanceData: true },
    { ticker: 'AAB3', type: 'FII', sector: 'Imobiliario', resultPct: 12.1, result: 1210, hasPerformanceData: true },
    { ticker: 'AAC3', type: 'ETF', sector: 'Indice', resultPct: 7.9, result: 790, hasPerformanceData: true },
    { ticker: 'BAA3', type: 'Acao', sector: 'Banco', resultPct: -4.2, result: -420, hasPerformanceData: true },
    { ticker: 'BAB3', type: 'FII', sector: 'Imobiliario', resultPct: -5.5, result: -550, hasPerformanceData: true },
    { ticker: 'BAC3', type: 'Renda Fixa', sector: 'Credito', resultPct: -9.1, result: -910, hasPerformanceData: true },
    { ticker: 'ZERO1', type: 'Acao', sector: 'Energia', resultPct: 0, result: 0, hasPerformanceData: true },
    { ticker: 'INCM1', type: 'Acao', sector: 'Energia', resultPct: 7, result: 700, hasPerformanceData: false },
  ];
  const { context, counters } = makeContext(rows);

  const htmlHigh = context.dashboardHomeHighlightsPanel();
  assert.match(htmlHigh, /Destaques da carteira/);
  assert.match(htmlHigh, /Desempenho atual dos seus ativos/);
  assert.match(htmlHigh, /role="tablist"/);
  assert.match(htmlHigh, /role="tab"/);
  assert.match(htmlHigh, /aria-selected="true"/);
  assert.match(htmlHigh, /Maiores altas/);
  assert.match(htmlHigh, /Maiores baixas/);
  assert.match(htmlHigh, /AAA3/);
  assert.match(htmlHigh, /R\$1850\.00/);
  assert.match(htmlHigh, /go\('desempenho'\)/);
  assert.equal(htmlHigh.includes('Maiores pagadores do mes'), false);

  context.setDashboardHighlightsTab('low');
  assert.equal(context.S.dashboardHighlightsTab, 'low');
  assert.equal(counters.renders, 1);

  const htmlLow = context.dashboardHomeHighlightsPanel();
  assert.match(htmlLow, /BAC3/);
  assert.equal(htmlLow.includes('Nenhum ativo negativo com dados suficientes.'), false);

  const emptyContext = makeContext([]).context;
  const emptyHigh = emptyContext.dashboardHomeHighlightsPanel();
  emptyContext.setDashboardHighlightsTab('low');
  const emptyLow = emptyContext.dashboardHomeHighlightsPanel();
  assert.match(emptyHigh, /Nenhum ativo positivo com dados suficientes\./);
  assert.match(emptyLow, /Nenhum ativo negativo com dados suficientes\./);

  const dashBlock = extractSnippet('function dash(){', 'function patrimonySnapshot(');
  assert.match(dashBlock, /dashboardHomeHighlightsPanel\(\)/);
  assert.equal(dashBlock.includes('dashboardHomeMonthlyPayersPanel(data)'), false);
  assert.equal(dashBlock.includes("dashboardHomePerformancePanel('Maiores altas'"), false);
  assert.equal(dashBlock.includes("dashboardHomePerformancePanel('Maiores baixas'"), false);
  assert.equal(dashBlock.includes('Maiores pagadores do mes'), false);
});
