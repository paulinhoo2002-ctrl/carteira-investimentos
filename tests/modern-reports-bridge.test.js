const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

const bridgeModulePath = path.join(__dirname, '..', 'modern', 'src', 'features', 'reports', 'reportsReadonlyBridge.ts');
const adapterModulePath = path.join(__dirname, '..', 'modern', 'src', 'features', 'reports', 'reportsSnapshotAdapter.ts');

async function loadBridgeModule() {
  return import(pathToFileURL(bridgeModulePath).href);
}

async function loadAdapterModule() {
  return import(pathToFileURL(adapterModulePath).href);
}

function createValidSnapshot(overrides = {}) {
  return {
    version: 1,
    generatedAt: '15/07/2026, 10:30',
    notice: 'Snapshot preparado por fonte de teste',
    summary: {
      totalValue: 1234.56,
      itemCount: 2,
      averageVariationPct: 1.25,
    },
    items: [
      {
        ticker: 'TEST11',
        name: 'Teste Um',
        category: 'Acao demo',
        quantity: 10,
        averagePrice: 12.34,
        currentValue: 123.4,
        variationPct: 4.5,
        allocationPct: 50,
        trend: 'positive',
      },
      {
        ticker: 'TEST12',
        name: 'Teste Dois',
        category: 'FII demo',
        quantity: 20,
        averagePrice: 5.67,
        currentValue: 113.4,
        variationPct: -1.5,
        allocationPct: 50,
        trend: 'neutral',
      },
    ],
    ...overrides,
  };
}

function assertDeepFrozen(snapshot) {
  assert.equal(snapshot.version, 1);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.summary), true);
  assert.equal(Object.isFrozen(snapshot.items), true);

  for (const item of snapshot.items) {
    assert.equal(Object.isFrozen(item), true);
  }
}

test('snapshot valido e aceito pela ponte somente leitura', async () => {
  const { createReadOnlyReportsBridge } = await loadBridgeModule();
  const sourceSnapshot = createValidSnapshot();
  const bridge = createReadOnlyReportsBridge({
    getSnapshot() {
      return sourceSnapshot;
    },
  });

  const snapshot = bridge.readSnapshot();

  assert.deepEqual(snapshot, sourceSnapshot);
  assert.notEqual(snapshot, sourceSnapshot);
  assertDeepFrozen(snapshot);
});

test('snapshot sem versao continua aceito e normaliza para v1', async () => {
  const { createReadOnlyReportsBridge } = await loadBridgeModule();
  const sourceSnapshot = createValidSnapshot();
  delete sourceSnapshot.version;
  const bridge = createReadOnlyReportsBridge({
    getSnapshot() {
      return sourceSnapshot;
    },
  });

  const snapshot = bridge.readSnapshot();

  assert.equal(snapshot.version, 1);
  assert.deepEqual(snapshot, {
    ...sourceSnapshot,
    version: 1,
  });
  assert.notEqual(snapshot, sourceSnapshot);
  assertDeepFrozen(snapshot);
});

test('snapshot ausente usa fallback', async () => {
  const { READ_ONLY_REPORTS_FALLBACK_SNAPSHOT, createReadOnlyReportsBridge } = await loadBridgeModule();
  const bridge = createReadOnlyReportsBridge();

  assert.deepEqual(bridge.readSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
});

test('fonte que retorna null usa fallback', async () => {
  const { READ_ONLY_REPORTS_FALLBACK_SNAPSHOT, createReadOnlyReportsBridge } = await loadBridgeModule();
  const bridge = createReadOnlyReportsBridge({
    getSnapshot() {
      return null;
    },
  });

  assert.deepEqual(bridge.readSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
});

test('fonte que lança excecao usa fallback', async () => {
  const { READ_ONLY_REPORTS_FALLBACK_SNAPSHOT, createReadOnlyReportsBridge } = await loadBridgeModule();
  const bridge = createReadOnlyReportsBridge({
    getSnapshot() {
      throw new Error('boom');
    },
  });

  assert.deepEqual(bridge.readSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
});

test('item invalido usa fallback', async () => {
  const { READ_ONLY_REPORTS_FALLBACK_SNAPSHOT, createReadOnlyReportsBridge } = await loadBridgeModule();
  const bridge = createReadOnlyReportsBridge({
    getSnapshot() {
      return createValidSnapshot({
        items: [
          {
            ticker: '',
            name: 'Item invalido',
            category: 'Acao demo',
            quantity: 10,
            averagePrice: 12.34,
            currentValue: 123.4,
            variationPct: 4.5,
            allocationPct: 50,
            trend: 'positive',
          },
        ],
      });
    },
  });

  assert.deepEqual(bridge.readSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
});

test('summary invalido usa fallback', async () => {
  const { READ_ONLY_REPORTS_FALLBACK_SNAPSHOT, createReadOnlyReportsBridge } = await loadBridgeModule();
  const bridge = createReadOnlyReportsBridge({
    getSnapshot() {
      return createValidSnapshot({
        summary: {
          totalValue: 1234.56,
          itemCount: '2',
          averageVariationPct: 1.25,
        },
      });
    },
  });

  assert.deepEqual(bridge.readSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
});

test('NaN usa fallback', async () => {
  const { READ_ONLY_REPORTS_FALLBACK_SNAPSHOT, createReadOnlyReportsBridge } = await loadBridgeModule();
  const bridge = createReadOnlyReportsBridge({
    getSnapshot() {
      return createValidSnapshot({
        summary: {
          totalValue: Number.NaN,
          itemCount: 2,
          averageVariationPct: 1.25,
        },
      });
    },
  });

  assert.deepEqual(bridge.readSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
});

test('Infinity usa fallback', async () => {
  const { READ_ONLY_REPORTS_FALLBACK_SNAPSHOT, createReadOnlyReportsBridge } = await loadBridgeModule();
  const bridge = createReadOnlyReportsBridge({
    getSnapshot() {
      return createValidSnapshot({
        items: [
          {
            ticker: 'TEST11',
            name: 'Teste Um',
            category: 'Acao demo',
            quantity: Number.POSITIVE_INFINITY,
            averagePrice: 12.34,
            currentValue: 123.4,
            variationPct: 4.5,
            allocationPct: 50,
            trend: 'positive',
          },
          {
            ticker: 'TEST12',
            name: 'Teste Dois',
            category: 'FII demo',
            quantity: 20,
            averagePrice: 5.67,
            currentValue: 113.4,
            variationPct: -1.5,
            allocationPct: 50,
            trend: 'neutral',
          },
        ],
      });
    },
  });

  assert.deepEqual(bridge.readSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
});

test('category invalida usa fallback', async () => {
  const { READ_ONLY_REPORTS_FALLBACK_SNAPSHOT, createReadOnlyReportsBridge } = await loadBridgeModule();
  const bridge = createReadOnlyReportsBridge({
    getSnapshot() {
      return createValidSnapshot({
        items: [
          {
            ticker: 'TEST11',
            name: 'Teste Um',
            category: 'Cripto demo',
            quantity: 10,
            averagePrice: 12.34,
            currentValue: 123.4,
            variationPct: 4.5,
            allocationPct: 50,
            trend: 'positive',
          },
          {
            ticker: 'TEST12',
            name: 'Teste Dois',
            category: 'FII demo',
            quantity: 20,
            averagePrice: 5.67,
            currentValue: 113.4,
            variationPct: -1.5,
            allocationPct: 50,
            trend: 'neutral',
          },
        ],
      });
    },
  });

  assert.deepEqual(bridge.readSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
});

test('versao desconhecida usa fallback', async () => {
  const { READ_ONLY_REPORTS_FALLBACK_SNAPSHOT, createReadOnlyReportsBridge } = await loadBridgeModule();
  const bridge = createReadOnlyReportsBridge({
    getSnapshot() {
      return {
        ...createValidSnapshot(),
        version: 2,
      };
    },
  });

  assert.deepEqual(bridge.readSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
});

test('trend invalido usa fallback', async () => {
  const { READ_ONLY_REPORTS_FALLBACK_SNAPSHOT, createReadOnlyReportsBridge } = await loadBridgeModule();
  const bridge = createReadOnlyReportsBridge({
    getSnapshot() {
      return createValidSnapshot({
        items: [
          {
            ticker: 'TEST11',
            name: 'Teste Um',
            category: 'Acao demo',
            quantity: 10,
            averagePrice: 12.34,
            currentValue: 123.4,
            variationPct: 4.5,
            allocationPct: 50,
            trend: 'upward',
          },
          {
            ticker: 'TEST12',
            name: 'Teste Dois',
            category: 'FII demo',
            quantity: 20,
            averagePrice: 5.67,
            currentValue: 113.4,
            variationPct: -1.5,
            allocationPct: 50,
            trend: 'neutral',
          },
        ],
      });
    },
  });

  assert.deepEqual(bridge.readSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
});

test('resultado retornado fica congelado', async () => {
  const { createReadOnlyReportsBridge } = await loadBridgeModule();
  const bridge = createReadOnlyReportsBridge({
    getSnapshot() {
      return createValidSnapshot();
    },
  });

  const snapshot = bridge.readSnapshot();
  assertDeepFrozen(snapshot);
});

test('mutacao da fonte depois da leitura nao altera snapshot entregue', async () => {
  const { createReadOnlyReportsBridge } = await loadBridgeModule();
  const sourceSnapshot = createValidSnapshot();
  const bridge = createReadOnlyReportsBridge({
    getSnapshot() {
      return sourceSnapshot;
    },
  });

  const snapshot = bridge.readSnapshot();
  sourceSnapshot.notice = 'Mutado depois da leitura';
  sourceSnapshot.summary.totalValue = 9999;
  sourceSnapshot.items[0].ticker = 'TROCADO';

  assert.equal(snapshot.notice, 'Snapshot preparado por fonte de teste');
  assert.equal(snapshot.summary.totalValue, 1234.56);
  assert.equal(snapshot.items[0].ticker, 'TEST11');
});

test('adapter somente leitura devolve snapshot congelado da ponte', async () => {
  const { createReadOnlyReportsAdapter } = await loadAdapterModule();
  const adapter = createReadOnlyReportsAdapter({
    getSnapshot() {
      return createValidSnapshot();
    },
  });

  const snapshot = adapter.getSnapshot();
  assertDeepFrozen(snapshot);
});
