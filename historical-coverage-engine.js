'use strict';

(function expose(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HistoricalCoverageEngine = api;
}(typeof globalThis === 'object' ? globalThis : this, function createCoverageEngine() {
  const STATES = new Set(['COMPLETE', 'PARTIAL', 'UNKNOWN']);
  const COMPONENTS = ['currentPosition', 'costBasis', 'contributions', 'income', 'taxes', 'capitalReturns', 'principal'];

  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const stamp = Date.parse(`${value}T00:00:00.000Z`);
    return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value;
  }

  function evaluateCoverage({ historyEvidence = null, registry = null, sourceEvidence, componentCoverage = {}, subjectIdentity = null, subjectPresent = false, additionalBlockers = [] } = {}) {
    const evidence = Array.isArray(registry?.sourceEvidence) ? registry.sourceEvidence : Array.isArray(sourceEvidence) ? sourceEvidence : [];
    const blockers = new Set(Array.isArray(registry?.blockers) ? registry.blockers : []);
    for (const blocker of Array.isArray(additionalBlockers) ? additionalBlockers : []) if (typeof blocker === 'string' && blocker) blockers.add(blocker);
    const periodStart = validDate(historyEvidence?.periodStart) ? historyEvidence.periodStart : null;
    const periodEnd = validDate(historyEvidence?.periodEnd) ? historyEvidence.periodEnd : null;
    const periodValid = Boolean(periodStart && periodEnd && periodStart <= periodEnd);
    const subjectKey = typeof subjectIdentity === 'string' || typeof subjectIdentity === 'number' ? String(subjectIdentity).trim() : '';
    const openingPosition = ['NONE', 'KNOWN'].includes(historyEvidence?.openingPosition) ? historyEvidence.openingPosition : 'UNKNOWN';
    const compatibleOpeningPosition = openingPosition === 'KNOWN' && evidence.some(row => row.semanticType === 'OPENING_POSITION'
      && row.coverageState === 'COMPLETE' && row.openingPositionCompatible === true
      && row.assetIdentity === subjectIdentity);
    const allEventsRepresented = historyEvidence?.allEventsRepresented === true;
    const duplicatesResolved = historyEvidence?.duplicatesResolved === true && registry?.duplicatesResolved === true;
    const sourceOverlapResolved = historyEvidence?.sourceOverlapResolved === true && registry?.sourceOverlapResolved === true;
    const provenanceComplete = registry?.provenanceComplete === true && evidence.length > 0;
    const assetIdentityUnproven = !subjectKey || evidence.some(row => row.historyRelevant !== false && row.assetIdentity !== subjectKey);
    const unknownEconomicEvent = evidence.some(row => row.historyRelevant !== false && (row.semanticType === 'UNKNOWN' || row.coverageState !== 'COMPLETE'));
    const eventPeriodUnproven = evidence.some(row => {
      if (row.historyRelevant === false) return false;
      if (row.semanticType === 'OPENING_POSITION') return !(openingPosition === 'KNOWN'
        && compatibleOpeningPosition && row.periodMembership === 'OPENING_COMPATIBLE'
        && row.periodStart === periodStart && row.periodEnd === periodEnd
        && validDate(row.occurredOn) && row.occurredOn < periodStart);
      return !(row.periodMembership === 'IN_PERIOD' && row.periodStart === periodStart && row.periodEnd === periodEnd
        && validDate(row.occurredOn) && row.occurredOn >= periodStart && row.occurredOn <= periodEnd);
    });

    if (!periodStart) blockers.add('HISTORY_PERIOD_START_UNKNOWN');
    if (!periodEnd) blockers.add('HISTORY_PERIOD_END_UNKNOWN');
    if (periodStart && periodEnd && periodStart > periodEnd) blockers.add('HISTORY_PERIOD_INVALID');
    if (openingPosition === 'UNKNOWN') blockers.add('OPENING_POSITION_UNKNOWN');
    else if (openingPosition === 'KNOWN' && !compatibleOpeningPosition) blockers.add('OPENING_POSITION_COMPATIBILITY_NOT_PROVEN');
    if (!allEventsRepresented) blockers.add('ALL_EVENTS_NOT_PROVEN');
    if (!duplicatesResolved) blockers.add('DUPLICATES_NOT_RESOLVED');
    if (!sourceOverlapResolved) blockers.add('SOURCE_OVERLAP_NOT_RESOLVED');
    if (!provenanceComplete) blockers.add('PROVENANCE_INCOMPLETE');
    if (assetIdentityUnproven) blockers.add('HISTORY_ASSET_IDENTITY_MISMATCH');
    if (unknownEconomicEvent) blockers.add('UNKNOWN_ECONOMIC_EVIDENCE');
    if (eventPeriodUnproven) blockers.add('HISTORY_EVENT_PERIOD_UNPROVEN');
    if (componentCoverage.contributions !== 'COMPLETE') blockers.add('CONTRIBUTIONS_NOT_COMPLETE');

    const historyComplete = historyEvidence?.status === 'COMPLETE'
      && periodValid
      && (openingPosition === 'NONE' || compatibleOpeningPosition)
      && allEventsRepresented
      && duplicatesResolved
      && sourceOverlapResolved
      && provenanceComplete
      && !assetIdentityUnproven
      && !unknownEconomicEvent
      && !eventPeriodUnproven
      && componentCoverage.contributions === 'COMPLETE'
      && !(Array.isArray(additionalBlockers) && additionalBlockers.length > 0);
    const hasEvidence = subjectPresent || Boolean(historyEvidence) || evidence.length > 0;
    const coverage = Object.fromEntries(COMPONENTS.map(key => [key, STATES.has(componentCoverage[key]) ? componentCoverage[key] : 'UNKNOWN']));
    coverage.history = Object.freeze({
      status: historyComplete ? 'COMPLETE' : hasEvidence ? 'PARTIAL' : 'UNKNOWN',
      periodStart,
      periodEnd,
      openingPosition,
      allEventsRepresented,
      duplicatesResolved,
      sourceOverlapResolved,
    });
    return Object.freeze({ coverage: Object.freeze(coverage), blockers: Object.freeze([...blockers]) });
  }

  return Object.freeze({ evaluateCoverage });
}));
