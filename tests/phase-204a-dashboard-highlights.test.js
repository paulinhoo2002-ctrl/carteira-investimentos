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

function extractGoSnippet() {
  return extractSnippet('function go(t){', 'function clA(){');
}

function makeContext(rows, overrides = {}) {
  const counters = { renders: 0 };
  const context = {
    S: { dashboardHighlightsTab: 'high', dashboardHighlightsClassFilter: 'all' },
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
    save() {
      counters.saves = (counters.saves || 0) + 1;
    },
    runAutoProventosGratis() {},
    // PR fix/assets-highlights-and-rf-result: dashboardHighlightsRows agora
    // consome assetAnalysisRows() (fonte canônica da aba Análise). O mock
    // precisa fornecer o shape real produzido por essa fonte: profit, pct,
    // applied, current, type, sector e hasPerformanceData. Mantém as
    // asserções existentes no painel (ticker, result, resultPct).
    assetAnalysisRows() {
      return rows;
    },
    ...overrides,
  };
  vm.runInNewContext(extractDashboardHighlightsSnippet(), context);
  return { context, counters };
}

test('destaques da carteira usa dados oficiais e ordenacao correta', () => {
  const rows = [
    { ticker: 'AAA3', type: 'Acao', sector: 'Banco', profit: 1850, pct: 18.5, applied: 10000, current: 11850, hasPerformanceData: true },
    { ticker: 'AAB3', type: 'FII', sector: 'Imobiliario', profit: 1600, pct: 18.5, applied: 8648, current: 10248, hasPerformanceData: true },
    { ticker: 'AAC3', type: 'ETF', sector: 'Indice', profit: 1200, pct: 12.0, applied: 10000, current: 11200, hasPerformanceData: true },
    { ticker: 'AAD3', type: 'Acao', sector: 'Energia', profit: 950, pct: 9.5, applied: 10000, current: 10950, hasPerformanceData: true },
    { ticker: 'AAE3', type: 'FII', sector: 'Logistica', profit: 820, pct: 8.2, applied: 10000, current: 10820, hasPerformanceData: true },
    { ticker: 'AAF3', type: 'ETF', sector: 'Indice', profit: 700, pct: 7.0, applied: 10000, current: 10700, hasPerformanceData: true },
    { ticker: 'BAA3', type: 'Acao', sector: 'Banco', profit: -420, pct: -4.2, applied: 10000, current: 9580, hasPerformanceData: true },
    { ticker: 'BAB3', type: 'FII', sector: 'Imobiliario', profit: -500, pct: -4.2, applied: 11904, current: 11404, hasPerformanceData: true },
    { ticker: 'BAC3', type: 'ETF', sector: 'Indice', profit: -910, pct: -9.1, applied: 10000, current: 9090, hasPerformanceData: true },
    { ticker: 'BAD3', type: 'Acao', sector: 'Energia', profit: -610, pct: -6.1, applied: 10000, current: 9390, hasPerformanceData: true },
    { ticker: 'BAE3', type: 'FII', sector: 'Imobiliario', profit: -550, pct: -5.5, applied: 10000, current: 9450, hasPerformanceData: true },
    { ticker: 'BAF3', type: 'ETF', sector: 'Indice', profit: -310, pct: -3.1, applied: 10000, current: 9690, hasPerformanceData: true },
    { ticker: 'RFC3', type: 'Renda Fixa', sector: 'Credito', profit: -910, pct: -9.1, applied: 10000, current: 9090, hasPerformanceData: true },
    { ticker: 'BAD4', type: 'Acao', sector: 'Banco', profit: 700, pct: 7, applied: 10000, current: 10700, hasPerformanceData: false }
  ];
  const { context } = makeContext(rows);

  const highs = context.dashboardHighlightsRows('high');
  const lows = context.dashboardHighlightsRows('low');

  assert.ok(highs.length >= 5);
  assert.deepEqual([...highs.slice(0, 5).map((row) => row.ticker)], ['AAA3', 'AAB3', 'AAC3', 'AAD3', 'AAE3']);
  assert.equal(highs.slice(0, 5).some((row) => row.ticker === 'AAF3'), false);
  assert.equal(highs.some((row) => row.ticker === 'RFC3' || row.type === 'Renda Fixa'), false);

  assert.ok(lows.length >= 5);
  assert.deepEqual([...lows.slice(0, 5).map((row) => row.ticker)], ['BAC3', 'BAD3', 'BAE3', 'BAB3', 'BAA3']);
  assert.equal(lows.slice(0, 5).some((row) => row.ticker === 'BAD4'), false);
  assert.equal(lows.some((row) => row.type === 'Renda Fixa'), false);
});

test('destaques da carteira renderiza abas, estado vazio e atalho para desempenho', () => {
  const rows = [
    { ticker: 'AAA3', type: 'Acao', sector: 'Banco', profit: 1850, pct: 18.5, applied: 10000, current: 11850, hasPerformanceData: true },
    { ticker: 'AAB3', type: 'FII', sector: 'Imobiliario', profit: 1210, pct: 12.1, applied: 10000, current: 11210, hasPerformanceData: true },
    { ticker: 'AAC3', type: 'ETF', sector: 'Indice', profit: 790, pct: 7.9, applied: 10000, current: 10790, hasPerformanceData: true },
    { ticker: 'AAD3', type: 'Acao', sector: 'Banco', profit: 640, pct: 6.4, applied: 10000, current: 10640, hasPerformanceData: true },
    { ticker: 'AAE3', type: 'FII', sector: 'Imobiliario', profit: 530, pct: 5.3, applied: 10000, current: 10530, hasPerformanceData: true },
    { ticker: 'AAF3', type: 'ETF', sector: 'Indice', profit: 420, pct: 4.2, applied: 10000, current: 10420, hasPerformanceData: true },
    { ticker: 'BAA3', type: 'Acao', sector: 'Banco', profit: -420, pct: -4.2, applied: 10000, current: 9580, hasPerformanceData: true },
    { ticker: 'BAB3', type: 'FII', sector: 'Imobiliario', profit: -550, pct: -5.5, applied: 10000, current: 9450, hasPerformanceData: true },
    { ticker: 'BAC3', type: 'ETF', sector: 'Indice', profit: -910, pct: -9.1, applied: 10000, current: 9090, hasPerformanceData: true },
    { ticker: 'BAD3', type: 'Acao', sector: 'Banco', profit: -610, pct: -6.1, applied: 10000, current: 9390, hasPerformanceData: true },
    { ticker: 'BAE3', type: 'FII', sector: 'Imobiliario', profit: -460, pct: -4.6, applied: 10000, current: 9540, hasPerformanceData: true },
    { ticker: 'BAF3', type: 'ETF', sector: 'Indice', profit: -310, pct: -3.1, applied: 10000, current: 9690, hasPerformanceData: true },
    { ticker: 'BAC4', type: 'Renda Fixa', sector: 'Credito', profit: -910, pct: -9.1, applied: 10000, current: 9090, hasPerformanceData: true },
    { ticker: 'ZERO1', type: 'Acao', sector: 'Energia', profit: 0, pct: 0, applied: 5000, current: 5000, hasPerformanceData: true },
    { ticker: 'INCM1', type: 'Acao', sector: 'Energia', profit: 700, pct: 7, applied: 10000, current: 10700, hasPerformanceData: false }
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
  assert.match(htmlHigh, /Todos/);
  assert.match(htmlHigh, /Ações/);
  assert.match(htmlHigh, /FIIs/);
  assert.match(htmlHigh, /ETFs/);
  assert.match(htmlHigh, /dash-chip/);
  assert.equal((htmlHigh.match(/dashboard-highlight-row/g) || []).length, 5);
  assert.equal(htmlHigh.includes('Maiores pagadores do mes'), false);

  const navContext = makeContext(rows).context;
  vm.runInNewContext(extractGoSnippet(), navContext);
  navContext.go('desempenho');
  assert.equal(navContext.S.tab, 'ativos');
  assert.equal(navContext.S.assetsInnerTab, 'desempenho');

  context.setDashboardHighlightsTab('low');
  assert.equal(context.S.dashboardHighlightsTab, 'low');
  assert.equal(counters.renders, 1);

  const htmlLow = context.dashboardHomeHighlightsPanel();
  assert.match(htmlLow, /BAC3/);
  assert.equal(htmlLow.includes('Nenhum ativo negativo com dados suficientes.'), false);
  context.setDashboardHighlightsClassFilter('acao');
  const htmlAction = context.dashboardHomeHighlightsPanel();
  assert.equal(htmlAction.includes('Renda Fixa'), false);
  assert.ok((htmlAction.match(/dashboard-highlight-row/g) || []).length <= 5);
  assert.match(htmlAction, /Ações|Todos/);

  context.setDashboardHighlightsTab('high');
  context.setDashboardHighlightsClassFilter('fii');
  const htmlFii = context.dashboardHomeHighlightsPanel();
  assert.match(htmlFii, /AAB3|AAE3/);
  assert.equal(htmlFii.includes('AAC3'), false);

  context.setDashboardHighlightsClassFilter('etf');
  const htmlEtf = context.dashboardHomeHighlightsPanel();
  assert.match(htmlEtf, /AAC3|AAF3/);
  assert.equal(htmlEtf.includes('AAA3'), false);

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
