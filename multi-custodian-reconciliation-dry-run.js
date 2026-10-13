'use strict';

/* Snapshot-only analysis. This module never reads files or writes portfolio state. */
(function exposeMultiCustodianDryRun(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MultiCustodianReconciliationDryRun = api;
})(typeof globalThis === 'object' ? globalThis : this, function createMultiCustodianDryRun() {
  const SOURCE_TYPES = new Set(['EXTRATO', 'MOVIMENTAÇÃO', 'POSIÇÃO', 'DERIVADO', 'DESCONHECIDO']);
  const COVERAGES = new Set(['COMPLETE', 'PARTIAL', 'UNKNOWN']);
  const CUSTODIANS = new Set(['INTER', 'OUTRO', 'UNKNOWN']);
  const OBSERVATION_TYPES = new Set(['OBSERVED', 'DERIVED', 'UNKNOWN']);

  const text = value => typeof value === 'string' ? value.trim() : '';
  const keyOf = values => JSON.stringify(values);
  const validDate = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };

  function validateRecord(record) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return ['RECORD_INVALID'];
    const errors = [];
    if (record.recordType !== 'POSITION') errors.push('RECORD_TYPE_UNSUPPORTED');
    if (!CUSTODIANS.has(record.custodian)) errors.push('CUSTODIAN_INVALID');
    if (!text(record.account)) errors.push('ACCOUNT_ID_MISSING');
    if (!SOURCE_TYPES.has(record.source)) errors.push('SOURCE_TYPE_INVALID');
    if (!text(record.sourceId) || !text(record.sourceRecordId)) errors.push('SOURCE_RECORD_IDENTITY_MISSING');
    if (record.sourceSha256 !== undefined && !/^[a-f\d]{64}$/i.test(String(record.sourceSha256))) errors.push('SOURCE_SHA256_INVALID');
    if (!validDate(record.asOf)) errors.push('AS_OF_INVALID');
    if (!text(record.assetId) || !text(record.assetClass)) errors.push('ASSET_IDENTITY_MISSING');
    if (!text(record.currency) || !text(record.amountKind)) errors.push('AMOUNT_UNIT_MISSING');
    if (record.amountCents !== null && (!Number.isSafeInteger(record.amountCents) || record.amountCents < 0)) errors.push('AMOUNT_CENTS_INVALID');
    if (!COVERAGES.has(record.coverage)) errors.push('COVERAGE_INVALID');
    if (record.coverage === 'COMPLETE' && record.amountCents === null) errors.push('COMPLETE_AMOUNT_MISSING');
    if (!text(record.provenance) || !text(record.confidenceBasis)) errors.push('PROVENANCE_MISSING');
    if (!OBSERVATION_TYPES.has(record.observedOrDerived)) errors.push('OBSERVATION_TYPE_INVALID');
    if (['DERIVADO', 'MOVIMENTAÇÃO'].includes(record.source) && record.observedOrDerived !== 'DERIVED') errors.push('DERIVED_SOURCE_MISMATCH');
    if (record.source === 'DESCONHECIDO' && record.observedOrDerived !== 'UNKNOWN') errors.push('UNKNOWN_SOURCE_MISMATCH');
    return errors;
  }

  function sourceRowKey(record) {
    return keyOf([record.sourceSha256 ? `sha256:${record.sourceSha256}` : `source:${record.sourceId}`, record.sourceRecordId]);
  }

  function sourceRowValue(record) {
    return keyOf([
      record.recordType, record.custodian, record.account, record.asOf, record.assetId,
      record.assetClass, record.currency, record.amountKind, record.amountCents,
      record.coverage, record.source, record.observedOrDerived,
    ]);
  }

  function logicalPositionKey(record) {
    return keyOf([record.custodian, record.account, record.asOf, record.assetId, record.currency, record.amountKind]);
  }

  function positionFrom(records, conflict = false) {
    const first = records[0];
    const values = new Set(records.map(item => item.amountCents));
    const classes = new Set(records.map(item => item.assetClass));
    const coverages = new Set(records.map(item => item.coverage));
    const sourceUnknown = records.some(item => item.source === 'DESCONHECIDO' || item.observedOrDerived === 'UNKNOWN');
    const valueConflict = values.size > 1 || classes.size > 1;
    const coverage = coverages.has('UNKNOWN') ? 'UNKNOWN' : coverages.has('PARTIAL') ? 'PARTIAL' : 'COMPLETE';
    const amountCents = conflict || valueConflict || sourceUnknown ? null : [...values][0];
    const status = conflict || valueConflict ? 'CONFLICT'
      : sourceUnknown || coverage === 'UNKNOWN' || amountCents === null ? 'UNKNOWN'
        : coverage === 'PARTIAL' ? 'PARTIAL'
          : amountCents === 0 ? 'ZERO_CONFIRMED' : 'COMPLETE';
    return {
      custodian: first.custodian,
      account: first.account,
      asOf: first.asOf,
      assetId: first.assetId,
      assetClass: classes.size === 1 ? first.assetClass : null,
      currency: first.currency,
      amountKind: first.amountKind,
      amountCents,
      candidateAmountCents: sourceUnknown && !valueConflict ? [...values][0] : null,
      coverage: status === 'CONFLICT' ? 'UNKNOWN' : coverage,
      status,
      sourceIds: [...new Set(records.map(item => item.sourceId))].sort(),
      sourceCount: records.length,
      provenance: records.map(item => ({ source: item.source, sourceId: item.sourceId, sourceRecordId: item.sourceRecordId, asOf: item.asOf, coverage: item.coverage, basis: item.confidenceBasis, observedOrDerived: item.observedOrDerived })),
    };
  }

  function summarize(records, { custodian, asOf, currency, amountKind } = {}) {
    const positions = records.filter(item => (custodian === undefined || item.custodian === custodian)
      && item.asOf === asOf && item.currency === currency && item.amountKind === amountKind);
    let knownSubtotalCents = 0;
    let overflow = false;
    for (const position of positions) {
      if (position.amountCents === null) continue;
      const next = knownSubtotalCents + position.amountCents;
      if (!Number.isSafeInteger(next)) overflow = true;
      else knownSubtotalCents = next;
    }
    const complete = !overflow && positions.length > 0 && positions.every(item => ['COMPLETE', 'ZERO_CONFIRMED'].includes(item.status));
    const hasKnown = positions.some(item => item.amountCents !== null);
    const status = overflow ? 'REVIEW_REQUIRED' : complete
      ? knownSubtotalCents === 0 ? 'ZERO_CONFIRMED' : 'COMPLETE'
      : positions.some(item => item.status === 'CONFLICT') ? 'REVIEW_REQUIRED'
        : hasKnown ? 'PARTIAL' : 'UNKNOWN';
    return {
      custodian: custodian ?? 'GLOBAL', asOf, currency, amountKind,
      positionCount: positions.length,
      knownSubtotalCents: overflow || !hasKnown ? null : knownSubtotalCents,
      totalCents: complete ? knownSubtotalCents : null,
      status,
      sourceIds: [...new Set(positions.flatMap(item => item.sourceIds))].sort(),
    };
  }

  function reconcilePositionSnapshots(input = []) {
    const rows = Array.isArray(input) ? input : [];
    const invalidRecords = [];
    const validRows = [];
    rows.forEach((record, index) => {
      const errors = validateRecord(record);
      if (errors.length) invalidRecords.push({ index, errors });
      else validRows.push({ ...record, sourceSha256: record.sourceSha256 ? String(record.sourceSha256).toLowerCase() : undefined });
    });

    const bySourceRow = new Map();
    let exactSourceDuplicates = 0;
    for (const record of validRows) {
      const key = sourceRowKey(record);
      if (!bySourceRow.has(key)) bySourceRow.set(key, new Map());
      const variants = bySourceRow.get(key);
      const value = sourceRowValue(record);
      if (variants.has(value)) exactSourceDuplicates += 1;
      else variants.set(value, record);
    }

    const conflicts = [];
    const conflictedRows = [];
    for (const [key, variants] of bySourceRow) {
      if (variants.size < 2) {
        bySourceRow.set(key, [...variants.values()][0]);
        continue;
      }
      const rows = [...variants.values()];
      conflictedRows.push(...rows);
      conflicts.push({
        state: 'SOURCE_ROW_CONFLICT',
        sourceId: rows[0].sourceId,
        sourceRecordId: rows[0].sourceRecordId,
        sourceScopes: rows.map(record => ({ custodian: record.custodian, account: record.account, asOf: record.asOf, assetId: record.assetId, assetClass: record.assetClass, currency: record.currency, amountKind: record.amountKind })),
      });
      bySourceRow.delete(key);
    }

    const positionGroups = new Map();
    for (const record of bySourceRow.values()) {
      const key = logicalPositionKey(record);
      if (!positionGroups.has(key)) positionGroups.set(key, []);
      positionGroups.get(key).push(record);
    }

    const positions = [];
    let positionDuplicatesCollapsed = 0;
    for (const recordsForPosition of positionGroups.values()) {
      const position = positionFrom(recordsForPosition);
      if (position.status === 'CONFLICT') {
        conflicts.push({ state: 'POSITION_VALUE_CONFLICT', custodian: position.custodian, account: position.account, asOf: position.asOf, assetId: position.assetId, assetClass: position.assetClass, currency: position.currency, amountKind: position.amountKind });
      } else if (recordsForPosition.length > 1) positionDuplicatesCollapsed += recordsForPosition.length - 1;
      positions.push(position);
    }

    for (const record of conflictedRows) {
      positions.push({ ...positionFrom([record], true), status: 'CONFLICT', amountCents: null, coverage: 'UNKNOWN' });
    }

    const dates = [...new Set(positions.map(item => item.asOf))].sort();
    const currencies = [...new Set(positions.map(item => item.currency))].sort();
    const amountKinds = [...new Set(positions.map(item => item.amountKind))].sort();
    const custodianSummaries = [];
    for (const group of new Set(positions.map(item => keyOf([item.custodian, item.asOf, item.currency, item.amountKind])))) {
      const [custodian, asOf, currency, amountKind] = JSON.parse(group);
      custodianSummaries.push(summarize(positions, { custodian, asOf, currency, amountKind }));
    }
    const globalSummaries = [];
    for (const group of new Set(positions.map(item => keyOf([item.asOf, item.currency, item.amountKind])))) {
      const [asOf, currency, amountKind] = JSON.parse(group);
      const summary = summarize(positions, { asOf, currency, amountKind });
      const hasUnknownCustodian = positions.some(item => item.asOf === asOf && item.currency === currency && item.amountKind === amountKind && item.custodian === 'UNKNOWN');
      if (hasUnknownCustodian) {
        summary.status = 'REVIEW_REQUIRED';
        summary.totalCents = null;
      }
      globalSummaries.push(summary);
    }
    globalSummaries.sort((a, b) => `${a.asOf}|${a.currency}|${a.amountKind}`.localeCompare(`${b.asOf}|${b.currency}|${b.amountKind}`));
    custodianSummaries.sort((a, b) => `${a.custodian}|${a.asOf}|${a.currency}|${a.amountKind}`.localeCompare(`${b.custodian}|${b.asOf}|${b.currency}|${b.amountKind}`));

    const mixedAsOf = dates.length > 1;
    const mixedAmountKind = amountKinds.length > 1 || currencies.length > 1;
    const conflictsPresent = conflicts.length > 0;
    const reviewRequired = invalidRecords.length > 0 || conflictsPresent || positions.some(item => item.custodian === 'UNKNOWN');
    const onlyGlobal = globalSummaries.length === 1 ? globalSummaries[0] : null;
    const globalTotalCents = !reviewRequired && !mixedAsOf && !mixedAmountKind && onlyGlobal && ['COMPLETE', 'ZERO_CONFIRMED'].includes(onlyGlobal.status)
      ? onlyGlobal.totalCents : null;
    const knownSubtotalCents = !conflictsPresent && onlyGlobal ? onlyGlobal.knownSubtotalCents : null;
    const status = reviewRequired ? 'REVIEW_REQUIRED' : mixedAsOf ? 'MIXED_AS_OF' : mixedAmountKind ? 'MIXED_AMOUNT_KIND'
      : onlyGlobal?.status || 'UNKNOWN';

    return {
      mode: 'READ_ONLY_DRY_RUN',
      mutationCount: 0,
      status,
      invalidRecords,
      conflicts,
      exactSourceDuplicates,
      positionDuplicatesCollapsed,
      positions,
      summaries: custodianSummaries,
      globalSummaries,
      asOfDates: dates,
      globalTotalCents,
      knownSubtotalCents,
    };
  }

  function reconcilePositionTargets(reconciliation = {}, targets = []) {
    const positions = Array.isArray(reconciliation.positions) ? reconciliation.positions : [];
    const invalidRecords = Array.isArray(reconciliation.invalidRecords) ? reconciliation.invalidRecords : [];
    const conflicts = Array.isArray(reconciliation.conflicts) ? reconciliation.conflicts : [];
    const rows = (Array.isArray(targets) ? targets : []).map(target => {
      const invalid = !target || typeof target !== 'object' || !text(target.targetId)
        || !['INTER', 'OUTRO', 'GLOBAL'].includes(target.custodian)
        || !validDate(target.asOf) || !text(target.currency) || !text(target.amountKind)
        || (target.assetClass !== undefined && !text(target.assetClass))
        || !Number.isSafeInteger(target.targetCents) || target.targetCents < 0;
      if (invalid) return { targetId: text(target?.targetId) || null, status: 'INVALID_TARGET', derivedCents: null, deltaCents: null, reason: 'TARGET_FIELDS_INVALID' };

      const inScope = positions.filter(position => position.currency === target.currency
        && position.amountKind === target.amountKind
        && (target.custodian === 'GLOBAL' || position.custodian === target.custodian)
        && (target.assetClass === undefined || position.assetClass === target.assetClass || position.assetClass === null));
      const matching = inScope.filter(position => position.asOf === target.asOf);
      let knownSubtotalCents = 0;
      let hasKnownAmount = false;
      for (const position of matching) {
        if (!Number.isSafeInteger(position.amountCents)) continue;
        knownSubtotalCents += position.amountCents;
        hasKnownAmount = true;
        if (!Number.isSafeInteger(knownSubtotalCents)) return { targetId: target.targetId, status: 'UNKNOWN', reason: 'AMOUNT_OVERFLOW', derivedCents: null, deltaCents: null };
      }
      const base = {
        targetId: target.targetId,
        custodian: target.custodian,
        assetClass: target.assetClass ?? null,
        asOf: target.asOf,
        currency: target.currency,
        amountKind: target.amountKind,
        targetCents: target.targetCents,
        sourceIds: [...new Set(matching.flatMap(position => position.sourceIds || []))].sort(),
        knownSubtotalCents: hasKnownAmount ? knownSubtotalCents : null,
        derivedCents: null,
        deltaCents: null,
        availableAsOf: [...new Set(inScope.map(position => position.asOf))].sort(),
      };

      if (invalidRecords.length) return { ...base, status: 'UNKNOWN', reason: 'INVALID_SOURCE_RECORDS_PRESENT' };
      if (!matching.length) return { ...base, status: inScope.length ? 'AS_OF_MISMATCH' : 'UNKNOWN', reason: inScope.length ? 'NO_POSITION_AT_TARGET_AS_OF' : 'NO_POSITION_EVIDENCE' };

      if (target.custodian !== 'GLOBAL' && positions.some(position => position.custodian === 'UNKNOWN'
        && position.asOf === target.asOf && position.currency === target.currency && position.amountKind === target.amountKind
        && (target.assetClass === undefined || position.assetClass === target.assetClass || position.assetClass === null))) {
        return { ...base, status: 'UNKNOWN', reason: 'UNKNOWN_CUSTODIAN_SCOPE' };
      }
      const matchingConflicts = conflicts.filter(conflict => {
        if (conflict.state === 'SOURCE_ROW_CONFLICT') return (conflict.sourceScopes || []).some(scope => scope.asOf === target.asOf
          && scope.currency === target.currency && scope.amountKind === target.amountKind
          && (target.custodian === 'GLOBAL' || scope.custodian === target.custodian)
          && (target.assetClass === undefined || scope.assetClass === target.assetClass));
        return conflict.asOf === target.asOf && conflict.currency === target.currency && conflict.amountKind === target.amountKind
          && (target.custodian === 'GLOBAL' || conflict.custodian === target.custodian)
          && (target.assetClass === undefined || conflict.assetClass === target.assetClass || conflict.assetClass === null);
      });
      if (matchingConflicts.length || matching.some(position => position.status === 'CONFLICT')) {
        return { ...base, status: 'DUPLICATE_RISK', reason: 'CONFLICTING_SOURCE_IDENTITY', conflictCount: matchingConflicts.length || 1 };
      }
      if (target.assetClass !== undefined && matching.some(position => position.assetClass === null)) {
        return { ...base, status: 'UNKNOWN', reason: 'UNKNOWN_ASSET_CLASS_SCOPE' };
      }
      if (target.custodian === 'GLOBAL' && matching.some(position => position.custodian === 'UNKNOWN')) {
        return { ...base, status: 'UNKNOWN', reason: 'CUSTODIAN_IDENTITY_UNKNOWN' };
      }
      if (matching.some(position => !['COMPLETE', 'ZERO_CONFIRMED'].includes(position.status) || position.amountCents === null)) {
        const unknown = matching.some(position => !['COMPLETE', 'ZERO_CONFIRMED', 'PARTIAL'].includes(position.status) || position.amountCents === null);
        return { ...base, status: unknown ? 'UNKNOWN' : 'PARTIAL', reason: unknown ? 'POSITION_VALUE_OR_COVERAGE_UNKNOWN' : 'POSITION_COVERAGE_PARTIAL' };
      }

      const derivedCents = knownSubtotalCents;
      const deltaCents = derivedCents - target.targetCents;
      return { ...base, knownSubtotalCents: derivedCents, derivedCents, deltaCents, status: deltaCents === 0 ? derivedCents === 0 ? 'ZERO_CONFIRMED' : 'MATCH' : 'MISMATCH', reason: deltaCents === 0 ? 'EXACT_CENT_MATCH' : 'EXACT_CENT_DELTA' };
    });
    return { mode: 'READ_ONLY_DRY_RUN', mutationCount: 0, status: rows.length > 0 && rows.every(row => ['MATCH', 'ZERO_CONFIRMED'].includes(row.status)) ? 'MATCH' : 'REVIEW_REQUIRED', rows };
  }

  function reconcileSummaryDetail(input = {}) {
    const summaryCents = input.summaryCents;
    const detailCents = input.detailCents;
    const base = {
      mode: 'READ_ONLY_DRY_RUN', mutationCount: 0,
      summarySourceId: text(input.summarySourceId) || null,
      detailSourceId: text(input.detailSourceId) || null,
      summaryAsOf: input.summaryAsOf || null,
      detailAsOf: input.detailAsOf || null,
      currency: text(input.summaryCurrency) || null,
      amountKind: text(input.summaryAmountKind) || null,
      summaryCents: Number.isSafeInteger(summaryCents) && summaryCents >= 0 ? summaryCents : null,
      detailCents: Number.isSafeInteger(detailCents) && detailCents >= 0 ? detailCents : null,
      deltaCents: null, status: 'UNKNOWN', reasonCodes: [],
    };
    if (!base.summarySourceId || !base.detailSourceId) return { ...base, reasonCodes: ['MISSING_SOURCE'] };
    if (base.summaryCents === null || base.detailCents === null) return { ...base, reasonCodes: ['UNKNOWN_VALUE'] };
    if (!validDate(input.summaryAsOf) || !validDate(input.detailAsOf)) return { ...base, reasonCodes: ['AS_OF_UNKNOWN'] };
    if (input.summaryAsOf !== input.detailAsOf) return { ...base, status: 'AS_OF_MISMATCH', reasonCodes: ['AS_OF_MISMATCH'] };
    if (!base.currency || !base.amountKind || input.summaryCurrency !== input.detailCurrency || input.summaryAmountKind !== input.detailAmountKind) {
      return { ...base, reasonCodes: ['SCOPE_MISMATCH'] };
    }
    if (!COVERAGES.has(input.summaryCoverage) || !COVERAGES.has(input.detailCoverage)
      || input.summaryCoverage === 'UNKNOWN' || input.detailCoverage === 'UNKNOWN') {
      return { ...base, reasonCodes: ['COVERAGE_UNKNOWN'] };
    }
    if (input.summaryCoverage === 'PARTIAL' || input.detailCoverage === 'PARTIAL') {
      return { ...base, status: 'PARTIAL', reasonCodes: ['PARTIAL_COVERAGE'] };
    }
    const deltaCents = base.detailCents - base.summaryCents;
    if (deltaCents === 0) return { ...base, deltaCents, status: base.summaryCents === 0 ? 'ZERO_CONFIRMED' : 'MATCH_EXACT', reasonCodes: [base.summaryCents === 0 ? 'CONFIRMED_ZERO' : 'EXACT_MATCH'] };
    return {
      ...base, deltaCents,
      status: Math.abs(deltaCents) === 1 ? 'DETAIL_VARIANCE' : 'MISMATCH',
      reasonCodes: [Math.abs(deltaCents) === 1 ? 'DETAIL_VARIANCE_CENT' : 'SOURCE_CONFLICT'],
    };
  }

  return { validateRecord, reconcilePositionSnapshots, reconcilePositionTargets, reconcileSummaryDetail };
});
