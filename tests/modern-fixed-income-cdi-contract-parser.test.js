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
      const r = parseCdiContract('100% CDI');
      assert.deepEqual(r, { ok: true, contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1 } });
    });

    it('2. 95% CDI', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('95% CDI');
      assert.deepEqual(r, { ok: true, contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 0.95 } });
    });

    it('3. 110% CDI', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('110% CDI');
      assert.deepEqual(r, { ok: true, contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1.1 } });
    });

    it('4. 80,5% CDI (virgula)', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('80,5% CDI');
      assert.deepEqual(r, { ok: true, contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 0.805 } });
    });

    it('5. 105.5% CDI (ponto)', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('105.5% CDI');
      assert.deepEqual(r, { ok: true, contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 1.055 } });
    });

    it('6. 50% CDI', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('50% CDI');
      assert.deepEqual(r, { ok: true, contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 0.5 } });
    });

    it('7. 500% CDI (limite 5)', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('500% CDI');
      assert.deepEqual(r, { ok: true, contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 5 } });
    });
  });

  describe('CDI_PLUS_SPREAD patterns', () => {
    it('8. CDI + 0,95%', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('CDI + 0,95%');
      assert.deepEqual(r, { ok: true, contract: { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: 0.0095 } });
    });

    it('9. CDI + 0,95% aa', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('CDI + 0,95% aa');
      assert.deepEqual(r, { ok: true, contract: { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: 0.0095 } });
    });

    it('10. CDI + 0,95% a.a.', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('CDI + 0,95% a.a.');
      assert.deepEqual(r, { ok: true, contract: { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: 0.0095 } });
    });

    it('11. CDI + 1%', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('CDI + 1%');
      assert.deepEqual(r, { ok: true, contract: { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: 0.01 } });
    });

    it('12. CDI + 1,10% aa', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('CDI + 1,10% aa');
      assert.equal(r.ok, true);
      assert.equal(r.contract.kind, 'CDI_PLUS_SPREAD');
      assert.ok(Math.abs(r.contract.annualSpreadRate - 0.011) < 1e-15);
    });

    it('13. CDI + 2% a.a.', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('CDI + 2% a.a.');
      assert.deepEqual(r, { ok: true, contract: { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: 0.02 } });
    });

    it('14. cdi + 0,5% (case insensitive)', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('cdi + 0,5%');
      assert.deepEqual(r, { ok: true, contract: { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: 0.005 } });
    });

    it('15. CDI+1% (sem espacos)', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('CDI+1%');
      assert.deepEqual(r, { ok: true, contract: { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: 0.01 } });
    });

    it('16. CDI + 0% (spread zero valido)', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('CDI + 0%');
      assert.deepEqual(r, { ok: true, contract: { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: 0 } });
    });

    it('17. CDI + 100% (spread maximo)', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('CDI + 100%');
      assert.deepEqual(r, { ok: true, contract: { kind: 'CDI_PLUS_SPREAD', annualSpreadRate: 1 } });
    });
  });

  describe('Rejeicoes obrigatorias', () => {
    it('18. CDI isolado', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('CDI'), { ok: false, error: 'UNSUPPORTED_FORMAT' });
    });

    it('19. cdi minusculo', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('cdi'), { ok: false, error: 'UNSUPPORTED_FORMAT' });
    });

    it('20. CDI com espacos', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract(' CDI '), { ok: false, error: 'UNSUPPORTED_FORMAT' });
    });

    it('21. 100 (numero puro)', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('100'), { ok: false, error: 'UNSUPPORTED_FORMAT' });
    });

    it('22. 0,95% (sem CDI)', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('0,95%'), { ok: false, error: 'UNSUPPORTED_FORMAT' });
    });

    it('23. 1 CDI', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('1 CDI'), { ok: false, error: 'UNSUPPORTED_FORMAT' });
    });

    it('24. CDI 1', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('CDI 1'), { ok: false, error: 'UNSUPPORTED_FORMAT' });
    });

    it('25. 10% aa (prefixado)', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('10% aa'), { ok: false, error: 'UNSUPPORTED_FORMAT' });
    });

    it('26. IPCA + 5,80% aa', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('IPCA + 5,80% aa'), { ok: false, error: 'UNSUPPORTED_FORMAT' });
    });

    it('27. Selic + 0,5% aa', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('Selic + 0,5% aa'), { ok: false, error: 'UNSUPPORTED_FORMAT' });
    });

    it('28. POS', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('POS'), { ok: false, error: 'UNSUPPORTED_FORMAT' });
    });

    it('29. 0% CDI (zero percentual)', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('0% CDI'), { ok: false, error: 'OUT_OF_RANGE' });
    });

    it('30. -5% CDI (negativo nao suportado pela regex)', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('-5% CDI'), { ok: false, error: 'UNSUPPORTED_FORMAT' });
    });

    it('31. CDI + -1% (negativo nao suportado pela regex)', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('CDI + -1%'), { ok: false, error: 'UNSUPPORTED_FORMAT' });
    });

    it('32. string vazia', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract(''), { ok: false, error: 'EMPTY_VALUE' });
    });

    it('33. null', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract(null), { ok: false, error: 'INVALID_TYPE' });
    });

    it('34. undefined', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract(undefined), { ok: false, error: 'INVALID_TYPE' });
    });

    it('35. objeto', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract({}), { ok: false, error: 'INVALID_TYPE' });
    });

    it('36. numero puro', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract(100), { ok: false, error: 'INVALID_TYPE' });
    });

    it('37. array', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract([]), { ok: false, error: 'INVALID_TYPE' });
    });

    it('38. boolean', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract(true), { ok: false, error: 'INVALID_TYPE' });
    });

    it('39. 600% CDI (acima do limite 5)', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('600% CDI'), { ok: false, error: 'OUT_OF_RANGE' });
    });

    it('40. CDI + 110% (acima do limite 1)', async () => {
      const { parseCdiContract } = await loadParser();
      assert.deepEqual(parseCdiContract('CDI + 110%'), { ok: false, error: 'OUT_OF_RANGE' });
    });
  });

  describe('Propriedades', () => {
    it('41. resultado CDI_PERCENTAGE e congelado', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('100% CDI');
      assert.equal(r.ok, true);
      assert.equal(Object.isFrozen(r), true);
    });

    it('42. resultado CDI_PLUS_SPREAD e congelado', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('CDI + 0,95% aa');
      assert.equal(r.ok, true);
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
      const r = parseCdiContract('  95% CDI  ');
      assert.deepEqual(r, { ok: true, contract: { kind: 'CDI_PERCENTAGE', cdiPercentage: 0.95 } });
    });

    it('45. resultado de erro INVALID_TYPE e congelado', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract(null);
      assert.equal(Object.isFrozen(r), true);
    });

    it('46. resultado de erro EMPTY_VALUE e congelado', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('');
      assert.equal(Object.isFrozen(r), true);
    });

    it('47. resultado de erro UNSUPPORTED_FORMAT e congelado', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('CDI');
      assert.equal(Object.isFrozen(r), true);
    });

    it('48. resultado de erro OUT_OF_RANGE e congelado', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('600% CDI');
      assert.equal(Object.isFrozen(r), true);
    });

    it('49. contrato interno e congelado (CDI_PERCENTAGE)', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('95% CDI');
      assert.equal(r.ok, true);
      assert.equal(Object.isFrozen(r.contract), true);
    });

    it('50. contrato interno e congelado (CDI_PLUS_SPREAD)', async () => {
      const { parseCdiContract } = await loadParser();
      const r = parseCdiContract('CDI + 1%');
      assert.equal(r.ok, true);
      assert.equal(Object.isFrozen(r.contract), true);
    });
  });
});
