// v1.6 E1 — testes determinísticos da renda prevista e da meta mensal.
// Somente dados sintéticos. Caracteriza o comportamento atual sem alterar regras financeiras.
// Defeitos preexistentes ficam como `todo` com a causa, para não mascarar regressões.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const P = require('../analytics-passive-income-projection.js');
const root = path.join(__dirname, '..');

// Math.random é usado pelo Monte Carlo do relatório; fixar para tornar o teste determinístico.
function withFixedRandom(fn) {
  const original = Math.random;
  let s = 42;
  Math.random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  try { return fn(); } finally { Math.random = original; }
}

const ASSETS = [
  { ticker: 'AAAA3', qty: 10, current_price: 10, dy: 10 }, // posição 100, renda anual 10
  { ticker: 'BBBB11', qty: 5, current_price: 20, dy: 6 },  // posição 100, renda anual 6
];

test('renda prevista: carteira sintética soma valor, renda anual, mensal e DY médio', () => {
  const y = P.calculatePortfolioYield(ASSETS);
  assert.equal(y.totalValue, 200);
  assert.equal(y.annualIncome, 16);
  assert.equal(y.monthlyIncome, 1.33);
  assert.equal(y.avgDY, 8);
});

test('renda prevista: entrada nula, ausente ou não-array resulta em zeros', () => {
  for (const input of [null, undefined, 'x', {}, []]) {
    assert.deepEqual(P.calculatePortfolioYield(input), { monthlyIncome: 0, annualIncome: 0, totalValue: 0, avgDY: 0 });
  }
});

test('renda prevista: quantidade zero ou preço zero excluem a posição do total', () => {
  // Comportamento atual: posição sem preço não é reportada como desconhecida; entra como zero.
  const y = P.calculatePortfolioYield([
    { qty: 0, current_price: 5, dy: 5 },
    { qty: 5, current_price: 0, dy: 9 },
    { qty: 10, current_price: 10, dy: 10 },
  ]);
  assert.equal(y.totalValue, 100);
  assert.equal(y.annualIncome, 10);
});

test('renda prevista: valores textuais inválidos viram zero via Number()', () => {
  const y = P.calculatePortfolioYield([
    { qty: 'abc', current_price: 10, dy: 10 },
    { qty: 10, current_price: 10, dy: '5' },
  ]);
  assert.equal(y.totalValue, 100);
  assert.equal(y.annualIncome, 5);
});

test('renda prevista não usa proventos recebidos: renda mensal atual depende só do DY', () => {
  const proventos = [
    { ticker: 'AAAA3', payment_date: '2025-03-10', value_gross: 999 },
    { ticker: 'AAAA3', payment_date: '2025-06-10', value_gross: 999 },
  ];
  const semProventos = P.generateFullProjectionReport({ assets: ASSETS, proventos: [], goals: {} });
  const comProventos = withFixedRandom(() => P.generateFullProjectionReport({ assets: ASSETS, proventos, goals: {} }));
  assert.equal(comProventos.goalTracking.currentMonthly, semProventos.goalTracking.currentMonthly);
  assert.equal(comProventos.goalTracking.currentMonthly, 1.33);
});

test('CAGR de dividendos: menos de dois períodos retorna zero e confiança baixa', () => {
  const r = P.calculateDividendCAGR([{ ticker: 'A', payment_date: '2025-01-01', value_gross: 100 }]);
  assert.equal(r.cagr, 0);
  assert.equal(r.confidence, 'LOW');
});

test('CAGR de dividendos: crescimento sintético de 100 para 110 em um ano', () => {
  const r = P.calculateDividendCAGR([
    { ticker: 'A', payment_date: '2021-03-01', value_gross: 100 },
    { ticker: 'A', payment_date: '2022-03-01', value_gross: 110 },
  ]);
  assert.equal(r.annualGrowth, 10);
  assert.equal(r.periods, 2);
});

test('CAGR de dividendos: confiança sobe com o número de anos', () => {
  const serie = (n) => Array.from({ length: n }, (_, i) => ({ ticker: 'A', payment_date: `${2020 + i}-06-01`, value_gross: 100 + i }));
  assert.equal(P.calculateDividendCAGR(serie(3)).confidence, 'MEDIUM');
  assert.equal(P.calculateDividendCAGR(serie(5)).confidence, 'HIGH');
});

test('CAGR de dividendos: primeiro ano com valor não positivo não gera crescimento', () => {
  const r = P.calculateDividendCAGR([
    { ticker: 'A', payment_date: '2021-03-01', value_gross: 0 },
    { ticker: 'A', payment_date: '2022-03-01', value_gross: 110 },
  ]);
  assert.equal(r.cagr, 0);
});

test('meta mensal não configurada: targetMonthly é zero, progresso zero e falta zero', () => {
  // Comportamento atual: "não configurada" e "zero configurado" produzem o mesmo resultado.
  // Risco registrado: a interface pode exibir 0% como se fosse medição. Não alterar aqui.
  const r = withFixedRandom(() => P.generateFullProjectionReport({ assets: ASSETS, proventos: [], goals: {} }));
  assert.equal(r.goalTracking.targetMonthly, 0);
  assert.equal(r.goalTracking.progressPercent, 0);
  assert.equal(r.goalTracking.gap, 0);
});

test('meta mensal configurada: progresso e falta calculados sobre a renda prevista', () => {
  const r = withFixedRandom(() => P.generateFullProjectionReport({
    assets: ASSETS, proventos: [], goals: { proventos: { monthly: 10 } },
  }));
  assert.equal(r.goalTracking.targetMonthly, 10);
  assert.equal(r.goalTracking.currentMonthly, 1.33);
  assert.equal(r.goalTracking.progressPercent, 13.3);
  assert.equal(r.goalTracking.gap, 8.67);
});

test('meta mensal atingida: progresso limitado a 100% e falta zero', () => {
  const r = withFixedRandom(() => P.generateFullProjectionReport({
    assets: ASSETS, proventos: [], goals: { proventos: { monthly: 1 } },
  }));
  assert.equal(r.goalTracking.progressPercent, 100);
  assert.equal(r.goalTracking.gap, 0);
});

test('projeção DRIP com carteira sintética preserva o valor quando não há reinvestimento de crescimento', () => {
  const d = P.projectWithDRIP({
    currentPortfolioValue: 1000, currentMonthlyIncome: 8.33, dividendGrowthRate: 0,
    priceGrowthRate: 0, reinvestmentRate: 0, years: 1, dividendYield: 10,
  });
  assert.equal(d.finalPortfolioValue, 1000);
  assert.equal(d.totalInvested, 1000);
});

test('projeção DRIP com reinvestimento total aumenta valor e renda', () => {
  const d = P.projectWithDRIP({
    currentPortfolioValue: 1000, currentMonthlyIncome: 8.33, dividendGrowthRate: 0,
    priceGrowthRate: 0, reinvestmentRate: 1, years: 1, dividendYield: 10,
  });
  assert.ok(d.finalPortfolioValue > 1000);
  assert.ok(d.finalMonthlyIncome > 8.33);
  assert.ok(d.totalDividendsReceived > 0);
});

// Regressão E1.1: antes, currentYield = renda*12 / valor dividia por zero em carteira vazia
// e o NaN se propagava para toda a projeção. Carteiras válidas não mudam (ver casos acima).
test('regressão E1.1: carteira vazia sem aporte projeta zeros finitos', () => {
  const d = P.projectWithDRIP({ currentPortfolioValue: 0, currentMonthlyIncome: 0, years: 1 });
  assert.equal(d.finalPortfolioValue, 0);
  assert.equal(d.finalMonthlyIncome, 0);
  assert.equal(d.totalInvested, 0);
});

test('regressão E1.1: carteira vazia com aporte converte o aporte em valor, sem NaN', () => {
  const d = P.projectWithDRIP({ currentPortfolioValue: 0, currentMonthlyIncome: 0, monthlyContribution: 1000, years: 1 });
  assert.equal(d.totalInvested, 12000);
  assert.equal(d.finalPortfolioValue, 11000); // aporte do último mês entra após o cálculo do valor, como já ocorria
  assert.equal(d.finalMonthlyIncome, 0); // sem yield mensurável não há renda projetada
  assert.ok(Number.isFinite(d.finalPortfolioValue));
});

test('regressão E1.1: renda negativa ou valor negativo tratados como carteira vazia', () => {
  const d = P.projectWithDRIP({ currentPortfolioValue: -500, currentMonthlyIncome: 10, years: 1 });
  assert.ok(Number.isFinite(d.finalPortfolioValue));
  assert.ok(Number.isFinite(d.finalMonthlyIncome));
});

test('regressão E1.1: relatório com carteira vazia não contém nenhum número não finito', () => {
  const r = withFixedRandom(() => P.generateFullProjectionReport({ assets: [], proventos: [], goals: {} }));
  const nonFinite = [];
  (function walk(o, p) {
    if (typeof o === 'number') { if (!Number.isFinite(o)) nonFinite.push(p); return; }
    if (o && typeof o === 'object') Object.keys(o).forEach(k => walk(o[k], `${p}.${k}`));
  })(r, '');
  assert.deepEqual(nonFinite, []);
  assert.equal(r.portfolio.totalValue, 0);
  assert.equal(r.goalTracking.progressPercent, 0);
});

test('regressão E1.1: carteira válida mantém resultados de referência', () => {
  const d = P.projectWithDRIP({ currentPortfolioValue: 1000, currentMonthlyIncome: 8.33, dividendGrowthRate: 0, priceGrowthRate: 0, reinvestmentRate: 1, years: 1, dividendYield: 10 });
  assert.equal(d.finalPortfolioValue, 1104.67);
  assert.equal(d.finalMonthlyIncome, 9.2);
  const c = P.projectWithDRIP({ currentPortfolioValue: 1000, currentMonthlyIncome: 8.33, monthlyContribution: 100, years: 1 });
  assert.equal(c.finalPortfolioValue, 2251.65);
  assert.equal(c.finalMonthlyIncome, 18.76);
});

test('meses parciais: média mensal da renda realizada usa só meses COMPLETE (regra estática em index.html)', () => {
  // Regra existente em passiveIncomeGoalStats: média apenas de meses com cobertura COMPLETE;
  // status PARTIAL quando há menos de 12 meses completos; UNKNOWN quando não há nenhum.
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const start = html.indexOf('function passiveIncomeGoalStats(');
  assert.ok(start >= 0, 'passiveIncomeGoalStats deve existir');
  const body = html.slice(start, html.indexOf('\n}\n', start));
  assert.match(body, /completeMonths=byMonth\.filter\(month=>month\.coverage==='COMPLETE'\)/);
  assert.match(body, /completeMonthCount===12\?'COMPLETE':completeMonthCount\?'PARTIAL':'UNKNOWN'/);
});
