const assert = require('node:assert/strict');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createServer } = require('vite');

let DashboardMetricCard, DashboardSection, EmptyState, AssetClassBadge, ChartContainer, ResponsiveDataList;

let viteServerPromise;
function getViteServer() {
  if (!viteServerPromise) {
    viteServerPromise = createServer({
      configFile: require('node:path').join(__dirname, '..', 'modern', 'vite.config.ts'),
      logLevel: 'error',
      server: { middlewareMode: true },
    });
  }
  return viteServerPromise;
}

test.after(async () => {
  if (viteServerPromise) {
    const server = await viteServerPromise;
    await server.close();
  }
});

async function loadShared() {
  const viteServer = await getViteServer();
  const modMetric = await viteServer.ssrLoadModule('/src/features/shared/components/DashboardMetricCard/DashboardMetricCard.tsx');
  DashboardMetricCard = modMetric.DashboardMetricCard;
  const modSection = await viteServer.ssrLoadModule('/src/features/shared/components/DashboardSection/DashboardSection.tsx');
  DashboardSection = modSection.DashboardSection;
  const modEmpty = await viteServer.ssrLoadModule('/src/features/shared/components/EmptyState/EmptyState.tsx');
  EmptyState = modEmpty.EmptyState;
  const modBadge = await viteServer.ssrLoadModule('/src/features/shared/components/AssetClassBadge/AssetClassBadge.tsx');
  AssetClassBadge = modBadge.AssetClassBadge;
  const modChart = await viteServer.ssrLoadModule('/src/features/shared/components/ChartContainer/ChartContainer.tsx');
  ChartContainer = modChart.ChartContainer;
  const modResp = await viteServer.ssrLoadModule('/src/features/shared/components/ResponsiveDataList/ResponsiveDataList.tsx');
  ResponsiveDataList = modResp.ResponsiveDataList;
}

test('DashboardMetricCard renderiza label, value, trend e variant', async () => {
  await loadShared();
  const el = React.createElement(DashboardMetricCard, { label: 'Teste', value: '100', trend: { value: 5, label: 'mês' }, variant: 'success', size: 'large' });
  const html = renderToStaticMarkup(el);
  assert.ok(html.includes('Teste'));
  assert.ok(html.includes('100'));
  assert.ok(html.includes('5'));
  assert.ok(html.includes('mês'));
  assert.ok(html.includes('dashboard-metric-card--success'));
  assert.ok(html.includes('dashboard-metric-card--large'));
});

test('DashboardMetricCard sem trend renderiza sem elemento de tendência', async () => {
  await loadShared();
  const el = React.createElement(DashboardMetricCard, { label: 'Teste', value: '100' });
  const html = renderToStaticMarkup(el);
  assert.ok(!html.includes('dashboard-metric-card__trend'));
});

test('DashboardSection renderiza título, subtítulo e action', async () => {
  await loadShared();
  const action = React.createElement('button', {}, 'Ação');
  const el = React.createElement(DashboardSection, { title: 'Titulo', subtitle: 'Sub', action });
  const html = renderToStaticMarkup(el);
  assert.ok(html.includes('Titulo'));
  assert.ok(html.includes('Sub'));
  assert.ok(html.includes('Ação'));
});

test('EmptyState renderiza título, corpo e action', async () => {
  await loadShared();
  const action = React.createElement('button', {}, 'Retry');
  const el = React.createElement(EmptyState, { title: 'Vazio', body: 'Nada aqui', action, size: 'compact' });
  const html = renderToStaticMarkup(el);
  assert.ok(html.includes('Vazio'));
  assert.ok(html.includes('Nada aqui'));
  assert.ok(html.includes('Retry'));
  assert.ok(html.includes('empty-state--compact'));
});

test('AssetClassBadge categoria conhecida aplica cores', async () => {
  await loadShared();
  const el = React.createElement(AssetClassBadge, { category: 'Acao demo' });
  const html = renderToStaticMarkup(el);
  assert.ok(html.includes('Acao demo'));
  assert.ok(html.includes('asset-class-badge'));
});

test('AssetClassBadge categoria desconhecida usa fallback', async () => {
  await loadShared();
  const el = React.createElement(AssetClassBadge, { category: 'Desconhecida' });
  const html = renderToStaticMarkup(el);
  assert.ok(html.includes('Desconhecida'));
});

test('ChartContainer com children renderiza wrapper', async () => {
  await loadShared();
  const child = React.createElement('div', {}, 'chart');
  const el = React.createElement(ChartContainer, { title: 'Gráfico', summary: 'resumo' }, child);
  const html = renderToStaticMarkup(el);
  assert.ok(html.includes('Gráfico'));
  assert.ok(html.includes('resumo'));
  assert.ok(html.includes('chart'));
});

test('ChartContainer estado vazio exibe noData', async () => {
  await loadShared();
  const noData = React.createElement('p', {}, 'Sem dados');
  const el = React.createElement(ChartContainer, { noData });
  const html = renderToStaticMarkup(el);
  assert.ok(html.includes('Sem dados'));
});

test('ResponsiveDataList desktop e mobile estrutural', async () => {
  await loadShared();
  const items = ['a', 'b'];
  const renderItem = (it) => React.createElement('div', {}, `D-${it}`);
  const renderMobile = (it) => React.createElement('span', {}, `M-${it}`);
  const el = React.createElement(ResponsiveDataList, { items, renderItem, renderMobileItem: renderMobile, desktopColumns: 2 });
  const html = renderToStaticMarkup(el);
  assert.ok(html.includes('responsive-data-list__desktop'));
  assert.ok(html.includes('responsive-data-list__mobile'));
  assert.ok(html.includes('D-a'));
  assert.ok(html.includes('M-a'));
});

test('ResponsiveDataList vazio exibe emptyState', async () => {
  await loadShared();
  const empty = React.createElement('p', {}, 'vazio');
  const el = React.createElement(ResponsiveDataList, { items: [], renderItem: () => null, emptyState: empty });
  const html = renderToStaticMarkup(el);
  assert.ok(html.includes('vazio'));
});