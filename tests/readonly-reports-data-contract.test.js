const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const contractModulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'features',
  'reports',
  'reportsReadonlyContract.js',
);
const bridgeModulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'features',
  'reports',
  'reportsReadonlyBridge.js',
);
const adapterModulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'features',
  'reports',
  'reportsSnapshotAdapter.js',
);

async function loadContractModule() {
  return require(contractModulePath);
}

async function loadBridgeModule() {
  return require(bridgeModulePath);
}

async function loadAdapterModule() {
  return require(adapterModulePath);
}

function createSnapshot(overrides = {}) {
  return {
    version: 1,
    generatedAt: '2026-07-14T10:30:00.000Z',
    notice: 'Snapshot preparado por contrato de teste',
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
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.summary), true);
  assert.equal(Object.isFrozen(snapshot.items), true);

  for (const item of snapshot.items) {
    assert.equal(Object.isFrozen(item), true);
  }
}

test('contrato v1 valido e fallback versionado', async () => {
  const {
    READ_ONLY_REPORTS_CONTRACT_VERSION,
    READ_ONLY_REPORTS_FALLBACK_SNAPSHOT,
    isReadOnlyReportsSnapshot,
    normalizeReadOnlyReportsSnapshot,
  } = await loadContractModule();

  const snapshot = normalizeReadOnlyReportsSnapshot(createSnapshot());

  assert.equal(READ_ONLY_REPORTS_CONTRACT_VERSION, 1);
  assert.equal(isReadOnlyReportsSnapshot(createSnapshot()), true);
  assert.equal(isReadOnlyReportsSnapshot({ ...createSnapshot(), version: 2 }), false);
  assert.equal(READ_ONLY_REPORTS_FALLBACK_SNAPSHOT.version, 1);
  assert.equal(snapshot.version, 1);
  assert.deepEqual(snapshot, createSnapshot());
  assert.notEqual(snapshot, createSnapshot());
  assertDeepFrozen(snapshot);
  assertDeepFrozen(READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
});

test('payload sem versao continua aceito e normaliza para v1', async () => {
  const { normalizeReadOnlyReportsSnapshot } = await loadContractModule();
  const sourceSnapshot = createSnapshot();
  delete sourceSnapshot.version;

  const snapshot = normalizeReadOnlyReportsSnapshot(sourceSnapshot);

  assert.equal(snapshot.version, 1);
  assert.deepEqual(snapshot, createSnapshot());
  assert.notEqual(snapshot, sourceSnapshot);
  assertDeepFrozen(snapshot);
});

test('versao futura ou payload invalido cai no fallback seguro', async () => {
  const { READ_ONLY_REPORTS_FALLBACK_SNAPSHOT, normalizeReadOnlyReportsSnapshot } = await loadContractModule();

  const invalidCases = [
    null,
    undefined,
    {},
    { version: 2 },
    { ...createSnapshot(), version: 2 },
    { ...createSnapshot(), generatedAt: '' },
    { ...createSnapshot(), notice: '' },
    { ...createSnapshot(), summary: null },
    { ...createSnapshot(), summary: { totalValue: NaN, itemCount: 2, averageVariationPct: 1.25 } },
    { ...createSnapshot(), summary: { totalValue: Infinity, itemCount: 2, averageVariationPct: 1.25 } },
    { ...createSnapshot(), items: 'invalid' },
    { ...createSnapshot(), items: [] },
    {
      ...createSnapshot(),
      items: [
        {
          ticker: '',
          name: 'Invalido',
          category: 'Acao demo',
          quantity: 10,
          averagePrice: 12.34,
          currentValue: 123.4,
          variationPct: 4.5,
          allocationPct: 50,
          trend: 'positive',
        },
      ],
    },
  ];

  for (const candidate of invalidCases) {
    assert.deepEqual(normalizeReadOnlyReportsSnapshot(candidate), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
  }
});

test('bridge aceita contrato v1 e adapter preserva snapshot versionado', async () => {
  const { createReadOnlyReportsBridge } = await loadBridgeModule();
  const { createReadOnlyReportsAdapter } = await loadAdapterModule();
  const sourceSnapshot = createSnapshot();
  delete sourceSnapshot.version;
  const source = {
    getSnapshot() {
      return sourceSnapshot;
    },
  };

  const bridge = createReadOnlyReportsBridge(source);
  const adapter = createReadOnlyReportsAdapter(source);
  const bridgedSnapshot = bridge.readSnapshot();
  const adaptedSnapshot = adapter.getSnapshot();

  assert.equal(bridgedSnapshot.version, 1);
  assert.equal(adaptedSnapshot.version, 1);
  assert.deepEqual(bridgedSnapshot, createSnapshot());
  assert.deepEqual(adaptedSnapshot, createSnapshot());
  assertDeepFrozen(bridgedSnapshot);
  assertDeepFrozen(adaptedSnapshot);
});

test('mutacao posterior do payload nao altera snapshot entregue', async () => {
  const { normalizeReadOnlyReportsSnapshot } = await loadContractModule();
  const sourceSnapshot = createSnapshot();
  delete sourceSnapshot.version;
  const snapshot = normalizeReadOnlyReportsSnapshot(sourceSnapshot);

  sourceSnapshot.notice = 'Mutado';
  sourceSnapshot.summary.totalValue = 9999;
  sourceSnapshot.items[0].ticker = 'TROCADO';

  assert.equal(snapshot.notice, 'Snapshot preparado por contrato de teste');
  assert.equal(snapshot.summary.totalValue, 1234.56);
  assert.equal(snapshot.items[0].ticker, 'TEST11');
});
