const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createServer } = require('vite');

let GoalsReadonlyPage;
let createReadonlyGoalsViewModel;
let createHostGoalsReadonlySource;
let createGoalsRefreshController;
let createConnectedGoalsAdapter;
let createGoalsReadonlyAdapter;
let createGoalsReadonlyBridge;

let viteServerPromise;
function getViteServer() {
  if (!viteServerPromise) {
    viteServerPromise = createServer({
      configFile: path.join(__dirname, '..', 'modern', 'vite.config.ts'),
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
  const goalsModule = await (await getViteServer()).ssrLoadModule('/src/features/goals/GoalsReadonlyPage.tsx');
  GoalsReadonlyPage = goalsModule.GoalsReadonlyPage;

  const viewModelModule = await (await getViteServer()).ssrLoadModule('/src/features/goals/readonlyGoalsViewModel.ts');
  createReadonlyGoalsViewModel = viewModelModule.createReadonlyGoalsViewModel;

  const sourceModule = await (await getViteServer()).ssrLoadModule('/src/bootstrap/hostGoalsReadonlySource.ts');
  createHostGoalsReadonlySource = sourceModule.createHostGoalsReadonlySource;

  const controllerModule = await (await getViteServer()).ssrLoadModule('/src/features/goals/goalsRefreshController.ts');
  createGoalsRefreshController = controllerModule.createGoalsRefreshController;

  const adapterModule = await (await getViteServer()).ssrLoadModule('/src/features/goals/goalsSnapshotAdapter.mjs');
  createGoalsReadonlyAdapter = adapterModule.createGoalsReadonlyAdapter;

  const bridgeModule = await (await getViteServer()).ssrLoadModule('/src/features/goals/goalsReadonlyBridge.mjs');
  createGoalsReadonlyBridge = bridgeModule.createGoalsReadonlyBridge;

  const legacyModule = await (await getViteServer()).ssrLoadModule('/src/features/goals/legacyGoalsReadonlyIntegration.ts');
  createConnectedGoalsAdapter = legacyModule.createConnectedGoalsAdapter;
}

const createValidSnapshot = () => ({
  version: 1,
  originMode: 'real-wallet',
  originLabel: 'Carteira ativa (legado)',
  generatedAt: '2026-01-01T00:00:00.000Z',
  notice: 'Snapshot readonly de metas. React nao escreve na fonte.',
  flags: {
    hasPatrimonyGoal: true,
    hasIncomeGoal: true,
    hasAssetGoal: true,
    hasAllocationGoal: true,
    hasPortfolioData: true,
  },
  patrimony: {
    hasCurrent: true,
    hasTarget: true,
    current: 800000,
    target: 1000000,
    percent: 80,
    barPercent: 80,
    missing: 200000,
    excess: null,
    reached: false,
    tone: 'info',
    monthlyContribution: 3000,
    annualVariation: 12,
  },
  income: {
    hasCurrent: true,
    hasTarget: true,
    current: 3000,
    target: 4000,
    percent: 75,
    barPercent: 75,
    missing: 1000,
    excess: null,
    reached: false,
    tone: 'warn',
    currentMonthKey: '2026-01',
    currentMonthLabel: 'Janeiro 2026',
    currentMonthCount: 8,
    monthlyAverage: 3000,
    total12: 36000,
    hasData: true,
  },
  assetGoal: {
    type: 'Acao',
    ticker: 'PETR4',
    monthlyContribution: 1000,
    annualVariation: 12,
    finalValue: 200000,
  },
  allocation: {
    items: [
      { type: 'FII', pct: 40 },
      { type: 'Acao', pct: 30 },
      { type: 'ETF', pct: 20 },
      { type: 'Renda Fixa', pct: 10 },
    ],
  },
  allowedTypes: ['Acao', 'FII', 'ETF', 'BDR', 'Stock'],
  history: {
    groups: [
      {
        key: '2026-01',
        label: 'Janeiro 2026',
        total: 3000,
        count: 8,
        diff: 500,
        diffPct: 20,
        isCurrent: true,
      },
      {
        key: '2025-12',
        label: 'Dezembro 2025',
        total: 2500,
        count: 6,
        diff: null,
        diffPct: null,
        isCurrent: false,
      },
    ],
    summary: { total: 5500, monthCount: 2, avg: 2750 },
  },
});

test('GoalsReadonlyPage renderiza snapshot valido', async () => {
  await loadModules();
  const snapshot = createValidSnapshot();
  const source = createHostGoalsReadonlySource({
    getGoalsSnapshot: () => snapshot,
  });
  const adapter = createGoalsReadonlyAdapter(source);
  const html = renderToStaticMarkup(
    React.createElement(GoalsReadonlyPage, { adapter })
  );
  assert.ok(html.includes('Metas financeiras'));
  assert.ok(html.includes('Snapshot'));
});

test('GoalsReadonlyPage renderiza meta patrimonial', async () => {
  await loadModules();
  const snapshot = createValidSnapshot();
  const source = createHostGoalsReadonlySource({
    getGoalsSnapshot: () => snapshot,
  });
  const adapter = createGoalsReadonlyAdapter(source);
  const html = renderToStaticMarkup(
    React.createElement(GoalsReadonlyPage, { adapter })
  );
  assert.ok(html.includes('Meta patrimonial'));
  assert.ok(html.includes('Patrimonio atual'));
  assert.ok(html.includes('Meta'));
});

test('GoalsReadonlyPage renderiza meta de renda passiva', async () => {
  await loadModules();
  const snapshot = createValidSnapshot();
  const source = createHostGoalsReadonlySource({
    getGoalsSnapshot: () => snapshot,
  });
  const adapter = createGoalsReadonlyAdapter(source);
  const html = renderToStaticMarkup(
    React.createElement(GoalsReadonlyPage, { adapter })
  );
  assert.ok(html.includes('Meta de renda passiva'));
});

test('GoalsReadonlyPage renderiza ativo-alvo', async () => {
  await loadModules();
  const snapshot = createValidSnapshot();
  const source = createHostGoalsReadonlySource({
    getGoalsSnapshot: () => snapshot,
  });
  const adapter = createGoalsReadonlyAdapter(source);
  const html = renderToStaticMarkup(
    React.createElement(GoalsReadonlyPage, { adapter })
  );
  assert.ok(html.includes('Configuracao do ativo-alvo'));
  assert.ok(html.includes('PETR4'));
});

test('GoalsReadonlyPage renderiza allocation', async () => {
  await loadModules();
  const snapshot = createValidSnapshot();
  const source = createHostGoalsReadonlySource({
    getGoalsSnapshot: () => snapshot,
  });
  const adapter = createGoalsReadonlyAdapter(source);
  const html = renderToStaticMarkup(
    React.createElement(GoalsReadonlyPage, { adapter })
  );
  assert.ok(html.includes('Distribuicao alvo da carteira'));
  assert.ok(html.includes('FII'));
});

test('GoalsReadonlyPage renderiza historico', async () => {
  await loadModules();
  const snapshot = createValidSnapshot();
  const source = createHostGoalsReadonlySource({
    getGoalsSnapshot: () => snapshot,
  });
  const adapter = createGoalsReadonlyAdapter(source);
  const html = renderToStaticMarkup(
    React.createElement(GoalsReadonlyPage, { adapter })
  );
  assert.ok(html.includes('Historico mensal de renda passiva'));
  assert.ok(html.includes('Janeiro 2026'));
});

test('GoalsReadonlyPage nao tem input', async () => {
  await loadModules();
  const snapshot = createValidSnapshot();
  const source = createHostGoalsReadonlySource({
    getGoalsSnapshot: () => snapshot,
  });
  const adapter = createGoalsReadonlyAdapter(source);
  const html = renderToStaticMarkup(
    React.createElement(GoalsReadonlyPage, { adapter })
  );
  assert.ok(!html.includes('<input'));
  assert.ok(!html.includes('type="text"'));
});

test('GoalsReadonlyPage nao tem form', async () => {
  await loadModules();
  const snapshot = createValidSnapshot();
  const source = createHostGoalsReadonlySource({
    getGoalsSnapshot: () => snapshot,
  });
  const adapter = createGoalsReadonlyAdapter(source);
  const html = renderToStaticMarkup(
    React.createElement(GoalsReadonlyPage, { adapter })
  );
  assert.ok(!html.includes('<form'));
});

test('GoalsReadonlyPage nao tem button de escrita', async () => {
  await loadModules();
  const snapshot = createValidSnapshot();
  const source = createHostGoalsReadonlySource({
    getGoalsSnapshot: () => snapshot,
  });
  const adapter = createGoalsReadonlyAdapter(source);
  const html = renderToStaticMarkup(
    React.createElement(GoalsReadonlyPage, { adapter })
  );
  assert.ok(!html.includes('Salvar'));
  assert.ok(!html.includes('Editar'));
  assert.ok(!html.includes('Adicionar'));
  assert.ok(!html.includes('Remover'));
});

test('GoalsReadonlyPage empty state sem metas', async () => {
  await loadModules();
  const snapshot = {
    version: 1,
    originMode: 'empty-wallet',
    originLabel: 'Carteira vazia',
    generatedAt: '2026-01-01T00:00:00.000Z',
    notice: 'Nenhuma carteira ativa',
    flags: {
      hasPatrimonyGoal: false,
      hasIncomeGoal: false,
      hasAssetGoal: false,
      hasAllocationGoal: false,
      hasPortfolioData: false,
    },
    patrimony: {
      hasCurrent: false,
      hasTarget: false,
      current: null,
      target: null,
      percent: null,
      barPercent: 0,
      missing: null,
      excess: null,
      reached: false,
      tone: 'muted',
      monthlyContribution: 0,
      annualVariation: 0,
    },
    income: {
      hasCurrent: false,
      hasTarget: false,
      current: null,
      target: null,
      percent: null,
      barPercent: 0,
      missing: null,
      excess: null,
      reached: false,
      tone: 'muted',
      currentMonthKey: '1970-01',
      currentMonthLabel: 'Janeiro 1970',
      currentMonthCount: 0,
      monthlyAverage: 0,
      total12: 0,
      hasData: false,
    },
    assetGoal: { type: '', ticker: '', monthlyContribution: 0, annualVariation: 0, finalValue: 0 },
    allocation: { items: [] },
    allowedTypes: [],
    history: { groups: [], summary: { total: 0, monthCount: 0, avg: null } },
  };
  const source = createHostGoalsReadonlySource({
    getGoalsSnapshot: () => snapshot,
  });
  const adapter = createGoalsReadonlyAdapter(source);
  const html = renderToStaticMarkup(
    React.createElement(GoalsReadonlyPage, { adapter })
  );
  assert.ok(html.includes('Nenhuma meta configurada'));
});

test('GoalsReadonlyPage com refresh controller', async () => {
  await loadModules();
  const snapshot = createValidSnapshot();
  const source = createHostGoalsReadonlySource({
    getGoalsSnapshot: () => snapshot,
  });
  const controller = createGoalsRefreshController({ source });
  const adapter = createConnectedGoalsAdapter(source);
  const html = renderToStaticMarkup(
    React.createElement(GoalsReadonlyPage, { adapter, refreshController: controller })
  );
  assert.ok(html.includes('Atualizar metas'));
});

test('GoalsReadonlyPage ARIA correto', async () => {
  await loadModules();
  const snapshot = createValidSnapshot();
  const source = createHostGoalsReadonlySource({
    getGoalsSnapshot: () => snapshot,
  });
  const adapter = createGoalsReadonlyAdapter(source);
  const html = renderToStaticMarkup(
    React.createElement(GoalsReadonlyPage, { adapter })
  );
  assert.ok(html.includes('role="progressbar"'));
  assert.ok(html.includes('aria-valuemin="0"'));
  assert.ok(html.includes('aria-valuemax="100"'));
  assert.ok(html.includes('aria-label'));
});
