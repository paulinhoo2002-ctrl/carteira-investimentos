const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

const hostSourceModulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'bootstrap',
  'hostLegacyReportsReadonlySource.ts',
);
const fixedIncomeSourceModulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'bootstrap',
  'hostFixedIncomeReadonlySource.ts',
);
const runtimeModulePath = path.join(__dirname, '..', 'modern', 'src', 'bootstrap', 'modernReportsRuntime.ts');
const fixedIncomeRuntimeModulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'bootstrap',
  'modernFixedIncomeRuntime.ts',
);
const legacyModulePath = path.join(__dirname, '..', 'legacy', 'reports-readonly-source.js');

async function loadHostSourceModule() {
  return import(pathToFileURL(hostSourceModulePath).href);
}

async function loadLegacyModule() {
  return import(pathToFileURL(legacyModulePath).href);
}

async function loadRuntimeModule() {
  return import(pathToFileURL(runtimeModulePath).href);
}

async function loadFixedIncomeSourceModule() {
  return import(pathToFileURL(fixedIncomeSourceModulePath).href);
}

async function loadFixedIncomeRuntimeModule() {
  return import(pathToFileURL(fixedIncomeRuntimeModulePath).href);
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

test('host source usa fonte legada readonly real e buildReportAssetRow', async () => {
  const before = new Set(Object.getOwnPropertyNames(globalThis));
  const { createHostLegacyReportsReadonlySource, HOST_LEGACY_REPORTS_ASSETS } = await loadHostSourceModule();

  const source = await createHostLegacyReportsReadonlySource();
  assert.ok(source);

  const snapshot = source.getSnapshot();
  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.generatedAt, '2026-07-14T10:30:00.000Z');
  assert.equal(snapshot.notice, 'Snapshot legado somente leitura. React nao escreve na fonte.');
  assert.equal(snapshot.summary.totalValue, 900);
  assert.equal(snapshot.summary.itemCount, 3);
  assert.equal(snapshot.summary.averageVariationPct, 5);
  assert.deepEqual(snapshot.items.map((item) => item.ticker), ['PETR4', 'MXRF11', 'BOVA11']);
  assert.deepEqual(snapshot.items.map((item) => item.category), ['Acao demo', 'FII demo', 'ETF demo']);
  assert.deepEqual(snapshot.items.map((item) => item.trend), ['positive', 'negative', 'neutral']);
  assertDeepFrozen(snapshot);
  assert.equal(Object.isFrozen(HOST_LEGACY_REPORTS_ASSETS), true);
  assert.equal(Object.isFrozen(HOST_LEGACY_REPORTS_ASSETS[0]), true);
  assert.equal(Object.isFrozen(HOST_LEGACY_REPORTS_ASSETS[1]), true);
  assert.equal(Object.isFrozen(HOST_LEGACY_REPORTS_ASSETS[2]), true);
  HOST_LEGACY_REPORTS_ASSETS[0].name = 'Mutado';
  assert.equal(HOST_LEGACY_REPORTS_ASSETS[0].name, 'Petrobras');
  assert.equal(Object.prototype.hasOwnProperty.call(globalThis, 'buildReportAssetRow'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(globalThis, 'createLegacyReportsReadonlySource'), false);
  assert.equal(HOST_LEGACY_REPORTS_ASSETS.length, 3);
  assert.equal(HOST_LEGACY_REPORTS_ASSETS[0].source, 'host-experimental');

  const { createModernReportsRuntime } = await loadRuntimeModule();
  const runtime = createModernReportsRuntime({ reportsSource: source });
  const runtimeSnapshot = runtime.reportsAdapter.getSnapshot();
  assert.equal(runtimeSnapshot.version, 1);
  assert.deepEqual(runtimeSnapshot, snapshot);
  assert.notDeepEqual(runtimeSnapshot, createModernReportsRuntime().reportsAdapter.getSnapshot());
  assertDeepFrozen(runtimeSnapshot);

  const after = new Set(Object.getOwnPropertyNames(globalThis));
  assert.deepEqual([...after].sort(), [...before].sort());
});

test('host source usa fallback quando dependencia obrigatoria falta', async () => {
  const { createHostLegacyReportsReadonlySource } = await loadHostSourceModule();

  assert.equal(await createHostLegacyReportsReadonlySource({ legacyModule: null }), null);
  assert.equal(await createHostLegacyReportsReadonlySource({ buildReportAssetRowModule: null }), null);
});

test('host source retorna fallback controlado quando getAssets falha', async () => {
  const { LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT } = await loadLegacyModule();
  const { createHostLegacyReportsReadonlySource } = await loadHostSourceModule();

  const source = await createHostLegacyReportsReadonlySource({
    getAssets() {
      throw new Error('boom');
    },
  });

  assert.ok(source);
  assert.deepEqual(source.getSnapshot(), LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT);
});

test('host source reflete a colecao atual injetada por dependencia explicita', async () => {
  const { createHostLegacyReportsReadonlySource } = await loadHostSourceModule();

  let assets = [
    {
      ticker: 'PETR4',
      name: 'Petrobras',
      type: 'AÃ§Ã£o',
      sector: 'Energia',
      qty: 10,
      avg_price: 20,
      current_price: 25,
      applied: 200,
      current: 250,
      source: 'host-experimental',
      updated_at: '2026-07-14T10:30:00.000Z',
    },
  ];

  const source = await createHostLegacyReportsReadonlySource({
    getAssets() {
      return assets;
    },
    getGeneratedAt() {
      return '2026-07-14T10:30:00.000Z';
    },
  });

  const firstSnapshot = source.getSnapshot();
  assets = [
    {
      ...assets[0],
      current_price: 27,
      current: 270,
    },
  ];
  const secondSnapshot = source.getSnapshot();

  assert.equal(firstSnapshot.summary.totalValue, 250);
  assert.equal(secondSnapshot.summary.totalValue, 270);
  assert.notDeepEqual(secondSnapshot, firstSnapshot);
  assert.equal(Object.isFrozen(firstSnapshot), true);
  assert.equal(Object.isFrozen(secondSnapshot), true);
});

test('host fixed income source usa carteira ativa e relÃª a colecao atual', async () => {
  const { createHostFixedIncomeReadonlySource } = await loadFixedIncomeSourceModule();

  let assets = [
    {
      ticker: 'CDB26',
      name: 'CDB 2026',
      type: 'Renda Fixa',
      sector: 'Renda Fixa',
      rf_subtype: 'CDB',
      fixed_issuer: 'Banco Teste',
      rf_application_date: '2026-01-12',
      rf_maturity_date: '2026-07-20',
      rf_contract_rate: 'CDI + 0,95% aa',
      fixed_indexer: 'CDI',
      rf_applied_value: 4000,
      rf_gross_value: 4128.2,
      rf_liquid_value: 4120.4,
      rf_profit_value: 120.4,
      rf_ir_iof: 7.8,
      rf_unavailable_value: 0,
      rf_note: 'Demo CDB',
    },
  ];

  const source = createHostFixedIncomeReadonlySource({
    getAssets() {
      return assets;
    },
    getGeneratedAt() {
      return '2026-07-14T10:30:00.000Z';
    },
  });

  const firstSnapshot = source.getSnapshot();
  assert.equal(firstSnapshot.summary.totalApplied, null);
  assert.equal(firstSnapshot.summary.totalCombinedTaxValue, null);
  assert.equal(firstSnapshot.items[0].maturityStatus, 'Próximo');
  assert.equal(firstSnapshot.items[0].appliedValue, 4000);
  assert.equal(firstSnapshot.items[0].irValue, null);
  assert.equal(firstSnapshot.items[0].iofValue, null);
  assert.equal(firstSnapshot.items[0].combinedTaxValue, 7.8);
  assertDeepFrozen(firstSnapshot);

  assets = [
    {
      ...assets[0],
      rf_liquid_value: 4300,
      rf_profit_value: 300,
      rf_ir_iof: 10,
    },
  ];

  const secondSnapshot = source.getSnapshot();
  assert.equal(secondSnapshot.summary.totalLiquid, null);
  assert.equal(secondSnapshot.summary.totalCombinedTaxValue, null);
  assert.equal(secondSnapshot.items[0].liquidValue, 4300);
  assert.equal(secondSnapshot.items[0].irValue, null);
  assert.equal(secondSnapshot.items[0].iofValue, null);
  assert.equal(secondSnapshot.items[0].combinedTaxValue, 10);
  assert.notDeepEqual(secondSnapshot, firstSnapshot);
  assertDeepFrozen(secondSnapshot);
});

test('host fixed income source retorna fallback controlado quando leitura falha', async () => {
  const { createHostFixedIncomeReadonlySource } = await loadFixedIncomeSourceModule();

  const source = createHostFixedIncomeReadonlySource({
    getAssets() {
      throw new Error('boom');
    },
  });

  const snapshot = source.getSnapshot();

  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.generatedAt, '1970-01-01T00:00:00.000Z');
  assert.equal(snapshot.summary.itemCount, 0);
  assert.equal(snapshot.summary.totalCombinedTaxValue, null);
  assert.equal(snapshot.items.length, 0);
  assertDeepFrozen(snapshot);
});

test('host fixed income runtime usa demo quando origem real nao existe', async () => {
  const { createModernFixedIncomeRuntime } = await loadFixedIncomeRuntimeModule();

  const runtime = createModernFixedIncomeRuntime();
  const snapshot = runtime.fixedIncomeAdapter.getSnapshot();

  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.items.length, 3);
  assert.equal(snapshot.summary.totalCombinedTaxValue, 50);
  assertDeepFrozen(snapshot);
});

test('host fixed income source rejeita candidatos que nao sao renda fixa', async () => {
  const { createHostFixedIncomeReadonlySource } = await loadFixedIncomeSourceModule();

  const source = createHostFixedIncomeReadonlySource({
    getAssets() {
      return [
        {
          ticker: 'PETR4',
          name: 'Petrobras',
          type: 'Ação',
          sector: 'Energia',
        },
        {
          ticker: 'MXRF11',
          name: 'Maxi Renda',
          type: 'FII',
          sector: 'Fundos Imobiliários',
        },
        {
          ticker: 'BOVA11',
          name: 'BOVA11',
          type: 'ETF',
          sector: 'ETFs',
        },
        {
          name: 'Registro incompleto',
          type: 'Outro',
        },
      ];
    },
    getGeneratedAt() {
      return '2026-07-14T10:30:00.000Z';
    },
  });

  const snapshot = source.getSnapshot();

  assert.equal(snapshot.items.length, 0);
  assert.equal(snapshot.summary.itemCount, 0);
  assert.equal(snapshot.summary.totalCombinedTaxValue, null);
  assertDeepFrozen(snapshot);
});
