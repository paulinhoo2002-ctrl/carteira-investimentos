'use strict';
// C9 + D6 (F-08, F-12, F-13): simulações Monte Carlo reproduzíveis e robustas.
// Estratégia: Math.random com semente (mulberry32) torna a simulação determinística; fórmulas fechadas
// (volatilidade 0) e momentos teóricos validam a distribuição; uma cópia da implementação ANTERIOR
// (com `||`) prova que, para entradas válidas e positivas, a metodologia não mudou.
// Os números "dourados" caracterizam o algoritmo com a semente indicada (regressão de metodologia).
const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyRichFixture } = require('./helpers/fp-rich-fixture');
const { resolveChromePath } = require('./helpers/chrome-path');

const repo = path.join(__dirname, '..');
const passive = require('../analytics-passive-income-projection.js');
const wealth = require('../analytics-wealth-goals.js');

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const realRandom = Math.random;
test.afterEach(() => { Math.random = realRandom; });
const seeded = (seed, fn) => { Math.random = mulberry32(seed); try { return fn(); } finally { Math.random = realRandom; } };
const withoutAssumptions = ({ assumptions, ...rest }) => rest;

const params = { currentValue: 100000, targetValue: 165100, monthlyContribution: 1000, expectedReturn: 0.10, volatility: 0.15, years: 10, simulations: 200 };
const futureValue = (current, monthly, annualReturn, years) => {
  let value = current;
  for (let month = 0; month < years * 12; month += 1) value = value * (1 + annualReturn / 12) + monthly;
  return Math.round(value);
};

// Cópia fiel da implementação ANTERIOR (antes de F-12/F-13) para comparar entradas válidas positivas.
function legacyMonteCarlo(p) {
  const currentValue = p.currentValue || 0;
  const targetValue = p.targetValue || currentValue * 2;
  const monthlyContribution = p.monthlyContribution || 0;
  const expectedReturn = p.expectedReturn || 0.10;
  const volatility = p.volatility || 0.15;
  const years = p.years || 10;
  const simulations = p.simulations || 200;
  const monthlyReturn = expectedReturn / 12;
  const monthlyVolatility = volatility / Math.sqrt(12);
  const months = years * 12;
  const finalValues = [];
  for (let sim = 0; sim < simulations; sim += 1) {
    let value = currentValue;
    for (let month = 0; month < months; month += 1) {
      const random1 = Math.random();
      const random2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(random1)) * Math.cos(2 * Math.PI * random2);
      value = value * (1 + monthlyReturn - 0.5 * monthlyVolatility * monthlyVolatility + monthlyVolatility * z) + monthlyContribution;
    }
    finalValues.push(value);
  }
  finalValues.sort((a, b) => a - b);
  const at = fraction => finalValues[Math.floor(simulations * fraction)];
  return {
    targetValue,
    probabilitySuccess: Math.round((finalValues.filter(v => v >= targetValue).length / simulations) * 10000) / 100,
    percentiles: { p10: Math.round(at(0.10)), p25: Math.round(at(0.25)), p50: Math.round(at(0.50)), p75: Math.round(at(0.75)), p90: Math.round(at(0.90)) },
    expectedValue: Math.round(finalValues.reduce((a, b) => a + b, 0) / simulations),
    simulations,
  };
}

test('mesma semente => mesmo resultado nas duas implementações (reprodutível), e os módulos concordam entre si', () => {
  const a = seeded(12345, () => passive.monteCarloWealthProjection(params));
  const b = seeded(12345, () => passive.monteCarloWealthProjection(params));
  assert.deepEqual(a, b);
  const w = seeded(12345, () => wealth.monteCarloGoalProbability(params));
  assert.equal(w.probability, a.probabilitySuccess);
  assert.deepEqual(w.percentiles, { p10: a.percentiles.p10, p50: a.percentiles.p50, p90: a.percentiles.p90 });
  assert.equal(w.expectedValue, a.expectedValue);
  const other = seeded(777, () => passive.monteCarloWealthProjection(params));
  assert.notDeepEqual(other.percentiles, a.percentiles, 'semente diferente muda a trajetória');
});

test('caracterização da metodologia com semente 12345 (regressão: qualquer mudança no algoritmo aparece aqui)', () => {
  const result = seeded(12345, () => passive.monteCarloWealthProjection(params));
  assert.deepEqual(withoutAssumptions(result), {
    targetValue: 165100,
    probabilitySuccess: 100,
    percentiles: { p10: 255896, p25: 316673, p50: 398280, p75: 508337, p90: 653852 },
    expectedValue: 430128,
    simulations: 200,
  });
  assert.deepEqual(result.assumptions, { expectedReturn: 0.10, volatility: 0.15, years: 10, simulations: 200, defaultsApplied: [] });
});

test('metodologia preservada: para entradas válidas e positivas o resultado é idêntico ao da implementação anterior', () => {
  let compared = 0;
  for (const seed of [1, 7, 42, 99, 2026]) {
    for (const input of [
      { ...params },
      { ...params, expectedReturn: 0.06, volatility: 0.22, years: 15, monthlyContribution: 500 },
      { ...params, expectedReturn: 0.14, volatility: 0.35, years: 5, simulations: 400, targetValue: 300000 },
      { currentValue: 50000, targetValue: 90000, monthlyContribution: 0, expectedReturn: 0.1, volatility: 0.15, years: 10 },
    ]) {
      const current = seeded(seed, () => passive.monteCarloWealthProjection(input));
      const legacy = seeded(seed, () => legacyMonteCarlo(input));
      assert.deepEqual(withoutAssumptions(current), legacy, `semente ${seed}`);
      const wealthResult = seeded(seed, () => wealth.monteCarloGoalProbability({ ...input, targetValue: input.targetValue || input.currentValue * 2 }));
      assert.equal(wealthResult.probability, legacy.probabilitySuccess);
      assert.deepEqual(wealthResult.percentiles, { p10: legacy.percentiles.p10, p50: legacy.percentiles.p50, p90: legacy.percentiles.p90 });
      compared += 1;
    }
  }
  assert.equal(compared, 20);
});

test('F-12: zero é valor, não ausência (retorno 0, volatilidade 0, horizonte 0) nos dois módulos', () => {
  const noReturn = futureValue(100000, 1000, 0, 10);
  assert.equal(noReturn, 220000);
  for (const result of [
    passive.monteCarloWealthProjection({ ...params, expectedReturn: 0, volatility: 0 }),
    wealth.monteCarloGoalProbability({ ...params, expectedReturn: 0, volatility: 0 }),
  ]) {
    assert.equal(result.percentiles.p50, noReturn);
    assert.equal(result.expectedValue, noReturn);
    assert.deepEqual(result.assumptions.defaultsApplied, []);
  }
  const expected = futureValue(100000, 1000, 0.10, 10);
  assert.equal(expected, 475549);
  const volatilityZero = [passive.monteCarloWealthProjection({ ...params, volatility: 0 }), wealth.monteCarloGoalProbability({ ...params, volatility: 0 })];
  volatilityZero.forEach(result => {
    assert.equal(result.percentiles.p10, expected);
    assert.equal(result.percentiles.p90, expected);
    assert.equal(result.assumptions.volatility, 0);
  });
  const horizonZero = passive.monteCarloWealthProjection({ ...params, years: 0, targetValue: 150000 });
  assert.equal(horizonZero.percentiles.p50, 100000);
  assert.equal(horizonZero.probabilitySuccess, 0);
  assert.equal(horizonZero.assumptions.years, 0);
});

test('F-12: entradas inválidas rejeitam a simulação sem emitir probabilidade ou percentis', () => {
  const cases = [
    ['currentValue', [-1, NaN, Infinity]],
    ['targetValue', [0, -1, NaN, Infinity]],
    ['monthlyContribution', [-1, NaN, Infinity]],
    ['expectedReturn', [-1, NaN, Infinity, -Infinity, true, 1.01]],
    ['volatility', [-0.01, NaN, Infinity, 1.01]],
    ['years', [-1, NaN, Infinity, 100.01]],
    ['simulations', [0, -1, NaN, Infinity, 10001, 1.5]],
  ];
  let randomCalls = 0;
  Math.random = () => { randomCalls += 1; return 0.5; };
  for (const [name, values] of cases) {
    for (const value of values) {
      const input = { ...params, [name]: value };
      for (const result of [passive.monteCarloWealthProjection(input), wealth.monteCarloGoalProbability(input)]) {
        assert.equal(result.valid, false, `${name}=${String(value)} deve rejeitar`);
        assert.equal(result.error, 'INVALID_INPUT');
        assert.ok(result.invalidParameters.includes(name), `${name} deve ser identificado`);
        assert.equal('probability' in result || 'probabilitySuccess' in result, false, 'não deve gerar probabilidade');
        assert.equal('percentiles' in result || 'expectedValue' in result, false, 'não deve gerar valores financeiros');
      }
    }
  }
  assert.equal(randomCalls, 0, 'entrada inválida é rejeitada antes da simulação');
});

test('F-12: ausência usa apenas o padrão documentado de simulações e o registra', () => {
  for (const result of [
    seeded(5, () => passive.monteCarloWealthProjection({ ...params, simulations: undefined })),
    seeded(5, () => wealth.monteCarloGoalProbability({ ...params, simulations: undefined }))
  ]) {
    assert.notEqual(result.valid, false);
    assert.equal(result.assumptions.simulations, 200);
    assert.deepEqual(result.assumptions.defaultsApplied, ['simulations']);
  }
});

test('F-12: entradas não numéricas explícitas e metas ausentes falham sem fallback silencioso', () => {
  for (const input of [
    { ...params, expectedReturn: 'abc' },
    { ...params, volatility: '' },
    { ...params, years: null },
    { ...params, targetValue: undefined }
  ]) {
    for (const result of [passive.monteCarloWealthProjection(input), wealth.monteCarloGoalProbability(input)]) {
      assert.equal(result.valid, false);
      assert.equal(result.error, 'INVALID_INPUT');
      assert.ok(result.invalidParameters.length > 0);
      assert.equal(result.probability ?? result.probabilitySuccess, undefined);
    }
  }
});

test('F-13: Math.random() === 0 não gera infinito/NaN e vira a menor fração positiva do gerador (2^-53)', () => {
  const draws = [];
  Math.random = () => { const n = draws.length; draws.push(n); return n === 0 ? 0 : 0.5; };
  const withZeroFirst = passive.monteCarloWealthProjection({ ...params, simulations: 1, years: 1 / 12 });
  assert.ok(Number.isFinite(withZeroFirst.expectedValue), `expectedValue=${withZeroFirst.expectedValue}`);
  const tail = Math.sqrt(-2 * Math.log(Math.pow(2, -53)));
  assert.ok(tail > 8.5 && tail < 8.6, `cauda extrema legítima ≈ 8,57σ (${tail})`);
  const expected = Math.round(100000 * (1 + 0.10 / 12 - 0.5 * (0.15 / Math.sqrt(12)) ** 2 + (0.15 / Math.sqrt(12)) * tail * Math.cos(2 * Math.PI * 0.5)) + 1000);
  assert.equal(withZeroFirst.expectedValue, expected);
  Math.random = () => 0;
  [passive.monteCarloWealthProjection({ ...params, simulations: 5 }), wealth.monteCarloGoalProbability({ ...params, simulations: 5 })].forEach(result => {
    assert.ok(Number.isFinite(result.expectedValue));
    Object.values(result.percentiles).forEach(value => assert.ok(Number.isFinite(value)));
  });
});

test('limites e resultados extremos dentro do domínio: sempre finitos e com percentis ordenados', () => {
  const extremes = [
    { expectedReturn: -0.25, volatility: 0.2, years: 30 },
    { expectedReturn: 0.5, volatility: 0.3, years: 30 },
    { expectedReturn: 0, volatility: 0, years: 100 },
    { expectedReturn: 0.1, volatility: 0.5, years: 60, simulations: 1 },
    { expectedReturn: 0.1, volatility: 0.15, years: 0, simulations: 10000 },
    { expectedReturn: 0.1, volatility: 0.15, years: 1 / 12, simulations: 1 },
  ];
  for (const seed of [1, 2, 3]) {
    for (const extra of extremes) {
      const result = seeded(seed, () => passive.monteCarloWealthProjection({ ...params, ...extra }));
      assert.notEqual(result.valid, false, JSON.stringify(extra));
      const p = result.percentiles;
      assert.ok([p.p10, p.p25, p.p50, p.p75, p.p90, result.expectedValue].every(Number.isFinite), JSON.stringify(extra));
      assert.ok(p.p10 <= p.p25 && p.p25 <= p.p50 && p.p50 <= p.p75 && p.p75 <= p.p90, `percentis fora de ordem ${JSON.stringify(extra)}`);
      assert.ok(result.probabilitySuccess >= 0 && result.probabilitySuccess <= 100);
    }
  }
});

test('D6: limites inválidos são rejeitados determinística e explicitamente', () => {
  const cases = [
    ['expectedReturn', -1.01], ['expectedReturn', 1.01],
    ['volatility', -0.01], ['volatility', 1.01],
    ['years', -1], ['years', 101],
    ['simulations', 0], ['simulations', 10001], ['simulations', 1.5],
    ['currentValue', -1], ['targetValue', 0], ['monthlyContribution', -1]
  ];
  for (const [name, value] of cases) {
    const input = { ...params, [name]: value };
    for (const simulate of [passive.monteCarloWealthProjection, wealth.monteCarloGoalProbability]) {
      const result = simulate(input);
      assert.equal(result.valid, false, `${name}=${value}`);
      assert.ok(result.invalidParameters.includes(name), `${name} must be reported`);
      assert.equal(result.probability ?? result.probabilitySuccess ?? result.percentiles, undefined);
    }
  }
  for (const value of [NaN, Infinity, -Infinity]) {
    const result = passive.monteCarloWealthProjection({ ...params, expectedReturn: value });
    assert.equal(result.valid, false);
    assert.ok(result.invalidParameters.includes('expectedReturn'));
  }
});

test('distribuição: o retorno mensal simulado tem a média e a variância teóricas (1 mês, 10.000 simulações, semente fixa)', () => {
  const mu = 0.10 / 12;
  const sigma = 0.15 / Math.sqrt(12);
  const expectedMean = 100000 * (1 + mu - 0.5 * sigma * sigma);
  const result = seeded(2026, () => passive.monteCarloWealthProjection({ currentValue: 100000, targetValue: 1, monthlyContribution: 0, expectedReturn: 0.10, volatility: 0.15, years: 1 / 12, simulations: 10000 }));
  const standardError = 100000 * sigma / Math.sqrt(10000);
  assert.ok(Math.abs(result.expectedValue - expectedMean) < 4 * standardError, `média ${result.expectedValue} vs teórica ${expectedMean.toFixed(0)} (EP ${standardError.toFixed(0)})`);
  // dispersão: (p90 - p10) ≈ 2,563σ·V0 (±8%)
  const spread = result.percentiles.p90 - result.percentiles.p10;
  const theoretical = 100000 * sigma * 2.5631;
  assert.ok(Math.abs(spread - theoretical) / theoretical < 0.08, `dispersão ${spread} vs ${theoretical.toFixed(0)}`);
  assert.ok(Math.abs(result.percentiles.p50 - 100000 * (1 + mu - 0.5 * sigma * sigma)) < 4 * standardError);
});

test('propriedades que não dependem do acaso: ordem dos percentis, probabilidade em [0,100], monotonicidade com a mesma semente', () => {
  for (const seed of [1, 2, 3, 42, 2026]) {
    const base = seeded(seed, () => passive.monteCarloWealthProjection(params));
    const p = base.percentiles;
    assert.ok(p.p10 <= p.p25 && p.p25 <= p.p50 && p.p50 <= p.p75 && p.p75 <= p.p90, `percentis fora de ordem (semente ${seed})`);
    assert.ok(base.probabilitySuccess >= 0 && base.probabilitySuccess <= 100);
    const harder = seeded(seed, () => passive.monteCarloWealthProjection({ ...params, targetValue: 700000 }));
    assert.ok(harder.probabilitySuccess <= base.probabilitySuccess, 'meta maior não pode ter mais chance (mesmos caminhos)');
    const moreContribution = seeded(seed, () => passive.monteCarloWealthProjection({ ...params, monthlyContribution: 2000 }));
    assert.ok(moreContribution.percentiles.p50 >= base.percentiles.p50, 'mais aporte não reduz a mediana (mesmos caminhos)');
  }
});

test('limites históricos preservados: meta já atingida = 100; meta ausente/zero = 0 (rótulo é da tela)', () => {
  assert.equal(wealth.monteCarloGoalProbability({ ...params, targetValue: 50000 }).probability, 100);
  for (const result of [
    wealth.monteCarloGoalProbability({ ...params, targetValue: 0 }),
    wealth.monteCarloGoalProbability({ ...params, targetValue: undefined })
  ]) {
    assert.equal(result.valid, false);
    assert.equal(result.error, 'INVALID_INPUT');
    assert.equal('probability' in result, false);
  }
});

test('UI: com Math.random semeado a tela Metas mostra os mesmos valores de Monte Carlo em renderizações repetidas', async () => {
  const harness = await startLocalHttpServer(repo);
  const browser = await chromium.launch({ executablePath: resolveChromePath(), headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await page.goto(harness.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await applyRichFixture(page);
    const readMonteCarlo = async () => {
      await page.evaluate(() => {
        function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
        Math.random = mulberry32(12345);
        go('metas');
        document.querySelectorAll('#root details').forEach(item => { item.open = true; });
      });
      await page.waitForTimeout(300);
      return page.evaluate(() => {
        const lines = document.querySelector('.wrap').innerText.split('\n').map(line => line.trim()).filter(Boolean);
        return lines.filter(line => /Monte Carlo|Prob\. Sucesso|Prob\. atingir|Mediana/.test(line));
      });
    };
    const first = await readMonteCarlo();
    await page.evaluate(() => go('dashboard'));
    const second = await readMonteCarlo();
    assert.ok(first.length >= 2, 'a tela Metas exibe as linhas de Monte Carlo');
    assert.deepEqual(second, first);
  } finally {
    await browser.close();
    harness.server.close();
  }
});
