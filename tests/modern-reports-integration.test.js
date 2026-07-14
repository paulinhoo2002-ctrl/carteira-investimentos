const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createServer } = require('vite');

const bridgeModulePath = path.join(__dirname, '..', 'modern', 'src', 'features', 'reports', 'reportsReadonlyBridge.ts');
const integrationModulePath = path.join(__dirname, '..', 'modern', 'src', 'features', 'reports', 'legacyReportsReadonlyIntegration.ts');
const appModulePath = path.join(__dirname, '..', 'modern', 'src', 'App.tsx');
const mainModulePath = path.join(__dirname, '..', 'modern', 'src', 'main.tsx');
const mountModulePath = path.join(__dirname, '..', 'modern', 'src', 'bootstrap', 'mountModernApp.ts');
const runtimeModulePath = path.join(__dirname, '..', 'modern', 'src', 'bootstrap', 'modernReportsRuntime.ts');
const viteConfigPath = path.join(__dirname, '..', 'modern', 'vite.config.ts');

async function loadBridgeModule() {
  return import(pathToFileURL(bridgeModulePath).href);
}

async function loadIntegrationModule() {
  return import(pathToFileURL(integrationModulePath).href);
}

async function loadRuntimeModule() {
  return import(pathToFileURL(runtimeModulePath).href);
}

function createValidSnapshot() {
  return {
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
  };
}

function createSnapshotSource(snapshot) {
  return {
    getSnapshot() {
      return snapshot;
    },
  };
}

function assertFrozenSnapshot(snapshot) {
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.summary), true);
  assert.equal(Object.isFrozen(snapshot.items), true);

  for (const item of snapshot.items) {
    assert.equal(Object.isFrozen(item), true);
  }
}

test('composicao aceita fonte simulada e percorre boundary, bridge e adapter', async () => {
  const {
    createLegacyReportsReadonlyBoundary,
    createConnectedReportsBridge,
    createConnectedReportsAdapter,
  } = await loadIntegrationModule();

  const sourceSnapshot = createValidSnapshot();
  const source = createSnapshotSource(sourceSnapshot);

  const boundary = createLegacyReportsReadonlyBoundary(source);
  const bridge = createConnectedReportsBridge(source);
  const adapter = createConnectedReportsAdapter(source);

  const boundarySnapshot = boundary.getSnapshot();
  const bridgeSnapshot = bridge.readSnapshot();
  const adapterSnapshot = adapter.getSnapshot();

  assert.deepEqual(boundarySnapshot, sourceSnapshot);
  assert.deepEqual(bridgeSnapshot, sourceSnapshot);
  assert.deepEqual(adapterSnapshot, sourceSnapshot);
  assert.notEqual(adapterSnapshot, sourceSnapshot);
  assertFrozenSnapshot(adapterSnapshot);
});

test('runtime usa fonte demonstrativa quando origem real nao existe', async () => {
  const { createModernReportsRuntime } = await loadRuntimeModule();

  const runtime = createModernReportsRuntime();
  const snapshot = runtime.reportsAdapter.getSnapshot();

  assert.equal(snapshot.generatedAt, '2026-07-14T10:30:00.000Z');
  assert.equal(snapshot.notice, 'Snapshot legado somente leitura. React nao escreve na fonte.');
  assert.deepEqual(snapshot.summary, {
    totalValue: 900,
    itemCount: 3,
    averageVariationPct: 0.14,
  });
  assertFrozenSnapshot(snapshot);
});

test('preview estatica usa adapter recebido e nao mostra botao experimental', async () => {
  const customSnapshot = {
    generatedAt: '2026-07-14T11:00:00.000Z',
    notice: 'Snapshot customizado do adapter. React nao cria fonte propria.',
    summary: {
      totalValue: 1234,
      itemCount: 1,
      averageVariationPct: 2.5,
    },
    items: [
      {
        ticker: 'TEST3',
        name: 'Teste Tres',
        category: 'Acao demo',
        quantity: 1,
        averagePrice: 10,
        currentValue: 12,
        variationPct: 20,
        allocationPct: 100,
        trend: 'positive',
      },
    ],
  };
  let calls = 0;
  const adapter = {
    getSnapshot() {
      calls += 1;
      return customSnapshot;
    },
  };

  const viteServer = await createServer({
    configFile: path.join(__dirname, '..', 'modern', 'vite.config.ts'),
    logLevel: 'error',
    server: { middlewareMode: true },
  });

  try {
    const { AssetsReportPreview } = await viteServer.ssrLoadModule('/src/features/reports/AssetsReportPreview.tsx');
    const html = renderToStaticMarkup(
      React.createElement(AssetsReportPreview, {
        adapter,
      }),
    );

    assert.equal(calls, 1);
    assert.match(html, /Snapshot customizado do adapter/);
    assert.match(html, /Atualizacao ficticia: 2026-07-14T11:00:00.000Z/);
    assert.equal(html.includes('assets-report__diagnostic'), false);
    assert.equal(html.includes('Atualizar previa'), false);
    assert.equal(html.includes('button'), false);
  } finally {
    await viteServer.close();
  }
});

test('runtime substitui fonte demonstrativa por origem simulada valida', async () => {
  const { createModernReportsRuntime } = await loadRuntimeModule();

  const sourceSnapshot = createValidSnapshot();
  const runtime = createModernReportsRuntime({
    reportsSource: createSnapshotSource(sourceSnapshot),
  });

  const snapshot = runtime.reportsAdapter.getSnapshot();

  assert.deepEqual(snapshot, sourceSnapshot);
  assert.notEqual(snapshot, sourceSnapshot);
  assertFrozenSnapshot(snapshot);
});

test('fonte ausente usa fallback', async () => {
  const { READ_ONLY_REPORTS_FALLBACK_SNAPSHOT } = await loadBridgeModule();
  const { createLegacyReportsReadonlyBoundary, createConnectedReportsBridge, createConnectedReportsAdapter } = await loadIntegrationModule();

  const boundary = createLegacyReportsReadonlyBoundary(null);
  const bridge = createConnectedReportsBridge(null);
  const adapter = createConnectedReportsAdapter(null);

  assert.equal(boundary.getSnapshot(), null);
  assert.deepEqual(bridge.readSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
  assert.deepEqual(adapter.getSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
});

test('fonte que retorna null ou lança excecao usa fallback', async () => {
  const { READ_ONLY_REPORTS_FALLBACK_SNAPSHOT } = await loadBridgeModule();
  const { createConnectedReportsBridge, createConnectedReportsAdapter } = await loadIntegrationModule();

  const nullSource = createSnapshotSource(null);
  const throwingSource = {
    getSnapshot() {
      throw new Error('boom');
    },
  };

  assert.deepEqual(createConnectedReportsBridge(nullSource).readSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
  assert.deepEqual(createConnectedReportsAdapter(nullSource).getSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
  assert.deepEqual(createConnectedReportsBridge(throwingSource).readSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
  assert.deepEqual(createConnectedReportsAdapter(throwingSource).getSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
});

test('runtime usa fallback quando origem falha', async () => {
  const { READ_ONLY_REPORTS_FALLBACK_SNAPSHOT } = await loadBridgeModule();
  const { createModernReportsRuntime } = await loadRuntimeModule();

  const runtime = createModernReportsRuntime({
    reportsSource: {
      getSnapshot() {
        throw new Error('boom');
      },
    },
  });

  assert.deepEqual(runtime.reportsAdapter.getSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
});

test('snapshot invalido usa fallback', async () => {
  const { READ_ONLY_REPORTS_FALLBACK_SNAPSHOT } = await loadBridgeModule();
  const { createConnectedReportsBridge, createConnectedReportsAdapter } = await loadIntegrationModule();

  const invalidSource = createSnapshotSource({
    generatedAt: '15/07/2026, 10:30',
    notice: 'invalido',
    summary: { totalValue: NaN, itemCount: 1, averageVariationPct: Infinity },
    items: [{ ticker: '', name: '', category: 'Cripto demo' }],
  });

  assert.deepEqual(createConnectedReportsBridge(invalidSource).readSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
  assert.deepEqual(createConnectedReportsAdapter(invalidSource).getSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
});

test('snapshot final e mutacao posterior na origem permanecem seguros no runtime', async () => {
  const { createModernReportsRuntime } = await loadRuntimeModule();
  const sourceSnapshot = createValidSnapshot();
  const runtime = createModernReportsRuntime({
    reportsSource: createSnapshotSource(sourceSnapshot),
  });

  const snapshot = runtime.reportsAdapter.getSnapshot();
  sourceSnapshot.notice = 'mutado';
  sourceSnapshot.summary.totalValue = 9999;
  sourceSnapshot.items[0].ticker = 'TROCADO';

  assert.equal(snapshot.notice, 'Snapshot legado somente leitura. React nao escreve na fonte.');
  assert.equal(snapshot.summary.totalValue, 900);
  assert.equal(snapshot.items[0].ticker, 'PETR4');
  assertFrozenSnapshot(snapshot);
});

test('mutacao posterior na fonte nao altera snapshot do React', async () => {
  const { createConnectedReportsAdapter } = await loadIntegrationModule();
  const sourceSnapshot = createValidSnapshot();
  const source = createSnapshotSource(sourceSnapshot);
  const adapter = createConnectedReportsAdapter(source);

  const snapshot = adapter.getSnapshot();
  sourceSnapshot.notice = 'mutado';
  sourceSnapshot.summary.totalValue = 9999;
  sourceSnapshot.items[0].ticker = 'TROCADO';

  assert.equal(snapshot.notice, 'Snapshot legado somente leitura. React nao escreve na fonte.');
  assert.equal(snapshot.summary.totalValue, 900);
  assert.equal(snapshot.items[0].ticker, 'PETR4');
  assertFrozenSnapshot(snapshot);
});

test('runtime e react nao importam legado nem reintroduzem calculos', async () => {
  const runtimeText = fs.readFileSync(runtimeModulePath, 'utf8');
  const mountText = fs.readFileSync(mountModulePath, 'utf8');
  const sourceText = fs.readFileSync(integrationModulePath, 'utf8');
  const appText = fs.readFileSync(appModulePath, 'utf8');
  const mainText = fs.readFileSync(mainModulePath, 'utf8');

  for (const forbidden of [
    'legacy/reports-readonly-source.js',
    '@legacy-reports-readonly-source',
    'globalThis',
    'assetAppliedValue',
    'assetCurrentValue',
    'totalValueCalculator',
    'averageVariationPctCalculator',
    'allocationPctCalculator',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'firebase',
    'Firebase',
    'auth',
    'Auth',
    /\bsync\b/,
    'backup',
  ]) {
    const matchesRuntime = forbidden instanceof RegExp ? forbidden.test(runtimeText) : runtimeText.includes(forbidden);
    const matchesIntegration = forbidden instanceof RegExp ? forbidden.test(sourceText) : sourceText.includes(forbidden);
    const matchesApp = forbidden instanceof RegExp ? forbidden.test(appText) : appText.includes(forbidden);
    const matchesMain = forbidden instanceof RegExp ? forbidden.test(mainText) : mainText.includes(forbidden);
    const matchesMount = forbidden instanceof RegExp ? forbidden.test(mountText) : mountText.includes(forbidden);
    assert.equal(matchesRuntime, false, `Forbidden reference found in runtime: ${forbidden}`);
    assert.equal(matchesIntegration, false, `Forbidden reference found in integration: ${forbidden}`);
    assert.equal(matchesApp, false, `Forbidden reference found in app: ${forbidden}`);
    assert.equal(matchesMain, false, `Forbidden reference found in main: ${forbidden}`);
    assert.equal(matchesMount, false, `Forbidden reference found in mount: ${forbidden}`);
  }

  for (const forbidden of ['document', 'window']) {
    assert.equal(runtimeText.includes(forbidden), false, `Forbidden reference found in runtime: ${forbidden}`);
    assert.equal(sourceText.includes(forbidden), false, `Forbidden reference found in integration: ${forbidden}`);
    assert.equal(mountText.includes(forbidden), false, `Forbidden reference found in mount: ${forbidden}`);
  }

  const viteText = fs.readFileSync(viteConfigPath, 'utf8');

  assert.match(appText, /interface AppProps/);
  assert.match(appText, /reportsAdapter: ReadOnlyReportsAdapter/);
  assert.match(mainText, /createModernReportsRuntime/);
  assert.match(mainText, /const modernReportsRuntime = createModernReportsRuntime\(\);/);
  assert.match(mainText, /mountModernApp\(\{/);
  assert.match(mainText, /AppComponent: App/);
  assert.match(mountText, /export function mountModernApp/);
  assert.match(mountText, /Base moderna ja montada neste root\./);
  assert.match(mountText, /Adapter moderno invalido\./);
  assert.match(mountText, /Componente moderno invalido\./);
  assert.match(mountText, /Elemento root nao encontrado para a base moderna\./);
  assert.match(runtimeText, /createConnectedReportsAdapter/);
  assert.match(runtimeText, /createConnectedReportsDemoSource/);
  assert.match(runtimeText, /reportsSource \?\? createConnectedReportsDemoSource\(\)/);
  assert.equal(appText.includes('legacyReportsReadonlyIntegration'), false);
  assert.equal(mainText.includes('createRoot'), false);
  assert.equal(mainText.includes('App reportsAdapter={modernReportsRuntime.reportsAdapter}'), false);
  assert.equal(mountText.includes('legacy/reports-readonly-source.js'), false);
  assert.equal(mountText.includes('globalThis'), false);
  assert.equal(mountText.includes("from '../App'"), false);

  assert.equal(viteText.includes('@legacy-reports-readonly-source'), false);
  assert.match(viteText, /optimizeDeps/);
  assert.match(viteText, /reports-readonly-source\.js/);
  assert.match(viteText, /report-asset-row\.js/);
  assert.equal(viteText.includes("target: 'esnext'"), false);
  assert.equal(viteText.includes("base: './'"), true);
});
