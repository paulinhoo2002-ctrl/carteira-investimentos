const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const modulePath = path.join(__dirname, '..', 'legacy', 'reports-readonly-source.js');
const {
  LEGACY_REPORT_CATEGORY_MAP,
  LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT,
  buildLegacyReportsReadonlySnapshot,
  createLegacyAssetsReadonlyProvider,
  createLegacyReportsReadonlySource,
} = require(modulePath);

function makeBaseDeps(overrides = {}) {
  return {
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
    ...overrides,
  };
}

function makeAssets() {
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
}

function assertFrozenSnapshot(snapshot) {
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.summary), true);
  assert.equal(Object.isFrozen(snapshot.items), true);

  for (const item of snapshot.items) {
    assert.equal(Object.isFrozen(item), true);
  }
}

test('fonte aceita coleção vazia', () => {
  const source = createLegacyReportsReadonlySource({
    getAssets() {
      return [];
    },
    getGeneratedAt() {
      return '2026-07-14T10:30:00.000Z';
    },
  });

  const snapshot = source.getSnapshot();
  const directSnapshot = buildLegacyReportsReadonlySnapshot([], {
    getGeneratedAt() {
      return '2026-07-14T10:30:00.000Z';
    },
  });

  assert.deepEqual(snapshot, {
    generatedAt: '2026-07-14T10:30:00.000Z',
    notice: 'Snapshot legado somente leitura. React nao escreve na fonte.',
    summary: {
      totalValue: 0,
      itemCount: 0,
      averageVariationPct: 0,
    },
    items: [],
  });
  assert.deepEqual(directSnapshot, snapshot);
  assertFrozenSnapshot(snapshot);
});

test('fonte produz snapshot valido com calculos legados', () => {
  const source = createLegacyReportsReadonlySource({
    getAssets() {
      return makeAssets();
    },
    ...makeBaseDeps(),
  });

  const snapshot = source.getSnapshot();

  assert.equal(snapshot.generatedAt, '2026-07-14T10:30:00.000Z');
  assert.equal(snapshot.notice, 'Snapshot legado somente leitura. React nao escreve na fonte.');
  assert.equal(snapshot.summary.totalValue, 900);
  assert.equal(snapshot.summary.itemCount, 3);
  assert.equal(snapshot.summary.averageVariationPct, 5);
  assert.deepEqual(snapshot.items.map((item) => item.category), [
    LEGACY_REPORT_CATEGORY_MAP.Ação,
    LEGACY_REPORT_CATEGORY_MAP.FII,
    LEGACY_REPORT_CATEGORY_MAP.ETF,
  ]);
  assert.deepEqual(snapshot.items.map((item) => item.trend), ['positive', 'negative', 'neutral']);
  assertFrozenSnapshot(snapshot);
});

test('categoria ausente usa fallback controlado', () => {
  const source = createLegacyReportsReadonlySource({
    getAssets() {
      return makeAssets();
    },
    ...makeBaseDeps({
      buildReportAssetRow(asset, deps) {
        const row = makeBaseDeps().buildReportAssetRow(asset, deps);
        delete row.type;
        return row;
      },
    }),
  });

  assert.deepEqual(source.getSnapshot(), LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT);
});

test('categoria desconhecida usa fallback controlado', () => {
  const source = createLegacyReportsReadonlySource({
    getAssets() {
      return makeAssets();
    },
    ...makeBaseDeps({
      buildReportAssetRow(asset, deps) {
        const row = makeBaseDeps().buildReportAssetRow(asset, deps);
        row.type = 'Cripto';
        return row;
      },
    }),
  });

  assert.deepEqual(source.getSnapshot(), LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT);
});

test('agregacao nao finita usa fallback controlado', () => {
  const source = createLegacyReportsReadonlySource({
    getAssets() {
      return makeAssets();
    },
    ...makeBaseDeps({
      totalValueCalculator() {
        return Number.NaN;
      },
    }),
  });

  assert.deepEqual(source.getSnapshot(), LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT);
});

test('averageVariationPct nao finita usa fallback controlado', () => {
  const source = createLegacyReportsReadonlySource({
    getAssets() {
      return makeAssets();
    },
    ...makeBaseDeps({
      averageVariationPctCalculator() {
        return Number.POSITIVE_INFINITY;
      },
    }),
  });

  assert.deepEqual(source.getSnapshot(), LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT);
});

test('resultado nao reutiliza referencias mutaveis da entrada', () => {
  const assets = makeAssets();
  const source = createLegacyReportsReadonlySource({
    getAssets() {
      return assets;
    },
    ...makeBaseDeps(),
  });

  const snapshot = source.getSnapshot();
  const cloned = JSON.parse(JSON.stringify(snapshot));

  assets[0].name = 'Mutado';
  assets[0].current_price = 999;
  assets.push({
    ticker: 'NOVO3',
    name: 'Novo',
    type: 'Ação',
    qty: 1,
    avg_price: 1,
    current_price: 1,
  });

  assert.deepEqual(snapshot, cloned);
  assert.equal(snapshot.items[0].name, 'Petrobras');
  assert.equal(snapshot.items.length, 3);
});

test('fonte nao modifica a colecao recebida', () => {
  const assets = makeAssets();
  const before = JSON.parse(JSON.stringify(assets));
  const source = createLegacyReportsReadonlySource({
    getAssets() {
      return assets;
    },
    ...makeBaseDeps(),
  });

  source.getSnapshot();

  assert.deepEqual(assets, before);
});

test('fonte nao polui globalThis ao carregar', () => {
  const before = new Set(Object.getOwnPropertyNames(globalThis));
  delete require.cache[require.resolve(modulePath)];
  const loaded = require(modulePath);
  const after = new Set(Object.getOwnPropertyNames(globalThis));

  for (const name of [
    'createLegacyAssetsReadonlyProvider',
    'createLegacyReportsReadonlySource',
    'buildLegacyReportsReadonlySnapshot',
    'LEGACY_REPORT_CATEGORY_MAP',
    'LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT',
  ]) {
    assert.equal(before.has(name), false);
    assert.equal(after.has(name), false);
  }

  assert.equal(typeof loaded.installLegacyReportsReadonlySource, 'function');
});

test('provider le getAssets somente quando getSnapshot e chama builder canônico', () => {
  let assets = makeAssets();
  let getAssetsCalls = 0;
  let buildCalls = 0;

  const source = createLegacyAssetsReadonlyProvider({
    getAssets() {
      getAssetsCalls += 1;
      return assets;
    },
    getGeneratedAt() {
      return '2026-07-14T10:30:00.000Z';
    },
    ...makeBaseDeps({
      buildReportAssetRow(asset, deps) {
        buildCalls += 1;
        return makeBaseDeps().buildReportAssetRow(asset, deps);
      },
    }),
  });

  assert.equal(getAssetsCalls, 0);

  const firstSnapshot = source.getSnapshot();
  assert.equal(getAssetsCalls, 1);
  assert.equal(buildCalls, 3);

  assets = assets.map((asset, index) =>
    index === 0 ? { ...asset, current_price: 27 } : asset,
  );

  const secondSnapshot = source.getSnapshot();

  assert.equal(getAssetsCalls, 2);
  assert.equal(buildCalls, 6);
  assert.notDeepEqual(secondSnapshot, firstSnapshot);
  assert.equal(firstSnapshot.summary.totalValue, 900);
  assert.equal(secondSnapshot.summary.totalValue, 920);
  assert.equal(Object.isFrozen(firstSnapshot), true);
  assert.equal(Object.isFrozen(firstSnapshot.summary), true);
  assert.equal(Object.isFrozen(firstSnapshot.items), true);
  assert.equal(Object.isFrozen(firstSnapshot.items[0]), true);
  assert.equal(Object.isFrozen(secondSnapshot.items[0]), true);
});

test('provider trata coleção inválida, exceção e builder com erro', () => {
  const invalidObjectSource = createLegacyAssetsReadonlyProvider({
    getAssets() {
      return { assets: makeAssets() };
    },
    ...makeBaseDeps(),
  });

  assert.deepEqual(invalidObjectSource.getSnapshot(), LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT);

  const throwingAssetsSource = createLegacyAssetsReadonlyProvider({
    getAssets() {
      throw new Error('boom');
    },
    ...makeBaseDeps(),
  });

  assert.deepEqual(throwingAssetsSource.getSnapshot(), LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT);

  const throwingBuilderSource = createLegacyAssetsReadonlyProvider({
    getAssets() {
      return makeAssets();
    },
    ...makeBaseDeps({
      buildReportAssetRow() {
        throw new Error('boom');
      },
    }),
  });

  assert.deepEqual(throwingBuilderSource.getSnapshot(), LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT);
});

test('fonte nao chama storage, Firebase, Auth, sync, backup ou DOM', () => {
  const sourceText = require('node:fs').readFileSync(modulePath, 'utf8');

  for (const forbidden of [
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'firebase',
    'Firebase',
    'auth',
    'Auth',
    'sync',
    'backup',
    'document',
    'window',
    'fetch(',
    'axios',
    'XMLHttpRequest',
  ]) {
    assert.equal(sourceText.includes(forbidden), false, `Forbidden reference found: ${forbidden}`);
  }
});

test('nenhum import moderno entra na fonte', () => {
  const sourceText = require('node:fs').readFileSync(modulePath, 'utf8');

  assert.equal(sourceText.includes('modern/'), false);
  assert.equal(sourceText.includes('../modern'), false);
  assert.equal(sourceText.includes('src/features/reports/reportsReadonlyBridge'), false);
});
