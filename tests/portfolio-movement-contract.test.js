/**
 * Testes do contrato puro de movimentação de carteira (Entrega 2A).
 *
 * A feature "Movimentação inteligente de carteira" será implementada em
 * camadas: este contrato cobre apenas seleção, normalização, identificação e
 * prévia aritmética simples. A validação financeira oficial (rfMovementValidation),
 * a persistência e o re-render continuam fora do escopo deste arquivo.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const contract = require('../portfolio-movement-contract.js');

const {
  MOVEMENT_ERROR_CODES,
  buildSellableAssets,
  buildRedeemableAssets,
  resolvePortfolioMovementKind,
  buildVariableIncomeSalePreview,
  buildFixedIncomeRedemptionPreview,
  findPortfolioMovementAsset,
} = contract;

function makeEquityAsset(overrides = {}) {
  return {
    id: 'asset-petr4',
    ticker: 'PETR4',
    name: 'Petrobras PN',
    type: 'Ação',
    sector: 'Petróleo e Gás',
    qty: 100,
    avg_price: 23.5,
    current_price: 31.9,
    ...overrides
  };
}

function makeRfAsset(overrides = {}) {
  return {
    id: 'rf-cdb26',
    ticker: 'CDB26',
    name: 'CDB Prefixado Banco X',
    type: 'Renda Fixa',
    rf_subtype: 'CDB',
    fixed_issuer: 'Banco X',
    rf_maturity_date: '2026-12-01',
    dailyLiquidity: 'D+0',
    rf_applied_value: 1000,
    ...overrides
  };
}

function makeRedeemableHelpers(overrides = {}) {
  return {
    isFixedIncomeAsset: (asset) =>
      Boolean(asset && String(asset.type ?? '').trim() === 'Renda Fixa'),
    getPrincipalBalance: (asset) => ({
      value: Number(asset.rf_applied_value ?? 0),
      source: 'rf_applied_value',
      hasExplicitApplied: true,
    }),
    getOfficialValues: (asset) => ({
      gross: Number(asset.__gross ?? 0),
      liquid: Number(asset.__liquid ?? 0),
    }),
    getEventAssetId: (asset) => asset.id ?? asset.assetId ?? asset.rf_asset_id,
    getEventTicker: (asset) => asset.ticker ?? '',
    ...overrides
  };
}

test('1. buildSellableAssets retorna lista ordenada com campos normalizados', () => {
  const assets = [
    { id: 'z', ticker: 'PETR4', type: 'Ação', qty: 100, current_price: 31.9 },
    { id: 'a', ticker: 'PETR4', type: 'Ação', qty: 50, current_price: 30 },
    { id: 'c', ticker: 'VALE3', type: 'Ação', qty: 10, current_price: 65 },
    { id: 'b', ticker: 'MXRF11', type: 'FII', qty: 40, current_price: 9.5 },
  ];
  const list = buildSellableAssets(assets);
  assert.deepStrictEqual(list.map((item) => item.assetId), ['a', 'z', 'c', 'b']);

  const petr4 = list[0];
  assert.equal(petr4.ticker, 'PETR4');
  assert.equal(petr4.availableQuantity, 50);
  assert.equal(petr4.currentPrice, 30);
  assert.equal(petr4.estimatedPositionValue, 1500);
  assert.equal(petr4.movementKind, 'sale');
  assert.equal(petr4.averagePrice, 0);
});

test('2. buildSellableAssets exclui renda fixa e tesouro direto', () => {
  const assets = [
    { id: 's1', ticker: 'PETR4', type: 'Ação', qty: 10 },
    { id: 'r1', ticker: 'CDB1', type: 'Renda Fixa', qty: 5 },
    { id: 't1', ticker: 'TES1', type: 'Tesouro Direto', qty: 5 },
  ];
  const list = buildSellableAssets(assets);
  assert.deepStrictEqual(list.map((item) => item.ticker), ['PETR4']);
});

test('3. buildSellableAssets exclui reserva de emergência por padrão', () => {
  const assets = [
    { id: 's1', ticker: 'PETR4', type: 'Ação', qty: 10 },
    { id: 'res', ticker: 'RES1', type: 'Reserva de Emergência', qty: 10 },
  ];
  const list = buildSellableAssets(assets);
  assert.deepStrictEqual(list.map((item) => item.ticker), ['PETR4']);
});

test('4. buildSellableAssets inclui reserva quando includeReserve é true', () => {
  const assets = [
    { id: 's1', ticker: 'PETR4', type: 'Ação', qty: 10 },
    { id: 'res', ticker: 'RES1', type: 'Reserva de Emergência', qty: 10 },
  ];
  const list = buildSellableAssets(assets, { includeReserve: true });
  assert.deepStrictEqual(list.map((item) => item.ticker), ['PETR4', 'RES1']);
});

test('5. buildSellableAssets exclui posições zeradas, negativas ou sem quantidade', () => {
  const assets = [
    { id: 'a', ticker: 'A', type: 'Ação', qty: 0 },
    { id: 'b', ticker: 'B', type: 'Ação', qty: -5 },
    { id: 'c', ticker: 'C', type: 'Ação' },
    { id: 'd', ticker: 'D', type: 'Ação', qty: 3 },
  ];
  const list = buildSellableAssets(assets);
  assert.deepStrictEqual(list.map((item) => item.ticker), ['D']);
});

test('6. buildSellableAssets respeita overrides isFixedIncome e isReserve', () => {
  const assets = [
    { id: 's1', ticker: 'NORM', type: 'Outro', qty: 10 },
    { id: 'f1', ticker: 'MYFIX', type: 'Outro', qty: 10 },
    { id: 'r1', ticker: 'MYRES', type: 'Outro', qty: 10 },
  ];
  const list = buildSellableAssets(assets, {
    isFixedIncome: (asset) => asset.ticker === 'MYFIX',
    isReserve: (asset) => asset.ticker === 'MYRES',
  });
  assert.deepStrictEqual(list.map((item) => item.ticker), ['NORM']);
});

test('7. buildRedeemableAssets retorna apenas títulos RF com saldo e campos normalizados', () => {
  const list = buildRedeemableAssets([makeRfAsset()], makeRedeemableHelpers());
  assert.equal(list.length, 1);
  const item = list[0];
  assert.equal(item.assetId, 'rf-cdb26');
  assert.equal(item.ticker, 'CDB26');
  assert.equal(item.name, 'CDB Prefixado Banco X');
  assert.equal(item.type, 'Renda Fixa');
  assert.equal(item.subtype, 'CDB');
  assert.equal(item.issuer, 'Banco X');
  assert.equal(item.maturityDate, '2026-12-01');
  assert.equal(item.liquidity, 'D+0');
  assert.equal(item.appliedBalance, 1000);
  assert.equal(item.movementKind, 'redemption');
});

test('8. buildRedeemableAssets aplica saldo a partir do objeto {value} do helper', () => {
  const helpers = makeRedeemableHelpers({
    getPrincipalBalance: () => ({ value: 1234.56, source: 'fixed_initial_value', hasExplicitApplied: false }),
  });
  const list = buildRedeemableAssets([makeRfAsset()], helpers);
  assert.equal(list[0].appliedBalance, 1234.56);
});

test('9. buildRedeemableAssets usa getOfficialValues para bruto e líquido', () => {
  const helpers = makeRedeemableHelpers({
    getOfficialValues: () => ({ gross: 1100, liquid: 1050 }),
  });
  const list = buildRedeemableAssets([makeRfAsset()], helpers);
  assert.equal(list[0].grossValue, 1100);
  assert.equal(list[0].liquidValue, 1050);
});

test('10. buildRedeemableAssets exclui títulos com saldo zero ou ausente', () => {
  const assets = [
    makeRfAsset({ id: 'rf-zero', rf_applied_value: 0 }),
    makeRfAsset({ id: 'rf-null', rf_applied_value: undefined }),
  ];
  const list = buildRedeemableAssets(assets, makeRedeemableHelpers());
  assert.deepStrictEqual(list, []);
});

test('11. buildRedeemableAssets ordena por subtype, ticker e assetId', () => {
  const assets = [
    makeRfAsset({ id: 'rf-cdb', ticker: 'CDB1', rf_subtype: 'CDB' }),
    makeRfAsset({ id: 'rf-lci', ticker: 'LCI1', rf_subtype: 'LCI' }),
    makeRfAsset({ id: 'rf-cdb2', ticker: 'CDB2', rf_subtype: 'CDB' }),
  ];
  const list = buildRedeemableAssets(assets, makeRedeemableHelpers());
  assert.deepStrictEqual(list.map((item) => item.assetId), ['rf-cdb', 'rf-cdb2', 'rf-lci']);
});

test('12. buildRedeemableAssets retorna lista vazia quando helper obrigatório está ausente', () => {
  const helpers = { isFixedIncomeAsset: (asset) => true };
  const list = buildRedeemableAssets([makeRfAsset()], helpers);
  assert.deepStrictEqual(list, []);
});

test('13. buildRedeemableAssets retorna lista vazia quando helper não é função', () => {
  const helpers = makeRedeemableHelpers({ getPrincipalBalance: 42 });
  const list = buildRedeemableAssets([makeRfAsset()], helpers);
  assert.deepStrictEqual(list, []);
});

test('14. resolvePortfolioMovementKind retorna sale para renda variável', () => {
  assert.equal(resolvePortfolioMovementKind({ id: 'p', type: 'Ação' }), 'sale');
  assert.equal(resolvePortfolioMovementKind({ id: 'f', type: 'FII' }), 'sale');
});

test('15. resolvePortfolioMovementKind retorna redemption para renda fixa e tesouro direto', () => {
  assert.equal(resolvePortfolioMovementKind({ id: 'c', type: 'Renda Fixa' }), 'redemption');
  assert.equal(resolvePortfolioMovementKind({ id: 't', type: 'Tesouro Direto' }), 'redemption');
});

test('16. resolvePortfolioMovementKind retorna unsupported para reserva, sem tipo e inválidos', () => {
  assert.equal(resolvePortfolioMovementKind({ id: 'r', type: 'Reserva de Emergência' }), 'unsupported');
  assert.equal(resolvePortfolioMovementKind({ id: 'x', movementKind: 'sale' }), 'sale');
  assert.equal(resolvePortfolioMovementKind({ id: 'y', movementKind: 'redemption' }), 'redemption');
  assert.equal(resolvePortfolioMovementKind({ id: 'z' }), 'unsupported');
  assert.equal(resolvePortfolioMovementKind(null), 'unsupported');
  assert.equal(resolvePortfolioMovementKind('asset'), 'unsupported');
});

test('17. buildVariableIncomeSalePreview monta prévia de venda total', () => {
  const asset = { assetId: 'asset-petr4', availableQuantity: 100, qty: 100 };
  const preview = buildVariableIncomeSalePreview(asset, { saleType: 'total', unitPrice: 31.9 });
  assert.equal(preview.ok, true);
  assert.equal(preview.movementKind, 'sale');
  assert.equal(preview.isTotal, true);
  assert.equal(preview.assetId, 'asset-petr4');
  assert.equal(preview.quantityAvailable, 100);
  assert.equal(preview.quantityToSell, 100);
  assert.equal(preview.quantityRemaining, 0);
});

test('18. buildVariableIncomeSalePreview monta prévia de venda parcial', () => {
  const asset = { assetId: 'asset-petr4', availableQuantity: 100, qty: 100 };
  const preview = buildVariableIncomeSalePreview(asset, { saleType: 'partial', quantity: 40, unitPrice: 31.9 });
  assert.equal(preview.ok, true);
  assert.equal(preview.isTotal, false);
  assert.equal(preview.quantityToSell, 40);
  assert.equal(preview.quantityRemaining, 60);
});

test('19. buildVariableIncomeSalePreview calcula estimatedGrossValue como quantidade x preço', () => {
  const asset = { assetId: 'asset-petr4', availableQuantity: 100, qty: 100 };
  const total = buildVariableIncomeSalePreview(asset, { saleType: 'total', unitPrice: 31.9 });
  assert.equal(total.estimatedGrossValue, 3190);
  const parcial = buildVariableIncomeSalePreview(asset, { saleType: 'partial', quantity: 40, unitPrice: 31.9 });
  assert.equal(parcial.estimatedGrossValue, 1276);
});

test('20. buildVariableIncomeSalePreview rejeita ativo ou entrada inválidos', () => {
  assert.equal(buildVariableIncomeSalePreview(null, {}).code, MOVEMENT_ERROR_CODES.INVALID_ASSET);
  assert.equal(buildVariableIncomeSalePreview({ assetId: 'a', availableQuantity: 1 }, null).code, MOVEMENT_ERROR_CODES.INVALID_ASSET);
});

test('21. buildVariableIncomeSalePreview rejeita ativo sem assetId ou sem quantidade', () => {
  assert.equal(buildVariableIncomeSalePreview({ availableQuantity: 100 }, { saleType: 'total', unitPrice: 1 }).code, MOVEMENT_ERROR_CODES.INVALID_ASSET);
  assert.equal(buildVariableIncomeSalePreview({ assetId: 'a', availableQuantity: 0 }, { saleType: 'total', unitPrice: 1 }).code, MOVEMENT_ERROR_CODES.INVALID_ASSET);
});

test('22. buildVariableIncomeSalePreview rejeita saleType inválido', () => {
  const asset = { assetId: 'a', availableQuantity: 100 };
  assert.equal(buildVariableIncomeSalePreview(asset, { saleType: 'parcial', quantity: 1, unitPrice: 1 }).code, MOVEMENT_ERROR_CODES.INVALID_SALE_TYPE);
  assert.equal(buildVariableIncomeSalePreview(asset, { quantity: 1, unitPrice: 1 }).code, MOVEMENT_ERROR_CODES.INVALID_SALE_TYPE);
});

test('23. buildVariableIncomeSalePreview rejeita quantidade inválida', () => {
  const asset = { assetId: 'a', availableQuantity: 100 };
  assert.equal(buildVariableIncomeSalePreview(asset, { saleType: 'partial', quantity: 0, unitPrice: 1 }).code, MOVEMENT_ERROR_CODES.INVALID_QUANTITY);
  assert.equal(buildVariableIncomeSalePreview(asset, { saleType: 'partial', quantity: -1, unitPrice: 1 }).code, MOVEMENT_ERROR_CODES.INVALID_QUANTITY);
  assert.equal(buildVariableIncomeSalePreview(asset, { saleType: 'partial', quantity: NaN, unitPrice: 1 }).code, MOVEMENT_ERROR_CODES.INVALID_QUANTITY);
  assert.equal(buildVariableIncomeSalePreview(asset, { saleType: 'partial', unitPrice: 1 }).code, MOVEMENT_ERROR_CODES.INVALID_QUANTITY);
});

test('24. buildVariableIncomeSalePreview rejeita quantidade acima da posição', () => {
  const asset = { assetId: 'a', availableQuantity: 100 };
  const result = buildVariableIncomeSalePreview(asset, { saleType: 'partial', quantity: 101, unitPrice: 1 });
  assert.equal(result.code, MOVEMENT_ERROR_CODES.INSUFFICIENT_QUANTITY);
  assert.equal(result.ok, false);
});

test('25. buildVariableIncomeSalePreview rejeita preço unitário inválido', () => {
  const asset = { assetId: 'a', availableQuantity: 100 };
  assert.equal(buildVariableIncomeSalePreview(asset, { saleType: 'total', unitPrice: 0 }).code, MOVEMENT_ERROR_CODES.INVALID_UNIT_PRICE);
  assert.equal(buildVariableIncomeSalePreview(asset, { saleType: 'total', unitPrice: -1 }).code, MOVEMENT_ERROR_CODES.INVALID_UNIT_PRICE);
  assert.equal(buildVariableIncomeSalePreview(asset, { saleType: 'total' }).code, MOVEMENT_ERROR_CODES.INVALID_UNIT_PRICE);
});

test('26. buildVariableIncomeSalePreview tolera diferença até EPSILON na quantidade', () => {
  const asset = { assetId: 'a', availableQuantity: 100 };
  const preview = buildVariableIncomeSalePreview(asset, { saleType: 'partial', quantity: 100 + 1e-10, unitPrice: 2 });
  assert.equal(preview.ok, true);
  assert.equal(preview.quantityToSell, 100.0000000001);
  assert.equal(preview.quantityRemaining, 0);
});

test('27. buildFixedIncomeRedemptionPreview monta prévia de resgate total', () => {
  const asset = { assetId: 'rf-cdb26', appliedBalance: 1000 };
  const preview = buildFixedIncomeRedemptionPreview(asset, { redemptionType: 'total', amount: 500 });
  assert.equal(preview.ok, true);
  assert.equal(preview.movementKind, 'redemption');
  assert.equal(preview.isTotal, true);
  assert.equal(preview.assetId, 'rf-cdb26');
  assert.equal(preview.balanceAvailable, 1000);
  assert.equal(preview.amountToRedeem, 1000);
  assert.equal(preview.balanceRemaining, 0);
});

test('28. buildFixedIncomeRedemptionPreview monta prévia de resgate parcial', () => {
  const asset = { assetId: 'rf-cdb26', appliedBalance: 1000 };
  const preview = buildFixedIncomeRedemptionPreview(asset, { redemptionType: 'partial', amount: 300 });
  assert.equal(preview.ok, true);
  assert.equal(preview.isTotal, false);
  assert.equal(preview.amountToRedeem, 300);
  assert.equal(preview.balanceRemaining, 700);
});

test('29. buildFixedIncomeRedemptionPreview sinaliza requiresOfficialValidation', () => {
  const asset = { assetId: 'rf-cdb26', appliedBalance: 1000 };
  const preview = buildFixedIncomeRedemptionPreview(asset, { redemptionType: 'total', amount: 1000 });
  assert.equal(preview.requiresOfficialValidation, true);
});

test('30. buildFixedIncomeRedemptionPreview rejeita título ou entrada inválidos', () => {
  assert.equal(buildFixedIncomeRedemptionPreview(null, {}).code, MOVEMENT_ERROR_CODES.INVALID_ASSET);
  assert.equal(buildFixedIncomeRedemptionPreview({ assetId: 'a', appliedBalance: 1 }, null).code, MOVEMENT_ERROR_CODES.INVALID_ASSET);
});

test('31. buildFixedIncomeRedemptionPreview rejeita título sem assetId ou sem saldo', () => {
  assert.equal(buildFixedIncomeRedemptionPreview({ appliedBalance: 100 }, { redemptionType: 'total' }).code, MOVEMENT_ERROR_CODES.INVALID_ASSET);
  assert.equal(buildFixedIncomeRedemptionPreview({ assetId: 'a', appliedBalance: 0 }, { redemptionType: 'total' }).code, MOVEMENT_ERROR_CODES.INVALID_ASSET);
});

test('32. buildFixedIncomeRedemptionPreview rejeita redemptionType inválido', () => {
  const asset = { assetId: 'a', appliedBalance: 1000 };
  assert.equal(buildFixedIncomeRedemptionPreview(asset, { redemptionType: 'parcial', amount: 1 }).code, MOVEMENT_ERROR_CODES.INVALID_REDEMPTION_TYPE);
  assert.equal(buildFixedIncomeRedemptionPreview(asset, { amount: 1 }).code, MOVEMENT_ERROR_CODES.INVALID_REDEMPTION_TYPE);
});

test('33. buildFixedIncomeRedemptionPreview rejeita valor inválido', () => {
  const asset = { assetId: 'a', appliedBalance: 1000 };
  assert.equal(buildFixedIncomeRedemptionPreview(asset, { redemptionType: 'partial', amount: 0 }).code, MOVEMENT_ERROR_CODES.INVALID_AMOUNT);
  assert.equal(buildFixedIncomeRedemptionPreview(asset, { redemptionType: 'partial', amount: -1 }).code, MOVEMENT_ERROR_CODES.INVALID_AMOUNT);
  assert.equal(buildFixedIncomeRedemptionPreview(asset, { redemptionType: 'partial', amount: NaN }).code, MOVEMENT_ERROR_CODES.INVALID_AMOUNT);
  assert.equal(buildFixedIncomeRedemptionPreview(asset, { redemptionType: 'partial' }).code, MOVEMENT_ERROR_CODES.INVALID_AMOUNT);
});

test('34. buildFixedIncomeRedemptionPreview rejeita valor acima do saldo', () => {
  const asset = { assetId: 'a', appliedBalance: 1000 };
  const result = buildFixedIncomeRedemptionPreview(asset, { redemptionType: 'partial', amount: 1000.01 });
  assert.equal(result.code, MOVEMENT_ERROR_CODES.INSUFFICIENT_BALANCE);
  assert.equal(result.ok, false);
});

test('35. buildFixedIncomeRedemptionPreview tolera diferença até EPSILON no valor', () => {
  const asset = { assetId: 'a', appliedBalance: 1000 };
  const preview = buildFixedIncomeRedemptionPreview(asset, { redemptionType: 'partial', amount: 1000 + 1e-10 });
  assert.equal(preview.ok, true);
  assert.equal(preview.amountToRedeem, 1000.0000000001);
  assert.equal(preview.balanceRemaining, 0);
});

test('36. findPortfolioMovementAsset encontra por assetId exato com trim', () => {
  const list = [
    { assetId: 'asset-petr4', ticker: 'PETR4' },
    { assetId: 'rf-cdb26', ticker: 'CDB26' },
  ];
  const found = findPortfolioMovementAsset(list, ' asset-petr4 ');
  assert.equal(found.assetId, 'asset-petr4');
  assert.equal(found.ticker, 'PETR4');
});

test('37. findPortfolioMovementAsset não encontra por ticker nem por assetId vazio', () => {
  const list = [{ assetId: 'asset-petr4', ticker: 'PETR4' }];
  assert.equal(findPortfolioMovementAsset(list, 'PETR4'), null);
  assert.equal(findPortfolioMovementAsset(list, ''), null);
  assert.equal(findPortfolioMovementAsset(list, null), null);
  assert.equal(findPortfolioMovementAsset(null, 'asset-petr4'), null);
});

test('38. findPortfolioMovementAsset distingue ativos com tickers semelhantes e IDs distintos', () => {
  const list = [
    { assetId: 'a1', ticker: 'ABEV3' },
    { assetId: 'a2', ticker: 'ABEV4' },
  ];
  const found = findPortfolioMovementAsset(list, 'a2');
  assert.equal(found.assetId, 'a2');
  assert.equal(found.ticker, 'ABEV4');
  assert.equal(findPortfolioMovementAsset(list, 'a1').ticker, 'ABEV3');
});

test('39. listas vazias ou nulas retornam array congelado vazio', () => {
  const sellable = buildSellableAssets(null);
  const redeemable = buildRedeemableAssets(null, makeRedeemableHelpers());
  assert.deepStrictEqual(sellable, []);
  assert.deepStrictEqual(redeemable, []);
  assert.deepStrictEqual(buildSellableAssets(undefined), []);
  assert.deepStrictEqual(buildRedeemableAssets([], null), []);
  assert.ok(Object.isFrozen(sellable));
  assert.ok(Object.isFrozen(redeemable));
});

test('40. resultados da prévia e itens das listas são congelados', () => {
  const sellable = buildSellableAssets([makeEquityAsset()]);
  assert.ok(Object.isFrozen(sellable));
  assert.ok(Object.isFrozen(sellable[0]));

  const redeemable = buildRedeemableAssets([makeRfAsset()], makeRedeemableHelpers());
  assert.ok(Object.isFrozen(redeemable[0]));

  const salePreview = buildVariableIncomeSalePreview(
    { assetId: 'asset-petr4', availableQuantity: 100 },
    { saleType: 'partial', quantity: 10, unitPrice: 31.9 },
  );
  assert.ok(Object.isFrozen(salePreview));

  const redemptionPreview = buildFixedIncomeRedemptionPreview(
    { assetId: 'rf-cdb26', appliedBalance: 1000 },
    { redemptionType: 'partial', amount: 100 },
  );
  assert.ok(Object.isFrozen(redemptionPreview));

  const found = findPortfolioMovementAsset([{ assetId: 'asset-petr4', ticker: 'PETR4' }], 'asset-petr4');
  assert.ok(Object.isFrozen(found));
});

test('41. buildVariableIncomeSalePreview e redemption aceitam coerção numérica de strings', () => {
  const asset = { assetId: 'asset-petr4', availableQuantity: 100, qty: 100 };
  const salePreview = buildVariableIncomeSalePreview(asset, { saleType: 'partial', quantity: '10,5', unitPrice: '31,90' });
  assert.equal(salePreview.quantityToSell, 10.5);
  assert.equal(salePreview.unitPrice, 31.9);
  assert.equal(salePreview.estimatedGrossValue, 334.95);

  const rfAsset = { assetId: 'rf-cdb26', appliedBalance: 1000 };
  const redemptionPreview = buildFixedIncomeRedemptionPreview(rfAsset, { redemptionType: 'partial', amount: '300,00' });
  assert.equal(redemptionPreview.amountToRedeem, 300);
});

test('42. módulo expõe as seis funções e não instala global em ambiente de teste', () => {
  assert.equal(typeof buildSellableAssets, 'function');
  assert.equal(typeof buildRedeemableAssets, 'function');
  assert.equal(typeof resolvePortfolioMovementKind, 'function');
  assert.equal(typeof buildVariableIncomeSalePreview, 'function');
  assert.equal(typeof buildFixedIncomeRedemptionPreview, 'function');
  assert.equal(typeof findPortfolioMovementAsset, 'function');
  assert.equal(typeof contract.default, 'object');
  assert.equal(contract.default.buildSellableAssets, buildSellableAssets);
  assert.equal(contract.default.buildRedeemableAssets, buildRedeemableAssets);
  assert.equal(contract.default.resolvePortfolioMovementKind, resolvePortfolioMovementKind);
  assert.equal(typeof globalThis.PortfolioMovementContract, 'undefined');
});

test('43. MOVEMENT_ERROR_CODES é congelado com os oito códigos estáveis', () => {
  assert.ok(Object.isFrozen(MOVEMENT_ERROR_CODES));
  assert.deepStrictEqual(Object.keys(MOVEMENT_ERROR_CODES).sort(), [
    'INSUFFICIENT_BALANCE',
    'INSUFFICIENT_QUANTITY',
    'INVALID_AMOUNT',
    'INVALID_ASSET',
    'INVALID_QUANTITY',
    'INVALID_REDEMPTION_TYPE',
    'INVALID_SALE_TYPE',
    'INVALID_UNIT_PRICE',
  ]);
  assert.equal(MOVEMENT_ERROR_CODES.INVALID_ASSET, 'INVALID_ASSET');
});

test('44. buildSellableAssets não aceita rf_asset_id como identidade de renda variável', () => {
  const assets = [
    { rf_asset_id: 'rf-legacy-001', ticker: 'PETR4', type: 'Ação', qty: 10, current_price: 30 },
    { id: 'real-id', ticker: 'VALE3', type: 'Ação', qty: 5, current_price: 60 },
  ];
  const list = buildSellableAssets(assets);
  assert.deepStrictEqual(list.map((item) => item.assetId), ['real-id']);
});

test('45. buildSellableAssets exclui ativo com ticker e quantidade sem ID real', () => {
  const assets = [
    { ticker: 'PETR4', type: 'Ação', qty: 10, current_price: 30 },
    { ticker: 'VALE3', type: 'Ação', qty: 5, current_price: 60, assetId: 'vale-real' },
  ];
  const list = buildSellableAssets(assets);
  assert.deepStrictEqual(list.map((item) => item.assetId), ['vale-real']);
});

test('46. buildSellableAssets mantém distintos ativos com ticker igual e IDs diferentes', () => {
  const assets = [
    { id: 'a1', ticker: 'TAEE11', type: 'FII', qty: 10, current_price: 10 },
    { id: 'a2', ticker: 'TAEE11', type: 'FII', qty: 20, current_price: 10 },
  ];
  const list = buildSellableAssets(assets);
  assert.equal(list.length, 2);
  assert.deepStrictEqual(list.map((item) => item.assetId).sort(), ['a1', 'a2']);
  assert.deepStrictEqual(list.map((item) => item.availableQuantity).sort(), [10, 20]);
});

test('47. buildSellableAssets não muta o array de entrada nem os ativos', () => {
  const asset = { id: 'a', ticker: 'PETR4', type: 'Ação', sector: 'Petróleo', qty: 10, avg_price: 20, current_price: 30, meta: { origem: 'manual' } };
  const assets = [asset];
  const assetsBefore = structuredClone(assets);
  const assetBefore = structuredClone(asset);
  const list = buildSellableAssets(assets);
  assert.deepStrictEqual(assets, assetsBefore);
  assert.deepStrictEqual(asset, assetBefore);
  assert.deepStrictEqual(asset.meta, { origem: 'manual' });

  const originalTicker = list[0].ticker;
  try { list[0].ticker = 'ALTERADO'; } catch (_) { /* sloppy: ignorado; strict: esperado */ }
  try { list.push({ assetId: 'fake' }); } catch (_) { /* sloppy: ignorado; strict: esperado */ }
  assert.equal(list[0].ticker, originalTicker);
  assert.equal(list.length, 1);
});

test('48. buildRedeemableAssets não muta ativos nem helpers', () => {
  const asset = makeRfAsset();
  const assets = [asset];
  const assetsBefore = structuredClone(assets);
  const helpers = makeRedeemableHelpers();
  const helperKeysBefore = Object.keys(helpers).sort();
  const helperRefsBefore = Object.fromEntries(Object.entries(helpers).map(([k, v]) => [k, v]));
  const list = buildRedeemableAssets(assets, helpers);
  assert.deepStrictEqual(assets, assetsBefore);
  assert.deepStrictEqual(Object.keys(helpers).sort(), helperKeysBefore);
  for (const [k, v] of Object.entries(helpers)) {
    assert.equal(v, helperRefsBefore[k], `helper ${k} não deve ser trocado`);
  }

  const originalTicker = list[0].ticker;
  try { list[0].ticker = 'ALTERADO'; } catch (_) { /* sloppy: ignorado; strict: esperado */ }
  try { list.push({ assetId: 'fake' }); } catch (_) { /* sloppy: ignorado; strict: esperado */ }
  assert.equal(list[0].ticker, originalTicker);
  assert.equal(list.length, 1);
});

test('49. buildVariableIncomeSalePreview não muta asset nem input', () => {
  const asset = { assetId: 'asset-petr4', availableQuantity: 100, qty: 100, extra: { flag: true } };
  const input = { saleType: 'partial', quantity: 40, unitPrice: 31.9 };
  const assetBefore = structuredClone(asset);
  const inputBefore = structuredClone(input);
  const preview = buildVariableIncomeSalePreview(asset, input);
  assert.deepStrictEqual(asset, assetBefore);
  assert.deepStrictEqual(input, inputBefore);
  assert.deepStrictEqual(asset.extra, { flag: true });

  const originalQty = preview.quantityToSell;
  preview.quantityToSell = -999;
  assert.equal(preview.quantityToSell, originalQty);
});

test('50. buildFixedIncomeRedemptionPreview não muta asset nem input', () => {
  const asset = { assetId: 'rf-cdb26', appliedBalance: 1000, meta: { n: 1 } };
  const input = { redemptionType: 'partial', amount: 300 };
  const assetBefore = structuredClone(asset);
  const inputBefore = structuredClone(input);
  const preview = buildFixedIncomeRedemptionPreview(asset, input);
  assert.deepStrictEqual(asset, assetBefore);
  assert.deepStrictEqual(input, inputBefore);

  const originalAmount = preview.amountToRedeem;
  preview.amountToRedeem = -999;
  assert.equal(preview.amountToRedeem, originalAmount);
});

test('51. buildRedeemableAssets omite ativo quando isFixedIncomeAsset lança', () => {
  const helpers = makeRedeemableHelpers({
    isFixedIncomeAsset: () => { throw new Error('classificação indisponível'); },
  });
  const list = buildRedeemableAssets([makeRfAsset()], helpers);
  assert.deepStrictEqual(list, []);
});

test('52. buildRedeemableAssets omite ativo quando identidade ou saldo lançam', () => {
  const noIdHelpers = makeRedeemableHelpers({
    getEventAssetId: () => { throw new Error('identidade indisponível'); },
  });
  assert.deepStrictEqual(buildRedeemableAssets([makeRfAsset()], noIdHelpers), []);

  const noBalanceHelpers = makeRedeemableHelpers({
    getPrincipalBalance: () => { throw new Error('saldo indisponível'); },
  });
  assert.deepStrictEqual(buildRedeemableAssets([makeRfAsset()], noBalanceHelpers), []);
});

test('53. buildRedeemableAssets mantém ativo com bruto/líquido zero se getOfficialValues lança', () => {
  const helpers = makeRedeemableHelpers({
    getOfficialValues: () => { throw new Error('valores indisponíveis'); },
  });
  const list = buildRedeemableAssets([makeRfAsset()], helpers);
  assert.equal(list.length, 1);
  assert.equal(list[0].assetId, 'rf-cdb26');
  assert.equal(list[0].grossValue, 0);
  assert.equal(list[0].liquidValue, 0);
  assert.equal(list[0].appliedBalance, 1000);
});

test('54. buildRedeemableAssets mantém ticker vazio se getEventTicker lança e processa demais ativos', () => {
  const noTickerHelpers = makeRedeemableHelpers({
    getEventTicker: () => { throw new Error('ticker indisponível'); },
  });
  const list = buildRedeemableAssets([makeRfAsset()], noTickerHelpers);
  assert.equal(list.length, 1);
  assert.equal(list[0].assetId, 'rf-cdb26');
  assert.equal(list[0].ticker, '');
  assert.equal(list[0].appliedBalance, 1000);

  const helpers = makeRedeemableHelpers({
    getEventAssetId: (asset) => {
      if (asset.id === 'rf-broken') throw new Error('identidade indisponível');
      return asset.id;
    },
  });
  const assets = [makeRfAsset({ id: 'rf-broken' }), makeRfAsset({ id: 'rf-ok' })];
  const mixedList = buildRedeemableAssets(assets, helpers);
  assert.deepStrictEqual(mixedList.map((item) => item.assetId), ['rf-ok']);
});

test('55. toFiniteNumber aceita formatos numéricos simples', () => {
  const asset = { assetId: 'a', availableQuantity: 100, qty: 100 };
  const base = { saleType: 'partial' };
  assert.equal(buildVariableIncomeSalePreview(asset, { ...base, quantity: '10', unitPrice: '10' }).estimatedGrossValue, 100);
  assert.equal(buildVariableIncomeSalePreview(asset, { ...base, quantity: '10,5', unitPrice: '10.5' }).estimatedGrossValue, 110.25);

  const rf = { assetId: 'rf', appliedBalance: 1000 };
  assert.equal(buildFixedIncomeRedemptionPreview(rf, { redemptionType: 'partial', amount: '10.5' }).amountToRedeem, 10.5);
  assert.equal(buildFixedIncomeRedemptionPreview(rf, { redemptionType: 'partial', amount: '10,5' }).amountToRedeem, 10.5);
});

test('56. toFiniteNumber rejeita formatos monetários ambíguos', () => {
  const asset = { assetId: 'a', availableQuantity: 100, qty: 100 };
  const base = { saleType: 'partial', quantity: 10 };
  for (const bad of ['1.234,56', '1,234.56', '1.234.567', '1,2,3']) {
    const result = buildVariableIncomeSalePreview(asset, { ...base, unitPrice: bad });
    assert.equal(result.code, MOVEMENT_ERROR_CODES.INVALID_UNIT_PRICE, `unitPrice "${bad}" deve ser rejeitado`);
  }

  const rf = { assetId: 'rf', appliedBalance: 1000 };
  for (const bad of ['1.234,56', '1,234.56', '1.234.567', '1,2,3']) {
    const result = buildFixedIncomeRedemptionPreview(rf, { redemptionType: 'partial', amount: bad });
    assert.equal(result.code, MOVEMENT_ERROR_CODES.INVALID_AMOUNT, `amount "${bad}" deve ser rejeitado`);
  }
});

test('57. tipo desconhecido entra como sale provisoriamente (decisão da UI a definir)', () => {
  // Decisão provisória desta entrega: tipos fora de Ação/FII/ETF/RF/Tesouro/Reserva
  // não são bloqueados por buildSellableAssets. Isso NÃO é autorização para vender
  // qualquer classe futura; a classificação oficial será restrita na integração da UI.
  const assets = [
    { id: 'crypto-btc', ticker: 'BTC', type: 'Cripto', qty: 0.5, current_price: 100000 },
    { id: 'bdr-aapl', ticker: 'AAPL34', type: 'BDR', qty: 5, current_price: 60 },
  ];
  const list = buildSellableAssets(assets);
  assert.equal(list.length, 2);
  assert.deepStrictEqual(list.map((item) => item.movementKind), ['sale', 'sale']);
  assert.deepStrictEqual(list.map((item) => item.type), ['BDR', 'Cripto']);
});
