const assert = require('node:assert/strict');
const fs = require('node:fs');
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
const badgeModulePath = path.join(__dirname, '..', 'modern', 'src', 'components', 'Badge', 'Badge.tsx');
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
    sortBy: 'currentValueDesc',
  });

  assert.equal(viewModel.summary.totalValue, 450);
  assert.equal(viewModel.summary.itemCount, 1);
  assert.equal(viewModel.summary.totalResult, -50);
  assert.equal(viewModel.summary.rentabilityPct, -10);
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

test('view model readonly de ativos calcula resumo visivel e ordena por resultado, rentabilidade e nome', async () => {
  const {
    calculateReadonlyAssetResult,
    calculateReadonlyAssetRentabilityPct,
    createReadonlyAssetsViewModel,
    createReadonlyAssetsSummary,
  } = await loadViewModelModule();

  const items = [
    {
      ticker: 'AAA1',
      name: 'Ativo Alpha',
      category: 'Acao demo',
      quantity: 1,
      averagePrice: 100,
      currentValue: 130,
      variationPct: 30,
      allocationPct: 40,
      trend: 'positive',
    },
    {
      ticker: 'BBB1',
      name: 'Ativo Bravo',
      category: 'FII demo',
      quantity: 1,
      averagePrice: 100,
      currentValue: 140,
      variationPct: 40,
      allocationPct: 35,
      trend: 'positive',
    },
    {
      ticker: 'CCC1',
      name: 'Ativo Charlie',
      category: 'ETF demo',
      quantity: 1,
      averagePrice: 100,
      currentValue: 120,
      variationPct: 20,
      allocationPct: 25,
      trend: 'positive',
    },
  ];

  const snapshot = createSnapshotFromItems(items);
  const summary = createReadonlyAssetsSummary(items);

  assert.equal(calculateReadonlyAssetResult(items[0]), 30);
  assert.equal(calculateReadonlyAssetRentabilityPct(items[0]), 30);
  assert.equal(summary.totalValue, 390);
  assert.equal(summary.itemCount, 3);
  assert.equal(summary.totalResult, 90);
  assert.equal(summary.rentabilityPct, 30);

  const resultDesc = createReadonlyAssetsViewModel(snapshot, {
    query: '',
    category: 'all',
    sortBy: 'resultDesc',
  });
  const resultAsc = createReadonlyAssetsViewModel(snapshot, {
    query: '',
    category: 'all',
    sortBy: 'resultAsc',
  });
  const rentabilityDesc = createReadonlyAssetsViewModel(snapshot, {
    query: '',
    category: 'all',
    sortBy: 'rentabilityPctDesc',
  });
  const nameSorted = createReadonlyAssetsViewModel(snapshot, {
    query: '',
    category: 'all',
    sortBy: 'name',
  });

  assert.deepEqual(
    resultDesc.filteredItems.map((item) => item.ticker),
    ['BBB1', 'AAA1', 'CCC1'],
  );
  assert.deepEqual(
    resultAsc.filteredItems.map((item) => item.ticker),
    ['CCC1', 'AAA1', 'BBB1'],
  );
  assert.deepEqual(
    rentabilityDesc.filteredItems.map((item) => item.ticker),
    ['BBB1', 'AAA1', 'CCC1'],
  );
  assert.deepEqual(
    nameSorted.filteredItems.map((item) => item.ticker),
    ['AAA1', 'BBB1', 'CCC1'],
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
    sortBy: 'currentValueDesc',
  });
  assert.equal(vmPositive.topGainers.length, 2);
  assert.equal(vmPositive.topLosers.length, 0);
  assert(vmPositive.topGainers.every((item) => item.variationPct > 0));

  const vmNegative = createReadonlyAssetsViewModel(onlyNegative, {
    query: '',
    category: 'all',
    sortBy: 'currentValueDesc',
  });
  assert.equal(vmNegative.topGainers.length, 0);
  assert.equal(vmNegative.topLosers.length, 2);
  assert(vmNegative.topLosers.every((item) => item.variationPct < 0));

  const vmNeutral = createReadonlyAssetsViewModel(onlyNeutral, {
    query: '',
    category: 'all',
    sortBy: 'currentValueDesc',
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
      sortBy: 'currentValueDesc',
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
    assert.equal((before.match(/Atualizar ativos/g) ?? []).length, 1);
    assert.match(before, /Leitura pronta|Leitura atualizada/);
    assert.match(before, /2026-07-14T10:30:00.000Z/);
    assert.match(before, /Total exibido/);
    assert.match(before, /Quantidade/);
    assert.match(before, /Resultado agregado/);
    assert.match(before, /Rentabilidade/);
    assert.match(before, /Valor da posi/);
    assert.equal(before.includes('Maior alta'), false);
    assert.equal(before.includes('Maior queda'), false);
    assert.match(before, /aria-controls="assets-readonly-highlights-panel"/);
    assert.match(before, /aria-controls="assets-readonly-distribution-panel"/);
    assert.match(before, /aria-expanded="false"/);

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

    assert.match(onlyPositiveHtml, /Resultado agregado/);

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

    assert.match(onlyNegativeHtml, /Rentabilidade/);

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

    assert.match(onlyNeutralHtml, /Valor da posi/);

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
    assert.match(emptyHtml, /Total exibido/);

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
    assert.match(after, /Resultado agregado/);
  } finally {
    await viteServer.close();
  }
});

test('Badge oficial renderiza variantes e a pagina pilotada usa o componente', async () => {
  const viteServer = await createServer({
    configFile: path.join(__dirname, '..', 'modern', 'vite.config.ts'),
    logLevel: 'error',
    server: { middlewareMode: true },
  });

  try {
    const { Badge } = await viteServer.ssrLoadModule('/src/components/Badge/Badge.tsx');

    const warningHtml = renderToStaticMarkup(
      React.createElement(Badge, { size: 'md', variant: 'warning' }, 'Indisponível'),
    );
    const neutralHtml = renderToStaticMarkup(React.createElement(Badge, null, 'Categoria'));

    assert.match(warningHtml, /ui-badge/);
    assert.match(warningHtml, /ui-badge--warning/);
    assert.match(warningHtml, /ui-badge--md/);
    assert.match(neutralHtml, /ui-badge--neutral/);
    assert.match(neutralHtml, /ui-badge--sm/);

    const { AssetsReadonlyPage } = await viteServer.ssrLoadModule('/src/features/reports/AssetsReadonlyPage.tsx');
    const html = renderToStaticMarkup(
      React.createElement(AssetsReadonlyPage, {
        adapter: {
          getSnapshot() {
            return createSnapshot();
          },
        },
      }),
    );

    assert.match(html, /ui-badge/);
    assert.match(html, /ui-badge--positive|ui-badge--negative|ui-badge--info|ui-badge--neutral/);
    assert.equal(html.includes('trend-badge'), false);
  } finally {
    await viteServer.close();
  }
});

test('Badge oficial nao expõe API interativa por contrato de fonte', () => {
  const source = fs.readFileSync(badgeModulePath, 'utf8');

  for (const forbidden of ['onClick', 'selected', 'dismissible', 'removable', 'href', 'loading', 'menu', 'tooltip']) {
    assert.equal(source.includes(forbidden), false, `Forbidden API found: ${forbidden}`);
  }
});
