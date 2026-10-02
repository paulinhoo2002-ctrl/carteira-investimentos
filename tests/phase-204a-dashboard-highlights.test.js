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

// Reconciliação V3 (HYBRID V2 aprovada): a spec determina "MOVE rankings →
// Análise" e "Dashboard sem ranking" (seção 4, matriz de decisão L28). As
// colunas "Maiores altas/baixas" eram ranking na primeira dobra do Dashboard
// e foram intencionalmente removidas. O comportamento protegido continua
// coberto: (1) top performers com dados oficiais e ordenação correta são
// afirmados pelo teste 1 via dashboardHighlightsRows (fonte canônica da aba
// Análise/IA); (2) a síntese priorizada de insights permanece no dashboard
// via dashboardHomeHighlightsPanel com no máximo uma prioridade; (3) a
// navegação atalho para desempenho continua operando em go().
test('destaques da carteira prioriza insights acionáveis e preserva navegação para desempenho', () => {
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

  // Painel V3: um insight priorizado acionável, com severidade e rota válida.
  context.S.__unused = undefined;
  const insight = { id: 'concentration-top-sector', severity: 'ATTENTION', title: 'Concentração em Bancos', description: 'Setor domina a carteira.', relatedRoute: 'ativos', actionLabel: 'Ver detalhes' };
  const htmlInsight = context.dashboardHomeHighlightsPanel({ insights: [insight] });
  assert.match(htmlInsight, /dashboard-highlight-panels/);
  assert.match(htmlInsight, /dashboard-insight-action/);
  assert.match(htmlInsight, /Concentração em Bancos/);
  assert.match(htmlInsight, /Atenção/);
  assert.match(htmlInsight, /go\('ativos'\)/);
  assert.match(htmlInsight, /aria-label="Ver detalhes: Concentração em Bancos"/);

  // Vários insights: síntese com contagem e acesso à visão completa (IA).
  const htmlMany = context.dashboardHomeHighlightsPanel({ insights: [insight, { ...insight, id: 'i2', title: 'Segundo ponto' }, { ...insight, id: 'i3', title: 'Terceiro ponto' }] });
  assert.match(htmlMany, /3 prioridades identificadas/);
  assert.match(htmlMany, /go\('ia'\)/);
  assert.equal((htmlMany.match(/premium-consultive-card-head/g) || []).length, 1, 'síntese única, sem card por insight');

  // Estado vazio: mensagem real, sem card vazio (UNKNOWN != ZERO).
  const htmlEmpty = context.dashboardHomeHighlightsPanel({ insights: [] });
  assert.match(htmlEmpty, /Nenhum ponto prioritário identificado na base atual\./);
  assert.equal(htmlEmpty.includes('dashboard-highlight-row'), false);

  // Ranking não volta à primeira dobra: sem colunas altas/baixas no painel V3.
  const anyPanel = htmlInsight + htmlMany + htmlEmpty;
  assert.equal(anyPanel.includes('Maiores altas'), false);
  assert.equal(anyPanel.includes('Maiores baixas'), false);
  assert.equal(anyPanel.includes('dashboard-highlight-toolbar'), false);

  // Comportamento de alternância preservado com render único.
  context.setDashboardHighlightsTab('low');
  assert.equal(context.S.dashboardHighlightsTab, 'low');
  assert.equal(counters.renders, 1);

  // Atalho de navegação para desempenho continua roteando para Ativos.
  const navContext = makeContext(rows).context;
  vm.runInNewContext(extractGoSnippet(), navContext);
  navContext.go('desempenho');
  assert.equal(navContext.S.tab, 'ativos');
  assert.equal(navContext.S.assetsInnerTab, 'desempenho');

  // A fonte canônica do ranking (usada pela aba Análise/IA) permanece
  // ordenando e filtrando com dados oficiais — protected behavior do teste 1,
  // reafirmado aqui contra o snippet atual.
  const highs = context.dashboardHighlightsRows('high');
  const lows = context.dashboardHighlightsRows('low');
  assert.deepEqual([...highs.slice(0, 3).map((row) => row.ticker)], ['AAA3', 'AAB3', 'AAC3']);
  // Lows ordenados por prejuízo decrescente: BAC3(-910), BAD3(-610), BAB3(-550);
  // BAC4 (Renda Fixa, -910) é excluído pela fonte antes da ordenação.
  assert.deepEqual([...lows.slice(0, 3).map((row) => row.ticker)], ['BAC3', 'BAD3', 'BAB3']);
  assert.equal(highs.some((row) => row.type === 'Renda Fixa'), false);
  assert.equal(lows.some((row) => row.type === 'Renda Fixa'), false);

  // A primeira dobra do dashboard consome a síntese priorizada, não o grid V2.
  const dashBlock = extractSnippet('function dash(){', 'function patrimonySnapshot(');
  assert.match(dashBlock, /dashboardV3PriorityPanel\(data\)/);
  assert.equal(dashBlock.includes('dashboardHomePerformancePanel('), false);
  assert.equal(dashBlock.includes('dashboardHomeMonthlyPayersPanel(data)'), false);
  assert.equal(dashBlock.includes("dashboardHomePerformancePanel('Maiores altas'"), false);
  assert.equal(dashBlock.includes("dashboardHomePerformancePanel('Maiores baixas'"), false);
  assert.equal(dashBlock.includes('Maiores pagadores do mes'), false);
});
