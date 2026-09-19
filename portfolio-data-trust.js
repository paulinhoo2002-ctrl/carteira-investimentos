'use strict';

(function exposePortfolioDataTrust(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PortfolioDataTrust = api;
})(typeof globalThis === 'object' ? globalThis : this, function createPortfolioDataTrust() {
  const DAY = 24 * 60 * 60 * 1000;
  const STATUS = Object.freeze({
    CURRENT: 'CURRENT',
    STALE: 'STALE',
    UNKNOWN: 'UNKNOWN',
    UNAVAILABLE: 'UNAVAILABLE',
    UNSUPPORTED: 'UNSUPPORTED',
    MANUAL: 'MANUAL',
    REFERENCE: 'REFERENCE',
    SHADOW: 'SHADOW',
    OK: 'OK',
    MISMATCH: 'MISMATCH',
    NOT_COMPARABLE: 'NOT_COMPARABLE',
  });

  const text = value => String(value ?? '').trim();
  const finite = value => Number.isFinite(Number(value)) ? Number(value) : null;
  const list = value => Array.isArray(value) ? value : [];
  const upper = value => text(value).toUpperCase();

  function timestamp(value) {
    const raw = text(value);
    if (!raw) return null;
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function firstDate(record = {}) {
    return ['quoteUpdatedAt', 'quote_updated_at', 'sourceAsOf', 'source_as_of', 'valuationAsOf', 'valuation_as_of', 'financialAsOf', 'financial_as_of', 'observedAt', 'observed_at', 'updatedAt', 'updated_at']
      .map(key => ({ key, value: record?.[key] }))
      .map(item => ({ ...item, parsed: timestamp(item.value) }))
      .find(item => item.parsed !== null) || null;
  }

  function freshness(record = {}, { now = Date.now(), staleAfterDays = 3 } = {}) {
    const date = firstDate(record);
    if (!date) return { status: STATUS.UNKNOWN, timestamp: null, ageDays: null, field: '', reason: 'Data-base não informada.' };
    if (date.parsed > now + DAY) return { status: STATUS.UNKNOWN, timestamp: date.parsed, ageDays: null, field: date.key, reason: 'Data futura rejeitada.' };
    const ageDays = Math.max(0, (now - date.parsed) / DAY);
    return {
      status: ageDays > Math.max(0, Number(staleAfterDays) || 0) ? STATUS.STALE : STATUS.CURRENT,
      timestamp: date.parsed,
      ageDays,
      field: date.key,
      reason: ageDays > Math.max(0, Number(staleAfterDays) || 0) ? `Sem atualização há ${Math.floor(ageDays)} dias.` : 'Atualização dentro do limite operacional.',
    };
  }

  function sourceOf(record = {}) {
    return text(record.source || record.quoteSource || record.quote_source || record.priceSource || record.price_source || record.sourceProvider || record.provider || record.origin || record.importSource);
  }

  function provenance(record = {}) {
    const source = sourceOf(record);
    const authority = text(record.authority || record.sourceAuthority || record.valuationMode);
    const observedAt = text(record.observedAt || record.sourceFetchedAt || record.lastSeenAt);
    const sourceAsOf = text(record.sourceAsOf || record.source_as_of || record.valuationAsOf || record.valuation_as_of || record.financialAsOf || record.financial_as_of || record.rf_valuation_as_of);
    const reason = text(record.reason || record.confidence);
    return {
      source,
      authority,
      observedAt,
      sourceAsOf,
      reason,
      hasProvenance: Boolean(source || authority || observedAt || sourceAsOf || reason),
    };
  }

  function valueState(record = {}) {
    const value = finite(record.value ?? record.currentValue ?? record.current ?? record.current_price ?? record.marketValue);
    if (upper(record.valueStatus || record.status) === 'UNKNOWN' || upper(record.valueStatus || record.status) === 'UNAVAILABLE') return { value: null, status: STATUS.UNKNOWN };
    if (value === null) return { value: null, status: STATUS.UNKNOWN };
    if (value === 0) return { value: 0, status: 'LEGITIMATE_ZERO' };
    return { value, status: 'KNOWN' };
  }

  function fixedIncomeStatus(record = {}) {
    const meta = record.currentMeta || record;
    const raw = upper(meta.status || record.trustStatus || meta.classification || meta.benchmarkStatus);
    const authority = upper(meta.authority || record.authority);
    const source = upper(meta.source || meta.origin || record.source);
    if (raw.includes('SHADOW') || raw.includes('REFERENCE') || authority.includes('SHADOW') || source.includes('SHADOW')) return STATUS.SHADOW;
    if (raw.includes('UNSUPPORTED') || meta.isSupported === false) return STATUS.UNSUPPORTED;
    if (raw.includes('UNAVAILABLE') || raw.includes('REVIEW')) return STATUS.UNAVAILABLE;
    if (meta.manual === true || meta.manualValueCents !== undefined || authority.includes('MANUAL') || source.includes('MANUAL')) return STATUS.MANUAL;
    if (meta.stale === true || meta.isStale === true || raw === 'STALE') return STATUS.STALE;
    return STATUS.UNKNOWN;
  }

  function classificationCoverage(rows = []) {
    const dimensions = ['className', 'sector', 'issuer'];
    const result = {};
    dimensions.forEach(field => {
      const known = rows.filter(row => text(row[field] || row[field === 'className' ? 'type' : field]));
      const values = rows.map(row => valueState(row));
      const knownValue = rows.reduce((sum, row) => {
        if (!text(row[field] || row[field === 'className' ? 'type' : field])) return sum;
        const state = valueState(row);
        return state.value === null ? sum : sum + state.value;
      }, 0);
      const totalKnown = values.reduce((sum, state) => state.value === null ? sum : sum + state.value, 0);
      result[field] = {
        knownCount: known.length,
        unknownCount: Math.max(0, rows.length - known.length),
        knownValue,
        unknownValue: totalKnown > 0 ? Math.max(0, totalKnown - knownValue) : null,
        coverageCount: rows.length ? known.length / rows.length * 100 : null,
        coverageValue: totalKnown > 0 ? knownValue / totalKnown * 100 : null,
      };
    });
    return result;
  }

  function normalizeAsset(asset = {}, index = 0, options = {}) {
    const freshnessState = freshness(asset, options);
    const trust = provenance(asset);
    const value = valueState({ current: asset.currentValue ?? asset.current ?? asset.current_price, valueStatus: asset.valueStatus });
    const type = text(asset.type || asset.category || asset.assetClass);
    return {
      id: text(asset.id) || `asset-${index + 1}`,
      label: text(asset.ticker || asset.name || asset.title) || 'Ativo sem identificação',
      ticker: text(asset.ticker),
      name: text(asset.name || asset.title),
      type,
      className: type,
      sector: text(asset.sector),
      issuer: text(asset.issuer || asset.fixed_issuer || asset.institution || asset.broker),
      value: value.value,
      valueStatus: value.status,
      quoteSource: sourceOf(asset),
      freshness: freshnessState,
      provenance: trust,
      isFixedIncome: Boolean(options.isFixedIncome?.(asset)) || /renda fixa|cdb|lci|lca|tesouro|debênture|debenture/i.test(type),
      fixedIncomeStatus: fixedIncomeStatus({ ...asset, isFixedIncome: true }),
      raw: asset,
    };
  }

  function duplicateDiagnostics(events = []) {
    const groups = new Map();
    list(events).forEach((event, index) => {
      const id = text(event?.id || event?.autoKey || event?.canonicalIncomeEventId);
      const date = text(event?.date || event?.paymentDate || event?.tradeDate);
      const type = upper(event?.type || event?.eventType || event?.operation);
      const ticker = upper(event?.ticker || event?.assetTicker || event?.asset);
      const value = finite(event?.value ?? event?.amount ?? event?.total);
      const key = id ? `id:${id}` : `natural:${date}|${type}|${ticker}|${value ?? 'unknown'}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ ...event, index });
    });
    const rows = [];
    groups.forEach((items, key) => {
      rows.push({ key, classification: items.length > 1 ? (key.startsWith('id:') ? 'EXACT_DUPLICATE' : 'POTENTIAL_DUPLICATE') : 'UNIQUE', count: items.length, events: items });
    });
    return { rows, exact: rows.filter(row => row.classification === 'EXACT_DUPLICATE'), potential: rows.filter(row => row.classification === 'POTENTIAL_DUPLICATE'), unique: rows.filter(row => row.classification === 'UNIQUE') };
  }

  function falseZeroDiagnostic({ authReady = false, backendReachable = false, snapshotReceived = false, snapshotAssetCount = 0, applied = false, stateAssetCount = 0, loading = false, error = false } = {}) {
    if (loading) return { status: 'LOADING', mismatch: false, reason: 'A leitura ainda está em andamento.' };
    if (error) return { status: 'ERROR', mismatch: false, reason: 'A fonte retornou erro; isso não é carteira vazia.' };
    if (authReady && backendReachable && snapshotReceived && Number(snapshotAssetCount) > 0 && Number(stateAssetCount) === 0 && !applied) return { status: STATUS.MISMATCH, mismatch: true, reason: 'Snapshot cloud recebido, mas ainda não aplicado ao estado visual.' };
    if (snapshotReceived && Number(snapshotAssetCount) === 0) return { status: 'EMPTY_CONFIRMED', mismatch: false, reason: 'A fonte confirmou ausência de posições.' };
    if (!snapshotReceived) return { status: STATUS.UNKNOWN, mismatch: false, reason: 'Ainda não há snapshot confirmado.' };
    return { status: applied ? STATUS.OK : STATUS.UNKNOWN, mismatch: false, reason: applied ? 'Snapshot aplicado ao estado visual.' : 'Snapshot recebido sem confirmação de aplicação.' };
  }

  function cloudHealth(input = {}) {
    const authReady = input.authReady === true;
    const backendReachable = input.backendReachable === true;
    const snapshotReceived = input.snapshotReceived === true;
    const applied = input.applied === true;
    const syncState = upper(input.syncState);
    if (!authReady) return { status: 'AUTHENTICATING', authReady, backendReachable, snapshotReceived, applied };
    if (syncState === 'ERROR' || syncState === 'OFFLINE' || input.error) return { status: 'ERROR', authReady, backendReachable, snapshotReceived, applied };
    if (!backendReachable || !snapshotReceived) return { status: syncState || 'CONNECTING', authReady, backendReachable, snapshotReceived, applied };
    if (!applied) return { status: 'SNAPSHOT_RECEIVED_NOT_APPLIED', authReady, backendReachable, snapshotReceived, applied };
    return { status: 'CONNECTED', authReady, backendReachable, snapshotReceived, applied };
  }

  function reconcileValues(values = [], tolerance = 0.01) {
    const available = list(values).map(finite).filter(value => value !== null);
    if (available.length < 2) return { status: STATUS.NOT_COMPARABLE, values: available };
    const baseline = available[0];
    const mismatch = available.some(value => Math.abs(value - baseline) > tolerance);
    return { status: mismatch ? STATUS.MISMATCH : STATUS.OK, values: available, difference: Math.max(...available) - Math.min(...available) };
  }

  function build(input = {}, options = {}) {
    const assets = list(input.assets).map((asset, index) => normalizeAsset(asset, index, { ...options, isFixedIncome: options.isFixedIncome }));
    const events = list(input.events || input.proventos).map(event => ({ ...event }));
    const fixedIncome = assets.filter(asset => asset.isFixedIncome);
    const freshnessRows = assets.map(asset => ({ id: asset.id, label: asset.label, source: asset.quoteSource, ...asset.freshness }));
    const provenanceRows = assets.map(asset => ({ id: asset.id, label: asset.label, ...asset.provenance }));
    const knownValues = assets.map(asset => asset.value).filter(value => value !== null);
    const duplicates = duplicateDiagnostics(events);
    const coverage = classificationCoverage(assets);
    const cloud = cloudHealth(input.cloud || {});
    const falseZero = falseZeroDiagnostic(input.cloud || {});
    const importHealth = {
      status: text(input.importHealth?.status || 'UNKNOWN').toUpperCase(),
      lastDetectedAt: input.importHealth?.lastDetectedAt || null,
      previewCount: Number(input.importHealth?.previewCount) || 0,
      confirmedCount: Number(input.importHealth?.confirmedCount) || 0,
      duplicateCount: Number(input.importHealth?.duplicateCount) || 0,
      rejectedCount: Number(input.importHealth?.rejectedCount) || 0,
    };
    const corporateHealth = {
      detectedShadowCount: Number(input.corporateHealth?.detectedShadowCount) || 0,
      referenceCount: Number(input.corporateHealth?.referenceCount) || 0,
      unsupportedCount: Number(input.corporateHealth?.unsupportedCount) || 0,
      realizedCount: Number(input.corporateHealth?.realizedCount) || 0,
      provenanceCount: Number(input.corporateHealth?.provenanceCount) || 0,
    };
    const fixedStatus = fixedIncome.reduce((counts, asset) => { counts[asset.fixedIncomeStatus] = (counts[asset.fixedIncomeStatus] || 0) + 1; return counts; }, {});
    const reconciliations = {
      patrimony: reconcileValues([input.dashboardPatrimony, input.assetsPatrimony, input.reportsPatrimony, input.allocationPatrimony]),
      fixedIncome: reconcileValues([input.fixedIncomeTotal, input.reportsFixedIncomeTotal, input.dashboardFixedIncomeTotal]),
      dividends: reconcileValues([input.dividendsTotal, input.reportsDividendsTotal, input.timelineIncomeTotal]),
      transactions: input.transactionCount === undefined || input.timelineTransactionCount === undefined
        ? { status: STATUS.NOT_COMPARABLE, values: [] }
        : { status: Number(input.transactionCount) === Number(input.timelineTransactionCount) ? STATUS.OK : STATUS.MISMATCH, values: [Number(input.transactionCount), Number(input.timelineTransactionCount)] },
      timeline: input.timelineCount === undefined || input.detailTimelineCount === undefined
        ? { status: STATUS.NOT_COMPARABLE, values: [] }
        : { status: Number(input.timelineCount) === Number(input.detailTimelineCount) ? STATUS.OK : STATUS.MISMATCH, values: [Number(input.timelineCount), Number(input.detailTimelineCount)] },
    };
    const stale = freshnessRows.filter(row => row.status === STATUS.STALE);
    const unknownFreshness = freshnessRows.filter(row => row.status === STATUS.UNKNOWN);
    const authoritySummary = input.fixedIncomeAuthoritySummary || {};
    const summary = {
      assetCount: assets.length,
      knownValueCount: knownValues.length,
      currentQuoteCount: freshnessRows.filter(row => row.status === STATUS.CURRENT).length,
      staleQuoteCount: stale.length,
      unknownQuoteCount: unknownFreshness.length,
      provenanceCount: provenanceRows.filter(row => row.hasProvenance).length,
      noProvenanceCount: provenanceRows.filter(row => !row.hasProvenance).length,
      fixedIncomeCount: fixedIncome.length,
      manualFixedIncomeCount: Number.isFinite(Number(authoritySummary.manualCount)) ? Number(authoritySummary.manualCount) : fixedIncome.filter(row => row.fixedIncomeStatus === STATUS.MANUAL).length,
      shadowFixedIncomeCount: Number.isFinite(Number(authoritySummary.shadowCount)) ? Number(authoritySummary.shadowCount) : fixedIncome.filter(row => row.fixedIncomeStatus === STATUS.SHADOW).length,
      unsupportedFixedIncomeCount: Number.isFinite(Number(authoritySummary.unsupportedCount)) ? Number(authoritySummary.unsupportedCount) : fixedIncome.filter(row => row.fixedIncomeStatus === STATUS.UNSUPPORTED).length,
      duplicateCount: duplicates.exact.length,
      potentialDuplicateCount: duplicates.potential.length,
      referenceEventCount: corporateHealth.referenceCount,
      shadowEventCount: corporateHealth.detectedShadowCount,
      totalKnownValue: knownValues.reduce((sum, value) => sum + value, 0),
    };
    return {
      status: falseZero.mismatch || Object.values(reconciliations).some(row => row.status === STATUS.MISMATCH) ? STATUS.MISMATCH : STATUS.OK,
      summary,
      assets,
      freshness: { rows: freshnessRows, stale, unknown: unknownFreshness },
      provenance: { rows: provenanceRows, withProvenance: summary.provenanceCount, withoutProvenance: summary.noProvenanceCount },
      coverage,
      fixedIncome: { rows: fixedIncome, statuses: fixedStatus },
      cloud,
      falseZero,
      importHealth,
      corporateHealth,
      duplicates,
      reconciliations,
    };
  }

  function filter(model, filters = {}) {
    const query = text(filters.search).toLocaleLowerCase('pt-BR');
    return list(model?.assets).filter(asset => {
      const haystack = [asset.label, asset.name, asset.quoteSource, asset.type, asset.sector, asset.issuer].join(' ').toLocaleLowerCase('pt-BR');
      const requestedStatus = filters.status && filters.status !== 'all' ? text(filters.status).toUpperCase() : null;
      const requestedSource = filters.source && filters.source !== 'all' ? text(filters.source) : null;
      return (!query || haystack.includes(query)) && (!requestedStatus || requestedStatus === asset.freshness.status) && (!requestedSource || requestedSource === asset.quoteSource);
    });
  }

  return Object.freeze({ STATUS, timestamp, freshness, provenance, valueState, fixedIncomeStatus, classificationCoverage, duplicateDiagnostics, falseZeroDiagnostic, cloudHealth, reconcileValues, build, filter });
});
