const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

const legacySourceModulePath = path.join(__dirname, '..', 'legacy', 'reports-readonly-source.js');
const bridgeModulePath = path.join(__dirname, '..', 'modern', 'src', 'features', 'reports', 'reportsReadonlyBridge.ts');
const integrationModulePath = path.join(__dirname, '..', 'modern', 'src', 'features', 'reports', 'legacyReportsReadonlyIntegration.ts');

const { createLegacyReportsReadonlySource, LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT } = require(legacySourceModulePath);

async function loadIntegrationModule() {
  return import(pathToFileURL(integrationModulePath).href);
}

async function loadBridgeModule() {
  return import(pathToFileURL(bridgeModulePath).href);
}

function assertFrozenSnapshot(snapshot) {
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.summary), true);
  assert.equal(Object.isFrozen(snapshot.items), true);
  for (const item of snapshot.items) {
    assert.equal(Object.isFrozen(item), true);
  }
}

function makeLegacySourceFixture() {
  return createLegacyReportsReadonlySource({
    getGeneratedAt() {
      return '2026-07-14T10:30:00.000Z';
    },
    assetAppliedValue(asset) {
      return Number(asset.qty) * Number(asset.avg_price);
    },
    assetCurrentValue(asset) {
      return Number(asset.qty) * Number(asset.current_price);
    },
    buildReportAssetRow(asset, deps) {
      const applied = deps.assetAppliedValue(asset);
      const current = deps.assetCurrentValue(asset);
      const result = current - applied;

      return {
        ticker: String(asset.ticker || '').trim(),
        name: String(asset.name || asset.ticker || '').trim(),
        type: String(asset.type || '').trim(),
        qty: Number(asset.qty),
        avgPrice: Number(asset.avg_price),
        current: Number(current),
        resultPct: applied > 0 ? (result / applied) * 100 : 0,
      };
    },
    getAssets() {
      return [
        {
          ticker: 'PETR4',
          name: 'Petrobras',
          type: 'Ação',
          qty: 10,
          avg_price: 20,
          current_price: 25,
        },
        {
          ticker: 'MXRF11',
          name: 'Maxi Renda',
          type: 'FII',
          qty: 5,
          avg_price: 100,
          current_price: 90,
        },
        {
          ticker: 'BOVA11',
          name: 'BOVA',
          type: 'ETF',
          qty: 2,
          avg_price: 100,
          current_price: 100,
        },
      ];
    },
  });
}

test('integracao aceita fonte legada valida e entrega snapshot congelado', async () => {
  const {
    createLegacyReportsReadonlyBoundary,
    createConnectedReportsBridge,
    createConnectedReportsAdapter,
    LEGACY_REPORTS_READONLY_FIXTURE,
  } = await loadIntegrationModule();

  const boundary = createLegacyReportsReadonlyBoundary(makeLegacySourceFixture());
  const bridge = createConnectedReportsBridge(makeLegacySourceFixture());
  const adapter = createConnectedReportsAdapter(makeLegacySourceFixture());

  const boundarySnapshot = boundary.getSnapshot();
  const bridgeSnapshot = bridge.readSnapshot();
  const adapterSnapshot = adapter.getSnapshot();

  assert.equal(Array.isArray(LEGACY_REPORTS_READONLY_FIXTURE), true);
  assert.equal(boundarySnapshot.items.length, 3);
  assert.equal(bridgeSnapshot.summary.totalValue, 900);
  assert.equal(adapterSnapshot.summary.itemCount, 3);
  assert.deepEqual(adapterSnapshot.items.map((item) => item.category), ['Acao demo', 'FII demo', 'ETF demo']);
  assert.deepEqual(adapterSnapshot.items.map((item) => item.trend), ['positive', 'negative', 'neutral']);
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
  const { createLegacyReportsReadonlyBoundary, createConnectedReportsBridge, createConnectedReportsAdapter } = await loadIntegrationModule();

  const nullSource = {
    getSnapshot() {
      return null;
    },
  };
  const throwingSource = {
    getSnapshot() {
      throw new Error('boom');
    },
  };

  assert.deepEqual(createConnectedReportsBridge(nullSource).readSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
  assert.deepEqual(createConnectedReportsAdapter(nullSource).getSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
  assert.deepEqual(createConnectedReportsBridge(throwingSource).readSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
  assert.deepEqual(createConnectedReportsAdapter(throwingSource).getSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
  assert.equal(createLegacyReportsReadonlyBoundary(nullSource).getSnapshot(), null);
});

test('snapshot invalido usa fallback', async () => {
  const { READ_ONLY_REPORTS_FALLBACK_SNAPSHOT } = await loadBridgeModule();
  const { createLegacyReportsReadonlyBoundary, createConnectedReportsBridge, createConnectedReportsAdapter } = await loadIntegrationModule();

  const invalidSource = {
    getSnapshot() {
      return {
        generatedAt: '15/07/2026, 10:30',
        notice: 'invalido',
        summary: { totalValue: NaN, itemCount: 1, averageVariationPct: Infinity },
        items: [{ ticker: '', name: '', category: 'Cripto demo' }],
      };
    },
  };

  assert.deepEqual(createConnectedReportsBridge(invalidSource).readSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
  assert.deepEqual(createConnectedReportsAdapter(invalidSource).getSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);

  const boundary = createLegacyReportsReadonlyBoundary(invalidSource);
  assert.deepEqual(boundary.getSnapshot(), invalidSource.getSnapshot());
});

test('mutacao posterior na fonte nao altera snapshot do React', async () => {
  const { createConnectedReportsAdapter } = await loadIntegrationModule();
  const sourceSnapshot = makeLegacySourceFixture().getSnapshot();
  const source = {
    getSnapshot() {
      return sourceSnapshot;
    },
  };
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

test('integracao nao polui globalThis nem duplica calculos', async () => {
  const before = new Set(Object.getOwnPropertyNames(globalThis));
  const module = await loadIntegrationModule();
  const after = new Set(Object.getOwnPropertyNames(globalThis));
  const sourceText = fs.readFileSync(integrationModulePath, 'utf8');

  for (const name of [
    'createLegacyReportsReadonlyBoundary',
    'createConnectedReportsBridge',
    'createConnectedReportsAdapter',
    'LEGACY_REPORTS_READONLY_FIXTURE',
  ]) {
    assert.equal(before.has(name), false);
    assert.equal(after.has(name), false);
  }

  assert.equal(typeof module.createConnectedReportsAdapter, 'function');
  for (const forbidden of [
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
    'globalThis',
    'assetAppliedValue',
    'assetCurrentValue',
    'totalValueCalculator',
    'averageVariationPctCalculator',
    'allocationPctCalculator',
  ]) {
    const matches = forbidden instanceof RegExp ? forbidden.test(sourceText) : sourceText.includes(forbidden);
    assert.equal(matches, false, `Forbidden reference found: ${forbidden}`);
  }
});
