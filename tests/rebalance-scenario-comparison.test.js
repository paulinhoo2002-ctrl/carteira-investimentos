const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function makeHarness() {
  const start = source.indexOf('function rebalanceContributionDistribution(');
  const end = source.indexOf('function ajudarTab(){', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const context = {
    Math, Number, String, Array, Object, Map, Set,
    S: { assets: [] },
    allocationGoalItems: () => [
      { type: 'Ação', pct: 60 },
      { type: 'FII', pct: 40 },
    ],
    allocationActualByType: () => ({
      total: 10000,
      map: { 'Ação': 4000, 'FII': 6000 },
    }),
  };
  return { context, exported: vm.runInNewContext(`${source.slice(start, end)}; ({ rebalanceContributionDistribution, rebalanceScenarioValues, rebalanceScenarioComparison });`, context) };
}

function officialInputs() {
  return [
    [{ type: 'Ação', pct: 60 }, { type: 'FII', pct: 40 }],
    { total: 10000, map: { 'Ação': 4000, 'FII': 6000 } },
  ];
}

test('comparacao reutiliza a distribuicao oficial para cada valor', () => {
  const { exported } = makeHarness();
  const values = [1000, 3000, 5000];
  const [goals, actual] = officialInputs();
  const scenarios = exported.rebalanceScenarioComparison(values, goals, actual);

  assert.equal(scenarios.length, 3);
  values.forEach((value, index) => {
    const direct = exported.rebalanceContributionDistribution(value, goals, actual);
    assert.deepEqual(scenarios[index], direct);
  });
});

test('comparacao preserva distribuicao, sobra e peso futuro por cenario', () => {
  const { exported } = makeHarness();
  const [goals, actual] = officialInputs();
  const scenarios = exported.rebalanceScenarioComparison([1000, 3000, 5000], goals, actual);

  for (const scenario of scenarios) {
    assert.equal(scenario.distributedTotal + scenario.unallocated, scenario.amount);
    assert.equal(scenario.rows.some(row => row.gapPct < 0), true);
    assert.equal(scenario.rows.every(row => Number.isFinite(row.projectedPct)), true);
    assert.equal(scenario.rows.every(row => Number.isFinite(row.allocation)), true);
    assert.equal(JSON.stringify(scenario).includes('NaN'), false);
    assert.equal(JSON.stringify(scenario).includes('Infinity'), false);
  }
});

test('comparacao aceita cenarios iguais, limita a tres e ignora entradas invalidas', () => {
  const { exported } = makeHarness();
  const [goals, actual] = officialInputs();

  assert.equal(exported.rebalanceScenarioComparison([3000, 3000], goals, actual).length, 2);
  assert.equal(JSON.stringify(exported.rebalanceScenarioValues([0, -1, '', 'texto', NaN, 1000, 3000, 5000, 7000])), JSON.stringify([1000, 3000, 5000]));
  assert.equal(exported.rebalanceScenarioComparison([1000], goals, actual).length, 0);
});

test('comparacao e somente leitura e nao altera o estado da carteira', () => {
  const { context, exported } = makeHarness();
  const before = JSON.stringify(context.S);
  const [goals, actual] = officialInputs();
  exported.rebalanceScenarioComparison([1000, 3000, 5000], goals, actual);
  assert.equal(JSON.stringify(context.S), before);
});
