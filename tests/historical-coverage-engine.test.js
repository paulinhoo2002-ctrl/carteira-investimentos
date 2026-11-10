'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { evaluateCoverage, matchesVerifiedEvents } = require('../historical-coverage-engine.js');
const provenance = require('../financial-evidence-provenance.js');

const start = '2026-01-01';
const end = '2026-12-31';
const event = { id: 'trade-1', type: 'PURCHASE', occurredOn: '2026-02-01', amount: 100, status: 'CONFIRMED' };

function evaluate(expectedEvents, observedEvents, includeOpeningEvidence = true, unverifiedRegistry = false) {
  const sourceEvidence = [
    ...(includeOpeningEvidence ? [{
      semanticType: 'NO_OPENING_POSITION', coverageState: 'COMPLETE', assetIdentity: 'asset-1',
      periodMembership: 'OPENING_COMPATIBLE', periodStart: start, periodEnd: end,
      occurredOn: '2025-12-31', noOpeningPositionCompatible: true,
    }] : []),
    {
      semanticType: 'PURCHASE', coverageState: 'COMPLETE', assetIdentity: 'asset-1',
      periodMembership: 'IN_PERIOD', periodStart: start, periodEnd: end,
      occurredOn: event.occurredOn, stableEventId: event.id, amount: event.amount,
    },
  ];
  const registry = provenance.createRegistry(sourceEvidence.map((row, index) => ({
    ...row,
    sourceKind: 'SYNTHETIC_TEST',
    sourceId: 'synthetic-ledger',
    stableEventId: row.stableEventId || `opening-${index}`,
    authority: 'SYNTHETIC_TEST',
    status: row.semanticType === 'NO_OPENING_POSITION' ? 'OBSERVED' : 'CONFIRMED',
    duplicateState: 'NONE',
    conflictState: 'NONE',
    positionQuantity: row.semanticType === 'NO_OPENING_POSITION' ? 0 : undefined,
    quantityUnit: row.semanticType === 'NO_OPENING_POSITION' ? 'units' : undefined,
    compatibleWithPeriod: row.semanticType === 'NO_OPENING_POSITION',
  })), { duplicatesResolved: true, sourceOverlapResolved: true });
  return evaluateCoverage({
    historyEvidence: {
      status: 'COMPLETE', periodStart: start, periodEnd: end, openingPosition: 'NONE',
      allEventsRepresented: true, duplicatesResolved: true, sourceOverlapResolved: true,
    },
    registry: unverifiedRegistry ? { ...registry } : registry,
    componentCoverage: { contributions: 'COMPLETE' },
    subjectIdentity: 'asset-1', subjectPresent: true,
    expectedEvents, observedEvents,
  });
}

test('coverage requires an explicit expected event list and a bijective match', () => {
  const result = evaluate([event], []);
  assert.equal(result.coverage.history.status, 'PARTIAL');
  assert.ok(result.blockers.includes('EXPECTED_EVENTS_MISMATCH'));
});

test('coverage is complete only when every expected event and zero opening evidence are represented', () => {
  const result = evaluate([event], [event]);
  assert.equal(result.coverage.history.status, 'COMPLETE');
  assert.equal(result.coverage.history.expectedEventsMatched, true);
});

test('source provenance must contain the same event as the provider result', () => {
  const unprovenEvent = { ...event, id: 'trade-2', amount: 200 };
  const result = evaluate([unprovenEvent], [unprovenEvent]);
  assert.equal(result.coverage.history.status, 'PARTIAL');
  assert.equal(result.coverage.history.expectedEventsMatched, true);
  assert.equal(result.coverage.history.sourceEventsMatched, false);
  assert.ok(result.blockers.includes('SOURCE_EVENT_EVIDENCE_MISMATCH'));
});
test('coverage verification requires an engine-issued result bound to the exact event set', () => {
  const result = evaluate([event], [event]);
  assert.equal(matchesVerifiedEvents(result.coverage, [event]), true);
  assert.equal(matchesVerifiedEvents(result.coverage, [{ ...event, amount: 101 }]), false);
  assert.equal(matchesVerifiedEvents(Object.freeze({ ...result.coverage }), [event]), false);
});
test('registry plain object cannot claim verified provenance', () => {
  const result = evaluate([event], [event], true, true);
  assert.equal(result.coverage.history.status, 'PARTIAL');
  assert.ok(result.blockers.includes('PROVENANCE_REGISTRY_UNVERIFIED'));
});

test('declaring no opening position without source evidence cannot certify history', () => {
  const result = evaluate([event], [event], false);
  assert.equal(result.coverage.history.status, 'PARTIAL');
  assert.ok(result.blockers.includes('OPENING_POSITION_COMPATIBILITY_NOT_PROVEN'));
});
