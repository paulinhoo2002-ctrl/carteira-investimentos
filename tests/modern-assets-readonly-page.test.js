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
    signal: 'all',
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
    signal: 'all',
  });
  const resultAsc = createReadonlyAssetsViewModel(snapshot, {
    query: '',
    category: 'all',
    sortBy: 'resultAsc',
    signal: 'all',
  });
  const rentabilityDesc = createReadonlyAssetsViewModel(snapshot, {
    query: '',
    category: 'all',
    sortBy: 'rentabilityPctDesc',
    signal: 'all',
  });
  const nameSorted = createReadonlyAssetsViewModel(snapshot, {
    query: '',
    category: 'all',
    sortBy: 'name',
    signal: 'all',
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

test('sinal prudente readonly de ativos classifica precedencia e casos limite', async () => {
  const { createReadonlyAssetPrudentSignal, createReadonlyAssetsViewModel } = await loadViewModelModule();

  const baseItem = {
    ticker: 'AAA1',
    name: 'Ativo Alpha',
    category: 'Acao demo',
    quantity: 1,
    averagePrice: 100,
    currentValue: 100,
    variationPct: 0,
    allocationPct: 10,
    trend: 'neutral',
  };

  assert.deepEqual(createReadonlyAssetPrudentSignal(baseItem), {
    badgeVariant: 'neutral',
    label: 'Neutro',
    reason: 'Caso completo sem sinal forte.',
  });
  assert.equal(
    createReadonlyAssetPrudentSignal({ ...baseItem, currentValue: 90, allocationPct: 10 }).label,
    'Atrativo para aporte',
  );
  assert.equal(
    createReadonlyAssetPrudentSignal({ ...baseItem, currentValue: 95, allocationPct: 10 }).label,
    'Atrativo para aporte',
  );
  assert.equal(
    createReadonlyAssetPrudentSignal({ ...baseItem, currentValue: 95.01, allocationPct: 10 }).label,
    'Neutro',
  );
  assert.equal(
    createReadonlyAssetPrudentSignal({ ...baseItem, currentValue: 90, allocationPct: 14.99 }).label,
    'Atrativo para aporte',
  );
  assert.equal(
    createReadonlyAssetPrudentSignal({ ...baseItem, currentValue: 80, allocationPct: 10 }).label,
    'Aguardar',
  );
  assert.equal(
    createReadonlyAssetPrudentSignal({ ...baseItem, currentValue: 80.01, allocationPct: 10 }).label,
    'Atrativo para aporte',
  );
  assert.equal(createReadonlyAssetPrudentSignal({ ...baseItem, currentValue: 124.99, allocationPct: 10 }).label, 'Neutro');
  assert.equal(createReadonlyAssetPrudentSignal({ ...baseItem, currentValue: 125, allocationPct: 10 }).label, 'Aguardar');
  assert.equal(createReadonlyAssetPrudentSignal({ ...baseItem, allocationPct: 15 }).label, 'Concentração alta');
  assert.equal(createReadonlyAssetPrudentSignal({ ...baseItem, currentValue: 90, allocationPct: 15 }).label, 'Concentração alta');
  assert.equal(createReadonlyAssetPrudentSignal({ ...baseItem, currentValue: 100, allocationPct: 0 }).label, 'Neutro');
  assert.equal(
    createReadonlyAssetPrudentSignal({ ...baseItem, currentValue: 95, allocationPct: 14.99 }).label,
    'Atrativo para aporte',
  );
  assert.equal(createReadonlyAssetPrudentSignal({ ...baseItem, currentValue: 95, allocationPct: 10 }).reason.includes('%'), true);
  assert.equal(createReadonlyAssetPrudentSignal({ ...baseItem, currentValue: 95, allocationPct: 10 }).badgeVariant, 'info');
  assert.equal(createReadonlyAssetPrudentSignal({ ...baseItem, currentValue: Number.NaN }).label, 'Dados incompletos');
  assert.equal(
    createReadonlyAssetPrudentSignal({ ...baseItem, allocationPct: Number.POSITIVE_INFINITY }).label,
    'Dados incompletos',
  );
  assert.equal(createReadonlyAssetPrudentSignal({ ...baseItem, currentValue: 100, allocationPct: Number.NaN }).label, 'Dados incompletos');
  assert.equal(createReadonlyAssetPrudentSignal({ ...baseItem, currentValue: undefined }).label, 'Dados incompletos');
  assert.equal(createReadonlyAssetPrudentSignal({ ...baseItem, name: '' }).label, 'Dados incompletos');

  const signalCases = [
    {
      item: baseItem,
      expected: {
        label: 'Neutro',
        badgeVariant: 'neutral',
      },
    },
    {
      item: { ...baseItem, currentValue: 95, allocationPct: 10 },
      expected: {
        label: 'Atrativo para aporte',
        badgeVariant: 'info',
      },
    },
    {
      item: { ...baseItem, currentValue: 80, allocationPct: 10 },
      expected: {
        label: 'Aguardar',
        badgeVariant: 'warning',
      },
    },
    {
      item: { ...baseItem, currentValue: 100, allocationPct: 15 },
      expected: {
        label: 'Concentração alta',
        badgeVariant: 'warning',
      },
    },
    {
      item: { ...baseItem, currentValue: undefined },
      expected: {
        label: 'Dados incompletos',
        badgeVariant: 'warning',
      },
    },
  ];

  for (const { item, expected } of signalCases) {
    const signal = createReadonlyAssetPrudentSignal(item);
    assert.equal(signal.label, expected.label);
    assert.equal(signal.badgeVariant, expected.badgeVariant);
    assert.equal(typeof signal.reason, 'string');
    assert.ok(signal.reason.length > 0);
  }

  const emptyViewModel = createReadonlyAssetsViewModel(
    createSnapshotFromItems([], {
      summary: { totalValue: 0, itemCount: 0, averageVariationPct: 0 },
    }),
    {
      query: '',
      category: 'all',
      sortBy: 'currentValueDesc',
      signal: 'all',
    },
  );

  assert.equal(emptyViewModel.filteredItems.length, 0);
  assert.equal(emptyViewModel.hasResults, false);
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
    signal: 'all',
  });
  assert.equal(vmPositive.topGainers.length, 2);
  assert.equal(vmPositive.topLosers.length, 0);
  assert(vmPositive.topGainers.every((item) => item.variationPct > 0));

  const vmNegative = createReadonlyAssetsViewModel(onlyNegative, {
    query: '',
    category: 'all',
    sortBy: 'currentValueDesc',
    signal: 'all',
  });
  assert.equal(vmNegative.topGainers.length, 0);
  assert.equal(vmNegative.topLosers.length, 2);
  assert(vmNegative.topLosers.every((item) => item.variationPct < 0));

  const vmNeutral = createReadonlyAssetsViewModel(onlyNeutral, {
    query: '',
    category: 'all',
    sortBy: 'currentValueDesc',
    signal: 'all',
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
      signal: 'all',
    },
  );
  assert.equal(vmEmpty.topGainers.length, 0);
  assert.equal(vmEmpty.topLosers.length, 0);
});

test('view model readonly filtra por sinal e expoe contadores por sinal', async () => {
  const { createReadonlyAssetsViewModel } = await loadViewModelModule();

  const items = [
    {
      ticker: 'AAA1',
      name: 'Neutro A',
      category: 'Acao demo',
      quantity: 1,
      averagePrice: 100,
      currentValue: 100,
      variationPct: 0,
      allocationPct: 10,
      trend: 'neutral',
    },
    {
      ticker: 'BBB1',
      name: 'Atrativo B',
      category: 'Acao demo',
      quantity: 1,
      averagePrice: 100,
      currentValue: 90,
      variationPct: -10,
      allocationPct: 10,
      trend: 'negative',
    },
    {
      ticker: 'CCC1',
      name: 'Aguardar C',
      category: 'Acao demo',
      quantity: 1,
      averagePrice: 100,
      currentValue: 80,
      variationPct: -20,
      allocationPct: 10,
      trend: 'negative',
    },
    {
      ticker: 'DDD1',
      name: 'Concentracao D',
      category: 'Acao demo',
      quantity: 1,
      averagePrice: 100,
      currentValue: 100,
      variationPct: 0,
      allocationPct: 20,
      trend: 'neutral',
    },
    {
      ticker: 'EEE1',
      name: 'Incompleto E',
      category: '',
      quantity: 1,
      averagePrice: 100,
      currentValue: 100,
      variationPct: 0,
      allocationPct: 10,
      trend: 'neutral',
    },
  ];

  const snapshot = createSnapshotFromItems(items);

  const all = createReadonlyAssetsViewModel(snapshot, {
    query: '',
    category: 'all',
    sortBy: 'currentValueDesc',
    signal: 'all',
  });

  assert.equal(all.filteredItems.length, 5);
  assert.deepEqual(all.signalCounts, {
    incomplete: 1,
    concentration: 1,
    wait: 1,
    attractive: 1,
    neutral: 1,
  });

  const attractiveOnly = createReadonlyAssetsViewModel(snapshot, {
    query: '',
    category: 'all',
    sortBy: 'currentValueDesc',
    signal: 'attractive',
  });
  assert.equal(attractiveOnly.filteredItems.length, 1);
  assert.equal(attractiveOnly.filteredItems[0].ticker, 'BBB1');

  const concentrationOnly = createReadonlyAssetsViewModel(snapshot, {
    query: '',
    category: 'all',
    sortBy: 'currentValueDesc',
    signal: 'concentration',
  });
  assert.equal(concentrationOnly.filteredItems.length, 1);
  assert.equal(concentrationOnly.filteredItems[0].ticker, 'DDD1');

  const incompleteOnly = createReadonlyAssetsViewModel(snapshot, {
    query: '',
    category: 'all',
    sortBy: 'currentValueDesc',
    signal: 'incomplete',
  });
  assert.equal(incompleteOnly.filteredItems.length, 1);
  assert.equal(incompleteOnly.filteredItems[0].ticker, 'EEE1');
});

test('contadores por sinal respeitam busca e categoria antes do filtro de sinal', async () => {
  const { createReadonlyAssetsViewModel } = await loadViewModelModule();

  const items = [
    {
      ticker: 'AAA1',
      name: 'Atrativo A',
      category: 'Acao demo',
      quantity: 1,
      averagePrice: 100,
      currentValue: 90,
      variationPct: -10,
      allocationPct: 10,
      trend: 'negative',
    },
    {
      ticker: 'BBB1',
      name: 'Atrativo B',
      category: 'FII demo',
      quantity: 1,
      averagePrice: 100,
      currentValue: 90,
      variationPct: -10,
      allocationPct: 10,
      trend: 'negative',
    },
    {
      ticker: 'CCC1',
      name: 'Neutro C',
      category: 'Acao demo',
      quantity: 1,
      averagePrice: 100,
      currentValue: 100,
      variationPct: 0,
      allocationPct: 10,
      trend: 'neutral',
    },
  ];

  const snapshot = createSnapshotFromItems(items);

  const filteredByCategory = createReadonlyAssetsViewModel(snapshot, {
    query: '',
    category: 'Acao demo',
    sortBy: 'currentValueDesc',
    signal: 'all',
  });

  assert.deepEqual(filteredByCategory.signalCounts, {
    incomplete: 0,
    concentration: 0,
    wait: 0,
    attractive: 1,
    neutral: 1,
  });
  assert.equal(filteredByCategory.filteredItems.length, 2);

  const filteredByQuery = createReadonlyAssetsViewModel(snapshot, {
    query: 'BBB1',
    category: 'all',
    sortBy: 'currentValueDesc',
    signal: 'all',
  });

  assert.deepEqual(filteredByQuery.signalCounts, {
    incomplete: 0,
    concentration: 0,
    wait: 0,
    attractive: 1,
    neutral: 0,
  });
  assert.equal(filteredByQuery.filteredItems.length, 1);
  assert.equal(filteredByQuery.filteredItems[0].ticker, 'BBB1');

  const filteredWithSignal = createReadonlyAssetsViewModel(snapshot, {
    query: '',
    category: 'Acao demo',
    sortBy: 'currentValueDesc',
    signal: 'attractive',
  });
  assert.equal(filteredWithSignal.signalCounts.attractive, 1);
  assert.equal(filteredWithSignal.filteredItems.length, 1);
  assert.equal(filteredWithSignal.filteredItems[0].ticker, 'AAA1');
});

test('ordenacao por prioridade do sinal usa precedencia prudente e desempata por ticker', async () => {
  const { createReadonlyAssetsViewModel } = await loadViewModelModule();

  const items = [
    {
      ticker: 'ZZZ1',
      name: 'Neutro Z',
      category: 'Acao demo',
      quantity: 1,
      averagePrice: 100,
      currentValue: 100,
      variationPct: 0,
      allocationPct: 10,
      trend: 'neutral',
    },
    {
      ticker: 'BBB1',
      name: 'Atrativo B',
      category: 'Acao demo',
      quantity: 1,
      averagePrice: 100,
      currentValue: 90,
      variationPct: -10,
      allocationPct: 10,
      trend: 'negative',
    },
    {
      ticker: 'AAA1',
      name: 'Concentracao A',
      category: 'Acao demo',
      quantity: 1,
      averagePrice: 100,
      currentValue: 100,
      variationPct: 0,
      allocationPct: 20,
      trend: 'neutral',
    },
    {
      ticker: 'CCC1',
      name: 'Neutro C',
      category: 'Acao demo',
      quantity: 1,
      averagePrice: 100,
      currentValue: 100,
      variationPct: 0,
      allocationPct: 10,
      trend: 'neutral',
    },
    {
      ticker: 'DDD1',
      name: 'Incompleto D',
      category: '',
      quantity: 1,
      averagePrice: 100,
      currentValue: 100,
      variationPct: 0,
      allocationPct: 10,
      trend: 'neutral',
    },
  ];

  const snapshot = createSnapshotFromItems(items);

  const sorted = createReadonlyAssetsViewModel(snapshot, {
    query: '',
    category: 'all',
    sortBy: 'signalPriority',
    signal: 'all',
  });

  assert.deepEqual(
    sorted.filteredItems.map((item) => item.ticker),
    ['DDD1', 'AAA1', 'BBB1', 'CCC1', 'ZZZ1'],
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
    assert.match(before, /Sinal/);
    assert.match(before, /Concentração alta|Atrativo para aporte|Neutro|Dados incompletos/);
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
    assert.match(onlyPositiveHtml, /Sinal/);

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
    assert.match(onlyNegativeHtml, /Sinal/);

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
    assert.match(onlyNeutralHtml, /Sinal/);

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

test('pagina readonly expoe filtro de sinal, contagens e aria-describedby no badge', async () => {
  const viteServer = await createServer({
    configFile: path.join(__dirname, '..', 'modern', 'vite.config.ts'),
    logLevel: 'error',
    server: { middlewareMode: true },
  });

  try {
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

    assert.match(html, /Filtrar por sinal/);
    assert.match(html, /assets-readonly-signal/);
    assert.match(html, /Contagem por sinal/);
    assert.match(html, /assets-readonly__signal-counts/);

    assert.match(html, /aria-describedby="assets-readonly-signal-reason-/);
    assert.match(html, /Prioridade do sinal/);

    const ariaIdMatches = html.match(/aria-describedby="assets-readonly-signal-reason-[^"]+"/g) ?? [];
    const mobileAriaIdMatches = html.match(/id="assets-readonly-signal-reason-mobile-[^"]+"/g) ?? [];
    assert.ok(ariaIdMatches.length > 0);
    assert.ok(mobileAriaIdMatches.length > 0);
  } finally {
    await viteServer.close();
  }
});

test('pagina readonly sanitiza ticker para gerar IDs validos de aria-describedby', async () => {
  const viteServer = await createServer({
    configFile: path.join(__dirname, '..', 'modern', 'vite.config.ts'),
    logLevel: 'error',
    server: { middlewareMode: true },
  });

  try {
    const { AssetsReadonlyPage } = await viteServer.ssrLoadModule('/src/features/reports/AssetsReadonlyPage.tsx');

    const snapshotWithSpecialTickers = {
      generatedAt: '2026-07-14T10:30:00.000Z',
      notice: 'Snapshot teste.',
      summary: { totalValue: 1000, itemCount: 4, averageVariationPct: 0 },
      items: [
        {
          ticker: 'MXRF11.SA',
          name: 'Maxi Renda SA',
          category: 'Acao demo',
          quantity: 1,
          averagePrice: 10,
          currentValue: 10,
          variationPct: 0,
          allocationPct: 10,
          trend: 'neutral',
        },
        {
          ticker: 'MGLU3/4',
          name: 'Magazine Luiza',
          category: 'Acao demo',
          quantity: 1,
          averagePrice: 10,
          currentValue: 10,
          variationPct: 0,
          allocationPct: 10,
          trend: 'neutral',
        },
        {
          ticker: 'BOVA 11',
          name: 'Bova com espaco',
          category: 'ETF demo',
          quantity: 1,
          averagePrice: 10,
          currentValue: 10,
          variationPct: 0,
          allocationPct: 10,
          trend: 'neutral',
        },
        {
          ticker: '   ',
          name: 'Ativo sem ticker valido',
          category: 'Acao demo',
          quantity: 1,
          averagePrice: 10,
          currentValue: 10,
          variationPct: 0,
          allocationPct: 10,
          trend: 'neutral',
        },
      ],
    };

    const html = renderToStaticMarkup(
      React.createElement(AssetsReadonlyPage, {
        adapter: {
          getSnapshot() {
            return snapshotWithSpecialTickers;
          },
        },
      }),
    );

    assert.match(html, /id="assets-readonly-signal-reason-MXRF11-SA"/);
    assert.match(html, /id="assets-readonly-signal-reason-mobile-MXRF11-SA"/);

    assert.match(html, /id="assets-readonly-signal-reason-MGLU3-4"/);
    assert.match(html, /id="assets-readonly-signal-reason-mobile-MGLU3-4"/);

    assert.match(html, /id="assets-readonly-signal-reason-BOVA-11"/);
    assert.match(html, /id="assets-readonly-signal-reason-mobile-BOVA-11"/);

    const fallbackMatches = html.match(/id="assets-readonly-signal-reason(-mobile)?-asset"/g) ?? [];
    assert.ok(fallbackMatches.length >= 2, 'Esperava pelo menos 2 IDs com fallback "asset" (desktop + mobile)');

    assert.equal(html.includes('id="assets-readonly-signal-reason-MXRF11.SA"'), false);
    assert.equal(html.includes('id="assets-readonly-signal-reason-MGLU3/4"'), false);

    const ariaIds = html.match(/aria-describedby="assets-readonly-signal-reason[^"]*"/g) ?? [];
    const uniqueAriaIds = new Set(ariaIds);
    assert.equal(ariaIds.length, uniqueAriaIds.size, 'aria-describedby nao deve repetir IDs');
  } finally {
    await viteServer.close();
  }
});

test('ordenacao por prioridade do sinal nao altera a lista quando ja vem filtrada por sinal', async () => {
  const { createReadonlyAssetsViewModel } = await loadViewModelModule();

  const items = [
    {
      ticker: 'AAA1',
      name: 'Neutro A',
      category: 'Acao demo',
      quantity: 1,
      averagePrice: 100,
      currentValue: 100,
      variationPct: 0,
      allocationPct: 10,
      trend: 'neutral',
    },
    {
      ticker: 'BBB1',
      name: 'Neutro B',
      category: 'Acao demo',
      quantity: 1,
      averagePrice: 100,
      currentValue: 100,
      variationPct: 0,
      allocationPct: 10,
      trend: 'neutral',
    },
  ];

  const snapshot = createSnapshotFromItems(items);

  const viewModel = createReadonlyAssetsViewModel(snapshot, {
    query: '',
    category: 'all',
    sortBy: 'signalPriority',
    signal: 'neutral',
  });

  assert.equal(viewModel.filteredItems.length, 2);
  assert.equal(viewModel.selectedSignal, 'neutral');
  assert.equal(viewModel.signalCounts.neutral, 2);
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
