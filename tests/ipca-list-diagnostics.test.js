const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createServer } = require('vite');

const pageModulePath = path.join(__dirname, '..', 'modern', 'src', 'features', 'fixed-income', 'FixedIncomeReadonlyPage.tsx');
const viewModelWithValuationModulePath = path.join(__dirname, '..', 'modern', 'src', 'features', 'fixed-income', 'readonlyFixedIncomeViewModelWithValuation.ts');

async function loadPageModule() {
  return import(pathToFileURL(pageModulePath).href);
}

async function loadViewModelWithValuationModule() {
  return import(pathToFileURL(viewModelWithValuationModulePath).href);
}

function createSnapshotWithIPCA() {
  return {
    version: 1,
    generatedAt: '2026-07-14T10:30:00.000Z',
    notice: 'Snapshot legado somente leitura de renda fixa. React nao escreve na fonte.',
    summary: {
      totalApplied: 50000,
      totalGross: 51000,
      totalLiquid: 50500,
      totalProfit: 500,
      totalIrValue: 100,
      totalIofValue: 50,
      totalCombinedTaxValue: 150,
      totalUnavailableValue: 0,
      itemCount: 2,
    },
    items: [
      {
        id: 'rf-cra-jbs',
        ticker: 'CRAJBS',
        name: 'CRA JBS 2028',
        subtype: 'CRA',
        issuer: 'JBS',
        applicationDate: '2024-01-15',
        maturityDate: '2028-01-15',
        contractedRate: 'IPCA + 5,80% aa',
        indexer: 'IPCA',
        appliedValue: 25000,
        grossValue: 25500,
        liquidValue: 25250,
        profitValue: 250,
        irValue: 50,
        iofValue: 25,
        combinedTaxValue: 75,
        liquidity: 'Semestral',
        unavailableValue: 0,
        maturityStatus: 'A vencer',
        note: 'CRA JBS IPCA+',
      },
      {
        id: 'rf-deb-movida',
        ticker: 'DEBMOV',
        name: 'DEB MOVIDA 2027',
        subtype: 'Debênture',
        issuer: 'Movida',
        applicationDate: '2023-06-20',
        maturityDate: '2027-06-20',
        contractedRate: 'IPCA + 6,20% aa',
        indexer: 'IPCA',
        appliedValue: 25000,
        grossValue: 25500,
        liquidValue: 25250,
        profitValue: 250,
        irValue: 50,
        iofValue: 25,
        combinedTaxValue: 75,
        liquidity: 'Semestral',
        unavailableValue: 0,
        maturityStatus: 'A vencer',
        note: 'DEB MOVIDA IPCA+',
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

// Mock IPCA rows covering the full expected range for the test assets
// CRA JBS: applicationDate 2024-01-15 -> expectedStartMonth 2024-02
// DEB MOVIDA: applicationDate 2023-06-20 -> expectedStartMonth 2023-07
// asOf: using current date in valuationState (today)
// Need coverage from 2023-07 to asOfMonth-1
const mockIpcaRows = [
  { date: '2023-07', indexValue: 0.12 },
  { date: '2023-08', indexValue: 0.24 },
  { date: '2023-09', indexValue: 0.44 },
  { date: '2023-10', indexValue: 0.56 },
  { date: '2023-11', indexValue: 0.38 },
  { date: '2023-12', indexValue: 0.56 },
  { date: '2024-01', indexValue: 0.42 },
  { date: '2024-02', indexValue: 0.51 },
  { date: '2024-03', indexValue: 0.16 },
  { date: '2024-04', indexValue: 0.38 },
  { date: '2024-05', indexValue: 0.46 },
  { date: '2024-06', indexValue: 0.21 },
  { date: '2024-07', indexValue: 0.12 },
  { date: '2024-08', indexValue: 0.24 },
  { date: '2024-09', indexValue: 0.44 },
  { date: '2024-10', indexValue: 0.56 },
  { date: '2024-11', indexValue: 0.38 },
  { date: '2024-12', indexValue: 0.56 },
  { date: '2025-01', indexValue: 0.42 },
  { date: '2025-02', indexValue: 0.83 },
  { date: '2025-03', indexValue: 0.71 },
  { date: '2025-04', indexValue: 0.38 },
  { date: '2025-05', indexValue: 0.46 },
  { date: '2025-06', indexValue: 0.21 },
  { date: '2025-07', indexValue: 0.12 },
  { date: '2025-08', indexValue: 0.24 },
  { date: '2025-09', indexValue: 0.44 },
  { date: '2025-10', indexValue: 0.56 },
  { date: '2025-11', indexValue: 0.38 },
  { date: '2025-12', indexValue: 0.56 },
  { date: '2026-01', indexValue: 0.42 },
  { date: '2026-02', indexValue: 0.51 },
  { date: '2026-03', indexValue: 0.16 },
  { date: '2026-04', indexValue: 0.38 },
  { date: '2026-05', indexValue: 0.46 },
  { date: '2026-06', indexValue: 0.21 },
  { date: '2026-07', indexValue: 0.12 },
  { date: '2026-08', indexValue: 0.24 },
];

test('viewmodel exposes IPCA diagnostics when ipcaRows provided', async () => {
  const { createReadonlyFixedIncomeViewModel } = await loadViewModelWithValuationModule();
  
  const snapshot = createSnapshotWithIPCA();
  
  // Test with ipcaRows provided
  const viewModel = createReadonlyFixedIncomeViewModel(snapshot, {
    query: '',
    subtype: 'all',
    sortBy: 'liquidValue',
  }, [], mockIpcaRows);
  
  // Verify viewModel has IPCA diagnostics
  assert.equal(viewModel.filteredItems.length, 2);
  
  for (const item of viewModel.filteredItems) {
    assert.ok(item.valuation.ipcaIndexDiagnostics !== null, `Item ${item.ticker} should have ipcaIndexDiagnostics`);
    const diag = item.valuation.ipcaIndexDiagnostics;
    assert.equal(diag.coverageStatus, 'FULL');
    assert.equal(diag.coveragePercent, 100);
    assert.equal(diag.freshness, 'FRESH');
    assert.ok(diag.sourceAsOf !== null);
    assert.ok(Array.isArray(diag.missingMonths));
    assert.ok(Array.isArray(diag.duplicateMonths));
    assert.ok(Array.isArray(diag.invalidMonths));
  }
});

test('viewmodel exposes IPCA diagnostics with UNAVAILABLE status when ipcaRows is empty', async () => {
  const { createReadonlyFixedIncomeViewModel } = await loadViewModelWithValuationModule();
  
  const snapshot = createSnapshotWithIPCA();
  
  // Test with empty ipcaRows - should still expose diagnostics but with UNAVAILABLE status
  const viewModel = createReadonlyFixedIncomeViewModel(snapshot, {
    query: '',
    subtype: 'all',
    sortBy: 'liquidValue',
  }, [], []);
  
  assert.equal(viewModel.filteredItems.length, 2);
  
  for (const item of viewModel.filteredItems) {
    assert.ok(item.valuation.ipcaIndexDiagnostics !== null, `Item ${item.ticker} should have ipcaIndexDiagnostics even when empty`);
    const diag = item.valuation.ipcaIndexDiagnostics;
    assert.equal(diag.coverageStatus, 'UNAVAILABLE');
    assert.equal(diag.coveragePercent, null);
    assert.equal(diag.freshness, 'UNKNOWN');
    assert.equal(diag.sourceAsOf, null);
    assert.ok(Array.isArray(diag.missingMonths));
    assert.equal(diag.missingMonths.length, 0);
  }
});

test('page component renders without error (SSR smoke test)', async () => {
  const viteServer = await createServer({
    configFile: path.join(__dirname, '..', 'modern', 'vite.config.ts'),
    logLevel: 'error',
    server: { middlewareMode: true },
  });

  try {
    const { FixedIncomeReadonlyPage } = await viteServer.ssrLoadModule('/src/features/fixed-income/FixedIncomeReadonlyPage.tsx');
    
    const snapshot = createSnapshotWithIPCA();
    
    // Test page renders without error (SSR doesn't run useEffect, so no IPCA data expected)
    const html = renderToStaticMarkup(
      React.createElement(FixedIncomeReadonlyPage, {
        adapter: createAdapter(snapshot),
      }),
    );
    
    // Basic structure checks
    assert.match(html, /Renda fixa/);
    assert.match(html, /Somente leitura/);
    assert.match(html, /CRAJBS/);
    assert.match(html, /DEBMOV/);
    assert.match(html, /IPCA \+ 5,80% aa/);
    assert.match(html, /IPCA \+ 6,20% aa/);
    
  } finally {
    await viteServer.close();
  }
});

test('page component structure includes IPCA diagnostics container in list row', async () => {
  const viteServer = await createServer({
    configFile: path.join(__dirname, '..', 'modern', 'vite.config.ts'),
    logLevel: 'error',
    server: { middlewareMode: true },
  });

  try {
    const { FixedIncomeReadonlyPage } = await viteServer.ssrLoadModule('/src/features/fixed-income/FixedIncomeReadonlyPage.tsx');
    
    const snapshot = createSnapshotWithIPCA();
    
    const html = renderToStaticMarkup(
      React.createElement(FixedIncomeReadonlyPage, {
        adapter: createAdapter(snapshot),
      }),
    );
    
    // Verify the IPCA diagnostics container exists in the list row structure
    // (it will be empty in SSR since useEffect doesn't run, but the JSX structure should be present)
    assert.match(html, /fixed-income-readonly__ipca-diagnostics/);
    assert.match(html, /fixed-income-readonly__ipca-label/);
    assert.match(html, /fixed-income-readonly__ipca-fields/);
    assert.match(html, /Não representa valor do título/);
    
    // Verify mobile card also has the structure
    assert.match(html, /<dt>IPCA — diagnóstico do índice<\/dt>/);
    
  } finally {
    await viteServer.close();
  }
});