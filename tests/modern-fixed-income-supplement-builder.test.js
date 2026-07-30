const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

const builderModulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'features',
  'fixed-income',
  'fixedIncomeReadonlySupplementBuilder.ts',
);

async function loadBuilder() {
  return import(pathToFileURL(builderModulePath).href);
}

function createPrefixadoAsset(overrides = {}) {
  return {
    id: 'rf-cdb26',
    ticker: 'CDB26',
    name: 'CDB 2026',
    type: 'Renda Fixa',
    rf_subtype: 'CDB',
    fixed_issuer: 'Banco Teste',
    rf_application_date: '2026-01-12',
    rf_maturity_date: '2026-12-15',
    rf_contract_rate: '10% aa',
    fixed_indexer: 'PREFIXADO',
    rf_applied_value: 4000,
    rf_gross_value: 4128.2,
    rf_liquid_value: 4120.4,
    rf_profit_value: 120.4,
    rf_ir_iof: 7.8,
    rf_unavailable_value: 0,
    rf_note: 'Teste CDB prefixado',
    ...overrides,
  };
}

function createRfEvent(overrides = {}) {
  return {
    id: 'evt-001',
    assetId: 'rf-cdb26',
    ticker: 'CDB26',
    date: '2026-07-12',
    type: 'amortizacao',
    grossValue: 120.40,
    ir: 0,
    iof: 0,
    netValue: 120.40,
    principalDelta: 120.40,
    source: 'Test',
    note: 'Amortizacao teste',
    ...overrides,
  };
}

test('buildFixedIncomeReadonlySupplementMap: popula map com ativo prefixado valido', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const result = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [createPrefixadoAsset()],
    getRfEvents: () => [createRfEvent()],
    getGeneratedAt: () => '2026-07-14',
  });

  assert.equal(Object.keys(result).length, 1);
  assert.ok(result['rf-cdb26']);
  assert.equal(typeof result['rf-cdb26'].annualRate, 'number');
  assert.equal(typeof result['rf-cdb26'].elapsedBusinessDays, 'number');
  assert.ok(Array.isArray(result['rf-cdb26'].rfEvents));
  assert.equal(result['rf-cdb26'].rfEvents.length, 1);
});

test('buildFixedIncomeReadonlySupplementMap: map vazio se getRfEvents ausente', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const result = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [createPrefixadoAsset()],
    getRfEvents: undefined,
    getGeneratedAt: () => '2026-07-14',
  });

  assert.equal(Object.keys(result).length, 0);
});

test('buildFixedIncomeReadonlySupplementMap: map vazio se getRfEvents retorna nao-array', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const result = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [createPrefixadoAsset()],
    getRfEvents: () => null,
    getGeneratedAt: () => '2026-07-14',
  });

  assert.equal(Object.keys(result).length, 0);
});

test('buildFixedIncomeReadonlySupplementMap: ativo sem eventos nao entra', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const result = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [createPrefixadoAsset()],
    getRfEvents: () => [createRfEvent({ assetId: 'outro-asset' })],
    getGeneratedAt: () => '2026-07-14',
  });

  assert.equal(Object.keys(result).length, 0);
});

test('buildFixedIncomeReadonlySupplementMap: evento sem assetId ignorado', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const result = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [createPrefixadoAsset()],
    getRfEvents: () => [createRfEvent({ assetId: undefined })],
    getGeneratedAt: () => '2026-07-14',
  });

  assert.equal(Object.keys(result).length, 0);
});

test('buildFixedIncomeReadonlySupplementMap: indexer CDI nao entra', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const result = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [createPrefixadoAsset({ fixed_indexer: 'CDI' })],
    getRfEvents: () => [createRfEvent()],
    getGeneratedAt: () => '2026-07-14',
  });

  assert.equal(Object.keys(result).length, 0);
});

test('buildFixedIncomeReadonlySupplementMap: taxa invalida nao entra', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const result = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [createPrefixadoAsset({ rf_contract_rate: 'CDI + 1%' })],
    getRfEvents: () => [createRfEvent()],
    getGeneratedAt: () => '2026-07-14',
  });

  assert.equal(Object.keys(result).length, 0);
});

test('buildFixedIncomeReadonlySupplementMap: applicationDate ausente nao entra', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const result = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [createPrefixadoAsset({ rf_application_date: undefined })],
    getRfEvents: () => [createRfEvent()],
    getGeneratedAt: () => '2026-07-14',
  });

  assert.equal(Object.keys(result).length, 0);
});

test('buildFixedIncomeReadonlySupplementMap: generatedAt invalido map vazio', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const result = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [createPrefixadoAsset()],
    getRfEvents: () => [createRfEvent()],
    getGeneratedAt: () => 'not-a-date',
  });

  assert.equal(Object.keys(result).length, 0);
});

test('buildFixedIncomeReadonlySupplementMap: dois ativos, apenas um elegivel', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const result = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [
      createPrefixadoAsset({ id: 'rf-cdb26', fixed_indexer: 'PREFIXADO', rf_contract_rate: '10% aa' }),
      createPrefixadoAsset({ id: 'rf-lci27', fixed_indexer: 'CDI', rf_contract_rate: '95% CDI' }),
    ],
    getRfEvents: () => [
      createRfEvent({ assetId: 'rf-cdb26' }),
    ],
    getGeneratedAt: () => '2026-07-14',
  });

  assert.equal(Object.keys(result).length, 1);
  assert.ok(result['rf-cdb26']);
  assert.equal(result['rf-lci27'], undefined);
});

test('buildFixedIncomeReadonlySupplementMap: congelamento do map', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const result = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [createPrefixadoAsset()],
    getRfEvents: () => [createRfEvent()],
    getGeneratedAt: () => '2026-07-14',
  });

  assert.equal(Object.isFrozen(result), true);
});

test('buildFixedIncomeReadonlySupplementMap: congelamento do supplement', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const result = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [createPrefixadoAsset()],
    getRfEvents: () => [createRfEvent()],
    getGeneratedAt: () => '2026-07-14',
  });

  assert.equal(Object.isFrozen(result['rf-cdb26']), true);
});

test('buildFixedIncomeReadonlySupplementMap: congelamento do array rfEvents', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const result = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [createPrefixadoAsset()],
    getRfEvents: () => [createRfEvent()],
    getGeneratedAt: () => '2026-07-14',
  });

  assert.equal(Object.isFrozen(result['rf-cdb26'].rfEvents), true);
});

test('buildFixedIncomeReadonlySupplementMap: preserva ordem dos eventos', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const events = [
    createRfEvent({ id: 'evt-001', assetId: 'rf-cdb26', date: '2026-01-15' }),
    createRfEvent({ id: 'evt-002', assetId: 'rf-cdb26', date: '2026-04-10' }),
    createRfEvent({ id: 'evt-003', assetId: 'rf-cdb26', date: '2026-07-12' }),
  ];

  const result = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [createPrefixadoAsset()],
    getRfEvents: () => events,
    getGeneratedAt: () => '2026-07-14',
  });

  assert.equal(result['rf-cdb26'].rfEvents.length, 3);
  assert.equal(result['rf-cdb26'].rfEvents[0].id, 'evt-001');
  assert.equal(result['rf-cdb26'].rfEvents[1].id, 'evt-002');
  assert.equal(result['rf-cdb26'].rfEvents[2].id, 'evt-003');
});

test('buildFixedIncomeReadonlySupplementMap: erro de getAssets propaga', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  assert.throws(
    () => {
      buildFixedIncomeReadonlySupplementMap({
        getAssets: () => { throw new Error('boom'); },
        getRfEvents: () => [],
        getGeneratedAt: () => '2026-07-14',
      });
    },
    /boom/,
  );
});

test('buildFixedIncomeReadonlySupplementMap: erro de getRfEvents propaga', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  assert.throws(
    () => {
      buildFixedIncomeReadonlySupplementMap({
        getAssets: () => [createPrefixadoAsset()],
        getRfEvents: () => { throw new Error('boom'); },
        getGeneratedAt: () => '2026-07-14',
      });
    },
    /boom/,
  );
});

test('buildFixedIncomeReadonlySupplementMap: erro de getGeneratedAt propaga', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  assert.throws(
    () => {
      buildFixedIncomeReadonlySupplementMap({
        getAssets: () => [createPrefixadoAsset()],
        getRfEvents: () => [],
        getGeneratedAt: () => { throw new Error('boom'); },
      });
    },
    /boom/,
  );
});

test('buildFixedIncomeReadonlySupplementMap: ativo sem id nao entra', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const result = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [createPrefixadoAsset({ id: undefined })],
    getRfEvents: () => [createRfEvent()],
    getGeneratedAt: () => '2026-07-14',
  });

  assert.equal(Object.keys(result).length, 0);
});

test('buildFixedIncomeReadonlySupplementMap: assets vazio retorna map vazio', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const result = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [],
    getRfEvents: () => [],
    getGeneratedAt: () => '2026-07-14',
  });

  assert.equal(Object.keys(result).length, 0);
});

test('buildFixedIncomeReadonlySupplementMap: nao muta eventos de entrada', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const event = createRfEvent();
  const events = [event];

  buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [createPrefixadoAsset()],
    getRfEvents: () => events,
    getGeneratedAt: () => '2026-07-14',
  });

  assert.equal(Object.isFrozen(events), false);
  assert.equal(events[0].assetId, 'rf-cdb26');
});
