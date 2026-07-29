const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const MODEL_PATH = path.join(__dirname, '..', 'modern', 'src', 'domain', 'fixedIncome', 'fixedRatePositionModel.ts');

async function loadModel() {
  return import(pathToFileURL(MODEL_PATH).href);
}

function okMovementSummary() {
  return {
    principalBalance: 1000,
    totalApplications: 1000,
    totalContributions: 0,
    totalRedemptions: 0,
    movementCount: 1,
  };
}

function okMovementResult() {
  return {
    status: 'ok',
    summary: okMovementSummary(),
  };
}

function makeErrorResult(overrides = {}) {
  return {
    status: 'error',
    code: 'INVALID_MOVEMENT_ID',
    movementIndex: 0,
    movementId: 'bad-id',
    ...overrides,
  };
}

describe('fixedRatePositionModel - calculateFixedRatePosition', () => {
  it('1. resultado valido com uma movimentacao APPLICATION', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: okMovementResult(),
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });
    assert.equal(result.status, 'ok');
    assert.equal(result.principalBalance, 1000);
    assert.equal(result.grossValue, 1120);
    assert.equal(result.grossProfit, 120);
  });

  it('2. resultado valido com CONTRIBUTION', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: {
        status: 'ok',
        summary: {
          principalBalance: 500,
          totalApplications: 0,
          totalContributions: 500,
          totalRedemptions: 0,
          movementCount: 1,
        },
      },
      annualRate: 0.10,
      elapsedBusinessDays: 252,
    });
    assert.equal(result.status, 'ok');
    assert.equal(result.principalBalance, 500);
    assert.equal(result.grossValue, 550);
    assert.equal(result.grossProfit, 50);
  });

  it('3. resultado valido com aplicacao, aporte e resgate', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: {
        status: 'ok',
        summary: {
          principalBalance: 9000,
          totalApplications: 10000,
          totalContributions: 2000,
          totalRedemptions: 3000,
          movementCount: 3,
        },
      },
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });
    assert.equal(result.status, 'ok');
    assert.equal(result.principalBalance, 9000);
  });

  it('4. usa exatamente principalBalance', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: {
        status: 'ok',
        summary: {
          principalBalance: 777,
          totalApplications: 0,
          totalContributions: 777,
          totalRedemptions: 0,
          movementCount: 1,
        },
      },
      annualRate: 0.05,
      elapsedBusinessDays: 126,
    });
    assert.equal(result.status, 'ok');
    assert.equal(result.principalBalance, 777);
  });

  it('5. saldo zero e valido', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: {
        status: 'ok',
        summary: {
          principalBalance: 0,
          totalApplications: 0,
          totalContributions: 0,
          totalRedemptions: 0,
          movementCount: 0,
        },
      },
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });
    assert.equal(result.status, 'ok');
    assert.equal(result.principalBalance, 0);
    assert.equal(result.grossValue, 0);
    assert.equal(result.grossProfit, 0);
  });

  it('6. taxa anual zero', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: okMovementResult(),
      annualRate: 0,
      elapsedBusinessDays: 252,
    });
    assert.equal(result.status, 'ok');
    assert.equal(result.grossValue, 1000);
    assert.equal(result.grossProfit, 0);
  });

  it('7. zero dias uteis', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: okMovementResult(),
      annualRate: 0.12,
      elapsedBusinessDays: 0,
    });
    assert.equal(result.status, 'ok');
    assert.equal(result.grossValue, 1000);
    assert.equal(result.grossProfit, 0);
  });

  it('8. taxa anual positiva com dias uteis', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: {
        status: 'ok',
        summary: {
          principalBalance: 10000,
          totalApplications: 10000,
          totalContributions: 0,
          totalRedemptions: 0,
          movementCount: 1,
        },
      },
      annualRate: 0.085,
      elapsedBusinessDays: 504,
    });
    assert.equal(result.status, 'ok');
    assert.ok(result.grossValue > 10000);
    assert.ok(result.grossProfit > 0);
  });

  it('9. preserva annualRate', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: okMovementResult(),
      annualRate: 0.1375,
      elapsedBusinessDays: 252,
    });
    assert.equal(result.status, 'ok');
    assert.equal(result.annualRate, 0.1375);
  });

  it('10. preserva elapsedBusinessDays', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: okMovementResult(),
      annualRate: 0.12,
      elapsedBusinessDays: 378,
    });
    assert.equal(result.status, 'ok');
    assert.equal(result.elapsedBusinessDays, 378);
  });

  it('11. preserva businessDaysPerYear igual a 252', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: okMovementResult(),
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });
    assert.equal(result.status, 'ok');
    assert.equal(result.businessDaysPerYear, 252);
  });

  it('12. preserva movementSummary', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const ms = okMovementSummary();
    const result = calculateFixedRatePosition({
      movementResult: { status: 'ok', summary: ms },
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });
    assert.equal(result.status, 'ok');
    assert.equal(result.movementSummary.principalBalance, ms.principalBalance);
    assert.equal(result.movementSummary.totalApplications, ms.totalApplications);
    assert.equal(result.movementSummary.movementCount, ms.movementCount);
  });

  it('13. erro INVALID_MOVEMENT_ID vira stage MOVEMENTS', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: makeErrorResult({ code: 'INVALID_MOVEMENT_ID' }),
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });
    assert.equal(result.status, 'error');
    assert.equal(result.stage, 'MOVEMENTS');
    assert.equal(result.code, 'INVALID_MOVEMENT_ID');
  });

  it('14. erro INVALID_ASSET_ID vira stage MOVEMENTS', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: makeErrorResult({ code: 'INVALID_ASSET_ID' }),
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });
    assert.equal(result.status, 'error');
    assert.equal(result.stage, 'MOVEMENTS');
    assert.equal(result.code, 'INVALID_ASSET_ID');
  });

  it('15. erro INVALID_OCCURRED_ON vira stage MOVEMENTS', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: makeErrorResult({ code: 'INVALID_OCCURRED_ON' }),
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });
    assert.equal(result.status, 'error');
    assert.equal(result.stage, 'MOVEMENTS');
    assert.equal(result.code, 'INVALID_OCCURRED_ON');
  });

  it('16. erro INVALID_PRINCIPAL_AMOUNT vira stage MOVEMENTS', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: makeErrorResult({ code: 'INVALID_PRINCIPAL_AMOUNT' }),
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });
    assert.equal(result.status, 'error');
    assert.equal(result.stage, 'MOVEMENTS');
    assert.equal(result.code, 'INVALID_PRINCIPAL_AMOUNT');
  });

  it('17. erro DUPLICATE_MOVEMENT_ID vira stage MOVEMENTS', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: makeErrorResult({ code: 'DUPLICATE_MOVEMENT_ID' }),
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });
    assert.equal(result.status, 'error');
    assert.equal(result.stage, 'MOVEMENTS');
    assert.equal(result.code, 'DUPLICATE_MOVEMENT_ID');
  });

  it('18. erro MIXED_ASSET_IDS vira stage MOVEMENTS', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: makeErrorResult({ code: 'MIXED_ASSET_IDS' }),
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });
    assert.equal(result.status, 'error');
    assert.equal(result.stage, 'MOVEMENTS');
    assert.equal(result.code, 'MIXED_ASSET_IDS');
  });

  it('19. erro INSUFFICIENT_PRINCIPAL_BALANCE vira stage MOVEMENTS', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: makeErrorResult({ code: 'INSUFFICIENT_PRINCIPAL_BALANCE' }),
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });
    assert.equal(result.status, 'error');
    assert.equal(result.stage, 'MOVEMENTS');
    assert.equal(result.code, 'INSUFFICIENT_PRINCIPAL_BALANCE');
  });

  it('20. preserva movementIndex', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: makeErrorResult({ movementIndex: 3 }),
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });
    assert.equal(result.status, 'error');
    assert.equal(result.movementIndex, 3);
  });

  it('21. preserva movementId', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: makeErrorResult({ movementId: 'my-bad-mov' }),
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });
    assert.equal(result.status, 'error');
    assert.equal(result.movementId, 'my-bad-mov');
  });

  it('22. taxa negativa vira stage VALUATION', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: okMovementResult(),
      annualRate: -0.05,
      elapsedBusinessDays: 252,
    });
    assert.equal(result.status, 'error');
    assert.equal(result.stage, 'VALUATION');
    assert.equal(result.code, 'INVALID_ANNUAL_RATE');
  });

  it('23. taxa NaN vira stage VALUATION', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: okMovementResult(),
      annualRate: NaN,
      elapsedBusinessDays: 252,
    });
    assert.equal(result.status, 'error');
    assert.equal(result.stage, 'VALUATION');
    assert.equal(result.code, 'INVALID_ANNUAL_RATE');
  });

  it('24. taxa Infinity vira stage VALUATION', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: okMovementResult(),
      annualRate: Infinity,
      elapsedBusinessDays: 252,
    });
    assert.equal(result.status, 'error');
    assert.equal(result.stage, 'VALUATION');
    assert.equal(result.code, 'INVALID_ANNUAL_RATE');
  });

  it('25. dias uteis negativos viram stage VALUATION', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: okMovementResult(),
      annualRate: 0.12,
      elapsedBusinessDays: -1,
    });
    assert.equal(result.status, 'error');
    assert.equal(result.stage, 'VALUATION');
    assert.equal(result.code, 'INVALID_ELAPSED_BUSINESS_DAYS');
  });

  it('26. dias uteis fracionarios viram stage VALUATION', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: okMovementResult(),
      annualRate: 0.12,
      elapsedBusinessDays: 1.5,
    });
    assert.equal(result.status, 'error');
    assert.equal(result.stage, 'VALUATION');
    assert.equal(result.code, 'INVALID_ELAPSED_BUSINESS_DAYS');
  });

  it('27. dias uteis NaN viram stage VALUATION', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: okMovementResult(),
      annualRate: 0.12,
      elapsedBusinessDays: NaN,
    });
    assert.equal(result.status, 'error');
    assert.equal(result.stage, 'VALUATION');
    assert.equal(result.code, 'INVALID_ELAPSED_BUSINESS_DAYS');
  });

  it('28. resultado de sucesso esta congelado', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: okMovementResult(),
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });
    assert.equal(result.status, 'ok');
    assert.equal(Object.isFrozen(result), true);
  });

  it('29. erro de movimentos esta congelado', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: makeErrorResult({ code: 'DUPLICATE_MOVEMENT_ID' }),
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });
    assert.equal(Object.isFrozen(result), true);
  });

  it('30. erro de valuation esta congelado', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: okMovementResult(),
      annualRate: -0.05,
      elapsedBusinessDays: 252,
    });
    assert.equal(Object.isFrozen(result), true);
  });

  it('31. entrada nao e modificada', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const input = Object.freeze({
      movementResult: okMovementResult(),
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });
    const result = calculateFixedRatePosition(input);
    assert.equal(result.status, 'ok');
    assert.equal(input.annualRate, 0.12);
  });

  it('32. movementResult nao e modificado', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const mr = okMovementResult();
    const before = JSON.stringify(mr);
    calculateFixedRatePosition({
      movementResult: mr,
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });
    assert.equal(JSON.stringify(mr), before);
  });

  it('33. movementSummary nao e modificado', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const ms = okMovementSummary();
    const mr = { status: 'ok', summary: ms };
    const before = JSON.stringify(ms);
    calculateFixedRatePosition({
      movementResult: mr,
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    });
    assert.equal(JSON.stringify(ms), before);
  });

  it('motor nao e executado apos erro de movimentos mesmo com taxa invalida', async () => {
    const { calculateFixedRatePosition } = await loadModel();
    const result = calculateFixedRatePosition({
      movementResult: makeErrorResult({ code: 'INVALID_ASSET_ID' }),
      annualRate: -999,
      elapsedBusinessDays: -999,
    });
    assert.equal(result.status, 'error');
    assert.equal(result.stage, 'MOVEMENTS');
    assert.equal(result.code, 'INVALID_ASSET_ID');
  });
});
