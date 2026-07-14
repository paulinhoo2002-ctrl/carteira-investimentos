const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

const bridgeModulePath = path.join(__dirname, '..', 'modern', 'src', 'features', 'reports', 'reportsReadonlyBridge.ts');
const integrationModulePath = path.join(__dirname, '..', 'modern', 'src', 'features', 'reports', 'legacyReportsReadonlyIntegration.ts');
const appModulePath = path.join(__dirname, '..', 'modern', 'src', 'App.tsx');
const viteConfigPath = path.join(__dirname, '..', 'modern', 'vite.config.ts');

async function loadBridgeModule() {
  return import(pathToFileURL(bridgeModulePath).href);
}

async function loadIntegrationModule() {
  return import(pathToFileURL(integrationModulePath).href);
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

test('fonte fake valida percorre boundary, bridge e adapter', async () => {
  const {
    createLegacyReportsReadonlyBoundary,
    createConnectedReportsBridge,
    createConnectedReportsAdapter,
    createConnectedReportsDemoSource,
  } = await loadIntegrationModule();

  const sourceSnapshot = createValidSnapshot();
  const source = createSnapshotSource(sourceSnapshot);

  assert.deepEqual(createConnectedReportsDemoSource().getSnapshot(), createValidSnapshot());

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

test('integracao nao importa legado nem reintroduz calculos', async () => {
  const sourceText = fs.readFileSync(integrationModulePath, 'utf8');

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
    'document',
    'window',
  ]) {
    const matches = forbidden instanceof RegExp ? forbidden.test(sourceText) : sourceText.includes(forbidden);
    assert.equal(matches, false, `Forbidden reference found: ${forbidden}`);
  }
});

test('App recebe apenas adaptador moderno e vite sem alias legado', () => {
  const appText = fs.readFileSync(appModulePath, 'utf8');
  const viteText = fs.readFileSync(viteConfigPath, 'utf8');

  assert.match(appText, /createConnectedReportsAdapter\(createConnectedReportsDemoSource\(\)\)/);
  assert.match(appText, /AssetsReportPreview adapter=\{reportsAdapter\}/);
  assert.equal(appText.includes('legacy/reports-readonly-source.js'), false);
  assert.equal(appText.includes('@legacy-reports-readonly-source'), false);

  assert.equal(viteText.includes('@legacy-reports-readonly-source'), false);
  assert.equal(viteText.includes('optimizeDeps'), false);
  assert.equal(viteText.includes("target: 'esnext'"), false);
  assert.equal(viteText.includes("base: './'"), false);
});
