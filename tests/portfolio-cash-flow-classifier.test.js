const test = require('node:test');
const assert = require('node:assert/strict');
const Classifier = require('../portfolio-cash-flow-classifier.js');

const trustedContext = { walletId: 'wallet-a', sourceSystem: 'V76_MANUAL' };
const explicitContribution = {
  id: 'flow-1', walletId: 'wallet-a', date: '2026-01-10', type: 'CONTRIBUTION', amountCents: 12500,
  currency: 'BRL', source: 'MANUAL', sourceId: 'manual-1', confidence: 'DETERMINISTIC'
};

test('classifies explicit wallet-scoped manual contribution with separated signs and provenance', () => {
  const result = Classifier.classifyEvent(explicitContribution, trustedContext);
  assert.equal(result.classification, 'EXTERNAL_CONTRIBUTION');
  assert.equal(result.confidence, 'HIGH');
  assert.equal(result.isExternalFlow, true);
  assert.equal(result.amount, 125);
  assert.equal(result.portfolioSignedAmount, 125);
  assert.equal(result.investorSignedAmount, -125);
  assert.equal(result.provenance.sourceSystem, 'V76_MANUAL');
  assert.equal(result.provenance.sourceId, 'manual-1');
});

test('does not trust globally stored V76 flow without wallet identity', () => {
  const result = Classifier.classifyEvent({ ...explicitContribution, walletId: undefined }, { sourceSystem: 'V76_MANUAL' });
  assert.equal(result.classification, 'AMBIGUOUS');
  assert.equal(result.isExternalFlow, false);
  assert.ok(result.warnings.includes('WALLET_SCOPE_MISSING'));
});

test('maps trades and income to non-external categories', () => {
  for (const [type, expected] of [
    ['BUY', 'INTERNAL_BUY'], ['SELL', 'INTERNAL_SELL'],
    ['DIVIDEND', 'INCOME_DIVIDEND'], ['JCP', 'INCOME_JCP'],
    ['INTEREST', 'INCOME_INTEREST'], ['AMORTIZATION', 'INCOME_AMORTIZATION'],
    ['FEE', 'FEE'], ['TAX', 'TAX']
  ]) {
    const result = Classifier.classifyEvent({ ...explicitContribution, type }, trustedContext);
    assert.equal(result.classification, expected, type);
    assert.equal(result.isExternalFlow, false, type);
  }
});

test('generic and conflicting transfers remain ambiguous', () => {
  const generic = Classifier.classifyEvent({ ...explicitContribution, type: 'TRANSFER' }, trustedContext);
  const conflict = Classifier.classifyEvent({ ...explicitContribution, type: 'CONTRIBUTION', direction: 'OUT' }, trustedContext);
  assert.equal(generic.classification, 'AMBIGUOUS');
  assert.equal(conflict.classification, 'AMBIGUOUS');
  assert.equal(conflict.isExternalFlow, false);
});

test('external transfer direction maps to contribution or withdrawal, but imported candidates remain ambiguous', () => {
  const incoming = Classifier.classifyEvent({ ...explicitContribution, type: 'TRANSFER_IN_EXTERNAL' }, trustedContext);
  const outgoing = Classifier.classifyEvent({ ...explicitContribution, type: 'TRANSFER_OUT_EXTERNAL' }, trustedContext);
  const imported = Classifier.classifyEvent({ ...explicitContribution, source: 'IMPORT' }, trustedContext);
  assert.equal(incoming.classification, 'EXTERNAL_CONTRIBUTION');
  assert.equal(incoming.portfolioSignedAmount, 125);
  assert.equal(outgoing.classification, 'EXTERNAL_WITHDRAWAL');
  assert.equal(outgoing.portfolioSignedAmount, -125);
  assert.equal(imported.classification, 'AMBIGUOUS');
  assert.equal(imported.isExternalFlow, false);
});

test('rejects impossible and non-canonical dates without coercion', () => {
  for (const date of ['2026-02-30', '10/01/2026', '2026-1-10', '']) {
    const result = Classifier.classifyEvent({ ...explicitContribution, date }, trustedContext);
    assert.equal(result.classification, 'UNKNOWN', date);
    assert.ok(result.warnings.includes('INVALID_DATE'), date);
  }
});

test('unknown amount, missing provenance and unrecognized types fail closed', () => {
  const missingAmount = Classifier.classifyEvent({ ...explicitContribution, amountCents: null }, trustedContext);
  const missingIdentity = Classifier.classifyEvent({ ...explicitContribution, id: null, eventId: null, sourceId: null }, trustedContext);
  const unknown = Classifier.classifyEvent({ ...explicitContribution, type: 'MYSTERY' }, trustedContext);
  assert.equal(missingAmount.classification, 'UNKNOWN');
  assert.equal(missingIdentity.classification, 'AMBIGUOUS');
  assert.equal(unknown.classification, 'UNKNOWN');
});

test('classifies output deterministically and keeps source identity separate', () => {
  const first = Classifier.classifyEvent(explicitContribution, trustedContext);
  const second = Classifier.classifyEvent(explicitContribution, trustedContext);
  assert.deepEqual(first, second);
  assert.equal(first.eventId, 'flow-1');
  assert.equal(first.sourceIdentity, 'MANUAL:manual-1');
  assert.notEqual(first.classificationIdentity, first.sourceIdentity);
});

test('readiness ignores ambiguous and wrong-wallet flows', () => {
  const assessment = Classifier.assessCashFlowReadiness([
    Classifier.classifyEvent(explicitContribution, { walletId: 'wallet-b', sourceSystem: 'V76_MANUAL' }),
    Classifier.classifyEvent({ ...explicitContribution, type: 'TRANSFER' }, trustedContext)
  ], 'wallet-a');
  assert.equal(assessment.state, 'PARTIAL');
  assert.equal(assessment.trustedExternalFlows.length, 0);
  assert.ok(assessment.ambiguousEvents >= 1);
});

test('readiness flags repeated source identity instead of counting duplicate external evidence twice', () => {
  const event = Classifier.classifyEvent({ id: 'row-1', sourceId: 'same-source', source: 'MANUAL', walletId: 'wallet-a', date: '2026-09-15', type: 'CONTRIBUTION', amountCents: 100 }, { walletId: 'wallet-a' });
  const duplicate = { ...event, eventId: 'row-2', classificationIdentity: 'CASH_FLOW_CLASSIFICATION_V1:row-2:EXTERNAL_CONTRIBUTION' };
  const readiness = Classifier.assessCashFlowReadiness([event, duplicate], 'wallet-a');
  assert.equal(readiness.externalFlowCount, 0);
  assert.equal(readiness.duplicateIdentityCount, 1);
  assert.equal(readiness.state, 'PARTIAL');
});
