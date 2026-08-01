import assert from 'node:assert/strict';
import test from 'node:test';
const { createReturnsViewModel } = await import('../modern/src/features/returns/readonlyReturnsViewModel.ts');

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

test('createReturnsViewModel usa totalValue real', () => {
  const vm = createReturnsViewModel(makeSnapshot());
  assert.strictEqual(vm.summary.totalValue, 700);
});

test('createReturnsViewModel calcula resultado total e rentabilidade', () => {
  const vm = createReturnsViewModel(makeSnapshot());
  // invested: PETR4 10*20=200, MXRF11 5*100=500 => 700
  // current values 250+450=700
  // result = 0, rentability 0
  assert.strictEqual(vm.summary.totalResult, 0);
  assert.strictEqual(vm.summary.rentabilityPct, 0);
});

test('createReturnsViewModel conta positivos/negativos/neutros', () => {
  const vm = createReturnsViewModel(makeSnapshot());
  // PETR4 rent 25% positive, MXRF11 -10% negative
  assert.strictEqual(vm.summary.positiveCount, 1);
  assert.strictEqual(vm.summary.negativeCount, 1);
  assert.strictEqual(vm.summary.neutralCount, 0);
});

test('createReturnsViewModel categoria performance', () => {
  const vm = createReturnsViewModel(makeSnapshot());
  assert.strictEqual(vm.categoryPerformance.length, 2);
  const cat = vm.categoryPerformance.find(c => c.category === 'Acao demo');
  assert.ok(cat);
  assert.strictEqual(cat.totalValue, 250);
});

test('createReturnsViewModel topGainers/topLosers', () => {
  const vm = createReturnsViewModel(makeSnapshot());
  assert.strictEqual(vm.topGainers.length, 1);
  assert.strictEqual(vm.topLosers.length, 1);
});

test('snapshot vazio retorna hasData false', () => {
  const vm = createReturnsViewModel({ version:1, generatedAt:'2026-07-15T12:00:00.000Z', notice:'', summary:{totalValue:0,itemCount:0,averageVariationPct:0}, items:[] });
  assert.strictEqual(vm.hasData, false);
  assert.strictEqual(vm.summary.totalValue, 0);
});

test('imutabilidade do snapshot', () => {
  const snap = makeSnapshot();
  const original = JSON.stringify(snap);
  createReturnsViewModel(snap);
  assert.strictEqual(JSON.stringify(snap), original);
});