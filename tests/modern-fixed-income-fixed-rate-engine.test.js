const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ENGINE_PATH = path.join(__dirname, '..', 'modern', 'src', 'domain', 'fixedIncome', 'fixedRateEngine.ts');

async function loadEngine() {
  return import(pathToFileURL(ENGINE_PATH).href);
}

const TOLERANCE = 1e-12;

describe('fixedRateEngine - calculateFixedRateGrossValue', () => {
  it('1. R$ 1.000,00, taxa 12%, 252 dias', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: 1000,
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });

    assert.equal(result.status, 'ok');
    assert.equal(result.principal, 1000);
    assert.equal(result.annualRate, 0.12);
    assert.equal(result.elapsedBusinessDays, 252);
    assert.equal(result.businessDaysPerYear, 252);
    assert.ok(Math.abs(result.periodFactor - 1.12) < TOLERANCE);
    assert.equal(result.grossValue, 1120);
    assert.equal(result.grossProfit, 120);
  });

  it('2. R$ 5.000,00, taxa 10%, 252 dias', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: 5000,
      annualRate: 0.10,
      elapsedBusinessDays: 252,
    });

    assert.equal(result.status, 'ok');
    assert.ok(Math.abs(result.periodFactor - 1.10) < TOLERANCE);
    assert.equal(result.grossValue, 5500);
    assert.equal(result.grossProfit, 500);
  });

  it('3. R$ 1.000,00, taxa 12%, 504 dias (2 períodos)', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: 1000,
      annualRate: 0.12,
      elapsedBusinessDays: 504,
    });

    assert.equal(result.status, 'ok');
    assert.ok(Math.abs(result.periodFactor - 1.2544) < TOLERANCE);
    assert.ok(Math.abs(result.grossValue - 1254.4) < 1e-10);
    assert.ok(Math.abs(result.grossProfit - 254.4) < 1e-10);
  });

  it('4. período parcial - 126 dias (0.5 período)', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: 1000,
      annualRate: 0.12,
      elapsedBusinessDays: 126,
    });

    assert.equal(result.status, 'ok');
    const expectedFactor = Math.sqrt(1.12);
    assert.ok(Math.abs(result.periodFactor - expectedFactor) < TOLERANCE);
    assert.ok(Math.abs(result.grossValue - 1000 * expectedFactor) < 1e-10);
    assert.ok(Math.abs(result.grossProfit - (1000 * expectedFactor - 1000)) < 1e-10);
  });

  it('5. taxa zero', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: 1000,
      annualRate: 0,
      elapsedBusinessDays: 252,
    });

    assert.equal(result.status, 'ok');
    assert.ok(Math.abs(result.periodFactor - 1) < TOLERANCE);
    assert.equal(result.grossValue, 1000);
    assert.equal(result.grossProfit, 0);
  });

  it('6. período zero', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: 1000,
      annualRate: 0.12,
      elapsedBusinessDays: 0,
    });

    assert.equal(result.status, 'ok');
    assert.ok(Math.abs(result.periodFactor - 1) < TOLERANCE);
    assert.equal(result.grossValue, 1000);
    assert.equal(result.grossProfit, 0);
  });

  it('7. principal zero', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: 0,
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });

    assert.equal(result.status, 'ok');
    assert.equal(result.principal, 0);
    assert.equal(result.grossValue, 0);
    assert.equal(result.grossProfit, 0);
  });

  it('8. principal negativo', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: -100,
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });

    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_PRINCIPAL');
  });

  it('9. principal NaN', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: NaN,
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });

    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_PRINCIPAL');
  });

  it('10. principal Infinity', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: Infinity,
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });

    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_PRINCIPAL');
  });

  it('11. taxa negativa', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: 1000,
      annualRate: -0.05,
      elapsedBusinessDays: 252,
    });

    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_ANNUAL_RATE');
  });

  it('12. taxa NaN', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: 1000,
      annualRate: NaN,
      elapsedBusinessDays: 252,
    });

    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_ANNUAL_RATE');
  });

  it('13. taxa Infinity', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: 1000,
      annualRate: Infinity,
      elapsedBusinessDays: 252,
    });

    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_ANNUAL_RATE');
  });

  it('14. dias negativos', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: 1000,
      annualRate: 0.12,
      elapsedBusinessDays: -1,
    });

    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_ELAPSED_BUSINESS_DAYS');
  });

  it('15. dias fracionários', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: 1000,
      annualRate: 0.12,
      elapsedBusinessDays: 1.5,
    });

    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_ELAPSED_BUSINESS_DAYS');
  });

  it('16. dias NaN', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: 1000,
      annualRate: 0.12,
      elapsedBusinessDays: NaN,
    });

    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_ELAPSED_BUSINESS_DAYS');
  });

  it('17. base diferente de 252', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: 1000,
      annualRate: 0.12,
      elapsedBusinessDays: 252,
      businessDaysPerYear: 360,
    });

    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_BUSINESS_DAYS_PER_YEAR');
  });

  it('18. determinismo - múltiplas chamadas produzem mesmo resultado', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const input = {
      principal: 1000,
      annualRate: 0.12,
      elapsedBusinessDays: 126,
    };

    const r1 = calculateFixedRateGrossValue(input);
    const r2 = calculateFixedRateGrossValue(input);
    const r3 = calculateFixedRateGrossValue(input);

    assert.equal(r1.status, 'ok');
    assert.equal(r2.status, 'ok');
    assert.equal(r3.status, 'ok');
    assert.equal(r1.grossValue, r2.grossValue);
    assert.equal(r1.grossValue, r3.grossValue);
    assert.equal(r1.periodFactor, r2.periodFactor);
    assert.equal(r1.grossProfit, r3.grossProfit);
  });

  it('19. imutabilidade - input não é modificado', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const input = Object.freeze({
      principal: 1000,
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });

    const result = calculateFixedRateGrossValue(input);
    assert.equal(result.status, 'ok');
    assert.equal(input.principal, 1000);
    assert.equal(input.annualRate, 0.12);
    assert.equal(input.elapsedBusinessDays, 252);
  });

  it('20. resultado congelado', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: 1000,
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });

    assert.equal(Object.isFrozen(result), true);
  });

  it('21. campos de resultado ok', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: 1000,
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });

    assert.equal(result.status, 'ok');
    assert.equal(typeof result.principal, 'number');
    assert.equal(typeof result.annualRate, 'number');
    assert.equal(typeof result.elapsedBusinessDays, 'number');
    assert.equal(result.businessDaysPerYear, 252);
    assert.equal(typeof result.periodFactor, 'number');
    assert.equal(typeof result.grossProfit, 'number');
    assert.equal(typeof result.grossValue, 'number');
  });

  it('22. valor extremo que gere Infinity - NON_FINITE_RESULT', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: 1e200,
      annualRate: 1e200,
      elapsedBusinessDays: 252,
    });

    assert.equal(result.status, 'error');
    assert.equal(result.code, 'NON_FINITE_RESULT');
  });

  it('businessDaysPerYear default é 252 quando omitido', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: 1000,
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });

    assert.equal(result.status, 'ok');
    assert.equal(result.businessDaysPerYear, 252);
  });

  it('businessDaysPerYear inválido (NaN)', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: 1000,
      annualRate: 0.12,
      elapsedBusinessDays: 252,
      businessDaysPerYear: NaN,
    });

    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_BUSINESS_DAYS_PER_YEAR');
  });

  it('taxa zero com principal zero e período zero', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: 0,
      annualRate: 0,
      elapsedBusinessDays: 0,
    });

    assert.equal(result.status, 'ok');
    assert.equal(result.principal, 0);
    assert.equal(result.annualRate, 0);
    assert.equal(result.elapsedBusinessDays, 0);
    assert.equal(result.periodFactor, 1);
    assert.equal(result.grossValue, 0);
    assert.equal(result.grossProfit, 0);
  });

  it('resultado de erro não é congelado mas é seguro', async () => {
    const { calculateFixedRateGrossValue } = await loadEngine();
    const result = calculateFixedRateGrossValue({
      principal: -1,
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });

    assert.equal(result.status, 'error');
    assert.equal(typeof result.code, 'string');
  });
});
