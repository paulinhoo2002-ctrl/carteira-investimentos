const test = require('node:test');
const assert = require('node:assert/strict');
const Brokerage = require('../brokerage-professional.js');

function note(overrides = {}) {
  return Brokerage.normalizeNote({
    broker: 'Inter', noteNumber: 'N-10', tradeDate: '31/01/2025', settlementDate: '03/02/2025',
    grossTotal: 'R$ 100,00', feesTotal: 'R$ 1,00', taxesTotal: 'R$ 0,00', netTotal: 'R$ 101,00',
    operations: [{ ticker: 'ABCD3', buySell: 'Compra', quantity: '10', unitPrice: '10,00', grossValue: '100,00', market: 'À vista' }], ...overrides
  });
}

test('normalizes a canonical Inter note and operation identity', () => {
  const result = note();
  assert.equal(result.BROKER, 'Inter');
  assert.equal(result.NOTE_NUMBER, 'N-10');
  assert.equal(result.TRADE_DATE, '2025-01-31');
  assert.equal(result.OPERATIONS[0].identity, 'ticker:ABCD3');
  assert.ok(result.CONTENT_FINGERPRINT);
});

test('note idempotency distinguishes exact duplicate from changed content', () => {
  const first = note();
  assert.equal(Brokerage.classifyNoteDuplicate(first, []).toString(), 'NEW_NOTE');
  assert.equal(Brokerage.classifyNoteDuplicate(first, [first]), 'EXACT_DUPLICATE_NOTE');
  const changed = note({ operations: [{ ticker: 'ABCD3', buySell: 'Compra', quantity: '11', unitPrice: '10,00', grossValue: '110,00' }] });
  assert.equal(Brokerage.classifyNoteDuplicate(changed, [first]), 'CONFLICTING_NOTE');
});

test('operation duplication is deterministic and never double counts', () => {
  const operations = note().OPERATIONS;
  const result = Brokerage.operationDuplicates([...operations, ...operations]);
  assert.equal(result.duplicateCount, 1);
  assert.equal(result.doubleCount, 0);
});

test('fees remain at note level and are never allocated per operation', () => {
  const result = Brokerage.auditFees(note());
  assert.equal(result.status, 'NOTE_LEVEL_SUPPORTED');
  assert.equal(result.perOperationAllocation, false);
  assert.equal(result.inventedFeeAllocation, 0);
});

test('financial cross-check reports match, missing component and conflict explicitly', () => {
  assert.equal(Brokerage.crossCheckNoteFinancials(note()).status, 'MATCH');
  assert.equal(Brokerage.crossCheckNoteFinancials(note({ grossTotal: 'R$ 99,00' })).status, 'VALUE_CONFLICT');
  assert.equal(Brokerage.crossCheckNoteFinancials(note({ netTotal: '' })).status, 'MISSING_COMPONENT');
});

test('position protection keeps B3 and app from auto-overwriting current state', () => {
  const result = Brokerage.positionProtection();
  assert.equal(result.B3_POSITION_AUTO_OVERWRITE, false);
  assert.equal(result.APP_POSITION_AUTO_OVERWRITE, false);
  assert.equal(result.AVG_PRICE_AUTO_RECALC, false);
});

test('professional position reconciliation and identity review are read-only', () => {
  const result = Brokerage.reconcilePositionProfessional({ expected: [['ticker:ABCD3', 10]], b3: [{ ticker: 'ABCD3', qty: 9 }], app: [{ ticker: 'ABCD3', qty: 10 }] });
  assert.equal(result.summary.TOTAL_ASSETS, 1);
  assert.equal(result.rows[0].status, 'HISTORY_APP_MATCH_B3_DIFFERS');
  assert.equal(result.writeEnabled, false);
  assert.equal(Brokerage.historicalIdentityReview({ oldIdentity: 'ticker:ABC3', newIdentity: 'ticker:ABCD3' }).autoMerge, false);
});

test('economic event graph links sources without persistence', () => {
  const result = Brokerage.eventGraph({ notes: [{ date: '2025-01-01', ticker: 'ABCD3', qty: 10, price: 10, value: 100, movement: 'Compra' }], movements: [{ date: '2025-01-01', ticker: 'ABCD3', qty: 10, price: 10, value: 100, movement: 'Compra' }] });
  assert.equal(result.sameEconomicEventCountedOnce, true);
  assert.equal(result.persistent, false);
});

test('severity, summary, readiness, rollback and export contracts are explicit', () => {
  assert.equal(Brokerage.severity({ type: 'NOTE_IDENTITY_CONTENT' }), 'CRITICAL');
  assert.equal(Brokerage.severity({ type: 'QUANTITY_MISMATCH' }), 'HIGH');
  assert.equal(Brokerage.professionalSummary({ criticalConflicts: 1 }).WHAT_WILL_CHANGE, 0);
  assert.equal(Brokerage.readinessMatrix().writeEnabled, false);
  assert.equal(Brokerage.rollbackDesign().length, 7);
  assert.equal(Brokerage.exportContract().PDF_IS_BACKUP, false);
});

test('broker support is honest and report models remain read-only', () => {
  assert.equal(Brokerage.brokerFormatAudit().Inter, 'SUPPORTED');
  assert.equal(Brokerage.brokerFormatAudit().XP, 'UNKNOWN_FORMAT');
  const result = Brokerage.brokerNoteReport(note(), { status: 'MATCH' });
  assert.equal(result.writeEnabled, false);
  assert.equal(Brokerage.reconciliationReport().reviewRequired, true);
  assert.equal(Brokerage.pdfApproach().heavyDependency, false);
});

test('brokerage note and cross-source models scale at required sizes', () => {
  for (const size of [100, 500, 1000]) {
    const notes = Array.from({ length: size }, (_, index) => note({ noteNumber: `N-${index}`, operations: [] }));
    assert.equal(notes.length, size);
    assert.equal(notes.every(item => item.NOTE_IDENTITY), true);
  }
  for (const size of [10000, 50000]) {
    const graph = Brokerage.eventGraph({ notes: Array.from({ length: size }, (_, index) => ({ date: '2025-01-01', ticker: `ABCD${index % 20}`, qty: 1, price: 1, value: 1, movement: 'Compra' })) });
    assert.equal(graph.sameEconomicEventCountedOnce, true);
  }
});
