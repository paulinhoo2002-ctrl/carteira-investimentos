import assert from 'node:assert/strict';
import test from 'node:test';
const { createNetWorthViewModel } = await import('../modern/src/features/net-worth/readonlyNetWorthViewModel.ts');

function makeSnapshot(overrides = {}) {
  return {
    version: 1,
    generatedAt: '2026-07-15T12:00:00.000Z',
    notice: 'test',
    summary: { totalValue: 1000, itemCount: 2, averageVariationPct: 5 },
    items: [
      { ticker: 'PETR4', name: 'Petrobras', category: 'Acao demo', quantity: 10, averagePrice: 20, currentValue: 250, variationPct: 25, allocationPct: 50, trend: 'positive' },
      { ticker: 'MXRF11', name: 'Maxi Renda', category: 'FII demo', quantity: 5, averagePrice: 100, currentValue: 450, variationPct: -10, allocationPct: 50, trend: 'negative' },
    ],
    ...overrides,
  };
}

test('createNetWorthViewModel totalValue e itemCount', () => {
  const vm = createNetWorthViewModel(makeSnapshot());
  assert.strictEqual(vm.summary.totalValue, 700);
  assert.strictEqual(vm.summary.itemCount, 2);
});

test('createNetWorthViewModel distribution por classe', () => {
  const vm = createNetWorthViewModel(makeSnapshot());
  assert.strictEqual(vm.distribution.length, 2);
  const cat = vm.distribution.find(d => d.category === 'Acao demo');
  assert.ok(cat);
  assert.strictEqual(cat.currentValue, 250);
  assert.strictEqual(cat.allocationPct, 50);
});

test('createNetWorthViewModel topPositions', () => {
  const vm = createNetWorthViewModel(makeSnapshot());
  assert.strictEqual(vm.topPositions.length, 2);
  assert.strictEqual(vm.topPositions[0].ticker, 'MXRF11'); // higher currentValue
});

test('snapshot vazio retorna hasData false', () => {
  const vm = createNetWorthViewModel({ version:1, generatedAt:'2026-07-15T12:00:00.000Z', notice:'', summary:{totalValue:0,itemCount:0,averageVariationPct:0}, items:[] });
  assert.strictEqual(vm.hasData, false);
});

test('imutabilidade do snapshot', () => {
  const snap = makeSnapshot();
  const original = JSON.stringify(snap);
  createNetWorthViewModel(snap);
  assert.strictEqual(JSON.stringify(snap), original);
});