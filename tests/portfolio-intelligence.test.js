const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadEngine() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const start = source.indexOf('function portfolioInsightsSnapshot(');
  const end = source.indexOf('function dashboardInsightsPanel(', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const context = {
    fmt: value => `R$ ${Number(value || 0).toFixed(2)}`,
    console,
  };
  return vm.runInNewContext(`${source.slice(start, end)}\nportfolioInsightsSnapshot;`, context);
}

function baseSource(overrides = {}) {
  return {
    concentration: [],
    typeRows: [],
    rf: {},
    income: { hasData: false, currentMonthTotal: 0, monthlyAvg: 0, target: 0, missing: 0 },
    financialGoals: {},
    quality: { summary: { issueCount: 0 } },
    ...overrides,
  };
}

test('carteira vazia nao cria insights artificiais', () => {
  assert.equal(loadEngine()(baseSource()).length, 0);
});

test('concentracao e classe dominante sao fatos derivados e ordenados', () => {
  const insights = loadEngine()(baseSource({
    concentration: [{ ticker: 'PETR4', current: 2140, share: 21.4 }],
    typeRows: [{ type: 'Acoes', value: 5000, share: 50 }],
  }));
  assert.deepEqual(Array.from(insights, item => item.id), ['concentration-dominant-class', 'concentration-top-asset']);
  assert.equal(insights[1].relatedRoute, 'ativos');
  assert.match(insights[1].description, /21\.4%/);
});

test('RF vencida tem prioridade sobre janela futura e preserva dados de evidencia', () => {
  const insights = loadEngine()(baseSource({ rf: { overdue: 1, soon30: 2, soon90: 3, missingDue: 1, missingCurrent: 1 } }));
  assert.equal(insights.find(item => item.id === 'rf-overdue').severity, 'IMPORTANT');
  assert.equal(insights.some(item => item.id === 'rf-due-soon'), false);
  assert.equal(insights.find(item => item.id === 'rf-missing-maturity').evidence.count, 1);
});

test('RF proxima, meta e renda abaixo da media geram contexto acionavel', () => {
  const insights = loadEngine()(baseSource({
    rf: { soon30: 2 },
    income: { hasData: true, currentMonthTotal: 80, monthlyAvg: 100, target: 120, missing: 20 },
    financialGoals: { patrimonyTarget: 1000, portfolioCurrent: 700 },
  }));
  assert.deepEqual(Array.from(insights, item => item.id), ['rf-due-soon', 'income-goal-gap', 'patrimony-goal-progress', 'income-below-average']);
  assert.equal(insights.every(item => item.relatedRoute), true);
});

test('meta patrimonial concluida e renda acima da media sao informativas', () => {
  const insights = loadEngine()(baseSource({
    income: { hasData: true, currentMonthTotal: 120, monthlyAvg: 100, target: 100, missing: 0 },
    financialGoals: { patrimonyTarget: 1000, portfolioCurrent: 1200 },
  }));
  assert.deepEqual(Array.from(insights, item => item.id), ['patrimony-goal-reached', 'income-above-average']);
  assert.equal(insights.every(item => item.severity === 'INFO'), true);
});

test('meta patrimonial sem patrimonio atual nao inventa progresso zero', () => {
  const insights = loadEngine()(baseSource({ financialGoals: { patrimonyTarget: 1000, portfolioCurrent: null } }));
  assert.equal(insights.some(item => item.category === 'goals'), false);
});

test('qualidade de dados aparece uma vez e o resultado nao contem valores invalidos', () => {
  const source = baseSource({ quality: { summary: { issueCount: 3 } } });
  const insights = loadEngine()(source);
  assert.equal(insights.filter(item => item.id === 'data-quality-review').length, 1);
  assert.equal(JSON.stringify(insights).includes('NaN'), false);
  assert.equal(JSON.stringify(insights).includes('Infinity'), false);
  assert.equal(JSON.stringify(insights).includes('undefined'), false);
  assert.deepEqual(source, baseSource({ quality: { summary: { issueCount: 3 } } }));
});
