const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const INDEX_HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractBlock(startToken, endToken) {
  const start = INDEX_HTML.indexOf(startToken);
  const end = INDEX_HTML.indexOf(endToken, start);
  assert.notEqual(start, -1, `start token not found: ${startToken}`);
  assert.notEqual(end, -1, `end token not found: ${endToken}`);
  return INDEX_HTML.slice(start, end);
}

function loadDashboardInsightsPanel() {
  const source = extractBlock('function dashboardInsightsPanel(data){', 'function dashboardLatestSourceInfo(){');
  const context = {
    esc: value => String(value).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])),
    console,
  };
  return vm.runInNewContext(`${source}\ndashboardInsightsPanel;`, context);
}

function loadInsightHubHelpers() {
  const source = extractBlock('function insightHubSeverityLabel(severity){', 'function aiModeGenerators(mode){');
  const context = {
    fmt: value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    fmtP: value => `${Number(value || 0).toFixed(1)}%`,
    esc: value => String(value).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])),
    go: route => `go:${route}`,
    console,
  };
  return vm.runInNewContext(`${source}\n({ insightHubSeverityLabel, insightHubRouteLabel, insightHubEvidence, insightHubRouteCta, insightHubItem, insightHubSection });`, context);
}

function normalizeSpaces(value) {
  return String(value).replace(/\u00a0/g, ' ');
}

test('dashboardInsightsPanel mostra no maximo 3 insights e CTA para o hub completo', () => {
  const dashboardInsightsPanel = loadDashboardInsightsPanel();
  const html = dashboardInsightsPanel({
    insights: [
      { title: 'A', description: 'a', severity: 'IMPORTANT' },
      { title: 'B', description: 'b', severity: 'ATTENTION' },
      { title: 'C', description: 'c', severity: 'INFO' },
      { title: 'D', description: 'd', severity: 'INFO' },
    ],
  });
  assert.equal((html.match(/premium-exec-row/g) || []).length, 3);
  assert.match(html, /Ver todos os insights/);
  assert.match(html, /Insights prioritários/);
});

test('dashboardInsightsPanel torna insights com rota em controles acessíveis', () => {
  const dashboardInsightsPanel = loadDashboardInsightsPanel();
  const html = dashboardInsightsPanel({
    insights: [
      { title: 'Meta', description: 'Falta conferir', severity: 'ATTENTION', relatedRoute: 'metas', actionLabel: 'Ver Metas' },
      { title: 'Renda', description: 'Abaixo da média', severity: 'IMPORTANT', relatedRoute: 'dividendos', actionLabel: 'Ver Dividendos' },
    ],
  });
  assert.equal((html.match(/dashboard-insight-action/g) || []).length, 2);
  assert.match(html, /<button class="premium-exec-row dashboard-insight-action"/);
  assert.match(html, /aria-label="Ver Metas: Meta"/);
  assert.match(html, /onclick="go\('dividendos'\)"/);
  assert.match(html, /Atenção/);
  assert.match(html, /Importante/);
});

test('dashboardInsightsPanel não cria CTA para insight sem rota', () => {
  const dashboardInsightsPanel = loadDashboardInsightsPanel();
  const html = dashboardInsightsPanel({
    insights: [
      { title: 'Informativo', description: 'Sem ação', severity: 'INFO', actionLabel: 'Não inventar' },
    ],
  });
  assert.equal((html.match(/dashboard-insight-action/g) || []).length, 0);
  assert.doesNotMatch(html, /dashboard-insight-action[^>]*onclick=/);
  assert.match(html, /Informativo/);
});

test('insights de Renda Fixa usam a rota canônica e permanecem acionáveis', () => {
  assert.equal(INDEX_HTML.includes("relatedRoute:'rendaFixa'"), false);
  assert.equal((INDEX_HTML.match(/relatedRoute:'renda-fixa'/g) || []).length, 5);
  const dashboardInsightsPanel = loadDashboardInsightsPanel();
  for (const [title, actionLabel] of [
    ['Vencimentos vencidos', 'Revisar Renda Fixa'],
    ['Vencimentos próximos', 'Ver vencimentos'],
    ['Renda Fixa sem vencimento', 'Completar cadastro'],
  ]) {
    const html = dashboardInsightsPanel({
      insights: [{ title, description: 'Revisar posição', severity: 'ATTENTION', relatedRoute: 'renda-fixa', actionLabel }],
    });
    assert.match(html, new RegExp(`onclick=\\"go\\('renda-fixa'\\)\\"`));
    assert.match(html, new RegExp(`aria-label=\\"${actionLabel}: ${title}\\"`));
  }
});

test('iaTab mantém o hub focado e limita a leitura principal a poucos cards', () => {
  const indexHtml = INDEX_HTML;
  const start = indexHtml.indexOf('function iaTab(){');
  const end = indexHtml.indexOf('function setAIFocus(mode){', start);
  assert.notEqual(start, -1, 'iaTab precisa existir');
  assert.notEqual(end, -1, 'setAIFocus precisa existir depois de iaTab');
  const source = indexHtml.slice(start, end);
  const context = {
    console,
    fmt: value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    fmtP: value => `${Number(value || 0).toFixed(1)}%`,
    esc: value => String(value).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])),
    dashboardSnapshot: () => ({ insights: [] }),
    assetAnalysisRows: () => [],
    rfIntelligenceSnapshot: () => ({}),
    dataQualitySnapshot: () => ({ summary: { criticalRecords: 0, warningRecords: 0 }, issues: [], score: 100 }),
    passiveIncomeGoalStats: () => ({ hasData: false, target: 0, total12: 0, monthlyAvg: 0, missing: 0, topPayers: [] }),
    financialGoalsSnapshot: () => ({}),
    portfolioInsightsSnapshot: () => ([
      { title: '1', description: 'a', severity: 'IMPORTANT', category: 'x', relatedRoute: 'ia' },
      { title: '2', description: 'b', severity: 'ATTENTION', category: 'x', relatedRoute: 'ia' },
      { title: '3', description: 'c', severity: 'INFO', category: 'x', relatedRoute: 'ia' },
      { title: '4', description: 'd', severity: 'INFO', category: 'x', relatedRoute: 'ia' },
      { title: '5', description: 'e', severity: 'INFO', category: 'x', relatedRoute: 'ia' },
      { title: '6', description: 'f', severity: 'INFO', category: 'x', relatedRoute: 'ia' },
    ]),
    aiNormalizeFocus: value => value,
    aiRenderState: () => '',
    go: route => `go:${route}`,
    insightHubSection: (title, items, emptyText) => `<section data-title="${title}">${(items || []).map(item => `<article class="ai-hub-card">${item.title}</article>`).join('') || `<div class="ai-empty">${emptyText}</div>`}</section>`,
    S: { aiFocus: 'overview', aiStatus: 'idle' },
  };
  const iaTab = vm.runInNewContext(`${source}\niaTab;`, context);
  const html = iaTab();
  assert.equal((html.match(/<article class="ai-hub-card/g) || []).length <= 5, true);
  assert.match(html, /apenas os cinco mais relevantes/);
});

test('insight hub rotas e evidencias são derivadas e explicáveis', () => {
  const { insightHubRouteLabel, insightHubEvidence, insightHubRouteCta } = loadInsightHubHelpers();
  assert.equal(insightHubRouteLabel('ativos'), 'Ver Ativos');
  assert.equal(insightHubRouteLabel('ia'), 'Abrir visão completa');
  assert.equal(normalizeSpaces(insightHubEvidence({ evidence: { current: 80, average: 100 } })), 'Atual R$ 80,00 · Média 12M R$ 100,00');
  assert.equal(normalizeSpaces(insightHubEvidence({ evidence: { target: 1200, missing: 200 } })), 'Meta R$ 1.200,00 · Falta R$ 200,00');
  assert.equal(insightHubRouteCta({ relatedRoute: 'metas', actionLabel: '' }).label, 'Ver Metas');
  assert.equal(insightHubRouteCta({ relatedRoute: '', actionLabel: 'Abrir auditoria' }).route, 'ia');
});

test('insightHubSection preserva estado vazio e categorias sem duplicação de engine', () => {
  const { insightHubSection } = loadInsightHubHelpers();
  const html = insightHubSection('Prioridades', [], 'Sem base suficiente para gerar insights confiáveis.');
  assert.match(html, /Prioridades/);
  assert.match(html, /Sem base suficiente para gerar insights confiáveis\./);
  assert.equal((html.match(/ai-hub-card/g) || []).length, 0);
});
