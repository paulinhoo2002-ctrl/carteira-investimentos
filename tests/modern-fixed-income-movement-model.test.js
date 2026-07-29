const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const MODULE_PATH = path.join(__dirname, '..', 'modern', 'src', 'domain', 'fixedIncome', 'movementModel.ts');

async function loadModule() {
  return import(pathToFileURL(MODULE_PATH).href);
}

function ok(assetId = 'asset-1') {
  return [
    { id: 'm1', assetId, type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
  ];
}

describe('movementModel - calculateFixedIncomeMovementSummary', () => {
  it('1. lista vazia retorna sucesso com totais zerados', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([]);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.principalBalance, 0);
    assert.equal(result.summary.totalApplications, 0);
    assert.equal(result.summary.totalContributions, 0);
    assert.equal(result.summary.totalRedemptions, 0);
    assert.equal(result.summary.movementCount, 0);
  });

  it('2. uma APPLICATION', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary(ok());
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.principalBalance, 1000);
    assert.equal(result.summary.totalApplications, 1000);
    assert.equal(result.summary.totalContributions, 0);
    assert.equal(result.summary.totalRedemptions, 0);
    assert.equal(result.summary.movementCount, 1);
  });

  it('3. APPLICATION + CONTRIBUTION', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
      { id: 'm2', assetId: 'a1', type: 'CONTRIBUTION', occurredOn: '2026-03-01', principalAmount: 500 },
    ]);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.principalBalance, 1500);
    assert.equal(result.summary.totalApplications, 1000);
    assert.equal(result.summary.totalContributions, 500);
    assert.equal(result.summary.movementCount, 2);
  });

  it('4. APPLICATION + CONTRIBUTION + REDEMPTION parcial', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 10000 },
      { id: 'm2', assetId: 'a1', type: 'CONTRIBUTION', occurredOn: '2026-03-01', principalAmount: 2000 },
      { id: 'm3', assetId: 'a1', type: 'REDEMPTION', occurredOn: '2026-07-20', principalAmount: 3000 },
    ]);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.principalBalance, 9000);
    assert.equal(result.summary.totalApplications, 10000);
    assert.equal(result.summary.totalContributions, 2000);
    assert.equal(result.summary.totalRedemptions, 3000);
    assert.equal(result.summary.movementCount, 3);
  });

  it('5. resgate total deixa principalBalance zero', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 5000 },
      { id: 'm2', assetId: 'a1', type: 'REDEMPTION', occurredOn: '2026-06-01', principalAmount: 5000 },
    ]);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.principalBalance, 0);
    assert.equal(result.summary.totalRedemptions, 5000);
    assert.equal(result.summary.movementCount, 2);
  });

  it('6. múltiplas aplicações são somadas', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
      { id: 'm2', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-02-01', principalAmount: 2000 },
      { id: 'm3', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-03-01', principalAmount: 3000 },
    ]);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.totalApplications, 6000);
    assert.equal(result.summary.principalBalance, 6000);
  });

  it('7. múltiplos aportes são somados', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
      { id: 'm2', assetId: 'a1', type: 'CONTRIBUTION', occurredOn: '2026-02-01', principalAmount: 100 },
      { id: 'm3', assetId: 'a1', type: 'CONTRIBUTION', occurredOn: '2026-03-01', principalAmount: 200 },
    ]);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.totalContributions, 300);
    assert.equal(result.summary.principalBalance, 1300);
  });

  it('8. múltiplos resgates são somados', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 10000 },
      { id: 'm2', assetId: 'a1', type: 'REDEMPTION', occurredOn: '2026-04-01', principalAmount: 1000 },
      { id: 'm3', assetId: 'a1', type: 'REDEMPTION', occurredOn: '2026-05-01', principalAmount: 2000 },
    ]);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.totalRedemptions, 3000);
    assert.equal(result.summary.principalBalance, 7000);
  });

  it('9. mesmo conteúdo com IDs diferentes é válido', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
      { id: 'm2', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
    ]);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.totalApplications, 2000);
  });

  it('10. ID vazio', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: '', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_MOVEMENT_ID');
    assert.equal(result.movementIndex, 0);
  });

  it('11. ID somente espaços', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: '   ', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_MOVEMENT_ID');
    assert.equal(result.movementIndex, 0);
    assert.equal(result.movementId, '   ');
  });

  it('12. assetId vazio', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: '', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_ASSET_ID');
    assert.equal(result.movementIndex, 0);
  });

  it('13. assetId somente espaços', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: '   ', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_ASSET_ID');
    assert.equal(result.movementIndex, 0);
  });

  it('14. tipo inválido em runtime', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'INVALID_TYPE', occurredOn: '2026-01-01', principalAmount: 1000 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_MOVEMENT_TYPE');
    assert.equal(result.movementIndex, 0);
  });

  it('15. data válida comum', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary(ok());
    assert.equal(result.status, 'ok');
  });

  it('16. ano bissexto válido', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2024-02-29', principalAmount: 1000 },
    ]);
    assert.equal(result.status, 'ok');
  });

  it('17. ano não bissexto inválido', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2025-02-29', principalAmount: 1000 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_OCCURRED_ON');
    assert.equal(result.movementIndex, 0);
  });

  it('18. dia inexistente', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-04-31', principalAmount: 1000 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_OCCURRED_ON');
  });

  it('19. mês inexistente', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-13-01', principalAmount: 1000 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_OCCURRED_ON');
  });

  it('20. formato sem zero à esquerda', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-1-1', principalAmount: 1000 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_OCCURRED_ON');
  });

  it('21. datetime em vez de data civil', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01T10:00:00Z', principalAmount: 1000 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_OCCURRED_ON');
  });

  it('22. principalAmount zero', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 0 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_PRINCIPAL_AMOUNT');
  });

  it('23. principalAmount negativo', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: -100 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_PRINCIPAL_AMOUNT');
  });

  it('24. principalAmount NaN', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: NaN },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_PRINCIPAL_AMOUNT');
  });

  it('25. principalAmount Infinity', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: Infinity },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_PRINCIPAL_AMOUNT');
  });

  it('26. principalAmount como string em runtime', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: '1000' },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_PRINCIPAL_AMOUNT');
  });

  it('27. ID duplicado', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'dup', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
      { id: 'dup', assetId: 'a1', type: 'CONTRIBUTION', occurredOn: '2026-02-01', principalAmount: 500 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'DUPLICATE_MOVEMENT_ID');
    assert.equal(result.movementIndex, 1);
    assert.equal(result.movementId, 'dup');
  });

  it('28. assetIds diferentes', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
      { id: 'm2', assetId: 'a2', type: 'CONTRIBUTION', occurredOn: '2026-02-01', principalAmount: 500 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'MIXED_ASSET_IDS');
    assert.equal(result.movementIndex, 1);
    assert.equal(result.movementId, 'm2');
  });

  it('29. resgate sem aplicação anterior', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'REDEMPTION', occurredOn: '2026-01-01', principalAmount: 1000 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INSUFFICIENT_PRINCIPAL_BALANCE');
    assert.equal(result.movementIndex, 0);
  });

  it('30. resgate maior que saldo', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
      { id: 'm2', assetId: 'a1', type: 'REDEMPTION', occurredOn: '2026-02-01', principalAmount: 1500 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INSUFFICIENT_PRINCIPAL_BALANCE');
    assert.equal(result.movementIndex, 1);
    assert.equal(result.movementId, 'm2');
  });

  it('31. validação sequencial detecta saldo negativo temporário', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
      { id: 'm2', assetId: 'a1', type: 'REDEMPTION', occurredOn: '2026-02-01', principalAmount: 1500 },
      { id: 'm3', assetId: 'a1', type: 'CONTRIBUTION', occurredOn: '2026-03-01', principalAmount: 1000 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INSUFFICIENT_PRINCIPAL_BALANCE');
    assert.equal(result.movementIndex, 1);
    assert.equal(result.movementId, 'm2');
  });

  it('32. aporte posterior não corrige resgate anterior inválido', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'REDEMPTION', occurredOn: '2026-01-01', principalAmount: 100 },
      { id: 'm2', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-02-01', principalAmount: 100 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INSUFFICIENT_PRINCIPAL_BALANCE');
    assert.equal(result.movementIndex, 0);
  });

  it('33. movimentos retroativos são aceitos na ordem recebida', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-06-01', principalAmount: 1000 },
      { id: 'm2', assetId: 'a1', type: 'CONTRIBUTION', occurredOn: '2026-01-01', principalAmount: 500 },
    ]);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.principalBalance, 1500);
  });

  it('34. movimentos futuros são aceitos', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2099-12-31', principalAmount: 1000 },
    ]);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.principalBalance, 1000);
  });

  it('35. movimentos da mesma data respeitam a ordem do array', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
      { id: 'm2', assetId: 'a1', type: 'REDEMPTION', occurredOn: '2026-01-01', principalAmount: 300 },
      { id: 'm3', assetId: 'a1', type: 'CONTRIBUTION', occurredOn: '2026-01-01', principalAmount: 200 },
    ]);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.principalBalance, 900);
  });

  it('36. resgate antes da aplicação na mesma data falha', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'REDEMPTION', occurredOn: '2026-01-01', principalAmount: 500 },
      { id: 'm2', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INSUFFICIENT_PRINCIPAL_BALANCE');
    assert.equal(result.movementIndex, 0);
  });

  it('37. aplicação antes do resgate na mesma data funciona', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
      { id: 'm2', assetId: 'a1', type: 'REDEMPTION', occurredOn: '2026-01-01', principalAmount: 500 },
    ]);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.principalBalance, 500);
  });

  it('38. resultado determinístico em chamadas repetidas', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const input = [
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
      { id: 'm2', assetId: 'a1', type: 'REDEMPTION', occurredOn: '2026-06-01', principalAmount: 400 },
    ];
    const r1 = calculateFixedIncomeMovementSummary(input);
    const r2 = calculateFixedIncomeMovementSummary(input);
    assert.equal(r1.status, 'ok');
    assert.equal(r2.status, 'ok');
    assert.equal(r1.summary.principalBalance, r2.summary.principalBalance);
    assert.equal(r1.summary.movementCount, r2.summary.movementCount);
  });

  it('39. array de entrada não é mutado', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const input = Object.freeze([
      Object.freeze({ id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 }),
    ]);
    const result = calculateFixedIncomeMovementSummary(input);
    assert.equal(result.status, 'ok');
    assert.equal(input.length, 1);
    assert.equal(input[0].principalAmount, 1000);
  });

  it('40. objetos de entrada não são mutados', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const input = [
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
    ];
    const before = JSON.stringify(input);
    calculateFixedIncomeMovementSummary(input);
    assert.equal(JSON.stringify(input), before);
  });

  it('41. summary retornado está congelado', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary(ok());
    assert.equal(result.status, 'ok');
    assert.equal(Object.isFrozen(result.summary), true);
  });

  it('42. resultado de sucesso está congelado', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary(ok());
    assert.equal(Object.isFrozen(result), true);
  });

  it('43. resultado de erro está congelado', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: '', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
    ]);
    assert.equal(Object.isFrozen(result), true);
  });

  it('44. resultado não é arredondado', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 0.1 },
      { id: 'm2', assetId: 'a1', type: 'CONTRIBUTION', occurredOn: '2026-02-01', principalAmount: 0.2 },
    ]);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.principalBalance, 0.1 + 0.2);
    assert.equal(result.summary.principalBalance, 0.30000000000000004);
  });

  it('45. overflow matemático retorna NON_FINITE_RESULT', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: Number.MAX_VALUE },
      { id: 'm2', assetId: 'a1', type: 'CONTRIBUTION', occurredOn: '2026-02-01', principalAmount: Number.MAX_VALUE },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'NON_FINITE_RESULT');
    assert.equal(result.movementIndex, 1);
  });

  it('46. erro inclui movementIndex correto', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
      { id: 'm2', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 2000 },
      { id: 'm3', assetId: 'a1', type: 'REDEMPTION', occurredOn: '2026-03-01', principalAmount: 5000 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.movementIndex, 2);
  });

  it('47. erro inclui movementId quando disponível', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
      { id: 'my-bad-id', assetId: 'a1', type: 'REDEMPTION', occurredOn: '2026-02-01', principalAmount: 9999 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.movementId, 'my-bad-id');
  });

  it('48. movementCount corresponde ao tamanho da lista em sucesso', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
      { id: 'm2', assetId: 'a1', type: 'CONTRIBUTION', occurredOn: '2026-02-01', principalAmount: 500 },
      { id: 'm3', assetId: 'a1', type: 'REDEMPTION', occurredOn: '2026-03-01', principalAmount: 200 },
    ]);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.movementCount, 3);
  });

  it('null como movementId em erro de entrada sem ID', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: null, assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_MOVEMENT_ID');
    assert.equal(result.movementId, undefined);
  });

  it('note presente não interfere', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-01', principalAmount: 1000, note: 'Primeira aplicação' },
      { id: 'm2', assetId: 'a1', type: 'REDEMPTION', occurredOn: '2026-06-01', principalAmount: 500, note: undefined },
    ]);
    assert.equal(result.status, 'ok');
    assert.equal(result.summary.principalBalance, 500);
  });

  it('mês 00 é inválido', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-00-01', principalAmount: 1000 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_OCCURRED_ON');
  });

  it('dia 00 é inválido', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026-01-00', principalAmount: 1000 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_OCCURRED_ON');
  });

  it('apenas ano (formato incompleto) é inválido', async () => {
    const { calculateFixedIncomeMovementSummary } = await loadModule();
    const result = calculateFixedIncomeMovementSummary([
      { id: 'm1', assetId: 'a1', type: 'APPLICATION', occurredOn: '2026', principalAmount: 1000 },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.code, 'INVALID_OCCURRED_ON');
  });
});
