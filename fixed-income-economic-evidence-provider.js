'use strict';

(function expose(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FixedIncomeEconomicEvidenceProvider = api;
}(typeof globalThis === 'object' ? globalThis : this, function createProvider(root) {
  const provenance = root?.FinancialEvidenceProvenance || (typeof require === 'function' ? require('./financial-evidence-provenance.js') : null);
  const coverageEngine = root?.HistoricalCoverageEngine || (typeof require === 'function' ? require('./historical-coverage-engine.js') : null);
  const PRODUCTS = new Set(['TREND DI FIC RF SIMPLES RL', 'TREND DI II FIC RF SIMPLES RL']);
  const TYPE_MAP = new Map([
    ['APORTE', 'APPLICATION'], ['APLICACAO', 'APPLICATION'], ['COMPRA', 'PURCHASE'],
    ['JUROS', 'COUPON'], ['CUPOM', 'COUPON'], ['INTEREST', 'INTEREST'], ['INCOME', 'INCOME'],
    ['IR', 'IR'], ['IRRF', 'IR'], ['IOF', 'IOF'], ['AMORTIZACAO', 'AMORTIZATION'],
    ['RESGATE PARCIAL', 'PARTIAL_REDEMPTION'], ['RESGATE TOTAL', 'TOTAL_REDEMPTION'],
    ['PRINCIPAL DEVOLVIDO', 'PRINCIPAL_RETURN'], ['PRINCIPAL RETURN', 'PRINCIPAL_RETURN'],
  ]);
  function norm(value) {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  }

  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = Date.parse(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
  }

  function productIdentity(asset) {
    if (asset?.type !== 'Renda Fixa') return null;
    const candidates = ['name', 'product', 'title'].map(key => norm(asset?.[key])).filter(Boolean);
    const supported = [...new Set(candidates.filter(value => PRODUCTS.has(value)))];
    if (supported.length !== 1 || candidates.some(value => !PRODUCTS.has(value) && value.includes('TREND DI'))) return null;
    return supported[0];
  }

  function eventType(event) {
    return TYPE_MAP.get(norm(event?.type)) || 'UNKNOWN';
  }

  function stableId(event) {
    const id = typeof event?.id === 'string' || typeof event?.id === 'number' ? String(event.id).trim() : '';
    if (!id) return '';
    if (event?.autoKey && id === `rf_${String(event.autoKey).trim()}`) return '';
    return id;
  }

  function sourceRows(asset, assets, rows = []) {
    const assetId = String(asset?.id || asset?.assetId || asset?.rf_asset_id || '').trim();
    const ticker = norm(asset?.ticker);
    const sameTicker = (Array.isArray(assets) ? assets : []).filter(row => norm(row?.ticker) === ticker && ticker);
    let ambiguous = false;
    const selected = (Array.isArray(rows) ? rows : []).filter(row => {
      const rowAssetId = String(row?.assetId || row?.asset_id || '').trim();
      if (rowAssetId) return !!assetId && rowAssetId === assetId;
      if (!ticker || norm(row?.ticker) !== ticker) return false;
      if (sameTicker.length !== 1) { ambiguous = true; return false; }
      return true;
    });
    return { rows: selected, ambiguous };
  }

  function amountFor(row, category) {
    if (typeof row?.amount === 'number' && Number.isFinite(row.amount) && row.amount > 0) {
      if (category === 'receipt' && !['GROSS', 'NET'].includes(row.amountBasis)) return null;
      return { amount: row.amount, amountBasis: category === 'receipt' ? row.amountBasis : undefined };
    }
    if (category === 'contribution' && typeof row?.principalDelta === 'number' && Number.isFinite(row.principalDelta) && row.principalDelta > 0) {
      return { amount: row.principalDelta };
    }
    if (category === 'tax') {
      const value = row?.value;
      return typeof value === 'number' && Number.isFinite(value) && value > 0 ? { amount: value } : null;
    }
    if (category === 'receipt' && typeof row?.netValue === 'number' && Number.isFinite(row.netValue) && row.netValue > 0) {
      return { amount: row.netValue, amountBasis: 'NET' };
    }
    return null;
  }

  function duplicateKey(row, kind) {
    return [String(row?.date || ''), norm(row?.type), String(row?.amount ?? row?.netValue ?? row?.principalDelta ?? ''), kind].join('|');
  }

  function buildEvidence({
    asset, assets = [], events = [], aportes = [], linkedIncomeEvents = [],
    historyEvidence = null, currentPositionCoverage = 'UNKNOWN', currentPositionProvenance = null,
  } = {}) {
    const product = productIdentity(asset);
    if (!product) return null;

    const blockers = new Set();
    const selected = sourceRows(asset, assets, events);
    const assetId = String(asset?.id || asset?.assetId || asset?.rf_asset_id || '').trim();
    const selectedEvents = selected.rows;
    const eventsByStableId = new Map();
    for (const row of selectedEvents) {
      const id = stableId(row);
      if (!id) continue;
      if (!eventsByStableId.has(id)) eventsByStableId.set(id, []);
      eventsByStableId.get(id).push(row);
    }
    const hasValidTaxLink = id => {
      const linked = eventsByStableId.get(String(id || '').trim()) || [];
      if (linked.length !== 1) return false;
      const row = linked[0];
      return ['COUPON', 'INTEREST', 'INCOME', 'AMORTIZATION', 'PARTIAL_REDEMPTION', 'TOTAL_REDEMPTION', 'PRINCIPAL_RETURN'].includes(eventType(row))
        && row?.status === 'RECEIVED' && validDate(row?.date) && Boolean(amountFor(row, 'receipt'));
    };
    if (selected.ambiguous) blockers.add('AMBIGUOUS_ASSET_LINK');
    const contributions = [];
    const normalizedEvents = [];
    const provenanceRows = [];
    if (historyEvidence?.openingPosition === 'KNOWN' && historyEvidence.openingPositionEvidence && typeof historyEvidence.openingPositionEvidence === 'object') {
      const opening = historyEvidence.openingPositionEvidence;
      provenanceRows.push({
        ...opening,
        sourceKind: opening.sourceKind || null,
        sourceId: opening.sourceId || null,
        stableEventId: opening.stableEventId || null,
        assetIdentity: opening.assetIdentity || null,
        occurredOn: opening.asOfDate || opening.occurredOn || null,
        semanticType: 'OPENING_POSITION',
        periodStart: historyEvidence.periodStart,
        periodEnd: historyEvidence.periodEnd,
        duplicateState: opening.duplicateState || 'UNKNOWN',
        conflictState: opening.conflictState || 'UNKNOWN',
        historyRelevant: true,
      });
    }
    if (currentPositionProvenance && typeof currentPositionProvenance === 'object') provenanceRows.push({
      sourceKind: 'CURRENT_POSITION', sourceId: currentPositionProvenance.sourceId || 'S.assets',
      stableEventId: null, assetIdentity: currentPositionProvenance.assetIdentity || assetId || null,
      occurredOn: null, observedAt: currentPositionProvenance.observedAt || null,
      authority: currentPositionProvenance.authority || null, semanticType: 'CURRENT_POSITION',
      status: currentPositionProvenance.status || 'UNKNOWN', periodStart: null, periodEnd: null,
      duplicateState: 'NOT_APPLICABLE', conflictState: 'NOT_APPLICABLE', historyRelevant: false,
    });
    const seenIds = new Set();
    const duplicateKeys = new Set();
    let eventsSupported = true;
    let contributionsSupported = true;
    let incomePresent = false;
    let taxEvidencePresent = false;
    let returnsPresent = false;
    let unknownTypePresent = false;
    let openingPosition = historyEvidence?.openingPosition || 'UNKNOWN';

    for (const row of selectedEvents) {
      const type = eventType(row);
      const id = stableId(row);
      const date = typeof row?.date === 'string' ? row.date : '';
      const duplicateId = Boolean(id && seenIds.has(id));
      const fingerprint = duplicateKey(row, type);
      const possibleDuplicate = duplicateKeys.has(fingerprint);
      const provenanceRow = {
        sourceKind: 'RF_EVENT', sourceId: row?.sourceId || row?.sourceRecordId || row?.importRef || null,
        stableEventId: id || null, assetIdentity: row?.assetId || row?.asset_id || null,
        occurredOn: date, observedAt: row?.observedAt || null,
        authority: row?.authority || row?.sourceAuthority || null,
        semanticType: type, amountBasis: row?.amountBasis || null, status: row?.status || 'UNKNOWN',
        periodStart: historyEvidence?.periodStart, periodEnd: historyEvidence?.periodEnd,
        duplicateState: duplicateId ? 'DUPLICATE_ID' : possibleDuplicate ? 'POSSIBLE_DUPLICATE' : id ? 'NONE' : 'UNKNOWN',
        conflictState: row?.conflictState || 'UNKNOWN', duplicateFingerprint: fingerprint,
      };
      provenanceRows.push(provenanceRow);
      const linkedBaseline = norm(row?.source) === 'MIGRACAO'
        && (norm(row?.note).includes('SALDO INICIAL') || type === 'APPLICATION');
      if (linkedBaseline) {
        openingPosition = 'UNKNOWN';
        blockers.add('OPENING_POSITION_FROM_MIGRATION');
        continue;
      }
      if (!id || duplicateId) {
        eventsSupported = false;
        contributionsSupported = false;
        blockers.add(id ? 'DUPLICATE_EVENT_ID' : 'EVENT_ID_NOT_STABLE');
      }
      if (id) seenIds.add(id);
      if (possibleDuplicate) {
        eventsSupported = false;
        contributionsSupported = false;
        blockers.add('POSSIBLE_DUPLICATE_SOURCE_EVENT');
      }
      duplicateKeys.add(fingerprint);
      if (!validDate(date)) {
        eventsSupported = false;
        contributionsSupported = false;
        blockers.add('EVENT_DATE_UNKNOWN');
      }
      if (historyEvidence && validDate(historyEvidence.periodStart) && validDate(historyEvidence.periodEnd)
        && historyEvidence.periodStart <= historyEvidence.periodEnd
        && (date < historyEvidence.periodStart || date > historyEvidence.periodEnd)) {
        eventsSupported = false;
        contributionsSupported = false;
        blockers.add('EVENT_OUTSIDE_HISTORY_PERIOD');
      }

      if (['APPLICATION', 'PURCHASE'].includes(type)) {
        const sourceAmount = amountFor(row, 'contribution');
        provenanceRow.amount = sourceAmount?.amount ?? null;
        const status = row?.status === 'CONFIRMED' ? 'CONFIRMED' : 'UNKNOWN';
        provenanceRow.status = status;
        if (!sourceAmount || !id || !validDate(date) || status !== 'CONFIRMED') {
          contributionsSupported = false;
          blockers.add('CONTRIBUTION_EVIDENCE_INCOMPLETE');
        }
        contributions.push({ id, type, amount: status === 'CONFIRMED' ? sourceAmount?.amount ?? null : null, status, occurredOn: date });
        continue;
      }

      if (type === 'UNKNOWN') {
        unknownTypePresent = true;
        eventsSupported = false;
        provenanceRow.status = 'UNKNOWN';
        normalizedEvents.push({ id, type: 'UNKNOWN', amount: null, status: 'UNKNOWN', occurredOn: date });
        blockers.add('UNKNOWN_EVENT_TYPE');
        continue;
      }

      if (['IR', 'IOF'].includes(type)) {
        taxEvidencePresent = true;
        const sourceAmount = amountFor(row, 'tax');
        provenanceRow.amount = sourceAmount?.amount ?? null;
        const relatedEventId = String(row?.relatedEventId || '').trim();
        const taxLinked = hasValidTaxLink(relatedEventId);
        const status = row?.status === 'PAID' && taxLinked ? 'PAID' : 'UNKNOWN';
        provenanceRow.status = sourceAmount && id && validDate(date) && status === 'PAID' ? 'PAID' : 'UNKNOWN';
        provenanceRow.relatedEventId = relatedEventId;
        if (!sourceAmount || !id || !validDate(date) || status !== 'PAID') {
          eventsSupported = false;
          blockers.add(row?.status === 'POTENTIAL' ? 'POTENTIAL_TAX_NOT_PAID' : !taxLinked ? 'TAX_LINK_UNVERIFIED' : 'TAX_EVIDENCE_INCOMPLETE');
        }
        normalizedEvents.push({ id, type, amount: status === 'PAID' ? sourceAmount?.amount ?? null : null, status, relatedEventId, occurredOn: date });
        continue;
      }

      const isIncome = ['COUPON', 'INTEREST', 'INCOME'].includes(type);
      const isCapitalReturn = ['AMORTIZATION', 'PARTIAL_REDEMPTION', 'TOTAL_REDEMPTION', 'PRINCIPAL_RETURN'].includes(type);
      const sourceAmount = amountFor(row, 'receipt');
      provenanceRow.amount = sourceAmount?.amount ?? null;
      const status = row?.status === 'RECEIVED' ? 'RECEIVED' : 'UNKNOWN';
      provenanceRow.status = sourceAmount && id && validDate(date) && status === 'RECEIVED' ? 'RECEIVED' : 'UNKNOWN';
      provenanceRow.amountBasis = sourceAmount?.amountBasis || null;
      if (isIncome) incomePresent = true;
      if (isCapitalReturn) returnsPresent = true;
      if (!sourceAmount || !id || !validDate(date) || status !== 'RECEIVED') {
        eventsSupported = false;
        blockers.add(row?.status === 'EXPECTED' ? 'EXPECTED_NOT_RECEIVED' : 'RECEIPT_EVIDENCE_INCOMPLETE');
      }
      if ((Number(row?.ir) > 0 || Number(row?.iof) > 0) && !row?.taxLinkVerified) {
        taxEvidencePresent = true;
        eventsSupported = false;
        provenanceRow.conflictState = 'UNRESOLVED';
        blockers.add('INLINE_TAX_NOT_VERIFIED_AS_PAID');
      }
      normalizedEvents.push({ id, type, amount: status === 'RECEIVED' ? sourceAmount?.amount ?? null : null, amountBasis: sourceAmount?.amountBasis, status, occurredOn: date });
    }

    // Legacy aportes may duplicate or extend the RF ledger; do not infer linkage from matching amounts.
    const legacyRows = sourceRows(asset, assets, aportes);
    if (legacyRows.ambiguous) blockers.add('AMBIGUOUS_LEGACY_CONTRIBUTION_LINK');
    const legacyPurchases = legacyRows.rows.filter(row => {
      const type = row?.type || row?.asset_type;
      const operation = norm(row?.operation || row?.kind || row?.movementKind);
      return type === 'Renda Fixa' && ['COMPRA', 'APORTE', 'APLICACAO'].includes(operation);
    });
    if (legacyPurchases.length) {
      contributionsSupported = false;
      blockers.add('UNLINKED_LEGACY_PURCHASES');
      for (const row of legacyPurchases) {
        const id = typeof row?.id === 'string' || typeof row?.id === 'number' ? String(row.id) : '';
        const operation = norm(row?.operation || row?.kind || row?.movementKind);
        provenanceRows.push({
          sourceKind: 'LEGACY_APORTE', sourceId: row?.sourceId || row?.sourceRecordId || row?.importRef || null,
          stableEventId: id || null, assetIdentity: row?.assetId || row?.asset_id || null,
          occurredOn: typeof row?.date === 'string' ? row.date : '', observedAt: row?.observedAt || null,
          authority: row?.authority || row?.sourceAuthority || null,
          semanticType: operation === 'COMPRA' ? 'PURCHASE' : 'APPLICATION',
          status: row?.status === 'CONFIRMED' ? 'CONFIRMED' : 'UNKNOWN',
          periodStart: historyEvidence?.periodStart, periodEnd: historyEvidence?.periodEnd,
          duplicateState: id ? 'NONE' : 'UNKNOWN', conflictState: row?.conflictState || 'UNKNOWN',
          sourceOverlapResolution: row?.sourceEventId && seenIds.has(String(row.sourceEventId)) ? 'LINKED_BY_EVENT_ID' : 'UNRESOLVED',
          duplicateFingerprint: [row?.date || '', operation, row?.total ?? row?.amount ?? row?.value ?? ''].join('|'),
        });
        const amount = [row?.total, row?.amount, row?.value].find(value => typeof value === 'number' && Number.isFinite(value) && value > 0);
        contributions.push({ id, type: norm(row?.operation) === 'COMPRA' ? 'PURCHASE' : 'APPLICATION', amount: amount ?? null, status: row?.status === 'CONFIRMED' ? 'CONFIRMED' : 'UNKNOWN', occurredOn: String(row?.date || '') });
      }
    }

    if (!contributions.length) {
      contributionsSupported = false;
      blockers.add('CONTRIBUTION_HISTORY_MISSING');
    }

    const linkedCounts = new Map();
    let orphanLinkedIncome = false;
    const targetTicker = norm(asset?.ticker);
    const targetName = norm(asset?.name || asset?.product || asset?.title);
    for (const row of Array.isArray(linkedIncomeEvents) ? linkedIncomeEvents : []) {
      if (String(row?.sourceEventKind || '').toLowerCase() !== 'rf') continue;
      const sourceId = String(row?.sourceEventId || '').trim();
      const linkedTicker = norm(row?.ticker);
      const linkedName = norm(row?.assetName || row?.name || row?.product);
      const relevant = (sourceId && seenIds.has(sourceId))
        || (targetTicker && linkedTicker === targetTicker)
        || (targetName && linkedName === targetName);
      if (!relevant) continue;
      provenanceRows.push({
        sourceKind: 'LINKED_PROVENTO_REFERENCE', sourceId: row?.id || row?.autoKey || null,
        stableEventId: sourceId || null, assetIdentity: assetId || null,
        occurredOn: typeof row?.date === 'string' ? row.date : '', observedAt: row?.observedAt || null,
        authority: sourceId && seenIds.has(sourceId) ? 'LINKED_EVENT_ID' : null,
        semanticType: 'LINKED_REFERENCE', status: sourceId && seenIds.has(sourceId) ? 'REFERENCE' : 'UNKNOWN',
        periodStart: historyEvidence?.periodStart, periodEnd: historyEvidence?.periodEnd,
        duplicateState: sourceId ? 'NONE' : 'UNKNOWN', conflictState: 'NONE',
        sourceOverlapResolution: sourceId && seenIds.has(sourceId) ? 'LINKED_BY_EVENT_ID' : 'UNRESOLVED',
      });
      if (!sourceId || !seenIds.has(sourceId)) { orphanLinkedIncome = true; continue; }
      const linkedEvent = provenanceRows.find(item => item.sourceKind === 'RF_EVENT' && item.stableEventId === sourceId);
      if (linkedEvent) {
        linkedEvent.sourceOverlapResolution = 'LINKED_BY_EVENT_ID';
        const linkedReference = provenanceRows[provenanceRows.length - 1];
        linkedReference.occurredOn = linkedEvent.occurredOn;
      }
      linkedCounts.set(sourceId, (linkedCounts.get(sourceId) || 0) + 1);
    }
    if (orphanLinkedIncome || [...linkedCounts.values()].some(count => count > 1)) {
      eventsSupported = false;
      blockers.add(orphanLinkedIncome ? 'ORPHAN_LINKED_INCOME_SOURCE' : 'DUPLICATE_LINKED_INCOME_SOURCE');
    }

    const provenHistory = historyEvidence ? { ...historyEvidence, openingPosition } : null;
    const registry = provenance?.createRegistry?.(provenanceRows, {
      duplicatesResolved: provenHistory?.duplicatesResolved === true,
      sourceOverlapResolved: provenHistory?.sourceOverlapResolved === true,
    }) || { sourceEvidence: [], provenanceComplete: false, duplicatesResolved: false, sourceOverlapResolved: false, blockers: ['PROVENANCE_REGISTRY_UNAVAILABLE'] };
    const componentCoverage = {
      currentPosition: ['COMPLETE', 'PARTIAL', 'UNKNOWN'].includes(currentPositionCoverage) ? currentPositionCoverage : 'UNKNOWN',
      costBasis: 'UNKNOWN',
      contributions: !contributionsSupported ? contributions.length ? 'PARTIAL' : 'UNKNOWN'
        : provenHistory?.coverage?.contributions === 'COMPLETE' && contributions.length ? 'COMPLETE' : contributions.length ? 'PARTIAL' : 'UNKNOWN',
      income: unknownTypePresent || (!eventsSupported && incomePresent) ? 'PARTIAL'
        : provenHistory?.coverage?.income === 'COMPLETE' ? 'COMPLETE' : incomePresent ? 'PARTIAL' : 'UNKNOWN',
      taxes: unknownTypePresent || (!eventsSupported && taxEvidencePresent) ? 'PARTIAL'
        : provenHistory?.coverage?.taxes === 'COMPLETE' ? 'COMPLETE' : taxEvidencePresent ? 'PARTIAL' : 'UNKNOWN',
      capitalReturns: unknownTypePresent || (!eventsSupported && returnsPresent) ? 'PARTIAL'
        : provenHistory?.coverage?.capitalReturns === 'COMPLETE' ? 'COMPLETE' : returnsPresent ? 'PARTIAL' : 'UNKNOWN',
      principal: provenHistory?.coverage?.principal === 'COMPLETE' ? 'COMPLETE' : 'UNKNOWN',
    };
    const evaluated = coverageEngine?.evaluateCoverage?.({
      historyEvidence: provenHistory,
      registry,
      componentCoverage,
      subjectIdentity: assetId || null,
      subjectPresent: true,
      additionalBlockers: [...blockers],
    }) || { coverage: { ...componentCoverage, history: { status: 'PARTIAL', periodStart: null, periodEnd: null, openingPosition, allEventsRepresented: false, duplicatesResolved: false, sourceOverlapResolved: false } }, blockers: ['HISTORICAL_COVERAGE_ENGINE_UNAVAILABLE'] };
    const structuralHistoryComplete = evaluated.coverage.history.status === 'COMPLETE'
      && eventsSupported && contributionsSupported && blockers.size === 0;
    if (!structuralHistoryComplete) blockers.add('RUNTIME_HISTORY_NOT_PROVEN_COMPLETE');
    for (const blocker of registry.blockers) blockers.add(blocker);
    for (const blocker of evaluated.blockers) blockers.add(blocker);
    return Object.freeze({
      product,
      remainingCostBasis: null,
      contributions: Object.freeze(contributions),
      events: Object.freeze(normalizedEvents),
      sourceEvidence: registry.sourceEvidence,
      coverage: evaluated.coverage,
      returnPercentBasis: structuralHistoryComplete ? 'CUMULATIVE_CONTRIBUTIONS_SIMPLE' : undefined,
      blockers: Object.freeze([...blockers]),
    });
  }

  return Object.freeze({ buildEvidence });
}));
