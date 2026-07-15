const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createServer } = require('vite');

const viewModelModulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'features',
  'reports',
  'readonlyReportsViewModel.ts',
);
const pageModulePath = path.join(__dirname, '..', 'modern', 'src', 'features', 'reports', 'AssetsReadonlyPage.tsx');
const controllerModulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'features',
  'reports',
  'reportsRefreshController.ts',
);

async function loadViewModelModule() {
  return import(pathToFileURL(viewModelModulePath).href);
}

async function loadControllerModule() {
  return import(pathToFileURL(controllerModulePath).href);
}

function createSnapshot(overrides = {}) {
  return {
    version: 1,
    generatedAt: '2026-07-14T10:30:00.000Z',
    notice: 'Snapshot legado somente leitura. React nao escreve na fonte.',
    summary: {
      totalValue: 900,
      itemCount: 3,
      averageVariationPct: 0.14,
    },
    items: [
      {
        ticker: 'PETR4',
        name: 'Petrobras',
        category: 'Acao demo',
        quantity: 10,
        averagePrice: 20,
        currentValue: 250,
        variationPct: 25,
        allocationPct: 27.78,
        trend: 'positive',
      },
      {
        ticker: 'MXRF11',
        name: 'Maxi Renda',
        category: 'FII demo',
        quantity: 5,
        averagePrice: 100,
        currentValue: 450,
        variationPct: -10,
        allocationPct: 50,
        trend: 'negative',
      },
      {
        ticker: 'BOVA11',
        name: 'BOVA',
        category: 'ETF demo',
        quantity: 2,
        averagePrice: 100,
        currentValue: 200,
        variationPct: 0,
        allocationPct: 22.22,
        trend: 'neutral',
      },
    ],
    ...overrides,
  };
}

test('view model readonly de ativos deriva lista, filtros e destaques do snapshot', async () => {
  const { createReadonlyAssetsViewModel } = await loadViewModelModule();
  const snapshot = createSnapshot();

  const viewModel = createReadonlyAssetsViewModel(snapshot, {
    query: 'renda',
    category: 'FII demo',
    sortBy: 'currentValue',
  });

  assert.equal(viewModel.itemCount, 3);
  assert.equal(viewModel.totalValue, 900);
  assert.equal(viewModel.averageVariationPct, 0.14);
  assert.deepEqual(viewModel.categories, ['Acao demo', 'ETF demo', 'FII demo']);
  assert.equal(viewModel.filteredItems.length, 1);
  assert.equal(viewModel.filteredItems[0].ticker, 'MXRF11');
  assert.equal(viewModel.topGainers[0].ticker, 'PETR4');
  assert.equal(viewModel.topLosers[0].ticker, 'MXRF11');
  assert.equal(viewModel.topPositions[0].ticker, 'MXRF11');
  assert.deepEqual(
    viewModel.distribution.map((entry) => [entry.category, entry.itemCount]),
    [
      ['FII demo', 1],
      ['Acao demo', 1],
      ['ETF demo', 1],
    ],
  );
});

test('pagina readonly de ativos renderiza snapshot e aceita refresh controller', async () => {
  const viteServer = await createServer({
    configFile: path.join(__dirname, '..', 'modern', 'vite.config.ts'),
    logLevel: 'error',
    server: { middlewareMode: true },
  });

  try {
    const { AssetsReadonlyPage } = await viteServer.ssrLoadModule('/src/features/reports/AssetsReadonlyPage.tsx');
    const { createReportsRefreshController } = await loadControllerModule();

    const staticHtml = renderToStaticMarkup(
      React.createElement(AssetsReadonlyPage, {
        adapter: {
          getSnapshot() {
            return createSnapshot({
              generatedAt: '2026-07-14T11:00:00.000Z',
              notice: 'Snapshot customizado do adapter. React nao cria fonte propria.',
            });
          },
        },
      }),
    );

    assert.match(staticHtml, /Ativos/);
    assert.match(staticHtml, /Somente leitura\. Nada aqui escreve ou altera a carteira\./);
    assert.match(staticHtml, /Snapshot customizado do adapter/);
    assert.match(staticHtml, /Voltar ao legado/);
    assert.equal(staticHtml.includes('Atualizar prévia'), false);
    assert.equal(staticHtml.includes('assets-readonly__legacy-link'), true);

    let revision = 0;
    const snapshots = [
      createSnapshot({ generatedAt: '2026-07-14T10:30:00.000Z' }),
      createSnapshot({
        generatedAt: '2026-07-14T10:31:00.000Z',
        summary: { totalValue: 910, itemCount: 3, averageVariationPct: 0.22 },
        items: [
          {
            ticker: 'PETR4',
            name: 'Petrobras',
            category: 'Acao demo',
            quantity: 10,
            averagePrice: 20,
            currentValue: 260,
            variationPct: 30,
            allocationPct: 28.57,
            trend: 'positive',
          },
          {
            ticker: 'MXRF11',
            name: 'Maxi Renda',
            category: 'FII demo',
            quantity: 5,
            averagePrice: 100,
            currentValue: 450,
            variationPct: -10,
            allocationPct: 49.45,
            trend: 'negative',
          },
          {
            ticker: 'BOVA11',
            name: 'BOVA',
            category: 'ETF demo',
            quantity: 2,
            averagePrice: 100,
            currentValue: 200,
            variationPct: 0,
            allocationPct: 22,
            trend: 'neutral',
          },
        ],
      }),
    ];

    const controller = createReportsRefreshController({
      source: {
        getSnapshot() {
          return snapshots[Math.min(revision, snapshots.length - 1)];
        },
      },
      onRefresh() {
        revision += 1;
      },
    });

    const before = renderToStaticMarkup(
      React.createElement(AssetsReadonlyPage, {
        adapter: {
          getSnapshot() {
            return snapshots[0];
          },
        },
        refreshController: controller,
      }),
    );

    assert.match(before, /Atualizar prévia/);
    assert.match(before, /Leitura pronta|Leitura atualizada/);
    assert.match(before, /2026-07-14T10:30:00.000Z/);

    controller.refresh();

    const after = renderToStaticMarkup(
      React.createElement(AssetsReadonlyPage, {
        adapter: {
          getSnapshot() {
            return snapshots[1];
          },
        },
        refreshController: controller,
      }),
    );

    assert.match(after, /2026-07-14T10:31:00.000Z/);
    assert.match(after, /R\$\s*910,00/);
    assert.match(after, /PETR4/);
    assert.match(after, /MXRF11/);
  } finally {
    await viteServer.close();
  }
});
