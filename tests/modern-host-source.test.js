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
const runtimeModulePath = path.join(__dirname, '..', 'modern', 'src', 'bootstrap', 'modernReportsRuntime.ts');
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

function assertDeepFrozen(snapshot) {
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
