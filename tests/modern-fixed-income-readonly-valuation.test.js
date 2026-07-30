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

  it('15. summary recalcula totalCombinedTaxValue mesmo com projecao', async () => {
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
});
