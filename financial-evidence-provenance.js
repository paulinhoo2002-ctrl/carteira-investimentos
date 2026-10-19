'use strict';

(function expose(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FinancialEvidenceProvenance = api;
}(typeof globalThis === 'object' ? globalThis : this, function createProvenance() {
  const RECEIPT_TYPES = new Set(['COUPON', 'INTEREST', 'INCOME', 'AMORTIZATION', 'PARTIAL_REDEMPTION', 'TOTAL_REDEMPTION', 'PRINCIPAL_RETURN']);
  const CONTRIBUTION_TYPES = new Set(['APPLICATION', 'PURCHASE']);
  const TAX_TYPES = new Set(['IR', 'IOF']);
  const COMPLETE_DUPLICATE_STATES = new Set(['NONE', 'RESOLVED']);
  const COMPLETE_CONFLICT_STATES = new Set(['NONE', 'RESOLVED']);

  function text(value) {
    return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  }

  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const stamp = Date.parse(`${value}T00:00:00.000Z`);
    return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value;
  }

  function periodMembership(date, start, end) {
    if (!validDate(date) || !validDate(start) || !validDate(end) || start > end) return 'UNKNOWN';
    return date >= start && date <= end ? 'IN_PERIOD' : 'OUTSIDE_PERIOD';
  }

  function createRegistry(records = [], proof = {}) {
    const rows = Array.isArray(records) ? records : [];
    const ids = new Map();
    const fingerprints = new Map();
    const sourceEvidence = rows.map((record = {}) => {
      const semanticType = text(record.semanticType).toUpperCase() || 'UNKNOWN';
      const sourceKind = text(record.sourceKind) || null;
      const sourceId = text(record.sourceId) || null;
      const stableEventId = text(record.stableEventId) || null;
      const assetIdentity = text(record.assetIdentity) || null;
      const occurredOn = validDate(record.occurredOn) ? record.occurredOn : null;
      const amountBasis = ['GROSS', 'NET'].includes(record.amountBasis) ? record.amountBasis : null;
      const duplicateState = text(record.duplicateState).toUpperCase() || 'UNKNOWN';
      const conflictState = text(record.conflictState).toUpperCase() || 'UNKNOWN';
      const status = text(record.status).toUpperCase() || 'UNKNOWN';
      const historyRelevant = record.historyRelevant !== false;
      let period = periodMembership(occurredOn, record.periodStart, record.periodEnd);
      const compatibleOpeningPosition = semanticType === 'OPENING_POSITION'
        && status === 'OBSERVED'
        && validDate(record.periodStart) && validDate(record.periodEnd) && record.periodStart <= record.periodEnd
        && occurredOn && occurredOn < record.periodStart && record.compatibleWithPeriod === true
        && typeof record.positionQuantity === 'number' && Number.isFinite(record.positionQuantity) && record.positionQuantity > 0
        && Boolean(text(record.quantityUnit));
      if (compatibleOpeningPosition) period = 'OPENING_COMPATIBLE';

      if (stableEventId) {
        const key = `${sourceKind || ''}|${stableEventId}`;
        ids.set(key, (ids.get(key) || 0) + 1);
      }
      const fingerprint = text(record.duplicateFingerprint);
      if (fingerprint) fingerprints.set(fingerprint, (fingerprints.get(fingerprint) || 0) + 1);
      if (period === 'OUTSIDE_PERIOD') period = 'OUTSIDE_PERIOD';

      const needsReceiptBasis = RECEIPT_TYPES.has(semanticType);
      const statusVerified = semanticType === 'CURRENT_POSITION' ? status === 'OBSERVED'
        : semanticType === 'OPENING_POSITION' ? compatibleOpeningPosition
        : CONTRIBUTION_TYPES.has(semanticType) ? status === 'CONFIRMED'
          : TAX_TYPES.has(semanticType) ? status === 'PAID'
            : needsReceiptBasis ? status === 'RECEIVED'
              : semanticType === 'LINKED_REFERENCE' && status === 'REFERENCE';
      const hasSourceAuthority = Boolean(sourceKind && sourceId && assetIdentity && text(record.authority) && status !== 'UNKNOWN');
      const complete = semanticType === 'CURRENT_POSITION'
        ? Boolean(statusVerified && hasSourceAuthority && text(record.observedAt))
        : Boolean(statusVerified && historyRelevant && hasSourceAuthority && stableEventId && occurredOn
          && COMPLETE_DUPLICATE_STATES.has(duplicateState) && COMPLETE_CONFLICT_STATES.has(conflictState)
          && (!needsReceiptBasis || amountBasis)
          && (semanticType === 'OPENING_POSITION' ? compatibleOpeningPosition : period === 'IN_PERIOD'));
      const coverageState = complete ? 'COMPLETE' : semanticType === 'CURRENT_POSITION' && hasSourceAuthority ? 'PARTIAL' : 'UNKNOWN';
      return {
        sourceKind,
        sourceId,
        stableEventId,
        assetIdentity,
        occurredOn,
        observedAt: text(record.observedAt) || null,
        authority: text(record.authority) || null,
        semanticType,
        amountBasis,
        status,
        periodStart: validDate(record.periodStart) ? record.periodStart : null,
        periodEnd: validDate(record.periodEnd) ? record.periodEnd : null,
        periodMembership: period,
        openingPositionCompatible: compatibleOpeningPosition,
        duplicateState,
        conflictState,
        sourceOverlapResolution: text(record.sourceOverlapResolution).toUpperCase() || null,
        historyRelevant,
        coverageState,
      };
    });

    let hasDuplicate = false;
    for (let index = 0; index < sourceEvidence.length; index += 1) {
      const row = sourceEvidence[index];
      const input = rows[index] || {};
      const idKey = row.stableEventId ? `${row.sourceKind || ''}|${row.stableEventId}` : '';
      if ((idKey && ids.get(idKey) > 1) || (text(input.duplicateFingerprint) && fingerprints.get(text(input.duplicateFingerprint)) > 1)) {
        row.duplicateState = ids.get(idKey) > 1 ? 'DUPLICATE_ID' : 'POSSIBLE_DUPLICATE';
        row.coverageState = 'UNKNOWN';
        hasDuplicate = true;
      }
    }

    const byEvent = new Map();
    for (const row of sourceEvidence) {
      if (!row.stableEventId) continue;
      if (!byEvent.has(row.stableEventId)) byEvent.set(row.stableEventId, []);
      byEvent.get(row.stableEventId).push(row);
    }
    let unresolvedOverlap = sourceEvidence.some(row => row.historyRelevant && row.sourceOverlapResolution === 'UNRESOLVED');
    for (const rowsForEvent of byEvent.values()) {
      const multipleKinds = new Set(rowsForEvent.map(row => row.sourceKind)).size > 1;
      const multipleSources = new Set(rowsForEvent.map(row => row.sourceId)).size > 1;
      if (!multipleKinds && !multipleSources) continue;
      if (!rowsForEvent.every(row => row.sourceOverlapResolution === 'LINKED_BY_EVENT_ID')) unresolvedOverlap = true;
    }

    const unresolvedDuplicate = sourceEvidence.some(row => row.historyRelevant && !COMPLETE_DUPLICATE_STATES.has(row.duplicateState));
    const blockers = new Set();
    if (sourceEvidence.some(row => row.historyRelevant && row.coverageState !== 'COMPLETE')) blockers.add('PROVENANCE_INCOMPLETE');
    if (hasDuplicate || unresolvedDuplicate) blockers.add('DUPLICATE_EVIDENCE');
    if (unresolvedOverlap) blockers.add('SOURCE_OVERLAP_UNRESOLVED');
    return Object.freeze({
      sourceEvidence: Object.freeze(sourceEvidence.map(row => Object.freeze(row))),
      provenanceComplete: sourceEvidence.some(row => row.historyRelevant) && sourceEvidence.filter(row => row.historyRelevant).every(row => row.coverageState === 'COMPLETE'),
      duplicatesResolved: proof.duplicatesResolved === true && !hasDuplicate && !unresolvedDuplicate,
      sourceOverlapResolved: proof.sourceOverlapResolved === true && !unresolvedOverlap,
      blockers: Object.freeze([...blockers]),
    });
  }

  return Object.freeze({ createRegistry, validDate });
}));
