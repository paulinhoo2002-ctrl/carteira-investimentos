const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

const builderModulePath = path.join(
  __dirname, '..', 'modern', 'src', 'features', 'fixed-income', 'fixedIncomeReadonlySupplementBuilder.ts',
);
const hostSourceModulePath = path.join(
  __dirname, '..', 'modern', 'src', 'bootstrap', 'hostFixedIncomeReadonlySource.ts',
);
const runtimeModulePath = path.join(
  __dirname, '..', 'modern', 'src', 'bootstrap', 'modernFixedIncomeRuntime.ts',
);

function loadBuilder() {
  return import(pathToFileURL(builderModulePath).href);
}
function loadHostSource() {
  return import(pathToFileURL(hostSourceModulePath).href);
}
function loadRuntime() {
  return import(pathToFileURL(runtimeModulePath).href);
}

function createPrefixadoAsset(overrides = {}) {
  return {
    id: 'rf-cdb26',
    ticker: 'CDB26',
    name: 'CDB 2026',
    type: 'Renda Fixa',
    rf_subtype: 'CDB',
    fixed_issuer: 'Banco Teste',
    rf_application_date: '2026-01-09',
    rf_maturity_date: '2026-12-15',
    rf_contract_rate: '10% aa',
    fixed_indexer: 'PREFIXADO',
    rf_applied_value: 1000,
    rf_gross_value: 1050,
    rf_liquid_value: 1045,
    rf_profit_value: 45,
    rf_ir_iof: 5,
    rf_unavailable_value: 0,
    rf_note: 'Teste CDB prefixado vertical',
    ...overrides,
  };
}

function createRfEvent(overrides = {}) {
  return {
    id: 'evt-cdb26-001',
    assetId: 'rf-cdb26',
    ticker: 'CDB26',
    date: '2026-01-12',
    type: 'amortizacao',
    grossValue: 100,
    principalDelta: 100,
    netValue: 100,
    ir: 0,
    iof: 0,
    source: 'Test',
    note: 'Amortizacao teste vertical',
    ...overrides,
  };
}

const GENERATED_AT = '2026-01-20T12:00:00Z';

test('supplement map: getGeneratedAt injetado produz mapa nao vazio com ativo PREFIXADO', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const asset = createPrefixadoAsset();
  const event = createRfEvent();

  const result = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [asset],
    getRfEvents: () => [event],
    getGeneratedAt: () => GENERATED_AT,
  });

  assert.equal(Object.keys(result).length, 1, 'deve ter 1 entrada no mapa');
  assert.ok('rf-cdb26' in result, 'deve conter assetId do ativo PREFIXADO');
  assert.equal(result['rf-cdb26'].annualRate, 0.10, '10% aa parseado para 0.10');
  assert.equal(typeof result['rf-cdb26'].elapsedBusinessDays, 'number', 'elapsedBusinessDays e numero');
  assert.ok(result['rf-cdb26'].elapsedBusinessDays > 0, 'elapsedBusinessDays positivo entre applicationDate e generatedAt');
  assert.equal(result['rf-cdb26'].rfEvents.length, 1, 'evento correspondente encontrado');
  assert.equal(result['rf-cdb26'].rfEvents[0].id, 'evt-cdb26-001', 'id do evento preservado');
  assert.ok(Object.isFrozen(result), 'mapa externo congelado');
  assert.ok(Object.isFrozen(result['rf-cdb26']), 'entrada do suplemento congelada');
  assert.ok(Object.isFrozen(result['rf-cdb26'].rfEvents), 'array de eventos congelado');
});

test('cadeia completa: getGeneratedAt flui do composition root ate o snapshot enriquecido', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const { createHostFixedIncomeReadonlySource } = await loadHostSource();
  const { createModernFixedIncomeRuntime } = await loadRuntime();

  const asset = createPrefixadoAsset();
  const event = createRfEvent();

  // === bootstrapHost monta o supplementMap internamente (linhas 280-287 do host.tsx) ===
  const supplementMap = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [asset],
    getRfEvents: () => [event],
    getGeneratedAt: () => GENERATED_AT,
  });

  // === bootstrapHost cria a fonte readonly internamente (linhas 222-228 do host.tsx) ===
  const source = createHostFixedIncomeReadonlySource({
    getAssets: () => [asset],
    getGeneratedAt: () => GENERATED_AT,
    notice: 'Teste vertical de integracao',
  });

  // === bootstrapHost compõe via createModernFixedIncomeRuntime (linhas 289-293 do host.tsx) ===
  const runtime = createModernFixedIncomeRuntime({
    fixedIncomeSource: source,
    fixedIncomeValuationSupplementMap: supplementMap,
  });

  const snapshot = runtime.fixedIncomeAdapter.getSnapshot();
  assert.ok(snapshot, 'snapshot deve existir');
  assert.ok(Array.isArray(snapshot.items), 'items deve ser array');
  assert.ok(snapshot.items.length > 0, 'deve conter pelo menos um item');

  const prefixadoItem = snapshot.items.find(i => i.id === 'rf-cdb26');
  assert.ok(prefixadoItem, 'item PREFIXADO deve estar presente no snapshot');
  assert.equal(prefixadoItem.indexer, 'PREFIXADO', 'indexer deve ser PREFIXADO');

  // Os valores legados originais sao rf_applied_value=1000, rf_gross_value=1050, rf_profit_value=45
  // A projecao substitui esses valores usando os rfEvents e o supplementMap
  const expectedAppliedValue = 100; // sum(principalDelta) dos rfEvents

  assert.equal(prefixadoItem.appliedValue, expectedAppliedValue, 'appliedValue = sum(principalDelta) dos rfEvents');
  assert.ok(prefixadoItem.grossValue > prefixadoItem.appliedValue, 'grossValue > appliedValue (projecao aplicada)');
  assert.equal(prefixadoItem.profitValue, prefixadoItem.grossValue - prefixadoItem.appliedValue, 'profitValue = grossValue - appliedValue');

  // Summary recalcula totais com valores enriquecidos
  assert.equal(snapshot.summary.itemCount, 1, 'summary reflete contagem correta');
  assert.equal(snapshot.summary.totalApplied, prefixadoItem.appliedValue, 'summary.totalApplied igual ao appliedValue enriquecido');
  assert.equal(snapshot.summary.totalGross, prefixadoItem.grossValue, 'summary.totalGross igual ao grossValue enriquecido');
  assert.equal(snapshot.summary.totalProfit, prefixadoItem.profitValue, 'summary.totalProfit igual ao profitValue enriquecido');

  // Imutabilidade
  assert.ok(Object.isFrozen(snapshot.items), 'itens do snapshot congelados');
  assert.ok(Object.isFrozen(snapshot.summary), 'summary do snapshot congelado');
});

test('runtime sem supplementMap preserva fallback legado', async () => {
  const { createHostFixedIncomeReadonlySource } = await loadHostSource();
  const { createModernFixedIncomeRuntime } = await loadRuntime();

  const asset = createPrefixadoAsset();

  const source = createHostFixedIncomeReadonlySource({
    getAssets: () => [asset],
    getGeneratedAt: () => GENERATED_AT,
    notice: 'Teste vertical sem suplemento',
  });

  // Omite fixedIncomeValuationSupplementMap — runtime usa padrao {}
  const runtime = createModernFixedIncomeRuntime({
    fixedIncomeSource: source,
  });

  // Nao deve crashar
  const snapshot = runtime.fixedIncomeAdapter.getSnapshot();
  assert.ok(snapshot, 'snapshot deve existir mesmo sem suplemento');
  assert.ok(snapshot.items.length > 0, 'deve conter itens');

  const item = snapshot.items.find(i => i.id === 'rf-cdb26');
  assert.ok(item, 'PREFIXADO asset presente');

  // Valores legados preservados (sem projecao)
  assert.equal(item.appliedValue, 1000, 'appliedValue legado preservado (1000)');
  assert.equal(item.grossValue, 1050, 'grossValue legado preservado (1050)');
  assert.equal(item.profitValue, 45, 'profitValue legado preservado (45)');

  // Summary com valores legados
  assert.equal(snapshot.summary.totalApplied, 1000, 'summary.totalApplied = 1000 (legado)');
  assert.equal(snapshot.summary.totalGross, 1050, 'summary.totalGross = 1050 (legado)');
});

test('nenhum estado de entrada mutado pelo supplement builder', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();

  const asset = createPrefixadoAsset();
  const event = createRfEvent();
  const assets = [asset];
  const events = [event];

  const assetBefore = { ...asset };
  const eventBefore = { ...event };

  buildFixedIncomeReadonlySupplementMap({
    getAssets: () => assets,
    getRfEvents: () => events,
    getGeneratedAt: () => GENERATED_AT,
  });

  assert.deepEqual(asset, assetBefore, 'asset nao mutado');
  assert.deepEqual(event, eventBefore, 'event nao mutado');
  assert.strictEqual(assets[0], asset, 'referencia do array assets preservada');
  assert.strictEqual(events[0], event, 'referencia do array events preservada');
});

test('cadeia completa: nenhum estado de entrada mutado pelo fluxo source + suplemento', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const { createHostFixedIncomeReadonlySource } = await loadHostSource();
  const { createModernFixedIncomeRuntime } = await loadRuntime();

  const asset = createPrefixadoAsset();
  const event = createRfEvent();
  const assets = [asset];
  const events = [event];

  const assetBefore = { ...asset };
  const eventBefore = { ...event };

  const supplementMap = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => assets,
    getRfEvents: () => events,
    getGeneratedAt: () => GENERATED_AT,
  });

  const source = createHostFixedIncomeReadonlySource({
    getAssets: () => assets,
    getGeneratedAt: () => GENERATED_AT,
    notice: 'Teste imutabilidade vertical',
  });

  const runtime = createModernFixedIncomeRuntime({
    fixedIncomeSource: source,
    fixedIncomeValuationSupplementMap: supplementMap,
  });

  runtime.fixedIncomeAdapter.getSnapshot();

  assert.deepEqual(asset, assetBefore, 'asset nao mutado apos fluxo completo');
  assert.deepEqual(event, eventBefore, 'event nao mutado apos fluxo completo');
});
