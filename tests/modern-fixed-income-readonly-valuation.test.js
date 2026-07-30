const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const VALUATION_PATH = path.join(__dirname, '..', 'modern', 'src', 'features', 'fixed-income', 'fixedIncomeReadonlyValuation.ts');

async function loadValuation() {
  return import(pathToFileURL(VALUATION_PATH).href);
}

const ASSET_ID = 'rf-prefixado';

function makeItem(id, overrides = {}) {
  return {
    id: id ?? 'rf-some',
    ticker: id ?? 'SOME',
    name: 'Item Teste',
    subtype: 'CDB',
    issuer: 'Banco Teste',
    applicationDate: '2026-01-15',
    maturityDate: '2026-12-15',
    contractedRate: '10% aa',
    indexer: 'CDI',
    appliedValue: 1000,
    grossValue: 1100,
    liquidValue: 1090,
    profitValue: 100,
    irValue: null,
    iofValue: null,
    combinedTaxValue: 10,
    liquidity: 'Diária',
    unavailableValue: 0,
    maturityStatus: 'A vencer',
    note: null,
    ...overrides,
  };
}

function makeSnapshot(overrides = {}) {
  const items = overrides.items ?? [makeItem('rf-item-1')];
  return {
    version: 1,
    generatedAt: '2026-07-29T10:00:00.000Z',
    notice: 'Snapshot teste.',
    summary: {
      totalApplied: items.reduce((s, i) => s + (typeof i.appliedValue === 'number' ? i.appliedValue : 0), 0),
      totalGross: items.reduce((s, i) => s + (typeof i.grossValue === 'number' ? i.grossValue : 0), 0),
      totalLiquid: items.reduce((s, i) => s + (typeof i.liquidValue === 'number' ? i.liquidValue : 0), 0),
      totalProfit: items.reduce((s, i) => s + (typeof i.profitValue === 'number' ? i.profitValue : 0), 0),
      totalIrValue: null,
      totalIofValue: null,
      totalCombinedTaxValue: items.reduce((s, i) => s + (typeof i.combinedTaxValue === 'number' ? i.combinedTaxValue : 0), 0),
      totalUnavailableValue: 0,
      itemCount: items.length,
    },
    items,
  };
}

function okSupplement(overrides = {}) {
  return {
    annualRate: 0.10,
    elapsedBusinessDays: 252,
    rfEvents: [
      {
        id: 'evt-1',
        assetId: ASSET_ID,
        date: '2026-01-15',
        principalDelta: 1000,
      },
    ],
    ...overrides,
  };
}

describe('fixedIncomeReadonlyValuation - enrichFixedIncomeReadonlySnapshot', () => {
  it('1. item CDI permanece inalterado', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem('rf-cdb', { indexer: 'CDI' });
    const snapshot = makeSnapshot({ items: [item] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {});
    assert.equal(enriched.items[0].appliedValue, 1000);
    assert.equal(enriched.items[0].grossValue, 1100);
    assert.equal(enriched.items[0].profitValue, 100);
  });

  it('2. item PREFIXADO com supplement valido projeta valores', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem(ASSET_ID, { indexer: 'PREFIXADO', appliedValue: 999, grossValue: 999, profitValue: 999 });
    const snapshot = makeSnapshot({ items: [item] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {
      [ASSET_ID]: okSupplement({ annualRate: 0.12, rfEvents: [{ id: 'e1', assetId: ASSET_ID, date: '2026-01-15', principalDelta: 1000 }] }),
    });
    assert.equal(enriched.items[0].appliedValue, 1000);
    assert.equal(enriched.items[0].grossValue, 1120);
    assert.equal(enriched.items[0].profitValue, 120);
  });

  it('3. item PREFIXADO sem supplement preserva valores', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem('rf-pref', { indexer: 'PREFIXADO', appliedValue: 500, grossValue: 550, profitValue: 50 });
    const snapshot = makeSnapshot({ items: [item] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {});
    assert.equal(enriched.items[0].appliedValue, 500);
    assert.equal(enriched.items[0].grossValue, 550);
    assert.equal(enriched.items[0].profitValue, 50);
  });

  it('4. items mistos: PREFIXADO projetado, CDI inalterado', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const prefixado = makeItem('rf-pref', { indexer: 'PREFIXADO', appliedValue: 999, grossValue: 999, profitValue: 999 });
    const cdi = makeItem('rf-cdb', { indexer: 'CDI', appliedValue: 2000, grossValue: 2200, profitValue: 200 });
    const snapshot = makeSnapshot({ items: [prefixado, cdi] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {
      'rf-pref': okSupplement({ annualRate: 0.12, elapsedBusinessDays: 252, rfEvents: [{ id: 'e1', assetId: 'rf-pref', date: '2026-01-15', principalDelta: 1000 }] }),
    });
    assert.equal(enriched.items[0].appliedValue, 1000);
    assert.equal(enriched.items[0].grossValue, 1120);
    assert.equal(enriched.items[1].appliedValue, 2000);
    assert.equal(enriched.items[1].grossValue, 2200);
  });

  it('5. liquidValue nunca e alterado pela projecao', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem(ASSET_ID, { indexer: 'PREFIXADO', liquidValue: 1050 });
    const snapshot = makeSnapshot({ items: [item] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {
      [ASSET_ID]: okSupplement(),
    });
    assert.equal(enriched.items[0].liquidValue, 1050);
  });

  it('6. summary recalcula agregados com valores projetados', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem(ASSET_ID, { indexer: 'PREFIXADO', appliedValue: 999, grossValue: 999, profitValue: 999 });
    const snapshot = makeSnapshot({ items: [item] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {
      [ASSET_ID]: okSupplement({ annualRate: 0.12, elapsedBusinessDays: 252, rfEvents: [{ id: 'e1', assetId: ASSET_ID, date: '2026-01-15', principalDelta: 1000 }] }),
    });
    assert.equal(enriched.summary.totalApplied, 1000);
    assert.equal(enriched.summary.totalGross, 1120);
    assert.equal(enriched.summary.totalProfit, 120);
  });

  it('7. item PREFIXADO com supplement invalido preserva valores', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem(ASSET_ID, { indexer: 'PREFIXADO', appliedValue: 500, grossValue: 550, profitValue: 50 });
    const snapshot = makeSnapshot({ items: [item] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {
      [ASSET_ID]: okSupplement({ annualRate: NaN }),
    });
    assert.equal(enriched.items[0].appliedValue, 500);
    assert.equal(enriched.items[0].grossValue, 550);
    assert.equal(enriched.items[0].profitValue, 50);
  });

  it('8. item PREFIXADO com tax invalida no supplement preserva valores', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem(ASSET_ID, { indexer: 'PREFIXADO', appliedValue: 500 });
    const snapshot = makeSnapshot({ items: [item] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {
      [ASSET_ID]: okSupplement({ annualRate: -0.05 }),
    });
    assert.equal(enriched.items[0].appliedValue, 500);
  });

  it('9. item PREFIXADO com elapsedBusinessDays negativo preserva valores', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem(ASSET_ID, { indexer: 'PREFIXADO', appliedValue: 500 });
    const snapshot = makeSnapshot({ items: [item] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {
      [ASSET_ID]: okSupplement({ elapsedBusinessDays: -1 }),
    });
    assert.equal(enriched.items[0].appliedValue, 500);
  });

  it('10. item PREFIXADO com rfEvents nao array preserva valores', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem(ASSET_ID, { indexer: 'PREFIXADO', appliedValue: 500 });
    const snapshot = makeSnapshot({ items: [item] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {
      [ASSET_ID]: okSupplement({ rfEvents: null }),
    });
    assert.equal(enriched.items[0].appliedValue, 500);
  });

  it('11. item PREFIXADO com id null preserva valores', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem(null, { indexer: 'PREFIXADO', appliedValue: 500 });
    const snapshot = makeSnapshot({ items: [item] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {});
    assert.equal(enriched.items[0].appliedValue, 500);
  });

  it('12. snapshot original nao e modificado', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem(ASSET_ID, { indexer: 'PREFIXADO', appliedValue: 999 });
    const snapshot = makeSnapshot({ items: [item] });
    const before = snapshot.items[0].appliedValue;
    enrichFixedIncomeReadonlySnapshot(snapshot, {
      [ASSET_ID]: okSupplement(),
    });
    assert.equal(snapshot.items[0].appliedValue, before);
  });

  it('13. snapshot vazio permanece vazio', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const snapshot = makeSnapshot({ items: [] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {});
    assert.equal(enriched.items.length, 0);
    assert.equal(enriched.summary.itemCount, 0);
  });

  it('14. item PREFIXADO com supplement de outro assetId preserva valores', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem('rf-pref', { indexer: 'PREFIXADO', appliedValue: 500 });
    const snapshot = makeSnapshot({ items: [item] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {
      'other-asset': okSupplement(),
    });
    assert.equal(enriched.items[0].appliedValue, 500);
  });

  it('15. totalCombinedTaxValue preservado do summary original apos projecao', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem(ASSET_ID, { indexer: 'PREFIXADO', combinedTaxValue: 15 });
    const snapshot = makeSnapshot({ items: [item] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {
      [ASSET_ID]: okSupplement(),
    });
    assert.equal(enriched.summary.totalCombinedTaxValue, 15);
  });

  it('16. erro no dominio nao quebra projecao (principalDelta invalido)', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem(ASSET_ID, { indexer: 'PREFIXADO', appliedValue: 500 });
    const snapshot = makeSnapshot({ items: [item] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {
      [ASSET_ID]: okSupplement({ rfEvents: [{ id: 'e1', assetId: ASSET_ID, date: '2026-01-15', principalDelta: 'INVALIDO' }] }),
    });
    assert.equal(enriched.items[0].appliedValue, 500);
  });

  it('17. totalApplied null quando item tem appliedValue null', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem(ASSET_ID, { indexer: 'PREFIXADO', appliedValue: null });
    const snapshot = makeSnapshot({ items: [item] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {});
    assert.equal(enriched.summary.totalApplied, null);
  });

  it('18. totalApplied null quando item tem appliedValue undefined', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem(ASSET_ID, { indexer: 'PREFIXADO', appliedValue: undefined });
    const snapshot = makeSnapshot({ items: [item] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {});
    assert.equal(enriched.summary.totalApplied, null);
  });

  it('19. totalGross null quando item tem grossValue NaN', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem(ASSET_ID, { indexer: 'PREFIXADO', grossValue: NaN });
    const snapshot = makeSnapshot({ items: [item] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {});
    assert.equal(enriched.summary.totalGross, null);
  });

  it('20. totalProfit null quando item tem profitValue Infinity', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem(ASSET_ID, { indexer: 'PREFIXADO', profitValue: Infinity });
    const snapshot = makeSnapshot({ items: [item] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {});
    assert.equal(enriched.summary.totalProfit, null);
  });

  it('21. lista vazia gera zero para totais recalculados', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const snapshot = makeSnapshot({ items: [] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {});
    assert.equal(enriched.summary.totalApplied, 0);
    assert.equal(enriched.summary.totalGross, 0);
    assert.equal(enriched.summary.totalProfit, 0);
  });

  it('22. zero entra corretamente na soma', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem('rf-a', { indexer: 'CDI', appliedValue: 0, grossValue: 0, profitValue: 0 });
    const item2 = makeItem('rf-b', { indexer: 'CDI', appliedValue: 100, grossValue: 200, profitValue: 100 });
    const snapshot = makeSnapshot({ items: [item, item2] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {});
    assert.equal(enriched.summary.totalApplied, 100);
    assert.equal(enriched.summary.totalGross, 200);
    assert.equal(enriched.summary.totalProfit, 100);
  });

  it('23. totalLiquid preservado do summary original', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem(ASSET_ID, { indexer: 'PREFIXADO', appliedValue: 999 });
    const snapshot = makeSnapshot({ items: [item] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {
      [ASSET_ID]: okSupplement(),
    });
    assert.equal(enriched.summary.totalLiquid, snapshot.summary.totalLiquid);
  });

  it('24. totalIrValue preservado do summary original', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const snapshot = makeSnapshot({ items: [makeItem('rf-a', { indexer: 'CDI', irValue: 50 })] });
    snapshot.summary.totalIrValue = 50;
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {});
    assert.equal(enriched.summary.totalIrValue, 50);
  });

  it('25. totalIofValue preservado do summary original', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const snapshot = makeSnapshot({ items: [makeItem('rf-a', { indexer: 'CDI', iofValue: 30 })] });
    snapshot.summary.totalIofValue = 30;
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {});
    assert.equal(enriched.summary.totalIofValue, 30);
  });

  it('26. totalUnavailableValue preservado do summary original', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const snapshot = makeSnapshot({ items: [makeItem('rf-a', { indexer: 'CDI', unavailableValue: 200 })] });
    snapshot.summary.totalUnavailableValue = 200;
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {});
    assert.equal(enriched.summary.totalUnavailableValue, 200);
  });

  it('27. campos desconhecidos do summary sao preservados', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const snapshot = makeSnapshot({ items: [] });
    snapshot.summary.extraSummaryField = 'survive';
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {});
    assert.equal(enriched.summary.extraSummaryField, 'survive');
  });

  it('28. campos desconhecidos do snapshot sao preservados', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const snapshot = makeSnapshot({ items: [] });
    snapshot.extraSnapshotField = 'survive';
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {});
    assert.equal(enriched.extraSnapshotField, 'survive');
  });
});

describe('fixedIncomeReadonlyValuation - snapshot imutabilidade', () => {
  it('1. snapshot congelado nao impede projecao', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem(ASSET_ID, { indexer: 'PREFIXADO', appliedValue: 999, grossValue: 999, profitValue: 999 });
    const snapshot = Object.freeze(makeSnapshot({ items: [Object.freeze(item)] }));
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {
      [ASSET_ID]: okSupplement({ annualRate: 0.12, elapsedBusinessDays: 252, rfEvents: [{ id: 'e1', assetId: ASSET_ID, date: '2026-01-15', principalDelta: 1000 }] }),
    });
    assert.equal(enriched.items[0].appliedValue, 1000);
  });

  it('2. versao e notice sao preservados', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const snapshot = makeSnapshot();
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {});
    assert.equal(enriched.version, 1);
    assert.equal(enriched.notice, snapshot.notice);
  });

  it('3. snapshot retornado esta congelado', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const items = [
      makeItem('rf-a', { indexer: 'CDI' }),
      makeItem(ASSET_ID, { indexer: 'PREFIXADO', appliedValue: 999 }),
    ];
    const snapshot = makeSnapshot({ items });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {
      [ASSET_ID]: okSupplement(),
    });
    assert.equal(Object.isFrozen(enriched), true);
  });

  it('4. array de items retornado esta congelado', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const items = [
      makeItem('rf-a', { indexer: 'CDI' }),
      makeItem(ASSET_ID, { indexer: 'PREFIXADO', appliedValue: 999 }),
    ];
    const snapshot = makeSnapshot({ items });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {
      [ASSET_ID]: okSupplement(),
    });
    assert.equal(Object.isFrozen(enriched.items), true);
  });

  it('5. summary retornado esta congelado', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const snapshot = makeSnapshot({ items: [makeItem('rf-a', { indexer: 'CDI' })] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {});
    assert.equal(Object.isFrozen(enriched.summary), true);
  });

  it('6. cada item retornado esta congelado (item CDI clonado)', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const snapshot = makeSnapshot({ items: [makeItem('rf-a', { indexer: 'CDI' })] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {});
    assert.equal(Object.isFrozen(enriched.items[0]), true);
  });

  it('7. item PREFIXADO enriquecido retornado congelado', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem(ASSET_ID, { indexer: 'PREFIXADO', appliedValue: 999 });
    const snapshot = makeSnapshot({ items: [item] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {
      [ASSET_ID]: okSupplement(),
    });
    assert.equal(Object.isFrozen(enriched.items[0]), true);
  });

  it('8. supplementMap de entrada nao e mutado', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem(ASSET_ID, { indexer: 'PREFIXADO', appliedValue: 999 });
    const snapshot = makeSnapshot({ items: [item] });
    const map = { [ASSET_ID]: okSupplement() };
    Object.freeze(map);
    Object.freeze(map[ASSET_ID]);
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, map);
    assert.equal(enriched.items[0].appliedValue, 1000);
  });

  it('9. erro esperado do dominio preserva legado sem catch amplo', async () => {
    const { enrichFixedIncomeReadonlySnapshot } = await loadValuation();
    const item = makeItem(ASSET_ID, { indexer: 'PREFIXADO', appliedValue: 500 });
    const snapshot = makeSnapshot({ items: [item] });
    const enriched = enrichFixedIncomeReadonlySnapshot(snapshot, {
      [ASSET_ID]: okSupplement({ annualRate: -0.05 }),
    });
    assert.equal(enriched.items[0].appliedValue, 500);
  });
});
