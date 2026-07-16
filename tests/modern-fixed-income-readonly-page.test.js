const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createServer } = require('vite');

const pageModulePath = path.join(__dirname, '..', 'modern', 'src', 'features', 'fixed-income', 'FixedIncomeReadonlyPage.tsx');
const viewModelModulePath = path.join(__dirname, '..', 'modern', 'src', 'features', 'fixed-income', 'readonlyFixedIncomeViewModel.ts');
const runtimeModulePath = path.join(__dirname, '..', 'modern', 'src', 'bootstrap', 'modernFixedIncomeRuntime.ts');

async function loadPageModule() {
  return import(pathToFileURL(pageModulePath).href);
}

async function loadViewModelModule() {
  return import(pathToFileURL(viewModelModulePath).href);
}

async function loadRuntimeModule() {
  return import(pathToFileURL(runtimeModulePath).href);
}

function createSnapshot() {
  return {
    version: 1,
    generatedAt: '2026-07-14T10:30:00.000Z',
    notice: 'Snapshot legado somente leitura de renda fixa. React nao escreve na fonte.',
    summary: {
      totalApplied: 11000,
      totalGross: 11418.5,
      totalLiquid: 11368.5,
      totalProfit: 368.5,
      totalTaxValue: 50,
      totalUnavailableValue: 0,
      itemCount: 3,
    },
    items: [
      {
        ticker: 'CDB26',
        name: 'CDB 2026',
        subtype: 'CDB',
        issuer: 'Banco Teste',
        applicationDate: '2026-01-12',
        maturityDate: '2026-12-15',
        contractedRate: 'CDI + 0,95% aa',
        indexer: 'CDI',
        appliedValue: 4000,
        grossValue: 4128.2,
        liquidValue: 4120.4,
        profitValue: 120.4,
        taxValue: 7.8,
        liquidity: 'Diaria',
        unavailableValue: 0,
        maturityStatus: 'Proximos 12 meses',
        note: 'Demo CDB',
      },
      {
        ticker: 'LCI27',
        name: 'LCI 2027',
        subtype: 'LCI',
        issuer: 'Banco Teste',
        applicationDate: '2025-08-08',
        maturityDate: '2027-08-08',
        contractedRate: '95% CDI',
        indexer: 'CDI',
        appliedValue: 2500,
        grossValue: 2618.77,
        liquidValue: 2618.77,
        profitValue: 118.77,
        taxValue: 0,
        liquidity: 'No vencimento',
        unavailableValue: 0,
        maturityStatus: 'Acima de 12 meses',
        note: 'Demo LCI',
      },
      {
        ticker: 'TESR3',
        name: 'Tesouro Selic 2028',
        subtype: 'Tesouro Direto',
        issuer: 'Tesouro Nacional',
        applicationDate: '2025-03-20',
        maturityDate: '2028-03-01',
        contractedRate: 'Selic + taxa',
        indexer: 'Selic',
        appliedValue: 4500,
        grossValue: 4671.53,
        liquidValue: 4629.33,
        profitValue: 129.33,
        taxValue: 42.2,
        liquidity: 'Diaria',
        unavailableValue: 0,
        maturityStatus: 'Acima de 12 meses',
        note: 'Demo Tesouro',
      },
    ],
  };
}

function createAdapter(snapshot) {
  return {
    getSnapshot() {
      return snapshot;
    },
  };
}

test('view model trata ganhos, perdas, distribuicao e filtros da renda fixa', async () => {
  const { createReadonlyFixedIncomeViewModel } = await loadViewModelModule();
  const snapshot = createSnapshot();

  const viewModel = createReadonlyFixedIncomeViewModel(snapshot, {
    query: 'cdb',
    subtype: 'CDB',
    sortBy: 'liquidValue',
  });

  assert.equal(viewModel.itemCount, 3);
  assert.equal(viewModel.totalApplied, 11000);
  assert.equal(viewModel.totalGross, 11418.5);
  assert.equal(viewModel.totalLiquid, 11368.5);
  assert.equal(viewModel.totalProfit, 368.5);
  assert.equal(viewModel.totalTaxValue, 50);
  assert.deepEqual(viewModel.categories, ['CDB', 'LCI', 'Tesouro Direto']);
  assert.equal(viewModel.filteredItems.length, 1);
  assert.equal(viewModel.filteredItems[0].ticker, 'CDB26');
  assert.deepEqual(viewModel.topLiquidItems.map((item) => item.ticker), ['TESR3', 'CDB26', 'LCI27']);
  assert.deepEqual(viewModel.topProfitItems.map((item) => item.ticker), ['TESR3', 'CDB26', 'LCI27']);
  assert.equal(viewModel.topLossItems.length, 0);
  assert.deepEqual(viewModel.topMaturityItems.map((item) => item.ticker), ['CDB26', 'LCI27', 'TESR3']);
  assert.equal(viewModel.hasResults, true);
  assert.equal(viewModel.distribution.length, 3);
  assert.equal(viewModel.distribution[0].subtype, 'Tesouro Direto');
});

test('page readonly de renda fixa renderiza resumo, lista e estado vazio', async () => {
  const viteServer = await createServer({
    configFile: path.join(__dirname, '..', 'modern', 'vite.config.ts'),
    logLevel: 'error',
    server: { middlewareMode: true },
  });

  try {
    const { FixedIncomeReadonlyPage } = await viteServer.ssrLoadModule('/src/features/fixed-income/FixedIncomeReadonlyPage.tsx');
    const html = renderToStaticMarkup(
      React.createElement(FixedIncomeReadonlyPage, {
        adapter: createAdapter(createSnapshot()),
      }),
    );

    assert.match(html, /<h2 class="page-shell__title" id="page-fixed-income">Renda fixa<\/h2>/);
    assert.match(html, /Somente leitura/);
    assert.match(html, /Valor aplicado/);
    assert.match(html, /Valor líquido/);
    assert.match(html, /Ganho \/ perda/);
    assert.match(html, /IR \/ IOF/);
    assert.match(html, /Lista de títulos/);
    assert.match(html, /CDB26/);
    assert.match(html, /TESR3/);
    assert.equal(html.includes('Atualizar leitura'), false);
    assert.equal(html.includes('Atualizar ativos'), false);
    assert.equal(html.includes('button'), false);
  } finally {
    await viteServer.close();
  }
});

test('runtime de renda fixa usa demo quando fonte real nao existe', async () => {
  const { createModernFixedIncomeRuntime } = await loadRuntimeModule();

  const runtime = createModernFixedIncomeRuntime();
  const snapshot = runtime.fixedIncomeAdapter.getSnapshot();

  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.items.length, 3);
  assert.equal(snapshot.summary.totalTaxValue, 50);
  assert.equal(snapshot.items[0].ticker, 'CDB26');
});

test('page de renda fixa aceita snapshot vazio sem carregar tela branca', async () => {
  const viteServer = await createServer({
    configFile: path.join(__dirname, '..', 'modern', 'vite.config.ts'),
    logLevel: 'error',
    server: { middlewareMode: true },
  });

  try {
    const { FixedIncomeReadonlyPage } = await viteServer.ssrLoadModule('/src/features/fixed-income/FixedIncomeReadonlyPage.tsx');
    const html = renderToStaticMarkup(
      React.createElement(FixedIncomeReadonlyPage, {
        adapter: createAdapter({
          version: 1,
          generatedAt: '2026-07-14T10:30:00.000Z',
          notice: 'Snapshot vazio readonly.',
          summary: {
            totalApplied: 0,
            totalGross: 0,
            totalLiquid: 0,
            totalProfit: 0,
            totalTaxValue: 0,
            totalUnavailableValue: 0,
            itemCount: 0,
          },
          items: [],
        }),
      }),
    );

    assert.match(html, /Carteira vazia nesta leitura readonly\./);
    assert.match(html, /Sem distribuição/);
    assert.equal(html.includes('Atualizar leitura'), false);
  } finally {
    await viteServer.close();
  }
});
