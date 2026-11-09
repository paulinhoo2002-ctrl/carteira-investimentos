'use strict';

(function expose(root, factory) {
  const provenance = typeof module === 'object' && module.exports
    ? require('./financial-evidence-provenance.js')
    : root?.FinancialEvidenceProvenance;
  const api = factory(provenance);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HistoricalCoverageEngine = api;
}(typeof globalThis === 'object' ? globalThis : this, function createCoverageEngine(provenance) {
  const STATES = new Set(['COMPLETE', 'PARTIAL', 'UNKNOWN']);
  const COMPONENTS = ['currentPosition', 'costBasis', 'contributions', 'income', 'taxes', 'capitalReturns', 'principal'];
  const verifiedCoverage = new WeakSet();
  const expectedEventsByCoverage = new WeakMap();

  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const stamp = Date.parse(`${value}T00:00:00.000Z`);
    return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value;
  }

  function eventListMatches(expectedEvents, observedEvents) {
    if (!Array.isArray(expectedEvents) || !Array.isArray(observedEvents) || expectedEvents.length !== observedEvents.length) return false;
    const key = event => {
      const id = String(event?.id ?? event?.stableEventId ?? '').trim();
      const type = String(event?.type ?? event?.semanticType ?? '').trim().toUpperCase();
      const occurredOn = event?.occurredOn;
      if (!id || !type || !validDate(occurredOn)) return null;
      const amount = typeof event.amount === 'number' && Number.isFinite(event.amount) ? event.amount : null;
      const quantity = typeof event.quantity === 'number' && Number.isFinite(event.quantity) ? event.quantity : null;
      return JSON.stringify([id, type, occurredOn, amount, quantity, event.amountBasis || null, event.status || null, event.relatedEventId || null]);
    };
    const counts = new Map();
    for (const event of expectedEvents) {
      const eventKey = key(event);
      if (!eventKey) return false;
      counts.set(eventKey, (counts.get(eventKey) || 0) + 1);
    }
    for (const event of observedEvents) {
      const eventKey = key(event);
      const count = eventKey ? counts.get(eventKey) || 0 : 0;
      if (!count) return false;
      if (count === 1) counts.delete(eventKey);
      else counts.set(eventKey, count - 1);
    }
    return counts.size === 0;
  }

  function sourceEventListMatches(expectedEvents, evidence) {
    const rows = evidence.filter(row => row.historyRelevant !== false
      && !['OPENING_POSITION', 'NO_OPENING_POSITION', 'LINKED_REFERENCE'].includes(row.semanticType));
    return eventListMatches(expectedEvents, rows);
  }

  function evaluateCoverage({ historyEvidence = null, registry = null, sourceEvidence, componentCoverage = {}, subjectIdentity = null, subjectPresent = false, additionalBlockers = [], expectedEvents, observedEvents } = {}) {
    const verifiedRegistry = provenance?.isVerifiedRegistry?.(registry) === true ? registry : null;
    const evidence = Array.isArray(verifiedRegistry?.sourceEvidence) ? verifiedRegistry.sourceEvidence : Array.isArray(sourceEvidence) ? sourceEvidence : [];
    const blockers = new Set(Array.isArray(verifiedRegistry?.blockers) ? verifiedRegistry.blockers : []);
    for (const blocker of Array.isArray(additionalBlockers) ? additionalBlockers : []) if (typeof blocker === 'string' && blocker) blockers.add(blocker);
    const periodStart = validDate(historyEvidence?.periodStart) ? historyEvidence.periodStart : null;
    const periodEnd = validDate(historyEvidence?.periodEnd) ? historyEvidence.periodEnd : null;
    const periodValid = Boolean(periodStart && periodEnd && periodStart <= periodEnd);
    const subjectKey = typeof subjectIdentity === 'string' || typeof subjectIdentity === 'number' ? String(subjectIdentity).trim() : '';
    const openingPosition = ['NONE', 'KNOWN'].includes(historyEvidence?.openingPosition) ? historyEvidence.openingPosition : 'UNKNOWN';
    const compatibleOpeningPosition = openingPosition === 'KNOWN' && evidence.some(row => row.semanticType === 'OPENING_POSITION'
      && row.coverageState === 'COMPLETE' && row.openingPositionCompatible === true
      && row.assetIdentity === subjectIdentity);
    const compatibleNoOpeningPosition = openingPosition === 'NONE' && evidence.some(row => row.semanticType === 'NO_OPENING_POSITION'
      && row.coverageState === 'COMPLETE' && row.noOpeningPositionCompatible === true
      && row.assetIdentity === subjectIdentity);
    const openingPositionProven = compatibleOpeningPosition || compatibleNoOpeningPosition;
    const allEventsRepresented = historyEvidence?.allEventsRepresented === true;
    const duplicatesResolved = historyEvidence?.duplicatesResolved === true && verifiedRegistry?.duplicatesResolved === true;
    const sourceOverlapResolved = historyEvidence?.sourceOverlapResolved === true && verifiedRegistry?.sourceOverlapResolved === true;
    const provenanceComplete = verifiedRegistry?.provenanceComplete === true && evidence.length > 0;
    const assetIdentityUnproven = !subjectKey || evidence.some(row => row.historyRelevant !== false && row.assetIdentity !== subjectKey);
    const unknownEconomicEvent = evidence.some(row => row.historyRelevant !== false && (row.semanticType === 'UNKNOWN' || row.coverageState !== 'COMPLETE'));
    const eventPeriodUnproven = evidence.some(row => {
      if (row.historyRelevant === false) return false;
      if (row.semanticType === 'OPENING_POSITION' || row.semanticType === 'NO_OPENING_POSITION') return !(openingPositionProven
        && row.periodMembership === 'OPENING_COMPATIBLE'
        && row.periodStart === periodStart && row.periodEnd === periodEnd
        && validDate(row.occurredOn) && row.occurredOn < periodStart);
      return !(row.periodMembership === 'IN_PERIOD' && row.periodStart === periodStart && row.periodEnd === periodEnd
        && validDate(row.occurredOn) && row.occurredOn >= periodStart && row.occurredOn <= periodEnd);
    });
    const expectedEventsMatched = eventListMatches(expectedEvents, observedEvents);
    const sourceEventsMatched = Array.isArray(expectedEvents) && sourceEventListMatches(expectedEvents, evidence);

    if (!periodStart) blockers.add('HISTORY_PERIOD_START_UNKNOWN');
    if (!periodEnd) blockers.add('HISTORY_PERIOD_END_UNKNOWN');
    if (periodStart && periodEnd && periodStart > periodEnd) blockers.add('HISTORY_PERIOD_INVALID');
    if (openingPosition === 'UNKNOWN') blockers.add('OPENING_POSITION_UNKNOWN');
    else if (!openingPositionProven) blockers.add('OPENING_POSITION_COMPATIBILITY_NOT_PROVEN');
    if (!allEventsRepresented) blockers.add('ALL_EVENTS_NOT_PROVEN');
    if (!duplicatesResolved) blockers.add('DUPLICATES_NOT_RESOLVED');
    if (!sourceOverlapResolved) blockers.add('SOURCE_OVERLAP_NOT_RESOLVED');
    if (!verifiedRegistry) blockers.add('PROVENANCE_REGISTRY_UNVERIFIED');
    if (!provenanceComplete) blockers.add('PROVENANCE_INCOMPLETE');
    if (assetIdentityUnproven) blockers.add('HISTORY_ASSET_IDENTITY_MISMATCH');
    if (unknownEconomicEvent) blockers.add('UNKNOWN_ECONOMIC_EVIDENCE');
    if (eventPeriodUnproven) blockers.add('HISTORY_EVENT_PERIOD_UNPROVEN');
    if (componentCoverage.contributions !== 'COMPLETE') blockers.add('CONTRIBUTIONS_NOT_COMPLETE');
    if (!Array.isArray(expectedEvents) || !Array.isArray(observedEvents)) blockers.add('EXPECTED_EVENTS_NOT_PROVIDED');
    else if (!expectedEventsMatched) blockers.add('EXPECTED_EVENTS_MISMATCH');
    if (Array.isArray(expectedEvents) && !sourceEventsMatched) blockers.add('SOURCE_EVENT_EVIDENCE_MISMATCH');

    const historyComplete = historyEvidence?.status === 'COMPLETE'
      && periodValid
      && openingPositionProven
      && allEventsRepresented
      && duplicatesResolved
      && sourceOverlapResolved
      && provenanceComplete
      && !assetIdentityUnproven
      && !unknownEconomicEvent
      && !eventPeriodUnproven
      && componentCoverage.contributions === 'COMPLETE'
      && expectedEventsMatched
      && sourceEventsMatched
      && !(Array.isArray(additionalBlockers) && additionalBlockers.length > 0);
    const hasEvidence = subjectPresent || Boolean(historyEvidence) || evidence.length > 0;
    const coverage = Object.fromEntries(COMPONENTS.map(key => [key, STATES.has(componentCoverage[key]) ? componentCoverage[key] : 'UNKNOWN']));
    coverage.history = Object.freeze({
      status: historyComplete ? 'COMPLETE' : hasEvidence ? 'PARTIAL' : 'UNKNOWN',
      periodStart,
      periodEnd,
      openingPosition,
      expectedEventsMatched,
      sourceEventsMatched,
      allEventsRepresented,
      duplicatesResolved,
      sourceOverlapResolved,
    });
    const verified = Object.freeze(coverage);
    verifiedCoverage.add(verified);
    expectedEventsByCoverage.set(verified, Array.isArray(expectedEvents) ? expectedEvents.map(event => ({ ...event })) : null);
    return Object.freeze({ coverage: verified, blockers: Object.freeze([...blockers]) });
  }

  function matchesVerifiedEvents(coverage, events) {
    if (!verifiedCoverage.has(coverage)) return false;
    const expected = expectedEventsByCoverage.get(coverage);
    return Array.isArray(expected) && eventListMatches(expected, events);
  }

  return Object.freeze({ evaluateCoverage, matchesVerifiedEvents });
}));
