const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ADAPTER_PATH = path.join(__dirname, '..', 'modern', 'src', 'domain', 'fixedIncome', 'legacyFixedRatePositionAdapter.ts');

async function loadAdapter() {
  return import(pathToFileURL(ADAPTER_PATH).href);
}

const ASSET_ID = 'cdb-banco-x';

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

describe('legacyFixedRatePositionAdapter - calculateLegacyFixedRatePosition', () => {
  it('1. array vazio gera posicao zero', async () => {
    const { calculateLegacyFixedRatePosition } = await loadAdapter();
    const result = calculateLegacyFixedRatePosition(okInput({ rfEvents: [] }));
    assert.equal(result.status, 'ok');
    assert.equal(result.principalBalance, 0);
    assert.equal(result.grossValue, 0);
    assert.equal(result.grossProfit, 0);
  });

  it('2. evento positivo vira saldo de principal', async () => {
    const { calculateLegacyFixedRatePosition } = await loadAdapter();
    const result = calculateLegacyFixedRatePosition(okInput());
    assert.equal(result.status, 'ok');
    assert.equal(result.principalBalance, 1000);
    assert.equal(result.movementSummary.totalContributions, 1000);
  });

  it('3. eventos positivos acumulam saldo', async () => {
    const { calculateLegacyFixedRatePosition } = await loadAdapter();
    const result = calculateLegacyFixedRatePosition(okInput({
      rfEvents: [
        okEvent({ id: 'e1', principalDelta: 500, date: '2026-01-01' }),
        okEvent({ id: 'e2', principalDelta: 300, date: '2026-02-01' }),
      ],
    }));
    assert.equal(result.status, 'ok');
    assert.equal(result.principalBalance, 800);
  });

  it('4. resgate reduz saldo', async () => {
    const { calculateLegacyFixedRatePosition } = await loadAdapter();
    const result = calculateLegacyFixedRatePosition(okInput({
      rfEvents: [
        okEvent({ id: 'e1', principalDelta: 1000, date: '2026-01-01' }),
        okEvent({ id: 'e2', principalDelta: -300, date: '2026-06-01' }),
      ],
    }));
    assert.equal(result.status, 'ok');
    assert.equal(result.principalBalance, 700);
    assert.equal(result.movementSummary.totalRedemptions, 300);
  });

  it('5. evento de outro ativo e ignorado', async () => {
    const { calculateLegacyFixedRatePosition } = await loadAdapter();
    const result = calculateLegacyFixedRatePosition(okInput({
      rfEvents: [
        okEvent({ id: 'e1', principalDelta: 1000, date: '2026-01-01' }),
        okEvent({ id: 'e2', assetId: 'other-asset', principalDelta: 500, date: '2026-02-01' }),
      ],
    }));
    assert.equal(result.status, 'ok');
    assert.equal(result.principalBalance, 1000);
    assert.equal(result.movementSummary.movementCount, 1);
  });

  it('6. principalDelta zero e ignorado', async () => {
    const { calculateLegacyFixedRatePosition } = await loadAdapter();
    const result = calculateLegacyFixedRatePosition(okInput({
      rfEvents: [
        okEvent({ id: 'e1', principalDelta: 1000, date: '2026-01-01' }),
        okEvent({ id: 'e2', principalDelta: 0, date: '2026-02-15' }),
      ],
    }));
    assert.equal(result.status, 'ok');
    assert.equal(result.principalBalance, 1000);
    assert.equal(result.movementSummary.movementCount, 1);
  });

  it('7. principalDelta invalido preserva stage MOVEMENTS', async () => {
    const { calculateLegacyFixedRatePosition } = await loadAdapter();
    const result = calculateLegacyFixedRatePosition(okInput({
      rfEvents: [
        okEvent({ id: 'e1', principalDelta: 1000, date: '2026-01-01' }),
        okEvent({ id: 'e2', principalDelta: 'INVALIDO' }),
      ],
    }));
    assert.equal(result.status, 'error');
    assert.equal(result.stage, 'MOVEMENTS');
    assert.equal(result.code, 'INVALID_PRINCIPAL_AMOUNT');
  });

  it('8. ID invalido preserva stage MOVEMENTS', async () => {
    const { calculateLegacyFixedRatePosition } = await loadAdapter();
    const result = calculateLegacyFixedRatePosition(okInput({
      rfEvents: [okEvent({ id: '' })],
    }));
    assert.equal(result.status, 'error');
    assert.equal(result.stage, 'MOVEMENTS');
    assert.equal(result.code, 'INVALID_MOVEMENT_ID');
  });

  it('9. data invalida preserva stage MOVEMENTS', async () => {
    const { calculateLegacyFixedRatePosition } = await loadAdapter();
    const result = calculateLegacyFixedRatePosition(okInput({
      rfEvents: [okEvent({ date: '' })],
    }));
    assert.equal(result.status, 'error');
    assert.equal(result.stage, 'MOVEMENTS');
    assert.equal(result.code, 'INVALID_OCCURRED_ON');
  });

  it('10. saldo insuficiente preserva stage MOVEMENTS', async () => {
    const { calculateLegacyFixedRatePosition } = await loadAdapter();
    const result = calculateLegacyFixedRatePosition(okInput({
      rfEvents: [
        okEvent({ id: 'e1', principalDelta: 100, date: '2026-01-01' }),
        okEvent({ id: 'e2', principalDelta: -200, date: '2026-06-01' }),
      ],
    }));
    assert.equal(result.status, 'error');
    assert.equal(result.stage, 'MOVEMENTS');
    assert.equal(result.code, 'INSUFFICIENT_PRINCIPAL_BALANCE');
  });

  it('11. taxa negativa produz stage VALUATION apos movimentos validos', async () => {
    const { calculateLegacyFixedRatePosition } = await loadAdapter();
    const result = calculateLegacyFixedRatePosition(okInput({ annualRate: -0.05 }));
    assert.equal(result.status, 'error');
    assert.equal(result.stage, 'VALUATION');
    assert.equal(result.code, 'INVALID_ANNUAL_RATE');
  });

  it('12. dias invalidos produzem stage VALUATION', async () => {
    const { calculateLegacyFixedRatePosition } = await loadAdapter();
    const result = calculateLegacyFixedRatePosition(okInput({ elapsedBusinessDays: -1 }));
    assert.equal(result.status, 'error');
    assert.equal(result.stage, 'VALUATION');
    assert.equal(result.code, 'INVALID_ELAPSED_BUSINESS_DAYS');
  });

  it('13. calcula grossValue usando o saldo derivado', async () => {
    const { calculateLegacyFixedRatePosition } = await loadAdapter();
    const result = calculateLegacyFixedRatePosition(okInput({
      rfEvents: [okEvent({ principalDelta: 2000 })],
      annualRate: 0.10,
      elapsedBusinessDays: 252,
    }));
    assert.equal(result.status, 'ok');
    assert.equal(result.principalBalance, 2000);
    assert.equal(result.grossValue, 2200);
    assert.equal(result.grossProfit, 200);
  });

  it('14. nao utiliza grossValue do evento legado', async () => {
    const { calculateLegacyFixedRatePosition } = await loadAdapter();
    const result = calculateLegacyFixedRatePosition(okInput({
      rfEvents: [okEvent({ principalDelta: 500, grossValue: 99999 })],
      annualRate: 0.12,
      elapsedBusinessDays: 252,
    }));
    assert.equal(result.status, 'ok');
    assert.equal(result.principalBalance, 500);
    assert.equal(result.grossValue, 560);
    assert.notEqual(result.grossValue, 99999);
  });

  it('15. nao utiliza netValue do evento legado', async () => {
    const { calculateLegacyFixedRatePosition } = await loadAdapter();
    const result = calculateLegacyFixedRatePosition(okInput({
      rfEvents: [okEvent({ principalDelta: 500, netValue: 88888 })],
    }));
    assert.equal(result.status, 'ok');
    assert.equal(result.principalBalance, 500);
  });

  it('16. nao utiliza valores de IR ou IOF', async () => {
    const { calculateLegacyFixedRatePosition } = await loadAdapter();
    const result = calculateLegacyFixedRatePosition(okInput({
      rfEvents: [okEvent({ principalDelta: 500, ir: 999, iof: 888 })],
    }));
    assert.equal(result.status, 'ok');
    assert.equal(result.principalBalance, 500);
  });

  it('17. preserva movementIndex original', async () => {
    const { calculateLegacyFixedRatePosition } = await loadAdapter();
    const result = calculateLegacyFixedRatePosition(okInput({
      rfEvents: [
        okEvent({ id: 'e1', principalDelta: 100, date: '2026-01-01' }),
        okEvent({ id: 'e2', principalDelta: 'BAD' }),
      ],
    }));
    assert.equal(result.status, 'error');
    assert.equal(result.movementIndex, 1);
  });

  it('18. preserva movementId original', async () => {
    const { calculateLegacyFixedRatePosition } = await loadAdapter();
    const result = calculateLegacyFixedRatePosition(okInput({
      rfEvents: [
        okEvent({ id: 'e1', principalDelta: 100, date: '2026-01-01' }),
        okEvent({ id: 'bad-delta', principalDelta: null }),
      ],
    }));
    assert.equal(result.status, 'error');
    assert.equal(result.movementId, 'bad-delta');
  });

  it('19. rfEvents nao e modificado', async () => {
    const { calculateLegacyFixedRatePosition } = await loadAdapter();
    const events = [okEvent()];
    const before = JSON.stringify(events);
    calculateLegacyFixedRatePosition(okInput({ rfEvents: events }));
    assert.equal(JSON.stringify(events), before);
  });

  it('20. input nao e modificado', async () => {
    const { calculateLegacyFixedRatePosition } = await loadAdapter();
    const input = Object.freeze(okInput());
    const result = calculateLegacyFixedRatePosition(input);
    assert.equal(result.status, 'ok');
    assert.equal(input.annualRate, 0.12);
  });

  it('21. resultado esta congelado', async () => {
    const { calculateLegacyFixedRatePosition } = await loadAdapter();
    const result = calculateLegacyFixedRatePosition(okInput());
    assert.equal(Object.isFrozen(result), true);
  });
});
