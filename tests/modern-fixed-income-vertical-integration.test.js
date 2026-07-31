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
const identityModulePath = path.join(
  __dirname, '..', 'modern', 'src', 'features', 'fixed-income', 'fixedIncomeAssetIdentity.ts',
);
const providerModulePath = path.join(
  __dirname, '..', 'modern', 'src', 'domain', 'fixedIncome', 'cdiDailyFactorProvider.ts',
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
function loadIdentity() {
  return import(pathToFileURL(identityModulePath).href);
}
function loadProvider() {
  return import(pathToFileURL(providerModulePath).href);
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

test('asset sem id, com rf_asset_id, evento com assetId correspondente: supplementMap nao vazio e snapshot enriquecido', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const { createHostFixedIncomeReadonlySource } = await loadHostSource();
  const { createModernFixedIncomeRuntime } = await loadRuntime();

  const asset = {
    rf_asset_id: 'rf-legacy-001',
    ticker: 'LEGACY01',
    name: 'Legacy CDB',
    type: 'Renda Fixa',
    rf_subtype: 'CDB',
    fixed_issuer: 'Banco Legacy',
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
    rf_note: 'Teste legacy rf_asset_id',
  };
  const event = {
    id: 'evt-legacy-001',
    assetId: 'rf-legacy-001',
    ticker: 'LEGACY01',
    date: '2026-01-12',
    type: 'amortizacao',
    grossValue: 100,
    principalDelta: 100,
    netValue: 100,
    ir: 0,
    iof: 0,
    source: 'Test',
    note: 'Amortizacao legacy',
  };

  const supplementMap = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [asset],
    getRfEvents: () => [event],
    getGeneratedAt: () => GENERATED_AT,
  });

  assert.equal(Object.keys(supplementMap).length, 1, 'deve ter 1 entrada no mapa');
  assert.ok('rf-legacy-001' in supplementMap, 'chave deve ser rf_asset_id');

  const source = createHostFixedIncomeReadonlySource({
    getAssets: () => [asset],
    getGeneratedAt: () => GENERATED_AT,
    notice: 'Teste rf_asset_id fallback',
  });

  const runtime = createModernFixedIncomeRuntime({
    fixedIncomeSource: source,
    fixedIncomeValuationSupplementMap: supplementMap,
  });

  const snapshot = runtime.fixedIncomeAdapter.getSnapshot();
  assert.ok(snapshot, 'snapshot deve existir');
  const item = snapshot.items.find(i => i.id === 'rf-legacy-001');
  assert.ok(item, 'item enriquecido deve estar presente');
  assert.equal(item.indexer, 'PREFIXADO');
  assert.equal(item.appliedValue, 100, 'appliedValue = sum(principalDelta)');
});

test('asset somente com sourceEventId: supplementMap vazio e fallback legado preservado', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const { createHostFixedIncomeReadonlySource } = await loadHostSource();
  const { createModernFixedIncomeRuntime } = await loadRuntime();

  const asset = {
    sourceEventId: 'evt-001',
    ticker: 'NOID01',
    name: 'No ID Asset',
    type: 'Renda Fixa',
    rf_subtype: 'CDB',
    fixed_issuer: 'Banco X',
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
    rf_note: 'Teste sourceEventId isolado',
  };
  const event = {
    id: 'evt-001',
    assetId: 'evt-001',
    ticker: 'NOID01',
    date: '2026-01-12',
    type: 'amortizacao',
    grossValue: 100,
    principalDelta: 100,
    netValue: 100,
    ir: 0,
    iof: 0,
    source: 'Test',
    note: 'Evento',
  };

  const supplementMap = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [asset],
    getRfEvents: () => [event],
    getGeneratedAt: () => GENERATED_AT,
  });

  assert.equal(Object.keys(supplementMap).length, 0, 'supplementMap deve ser vazio pois sourceEventId nao e identidade de ativo');

  const source = createHostFixedIncomeReadonlySource({
    getAssets: () => [asset],
    getGeneratedAt: () => GENERATED_AT,
    notice: 'Teste sourceEventId isolado',
  });

  const runtime = createModernFixedIncomeRuntime({
    fixedIncomeSource: source,
    fixedIncomeValuationSupplementMap: supplementMap,
  });

  const snapshot = runtime.fixedIncomeAdapter.getSnapshot();
  const item = snapshot.items.find(i => i.ticker === 'NOID01');
  assert.ok(item, 'item deve estar presente no snapshot (fallback legado)');
  assert.equal(item.appliedValue, 1000, 'valores legados preservados');
  assert.equal(item.grossValue, 1050, 'valores legados preservados');
  assert.equal(item.profitValue, 45, 'valores legados preservados');
});

test('asset sem identidade, evento somente com ticker: supplementMap vazio e nenhum matching por ticker', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();

  const asset = {
    ticker: 'NOTICKER',
    name: 'No Identity',
    type: 'Renda Fixa',
    rf_subtype: 'CDB',
    fixed_issuer: 'Banco Y',
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
    rf_note: 'Sem identidade',
  };
  const event = {
    id: 'evt-ticker-only',
    ticker: 'NOTICKER',
    date: '2026-01-12',
    type: 'amortizacao',
    grossValue: 100,
    principalDelta: 100,
    netValue: 100,
    ir: 0,
    iof: 0,
    source: 'Test',
    note: 'Evento so ticker',
  };

  const supplementMap = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [asset],
    getRfEvents: () => [event],
    getGeneratedAt: () => GENERATED_AT,
  });

  assert.equal(Object.keys(supplementMap).length, 0, 'supplementMap deve ser vazio sem identidade de ativo');
});

test('asset id numerico e event.assetId numerico correspondente: matching funciona apos normalizacao', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const { createHostFixedIncomeReadonlySource } = await loadHostSource();
  const { createModernFixedIncomeRuntime } = await loadRuntime();

  const asset = {
    id: 1234567890,
    ticker: 'NUM01',
    name: 'Numeric ID CDB',
    type: 'Renda Fixa',
    rf_subtype: 'CDB',
    fixed_issuer: 'Banco Numerico',
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
    rf_note: 'Teste ID numerico',
  };
  const event = {
    id: 'evt-numeric',
    assetId: 1234567890,
    ticker: 'NUM01',
    date: '2026-01-12',
    type: 'amortizacao',
    grossValue: 100,
    principalDelta: 100,
    netValue: 100,
    ir: 0,
    iof: 0,
    source: 'Test',
    note: 'Evento ID numerico',
  };

  const supplementMap = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [asset],
    getRfEvents: () => [event],
    getGeneratedAt: () => GENERATED_AT,
  });

  assert.equal(Object.keys(supplementMap).length, 1, 'deve ter 1 entrada');
  assert.ok('1234567890' in supplementMap, 'chave deve ser string normalizada do numero');

  const source = createHostFixedIncomeReadonlySource({
    getAssets: () => [asset],
    getGeneratedAt: () => GENERATED_AT,
    notice: 'Teste ID numerico',
  });

  const runtime = createModernFixedIncomeRuntime({
    fixedIncomeSource: source,
    fixedIncomeValuationSupplementMap: supplementMap,
  });

  const snapshot = runtime.fixedIncomeAdapter.getSnapshot();
  const item = snapshot.items.find(i => i.id === '1234567890');
  assert.ok(item, 'item enriquecido presente');
  assert.equal(item.appliedValue, 100, 'projecao aplicada corretamente');
});

function createCdiAsset(overrides = {}) {
  return {
    id: 'rf-cdi01',
    ticker: 'CDI01',
    name: 'CDB CDI 2026',
    type: 'Renda Fixa',
    rf_subtype: 'CDB',
    fixed_issuer: 'Banco CDI',
    rf_application_date: '2026-01-09',
    rf_maturity_date: '2026-12-15',
    rf_contract_rate: '100% CDI',
    fixed_indexer: 'CDI',
    rf_applied_value: 5000,
    rf_gross_value: 5200,
    rf_liquid_value: 5180,
    rf_profit_value: 200,
    rf_ir_iof: 20,
    rf_unavailable_value: 0,
    rf_note: 'Teste CDB CDI vertical',
    ...overrides,
  };
}

function createCdiDailyFactors() {
  return [
    { date: '2026-01-10', factor: 1.0004 },
    { date: '2026-01-13', factor: 1.0003 },
    { date: '2026-01-14', factor: 1.0005 },
  ];
}

test('supplement map CDI: getGeneratedAt injetado produz mapa nao vazio com ativo CDI', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const { createStaticCdiDailyFactorProvider } = await loadProvider();
  const asset = createCdiAsset();

  const result = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [asset],
    getRfEvents: () => [],
    getGeneratedAt: () => GENERATED_AT,
    cdiDailyFactorProvider: createStaticCdiDailyFactorProvider(createCdiDailyFactors()),
  });

  assert.equal(Object.keys(result).length, 1, 'deve ter 1 entrada no mapa');
  assert.ok('rf-cdi01' in result, 'deve conter assetId do ativo CDI');
  assert.equal(result['rf-cdi01'].kind, 'CDI', 'kind deve ser CDI');
  assert.equal(result['rf-cdi01'].contract.kind, 'CDI_PERCENTAGE', 'contract.kind deve ser CDI_PERCENTAGE');
  assert.equal(result['rf-cdi01'].contract.cdiPercentage, 1, 'cdiPercentage = 1 para 100% CDI');
  assert.ok(Object.isFrozen(result), 'mapa externo congelado');
  assert.ok(Object.isFrozen(result['rf-cdi01']), 'entrada do suplemento congelada');
  assert.ok(Object.isFrozen(result['rf-cdi01'].contract), 'contract congelado');
  assert.ok(Object.isFrozen(result['rf-cdi01'].dailyFactors), 'array de fatores congelado');
});

test('cadeia completa CDI: getGeneratedAt flui do composition root ate o snapshot enriquecido', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const { createHostFixedIncomeReadonlySource } = await loadHostSource();
  const { createModernFixedIncomeRuntime } = await loadRuntime();
  const { createStaticCdiDailyFactorProvider } = await loadProvider();

  const asset = createCdiAsset();

  const supplementMap = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [asset],
    getRfEvents: () => [],
    getGeneratedAt: () => GENERATED_AT,
    cdiDailyFactorProvider: createStaticCdiDailyFactorProvider(createCdiDailyFactors()),
  });

  const source = createHostFixedIncomeReadonlySource({
    getAssets: () => [asset],
    getGeneratedAt: () => GENERATED_AT,
    notice: 'Teste vertical CDI',
  });

  const runtime = createModernFixedIncomeRuntime({
    fixedIncomeSource: source,
    fixedIncomeValuationSupplementMap: supplementMap,
  });

  const snapshot = runtime.fixedIncomeAdapter.getSnapshot();
  assert.ok(snapshot, 'snapshot deve existir');
  assert.ok(Array.isArray(snapshot.items), 'items deve ser array');
  assert.ok(snapshot.items.length > 0, 'deve conter pelo menos um item');

  const cdiItem = snapshot.items.find(i => i.id === 'rf-cdi01');
  assert.ok(cdiItem, 'item CDI deve estar presente no snapshot');
  assert.equal(cdiItem.indexer, 'CDI', 'indexer deve ser CDI');

  assert.ok(cdiItem.appliedValue > 0, 'appliedValue deve ser positivo');
  assert.ok(cdiItem.grossValue > cdiItem.appliedValue, 'grossValue > appliedValue (projecao aplicada)');
  assert.equal(cdiItem.profitValue, cdiItem.grossValue - cdiItem.appliedValue, 'profitValue = grossValue - appliedValue');

  assert.equal(snapshot.summary.itemCount, 1, 'summary reflete contagem correta');
  assert.equal(snapshot.summary.totalApplied, cdiItem.appliedValue, 'summary.totalApplied igual ao appliedValue enriquecido');
  assert.equal(snapshot.summary.totalGross, cdiItem.grossValue, 'summary.totalGross igual ao grossValue enriquecido');
  assert.equal(snapshot.summary.totalProfit, cdiItem.profitValue, 'summary.totalProfit igual ao profitValue enriquecido');

  assert.ok(Object.isFrozen(snapshot.items), 'itens do snapshot congelados');
  assert.ok(Object.isFrozen(snapshot.summary), 'summary do snapshot congelado');
});

test('runtime CDI sem supplementMap preserva fallback legado', async () => {
  const { createHostFixedIncomeReadonlySource } = await loadHostSource();
  const { createModernFixedIncomeRuntime } = await loadRuntime();

  const asset = createCdiAsset();

  const source = createHostFixedIncomeReadonlySource({
    getAssets: () => [asset],
    getGeneratedAt: () => GENERATED_AT,
    notice: 'Teste vertical CDI sem suplemento',
  });

  const runtime = createModernFixedIncomeRuntime({
    fixedIncomeSource: source,
  });

  const snapshot = runtime.fixedIncomeAdapter.getSnapshot();
  assert.ok(snapshot, 'snapshot deve existir mesmo sem suplemento');
  assert.ok(snapshot.items.length > 0, 'deve conter itens');

  const item = snapshot.items.find(i => i.id === 'rf-cdi01');
  assert.ok(item, 'CDI asset presente');

  assert.equal(item.appliedValue, 5000, 'appliedValue legado preservado (5000)');
  assert.equal(item.grossValue, 5200, 'grossValue legado preservado (5200)');
  assert.equal(item.profitValue, 200, 'profitValue legado preservado (200)');

  assert.equal(snapshot.summary.totalApplied, 5000, 'summary.totalApplied = 5000 (legado)');
  assert.equal(snapshot.summary.totalGross, 5200, 'summary.totalGross = 5200 (legado)');
});

test('nenhum estado de entrada mutado pelo supplement builder CDI', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const { createStaticCdiDailyFactorProvider } = await loadProvider();

  const asset = createCdiAsset();
  const assets = [asset];
  const factors = createCdiDailyFactors();
  const factorsBefore = factors.map(f => ({ ...f }));

  buildFixedIncomeReadonlySupplementMap({
    getAssets: () => assets,
    getRfEvents: () => [],
    getGeneratedAt: () => GENERATED_AT,
    cdiDailyFactorProvider: createStaticCdiDailyFactorProvider(factors),
  });

  assert.deepEqual(asset, { ...createCdiAsset() }, 'asset nao mutado');
  assert.deepEqual(factors, factorsBefore, 'fatores CDI nao mutados');
  assert.strictEqual(assets[0], asset, 'referencia do array assets preservada');
});

test('cadeia completa CDI: nenhum estado de entrada mutado pelo fluxo source + suplemento', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const { createHostFixedIncomeReadonlySource } = await loadHostSource();
  const { createModernFixedIncomeRuntime } = await loadRuntime();
  const { createStaticCdiDailyFactorProvider } = await loadProvider();

  const asset = createCdiAsset();
  const assets = [asset];
  const factors = createCdiDailyFactors();
  const factorsBefore = factors.map(f => ({ ...f }));

  const assetBefore = { ...asset };

  const supplementMap = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => assets,
    getRfEvents: () => [],
    getGeneratedAt: () => GENERATED_AT,
    cdiDailyFactorProvider: createStaticCdiDailyFactorProvider(factors),
  });

  const source = createHostFixedIncomeReadonlySource({
    getAssets: () => assets,
    getGeneratedAt: () => GENERATED_AT,
    notice: 'Teste imutabilidade vertical CDI',
  });

  const runtime = createModernFixedIncomeRuntime({
    fixedIncomeSource: source,
    fixedIncomeValuationSupplementMap: supplementMap,
  });

  runtime.fixedIncomeAdapter.getSnapshot();

  assert.deepEqual(asset, assetBefore, 'asset nao mutado apos fluxo completo');
  assert.deepEqual(factors, factorsBefore, 'fatores CDI nao mutados apos fluxo completo');
});

test('asset CDI com spread: supplementMap produz entrada correta e snapshot enriquecido', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const { createHostFixedIncomeReadonlySource } = await loadHostSource();
  const { createModernFixedIncomeRuntime } = await loadRuntime();
  const { createStaticCdiDailyFactorProvider } = await loadProvider();

  const asset = createCdiAsset({ rf_contract_rate: 'CDI + 2%' });

  const supplementMap = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [asset],
    getRfEvents: () => [],
    getGeneratedAt: () => GENERATED_AT,
    cdiDailyFactorProvider: createStaticCdiDailyFactorProvider(createCdiDailyFactors()),
  });

  assert.equal(Object.keys(supplementMap).length, 1, 'deve ter 1 entrada');
  assert.equal(supplementMap['rf-cdi01'].kind, 'CDI');
  assert.equal(supplementMap['rf-cdi01'].contract.kind, 'CDI_PLUS_SPREAD', 'contract.kind deve ser CDI_PLUS_SPREAD');
  assert.equal(supplementMap['rf-cdi01'].contract.annualSpreadRate, 0.02, 'annualSpreadRate = 0.02');

  const source = createHostFixedIncomeReadonlySource({
    getAssets: () => [asset],
    getGeneratedAt: () => GENERATED_AT,
    notice: 'Teste CDI com spread',
  });

  const runtime = createModernFixedIncomeRuntime({
    fixedIncomeSource: source,
    fixedIncomeValuationSupplementMap: supplementMap,
  });

  const snapshot = runtime.fixedIncomeAdapter.getSnapshot();
  const item = snapshot.items.find(i => i.id === 'rf-cdi01');
  assert.ok(item, 'item CDI deve estar presente');
  assert.ok(item.appliedValue > 0, 'appliedValue projetado');
  assert.ok(item.grossValue > item.appliedValue, 'grossValue > appliedValue');
});

test('asset CDI e PREFIXADO: ambos enriquecidos corretamente na cadeia completa', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const { createHostFixedIncomeReadonlySource } = await loadHostSource();
  const { createModernFixedIncomeRuntime } = await loadRuntime();
  const { createStaticCdiDailyFactorProvider } = await loadProvider();

  const cdiAsset = createCdiAsset();
  const prefixadoAsset = createPrefixadoAsset();
  const event = createRfEvent({ assetId: 'rf-cdb26' });

  const supplementMap = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [cdiAsset, prefixadoAsset],
    getRfEvents: () => [event],
    getGeneratedAt: () => GENERATED_AT,
    cdiDailyFactorProvider: createStaticCdiDailyFactorProvider(createCdiDailyFactors()),
  });

  assert.equal(Object.keys(supplementMap).length, 2, 'deve ter 2 entradas');
  assert.equal(supplementMap['rf-cdi01'].kind, 'CDI');
  assert.equal(supplementMap['rf-cdi01'].contract.kind, 'CDI_PERCENTAGE', 'CDI contract.kind');
  assert.equal(supplementMap['rf-cdb26'].kind, 'FIXED_RATE');

  const source = createHostFixedIncomeReadonlySource({
    getAssets: () => [cdiAsset, prefixadoAsset],
    getGeneratedAt: () => GENERATED_AT,
    notice: 'Teste misto CDI + PREFIXADO',
  });

  const runtime = createModernFixedIncomeRuntime({
    fixedIncomeSource: source,
    fixedIncomeValuationSupplementMap: supplementMap,
  });

  const snapshot = runtime.fixedIncomeAdapter.getSnapshot();
  assert.equal(snapshot.items.length, 2, 'deve conter 2 itens');

  const cdiItem = snapshot.items.find(i => i.id === 'rf-cdi01');
  const prefixadoItem = snapshot.items.find(i => i.id === 'rf-cdb26');

  assert.ok(cdiItem, 'item CDI presente');
  assert.ok(prefixadoItem, 'item PREFIXADO presente');

  assert.ok(cdiItem.appliedValue > 0, 'CDI appliedValue projetado');
  assert.ok(cdiItem.grossValue > cdiItem.appliedValue, 'CDI grossValue > appliedValue');
  assert.equal(prefixadoItem.appliedValue, 100, 'PREFIXADO appliedValue = sum(principalDelta)');
  assert.ok(prefixadoItem.grossValue > prefixadoItem.appliedValue, 'PREFIXADO grossValue > appliedValue');

  assert.equal(snapshot.summary.totalApplied, cdiItem.appliedValue + prefixadoItem.appliedValue, 'summary totalApplied soma correta');
});

test('asset CDI com contrato invalido: fallback legado preservado na cadeia completa', async () => {
  const { buildFixedIncomeReadonlySupplementMap } = await loadBuilder();
  const { createHostFixedIncomeReadonlySource } = await loadHostSource();
  const { createModernFixedIncomeRuntime } = await loadRuntime();
  const { createStaticCdiDailyFactorProvider } = await loadProvider();

  const asset = createCdiAsset({ rf_contract_rate: 'PREFIXADO 10%' });

  const supplementMap = buildFixedIncomeReadonlySupplementMap({
    getAssets: () => [asset],
    getRfEvents: () => [],
    getGeneratedAt: () => GENERATED_AT,
    cdiDailyFactorProvider: createStaticCdiDailyFactorProvider(createCdiDailyFactors()),
  });

  assert.equal(Object.keys(supplementMap).length, 0, 'supplementMap deve ser vazio');

  const source = createHostFixedIncomeReadonlySource({
    getAssets: () => [asset],
    getGeneratedAt: () => GENERATED_AT,
    notice: 'Teste CDI contrato invalido',
  });

  const runtime = createModernFixedIncomeRuntime({
    fixedIncomeSource: source,
    fixedIncomeValuationSupplementMap: supplementMap,
  });

  const snapshot = runtime.fixedIncomeAdapter.getSnapshot();
  const item = snapshot.items.find(i => i.id === 'rf-cdi01');
  assert.ok(item, 'item presente');
  assert.equal(item.appliedValue, 5000, 'valores legados preservados');
  assert.equal(item.grossValue, 5200, 'valores legados preservados');
});
