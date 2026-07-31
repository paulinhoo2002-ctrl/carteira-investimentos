const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const PARSER_PATH = path.join(__dirname, '..', 'modern', 'src', 'domain', 'fixedIncome', 'cdiContractParser.ts');

async function loadParser() {
  return import(pathToFileURL(PARSER_PATH).href);
}

describe('cdiContractParser - parseCdiContract', () => {
  describe('CDI_PERCENTAGE patterns', () => {
    it('1. 100% CDI', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('100% CDI'), { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 });
    });

    it('2. 95% CDI', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('95% CDI'), { kind: 'CDI_PERCENTAGE', cdiPercentage: 0.95 });
    });

    it('3. 110% CDI', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('110% CDI'), { kind: 'CDI_PERCENTAGE', cdiPercentage: 1.1 });
    });

    it('4. 80,5% CDI (virgula)', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('80,5% CDI'), { kind: 'CDI_PERCENTAGE', cdiPercentage: 0.805 });
    });

    it('5. 105.5% CDI (ponto)', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('105.5% CDI'), { kind: 'CDI_PERCENTAGE', cdiPercentage: 1.055 });
    });

    it('6. 50% CDI', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('50% CDI'), { kind: 'CDI_PERCENTAGE', cdiPercentage: 0.5 });
    });

    it('7. 500% CDI (limite 5)', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('500% CDI'), { kind: 'CDI_PERCENTAGE', cdiPercentage: 5 });
    });
  });

  describe('CDI_PLUS_SPREAD patterns', () => {
    it('8. CDI + 0,95%', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('CDI + 0,95%'), { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: 0.0095 });
    });

    it('9. CDI + 0,95% aa', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('CDI + 0,95% aa'), { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: 0.0095 });
    });

    it('10. CDI + 0,95% a.a.', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('CDI + 0,95% a.a.'), { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: 0.0095 });
    });

    it('11. CDI + 1%', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('CDI + 1%'), { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: 0.01 });
    });

    it('12. CDI + 1,10% aa', async () => {
      const { parseCdiContract } = await loadParser();
      const result = parseCdiContract('CDI + 1,10% aa');
      assert.equal(result.kind, 'CDI_PLUS_SPREAD');
      assert.ok(Math.abs(result.annualSpreadRate - 0.011) < 1e-15);
    });

    it('13. CDI + 2% a.a.', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('CDI + 2% a.a.'), { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: 0.02 });
    });

    it('14. cdi + 0,5% (case insensitive)', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('cdi + 0,5%'), { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: 0.005 });
    });

    it('15. CDI+1% (sem espacos)', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('CDI+1%'), { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: 0.01 });
    });

    it('16. CDI + 0% (spread zero valido)', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('CDI + 0%'), { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: 0 });
    });

    it('17. CDI + 100% (spread maximo)', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('CDI + 100%'), { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: 1 });
    });
  });

  describe('Rejeicoes obrigatorias', () => {
    it('18. CDI isolado', async () => {
      const { parseCdiContract } = await loadParser();
      assert.equal(parseCdiContract('CDI'), null);
    });

    it('19. cdi minusculo', async () => {
      const { parseCdiContract } = await loadParser();
      assert.equal(parseCdiContract('cdi'), null);
    });

    it('20. CDI com espacos', async () => {
      const { parseCdiContract } = await loadParser();
      assert.equal(parseCdiContract(' CDI '), null);
    });

    it('21. 100 (numero puro)', async () => {
      const { parseCdiContract } = await loadParser();
      assert.equal(parseCdiContract('100'), null);
    });

    it('22. 0,95% (sem CDI)', async () => {
      const { parseCdiContract } = await loadParser();
      assert.equal(parseCdiContract('0,95%'), null);
    });

    it('23. 1 CDI', async () => {
      const { parseCdiContract } = await loadParser();
      assert.equal(parseCdiContract('1 CDI'), null);
    });

    it('24. CDI 1', async () => {
      const { parseCdiContract } = await loadParser();
      assert.equal(parseCdiContract('CDI 1'), null);
    });

    it('25. 10% aa (prefixado)', async () => {
      const { parseCdiContract } = await loadParser();
      assert.equal(parseCdiContract('10% aa'), null);
    });

    it('26. IPCA + 5,80% aa', async () => {
      const { parseCdiContract } = await loadParser();
      assert.equal(parseCdiContract('IPCA + 5,80% aa'), null);
    });

    it('27. Selic + 0,5% aa', async () => {
      const { parseCdiContract } = await loadParser();
      assert.equal(parseCdiContract('Selic + 0,5% aa'), null);
    });

    it('28. POS', async () => {
      const { parseCdiContract } = await loadParser();
      assert.equal(parseCdiContract('POS'), null);
    });

    it('29. 0% CDI (zero percentual)', async () => {
      const { parseCdiContract } = await loadParser();
      assert.equal(parseCdiContract('0% CDI'), null);
    });

    it('30. -5% CDI (negativo)', async () => {
      const { parseCdiContract } = await loadParser();
      assert.equal(parseCdiContract('-5% CDI'), null);
    });

    it('31. CDI + -1% (negativo)', async () => {
      const { parseCdiContract } = await loadParser();
      assert.equal(parseCdiContract('CDI + -1%'), null);
    });

    it('32. string vazia', async () => {
      const { parseCdiContract } = await loadParser();
      assert.equal(parseCdiContract(''), null);
    });

    it('33. null', async () => {
      const { parseCdiContract } = await loadParser();
      assert.equal(parseCdiContract(null), null);
    });

    it('34. undefined', async () => {
      const { parseCdiContract } = await loadParser();
      assert.equal(parseCdiContract(undefined), null);
    });

    it('35. objeto', async () => {
      const { parseCdiContract } = await loadParser();
      assert.equal(parseCdiContract({}), null);
    });

    it('36. numero puro', async () => {
      const { parseCdiContract } = await loadParser();
      assert.equal(parseCdiContract(100), null);
    });

    it('37. array', async () => {
      const { parseCdiContract } = await loadParser();
      assert.equal(parseCdiContract([]), null);
    });

    it('38. boolean', async () => {
      const { parseCdiContract } = await loadParser();
      assert.equal(parseCdiContract(true), null);
    });

    it('39. 600% CDI (acima do limite 5)', async () => {
      const { parseCdiContract } = await loadParser();
      assert.equal(parseCdiContract('600% CDI'), null);
    });

    it('40. CDI + 110% (acima do limite 1)', async () => {
      const { parseCdiContract } = await loadParser();
      assert.equal(parseCdiContract('CDI + 110%'), null);
    });
  });

  describe('Propriedades', () => {
    it('41. resultado CDI_PERCENTAGE e congelado', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('100% CDI');
      assert.equal(Object.isFrozen(r), true);
    });

    it('42. resultado CDI_PLUS_SPREAD e congelado', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('CDI + 0,95% aa');
      assert.equal(Object.isFrozen(r), true);
    });

    it('43. determinismo', async () => {
      const { parseCdiContract } = await loadParser();
      const r1 = parseCdiContract('95% CDI');
      const r2 = parseCdiContract('95% CDI');
      assert.deepEqual(r1, r2);
    });

    it('44. whitespace extra e tolerado', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('  95% CDI  '), { kind: 'CDI_PERCENTAGE', cdiPercentage: 0.95 });
    });
  });
});
