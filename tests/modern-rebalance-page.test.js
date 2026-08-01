import assert from 'node:assert/strict';
import test from 'node:test';
const { createRebalanceViewModel } = await import('../modern/src/features/rebalance/readonlyRebalanceViewModel.ts');

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

test('createRebalanceViewModel usa totalValue e distribution reais', () => {
  const vm = createRebalanceViewModel(makeSnapshot());
  assert.strictEqual(vm.hasData, true);
  assert.strictEqual(vm.totalValue, 700);
  assert.strictEqual(vm.classCount, 2);
  assert.strictEqual(vm.distribution.length, 2);
  const cat = vm.distribution.find((c) => c.category === 'Acao demo');
  assert.ok(cat);
  assert.strictEqual(cat.currentValue, 250);
  assert.strictEqual(cat.currentAllocationPct, 50);
  assert.strictEqual(cat.itemCount, 1);
});

test('createRebalanceViewModel nunca produz alvo', () => {
  const vm = createRebalanceViewModel(makeSnapshot());
  assert.strictEqual(vm.hasTargetAllocation, false);
  for (const cat of vm.distribution) {
    assert.ok(!('targetAllocationPct' in cat));
    assert.ok(!('deviationPct' in cat));
  }
  assert.ok(!('totalDeviation' in vm));
});

test('snapshot vazio retorna hasData false', () => {
  const vm = createRebalanceViewModel({ version: 1, generatedAt: '2026-07-15T12:00:00.000Z', notice: '', summary: { totalValue: 0, itemCount: 0, averageVariationPct: 0 }, items: [] });
  assert.strictEqual(vm.hasData, false);
  assert.strictEqual(vm.totalValue, 0);
  assert.strictEqual(vm.classCount, 0);
  assert.strictEqual(vm.distribution.length, 0);
  assert.strictEqual(vm.hasTargetAllocation, false);
});

test('imutabilidade do snapshot', () => {
  const snap = makeSnapshot();
  const original = JSON.stringify(snap);
  createRebalanceViewModel(snap);
  assert.strictEqual(JSON.stringify(snap), original);
});
