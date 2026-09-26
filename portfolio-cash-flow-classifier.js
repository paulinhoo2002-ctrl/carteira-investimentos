/* V272 canonical read-only cash-flow classification. No storage, network or writes. */
(function init(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PortfolioCashFlowClassifier = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createClassifier() {
  const RULE_VERSION = 'CASH_FLOW_CLASSIFICATION_V1';
  const EXTERNAL = new Set(['EXTERNAL_CONTRIBUTION', 'EXTERNAL_WITHDRAWAL']);
  const TRUSTED_EXTERNAL_SOURCES = new Set(['MANUAL', 'MANUAL_ENTRY', 'V76_MANUAL']);
  const TYPE_MAP = Object.freeze({
    CONTRIBUTION: 'EXTERNAL_CONTRIBUTION', EXTERNAL_CONTRIBUTION: 'EXTERNAL_CONTRIBUTION',
    TRANSFER_IN_EXTERNAL: 'EXTERNAL_CONTRIBUTION', APORTE_EXTERNO: 'EXTERNAL_CONTRIBUTION',
    WITHDRAWAL: 'EXTERNAL_WITHDRAWAL', EXTERNAL_WITHDRAWAL: 'EXTERNAL_WITHDRAWAL',
    TRANSFER_OUT_EXTERNAL: 'EXTERNAL_WITHDRAWAL', RETIRADA_EXTERNA: 'EXTERNAL_WITHDRAWAL',
    BUY: 'INTERNAL_BUY', COMPRA: 'INTERNAL_BUY', INTERNAL_BUY: 'INTERNAL_BUY',
    SELL: 'INTERNAL_SELL', VENDA: 'INTERNAL_SELL', INTERNAL_SELL: 'INTERNAL_SELL',
    DIVIDEND: 'INCOME_DIVIDEND', DIVIDENDO: 'INCOME_DIVIDEND', INCOME_DIVIDEND: 'INCOME_DIVIDEND',
    JCP: 'INCOME_JCP', INCOME_JCP: 'INCOME_JCP',
    INTEREST: 'INCOME_INTEREST', JUROS: 'INCOME_INTEREST', INCOME_INTEREST: 'INCOME_INTEREST',
    AMORTIZATION: 'INCOME_AMORTIZATION', AMORTIZACAO: 'INCOME_AMORTIZATION', INCOME_AMORTIZATION: 'INCOME_AMORTIZATION',
    FEE: 'FEE', CUSTODY_FEE: 'FEE', TAX: 'TAX', WITHHOLDING_TAX: 'TAX',
    TRANSFER_INTERNAL: 'TRANSFER_INTERNAL', INTERNAL_TRANSFER: 'TRANSFER_INTERNAL', TRANSFER: 'AMBIGUOUS',
    ADJUSTMENT: 'AMBIGUOUS', OTHER: 'UNKNOWN'
  });

  function isRecord(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const candidate = new Date(Date.UTC(year, month - 1, day));
    return candidate.getUTCFullYear() === year && candidate.getUTCMonth() === month - 1 && candidate.getUTCDate() === day;
  }
  function cleanText(value) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
  function resolveType(event) {
    const candidates = ['classification', 'type', 'operation', 'category']
      .map(key => cleanText(event[key])?.toUpperCase().replace(/[ -]+/g, '_'))
      .filter(Boolean);
    if (!candidates.length) return { classification: 'UNKNOWN', conflict: false };
    const mapped = candidates.map(value => TYPE_MAP[value] || 'UNKNOWN');
    const known = [...new Set(mapped.filter(value => value !== 'UNKNOWN'))];
    if (known.length > 1) return { classification: 'AMBIGUOUS', conflict: true };
    if (!known.length) return { classification: mapped.includes('AMBIGUOUS') ? 'AMBIGUOUS' : 'UNKNOWN', conflict: false };
    return { classification: known[0], conflict: false };
  }
  function amountOf(event) {
    if (Number.isInteger(event.amountCents) && event.amountCents > 0) {
      return { amount: event.amountCents / 100, amountMinor: event.amountCents, currency: cleanText(event.currency) || 'BRL' };
    }
    const value = event.amount ?? event.value;
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return { amount: value, amountMinor: null, currency: cleanText(event.currency) || 'BRL' };
    }
    return { amount: null, amountMinor: null, currency: cleanText(event.currency) || 'BRL' };
  }
  function result(event, context, classification, confidence, warnings, values = {}) {
    const eventId = cleanText(event.id) || cleanText(event.eventId);
    const source = cleanText(event.source) || cleanText(context.sourceSystem);
    const sourceId = cleanText(event.sourceId);
    const sourceIdentityKey = sourceId || eventId;
    const walletId = cleanText(event.walletId) || cleanText(event.provenance?.walletId);
    const external = EXTERNAL.has(classification) && confidence === 'HIGH';
    const sign = classification === 'EXTERNAL_CONTRIBUTION' ? 1 : classification === 'EXTERNAL_WITHDRAWAL' ? -1 : 0;
    return {
      eventId, walletId, date: values.date ?? null, amount: values.amount ?? null,
      amountMinor: values.amountMinor ?? null, currency: values.currency ?? 'BRL',
      rawType: ['classification', 'type', 'operation', 'category'].map(key => cleanText(event[key])).find(Boolean) || null,
      classification, isExternalFlow: external, confidence,
      timing: cleanText(event.timing)?.toUpperCase() === 'END_OF_SUBPERIOD' ? 'END_OF_SUBPERIOD' : null,
      portfolioSignedAmount: external && values.amount !== null ? sign * values.amount : null,
      investorSignedAmount: external && values.amount !== null ? -sign * values.amount : null,
      sourceIdentity: source && sourceIdentityKey ? `${source}:${sourceIdentityKey}` : null,
      classificationIdentity: eventId ? `${RULE_VERSION}:${eventId}:${classification}` : null,
      provenance: { sourceSystem: cleanText(context.sourceSystem) || source, source, sourceId, ruleVersion: RULE_VERSION },
      warnings: [...new Set(warnings)]
    };
  }

  function classifyEvent(input, context = {}) {
    const event = isRecord(input) ? input : {};
    const warnings = [];
    const type = resolveType(event);
    const rawWalletId = cleanText(event.walletId) || cleanText(event.provenance?.walletId);
    const expectedWalletId = cleanText(context.walletId);
    const date = validDate(event.date) ? event.date : null;
    const amount = amountOf(event);
    if (!date) warnings.push('INVALID_DATE');
    if (amount.amount === null) warnings.push('INVALID_OR_MISSING_AMOUNT');
    if (!rawWalletId) warnings.push('WALLET_SCOPE_MISSING');
    else if (expectedWalletId && rawWalletId !== expectedWalletId) warnings.push('WALLET_SCOPE_MISMATCH');
    if (!cleanText(event.id) && !cleanText(event.eventId)) warnings.push('EVENT_ID_MISSING');
    if (!cleanText(event.sourceId)) warnings.push('SOURCE_ID_MISSING');
    if (type.conflict) warnings.push('EVENT_TYPE_CONFLICT');

    let classification = type.classification;
    let confidence = 'UNKNOWN';
    if (classification === 'AMBIGUOUS') confidence = 'LOW';
    else if (classification !== 'UNKNOWN') confidence = 'MEDIUM';

    if (EXTERNAL.has(classification)) {
      const source = cleanText(event.source) || cleanText(context.sourceSystem);
      const sourceEvidence = TRUSTED_EXTERNAL_SOURCES.has(String(event.source || '').toUpperCase());
      const scopeMatches = rawWalletId && (!expectedWalletId || rawWalletId === expectedWalletId);
      const evidenceComplete = !!(date && amount.amount !== null && rawWalletId && scopeMatches &&
        cleanText(event.id || event.eventId) && source && sourceEvidence &&
        (cleanText(event.sourceId) || cleanText(event.id || event.eventId)) && !type.conflict);
      if (!date || amount.amount === null) {
        classification = 'UNKNOWN';
        confidence = 'UNKNOWN';
      } else if (!evidenceComplete) {
        classification = 'AMBIGUOUS';
        confidence = 'LOW';
        warnings.push('EXTERNAL_FLOW_EVIDENCE_INCOMPLETE');
        if (!sourceEvidence) warnings.push('SOURCE_NOT_TRUSTED_FOR_EXTERNAL_FLOW');
      } else {
        confidence = 'HIGH';
        const direction = cleanText(event.direction)?.toUpperCase();
        const expectedDirection = classification === 'EXTERNAL_CONTRIBUTION' ? 'IN' : 'OUT';
        if (direction && ![expectedDirection, 'EXTERNAL'].includes(direction)) {
          classification = 'AMBIGUOUS';
          confidence = 'LOW';
          warnings.push('FLOW_DIRECTION_CONFLICT');
        }
      }
    }
    if (classification === 'UNKNOWN') warnings.push('UNRECOGNIZED_EVENT_TYPE');
    if (EXTERNAL.has(classification) && !cleanText(event.timing)) warnings.push('FLOW_TIMING_UNPROVEN');
    return result(event, context, classification, confidence, warnings, { ...amount, date });
  }

  function assessCashFlowReadiness(classifiedEvents = [], walletId) {
    const wallet = cleanText(walletId);
    const rows = Array.isArray(classifiedEvents) ? classifiedEvents : [];
    const scoped = rows.filter(row => row?.walletId && row.walletId === wallet);
    const identityCounts = scoped.reduce((counts, row) => {
      if (row?.sourceIdentity) counts.set(row.sourceIdentity, (counts.get(row.sourceIdentity) || 0) + 1);
      return counts;
    }, new Map());
    const duplicateIdentities = new Set([...identityCounts].filter(([, count]) => count > 1).map(([identity]) => identity));
    const trustedExternalFlows = scoped.filter(row => row.isExternalFlow === true && row.confidence === 'HIGH' && EXTERNAL.has(row.classification) &&
      row.sourceIdentity && !duplicateIdentities.has(row.sourceIdentity));
    const ambiguousEvents = scoped.filter(row => row.classification === 'AMBIGUOUS' || row.classification === 'UNKNOWN' ||
      (EXTERNAL.has(row.classification) && row.confidence !== 'HIGH') || duplicateIdentities.has(row.sourceIdentity));
    const unknownEvents = scoped.filter(row => row.classification === 'UNKNOWN' || row.confidence === 'UNKNOWN');
    const unscopedEvents = rows.filter(row => !row?.walletId);
    const state = trustedExternalFlows.length && !ambiguousEvents.length ? 'READY'
      : trustedExternalFlows.length || ambiguousEvents.length || unknownEvents.length ? 'PARTIAL' : 'UNAVAILABLE';
    return {
      state, walletId: wallet, totalEvents: rows.length, scopedEvents: scoped.length,
      classifiedEvents: scoped.filter(row => !['UNKNOWN', 'AMBIGUOUS'].includes(row.classification)).length,
      trustedExternalFlows, externalFlowCount: trustedExternalFlows.length,
      ambiguousEvents: ambiguousEvents.length, unknownEvents: unknownEvents.length,
      duplicateIdentityCount: duplicateIdentities.size,
      unscopedEvents: unscopedEvents.length,
      provenanceCoverage: scoped.length ? scoped.filter(row => row.provenance?.sourceSystem && row.sourceIdentity).length / scoped.length : 0,
      confidenceDistribution: scoped.reduce((out, row) => { out[row.confidence] = (out[row.confidence] || 0) + 1; return out; }, {})
    };
  }

  return { RULE_VERSION, CLASSIFICATIONS: Object.freeze([...new Set(Object.values(TYPE_MAP))]), TRUSTED_EXTERNAL_SOURCES: Object.freeze([...TRUSTED_EXTERNAL_SOURCES]), validDate, classifyEvent, assessCashFlowReadiness };
});
