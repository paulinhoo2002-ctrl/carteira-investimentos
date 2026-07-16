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

function createSnapshotFromItems(items, overrides = {}) {
  const totalValue = items.reduce((sum, item) => sum + item.currentValue, 0);

  return createSnapshot({
    summary: {
      totalValue,
      itemCount: items.length,
      averageVariationPct:
        items.length > 0 ? items.reduce((sum, item) => sum + item.variationPct, 0) / items.length : 0,
    },
    items,
    ...overrides,
  });
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

test('view model readonly de ativos separa altas e quedas por sinal', async () => {
  const { createReadonlyAssetsViewModel } = await loadViewModelModule();

  const onlyPositive = createSnapshotFromItems([
    {
      ticker: 'AAA1',
      name: 'Alta 1',
      category: 'Acao demo',
      quantity: 1,
      averagePrice: 10,
      currentValue: 110,
      variationPct: 10,
      allocationPct: 40,
      trend: 'positive',
    },
    {
      ticker: 'BBB1',
      name: 'Alta 2',
      category: 'ETF demo',
      quantity: 1,
      averagePrice: 10,
      currentValue: 120,
      variationPct: 20,
      allocationPct: 30,
      trend: 'positive',
    },
  ]);

  const onlyNegative = createSnapshotFromItems([
    {
      ticker: 'CCC1',
      name: 'Queda 1',
      category: 'FII demo',
      quantity: 1,
      averagePrice: 10,
      currentValue: 90,
      variationPct: -10,
      allocationPct: 60,
      trend: 'negative',
    },
    {
      ticker: 'DDD1',
      name: 'Queda 2',
      category: 'Acao demo',
      quantity: 1,
      averagePrice: 10,
      currentValue: 80,
      variationPct: -20,
      allocationPct: 40,
      trend: 'negative',
    },
  ]);

  const onlyNeutral = createSnapshotFromItems([
    {
      ticker: 'EEE1',
      name: 'Neutra 1',
      category: 'Acao demo',
      quantity: 1,
      averagePrice: 10,
      currentValue: 100,
      variationPct: 0,
      allocationPct: 100,
      trend: 'neutral',
    },
  ]);

  const vmPositive = createReadonlyAssetsViewModel(onlyPositive, {
    query: '',
    category: 'all',
    sortBy: 'currentValue',
  });
  assert.equal(vmPositive.topGainers.length, 2);
  assert.equal(vmPositive.topLosers.length, 0);
  assert(vmPositive.topGainers.every((item) => item.variationPct > 0));

  const vmNegative = createReadonlyAssetsViewModel(onlyNegative, {
    query: '',
    category: 'all',
    sortBy: 'currentValue',
  });
  assert.equal(vmNegative.topGainers.length, 0);
  assert.equal(vmNegative.topLosers.length, 2);
  assert(vmNegative.topLosers.every((item) => item.variationPct < 0));

  const vmNeutral = createReadonlyAssetsViewModel(onlyNeutral, {
    query: '',
    category: 'all',
    sortBy: 'currentValue',
  });
  assert.equal(vmNeutral.topGainers.length, 0);
  assert.equal(vmNeutral.topLosers.length, 0);

  const vmEmpty = createReadonlyAssetsViewModel(
    createSnapshotFromItems([], {
      summary: { totalValue: 0, itemCount: 0, averageVariationPct: 0 },
    }),
    {
      query: '',
      category: 'all',
      sortBy: 'currentValue',
    },
  );
  assert.equal(vmEmpty.topGainers.length, 0);
  assert.equal(vmEmpty.topLosers.length, 0);
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
    assert.equal(staticHtml.includes('Atualizar ativos'), false);
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

    assert.match(before, /Atualizar ativos/);
    assert.match(before, /Leitura pronta|Leitura atualizada/);
    assert.match(before, /2026-07-14T10:30:00.000Z/);

    const onlyPositiveHtml = renderToStaticMarkup(
      React.createElement(AssetsReadonlyPage, {
        adapter: {
          getSnapshot() {
            return createSnapshotFromItems([
              {
                ticker: 'AAA1',
                name: 'Alta 1',
                category: 'Acao demo',
                quantity: 1,
                averagePrice: 10,
                currentValue: 110,
                variationPct: 10,
                allocationPct: 100,
                trend: 'positive',
              },
            ]);
          },
        },
      }),
    );

    assert.match(onlyPositiveHtml, /Nenhum ativo em queda/);
    assert.doesNotMatch(onlyPositiveHtml, /Sem ativos/);

    const onlyNegativeHtml = renderToStaticMarkup(
      React.createElement(AssetsReadonlyPage, {
        adapter: {
          getSnapshot() {
            return createSnapshotFromItems([
              {
                ticker: 'BBB1',
                name: 'Queda 1',
                category: 'FII demo',
                quantity: 1,
                averagePrice: 10,
                currentValue: 90,
                variationPct: -10,
                allocationPct: 100,
                trend: 'negative',
              },
            ]);
          },
        },
      }),
    );

    assert.match(onlyNegativeHtml, /Nenhum ativo em alta/);

    const onlyNeutralHtml = renderToStaticMarkup(
      React.createElement(AssetsReadonlyPage, {
        adapter: {
          getSnapshot() {
            return createSnapshotFromItems([
              {
                ticker: 'CCC1',
                name: 'Neutra 1',
                category: 'ETF demo',
                quantity: 1,
                averagePrice: 10,
                currentValue: 100,
                variationPct: 0,
                allocationPct: 100,
                trend: 'neutral',
              },
            ]);
          },
        },
      }),
    );

    assert.match(onlyNeutralHtml, /Nenhum ativo em alta/);
    assert.match(onlyNeutralHtml, /Nenhum ativo em queda/);

    const emptyHtml = renderToStaticMarkup(
      React.createElement(AssetsReadonlyPage, {
        adapter: {
          getSnapshot() {
            return createSnapshotFromItems([], {
              summary: { totalValue: 0, itemCount: 0, averageVariationPct: 0 },
            });
          },
        },
      }),
    );

    assert.match(emptyHtml, /Sem ativos/);
    assert.match(emptyHtml, /Snapshot vazio/);
    assert.match(emptyHtml, /Sem distribuicao/);

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
