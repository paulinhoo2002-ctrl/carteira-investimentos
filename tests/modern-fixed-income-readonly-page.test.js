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
const contractModulePath = path.join(__dirname, '..', 'modern', 'src', 'features', 'fixed-income', 'fixedIncomeReadonlyContract.mjs');

async function loadPageModule() {
  return import(pathToFileURL(pageModulePath).href);
}

async function loadViewModelModule() {
  return import(pathToFileURL(viewModelModulePath).href);
}

async function loadRuntimeModule() {
  return import(pathToFileURL(runtimeModulePath).href);
}

async function loadContractModule() {
  return import(pathToFileURL(contractModulePath).href);
}

function createSnapshot() {
  return {
    version: 1,
    generatedAt: '2026-07-14T10:30:00.000Z',
    notice: 'Snapshot legado somente leitura de renda fixa. React nao escreve na fonte.',
    summary: {
      totalApplied: null,
      totalGross: null,
      totalLiquid: null,
      totalProfit: null,
      totalIrValue: null,
      totalIofValue: null,
      totalCombinedTaxValue: null,
      totalUnavailableValue: null,
      itemCount: 3,
    },
    items: [
      {
        id: 'rf-cdb26',
        ticker: 'CDB26',
        name: 'CDB 2026',
        subtype: 'CDB',
        issuer: 'Banco Teste',
        applicationDate: '2026-01-12',
        maturityDate: '2026-07-20',
        contractedRate: 'CDI + 0,95% aa',
        indexer: 'CDI',
        appliedValue: null,
        grossValue: 4128.2,
        liquidValue: 4120.4,
        profitValue: 120.4,
        irValue: null,
        iofValue: null,
        combinedTaxValue: 7.8,
        liquidity: 'Diária',
        unavailableValue: null,
        maturityStatus: 'Próximo',
        note: 'Demo CDB',
      },
      {
        id: 'rf-lci27',
        ticker: null,
        name: 'LCI 2027',
        subtype: 'LCI',
        issuer: 'Banco Teste',
        applicationDate: '2025-08-08',
        maturityDate: '2027-08-08',
        contractedRate: '95% CDI',
        indexer: 'CDI',
        appliedValue: 0,
        grossValue: 0,
        liquidValue: 0,
        profitValue: 0,
        irValue: 0,
        iofValue: 0,
        combinedTaxValue: 0,
        liquidity: 'No vencimento',
        unavailableValue: 0,
        maturityStatus: 'A vencer',
        note: 'Sem ticker',
      },
      {
        id: 'rf-tesr3',
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
        profitValue: -15.2,
        irValue: null,
        iofValue: null,
        combinedTaxValue: 42.2,
        liquidity: 'Diária',
        unavailableValue: 0,
        maturityStatus: 'A vencer',
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

test('view model preserva null, zero real, IR/IOF e combinada legada', async () => {
  const { createReadonlyFixedIncomeViewModel } = await loadViewModelModule();
  const snapshot = createSnapshot();

  const viewModel = createReadonlyFixedIncomeViewModel(snapshot, {
    query: 'cdb',
    subtype: 'CDB',
    sortBy: 'liquidValue',
  });

  assert.equal(viewModel.itemCount, 3);
  assert.equal(viewModel.totalApplied, null);
  assert.equal(viewModel.totalGross, null);
  assert.equal(viewModel.totalLiquid, null);
  assert.equal(viewModel.totalProfit, null);
  assert.equal(viewModel.totalIrValue, null);
  assert.equal(viewModel.totalIofValue, null);
  assert.equal(viewModel.totalCombinedTaxValue, null);
  assert.deepEqual(viewModel.categories, ['CDB', 'LCI', 'Tesouro Direto']);
  assert.equal(viewModel.filteredItems.length, 1);
  assert.equal(viewModel.filteredItems[0].ticker, 'CDB26');
  assert.equal(viewModel.filteredItems[0].appliedValue, null);
  assert.equal(viewModel.filteredItems[0].irValue, null);
  assert.equal(viewModel.filteredItems[0].iofValue, null);
  assert.equal(viewModel.filteredItems[1] ? viewModel.filteredItems[1].ticker : null, null);
  assert.equal(viewModel.topLiquidItems.find((item) => item.id === 'rf-lci27')?.appliedValue, 0);
  assert.equal(viewModel.topLiquidItems.find((item) => item.id === 'rf-lci27')?.irValue, 0);
  assert.equal(viewModel.topLiquidItems.find((item) => item.id === 'rf-lci27')?.iofValue, 0);
  assert.equal(viewModel.topLiquidItems.find((item) => item.id === 'rf-lci27')?.combinedTaxValue, 0);
  assert.deepEqual(viewModel.topLiquidItems.map((item) => item.ticker ?? item.id), ['TESR3', 'CDB26', 'rf-lci27']);
  assert.deepEqual(viewModel.topProfitItems.map((item) => item.ticker ?? item.id), ['CDB26']);
  assert.deepEqual(viewModel.topLossItems.map((item) => item.ticker ?? item.id), ['TESR3']);
  assert.deepEqual(viewModel.topMaturityItems.map((item) => item.ticker ?? item.id), ['CDB26', 'rf-lci27', 'TESR3']);
  assert.equal(viewModel.hasResults, true);
  assert.equal(viewModel.distribution.length, 3);
  assert.equal(viewModel.distribution[0].subtype, 'Tesouro Direto');
  assert.equal(viewModel.distribution.find((item) => item.subtype === 'LCI')?.allocationPct, 0);
});

test('page readonly de renda fixa renderiza valores ausentes, zero real e combinado legado', async () => {
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
    assert.match(html, /R\$[\s\u00a0]0,00/);
    assert.match(html, /Não informado/);
    assert.match(html, /IR \/ IOF combinado/);
    assert.match(html, /Lista de títulos/);
    assert.match(html, /CDB26/);
    assert.match(html, /LCI 2027/);
    assert.match(html, /TESR3/);
    assert.equal(html.includes('Atualizar leitura'), false);
    assert.equal(html.includes('Atualizar ativos'), false);
    assert.equal(html.includes('<button'), false);
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
  assert.equal(snapshot.summary.totalCombinedTaxValue, 50);
  assert.equal(snapshot.items[0].id, 'rf-cdb26');
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
            totalApplied: null,
            totalGross: null,
            totalLiquid: null,
            totalProfit: null,
            totalIrValue: null,
            totalIofValue: null,
            totalCombinedTaxValue: null,
            totalUnavailableValue: null,
            itemCount: 0,
          },
          items: [],
        }),
      }),
    );

    assert.match(html, /Carteira vazia nesta leitura readonly\./);
    assert.match(html, /Sem distribuição/);
    assert.match(html, /Não informado/);
    assert.equal(html.includes('<button'), false);
  } finally {
    await viteServer.close();
  }
});

test('contrato readonly rejeita registro sem identidade e data invalida nao engana', async () => {
  const { normalizeReadonlyFixedIncomeSnapshot, isReadonlyFixedIncomeSnapshot } = await loadContractModule();

  const invalidIdentitySnapshot = normalizeReadonlyFixedIncomeSnapshot({
    version: 1,
    generatedAt: '2026-07-14T10:30:00.000Z',
    notice: 'Snapshot inválido.',
    summary: {
      totalApplied: null,
      totalGross: null,
      totalLiquid: null,
      totalProfit: null,
      totalIrValue: null,
      totalIofValue: null,
      totalCombinedTaxValue: null,
      totalUnavailableValue: null,
      itemCount: 1,
    },
    items: [
      {
        id: null,
        ticker: null,
        name: null,
        subtype: 'CDB',
        issuer: 'Banco Teste',
        applicationDate: '2026-01-12',
        maturityDate: '2026-07-20',
        contractedRate: 'CDI + 0,95% aa',
        indexer: 'CDI',
        appliedValue: null,
        grossValue: 4128.2,
        liquidValue: 4120.4,
        profitValue: 120.4,
        irValue: null,
        iofValue: null,
        combinedTaxValue: 7.8,
        liquidity: 'Diária',
        unavailableValue: null,
        maturityStatus: 'Próximo',
        note: 'Sem identidade',
      },
    ],
  });

  assert.equal(invalidIdentitySnapshot.version, 1);
  assert.equal(invalidIdentitySnapshot.items.length, 0);
  assert.equal(isReadonlyFixedIncomeSnapshot(invalidIdentitySnapshot), true);
  assert.equal(invalidIdentitySnapshot.summary.totalApplied, null);
  assert.equal(invalidIdentitySnapshot.summary.totalCombinedTaxValue, null);

  const invalidDateSnapshot = normalizeReadonlyFixedIncomeSnapshot({
    version: 1,
    generatedAt: '2026-07-14T10:30:00.000Z',
    notice: 'Snapshot válido com data inválida.',
    summary: {
      totalApplied: 1000,
      totalGross: 1000,
      totalLiquid: 1000,
      totalProfit: 0,
      totalIrValue: null,
      totalIofValue: null,
      totalCombinedTaxValue: null,
      totalUnavailableValue: null,
      itemCount: 1,
    },
    items: [
      {
        id: 'rf-bad-date',
        ticker: 'CDBX1',
        name: 'CDB X1',
        subtype: 'CDB',
        issuer: 'Banco Teste',
        applicationDate: '2026-01-12',
        maturityDate: 'data-invalida',
        contractedRate: 'CDI + 0,95% aa',
        indexer: 'CDI',
        appliedValue: 1000,
        grossValue: 1000,
        liquidValue: 1000,
        profitValue: 0,
        irValue: null,
        iofValue: null,
        combinedTaxValue: null,
        liquidity: 'Diária',
        unavailableValue: null,
        maturityStatus: 'Sem informação',
        note: 'Data inválida não engana',
      },
    ],
  });

  assert.equal(invalidDateSnapshot.items[0].maturityStatus, 'Sem informação');
  assert.equal(invalidDateSnapshot.summary.totalCombinedTaxValue, null);
});
