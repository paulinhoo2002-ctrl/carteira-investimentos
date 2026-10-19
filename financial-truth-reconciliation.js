'use strict';

(function expose(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FinancialTruthReconciliation = api;
}(typeof globalThis === 'object' ? globalThis : this, function createReconciliation() {
  const SUPPORTED_TREND_PRODUCTS = new Set([
    'TREND DI FIC RF SIMPLES RL',
    'TREND DI II FIC RF SIMPLES RL',
  ]);

  function toCents(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    const scaled = value * 100;
    const rounded = Math.round(scaled);
    return Number.isSafeInteger(rounded) && Math.abs(scaled - rounded) <= 1e-7 ? rounded : null;
  }

  function fromCents(value) {
    return Number.isSafeInteger(value) ? value / 100 : null;
  }

  function nonNegativeCents(value) {
    const amount = toCents(value);
    return amount !== null && amount >= 0 ? amount : null;
  }

  function sumCents(values) {
    if (!values.length) return null;
    let total = 0;
    for (const value of values) {
      if (!Number.isSafeInteger(value)) return null;
      total += value;
      if (!Number.isSafeInteger(total)) return null;
    }
    return total;
  }

  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }

  function copyCoverage(coverage) {
    if (!coverage || typeof coverage !== 'object' || Array.isArray(coverage)) return null;
    return copyPlainValue(coverage);
  }

  function copyPlainValue(value) {
    if (Array.isArray(value)) return value.map(copyPlainValue);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, copyPlainValue(entry)]));
  }

  function copyProvenance(evidence) {
    return Array.isArray(evidence?.sourceEvidence)
      ? evidence.sourceEvidence.map(copyPlainValue)
      : null;
  }

  function provenanceMatchesEvidence(evidence, assetId) {
    const rows = Array.isArray(evidence?.sourceEvidence) ? evidence.sourceEvidence : [];
    const relevant = rows.filter(row => row?.historyRelevant !== false);
    const history = evidence?.coverage?.history;
    if (!relevant.length || !Array.isArray(evidence?.contributions) || !Array.isArray(evidence?.events)) return false;
    if (!history || typeof history !== 'object' || Array.isArray(history)) return false;
    const isDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))
      && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
    const validRows = relevant.every((row) => {
      const opening = row?.semanticType === 'OPENING_POSITION';
      const sourcePeriodMatches = row.periodStart === history.periodStart && row.periodEnd === history.periodEnd;
      const periodProof = opening
        ? history.openingPosition === 'KNOWN' && row.openingPositionCompatible === true
          && row.periodMembership === 'OPENING_COMPATIBLE' && isDate(row.occurredOn) && row.occurredOn < history.periodStart
        : row.periodMembership === 'IN_PERIOD' && isDate(row.occurredOn)
          && row.occurredOn >= history.periodStart && row.occurredOn <= history.periodEnd;
      const amountBasisValid = !['COUPON', 'INTEREST', 'INCOME', 'AMORTIZATION', 'PARTIAL_REDEMPTION', 'TOTAL_REDEMPTION', 'PRINCIPAL_RETURN'].includes(row.semanticType)
        || ['GROSS', 'NET'].includes(row.amountBasis);
      return typeof row?.sourceKind === 'string' && row.sourceKind.trim()
        && typeof row?.sourceId === 'string' && row.sourceId.trim()
        && typeof row?.stableEventId === 'string' && row.stableEventId.trim()
        && row.assetIdentity === assetId
        && typeof row?.authority === 'string' && row.authority.trim()
        && typeof row?.semanticType === 'string' && row.semanticType !== 'UNKNOWN'
        && row.status !== 'UNKNOWN' && row.coverageState === 'COMPLETE'
        && ['NONE', 'RESOLVED'].includes(row.duplicateState)
        && ['NONE', 'RESOLVED'].includes(row.conflictState)
        && ['NONE', 'RESOLVED', 'LINKED_BY_EVENT_ID'].includes(row.sourceOverlapResolution)
        && sourcePeriodMatches && periodProof && amountBasisValid;
    });
    if (!validRows) return false;
    const isMatchingEvent = (row, item, contribution) => row.stableEventId === item?.id
      && row.semanticType === item?.type && row.occurredOn === item?.occurredOn
      && toCents(row.amount) !== null && toCents(row.amount) === toCents(item?.amount)
      && (contribution
        ? row.status === 'CONFIRMED'
        : row.status === 'RECEIVED' || ['IR', 'IOF'].includes(row.semanticType) && row.status === 'PAID')
      && (!['COUPON', 'INTEREST', 'INCOME', 'AMORTIZATION', 'PARTIAL_REDEMPTION', 'TOTAL_REDEMPTION', 'PRINCIPAL_RETURN'].includes(row.semanticType)
        || row.amountBasis === item?.amountBasis)
      && (!['IR', 'IOF'].includes(row.semanticType) || row.relatedEventId === item?.relatedEventId);
    const normalizedEvents = [
      ...evidence.contributions.map(item => ({ item, contribution: true })),
      ...evidence.events.map(item => ({ item, contribution: false })),
    ];
    const representedTypes = new Set([
      'APPLICATION', 'PURCHASE', 'COUPON', 'INTEREST', 'INCOME', 'IR', 'IOF',
      'AMORTIZATION', 'PARTIAL_REDEMPTION', 'TOTAL_REDEMPTION', 'PRINCIPAL_RETURN', 'UNKNOWN',
    ]);
    const economicRows = relevant.filter(row => representedTypes.has(row?.semanticType));
    return economicRows.length === normalizedEvents.length
      && normalizedEvents.every(({ item, contribution }) => relevant.filter(row => isMatchingEvent(row, item, contribution)).length === 1)
      && economicRows.every(row => normalizedEvents.filter(({ item, contribution }) => isMatchingEvent(row, item, contribution)).length === 1);
  }

  function completeEvidenceHistory(history) {
    const isDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))
      && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
    return history?.status === 'COMPLETE'
      && isDate(history.periodStart) && isDate(history.periodEnd)
      && history.periodStart <= history.periodEnd
      && history.openingPosition === 'NONE'
      && history.allEventsRepresented === true
      && history.duplicatesResolved === true
      && history.sourceOverlapResolved === true;
  }

  function reconcileAsset({ asset, currentPosition, evidence, result } = {}) {
    const blockers = new Set();
    const id = typeof asset?.id === 'string' && asset.id.trim() ? asset.id.trim() : null;
    if (!id) blockers.add('ASSET_ID_UNKNOWN');

    const assetClass = typeof asset?.type === 'string' ? asset.type.trim().toLocaleLowerCase('pt-BR') : '';
    if (assetClass !== 'renda fixa') {
      blockers.add('ASSET_CLASS_NOT_SUPPORTED');
      return freeze({
        assetId: id,
        status: 'NOT_AVAILABLE',
        currentPosition: { value: null, coverage: 'UNKNOWN' },
        contributions: { value: null, coverage: 'UNKNOWN' },
        incomeNet: { value: null, coverage: 'UNKNOWN' },
        capitalReturnNet: { value: null, coverage: 'UNKNOWN' },
        paidTaxes: { value: null, coverage: 'UNKNOWN' },
        economicResult: { value: null, coverage: 'UNKNOWN' },
        contributedCapital: { value: null, coverage: 'UNKNOWN' },
        returnPercent: { value: null, coverage: 'UNKNOWN' },
        coverage: null,
        provenance: null,
        blockers: [...blockers],
      });
    }

    const positionCents = currentPosition?.coverage === 'COMPLETE' ? nonNegativeCents(currentPosition.value) : null;
    const position = {
      value: fromCents(positionCents),
      coverage: positionCents === null ? (currentPosition?.coverage === 'PARTIAL' ? 'PARTIAL' : 'UNKNOWN') : 'COMPLETE',
    };
    if (positionCents === null) blockers.add('CURRENT_POSITION_NOT_COMPLETE');

    const productName = typeof asset?.name === 'string' ? asset.name.trim().toLocaleUpperCase('pt-BR') : '';
    if (/MOVIDA/.test(productName) || /CRA\s+JBS/.test(productName)) {
      blockers.add('SOURCE_FIELDS_AMBIGUOUS');
      return freeze({
        assetId: id,
        status: 'PARTIAL',
        currentPosition: position,
        contributions: { value: null, coverage: 'UNKNOWN' },
        incomeNet: { value: null, coverage: 'UNKNOWN' },
        capitalReturnNet: { value: null, coverage: 'UNKNOWN' },
        paidTaxes: { value: null, coverage: 'UNKNOWN' },
        economicResult: { value: null, coverage: 'PARTIAL' },
        contributedCapital: { value: null, coverage: 'UNKNOWN' },
        returnPercent: { value: null, coverage: 'UNKNOWN' },
        coverage: copyCoverage(evidence?.coverage),
        provenance: copyProvenance(evidence),
        blockers: [...blockers],
      });
    }
    if (!SUPPORTED_TREND_PRODUCTS.has(productName)) blockers.add('PRODUCT_IDENTITY_UNSUPPORTED');

    const isDerived = result?.status === 'DERIVED_WITH_COMPLETE_HISTORY'
      && result.coverage?.history === 'COMPLETE'
      && result.coverage?.totalResult === 'DERIVED'
      && toCents(result.totalEconomicResult) !== null;
    const evidenceCoverage = evidence?.coverage;
    const overlapProven = evidenceCoverage?.history?.sourceOverlapResolved === true;
    const provenanceProven = evidence?.provenanceComplete === true
      && Array.isArray(evidence?.blockers) && evidence.blockers.length === 0
      && provenanceMatchesEvidence(evidence, id);
    const evidenceHistoryComplete = completeEvidenceHistory(evidenceCoverage?.history);
    if (!overlapProven) blockers.add('SOURCE_OVERLAP_NOT_RESOLVED');
    if (!provenanceProven) blockers.add('PROVENANCE_NOT_COMPLETE');
    if (!evidenceHistoryComplete) blockers.add('EVIDENCE_HISTORY_NOT_COMPLETE');

    if (isDerived && position.coverage === 'COMPLETE' && overlapProven && provenanceProven
      && evidenceHistoryComplete && blockers.size === 0) {
      const contributionCents = toCents(result.totalContributedCapital);
      const returnValue = result.coverage?.totalReturnPercent === 'DERIVED'
        && typeof result.totalReturnPercent === 'number' && Number.isFinite(result.totalReturnPercent)
        ? result.totalReturnPercent : null;
      return freeze({
        assetId: id,
        status: 'COMPLETE',
        currentPosition: position,
        contributions: {
          value: evidenceCoverage?.contributions === 'COMPLETE' ? fromCents(contributionCents) : null,
          coverage: evidenceCoverage?.contributions === 'COMPLETE' && contributionCents !== null ? 'COMPLETE' : 'UNKNOWN',
        },
        incomeNet: {
          value: evidenceCoverage?.income === 'COMPLETE' ? result.incomeNet : null,
          coverage: evidenceCoverage?.income === 'COMPLETE' && toCents(result.incomeNet) !== null ? 'COMPLETE' : 'UNKNOWN',
        },
        capitalReturnNet: {
          value: evidenceCoverage?.capitalReturns === 'COMPLETE' ? result.capitalReturnNet : null,
          coverage: evidenceCoverage?.capitalReturns === 'COMPLETE' && toCents(result.capitalReturnNet) !== null ? 'COMPLETE' : 'UNKNOWN',
        },
        paidTaxes: {
          value: evidenceCoverage?.taxes === 'COMPLETE' ? result.taxesPaid : null,
          coverage: evidenceCoverage?.taxes === 'COMPLETE' && toCents(result.taxesPaid) !== null ? 'COMPLETE' : 'UNKNOWN',
        },
        economicResult: { value: fromCents(toCents(result.totalEconomicResult)), coverage: 'COMPLETE' },
        contributedCapital: { value: fromCents(contributionCents), coverage: contributionCents === null ? 'UNKNOWN' : 'COMPLETE' },
        returnPercent: { value: returnValue, coverage: returnValue === null ? 'UNKNOWN' : 'COMPLETE' },
        coverage: copyCoverage(evidenceCoverage),
        provenance: copyProvenance(evidence),
        blockers: [],
      });
    }

    if (result?.status === 'PARTIAL' || result?.status === 'DERIVED_WITH_COMPLETE_HISTORY') blockers.add('ECONOMIC_RESULT_NOT_CERTIFIED');
    else blockers.add('ECONOMIC_RESULT_UNKNOWN');
    return freeze({
      assetId: id,
      status: result?.status === 'PARTIAL' || position.coverage !== 'UNKNOWN'
        || currentPosition?.coverage === 'COMPLETE' ? 'PARTIAL' : 'UNKNOWN',
      currentPosition: position,
      contributions: { value: null, coverage: evidenceCoverage?.contributions === 'PARTIAL' ? 'PARTIAL' : 'UNKNOWN' },
      incomeNet: { value: null, coverage: evidenceCoverage?.income === 'PARTIAL' ? 'PARTIAL' : 'UNKNOWN' },
      capitalReturnNet: { value: null, coverage: evidenceCoverage?.capitalReturns === 'PARTIAL' ? 'PARTIAL' : 'UNKNOWN' },
      paidTaxes: { value: null, coverage: evidenceCoverage?.taxes === 'PARTIAL' ? 'PARTIAL' : 'UNKNOWN' },
      economicResult: { value: null, coverage: result?.status === 'PARTIAL' ? 'PARTIAL' : 'UNKNOWN' },
      contributedCapital: { value: null, coverage: 'UNKNOWN' },
      returnPercent: { value: null, coverage: 'UNKNOWN' },
      coverage: copyCoverage(evidenceCoverage),
      provenance: copyProvenance(evidence),
      blockers: [...blockers, ...(Array.isArray(result?.blockers) ? result.blockers : [])],
    });
  }

  function aggregatePortfolio({ assets, reconciliations, inventoryCoverage } = {}) {
    const rows = Array.isArray(assets) ? assets : [];
    const results = Array.isArray(reconciliations) ? reconciliations : [];
    const blockers = new Set();
    if (inventoryCoverage !== 'COMPLETE') blockers.add('PORTFOLIO_INVENTORY_NOT_COMPLETE');
    if (!Array.isArray(assets)) blockers.add('ASSET_INVENTORY_UNKNOWN');
    if (!Array.isArray(reconciliations)) blockers.add('ASSET_RECONCILIATIONS_UNKNOWN');

    const ids = rows.map((asset) => typeof asset?.id === 'string' ? asset.id.trim() : '');
    const validIds = ids.filter(Boolean);
    if (validIds.length !== ids.length || new Set(validIds).size !== validIds.length) blockers.add('DUPLICATE_ASSET_ID');
    const byId = new Map();
    for (const reconciliation of results) {
      if (!reconciliation?.assetId || byId.has(reconciliation.assetId)) blockers.add('DUPLICATE_ASSET_RECONCILIATION');
      else byId.set(reconciliation.assetId, reconciliation);
    }

    const certifiedAssets = [];
    const partialAssets = [];
    const unknownAssets = [];
    const excludedAssets = [];
    const certifiedEconomicCents = [];
    const certifiedMarketCents = [];
    const certifiedContributionCents = [];
    let allContributionsKnown = true;
    let allComplete = rows.length > 0 && inventoryCoverage === 'COMPLETE' && blockers.size === 0;

    for (const id of validIds) {
      const reconciliation = byId.get(id);
      if (!reconciliation) {
        blockers.add('ASSET_RECONCILIATION_MISSING');
        unknownAssets.push(id);
        allComplete = false;
        continue;
      }
      if (reconciliation.status === 'NOT_AVAILABLE') excludedAssets.push(id);
      if (reconciliation.status !== 'COMPLETE') allComplete = false;
      if (reconciliation.status === 'COMPLETE') {
        const resultCents = toCents(reconciliation.economicResult?.value);
        const marketCents = reconciliation.currentPosition?.coverage === 'COMPLETE'
          ? nonNegativeCents(reconciliation.currentPosition.value) : null;
        if (resultCents === null || marketCents === null) {
          blockers.add('CERTIFIED_COMPONENT_INVALID');
          unknownAssets.push(id);
          allComplete = false;
          continue;
        }
        certifiedAssets.push(id);
        certifiedEconomicCents.push(resultCents);
        certifiedMarketCents.push(marketCents);
        const contributionCents = toCents(reconciliation.contributedCapital?.value);
        if (reconciliation.contributedCapital?.coverage === 'COMPLETE' && contributionCents !== null) certifiedContributionCents.push(contributionCents);
        else allContributionsKnown = false;
      } else if (reconciliation.status === 'PARTIAL') {
        partialAssets.push(id);
        allComplete = false;
      } else {
        unknownAssets.push(id);
        allComplete = false;
      }
    }
    if (results.length !== rows.length) allComplete = false;

    const subsetResultCents = certifiedEconomicCents.length ? sumCents(certifiedEconomicCents) : null;
    const subsetMarketCents = certifiedMarketCents.length ? sumCents(certifiedMarketCents) : null;
    const contributionCents = allContributionsKnown && certifiedAssets.length > 0
      ? sumCents(certifiedContributionCents) : null;
    const subtotalReturn = subsetResultCents !== null && contributionCents > 0
      ? Number(((subsetResultCents / contributionCents) * 100).toFixed(2)) : null;
    const complete = allComplete && certifiedAssets.length === rows.length;

    if (!complete && rows.length > 0) blockers.add('PORTFOLIO_COMPONENTS_NOT_COMPLETE');
    if (complete && (subsetResultCents === null || subsetMarketCents === null)) blockers.add('PORTFOLIO_TOTAL_OUT_OF_RANGE');

    const totalEconomicResult = complete && subsetResultCents !== null ? fromCents(subsetResultCents) : null;
    const totalReturnPct = complete && subtotalReturn !== null ? subtotalReturn : null;
    return freeze({
      status: complete && blockers.size === 0 ? 'COMPLETE' : rows.length === 0 ? 'UNKNOWN' : 'PARTIAL',
      certifiedAssets,
      partialAssets,
      unknownAssets,
      excludedAssets,
      certifiedCurrentMarket: fromCents(subsetMarketCents),
      certifiedEconomicResult: fromCents(subsetResultCents),
      certifiedReturnPct: subtotalReturn,
      certifiedSubtotal: {
        scope: 'CERTIFIED_SUBSET',
        currentMarket: fromCents(subsetMarketCents),
        economicResult: fromCents(subsetResultCents),
        returnPct: subtotalReturn,
      },
      totalEconomicResult,
      totalReturnPct,
      coverageRatio: rows.length ? Number((certifiedAssets.length / rows.length).toFixed(4)) : null,
      blockers: [...blockers],
    });
  }

  return Object.freeze({ reconcileAsset, aggregatePortfolio });
}));
