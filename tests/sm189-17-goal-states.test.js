const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Extrai uma função nomeada do index.html por contagem de chaves (sem executar o app).
function extractFunction(name) {
  const start = html.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} precisa existir`);
  let depth = 0;
  let opened = false;
  for (let i = html.indexOf('{', start); i < html.length; i += 1) {
    const ch = html[i];
    if (ch === '{') { depth += 1; opened = true; }
    if (ch === '}') { depth -= 1; if (opened && depth === 0) return html.slice(start, i + 1); }
  }
  throw new Error(`fim de ${name} não encontrado`);
}

const FN = ['normalizeGoals', 'goalProgressMetrics', 'financialGoalsTone', 'financialGoalsBarColor', 'financialGoalsBar', 'dashboardFinancialGoalsPanel'];

function loadGoalCode(stubs = {}) {
  const ctx = {
    console,
    Number, Math, JSON, Set, Array, Object, String,
    normalizeType: (t) => t,
    fmt: (v) => `R$ ${Number(v).toFixed(2)}`,
    esc: (v) => String(v ?? ''),
    passiveIncomeValue: (v) => `R$ ${Number(v || 0).toFixed(2)}`,
    S: {},
    ...stubs,
  };
  vm.createContext(ctx);
  vm.runInContext(FN.map(extractFunction).join('\n'), ctx);
  return ctx;
}

const SYNTH_PAT = 800000; // valor sintético de teste (não é meta real)

test('ausência de meta: normalização produz alvo zero e progresso sem alvo', () => {
  const c = loadGoalCode();
  const g = c.normalizeGoals({});
  assert.equal(g.patrimonio.target, 0);
  const m = c.goalProgressMetrics(500000, g.patrimonio.target);
  assert.equal(m.hasTarget, false);
  assert.equal(m.percent, null);
  assert.equal(m.reached, false);
});

test('valores nulos, indefinidos e inválidos viram alvo zero, sem NaN', () => {
  const c = loadGoalCode();
  // O painel usa Number(target)||0 e exige > 0; replicamos essa regra de efeito.
  for (const target of [null, undefined, 'abc', NaN, -50]) {
    const g = c.normalizeGoals({ patrimonio: { target } });
    const effective = Number(g.patrimonio.target) || 0;
    const usable = effective > 0 ? effective : 0;
    assert.equal(usable, 0, `alvo efetivo deve ser zero para ${String(target)}`);
    assert.equal(c.goalProgressMetrics(1000, usable).hasTarget, false);
  }
});

test('meta explicitamente zero é tratada como não configurada (sem divisão por zero)', () => {
  const c = loadGoalCode();
  const m = c.goalProgressMetrics(500000, 0);
  assert.equal(m.hasTarget, false);
  assert.equal(m.barPercent, 0);
  assert.equal(Number.isNaN(m.barPercent), false);
  assert.equal(Number.isFinite(m.barPercent), true);
});

test('meta positiva válida preserva progresso, falta e atingida', () => {
  const c = loadGoalCode();
  const g = c.normalizeGoals({ patrimonio: { target: SYNTH_PAT } });
  assert.equal(g.patrimonio.target, SYNTH_PAT);
  const m = c.goalProgressMetrics(620000, SYNTH_PAT);
  assert.equal(m.hasTarget, true);
  assert.equal(m.percent, 77.5);
  assert.equal(m.missing, 180000);
  assert.equal(m.reached, false);
  const ok = c.goalProgressMetrics(900000, SYNTH_PAT);
  assert.equal(ok.reached, true);
  assert.equal(ok.excess, 100000);
});

test('painel sem meta: rótulo "não configurada", sem sugestão e sem progresso fictício', () => {
  const c = loadGoalCode({ S: { goals: {} } });
  const snapshot = {
    hasPortfolioData: true,
    portfolioCurrent: 620000,
    goals: c.normalizeGoals({}),
    currentIncome: 0,
    currentIncomeCoverage: 'COMPLETE',
    income: { monthlyAvg: null, completeMonthCount: 0 },
    historySummary: {},
    latestMonth: null,
    previousMonth: null,
    currentIncomeCount: 0,
    currentMonthLabel: 'mês',
  };
  const out = c.dashboardFinancialGoalsPanel({ financialGoals: snapshot, income: snapshot.income });
  assert.equal(/sugerida visualmente/.test(out), false);
  assert.equal((out.match(/Meta não configurada/g) || []).length >= 2, true);
  assert.equal(/% alcançado/.test(out), false, 'não deve exibir percentual sem meta');
  assert.equal(/R\$ 0,00/.test(out), false);
});

test('painel com meta válida mostra o alvo informado, não o padrão', () => {
  const c = loadGoalCode({ S: { goals: { patrimonio: { target: SYNTH_PAT } } } });
  const snapshot = {
    hasPortfolioData: true,
    portfolioCurrent: 620000,
    goals: c.normalizeGoals({ patrimonio: { target: SYNTH_PAT } }),
    currentIncome: 0,
    currentIncomeCoverage: 'COMPLETE',
    income: { monthlyAvg: null, completeMonthCount: 0 },
    historySummary: {},
    latestMonth: null,
    previousMonth: null,
    currentIncomeCount: 0,
    currentMonthLabel: 'mês',
  };
  const out = c.dashboardFinancialGoalsPanel({ financialGoals: snapshot, income: snapshot.income });
  assert.equal(out.includes(`Meta R$ ${SYNTH_PAT.toFixed(2)}`), true);
  assert.equal(out.includes('77,5% alcançado'), true);
});

test('meta indisponível (carteira sem dados) não vira progresso nem zero', () => {
  const c = loadGoalCode();
  const m = c.goalProgressMetrics(null, SYNTH_PAT);
  assert.equal(m.hasCurrent, false);
  assert.equal(m.percent, null);
  assert.equal(c.financialGoalsTone(m), 'muted');
});

test('normalização não muta o objeto de entrada (sem escrita implícita)', () => {
  const c = loadGoalCode();
  const input = { patrimonio: { target: SYNTH_PAT } };
  const before = JSON.stringify(input);
  c.normalizeGoals(input);
  assert.equal(JSON.stringify(input), before);
});

test('estados sucessivos não vazam entre usuários (funções puras)', () => {
  const c = loadGoalCode();
  const a = c.normalizeGoals({ patrimonio: { target: SYNTH_PAT } });
  const b = c.normalizeGoals({});
  assert.equal(a.patrimonio.target, SYNTH_PAT);
  assert.equal(b.patrimonio.target, 0);
});

test('o trecho de cálculo não contém valor fixo como alvo padrão', () => {
  const src = FN.map(extractFunction).join('\n');
  assert.equal(/Target\s*=\s*patrimonyConfigured>0 \? patrimonyConfigured : \d{4,}/.test(src), false);
  assert.equal(/Target\s*=\s*incomeConfigured>0 \? incomeConfigured : \d{4,}/.test(src), false);
  assert.equal(/sugerida visualmente/.test(src), false);
});

test('painel e cálculo não chamam persistência', () => {
  const src = FN.map(extractFunction).join('\n');
  assert.equal(/\bsave\(\)/.test(src), false);
  assert.equal(/localStorage|setItem|firestore|\.set\(/.test(src), false);
});
