const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ENGINE_PATH = path.join(__dirname, '..', 'modern', 'src', 'domain', 'fixedIncome', 'cdiRateEngine.ts');

async function loadEngine() {
  return import(pathToFileURL(ENGINE_PATH).href);
}

const T = 1e-12;

describe('cdiRateEngine - calculateCdiValue', () => {
  describe('CDI_PERCENTAGE calculations', () => {
    it('1. 95% CDI nao reduz o principal para 95%', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 0.95 },
        dailyFactors: [{ date: '2026-01-02', factor: 1.0004 }],
      });

      assert.equal(result.ok, true);
      const expectedDaily = 1 + (1.0004 - 1) * 0.95;
      assert.ok(Math.abs(result.accumulatedFactor - expectedDaily) < T);
      assert.ok(Math.abs(result.grossValue - 10000 * expectedDaily) < 1e-8);
    });

    it('2. 110% CDI aplica 110% apenas sobre a taxa diaria', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1.1 },
        dailyFactors: [{ date: '2026-01-02', factor: 1.0004 }],
      });

      assert.equal(result.ok, true);
      const expectedDaily = 1 + (1.0004 - 1) * 1.1;
      assert.ok(Math.abs(result.accumulatedFactor - expectedDaily) < T);
    });

    it('3. 100% CDI repete o fator diario', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 },
        dailyFactors: [{ date: '2026-01-02', factor: 1.0004 }],
      });

      assert.equal(result.ok, true);
      assert.ok(Math.abs(result.accumulatedFactor - 1.0004) < T);
    });
  });

  describe('CDI_PLUS_SPREAD calculations', () => {
    it('4. CDI + spread nao aplica spread anual integral em unico passo', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: 0.01 },
        dailyFactors: [{ date: '2026-01-02', factor: 1.0004 }],
      });

      assert.equal(result.ok, true);
      const dailySpread = Math.pow(1.01, 1 / 252);
      const expected = 1.0004 * dailySpread;
      assert.ok(Math.abs(result.accumulatedFactor - expected) < T);
      assert.ok(Math.abs(result.accumulatedFactor - 1.0004 * 1.01) > 0.0001);
    });

    it('5. CDI + 0,95% aa com fator diario', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 5000,
        contract: { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: 0.0095 },
        dailyFactors: [{ date: '2026-01-02', factor: 1.0004 }],
      });

      assert.equal(result.ok, true);
      const dailySpread = Math.pow(1.0095, 1 / 252);
      const expected = 1.0004 * dailySpread;
      assert.ok(Math.abs(result.accumulatedFactor - expected) < T);
    });

    it('6. spread zero', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: 0 },
        dailyFactors: [{ date: '2026-01-02', factor: 1.0004 }],
      });

      assert.equal(result.ok, true);
      assert.ok(Math.abs(result.accumulatedFactor - 1.0004) < T);
    });
  });

  describe('Compounding', () => {
    it('7. dois fatores diarios sao compostos sequencialmente', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 },
        dailyFactors: [
          { date: '2026-01-02', factor: 1.0004 },
          { date: '2026-01-03', factor: 1.0003 },
        ],
      });

      assert.equal(result.ok, true);
      assert.ok(Math.abs(result.accumulatedFactor - 1.0004 * 1.0003) < T);
      assert.equal(result.appliedDays, 2);
    });

    it('8. lista vazia retorna fator 1', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 },
        dailyFactors: [],
      });

      assert.equal(result.ok, true);
      assert.equal(result.accumulatedFactor, 1);
      assert.equal(result.grossValue, 10000);
      assert.equal(result.grossProfit, 0);
      assert.equal(result.appliedDays, 0);
    });

    it('9. multiplos fatores com CDI_PLUS_SPREAD', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: 0.01 },
        dailyFactors: [
          { date: '2026-01-02', factor: 1.0004 },
          { date: '2026-01-03', factor: 1.0005 },
        ],
      });

      assert.equal(result.ok, true);
      const ds = Math.pow(1.01, 1 / 252);
      const expected = 1.0004 * ds * 1.0005 * ds;
      assert.ok(Math.abs(result.accumulatedFactor - expected) < T);
    });
  });

  describe('Validacao de fatores', () => {
    it('10. datas duplicadas sao rejeitadas', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 },
        dailyFactors: [
          { date: '2026-01-02', factor: 1.0004 },
          { date: '2026-01-02', factor: 1.0003 },
        ],
      });

      assert.equal(result.ok, false);
      assert.equal(result.code, 'DUPLICATE_FACTOR_DATE');
      assert.equal(result.factorIndex, 1);
    });

    it('11. datas fora de ordem sao rejeitadas', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 },
        dailyFactors: [
          { date: '2026-01-03', factor: 1.0004 },
          { date: '2026-01-02', factor: 1.0003 },
        ],
      });

      assert.equal(result.ok, false);
      assert.equal(result.code, 'UNSORTED_FACTOR_DATES');
      assert.equal(result.factorIndex, 1);
    });

    it('12. 2026-02-30 e rejeitada', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 },
        dailyFactors: [{ date: '2026-02-30', factor: 1.0004 }],
      });

      assert.equal(result.ok, false);
      assert.equal(result.code, 'INVALID_FACTOR_DATE');
      assert.equal(result.factorIndex, 0);
    });

    it('13. overflow intermediario e rejeitado', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 1e200,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 5 },
        dailyFactors: [{ date: '2026-01-02', factor: 1e200 }],
      });

      assert.equal(result.ok, false);
      assert.equal(result.code, 'NON_FINITE_RESULT');
    });

    it('14. fator zero e rejeitado', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 },
        dailyFactors: [{ date: '2026-01-02', factor: 0 }],
      });

      assert.equal(result.ok, false);
      assert.equal(result.code, 'INVALID_FACTOR_VALUE');
      assert.equal(result.factorIndex, 0);
    });

    it('15. fator negativo e rejeitado', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 },
        dailyFactors: [{ date: '2026-01-02', factor: -1 }],
      });

      assert.equal(result.ok, false);
      assert.equal(result.code, 'INVALID_FACTOR_VALUE');
    });

    it('16. data invalida 2026-04-31', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 },
        dailyFactors: [{ date: '2026-04-31', factor: 1.0004 }],
      });

      assert.equal(result.ok, false);
      assert.equal(result.code, 'INVALID_FACTOR_DATE');
    });

    it('17. data formato invalido 2026/01/02', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 },
        dailyFactors: [{ date: '2026/01/02', factor: 1.0004 }],
      });

      assert.equal(result.ok, false);
      assert.equal(result.code, 'INVALID_FACTOR_DATE');
    });
  });

  describe('Validacao de entrada', () => {
    it('18. principal negativo', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: -1,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 },
        dailyFactors: [],
      });

      assert.equal(result.ok, false);
      assert.equal(result.code, 'INVALID_PRINCIPAL');
    });

    it('19. principal NaN', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: NaN,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 },
        dailyFactors: [],
      });

      assert.equal(result.ok, false);
      assert.equal(result.code, 'INVALID_PRINCIPAL');
    });

    it('20. principal Infinity', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: Infinity,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 },
        dailyFactors: [],
      });

      assert.equal(result.ok, false);
      assert.equal(result.code, 'INVALID_PRINCIPAL');
    });

    it('21. cdiPercentage zero', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 0 },
        dailyFactors: [],
      });

      assert.equal(result.ok, false);
      assert.equal(result.code, 'INVALID_CONTRACT');
    });

    it('22. cdiPercentage acima do limite', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 6 },
        dailyFactors: [],
      });

      assert.equal(result.ok, false);
      assert.equal(result.code, 'INVALID_CONTRACT');
    });

    it('23. annualSpreadRate negativo', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: -0.01 },
        dailyFactors: [],
      });

      assert.equal(result.ok, false);
      assert.equal(result.code, 'INVALID_CONTRACT');
    });

    it('24. annualSpreadRate acima do limite', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: 1.5 },
        dailyFactors: [],
      });

      assert.equal(result.ok, false);
      assert.equal(result.code, 'INVALID_CONTRACT');
    });

    it('25. dailyFactors nao e array', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 },
        dailyFactors: 'invalid',
      });

      assert.equal(result.ok, false);
      assert.equal(result.code, 'INVALID_FACTORS');
    });

    it('26. input nao e objeto', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue('invalid');

      assert.equal(result.ok, false);
      assert.equal(result.code, 'INVALID_INPUT');
    });

    it('27. item nao e objeto', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 },
        dailyFactors: ['invalid'],
      });

      assert.equal(result.ok, false);
      assert.equal(result.code, 'INVALID_FACTORS');
      assert.equal(result.factorIndex, 0);
    });

    it('28. date nao e string', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 },
        dailyFactors: [{ date: 123, factor: 1.0004 }],
      });

      assert.equal(result.ok, false);
      assert.equal(result.code, 'INVALID_FACTOR_DATE');
    });

    it('29. fator NaN', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 },
        dailyFactors: [{ date: '2026-01-02', factor: NaN }],
      });

      assert.equal(result.ok, false);
      assert.equal(result.code, 'INVALID_FACTOR_VALUE');
    });

    it('30. fator Infinity', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 },
        dailyFactors: [{ date: '2026-01-02', factor: Infinity }],
      });

      assert.equal(result.ok, false);
      assert.equal(result.code, 'INVALID_FACTOR_VALUE');
    });
  });

  describe('Propriedades', () => {
    it('31. o array nao e ordenado nem mutado', async () => {
      const { calculateCdiValue } = await loadEngine();
      const factors = [
        { date: '2026-01-02', factor: 1.0004 },
        { date: '2026-01-03', factor: 1.0003 },
      ];
      const frozen = Object.freeze(factors);
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 },
        dailyFactors: frozen,
      });

      assert.equal(result.ok, true);
      assert.equal(factors[0].date, '2026-01-02');
      assert.equal(factors[1].date, '2026-01-03');
    });

    it('32. resultado e congelado', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 },
        dailyFactors: [{ date: '2026-01-02', factor: 1.0004 }],
      });

      assert.equal(Object.isFrozen(result), true);
    });

    it('33. contrato retornado pelo parser e congelado', async () => {
      const { parseCdiContract } = await import(
        pathToFileURL(path.join(__dirname, '..', 'modern', 'src', 'domain', 'fixedIncome', 'cdiContractParser.ts')).href
      );
      const r = parseCdiContract('95% CDI');
      assert.equal(Object.isFrozen(r), true);
    });

    it('34. determinismo', async () => {
      const { calculateCdiValue } = await loadEngine();
      const input = {
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 0.95 },
        dailyFactors: [{ date: '2026-01-02', factor: 1.0004 }],
      };

      const r1 = calculateCdiValue(input);
      const r2 = calculateCdiValue(input);
      assert.equal(r1.ok, true);
      assert.equal(r2.ok, true);
      assert.equal(r1.grossValue, r2.grossValue);
      assert.equal(r1.accumulatedFactor, r2.accumulatedFactor);
    });

    it('35. campos de sucesso', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 },
        dailyFactors: [
          { date: '2026-01-02', factor: 1.0004 },
          { date: '2026-01-03', factor: 1.0003 },
        ],
      });

      assert.equal(result.ok, true);
      assert.equal(typeof result.principal, 'number');
      assert.equal(typeof result.accumulatedFactor, 'number');
      assert.equal(typeof result.grossValue, 'number');
      assert.equal(typeof result.grossProfit, 'number');
      assert.equal(typeof result.appliedDays, 'number');
      assert.equal(result.appliedDays, 2);
    });

    it('36. resultado de erro inclui factorIndex quando aplicavel', async () => {
      const { calculateCdiValue } = await loadEngine();
      const result = calculateCdiValue({
        principal: 10000,
        contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 },
        dailyFactors: [
          { date: '2026-01-02', factor: 1.0004 },
          { date: '2026-01-03', factor: 0 },
        ],
      });

      assert.equal(result.ok, false);
      assert.equal(typeof result.factorIndex, 'number');
      assert.equal(result.factorIndex, 1);
    });
  });
});
