const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createServer } = require('vite');

const reportsAdapterPath = require('node:path').join(__dirname, '..', 'modern', 'src', 'features', 'reports', 'reportsSnapshotAdapter.mjs');
const incomeAdapterPath = require('node:path').join(__dirname, '..', 'modern', 'src', 'features', 'income', 'incomeSnapshotAdapter.mjs');
const viewModelPath = require('node:path').join(__dirname, '..', 'modern', 'src', 'features', 'reports', 'readonlyReportsViewModel.ts');

let OverviewPage;
let createReadOnlyReportsAdapter;
let createIncomeReadonlyAdapter;
let { createReadonlyAssetsSummary, createCategoryDistribution, formatReadonlyCurrency, formatReadonlyPercent } = {};

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

async function loadModules() {
  const overviewModule = await (await getViteServer()).ssrLoadModule('/src/features/overview/OverviewPage.tsx');
  OverviewPage = overviewModule.OverviewPage;
  const reportsAdapterMod = await import(pathToFileURL(reportsAdapterPath).href);
  createReadOnlyReportsAdapter = reportsAdapterMod.createReadOnlyReportsAdapter;
  const incomeAdapterMod = await import(pathToFileURL(incomeAdapterPath).href);
  createIncomeReadonlyAdapter = incomeAdapterMod.createIncomeReadonlyAdapter;
  const vmMod = await import(pathToFileURL(viewModelPath).href);
  ({ createReadonlyAssetsSummary, createCategoryDistribution, formatReadonlyCurrency, formatReadonlyPercent } = vmMod);
}

function makeReportsSnapshot(overrides = {}) {
  return {
    version: 1,
    generatedAt: '2026-07-15T12:00:00.000Z',
    notice: 'test',
    summary: { totalValue: 1000, itemCount: 2, averageVariationPct: 5 },
    items: [
      { ticker: 'PETR4', name: 'Petrobras', category: 'Acao demo', quantity: 10, averagePrice: 20, currentValue: 250, variationPct: 25, allocationPct: 50, trend: 'positive' },
      { ticker: 'MXRF11', name: 'Maxi Renda', category: 'FII demo', quantity: 5, averagePrice: 100, currentValue: 450, variationPct: -10, allocationPct: 50, trend: 'negative' },
    ],
    ...overrides,
  };
}

function makeIncomeSnapshot(overrides = {}) {
  return {
    version: 1,
    generatedAt: '2026-07-15T12:00:00.000Z',
    notice: 'test',
    summary: { totalReceived: 500, monthTotal: 200, yearTotal: 500, averageMonthly: 100, paymentCount: 2 },
    items: [
      { id: '1', ticker: 'PETR4', name: 'Petrobras', type: 'Dividendo', paymentDate: '2026-08-01', competenceDate: null, receivedValue: 200, taxValue: null, quantity: null, note: '', source: 'demo', sourceEventKind: null, sourceEventId: null },
      { id: '2', ticker: 'BBAS3', name: 'Banco do Brasil', type: 'JCP', paymentDate: '2026-09-01', competenceDate: null, receivedValue: 300, taxValue: null, quantity: null, note: '', source: 'demo', sourceEventKind: null, sourceEventId: null },
    ],
    ...overrides,
  };
}

test('OverviewPage usa totalValue real no card Patrimônio', async () => {
  await loadModules();
  const reportsAdapter = createReadOnlyReportsAdapter({ getSnapshot: () => makeReportsSnapshot() });
  const incomeAdapter = createIncomeReadonlyAdapter({ getSnapshot: () => makeIncomeSnapshot() });
  const element = React.createElement(OverviewPage, { reportsAdapter, incomeAdapter });
  const html = renderToStaticMarkup(element);
  assert.ok(html.includes('Patrimônio total'));
  assert.match(html, /R\$\s*700,00/);
});

test('OverviewPage usa monthTotal real no card Dividendos do mês', async () => {
  await loadModules();
  const reportsAdapter = createReadOnlyReportsAdapter({ getSnapshot: () => makeReportsSnapshot() });
  const incomeAdapter = createIncomeReadonlyAdapter({ getSnapshot: () => makeIncomeSnapshot() });
  const element = React.createElement(OverviewPage, { reportsAdapter, incomeAdapter });
  const html = renderToStaticMarkup(element);
  assert.ok(html.includes('Dividendos no mês'));
  assert.match(html, /R\$\s*200,00/);
});

test('OverviewPage sem série histórica exibe EmptyState', async () => {
  await loadModules();
  const reportsAdapter = createReadOnlyReportsAdapter({ getSnapshot: () => makeReportsSnapshot() });
  const incomeAdapter = createIncomeReadonlyAdapter({ getSnapshot: () => makeIncomeSnapshot() });
  const element = React.createElement(OverviewPage, { reportsAdapter, incomeAdapter });
  const html = renderToStaticMarkup(element);
  assert.ok(html.includes('Histórico de patrimônio ainda não disponível'));
});

test('OverviewPage não contém pontos interpolados', async () => {
  await loadModules();
  const reportsAdapter = createReadOnlyReportsAdapter({ getSnapshot: () => makeReportsSnapshot() });
  const incomeAdapter = createIncomeReadonlyAdapter({ getSnapshot: () => makeIncomeSnapshot() });
  const element = React.createElement(OverviewPage, { reportsAdapter, incomeAdapter });
  const html = renderToStaticMarkup(element);
  // No Sparkline component rendered
  assert.ok(!html.includes('overview-sparkline'));
});

test('OverviewPage snapshot vazio mostra — nos cards', async () => {
  await loadModules();
  const emptyReports = makeReportsSnapshot({ items: [], summary: { totalValue: 0, itemCount: 0, averageVariationPct: 0 } });
  const emptyIncome = makeIncomeSnapshot({ items: [], summary: { totalReceived: 0, monthTotal: 0, yearTotal: 0, averageMonthly: 0, paymentCount: 0 } });
  const reportsAdapter = createReadOnlyReportsAdapter({ getSnapshot: () => emptyReports });
  const incomeAdapter = createIncomeReadonlyAdapter({ getSnapshot: () => emptyIncome });
  const element = React.createElement(OverviewPage, { reportsAdapter, incomeAdapter });
  const html = renderToStaticMarkup(element);
  assert.ok(html.includes('—'));
});

test('próximos dividendos usam generatedAt como referência', async () => {
  await loadModules();
  const futureIncome = makeIncomeSnapshot({
    generatedAt: '2026-07-15T12:00:00.000Z',
    items: [
      { id: '1', ticker: 'TAEE11', name: 'Taesa', type: 'Dividendo', paymentDate: '2026-07-14', competenceDate: null, receivedValue: 100, taxValue: null, quantity: null, note: '', source: 'demo', sourceEventKind: null, sourceEventId: null },
      { id: '2', ticker: 'BBAS3', name: 'Banco do Brasil', type: 'JCP', paymentDate: '2026-07-16', competenceDate: null, receivedValue: 200, taxValue: null, quantity: null, note: '', source: 'demo', sourceEventKind: null, sourceEventId: null },
    ]
  });
  const reportsAdapter = createReadOnlyReportsAdapter({ getSnapshot: () => makeReportsSnapshot() });
  const incomeAdapter = createIncomeReadonlyAdapter({ getSnapshot: () => futureIncome });
  const element = React.createElement(OverviewPage, { reportsAdapter, incomeAdapter });
  const html = renderToStaticMarkup(element);
  // Only future (>= generatedAt) should appear -> only BBAS3 (16th)
  assert.ok(html.includes('BBAS3'));
  assert.ok(!html.includes('TAEE11'));
});

test('item com paymentDate anterior a generatedAt não aparece como próximo', async () => {
  await loadModules();
  const pastIncome = makeIncomeSnapshot({
    generatedAt: '2026-07-15T12:00:00.000Z',
    summary: { totalReceived: 500, monthTotal: 200, yearTotal: 500, averageMonthly: 100, paymentCount: 1 },
    items: [
      { id: '1', ticker: 'TAEE11', name: 'Taesa', type: 'Dividendo', paymentDate: '2026-07-14', competenceDate: null, receivedValue: 100, taxValue: null, quantity: null, note: '', source: 'demo', sourceEventKind: null, sourceEventId: null },
    ]
  });
  const reportsAdapter = createReadOnlyReportsAdapter({ getSnapshot: () => makeReportsSnapshot() });
  const incomeAdapter = createIncomeReadonlyAdapter({ getSnapshot: () => pastIncome });
  const element = React.createElement(OverviewPage, { reportsAdapter, incomeAdapter });
  const html = renderToStaticMarkup(element);
  assert.ok(!html.includes('TAEE11'));
});

test('item com paymentDate posterior ou igual à regra aparece', async () => {
  await loadModules();
  const equalIncome = makeIncomeSnapshot({
    generatedAt: '2026-07-15T12:00:00.000Z',
    items: [
      { id: '1', ticker: 'PETR4', name: 'Petrobras', type: 'Dividendo', paymentDate: '2026-07-15', competenceDate: null, receivedValue: 100, taxValue: null, quantity: null, note: '', source: 'demo', sourceEventKind: null, sourceEventId: null },
    ]
  });
  const reportsAdapter = createReadOnlyReportsAdapter({ getSnapshot: () => makeReportsSnapshot() });
  const incomeAdapter = createIncomeReadonlyAdapter({ getSnapshot: () => equalIncome });
  const element = React.createElement(OverviewPage, { reportsAdapter, incomeAdapter });
  const html = renderToStaticMarkup(element);
  assert.ok(html.includes('PETR4'));
});

test('generatedAt inválido não provoca crash', async () => {
  await loadModules();
  const badIncome = makeIncomeSnapshot({ generatedAt: 'invalid-date' });
  const reportsAdapter = createReadOnlyReportsAdapter({ getSnapshot: () => makeReportsSnapshot() });
  const incomeAdapter = createIncomeReadonlyAdapter({ getSnapshot: () => badIncome });
  const element = React.createElement(OverviewPage, { reportsAdapter, incomeAdapter });
  // Should not throw
  const html = renderToStaticMarkup(element);
  assert.ok(typeof html === 'string');
});

test('adapters e snapshots não são mutados', async () => {
  await loadModules();
  const snap = makeReportsSnapshot();
  const origItems = JSON.stringify(snap.items);
  const reportsAdapter = createReadOnlyReportsAdapter({ getSnapshot: () => snap });
  const incomeAdapter = createIncomeReadonlyAdapter({ getSnapshot: () => makeIncomeSnapshot() });
  const element = React.createElement(OverviewPage, { reportsAdapter, incomeAdapter });
  renderToStaticMarkup(element);
  assert.strictEqual(JSON.stringify(snap.items), origItems);
});