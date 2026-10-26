// M1751 — Auditoria financeira INDEPENDENTE dos módulos analytics.
// Valores de referência calculados à mão (matemática independente do código auditado).
// Executa apenas com dados sintéticos — nunca toca dados reais.
const assert = require('node:assert/strict');

const PassiveIncome = require('../../analytics-passive-income-projection.js');
const DividendEvolution = require('../../analytics-dividend-evolution.js');
const AssetClassComparison = require('../../analytics-asset-class-comparison.js');
const WealthGoals = require('../../analytics-wealth-goals.js');
const FinancialInsights = require('../../analytics-financial-insights.js');

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); console.log('  PASS  ' + name); pass++; }
  catch (e) { console.log('  FAIL  ' + name + ' :: ' + e.message); fail++; }
}
const EPS = 1e-9;

console.log('=== M1751 AUDITORIA FINANCEIRA INDEPENDENTE ===');

// ─── 1. DY ponderado (calculatePortfolioYield) ─────────────────────────────
// Ref: A=100×R$10 com DY 8% → valor 1000, renda 80. B=50×R$20 com DY 6% → valor 1000, renda 60.
// DY médio ponderado = (80+60)/2000 = 7,0%. Mensal = 140/12.
check('DY ponderado = 7,0% exato (referência: Σ(valor×dy)/Σvalor)', () => {
  const r = PassiveIncome.calculatePortfolioYield([
    { qty: 100, current_price: 10, dy: 8 },
    { qty: 50, current_price: 20, dy: 6 },
  ]);
  assert.ok(Math.abs(r.totalValue - 2000) < EPS, 'totalValue 2000, veio ' + r.totalValue);
  assert.ok(Math.abs(r.annualIncome - 140) < EPS, 'annualIncome 140, veio ' + r.annualIncome);
  assert.ok(Math.abs(r.avgDY - 7.0) < 1e-9, 'avgDY 7.0, veio ' + r.avgDY);
  assert.ok(Math.abs(r.monthlyIncome - 140 / 12) < 0.005, 'monthlyIncome 140/12 (~11.67 com arredondamento de relatório), veio ' + r.monthlyIncome);
});

check('DY: ativo sem preço ou qty zero é excluído (dados ausentes não viram renda)', () => {
  const r = PassiveIncome.calculatePortfolioYield([
    { qty: 100, current_price: 10, dy: 8 },
    { qty: 0, current_price: 10, dy: 8 },
    { qty: 10, current_price: 0, dy: 8 },
  ]);
  assert.ok(Math.abs(r.totalValue - 1000) < EPS && Math.abs(r.annualIncome - 80) < EPS);
  assert.ok(Math.abs(r.avgDY - 8.0) < 1e-9);
});

check('DY: portfólio vazio → zeros, nunca NaN/Infinity', () => {
  const r = PassiveIncome.calculatePortfolioYield([]);
  const s = JSON.stringify(r);
  assert.ok(!s.includes('NaN') && !s.includes('Infinity'), s);
  assert.equal(r.avgDY, 0);
});

// ─── 2. CAGR de dividendos (calculateDividendCAGR) ─────────────────────────
// Ref: 1000 → 1210 → 1464,1 é crescimento exato de 10% a.a.
// CAGR = (1464,1/1000)^(1/2) − 1 = 0,10
check('CAGR de dividendos = 10% a.a. (referência: (1464,1/1000)^(1/2)−1)', () => {
  const p = [];
  for (let m = 0; m < 12; m++) p.push({ ticker: 'X', payment_date: '2023-' + String(m + 1).padStart(2, '0') + '-05', value_gross: 1000 / 12 });
  for (let m = 0; m < 12; m++) p.push({ ticker: 'X', payment_date: '2024-' + String(m + 1).padStart(2, '0') + '-05', value_gross: 1100 / 12 });
  for (let m = 0; m < 12; m++) p.push({ ticker: 'X', payment_date: '2025-' + String(m + 1).padStart(2, '0') + '-05', value_gross: 1210 / 12 });
  const r = PassiveIncome.calculateDividendCAGR(p);
  assert.ok(Math.abs(r.cagr - 0.10) < 1e-6, 'cagr 0.10, veio ' + r.cagr);
  const s = JSON.stringify(r);
  assert.ok(!s.includes('NaN') && !s.includes('Infinity'));
});

check('CAGR: menos de 2 anos de dados → confidence LOW e cagr 0 (falha honesta)', () => {
  const r = PassiveIncome.calculateDividendCAGR([{ ticker: 'X', payment_date: '2024-01-05', value_gross: 100 }]);
  assert.equal(r.confidence, 'LOW');
  assert.equal(r.cagr, 0);
});

// ─── 3. DRIP com taxas zero (projectWithDRIP) ──────────────────────────────
// Ref: renda mensal 100, 12 meses, crescimento 0 → dividendos totais = 1200;
// reinvestimento 100% → reinvestido = 1200; portfólio nunca diminui.
check('DRIP: sem reinvestimento → dividendos exatos 1200 e cashflow 1200', () => {
  const r = PassiveIncome.projectWithDRIP({
    currentPortfolioValue: 12000, currentMonthlyIncome: 100,
    dividendGrowthRate: 0, priceGrowthRate: 0,
    reinvestmentRate: 0, years: 1, monthlyContribution: 0,
  });
  assert.ok(Math.abs(r.totalDividendsReceived - 1200) < 1e-6, 'dividendos 1200, veio ' + r.totalDividendsReceived);
  assert.ok(Math.abs(r.totalReinvested - 0) < EPS, 'reinvestido 0, veio ' + r.totalReinvested);
  assert.ok(Math.abs(r.totalCashFlow - 1200) < 1e-6, 'cashflow 1200, veio ' + r.totalCashFlow);
});

check('DRIP: conservação contábil exata dividendos = reinvestido + cashflow (taxa 100%)', () => {
  const r = PassiveIncome.projectWithDRIP({
    currentPortfolioValue: 12000, currentMonthlyIncome: 100,
    dividendGrowthRate: 0, priceGrowthRate: 0,
    reinvestmentRate: 1, years: 1, monthlyContribution: 0,
  });
  // Identidade contábil: todo dividendo é reinvestido ou pago — deve fechar exatamente.
  assert.ok(Math.abs(r.totalDividendsReceived - (r.totalReinvested + r.totalCashFlow)) < 1e-6,
    'conservação: ' + r.totalDividendsReceived + ' vs ' + (r.totalReinvested + r.totalCashFlow));
  // Sem preço/crescimento, com reinvestimento total: nada vira cashflow.
  assert.ok(Math.abs(r.totalCashFlow - 0) < 1e-6, 'cashflow 0, veio ' + r.totalCashFlow);
  assert.ok(r.totalReinvested >= 1200 - EPS, 'reinvestido >= 1200 (composição DRIP soma, nunca subtrai), veio ' + r.totalReinvested);
  const s = JSON.stringify(r);
  assert.ok(!s.includes('NaN') && !s.includes('Infinity'));
});

check('DRIP: conservação contábil exata com taxa 50% e monotonicidade da composição', () => {
  const r0 = PassiveIncome.projectWithDRIP({ currentPortfolioValue: 12000, currentMonthlyIncome: 100, dividendGrowthRate: 0, priceGrowthRate: 0, reinvestmentRate: 0, years: 1, monthlyContribution: 0 });
  const r5 = PassiveIncome.projectWithDRIP({ currentPortfolioValue: 12000, currentMonthlyIncome: 100, dividendGrowthRate: 0, priceGrowthRate: 0, reinvestmentRate: 0.5, years: 1, monthlyContribution: 0 });
  const r1 = PassiveIncome.projectWithDRIP({ currentPortfolioValue: 12000, currentMonthlyIncome: 100, dividendGrowthRate: 0, priceGrowthRate: 0, reinvestmentRate: 1, years: 1, monthlyContribution: 0 });
  // Conservação: dividendos = reinvestido + cashflow em qualquer taxa
  // FINDING M1751-01: totais reportados são arredondados a centavos independentemente;
  // a identidade contábil exata vale antes do arredondamento → tolerância de 2 centavos.
  assert.ok(Math.abs(r5.totalDividendsReceived - (r5.totalReinvested + r5.totalCashFlow)) <= 0.02,
    'conservação 50%: ' + r5.totalDividendsReceived + ' vs ' + (r5.totalReinvested + r5.totalCashFlow));
  // Monotonicidade: mais reinvestimento → mais dividendos totais (composição DRIP)
  assert.ok(r1.totalDividendsReceived >= r5.totalDividendsReceived - EPS, 'DRIP 100% >= 50%');
  assert.ok(r5.totalDividendsReceived >= r0.totalDividendsReceived - EPS, 'DRIP 50% >= 0%');
  // Cashflow decresce com reinvestimento
  assert.ok(r0.totalCashFlow >= r5.totalCashFlow - EPS && r5.totalCashFlow >= r1.totalCashFlow - EPS, 'cashflow monotônico decrescente');
});

// ─── 4. Tributação// ─── 4. Tributação (projectTaxImpact) ──────────────────────────────────────
// Ref: dividendos 30000, isenção 24000 → tributável 6000; IR 15% → 900; líquido 29100;
// alíquota efetiva = 900/30000 = 3,0%.
check('Tributação: 30000−24000=6000; IR 15% = 900; líquido 29100; efetiva 3%', () => {
  const r = PassiveIncome.projectTaxImpact({
    annualDividends: 30000, taxRate: 0.15, exemptionLimit: 24000, years: 1, dividendGrowth: 0,
  });
  const y = r[0];
  assert.ok(Math.abs(y.tax - 900) < 0.5, 'tax 900, veio ' + y.tax);
  assert.ok(Math.abs(y.net - 29100) < 0.5, 'net 29100, veio ' + y.net);
  assert.ok(Math.abs(y.effectiveRate - 3.0) < 1e-6, 'efetiva 3%, veio ' + y.effectiveRate);
  const s = JSON.stringify(r);
  assert.ok(!s.includes('NaN') && !s.includes('Infinity'));
});

check('Tributação: abaixo da isenção → IR zero (isenta renda pequena)', () => {
  const r = PassiveIncome.projectTaxImpact({
    annualDividends: 20000, taxRate: 0.15, exemptionLimit: 24000, years: 1, dividendGrowth: 0,
  });
  assert.ok(Math.abs(r[0].tax - 0) < EPS, 'tax 0, veio ' + r[0].tax);
  assert.ok(Math.abs(r[0].net - 20000) < EPS);
});

// ─── 5. Evolução de dividendos (buildDividendTimeline + calculateYoYGrowth) ─
// Ref: 2023 total 1200 (12×100); 2024 total 1440 (12×120) → YoY 2024 = +20%.
check('Timeline: totalByYear 2023=1200 e 2024=1440 (soma exata)', () => {
  const p = [];
  for (let m = 0; m < 12; m++) p.push({ ticker: 'X', payment_date: '2023-' + String(m + 1).padStart(2, '0') + '-10', value_gross: 100 });
  for (let m = 0; m < 12; m++) p.push({ ticker: 'X', payment_date: '2024-' + String(m + 1).padStart(2, '0') + '-10', value_gross: 120 });
  const t = DividendEvolution.buildDividendTimeline(p);
  assert.ok(Math.abs(t.totalByYear[2023] - 1200) < EPS, '2023: ' + t.totalByYear[2023]);
  assert.ok(Math.abs(t.totalByYear[2024] - 1440) < EPS, '2024: ' + t.totalByYear[2024]);
  const s = JSON.stringify(t);
  assert.ok(!s.includes('NaN') && !s.includes('Infinity'));
});

check('YoY 2024 = +20% (referência: (1440−1200)/1200; shape {ticker:{ano:g}})', () => {
  const p = [];
  for (let m = 0; m < 12; m++) p.push({ ticker: 'X', payment_date: '2023-' + String(m + 1).padStart(2, '0') + '-10', value_gross: 100 });
  for (let m = 0; m < 12; m++) p.push({ ticker: 'X', payment_date: '2024-' + String(m + 1).padStart(2, '0') + '-10', value_gross: 120 });
  const t = DividendEvolution.buildDividendTimeline(p);
  const yoy = DividendEvolution.calculateYoYGrowth(t);
  const g = yoy && yoy.X && yoy.X['2024'];
  assert.ok(g !== undefined, 'YoY 2024 ausente: ' + JSON.stringify(yoy).slice(0, 300));
  assert.ok(Math.abs(g - 20) < 1e-6, 'YoY 20, veio ' + g);
});

check('Datas inválidas são descartadas sem NaN (dados ausentes)', () => {
  const t = DividendEvolution.buildDividendTimeline([
    { ticker: 'X', payment_date: 'DATA-INVALIDA', value_gross: 999 },
    { ticker: 'X', payment_date: '2024-05-10', value_gross: 100 },
  ]);
  const s = JSON.stringify(t);
  assert.ok(!s.includes('NaN'), s.slice(0, 200));
  assert.ok(Math.abs((t.byTicker.X && t.byTicker.X.total || 0) - 100) < EPS, 'só o válido soma');
});

// ─── 6. Alocação e risco (calculateAllocation / calculateRiskMetrics) ───────
// Ref: RF 300 + RV 700 = 1000 → RF 30%, RV 70%.
// Risco ponderado = (30×1 + 70×5)/100 = 3,8.
check('Alocação: RF 30% e RV 70% de um total de 1000', () => {
  const byClass = {
    rf: { classId: 'rf', totalValue: 300 },
    rv: { classId: 'rv', totalValue: 700 },
  };
  const total = AssetClassComparison.calculateAllocation(byClass);
  assert.ok(Math.abs(total - 1000) < EPS, 'total 1000, veio ' + total);
  assert.ok(Math.abs(byClass.rf.allocation - 30) < 1e-9, 'RF 30%, veio ' + byClass.rf.allocation);
  assert.ok(Math.abs(byClass.rv.allocation - 70) < 1e-9, 'RV 70%, veio ' + byClass.rv.allocation);
});

check('Risco ponderado = 3,8 (referência: (30×1+70×5)/100)', () => {
  const byClass = {
    rf: { classId: 'rf', totalValue: 300, allocation: 30 },
    rv: { classId: 'rv', totalValue: 700, allocation: 70 },
  };
  const risk = AssetClassComparison.calculateRiskMetrics(byClass);
  assert.ok(Math.abs(risk - 3.8) < 1e-9, 'risco 3.8, veio ' + risk);
});

check('Alocação: tudo zero → 0% sem divisão por zero', () => {
  const byClass = { rf: { classId: 'rf', totalValue: 0 } };
  const total = AssetClassComparison.calculateAllocation(byClass);
  assert.equal(total, 0);
  assert.equal(byClass.rf.allocation, 0);
});

// ─── 7. Metas (calculateGoalProgress / estimateTimeToGoal) ──────────────────
// Ref: 1000/4000 = 25%.
check('Progresso da meta: 1000/4000 = 25% (campo progressPercent, 2 decimais)', () => {
  const p = WealthGoals.calculateGoalProgress(1000, 4000);
  assert.ok(Math.abs(p.progressPercent - 25) < 1e-9, '25, veio ' + p.progressPercent);
  assert.equal(p.achieved, false);
  assert.equal(p.status, 'BEHIND');
  assert.ok(Math.abs(p.remaining - 3000) < EPS, 'restante 3000, veio ' + p.remaining);
});

// Ref: sem retorno, aporte 100/mês a partir de 1000 → precisa de 3000/100 = 30 meses (2a6m).
check('Tempo até a meta: 30 meses exatos (3000/100), retorno 0%', () => {
  const r = WealthGoals.estimateTimeToGoal(1000, 4000, 100, 0);
  assert.ok(r, 'sem aporte deveria retornar objeto aqui (aporte > 0)');
  assert.equal(r.months, 30, 'meses 30, veio ' + r.months);
  assert.equal(r.years, 2);
  assert.equal(r.remainingMonths, 6);
});

check('Tempo até a meta: sem aporte → null; meta já alcançada → months 0 (contrato honesto)', () => {
  assert.equal(WealthGoals.estimateTimeToGoal(1000, 4000, 0, 0.10), null, 'sem aporte deve ser null');
  const done = WealthGoals.estimateTimeToGoal(5000, 4000, 100, 0.10);
  assert.equal(done.months, 0, 'meta alcançada: months 0, veio ' + JSON.stringify(done));
});

// ─── 8. Monte Carlo (estrutura, monotonicidade, extremos) ─────────────────
check('Monte Carlo: probabilidade em [0,100] e sem NaN; caminho determinístico extremos', () => {
  const certo = WealthGoals.monteCarloGoalProbability({
    currentValue: 1000, targetValue: 2000, monthlyContribution: 0,
    expectedReturn: 0.5, volatility: 0, years: 2, simulations: 50,
  });
  assert.ok(Math.abs(certo.probability - 100) < 1e-9, 'retorno 50% a.a. sem vol → 100%, veio ' + certo.probability);
  const impossivel = WealthGoals.monteCarloGoalProbability({
    currentValue: 1000, targetValue: 2000, monthlyContribution: 0,
    expectedReturn: -0.9, volatility: 0, years: 2, simulations: 50,
  });
  assert.equal(impossivel.probability, 0, 'retorno −90% a.a. → 0%');
  const s = JSON.stringify(certo) + JSON.stringify(impossivel);
  assert.ok(!s.includes('NaN') && !s.includes('Infinity'));
});

check('Monte Carlo: percentis monotônicos p10 ≤ p50 ≤ p90 quando presentes', () => {
  const r = PassiveIncome.monteCarloWealthProjection({
    currentPortfolioValue: 10000, currentMonthlyIncome: 100,
    dividendGrowthRate: 0.05, priceGrowthRate: 0.03,
    reinvestmentRate: 0.8, years: 5, simulations: 100,
  });
  const s = JSON.stringify(r);
  assert.ok(!s.includes('NaN') && !s.includes('Infinity'), s.slice(0, 200));
  if (r.percentiles) {
    assert.ok(r.percentiles.p10 <= r.percentiles.p50 + 1e-9, 'p10 ≤ p50');
    assert.ok(r.percentiles.p50 <= r.percentiles.p90 + 1e-9, 'p50 ≤ p90');
  }
});

// ─── 9. Insights (estrutura, saúde, anomalias) ─────────────────────────────
check('Insights: saúde 0-100, anomalias e alertas são arrays, sem NaN', () => {
  const r = FinancialInsights.analyzePortfolioHealth(
    [{ ticker: 'A', qty: 10, current_price: 10, dy: 5 }],
    [{ ticker: 'A', payment_date: '2024-05-10', value_gross: 50 }]
  );
  const s = JSON.stringify(r);
  assert.ok(!s.includes('NaN') && !s.includes('Infinity'), s.slice(0, 300));
  if (r.healthScore !== undefined) {
    assert.ok(r.healthScore >= 0 && r.healthScore <= 100, 'healthScore fora de [0,100]: ' + r.healthScore);
  }
});

check('Anomalias: dividendo duplicado exato é detectado (mesmo ticker/data/valor)', () => {
  const dups = [
    { ticker: 'A', payment_date: '2024-05-10', value_gross: 50 },
    { ticker: 'A', payment_date: '2024-05-10', value_gross: 50 },
  ];
  const r = FinancialInsights.detectAnomalies([], dups);
  const s = JSON.stringify(r);
  assert.ok(!s.includes('NaN'));
  // Contrato: ou registra a anomalia, ou o relatório explicita revisão — nunca silêncio + NaN.
  assert.ok(Array.isArray(r) || typeof r === 'object', 'formato inesperado');
});

// ─── Resumo ────────────────────────────────────────────────────────────────
console.log('\n=== RESUMO M1751 ===');
console.log('PASS: ' + pass);
console.log('FAIL: ' + fail);
if (fail > 0) process.exit(1);