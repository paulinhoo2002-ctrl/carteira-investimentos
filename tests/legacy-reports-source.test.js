const assert = require('node:assert/strict');
const test = require('node:test');

const {
  LEGACY_REPORT_CATEGORY_MAP,
  LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT,
  buildLegacyReportsReadonlySnapshot,
  createLegacyReportsReadonlySource,
} = require('../legacy/reports-readonly-source.js');

function makeDeps(overrides = {}) {
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
    metaTicker(ticker) {
      return { type: String(ticker || '').includes('11') ? 'FII' : 'Ação', sector: 'Carteira' };
    },
    normalizeType(value, fallback) {
      return value || fallback;
    },
    buildReportAssetRow(asset, deps) {
      const applied = deps.assetAppliedValue(asset);
      const current = deps.assetCurrentValue(asset);
      const result = current - applied;

      return {
        ticker: String(asset.ticker || '').trim(),
        name: String(asset.name || asset.ticker || '').trim(),
        type: String(asset.type || deps.metaTicker(asset.ticker).type || 'Ação').trim(),
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
    ...makeDeps(),
  });

  const snapshot = source.getSnapshot();

  assert.equal(snapshot.generatedAt, '2026-07-14T10:30:00.000Z');
  assert.equal(snapshot.notice, 'Snapshot legado somente leitura. React nao escreve na fonte.');
  assert.equal(snapshot.summary.totalValue, 900);
  assert.equal(snapshot.summary.itemCount, 3);
  assert.equal(snapshot.summary.averageVariationPct, 5);
  assert.deepEqual(snapshot.items.map((item) => item.category), [
    LEGACY_REPORT_CATEGORY_MAP['Ação'],
    LEGACY_REPORT_CATEGORY_MAP.FII,
    LEGACY_REPORT_CATEGORY_MAP.ETF,
  ]);
  assert.deepEqual(snapshot.items.map((item) => item.trend), ['positive', 'negative', 'neutral']);
  assert.deepEqual(snapshot.items.map((item) => item.allocationPct), [250 / 9, 450 / 9, 200 / 9]);
  assertFrozenSnapshot(snapshot);
});

test('totalValue e itemCount saem de calculos existentes', () => {
  const assets = [
    {
      ticker: 'ABCD11',
      name: 'Ativo 1',
      type: 'FII',
      qty: 2,
      avg_price: 50,
      current_price: 60,
    },
    {
      ticker: 'EFGH3',
      name: 'Ativo 2',
      type: 'Ação',
      qty: 3,
      avg_price: 20,
      current_price: 15,
    },
  ];

  const source = createLegacyReportsReadonlySource({
    getAssets() {
      return assets;
    },
    ...makeDeps(),
  });

  const snapshot = source.getSnapshot();

  assert.equal(snapshot.summary.totalValue, 165);
  assert.equal(snapshot.summary.itemCount, 2);
  assert.equal(snapshot.items[0].currentValue + snapshot.items[1].currentValue, 165);
});

test('averageVariationPct usa regra de media dos ativos', () => {
  const source = createLegacyReportsReadonlySource({
    getAssets() {
      return [
        {
          ticker: 'AAA11',
          name: 'A',
          type: 'FII',
          qty: 1,
          avg_price: 100,
          current_price: 125,
        },
        {
          ticker: 'BBB3',
          name: 'B',
          type: 'Ação',
          qty: 1,
          avg_price: 100,
          current_price: 75,
        },
        {
          ticker: 'CCC11',
          name: 'C',
          type: 'ETF',
          qty: 1,
          avg_price: 100,
          current_price: 100,
        },
      ];
    },
    ...makeDeps(),
  });

  const snapshot = source.getSnapshot();

  assert.equal(snapshot.summary.averageVariationPct, 0);
  assert.deepEqual(snapshot.items.map((item) => item.variationPct), [25, -25, 0]);
});

test('categoria e trend sao mapeadas corretamente', () => {
  const source = createLegacyReportsReadonlySource({
    getAssets() {
      return [
        {
          ticker: 'AAA11',
          name: 'A',
          type: 'Ação',
          qty: 1,
          avg_price: 100,
          current_price: 101,
        },
        {
          ticker: 'BBB11',
          name: 'B',
          type: 'FII',
          qty: 1,
          avg_price: 100,
          current_price: 100,
        },
        {
          ticker: 'CCC3',
          name: 'C',
          type: 'ETF',
          qty: 1,
          avg_price: 100,
          current_price: 99,
        },
      ];
    },
    ...makeDeps(),
  });

  const snapshot = source.getSnapshot();

  assert.deepEqual(snapshot.items.map((item) => item.category), [
    'Acao demo',
    'FII demo',
    'ETF demo',
  ]);
  assert.deepEqual(snapshot.items.map((item) => item.trend), [
    'positive',
    'neutral',
    'negative',
  ]);
});

test('dados invalidos retornam fallback controlado', () => {
  const source = createLegacyReportsReadonlySource({
    getAssets() {
      return makeAssets();
    },
    ...makeDeps({
      buildReportAssetRow() {
        return {
          ticker: 'AAA11',
          name: 'Item',
          type: 'Cripto',
          qty: 1,
          avgPrice: 10,
          current: Number.POSITIVE_INFINITY,
          resultPct: Number.NaN,
        };
      },
    }),
  });

  assert.deepEqual(source.getSnapshot(), LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT);
});

test('NaN e Infinity nao vazam para snapshot', () => {
  const source = createLegacyReportsReadonlySource({
    getAssets() {
      return makeAssets();
    },
    ...makeDeps({
      assetCurrentValue() {
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
    ...makeDeps(),
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
    ...makeDeps(),
  });

  source.getSnapshot();

  assert.deepEqual(assets, before);
});

test('fonte nao chama storage, Firebase, Auth, sync, backup ou DOM', () => {
  const sourceText = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'legacy', 'reports-readonly-source.js'), 'utf8');

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
  const sourceText = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'legacy', 'reports-readonly-source.js'), 'utf8');

  assert.equal(sourceText.includes('modern/'), false);
  assert.equal(sourceText.includes('../modern'), false);
  assert.equal(sourceText.includes('src/features/reports/reportsReadonlyBridge'), false);
});
