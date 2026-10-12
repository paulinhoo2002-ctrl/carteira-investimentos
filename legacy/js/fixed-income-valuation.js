'use strict';

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FixedIncomeValuation = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const FIELD_PROVENANCE = {
    rf_liquid_value: 'LEGACY_RF_LIQUID_VALUE',
    fixed_current_value: 'LEGACY_FIXED_CURRENT_VALUE',
    liquidValue: 'LEGACY_LIQUID_VALUE',
    rf_gross_value: 'LEGACY_RF_GROSS_VALUE',
    fixed_gross_value: 'LEGACY_FIXED_GROSS_VALUE',
    marketValue: 'LEGACY_MARKET_VALUE',
    currentValue: 'LEGACY_CURRENT_VALUE',
    current_price: 'LEGACY_CURRENT_PRICE',
    'applied-fallback': 'LEGACY_APPLIED_VALUE_FALLBACK'
  };

  function hasValue(position, field) {
    return position && position[field] !== undefined && position[field] !== null && String(position[field]).trim() !== '';
  }

  function dateField(position, names) {
    for (const name of names) {
      if (hasValue(position, name)) return String(position[name]).trim();
    }
    return null;
  }

  function inferAuthority(position, selectedField) {
    if (position?.manual_authority === true || position?.manualValueAuthority === 'manual') return 'MANUAL_AUTHORITATIVE';
    if (position?.imported_authority === true || position?.valueAuthority === 'imported') return 'IMPORTED_AUTHORITATIVE';
    if (selectedField === 'applied-fallback') return 'LEGACY_FALLBACK';
    return selectedField ? 'LEGACY_AUTHORITATIVE' : 'UNKNOWN';
  }

  function selectFixedIncomeValuation(position, options = {}) {
    const legacyResolver = options.legacyResolver;
    if (typeof legacyResolver !== 'function') throw new TypeError('legacyResolver is required');
    const legacy = legacyResolver(position || {});
    const selectedField = legacy?.currentState?.source || null;
    const isFallback = selectedField === 'applied-fallback';
    const valuationAsOf = dateField(position, ['valuationAsOf', 'valuation_as_of', 'valuationDate']);
    const sourceAsOf = dateField(position, ['sourceAsOf', 'source_as_of', 'priceDate', 'quoteDate', 'referenceDate']);
    const observedAt = dateField(position, ['observedAt', 'observed_at']);
    const hasValue = Number.isFinite(legacy?.current);
    const authority = inferAuthority(position, selectedField);
    const provenance = FIELD_PROVENANCE[selectedField] || 'UNKNOWN';
    const isEstimated = authority === 'SHADOW_ESTIMATE' || isFallback;
    const quality = !hasValue ? 'UNSUPPORTED' : isFallback ? 'LEGACY_FALLBACK' : (valuationAsOf || sourceAsOf) ? 'CURRENT' : 'INCOMPLETE_METADATA';
    return {
      value: hasValue ? legacy.current : null,
      valueCents: hasValue ? Math.round(legacy.current * 100) : null,
      selectedField,
      authority,
      provenance,
      valuationMode: isFallback ? 'APPLIED_VALUE_FALLBACK' : 'LEGACY_REPORTED',
      valuationAsOf,
      sourceAsOf,
      observedAt,
      quality,
      isAuthoritative: authority === 'MANUAL_AUTHORITATIVE' || authority === 'IMPORTED_AUTHORITATIVE' || authority === 'LEGACY_AUTHORITATIVE',
      isEstimated,
      isFallback,
      isStale: quality === 'STALE' || quality === 'MANUAL_STALE',
      isSupported: hasValue && !isFallback,
      reason: isFallback ? 'Valor aplicado preservado por compatibilidade legada; não representa valuation de mercado.' : 'Valor numérico preservado pela precedência legada.',
      legacy
    };
  }

  return { selectFixedIncomeValuation, FIELD_PROVENANCE };
});
