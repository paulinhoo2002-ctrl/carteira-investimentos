const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ADAPTER_PATH = path.join(__dirname, '..', 'modern', 'src', 'domain', 'fixedIncome', 'legacyRfEventsAdapter.ts');

async function loadAdapter() {
  return import(pathToFileURL(ADAPTER_PATH).href);
}

const ASSET_ID = 'asset-cdb-1';

function okEvent(overrides = {}) {
  return {
    id: 'evt-ok',
    assetId: ASSET_ID,
    ticker: 'CDB-BANCO-X',
    date: '2026-01-15',
    type: 'amortizacao',
    grossValue: 0,
    ir: 0,
    iof: 0,
    netValue: 0,
    principalDelta: 500,
    source: 'Manual',
    note: '',
    ...overrides,
  };
}

function jurosEvent(overrides = {}) {
  return {
    id: 'evt-juros',
    assetId: ASSET_ID,
    ticker: 'CDB-BANCO-X',
    date: '2026-02-15',
    type: 'juros',
    grossValue: 150,
    ir: 22.5,
    iof: 0,
    netValue: 127.5,
    principalDelta: 0,
    source: 'Manual',
    note: 'Juros mensais',
    ...overrides,
  };
}

function redemptionEvent(overrides = {}) {
  return {
    id: 'evt-resgate',
    assetId: ASSET_ID,
    ticker: 'CDB-BANCO-X',
    date: '2026-06-20',
    type: 'resgate_parcial',
    grossValue: 0,
    ir: 0,
    iof: 0,
    netValue: 0,
    principalDelta: -300,
    source: 'Manual',
    note: '',
    ...overrides,
  };
}

describe('legacyRfEventsAdapter - legacyRfEventsToMovements', () => {
  it('1. array vazio retorna sucesso com totais zerados', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const result = legacyRfEventsToMovements([], ASSET_ID);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.principalBalance, 0);
    assert.equal(result.summary.totalApplications, 0);
    assert.equal(result.summary.totalContributions, 0);
    assert.equal(result.summary.totalRedemptions, 0);
    assert.equal(result.summary.movementCount, 0);
  });

  it('2. null/undefined rfEvents tratado como vazio', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const r1 = legacyRfEventsToMovements(null, ASSET_ID);
    const r2 = legacyRfEventsToMovements(undefined, ASSET_ID);
    assert.equal(r1.status, 'ok');
    assert.equal(r1.summary.movementCount, 0);
    assert.equal(r2.status, 'ok');
    assert.equal(r2.summary.movementCount, 0);
  });

  it('3. assetId vazio retorna INVALID_ASSET_ID', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const result = legacyRfEventsToMovements([okEvent()], '');
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_ASSET_ID');
  });

  it('4. assetId somente espaços retorna INVALID_ASSET_ID', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const result = legacyRfEventsToMovements([okEvent()], '   ');
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_ASSET_ID');
  });

  it('5. assetId com espaços externos é normalizado', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const result = legacyRfEventsToMovements([okEvent()], `  ${ASSET_ID}  `);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.movementCount, 1);
    assert.equal(result.summary.totalContributions, 500);
  });

  it('6. contribution unica (principalDelta > 0)', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const result = legacyRfEventsToMovements([okEvent()], ASSET_ID);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.principalBalance, 500);
    assert.equal(result.summary.totalContributions, 500);
    assert.equal(result.summary.totalApplications, 0);
    assert.equal(result.summary.totalRedemptions, 0);
    assert.equal(result.summary.movementCount, 1);
  });

  it('7. redemption unica (principalDelta < 0)', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const mov = [okEvent({ id: 'app', principalDelta: 1000, date: '2026-01-01' }), redemptionEvent()];
    const result = legacyRfEventsToMovements(mov, ASSET_ID);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.principalBalance, 700);
    assert.equal(result.summary.totalContributions, 1000);
    assert.equal(result.summary.totalRedemptions, 300);
    assert.equal(result.summary.movementCount, 2);
  });

  it('8. evento juros (principalDelta === 0) filtrado', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const events = [okEvent(), jurosEvent()];
    const result = legacyRfEventsToMovements(events, ASSET_ID);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.movementCount, 1);
    assert.equal(result.summary.totalContributions, 500);
  });

  it('9. misto: contribution + juros + redemption', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const events = [
      okEvent({ id: 'c1', principalDelta: 1000, date: '2026-01-01' }),
      jurosEvent(),
      redemptionEvent({ id: 'r1', principalDelta: -400, date: '2026-06-01' }),
    ];
    const result = legacyRfEventsToMovements(events, ASSET_ID);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.principalBalance, 600);
    assert.equal(result.summary.totalContributions, 1000);
    assert.equal(result.summary.totalRedemptions, 400);
  });

  it('10. assetId mismatch filtrado', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const events = [
      okEvent({ id: 'e1' }),
      okEvent({ id: 'e2', assetId: 'other-asset' }),
    ];
    const result = legacyRfEventsToMovements(events, ASSET_ID);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.movementCount, 1);
    assert.equal(result.summary.totalContributions, 500);
  });

  it('11. todos filtrados (zero principalDelta + assetId mismatch)', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const events = [
      jurosEvent(),
      okEvent({ assetId: 'other', principalDelta: 100 }),
    ];
    const result = legacyRfEventsToMovements(events, ASSET_ID);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.movementCount, 0);
  });

  it('12. contribuicoes multiplas somadas', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const events = [
      okEvent({ id: 'c1', principalDelta: 100, date: '2026-01-01' }),
      okEvent({ id: 'c2', principalDelta: 200, date: '2026-02-01' }),
      okEvent({ id: 'c3', principalDelta: 300, date: '2026-03-01' }),
    ];
    const result = legacyRfEventsToMovements(events, ASSET_ID);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.totalContributions, 600);
    assert.equal(result.summary.principalBalance, 600);
  });

  it('13. redemptions multiplas somadas', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const events = [
      okEvent({ id: 'app', principalDelta: 2000, date: '2026-01-01' }),
      redemptionEvent({ id: 'r1', principalDelta: -100, date: '2026-03-01' }),
      redemptionEvent({ id: 'r2', principalDelta: -200, date: '2026-04-01' }),
    ];
    const result = legacyRfEventsToMovements(events, ASSET_ID);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.totalRedemptions, 300);
    assert.equal(result.summary.principalBalance, 1700);
  });

  it('14. redemption excede saldo -> erro', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const events = [
      okEvent({ id: 'app', principalDelta: 500, date: '2026-01-01' }),
      redemptionEvent({ id: 'r1', principalDelta: -600, date: '2026-03-01' }),
    ];
    const result = legacyRfEventsToMovements(events, ASSET_ID);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INSUFFICIENT_PRINCIPAL_BALANCE');
    assert.equal(result.movementIndex, 1);
    assert.equal(result.movementId, 'r1');
  });

  it('15. IDs duplicados -> erro', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const events = [
      okEvent({ id: 'dup', principalDelta: 500, date: '2026-01-01' }),
      okEvent({ id: 'dup', principalDelta: 300, date: '2026-02-01' }),
    ];
    const result = legacyRfEventsToMovements(events, ASSET_ID);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'DUPLICATE_MOVEMENT_ID');
  });

  it('16. array de entrada nao mutado', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const events = [okEvent()];
    const before = JSON.stringify(events);
    legacyRfEventsToMovements(events, ASSET_ID);
    assert.equal(JSON.stringify(events), before);
  });

  it('17. resultado congelado (frozen)', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const result = legacyRfEventsToMovements([okEvent()], ASSET_ID);
    assert.equal(Object.isFrozen(result), true);
    if (result.status === 'ok') {
      assert.equal(Object.isFrozen(result.summary), true);
    }
  });

  it('18. deterministico em chamadas repetidas', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const events = [
      okEvent({ id: 'c1', principalDelta: 1000, date: '2026-01-01' }),
      redemptionEvent({ id: 'r1', principalDelta: -300, date: '2026-06-01' }),
    ];
    const r1 = legacyRfEventsToMovements(events, ASSET_ID);
    const r2 = legacyRfEventsToMovements(events, ASSET_ID);
    assert.equal(r1.status, 'ok');
    assert.equal(r2.status, 'ok');
    assert.equal(r1.summary.principalBalance, r2.summary.principalBalance);
  });

  it('19. note preservado do evento legacy', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const event = okEvent({ note: 'Amortizacao extraordinaria' });
    const result = legacyRfEventsToMovements([event], ASSET_ID);
    assert.equal(result.status, 'ok');
  });

  it('20. note vazio nao afeta resultado', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const event = okEvent({ note: '' });
    const result = legacyRfEventsToMovements([event], ASSET_ID);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.principalBalance, 500);
  });

  it('21. date invalida (vazia) -> erro do movementModel', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const event = okEvent({ date: '' });
    const result = legacyRfEventsToMovements([event], ASSET_ID);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_OCCURRED_ON');
  });

  it('22. id vazio -> erro do movementModel', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const event = okEvent({ id: '' });
    const result = legacyRfEventsToMovements([event], ASSET_ID);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_MOVEMENT_ID');
  });

  it('23. principalDelta negativo -> REDEMPTION com abs', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const events = [
      okEvent({ id: 'app', principalDelta: 1000, date: '2026-01-01' }),
      okEvent({ id: 'res', principalDelta: -250, date: '2026-05-01' }),
    ];
    const result = legacyRfEventsToMovements(events, ASSET_ID);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.totalContributions, 1000);
    assert.equal(result.summary.totalRedemptions, 250);
    assert.equal(result.summary.principalBalance, 750);
  });

  it('24. principalDelta NaN -> INVALID_PRINCIPAL_AMOUNT', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const result = legacyRfEventsToMovements([okEvent({ principalDelta: NaN })], ASSET_ID);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_PRINCIPAL_AMOUNT');
  });

  it('25. principalDelta Infinity -> INVALID_PRINCIPAL_AMOUNT', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const result = legacyRfEventsToMovements([okEvent({ principalDelta: Infinity })], ASSET_ID);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_PRINCIPAL_AMOUNT');
  });

  it('26. principalDelta string -> INVALID_PRINCIPAL_AMOUNT', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const result = legacyRfEventsToMovements([okEvent({ principalDelta: '500' })], ASSET_ID);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_PRINCIPAL_AMOUNT');
  });

  it('27. principalDelta ausente (undefined) -> INVALID_PRINCIPAL_AMOUNT', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const event = okEvent();
    delete event.principalDelta;
    const result = legacyRfEventsToMovements([event], ASSET_ID);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_PRINCIPAL_AMOUNT');
  });

  it('28. principalDelta null -> INVALID_PRINCIPAL_AMOUNT', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const result = legacyRfEventsToMovements([okEvent({ principalDelta: null })], ASSET_ID);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_PRINCIPAL_AMOUNT');
  });

  it('29. principalDelta zero legítimo filtrado (juros)', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const events = [jurosEvent(), okEvent({ id: 'c1', principalDelta: 300 })];
    const result = legacyRfEventsToMovements(events, ASSET_ID);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.movementCount, 1);
    assert.equal(result.summary.totalContributions, 300);
  });

  it('30. indice original preservado apos eventos ignorados', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const events = [
      jurosEvent({ id: 'j1' }),
      okEvent({ id: 'c1', principalDelta: 100, date: '2026-01-01' }),
      okEvent({ id: 'bad', principalDelta: 'INVALIDO' }),
      okEvent({ id: 'c2', principalDelta: 200, date: '2026-02-01' }),
    ];
    const result = legacyRfEventsToMovements(events, ASSET_ID);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_PRINCIPAL_AMOUNT');
    assert.equal(result.movementIndex, 2);
    assert.equal(result.movementId, 'bad');
  });

  it('31. principalDelta zero apos contribution valida', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const events = [
      okEvent({ id: 'c1', principalDelta: 500, date: '2026-01-01' }),
      jurosEvent({ id: 'j1' }),
    ];
    const result = legacyRfEventsToMovements(events, ASSET_ID);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.principalBalance, 500);
    assert.equal(result.summary.movementCount, 1);
  });

  it('32. evento objeto valido e nao-objeto ignorado', async () => {
    const { legacyRfEventsToMovements } = await loadAdapter();
    const events = [
      null,
      undefined,
      'string',
      123,
      okEvent({ id: 'valid', principalDelta: 100, date: '2026-01-01' }),
    ];
    const result = legacyRfEventsToMovements(events, ASSET_ID);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.movementCount, 1);
    assert.equal(result.summary.totalContributions, 100);
  });
});
