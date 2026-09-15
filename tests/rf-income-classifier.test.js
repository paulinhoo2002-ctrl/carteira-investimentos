const assert = require('node:assert/strict');
const test = require('node:test');
const {
  PASSIVE_INCOME_CATEGORIES,
  classifyRfIncomeEvent,
  passiveIncomeCategory,
  buildReadOnlyPassiveIncomeBucket,
} = require('../rf-income-classifier');

test('classifica juros e cupom RF como candidatos de renda passiva', () => {
  assert.deepEqual(classifyRfIncomeEvent({ isFixedIncome: true, eventType: 'Juros' }).type, 'RF_INTEREST');
  assert.equal(classifyRfIncomeEvent({ product: 'CDB Banco', eventType: 'Cupom' }).decision, 'PASSIVE_INCOME_CANDIDATE');
  assert.equal(passiveIncomeCategory({ product: 'CRA', eventType: 'Rendimento' }), 'OTHER_SUPPORTED_INCOME');
});

test('não promove principal, resgate, vencimento ou transferência a renda', () => {
  for (const [eventType, decision] of [
    ['Amortização', 'REVIEW_REQUIRED'],
    ['Resgate', 'NOT_AUTO_INCOME'],
    ['Vencimento', 'NOT_AUTO_INCOME'],
    ['Aplicação', 'NOT_INCOME'],
    ['Transferência', 'NOT_INCOME'],
  ]) assert.equal(classifyRfIncomeEvent({ isFixedIncome: true, eventType }).decision, decision);
  assert.equal(classifyRfIncomeEvent({ eventType: 'Rendimento' }).type, 'RF_UNKNOWN');
});

test('prepara categorias canônicas sem agregar ou contar valores', () => {
  assert.deepEqual(PASSIVE_INCOME_CATEGORIES, [
    'EQUITY_DIVIDEND', 'JCP', 'FII_RENDA', 'RF_INTEREST', 'RF_COUPON', 'OTHER_SUPPORTED_INCOME',
  ]);
  const bucket = buildReadOnlyPassiveIncomeBucket({ product: 'CDB', eventType: 'Juros', value: 100 });
  assert.equal(bucket.included, false);
  assert.equal(bucket.amount, 0);
  assert.equal(bucket.category, 'RF_INTEREST');
});
