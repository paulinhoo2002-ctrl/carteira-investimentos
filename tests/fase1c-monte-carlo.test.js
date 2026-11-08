'use strict';
// C9 (F-08): testes reproduzíveis das simulações Monte Carlo, SEM alterar a metodologia financeira.
// Estratégia: substituir Math.random por um gerador com semente (mulberry32) — a simulação passa a
// ser determinística e comparável — e verificar propriedades que não dependem do acaso (fórmula
// fechada com volatilidade ~0, ordem dos percentis, monotonicidade). Os números "dourados" abaixo
// caracterizam o algoritmo ATUAL com a semente indicada (regressão de metodologia), não uma verdade
// financeira: a probabilidade é uma estimativa de simulação.
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

const params = { currentValue: 100000, targetValue: 165100, monthlyContribution: 1000, expectedReturn: 0.10, volatility: 0.15, years: 10, simulations: 200 };
const futureValue = (current, monthly, annualReturn, years) => {
  let value = current;
  for (let month = 0; month < years * 12; month += 1) value = value * (1 + annualReturn / 12) + monthly;
  return Math.round(value);
};

test('mesma semente => mesmo resultado nas duas implementações (reprodutível), e os módulos concordam entre si', () => {
  const a = seeded(12345, () => passive.monteCarloWealthProjection(params));
  const b = seeded(12345, () => passive.monteCarloWealthProjection(params));
  assert.deepEqual(a, b);
  const w = seeded(12345, () => wealth.monteCarloGoalProbability(params));
  assert.equal(w.probability, a.probabilitySuccess);
  assert.equal(w.percentiles.p10, a.percentiles.p10);
  assert.equal(w.percentiles.p50, a.percentiles.p50);
  assert.equal(w.percentiles.p90, a.percentiles.p90);
  assert.equal(w.expectedValue, a.expectedValue);
  const other = seeded(777, () => passive.monteCarloWealthProjection(params));
  assert.notDeepEqual(other.percentiles, a.percentiles, 'semente diferente muda a trajetória');
});

test('caracterização da metodologia atual com semente 12345 (regressão: qualquer mudança no algoritmo aparece aqui)', () => {
  const result = seeded(12345, () => passive.monteCarloWealthProjection(params));
  assert.deepEqual(result, {
    targetValue: 165100,
    probabilitySuccess: 100,
    percentiles: { p10: 255896, p25: 316673, p50: 398280, p75: 508337, p90: 653852 },
    expectedValue: 430128,
    simulations: 200,
  });
});

test('sem aleatoriedade efetiva (volatilidade ~0) o resultado é a fórmula fechada de valor futuro', () => {
  const expected = futureValue(100000, 1000, 0.10, 10);
  assert.equal(expected, 475549);
  const exact = wealth.monteCarloGoalProbability({ ...params, volatility: 0 });
  assert.deepEqual(exact.percentiles, { p10: expected, p50: expected, p90: expected });
  assert.equal(exact.expectedValue, expected);
  assert.equal(exact.probability, 100);
  const nearZero = passive.monteCarloWealthProjection({ ...params, volatility: 1e-9 });
  assert.equal(nearZero.percentiles.p50, expected);
  assert.equal(nearZero.expectedValue, expected);
});

test('propriedades que não dependem do acaso: percentis ordenados, probabilidade em [0,100], monotonicidade com a mesma semente', () => {
  for (const seed of [1, 2, 3, 42, 2026]) {
    const base = seeded(seed, () => passive.monteCarloWealthProjection(params));
    const p = base.percentiles;
    assert.ok(p.p10 <= p.p25 && p.p25 <= p.p50 && p.p50 <= p.p75 && p.p75 <= p.p90, `percentis fora de ordem (semente ${seed})`);
    assert.ok(base.probabilitySuccess >= 0 && base.probabilitySuccess <= 100);
    const harder = seeded(seed, () => passive.monteCarloWealthProjection({ ...params, targetValue: 700000 }));
    assert.ok(harder.probabilitySuccess <= base.probabilitySuccess, 'meta maior não pode ter mais chance (mesmos caminhos)');
    const moreContribution = seeded(seed, () => passive.monteCarloWealthProjection({ ...params, monthlyContribution: 2000 }));
    assert.ok(moreContribution.percentiles.p50 >= base.percentiles.p50, 'mais aporte não reduz a mediana (mesmos caminhos)');
    const longer = seeded(seed, () => wealth.monteCarloGoalProbability({ ...params, targetValue: 400000, years: 5 }));
    const longest = seeded(seed, () => wealth.monteCarloGoalProbability({ ...params, targetValue: 400000, years: 15 }));
    assert.ok(longest.probability >= longer.probability - 25, 'horizonte maior não deve derrubar a probabilidade de forma drástica');
  }
});

test('limites: meta já atingida = 100; meta ausente/zero = 0 (o texto "Meta não configurada" é responsabilidade da tela)', () => {
  assert.deepEqual(wealth.monteCarloGoalProbability({ ...params, targetValue: 50000 }), { probability: 100 });
  assert.deepEqual(wealth.monteCarloGoalProbability({ ...params, targetValue: 0 }), { probability: 0 });
  assert.deepEqual(wealth.monteCarloGoalProbability({ ...params, targetValue: undefined }), { probability: 0 });
});

test('Math.random constante: trajetória única (percentis iguais), sem NaN', () => {
  Math.random = () => 0.5;
  const result = wealth.monteCarloGoalProbability({ ...params, simulations: 5 });
  assert.equal(result.percentiles.p10, result.percentiles.p50);
  assert.equal(result.percentiles.p50, result.percentiles.p90);
  assert.ok(Number.isFinite(result.expectedValue));
});

test('Math.random() === 0 não deve produzir infinito/NaN', { todo: 'F-13: log(0) => z=Infinity => percentis nulos e probabilidade 100% (probabilidade ~2^-53 por sorteio; corrigir em fase financeira própria)' }, () => {
  Math.random = () => 0;
  const result = wealth.monteCarloGoalProbability({ ...params, simulations: 5 });
  assert.ok(Number.isFinite(result.expectedValue), `expectedValue=${result.expectedValue}`);
});

test('parâmetro zero é respeitado (retorno esperado 0 não vira 10%)', { todo: 'F-12: monteCarloWealthProjection usa `params.expectedReturn || 0.10`; hoje a tela passa valores fixos, mas 0 seria trocado pelo padrão' }, () => {
  const result = passive.monteCarloWealthProjection({ ...params, expectedReturn: 0, volatility: 1e-9 });
  assert.equal(result.expectedValue, 100000 + 1000 * 120);
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
