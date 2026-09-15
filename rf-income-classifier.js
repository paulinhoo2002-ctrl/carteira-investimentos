'use strict';

const PASSIVE_INCOME_CATEGORIES = Object.freeze([
  'EQUITY_DIVIDEND',
  'JCP',
  'FII_RENDA',
  'RF_INTEREST',
  'RF_COUPON',
  'OTHER_SUPPORTED_INCOME',
]);

const RESULT_BY_TYPE = Object.freeze({
  RF_INTEREST: 'PASSIVE_INCOME_CANDIDATE',
  RF_COUPON: 'PASSIVE_INCOME_CANDIDATE',
  RF_INCOME: 'PASSIVE_INCOME_CANDIDATE',
  RF_AMORTIZATION: 'REVIEW_REQUIRED',
  RF_REDEMPTION: 'NOT_AUTO_INCOME',
  RF_MATURITY: 'NOT_AUTO_INCOME',
  RF_APPLICATION: 'NOT_INCOME',
  RF_TRANSFER: 'NOT_INCOME',
  RF_UNKNOWN: 'NEVER_AUTO_CLASSIFY',
});

function textOf(event) {
  if (typeof event === 'string') return event;
  const source = event && typeof event === 'object' ? event : {};
  return [
    source.eventType,
    source.type,
    source.kind,
    source.nature,
    source.description,
    source.product,
    source.assetType,
    source.category,
  ].filter(Boolean).join(' ');
}

function normalized(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function hasFixedIncomeEvidence(event) {
  if (event === true) return true;
  if (event && typeof event === 'object' && event.isFixedIncome === true) return true;
  const value = normalized(textOf(event));
  return /RENDA FIXA|\bCDB\b|\bCRA\b|\bCRI\b|\bLCI\b|\bLCA\b|\bDEBENT|\bTESOURO\b|\bCUPOM\b/.test(value);
}

function classifyRfIncomeEvent(event) {
  const raw = normalized(textOf(event));
  const supported = hasFixedIncomeEvidence(event);
  let type = 'RF_UNKNOWN';
  if (supported && /RESGATE|RESGATADO/.test(raw)) type = 'RF_REDEMPTION';
  else if (supported && /VENCIMENTO|MATURIDADE|MATUROU/.test(raw)) type = 'RF_MATURITY';
  else if (supported && /AMORTIZAC/.test(raw)) type = 'RF_AMORTIZATION';
  else if (supported && /TRANSFER|TRANSFERENCIA/.test(raw)) type = 'RF_TRANSFER';
  else if (supported && /APLICAC|APORTE|SUBSCRIC|COMPRA/.test(raw)) type = 'RF_APPLICATION';
  else if (supported && /CUPOM/.test(raw)) type = 'RF_COUPON';
  else if (supported && /JUROS/.test(raw)) type = 'RF_INTEREST';
  else if (supported && /RENDIMENTO|RENDA/.test(raw)) type = 'RF_INCOME';

  return Object.freeze({
    type,
    decision: RESULT_BY_TYPE[type],
    passiveIncomeCandidate: RESULT_BY_TYPE[type] === 'PASSIVE_INCOME_CANDIDATE',
    confidence: type === 'RF_UNKNOWN' ? 'UNKNOWN' : 'EXPLICIT',
    source: 'READ_ONLY_B3_EVENT_CLASSIFICATION',
  });
}

function passiveIncomeCategory(event) {
  const result = classifyRfIncomeEvent(event);
  if (result.type === 'RF_INTEREST' || result.type === 'RF_COUPON') return result.type;
  if (result.type === 'RF_INCOME') return 'OTHER_SUPPORTED_INCOME';
  return null;
}

function buildReadOnlyPassiveIncomeBucket(event) {
  const classification = classifyRfIncomeEvent(event);
  const category = passiveIncomeCategory(event);
  return Object.freeze({
    category,
    amount: 0,
    included: false,
    classification,
    reason: 'READ_ONLY_PREPARATION_NO_CURRENT_DIVIDENDS_AGGREGATION',
  });
}

module.exports = {
  PASSIVE_INCOME_CATEGORIES,
  classifyRfIncomeEvent,
  passiveIncomeCategory,
  buildReadOnlyPassiveIncomeBucket,
};
