/* V247 read-only corporate-event engine. It only normalizes and simulates. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CorporateEventsShadow = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const EVENT_TYPES = Object.freeze([
    'SPLIT', 'REVERSE_SPLIT', 'BONUS', 'SUBSCRIPTION_RIGHT_GRANTED',
    'SUBSCRIPTION_EXERCISED', 'SUBSCRIPTION_EXPIRED', 'MERGER', 'INCORPORATION',
    'SPINOFF', 'TICKER_CHANGE', 'ASSET_CONVERSION', 'CLASS_CONVERSION',
    'AMORTIZATION', 'CAPITAL_REDUCTION', 'REDEMPTION', 'CASH_EVENT',
    'RIGHTS_EVENT', 'UNKNOWN_CORPORATE_EVENT'
  ]);
  const STATUS = Object.freeze(['DISCOVERED', 'NORMALIZED', 'SIMULATED', 'RECONCILED', 'MATCH', 'MISMATCH', 'REVIEW_REQUIRED', 'UNSUPPORTED', 'REFERENCE_ONLY']);
  const CONFIDENCE = Object.freeze(['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']);
  const EFFECTS = Object.freeze(['INCREASE', 'DECREASE', 'MULTIPLY', 'REPLACE', 'ALLOCATE', 'NONE', 'UNKNOWN']);
  const TAX_EFFECTS = Object.freeze(['KNOWN', 'PARTIAL', 'UNKNOWN', 'NOT_APPLICABLE']);

  const text = (value, max = 240) => String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
  const upper = value => text(value, 80).toUpperCase();
  const date = value => {
    if (!value) return '';
    const raw = text(value, 40);
    const match = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    const parsed = new Date(raw);
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : '';
  };
  const finite = value => {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(String(value).replace(',', '.'));
    return Number.isFinite(number) ? number : null;
  };
  const symbol = value => upper(value).replace(/[^A-Z0-9]/g, '').slice(0, 32);
  const normalizeConfidence = value => {
    const raw = upper(value);
    return CONFIDENCE.includes(raw) ? raw : (raw.includes('STRUCTURED') ? 'MEDIUM' : 'UNKNOWN');
  };
  function normalizeType(value) {
    const raw = upper(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (/REVERSE|GRUPAMENTO|INVERSE/.test(raw)) return 'REVERSE_SPLIT';
    if (/SPLIT|DESDOBR/.test(raw)) return 'SPLIT';
    if (/BONIFIC/.test(raw)) return 'BONUS';
    if (/DIREITO.*RECEB|RIGHT.*GRANT/.test(raw)) return 'SUBSCRIPTION_RIGHT_GRANTED';
    if (/EXERC|SUBSCRI.*EXERC|RIGHT.*EXERC/.test(raw)) return 'SUBSCRIPTION_EXERCISED';
    if (/EXPIR|DIREITO.*VENC/.test(raw)) return 'SUBSCRIPTION_EXPIRED';
    if (/SPIN.?OFF|CISAO|CISAO/.test(raw)) return 'SPINOFF';
    if (/MERGER|FUSAO/.test(raw)) return 'MERGER';
    if (/INCORPOR/.test(raw)) return 'INCORPORATION';
    if (/TICKER|MUDANCA.*COD|ALTERACAO.*COD/.test(raw)) return 'TICKER_CHANGE';
    if (/CLASS.*CONVERT|CONVERSAO.*CLASSE/.test(raw)) return 'CLASS_CONVERSION';
    if (/CONVERS/.test(raw)) return 'ASSET_CONVERSION';
    if (/AMORT/.test(raw)) return 'AMORTIZATION';
    if (/REDUCAO.*CAPITAL|CAPITAL.*REDUC/.test(raw)) return 'CAPITAL_REDUCTION';
    if (/REDEMPT|RESGATE/.test(raw)) return 'REDEMPTION';
    if (/RIGHT|DIREITO/.test(raw)) return 'RIGHTS_EVENT';
    if (/CASH|CASH_EVENT|DINHEIRO/.test(raw)) return 'CASH_EVENT';
    return EVENT_TYPES.includes(raw) ? raw : 'UNKNOWN_CORPORATE_EVENT';
  }
  function parseRatio(value) {
    if (value && typeof value === 'object') {
      const from = finite(value.from ?? value.numerator ?? value.old);
      const to = finite(value.to ?? value.denominator ?? value.new);
      return from > 0 && to >= 0 ? { from, to } : null;
    }
    const match = text(value, 40).match(/([0-9]+(?:[.,][0-9]+)?)\s*[:/]\s*([0-9]+(?:[.,][0-9]+)?)/);
    if (!match) return null;
    const from = finite(match[1]); const to = finite(match[2]);
    return from > 0 && to >= 0 ? { from, to } : null;
  }
  const ratioKey = ratio => ratio ? `${ratio.from}:${ratio.to}` : '';
  const provenance = raw => ({
    source: text(raw.source || raw.sourceProvider || 'UNKNOWN', 100),
    sourceReference: text(raw.sourceReference || raw.sourceDocumentId || raw.officialId, 180),
    sourceUrl: text(raw.sourceUrl, 400),
    observedAt: text(raw.observedAt || raw.sourceFetchedAt, 80),
    reason: text(raw.reason || raw.confidence, 180)
  });
  const groupKey = event => [event.eventType, event.effectiveDate || event.eventDate, event.assetBefore, event.assetAfter].join('|').toUpperCase();
  const fingerprint = event => [groupKey(event), ratioKey(event.ratio), event.cashComponent == null ? '' : event.cashComponent, event.quantityDelta == null ? '' : event.quantityDelta].join('|');

  function normalizeEvent(raw = {}) {
    const eventType = normalizeType(raw.eventType || raw.type || raw.kind || raw.label);
    const event = {
      eventId: text(raw.eventId || raw.id, 160),
      eventType,
      eventDate: date(raw.eventDate || raw.date),
      effectiveDate: date(raw.effectiveDate || raw.effective || raw.eventDate || raw.date),
      assetBefore: symbol(raw.assetBefore || raw.ticker || raw.symbol),
      assetAfter: symbol(raw.assetAfter || raw.successorTicker || raw.targetTicker),
      ratio: parseRatio(raw.ratio || raw.conversionRatio),
      quantityBefore: finite(raw.quantityBefore ?? raw.beforeQuantity),
      cashComponent: finite(raw.cashComponent ?? raw.cashValue ?? raw.cash),
      quantityDelta: finite(raw.quantityDelta ?? raw.quantity),
      quantityEffect: 'UNKNOWN', costBasisEffect: 'UNKNOWN', identityEffect: 'NONE', incomeEffect: 'NONE', taxEffect: 'NOT_APPLICABLE',
      classificationConfidence: normalizeConfidence(raw.classificationConfidence || raw.confidence),
      provenance: provenance(raw), warnings: [], errors: [], status: 'NORMALIZED',
      sources: [], sourceReferences: []
    };
    if (eventType === 'SPLIT' || eventType === 'REVERSE_SPLIT') {
      event.quantityEffect = event.ratio ? 'MULTIPLY' : 'UNKNOWN';
      event.costBasisEffect = event.ratio ? 'NONE' : 'UNKNOWN';
    } else if (eventType === 'BONUS') {
      event.quantityEffect = event.ratio ? 'INCREASE' : 'UNKNOWN';
      event.costBasisEffect = 'UNKNOWN'; event.taxEffect = 'UNKNOWN'; event.status = 'REVIEW_REQUIRED';
    } else if (eventType === 'TICKER_CHANGE' || eventType === 'CLASS_CONVERSION' || eventType === 'ASSET_CONVERSION') {
      event.quantityEffect = 'NONE'; event.identityEffect = 'REPLACE';
    } else if (eventType === 'SUBSCRIPTION_RIGHT_GRANTED' || eventType === 'SUBSCRIPTION_EXPIRED') {
      event.quantityEffect = 'NONE'; event.identityEffect = 'NONE';
    } else if (eventType === 'SUBSCRIPTION_EXERCISED') {
      event.quantityEffect = event.quantityDelta == null ? 'UNKNOWN' : 'INCREASE'; event.costBasisEffect = event.quantityDelta == null ? 'UNKNOWN' : 'INCREASE';
    } else if (['MERGER', 'INCORPORATION', 'SPINOFF'].includes(eventType)) {
      event.quantityEffect = event.ratio ? 'MULTIPLY' : 'UNKNOWN'; event.identityEffect = 'REPLACE'; event.costBasisEffect = 'UNKNOWN';
    } else if (['AMORTIZATION', 'CAPITAL_REDUCTION', 'REDEMPTION', 'CASH_EVENT'].includes(eventType)) {
      event.incomeEffect = 'UNKNOWN'; event.taxEffect = 'UNKNOWN'; event.status = 'REVIEW_REQUIRED';
    } else if (eventType === 'UNKNOWN_CORPORATE_EVENT' || eventType === 'RIGHTS_EVENT') {
      event.status = 'UNSUPPORTED'; event.warnings.push('Classificação ou transformação insuficiente para simulação.');
    }
    if (!event.eventDate) event.warnings.push('Data do evento ausente.');
    if (!event.assetBefore) event.errors.push('Ativo de origem ausente.');
    if (event.eventType === 'TICKER_CHANGE' && !event.assetAfter) event.errors.push('Ativo sucessor ausente.');
    event.sourceReferences = event.provenance.sourceReference ? [event.provenance.sourceReference] : [];
    event.sources = [{ ...event.provenance }];
    event.eventId = event.eventId || `ce:${groupKey(event)}`;
    event.stableFingerprint = fingerprint(event);
    if (event.errors.length) event.status = 'REVIEW_REQUIRED';
    return event;
  }

  function multiplier(event) {
    if (!event.ratio || !event.ratio.from) return null;
    if (event.eventType === 'BONUS') return (event.ratio.from + event.ratio.to) / event.ratio.from;
    return event.ratio.to / event.ratio.from;
  }
  function simulateEvent(eventInput, position = {}) {
    const event = eventInput.eventType ? eventInput : normalizeEvent(eventInput);
    const explicitCurrentQuantity = finite(position.currentQuantity ?? position.officialQuantity);
    const suppliedQuantity = finite(position.quantity ?? position.qty);
    const currentOfficialQuantity = explicitCurrentQuantity == null ? suppliedQuantity : explicitCurrentQuantity;
    const ratio = multiplier(event);
    const quantityBefore = finite(event.quantityBefore ?? position.quantityBefore ?? position.quantityBeforeEvent ?? (explicitCurrentQuantity != null && ratio ? explicitCurrentQuantity / ratio : suppliedQuantity));
    const costBefore = finite(position.costBasis ?? position.totalCost);
    const result = {
      event, currentOfficialQuantity, currentOfficialCostBasis: costBefore,
      expectedAsset: event.assetAfter || event.assetBefore || symbol(position.ticker), expectedQuantity: quantityBefore,
      expectedCostBasis: costBefore, expectedAveragePrice: null, quantityEffect: event.quantityEffect,
      identityTransformation: event.identityEffect, syntheticTransactions: [], status: 'SIMULATED', writes: 0
    };
    if (event.status === 'UNSUPPORTED' || event.errors.length) result.status = 'REVIEW_REQUIRED';
    if (['SPLIT', 'REVERSE_SPLIT', 'BONUS', 'MERGER', 'INCORPORATION', 'SPINOFF'].includes(event.eventType)) {
      if (ratio == null || quantityBefore == null) { result.expectedQuantity = null; result.quantityEffect = 'UNKNOWN'; result.status = 'REVIEW_REQUIRED'; }
      else result.expectedQuantity = quantityBefore * ratio;
    } else if (event.eventType === 'SUBSCRIPTION_EXERCISED') {
      if (event.quantityDelta == null || quantityBefore == null) { result.expectedQuantity = null; result.quantityEffect = 'UNKNOWN'; result.status = 'REVIEW_REQUIRED'; }
      else result.expectedQuantity = quantityBefore + event.quantityDelta;
    } else if (event.eventType === 'TICKER_CHANGE' || event.eventType === 'CLASS_CONVERSION' || event.eventType === 'ASSET_CONVERSION') {
      result.expectedQuantity = quantityBefore;
    } else if (event.eventType === 'SUBSCRIPTION_RIGHT_GRANTED' || event.eventType === 'SUBSCRIPTION_EXPIRED') {
      result.expectedQuantity = quantityBefore;
    } else if (event.quantityEffect === 'UNKNOWN') {
      result.expectedQuantity = null; result.status = 'REVIEW_REQUIRED';
    }
    if (event.eventType === 'BONUS') result.status = 'REVIEW_REQUIRED';
    if (result.expectedQuantity != null && costBefore != null) result.expectedAveragePrice = result.expectedQuantity ? costBefore / result.expectedQuantity : null;
    return result;
  }
  function reconcileEvent(eventInput, position = {}) {
    const officialPosition = { ...position, currentQuantity: position.currentQuantity ?? position.officialQuantity ?? position.quantity ?? position.qty };
    const simulation = simulateEvent(eventInput, officialPosition);
    if (simulation.expectedQuantity == null || simulation.currentOfficialQuantity == null) return { ...simulation, status: 'REVIEW_REQUIRED', difference: null, officialPositionMutated: false };
    const difference = simulation.currentOfficialQuantity - simulation.expectedQuantity;
    return { ...simulation, status: difference === 0 ? 'MATCH' : 'MISMATCH', difference, officialPositionMutated: false };
  }
  function processShadowEvents(rawEvents = [], { positions = {} } = {}) {
    const normalized = (Array.isArray(rawEvents) ? rawEvents : []).map(normalizeEvent);
    const groups = new Map();
    normalized.forEach(event => { const key = groupKey(event); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(event); });
    const events = []; const conflicts = [];
    for (const variants of groups.values()) {
      const byFingerprint = new Map();
      variants.forEach(event => { if (!byFingerprint.has(event.stableFingerprint)) byFingerprint.set(event.stableFingerprint, []); byFingerprint.get(event.stableFingerprint).push(event); });
      const [canonicalFingerprint, canonicalRows] = [...byFingerprint.entries()][0];
      const uniqueSources = new Map();
      canonicalRows.forEach(e => uniqueSources.set(JSON.stringify(e.provenance), e.provenance));
      const canonical = { ...canonicalRows[0], sources: [...uniqueSources.values()], sourceReferences: [...new Set(canonicalRows.flatMap(e => e.sourceReferences))] };
      if (byFingerprint.size > 1) {
        const conflictRows = variants.filter(e => e.stableFingerprint !== canonicalFingerprint);
        conflicts.push({ groupKey: groupKey(canonical), status: 'CONFLICT', variants: conflictRows.map(e => ({ fingerprint: e.stableFingerprint, ratio: e.ratio, cashComponent: e.cashComponent, source: e.provenance.source })) });
        canonical.status = 'REVIEW_REQUIRED'; canonical.warnings = [...canonical.warnings, 'Fontes divergem em transformação ou componente financeiro.'];
      }
      events.push(canonical);
    }
    const reconciliations = events.map(event => {
      const key = event.assetBefore || event.assetAfter;
      return reconcileEvent(event, positions[key] || positions[event.assetBefore] || {});
    });
    return { events, conflicts, simulations: reconciliations.map(r => ({ ...r, status: r.status === 'MATCH' || r.status === 'MISMATCH' ? 'RECONCILED' : r.status })), reconciliations, writes: 0, officialPositionWrites: 0, officialCostBasisWrites: 0, officialDividendLedgerWrites: 0, corporateEventRealizationCount: 0, status: conflicts.length ? 'REVIEW_REQUIRED' : 'SHADOW_READ_ONLY' };
  }
  return { EVENT_TYPES, STATUS, CONFIDENCE, EFFECTS, TAX_EFFECTS, normalizeType, parseRatio, normalizeEvent, simulateEvent, reconcileEvent, processShadowEvents, fingerprint, groupKey };
});
