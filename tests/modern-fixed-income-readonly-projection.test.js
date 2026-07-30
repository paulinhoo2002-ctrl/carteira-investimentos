const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const PROJECTION_PATH = path.join(__dirname, '..', 'modern', 'src', 'domain', 'fixedIncome', 'fixedRateReadonlyProjection.ts');

async function loadProjection() {
  return import(pathToFileURL(PROJECTION_PATH).href);
}

const ASSET_ID = 'prefixado-cdb-x';

function okEvent(overrides = {}) {
  return {
    id: 'evt-1',
    assetId: ASSET_ID,
    date: '2026-01-15',
    type: 'amortizacao',
    grossValue: 9999,
    ir: 0,
    iof: 0,
    netValue: 9999,
    principalDelta: 1000,
    source: 'Manual',
    note: '',
    ...overrides,
  };
}

function okInput(overrides = {}) {
  return {
    rfEvents: [okEvent()],
    assetId: ASSET_ID,
    annualRate: 0.12,
    elapsedBusinessDays: 252,
    ...overrides,
  };
}

describe('fixedRateReadonlyProjection - projectFixedRateReadonlyItem', () => {
  it('1. retorna appliedValue, grossValue, profitValue para input valido', async () => {
    const { projectFixedRateReadonlyItem } = await loadProjection();
    const result = projectFixedRateReadonlyItem(okInput());
    assert.notEqual(result, null);
    assert.equal(result.appliedValue, 1000);
    assert.equal(result.grossValue, 1120);
    assert.equal(result.profitValue, 120);
  });

  it('2. appliedValue = principalBalance dos movimentos', async () => {
    const { projectFixedRateReadonlyItem } = await loadProjection();
    const result = projectFixedRateReadonlyItem(okInput({
      rfEvents: [
        okEvent({ id: 'e1', principalDelta: 500, date: '2026-01-01' }),
        okEvent({ id: 'e2', principalDelta: 300, date: '2026-02-01' }),
      ],
    }));
    assert.notEqual(result, null);
    assert.equal(result.appliedValue, 800);
  });

  it('3. grossValue usa taxa anual e dias uteis', async () => {
    const { projectFixedRateReadonlyItem } = await loadProjection();
    const result = projectFixedRateReadonlyItem(okInput({
      principalBalance: 1000,
      annualRate: 0.085,
      elapsedBusinessDays: 504,
    }));
    assert.notEqual(result, null);
    assert.ok(result.grossValue > 1000);
    assert.ok(result.profitValue > 0);
  });

  it('4. profitValue = grossValue - appliedValue', async () => {
    const { projectFixedRateReadonlyItem } = await loadProjection();
    const result = projectFixedRateReadonlyItem(okInput());
    assert.notEqual(result, null);
    assert.equal(result.profitValue, result.grossValue - result.appliedValue);
  });

  it('5. retorna null para taxa negativa', async () => {
    const { projectFixedRateReadonlyItem } = await loadProjection();
    const result = projectFixedRateReadonlyItem(okInput({ annualRate: -0.05 }));
    assert.equal(result, null);
  });

  it('6. retorna null para taxa NaN', async () => {
    const { projectFixedRateReadonlyItem } = await loadProjection();
    const result = projectFixedRateReadonlyItem(okInput({ annualRate: NaN }));
    assert.equal(result, null);
  });

  it('7. retorna null para dias uteis negativos', async () => {
    const { projectFixedRateReadonlyItem } = await loadProjection();
    const result = projectFixedRateReadonlyItem(okInput({ elapsedBusinessDays: -1 }));
    assert.equal(result, null);
  });

  it('8. retorna null para dias uteis fracionarios', async () => {
    const { projectFixedRateReadonlyItem } = await loadProjection();
    const result = projectFixedRateReadonlyItem(okInput({ elapsedBusinessDays: 1.5 }));
    assert.equal(result, null);
  });

  it('9. retorna null para principalDelta invalido', async () => {
    const { projectFixedRateReadonlyItem } = await loadProjection();
    const result = projectFixedRateReadonlyItem(okInput({
      rfEvents: [okEvent({ principalDelta: 'INVALIDO' })],
    }));
    assert.equal(result, null);
  });

  it('10. retorna valores zero para rfEvents null (adapter trata como vazio)', async () => {
    const { projectFixedRateReadonlyItem } = await loadProjection();
    const result = projectFixedRateReadonlyItem(okInput({ rfEvents: null }));
    assert.notEqual(result, null);
    assert.equal(result.appliedValue, 0);
    assert.equal(result.grossValue, 0);
    assert.equal(result.profitValue, 0);
  });

  it('11. retorna null para assetId vazia', async () => {
    const { projectFixedRateReadonlyItem } = await loadProjection();
    const result = projectFixedRateReadonlyItem(okInput({ assetId: '' }));
    assert.equal(result, null);
  });

  it('12. retorna valores para saldo zero', async () => {
    const { projectFixedRateReadonlyItem } = await loadProjection();
    const result = projectFixedRateReadonlyItem(okInput({ rfEvents: [] }));
    assert.notEqual(result, null);
    assert.equal(result.appliedValue, 0);
    assert.equal(result.grossValue, 0);
    assert.equal(result.profitValue, 0);
  });

  it('13. input congelado nao e modificado', async () => {
    const { projectFixedRateReadonlyItem } = await loadProjection();
    const input = Object.freeze(okInput());
    const result = projectFixedRateReadonlyItem(input);
    assert.notEqual(result, null);
    assert.equal(input.annualRate, 0.12);
  });

  it('14. resultado congelado', async () => {
    const { projectFixedRateReadonlyItem } = await loadProjection();
    const result = projectFixedRateReadonlyItem(okInput());
    assert.notEqual(result, null);
    assert.equal(Object.isFrozen(result), true);
  });
});

describe('fixedRateReadonlyProjection - isEligibleForProjection', () => {
  it('1. retorna true para PREFIXADO maiusculo', async () => {
    const { isEligibleForProjection } = await loadProjection();
    assert.equal(isEligibleForProjection('PREFIXADO'), true);
  });

  it('2. retorna false para prefixado minusculo', async () => {
    const { isEligibleForProjection } = await loadProjection();
    assert.equal(isEligibleForProjection('prefixado'), false);
  });

  it('3. retorna false para CDI', async () => {
    const { isEligibleForProjection } = await loadProjection();
    assert.equal(isEligibleForProjection('CDI'), false);
  });

  it('4. retorna false para Selic', async () => {
    const { isEligibleForProjection } = await loadProjection();
    assert.equal(isEligibleForProjection('Selic'), false);
  });

  it('5. retorna false para null', async () => {
    const { isEligibleForProjection } = await loadProjection();
    assert.equal(isEligibleForProjection(null), false);
  });

  it('6. retorna false para undefined', async () => {
    const { isEligibleForProjection } = await loadProjection();
    assert.equal(isEligibleForProjection(undefined), false);
  });

  it('7. retorna false para string vazia', async () => {
    const { isEligibleForProjection } = await loadProjection();
    assert.equal(isEligibleForProjection(''), false);
  });

  it('8. retorna false para PreFiXaDo com case misto', async () => {
    const { isEligibleForProjection } = await loadProjection();
    assert.equal(isEligibleForProjection('PreFiXaDo'), false);
  });

  it('9. retorna false para Prefixado capitalizado', async () => {
    const { isEligibleForProjection } = await loadProjection();
    assert.equal(isEligibleForProjection('Prefixado'), false);
  });
});

describe('fixedRateReadonlyProjection - isValidValuationSupplement', () => {
  it('1. retorna true para valores validos', async () => {
    const { isValidValuationSupplement } = await loadProjection();
    assert.equal(isValidValuationSupplement(0.12, 252, []), true);
  });

  it('2. retorna false para annualRate NaN', async () => {
    const { isValidValuationSupplement } = await loadProjection();
    assert.equal(isValidValuationSupplement(NaN, 252, []), false);
  });

  it('3. retorna false para annualRate Infinity', async () => {
    const { isValidValuationSupplement } = await loadProjection();
    assert.equal(isValidValuationSupplement(Infinity, 252, []), false);
  });

  it('4. retorna false para annualRate string', async () => {
    const { isValidValuationSupplement } = await loadProjection();
    assert.equal(isValidValuationSupplement('0.12', 252, []), false);
  });

  it('5. retorna false para elapsedBusinessDays negativo', async () => {
    const { isValidValuationSupplement } = await loadProjection();
    assert.equal(isValidValuationSupplement(0.12, -1, []), false);
  });

  it('6. retorna false para elapsedBusinessDays fracionario', async () => {
    const { isValidValuationSupplement } = await loadProjection();
    assert.equal(isValidValuationSupplement(0.12, 1.5, []), false);
  });

  it('7. retorna false para elapsedBusinessDays NaN', async () => {
    const { isValidValuationSupplement } = await loadProjection();
    assert.equal(isValidValuationSupplement(0.12, NaN, []), false);
  });

  it('8. retorna false para rfEvents nao array', async () => {
    const { isValidValuationSupplement } = await loadProjection();
    assert.equal(isValidValuationSupplement(0.12, 252, null), false);
  });

  it('9. retorna false para rfEvents undefined', async () => {
    const { isValidValuationSupplement } = await loadProjection();
    assert.equal(isValidValuationSupplement(0.12, 252, undefined), false);
  });

  it('10. retorna true para annualRate zero (valido, edge case)', async () => {
    const { isValidValuationSupplement } = await loadProjection();
    assert.equal(isValidValuationSupplement(0, 252, []), true);
  });

  it('11. retorna true para elapsedBusinessDays zero', async () => {
    const { isValidValuationSupplement } = await loadProjection();
    assert.equal(isValidValuationSupplement(0.12, 0, []), true);
  });
});
